import logging
import time
import re
from difflib import SequenceMatcher

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from config import get_all_settings, get_backend_headers
from database import get_db
from models import User, CachedChannel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/logos", tags=["logos"])

GITHUB_TREE_URL = "https://api.github.com/repos/jesmannstl/tvlogos/git/trees/main?recursive=1"
RAW_BASE_URL = "https://raw.githubusercontent.com/jesmannstl/tvlogos/main"
TARGET_DIR = "AllNamedByChannel/"

_tree_cache: dict = {"entries": [], "fetched_at": 0.0}
CACHE_TTL = 3600


class LogoMatch(BaseModel):
    filename: str
    path: str
    url: str
    score: float


class LogoApplyRequest(BaseModel):
    channel_id: int
    logo_url: str
    logo_name: str


class LogoApplyResult(BaseModel):
    success: bool
    message: str
    logo_id: int | None = None


async def _get_tree() -> list[dict]:
    now = time.time()
    if _tree_cache["entries"] and (now - _tree_cache["fetched_at"]) < CACHE_TTL:
        return _tree_cache["entries"]

    logger.info("Fetching GitHub tree for tvlogos repo")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(GITHUB_TREE_URL)
            resp.raise_for_status()
    except httpx.HTTPError as e:
        logger.error("Failed to fetch GitHub tree: %s", e)
        if _tree_cache["entries"]:
            return _tree_cache["entries"]
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch logo repository from GitHub",
        )

    data = resp.json()
    entries = []
    for item in data.get("tree", []):
        if item.get("type") != "blob":
            continue
        path = item.get("path", "")
        if not path.startswith(TARGET_DIR):
            continue
        if not path.lower().endswith((".png", ".jpg", ".jpeg", ".svg", ".webp")):
            continue
        filename = path[len(TARGET_DIR):]
        entries.append({"filename": filename, "path": path})

    _tree_cache["entries"] = entries
    _tree_cache["fetched_at"] = now
    logger.info("Cached %d logo entries from GitHub", len(entries))
    return entries


_COUNTRY_PREFIX_RE = re.compile(
    r'^(?:'
    r'[A-Z]{2,3}\s*[:|]\s*'  # "USA|", "UK:", "US: ", "CA|"
    r'|(?:USA?|UK|CA|AU|NZ|FR|DE|IT|ES|MX|BR|IN|JP)\s+'  # "USA ", "UK ", "CA "
    r')',
    re.IGNORECASE,
)

_NOISE_WORDS = {"east", "west", "hd", "uhd", "4k", "fhd", "sd", "television", "network", "channel", "broadcasting", "tv"}


def _clean_channel_name(name: str) -> str:
    cleaned = _COUNTRY_PREFIX_RE.sub("", name.strip())
    cleaned = re.sub(r'[^\w\s]', ' ', cleaned)
    words = [w for w in cleaned.split() if w.lower() not in _NOISE_WORDS]
    return " ".join(words).strip()


def _fuzzy_score(query: str, filename: str) -> float:
    name_lower = filename.rsplit(".", 1)[0].lower().replace("_", " ").replace("-", " ")
    name_compact = name_lower.replace(" ", "")
    query_lower = query.lower().strip()
    query_compact = query_lower.replace(" ", "")

    if query_compact == name_compact:
        return 1.0
    if query_compact in name_compact:
        return 0.9
    if name_compact.startswith(query_compact):
        return 0.85

    words = [w for w in query_lower.split() if w not in _NOISE_WORDS and len(w) > 1]
    if not words:
        ratio = SequenceMatcher(None, query_compact, name_compact).ratio()
        return ratio if ratio >= 0.5 else 0.0

    if len(words) > 1:
        matched = sum(1 for w in words if w in name_compact)
        if matched == len(words):
            return 0.8 + (0.1 * matched / len(words))
        if matched == 1 and len(words) > 1:
            return 0.0

    elif words[0] in name_compact:
        return 0.7

    ratio = SequenceMatcher(None, query_compact, name_compact).ratio()
    return ratio if ratio >= 0.5 else 0.0


@router.get("/search", response_model=list[LogoMatch])
async def search_logos(
    q: str = Query(..., min_length=1, description="Search term"),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    _user: User = Depends(get_current_user),
):
    entries = await _get_tree()

    cleaned = _clean_channel_name(q)
    search_term = cleaned if cleaned else q.strip()

    logger.info("Logo search: raw=%r cleaned=%r offset=%d (%d entries)",
                q, search_term, offset, len(entries))

    scored = []
    for entry in entries:
        score = _fuzzy_score(search_term, entry["filename"])
        if score >= 0.4:
            scored.append((score, entry))

    scored.sort(key=lambda x: x[0], reverse=True)

    page = scored[offset:offset + limit]

    results = []
    for score, entry in page:
        results.append(LogoMatch(
            filename=entry["filename"],
            path=entry["path"],
            url=f"{RAW_BASE_URL}/{entry['path']}",
            score=round(score, 3),
        ))

    return results


@router.post("/apply", response_model=LogoApplyResult)
async def apply_logo(
    request: LogoApplyRequest,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = await get_all_settings(db)
    backend_type = settings.get("backend_type")
    backend_url = settings.get("backend_url")

    if not backend_type or not backend_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Backend not configured",
        )

    headers = await get_backend_headers(settings)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            logo_payload = {"name": request.logo_name, "url": request.logo_url}

            if backend_type == "ecm":
                logo_url = f"{backend_url}/api/channels/logos/"
                channel_url = f"{backend_url}/api/channels/{request.channel_id}/"
            else:
                logo_url = f"{backend_url}/api/channels/logos/"
                channel_url = f"{backend_url}/api/channels/channels/{request.channel_id}/"

            logo_resp = await client.post(logo_url, json=logo_payload, headers=headers)

            if logo_resp.status_code not in (200, 201):
                return LogoApplyResult(
                    success=False,
                    message=f"Failed to create logo: HTTP {logo_resp.status_code} - {logo_resp.text[:200]}",
                )

            logo_data = logo_resp.json()
            logo_id = logo_data.get("id")

            channel_payload = {"logo": logo_id}
            patch_resp = await client.patch(channel_url, json=channel_payload, headers=headers)

            if patch_resp.status_code not in (200, 204):
                return LogoApplyResult(
                    success=False,
                    message=f"Logo created (id={logo_id}) but failed to assign to channel: HTTP {patch_resp.status_code}",
                    logo_id=logo_id,
                )

    except httpx.ConnectError:
        return LogoApplyResult(success=False, message=f"Cannot connect to {backend_url}")
    except httpx.TimeoutException:
        return LogoApplyResult(success=False, message="Backend request timed out")
    except Exception as e:
        logger.exception("Logo apply failed")
        return LogoApplyResult(success=False, message=f"Error: {str(e)}")

    result = await db.execute(select(CachedChannel).where(CachedChannel.id == request.channel_id))
    cached = result.scalar_one_or_none()
    if cached:
        cached.current_logo_url = request.logo_url
        cached.logo_id = logo_id
        await db.commit()

    return LogoApplyResult(
        success=True,
        message=f"Logo '{request.logo_name}' applied to channel {request.channel_id}",
        logo_id=logo_id,
    )
