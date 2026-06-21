import asyncio
import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from config import get_all_settings, get_backend_headers
from database import get_db
from models import CachedChannel, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/channels", tags=["channels"])


class ChannelResponse(BaseModel):
    id: int
    name: str
    number: int | None
    group_name: str | None
    current_logo_url: str | None
    cache_logo_url: str | None
    logo_id: int | None
    synced_at: datetime


class SyncResult(BaseModel):
    synced: int
    message: str


def _parse_ecm_channels(data: list[dict]) -> list[dict]:
    channels = []
    for ch in data:
        logo = ch.get("logo") or {}
        group = ch.get("group") or {}
        channels.append({
            "id": ch["id"],
            "name": ch.get("name", ""),
            "number": ch.get("channel_number"),
            "group_name": group.get("name"),
            "current_logo_url": logo.get("url"),
            "cache_logo_url": logo.get("url"),
            "logo_id": logo.get("id"),
        })
    return channels


def _parse_dispatcharr_channels(data: list[dict], backend_url: str, group_map: dict[int, str] | None = None, logo_map: dict[int, str] | None = None) -> list[dict]:
    channels = []
    for ch in data:
        logo_id = ch.get("effective_logo_id") or ch.get("logo_id")
        logo_url = None
        cache_url = None
        if logo_id:
            cache_url = f"{backend_url}/api/channels/logos/{logo_id}/cache/"
            if logo_map and logo_id in logo_map:
                logo_url = logo_map[logo_id]
            else:
                logo_url = cache_url

        group = ch.get("group")
        if isinstance(group, dict):
            group_name = group.get("name")
        elif ch.get("channel_group_id") and group_map:
            group_name = group_map.get(ch["channel_group_id"])
        else:
            group_name = None

        channels.append({
            "id": ch["id"],
            "name": ch.get("effective_name") or ch.get("name", ""),
            "number": ch.get("effective_channel_number") or ch.get("channel_number"),
            "group_name": group_name,
            "current_logo_url": logo_url,
            "cache_logo_url": cache_url,
            "logo_id": logo_id,
        })
    return channels


async def _paginate(client: httpx.AsyncClient, url: str, headers: dict) -> list[dict]:
    items = []
    page_url = url
    while page_url:
        resp = await client.get(page_url, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and "results" in data:
            items.extend(data["results"])
            page_url = data.get("next")
        elif isinstance(data, list):
            items.extend(data)
            page_url = None
        else:
            page_url = None
    return items


async def _fetch_groups(client: httpx.AsyncClient, backend_url: str, headers: dict) -> dict[int, str]:
    group_map = {}
    try:
        resp = await client.get(f"{backend_url}/api/channels/groups/", headers=headers)
        if resp.status_code == 200:
            groups = resp.json()
            if isinstance(groups, dict) and "results" in groups:
                groups = groups["results"]
            for g in groups:
                if isinstance(g, dict) and "id" in g and "name" in g:
                    group_map[g["id"]] = g["name"]
    except Exception:
        logger.warning("Could not fetch channel groups")
    return group_map


async def _fetch_logos_by_ids(client: httpx.AsyncClient, backend_url: str, headers: dict, logo_ids: set[int]) -> dict[int, str]:
    if not logo_ids:
        return {}

    logo_map = {}
    sem = asyncio.Semaphore(20)

    async def fetch_one(lid: int):
        async with sem:
            try:
                resp = await client.get(f"{backend_url}/api/channels/logos/{lid}/", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("url"):
                        logo_map[lid] = data["url"]
            except Exception:
                pass

    await asyncio.gather(*(fetch_one(lid) for lid in logo_ids))
    return logo_map


async def _fetch_channels(settings: dict) -> list[dict]:
    backend_type = settings.get("backend_type")
    backend_url = settings.get("backend_url")

    if not backend_type or not backend_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Backend not configured. Set backend_type and backend_url in settings.",
        )

    if backend_type == "ecm":
        url = f"{backend_url}/api/channels/"
    else:
        url = f"{backend_url}/api/channels/channels/"

    headers = await get_backend_headers(settings)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if backend_type == "ecm":
                all_items = await _paginate(client, url, headers)
                return _parse_ecm_channels(all_items)

            all_items, group_map = await asyncio.gather(
                _paginate(client, url, headers),
                _fetch_groups(client, backend_url, headers),
            )

            logo_ids = set()
            for ch in all_items:
                lid = ch.get("effective_logo_id") or ch.get("logo_id")
                if lid:
                    logo_ids.add(lid)

            logo_map = await _fetch_logos_by_ids(client, backend_url, headers, logo_ids)

    except httpx.ConnectError:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Cannot connect to {backend_url}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Backend request timed out")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Backend returned {e.response.status_code}")

    return _parse_dispatcharr_channels(all_items, backend_url, group_map, logo_map)


@router.get("", response_model=list[ChannelResponse])
async def list_channels(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CachedChannel).order_by(CachedChannel.number, CachedChannel.name))
    channels = result.scalars().all()
    return [
        ChannelResponse(
            id=ch.id,
            name=ch.name,
            number=ch.number,
            group_name=ch.group_name,
            current_logo_url=ch.current_logo_url,
            cache_logo_url=ch.cache_logo_url,
            logo_id=ch.logo_id,
            synced_at=ch.synced_at,
        )
        for ch in channels
    ]


@router.post("/sync", response_model=SyncResult)
async def sync_channels(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = await get_all_settings(db)
    channels = await _fetch_channels(settings)

    now = datetime.now(timezone.utc)

    await db.execute(delete(CachedChannel))

    for ch in channels:
        db.add(CachedChannel(
            id=ch["id"],
            name=ch["name"],
            number=ch["number"],
            group_name=ch["group_name"],
            current_logo_url=ch["current_logo_url"],
            cache_logo_url=ch.get("cache_logo_url"),
            logo_id=ch["logo_id"],
            synced_at=now,
        ))

    await db.commit()

    logger.info("Synced %d channels from backend", len(channels))
    return SyncResult(synced=len(channels), message=f"Synced {len(channels)} channels")
