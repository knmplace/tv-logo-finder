import asyncio
import logging
import time
import re
from difflib import SequenceMatcher

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_admin
from database import get_db
from models import User, CachedChannel, LogoSource

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/logos", tags=["logos"])

CACHE_TTL = 3600

_source_caches: dict[int, dict] = {}


class LogoMatch(BaseModel):
    filename: str
    path: str
    url: str
    score: float
    source_id: int
    source_name: str


class LogoApplyRequest(BaseModel):
    channel_id: int
    logo_url: str
    logo_name: str


class LogoApplyResult(BaseModel):
    success: bool
    message: str
    logo_id: int | None = None


class LogoSourceResponse(BaseModel):
    id: int
    name: str
    repo_owner: str
    repo_name: str
    branch: str
    path_prefix: str
    enabled: bool
    is_builtin: bool
    logo_count: int = 0


class LogoSourceCreate(BaseModel):
    name: str
    repo_owner: str
    repo_name: str
    branch: str = "main"
    path_prefix: str = ""


class LogoSourceUpdate(BaseModel):
    name: str | None = None
    enabled: bool | None = None
    branch: str | None = None
    path_prefix: str | None = None


_fetching_sources: set[int] = set()


async def _fetch_tree_for_source(source: LogoSource) -> list[dict]:
    tree_url = f"https://api.github.com/repos/{source.repo_owner}/{source.repo_name}/git/trees/{source.branch}?recursive=1"
    raw_base = f"https://raw.githubusercontent.com/{source.repo_owner}/{source.repo_name}/{source.branch}"

    logger.info("Fetching GitHub tree for %s/%s", source.repo_owner, source.repo_name)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(tree_url)
            resp.raise_for_status()
    except httpx.HTTPError as e:
        logger.error("Failed to fetch GitHub tree for %s/%s: %s", source.repo_owner, source.repo_name, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch logo repository {source.repo_owner}/{source.repo_name} from GitHub",
        )

    data = resp.json()
    entries = []
    prefix = source.path_prefix
    for item in data.get("tree", []):
        if item.get("type") != "blob":
            continue
        path = item.get("path", "")
        if prefix and not path.startswith(prefix):
            continue
        if not path.lower().endswith((".png", ".jpg", ".jpeg", ".svg", ".webp")):
            continue
        filename = path[len(prefix):] if prefix else path
        entries.append({
            "filename": filename,
            "path": path,
            "raw_base": raw_base,
        })

    _source_caches[source.id] = {"entries": entries, "fetched_at": time.time()}
    logger.info("Cached %d logo entries from %s/%s", len(entries), source.repo_owner, source.repo_name)
    return entries


async def _get_tree_for_source(source: LogoSource) -> list[dict]:
    source_id = source.id
    now = time.time()

    if source_id in _source_caches:
        cache = _source_caches[source_id]
        if cache["entries"] and (now - cache["fetched_at"]) < CACHE_TTL:
            return cache["entries"]

    if source_id in _source_caches and _source_caches[source_id]["entries"]:
        return _source_caches[source_id]["entries"]

    return await _fetch_tree_for_source(source)


def _get_cached_entries(source_id: int) -> list[dict]:
    if source_id in _source_caches and _source_caches[source_id]["entries"]:
        return _source_caches[source_id]["entries"]
    return []


async def _background_refresh(source: LogoSource):
    if source.id in _fetching_sources:
        return
    _fetching_sources.add(source.id)
    try:
        await _fetch_tree_for_source(source)
    except Exception as e:
        logger.warning("Background refresh failed for %s/%s: %s", source.repo_owner, source.repo_name, e)
    finally:
        _fetching_sources.discard(source.id)


async def preload_all_sources():
    from database import async_session
    try:
        async with async_session() as session:
            result = await session.execute(
                select(LogoSource).where(LogoSource.enabled == True)
            )
            sources = result.scalars().all()
            tasks = [_fetch_tree_for_source(s) for s in sources]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            total = sum(len(r) for r in results if isinstance(r, list))
            logger.info("Preloaded %d total logo entries from %d sources", total, len(sources))
    except Exception as e:
        logger.warning("Logo preload failed (will retry on first search): %s", e)


_COUNTRY_PREFIX_RE = re.compile(
    r'^(?:'
    r'[A-Z]{2,3}\s*[:|]\s*'
    r'|(?:USA?|UK|CA|AU|NZ|FR|DE|IT|ES|MX|BR|IN|JP)\s+'
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
    if name_compact.startswith(query_compact):
        return 0.9
    if len(query_compact) > 4 and query_compact in name_compact:
        return 0.85

    words = [w for w in query_lower.split() if w not in _NOISE_WORDS and len(w) > 1]
    if not words:
        ratio = SequenceMatcher(None, query_compact, name_compact).ratio()
        return ratio if ratio >= 0.5 else 0.0

    def _word_in_name(w, name):
        if len(w) <= 4:
            return name.startswith(w)
        return w in name

    if len(words) > 1:
        matched = sum(1 for w in words if _word_in_name(w, name_compact))
        if matched == len(words):
            return 0.8 + (0.1 * matched / len(words))
        if matched == 1 and len(words) > 1:
            return 0.0

    elif _word_in_name(words[0], name_compact):
        return 0.7

    ratio = SequenceMatcher(None, query_compact, name_compact).ratio()
    return ratio if ratio >= 0.5 else 0.0


@router.get("/sources", response_model=list[LogoSourceResponse])
async def list_sources(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LogoSource).order_by(LogoSource.id))
    sources = result.scalars().all()
    resp = []
    for s in sources:
        count = len(_source_caches.get(s.id, {}).get("entries", []))
        resp.append(LogoSourceResponse(
            id=s.id,
            name=s.name,
            repo_owner=s.repo_owner,
            repo_name=s.repo_name,
            branch=s.branch,
            path_prefix=s.path_prefix,
            enabled=s.enabled,
            is_builtin=s.is_builtin,
            logo_count=count,
        ))
    return resp


@router.post("/sources", response_model=LogoSourceResponse, status_code=201)
async def create_source(
    body: LogoSourceCreate,
    _user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    source = LogoSource(
        name=body.name,
        repo_owner=body.repo_owner,
        repo_name=body.repo_name,
        branch=body.branch,
        path_prefix=body.path_prefix,
        enabled=True,
        is_builtin=False,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    try:
        entries = await _get_tree_for_source(source)
        count = len(entries)
    except Exception:
        count = 0

    return LogoSourceResponse(
        id=source.id,
        name=source.name,
        repo_owner=source.repo_owner,
        repo_name=source.repo_name,
        branch=source.branch,
        path_prefix=source.path_prefix,
        enabled=source.enabled,
        is_builtin=source.is_builtin,
        logo_count=count,
    )


@router.patch("/sources/{source_id}", response_model=LogoSourceResponse)
async def update_source(
    source_id: int,
    body: LogoSourceUpdate,
    _user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LogoSource).where(LogoSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    if body.name is not None:
        source.name = body.name
    if body.enabled is not None:
        source.enabled = body.enabled
    if body.branch is not None:
        source.branch = body.branch
        if source_id in _source_caches:
            del _source_caches[source_id]
    if body.path_prefix is not None:
        source.path_prefix = body.path_prefix
        if source_id in _source_caches:
            del _source_caches[source_id]

    await db.commit()
    await db.refresh(source)

    count = len(_source_caches.get(source.id, {}).get("entries", []))
    return LogoSourceResponse(
        id=source.id,
        name=source.name,
        repo_owner=source.repo_owner,
        repo_name=source.repo_name,
        branch=source.branch,
        path_prefix=source.path_prefix,
        enabled=source.enabled,
        is_builtin=source.is_builtin,
        logo_count=count,
    )


@router.delete("/sources/{source_id}")
async def delete_source(
    source_id: int,
    _user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LogoSource).where(LogoSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    if source.is_builtin:
        raise HTTPException(status_code=400, detail="Cannot delete built-in sources. Disable them instead.")

    await db.delete(source)
    await db.commit()
    if source_id in _source_caches:
        del _source_caches[source_id]
    return {"ok": True}


@router.post("/sources/{source_id}/refresh")
async def refresh_source(
    source_id: int,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LogoSource).where(LogoSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    if source_id in _source_caches:
        del _source_caches[source_id]

    entries = await _get_tree_for_source(source)
    return {"ok": True, "logo_count": len(entries)}


@router.get("/search", response_model=list[LogoMatch])
async def search_logos(
    q: str = Query(..., min_length=1, description="Search term"),
    source_id: int | None = Query(None, description="Filter by source ID"),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if source_id is not None:
        result = await db.execute(
            select(LogoSource).where(LogoSource.id == source_id, LogoSource.enabled == True)
        )
        sources = result.scalars().all()
    else:
        result = await db.execute(
            select(LogoSource).where(LogoSource.enabled == True)
        )
        sources = result.scalars().all()

    if not sources:
        return []

    cleaned = _clean_channel_name(q)
    search_term = cleaned if cleaned else q.strip()

    logger.info("Logo search: raw=%r cleaned=%r source_id=%s offset=%d",
                q, search_term, source_id, offset)

    scored = []
    now = time.time()
    for source in sources:
        entries = _get_cached_entries(source.id)

        cache = _source_caches.get(source.id)
        if not cache or not cache["entries"] or (now - cache["fetched_at"]) >= CACHE_TTL:
            asyncio.create_task(_background_refresh(source))

        for entry in entries:
            score = _fuzzy_score(search_term, entry["filename"])
            if score >= 0.4:
                scored.append((score, entry, source))

    scored.sort(key=lambda x: x[0], reverse=True)

    page = scored[offset:offset + limit]

    results = []
    for score, entry, source in page:
        results.append(LogoMatch(
            filename=entry["filename"],
            path=entry["path"],
            url=f"{entry['raw_base']}/{entry['path']}",
            score=round(score, 3),
            source_id=source.id,
            source_name=source.name,
        ))

    return results


@router.post("/apply", response_model=LogoApplyResult)
async def apply_logo(
    request: LogoApplyRequest,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = await _get_settings(db)
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

            if backend_type == "ecm":
                channel_payload = {"logo": logo_id}
            else:
                channel_payload = {"logo_id": logo_id}
            patch_resp = await client.patch(channel_url, json=channel_payload, headers=headers)

            logger.info("Logo created id=%s, PATCH %s with %s → %s", logo_id, channel_url, channel_payload, patch_resp.status_code)

            if patch_resp.status_code not in (200, 204):
                return LogoApplyResult(
                    success=False,
                    message=f"Logo created (id={logo_id}) but failed to assign to channel: HTTP {patch_resp.status_code} - {patch_resp.text[:200]}",
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


async def _get_settings(db: AsyncSession):
    from config import get_all_settings
    return await get_all_settings(db)


async def get_backend_headers(settings: dict):
    from config import get_backend_headers as _get_headers
    return await _get_headers(settings)
