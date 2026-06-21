import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from config import get_all_settings
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
            "logo_id": logo.get("id"),
        })
    return channels


def _parse_dispatcharr_channels(data: list[dict]) -> list[dict]:
    channels = []
    for ch in data:
        logo = ch.get("logo") or {}
        group = ch.get("group") or {}
        channels.append({
            "id": ch["id"],
            "name": ch.get("name", ""),
            "number": ch.get("channel_number"),
            "group_name": group.get("name") if isinstance(group, dict) else str(group),
            "current_logo_url": logo.get("url") if isinstance(logo, dict) else None,
            "logo_id": logo.get("id") if isinstance(logo, dict) else None,
        })
    return channels


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

    headers = {}
    if settings.get("backend_api_key"):
        headers["Authorization"] = f"Bearer {settings['backend_api_key']}"

    all_items = []
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            page_url = url
            while page_url:
                resp = await client.get(page_url, headers=headers)
                resp.raise_for_status()
                data = resp.json()

                if isinstance(data, dict) and "results" in data:
                    all_items.extend(data["results"])
                    page_url = data.get("next")
                elif isinstance(data, list):
                    all_items.extend(data)
                    page_url = None
                else:
                    all_items.extend(data) if isinstance(data, list) else None
                    page_url = None
    except httpx.ConnectError:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Cannot connect to {backend_url}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Backend request timed out")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Backend returned {e.response.status_code}")

    if backend_type == "ecm":
        return _parse_ecm_channels(all_items)
    return _parse_dispatcharr_channels(all_items)


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
            logo_id=ch["logo_id"],
            synced_at=now,
        ))

    await db.commit()

    logger.info("Synced %d channels from backend", len(channels))
    return SyncResult(synced=len(channels), message=f"Synced {len(channels)} channels")
