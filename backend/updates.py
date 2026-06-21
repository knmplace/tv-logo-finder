import logging
import time
import re

import httpx
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from auth import get_current_user
from models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/updates", tags=["updates"])

CURRENT_VERSION = "1.0.1"
GITHUB_RELEASES_URL = "https://api.github.com/repos/knmplace/tv-logo-finder/releases"

_update_cache: dict = {"data": None, "fetched_at": 0.0}
CACHE_TTL = 86400


def _parse_version(v: str) -> tuple[tuple[int, ...], str]:
    v = v.lstrip("v")
    match = re.match(r"^(\d+\.\d+\.\d+)(?:-(.+))?$", v)
    if not match:
        return (0, 0, 0), ""
    nums = tuple(int(x) for x in match.group(1).split("."))
    pre = match.group(2) or ""
    return nums, pre


def _is_newer(remote: str, current: str) -> bool:
    r_nums, r_pre = _parse_version(remote)
    c_nums, c_pre = _parse_version(current)
    if r_nums > c_nums:
        return True
    if r_nums == c_nums and c_pre == "" and r_pre == "":
        return False
    if r_nums == c_nums and c_pre and not r_pre:
        return True
    return False


class UpdateInfo(BaseModel):
    update_available: bool
    current_version: str
    latest_stable: str | None = None
    latest_beta: str | None = None
    stable_notes: str | None = None
    beta_notes: str | None = None
    stable_url: str | None = None
    beta_url: str | None = None


@router.get("/check", response_model=UpdateInfo)
async def check_updates(
    include_beta: bool = Query(True, description="Include beta/pre-release versions"),
    _user: User = Depends(get_current_user),
):
    now = time.time()
    if _update_cache["data"] is None or (now - _update_cache["fetched_at"]) >= CACHE_TTL:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(GITHUB_RELEASES_URL, headers={"Accept": "application/vnd.github+json"})
                resp.raise_for_status()
                _update_cache["data"] = resp.json()
                _update_cache["fetched_at"] = now
        except Exception as e:
            logger.warning("Failed to check for updates: %s", e)
            if _update_cache["data"] is None:
                return UpdateInfo(
                    update_available=False,
                    current_version=CURRENT_VERSION,
                )

    releases = _update_cache["data"] or []

    latest_stable = None
    latest_beta = None

    for rel in releases:
        tag = rel.get("tag_name", "")
        is_pre = rel.get("prerelease", False)
        is_draft = rel.get("draft", False)
        if is_draft:
            continue

        _, pre = _parse_version(tag)
        is_beta = is_pre or bool(pre)

        if is_beta and not latest_beta:
            latest_beta = rel
        elif not is_beta and not latest_stable:
            latest_stable = rel

        if latest_stable and latest_beta:
            break

    result = UpdateInfo(
        update_available=False,
        current_version=CURRENT_VERSION,
    )

    if latest_stable:
        tag = latest_stable["tag_name"]
        result.latest_stable = tag.lstrip("v")
        result.stable_notes = latest_stable.get("body", "")
        result.stable_url = latest_stable.get("html_url", "")
        if _is_newer(tag, CURRENT_VERSION):
            result.update_available = True

    if include_beta and latest_beta:
        tag = latest_beta["tag_name"]
        result.latest_beta = tag.lstrip("v")
        result.beta_notes = latest_beta.get("body", "")
        result.beta_url = latest_beta.get("html_url", "")
        if _is_newer(tag, CURRENT_VERSION):
            result.update_available = True

    return result
