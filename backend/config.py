import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import require_admin, get_current_user
from database import get_db
from models import AppConfig, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/settings", tags=["settings"])

VALID_KEYS = {"backend_type", "backend_url", "backend_api_key", "backend_username", "backend_password", "backend_auth_method"}


class SettingsResponse(BaseModel):
    backend_type: str | None = None
    backend_url: str | None = None
    backend_api_key: str | None = None
    backend_username: str | None = None
    backend_password: str | None = None
    backend_auth_method: str | None = None


class SettingsUpdate(BaseModel):
    backend_type: str | None = None
    backend_url: str | None = None
    backend_api_key: str | None = None
    backend_username: str | None = None
    backend_password: str | None = None
    backend_auth_method: str | None = None


class ConnectionTestResult(BaseModel):
    success: bool
    message: str


async def get_backend_headers(settings: dict) -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    auth_method = settings.get("backend_auth_method", "api_key")
    backend_url = settings.get("backend_url", "")

    if auth_method == "api_key" and settings.get("backend_api_key"):
        headers["X-API-Key"] = settings["backend_api_key"]
    elif auth_method == "password":
        username = settings.get("backend_username")
        password = settings.get("backend_password")
        if username and password and backend_url:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        f"{backend_url}/api/accounts/token/",
                        json={"username": username, "password": password},
                    )
                    if resp.status_code == 200:
                        token = resp.json().get("access")
                        if token:
                            headers["Authorization"] = f"Bearer {token}"
                    else:
                        logger.warning("Dispatcharr auth returned %s", resp.status_code)
            except Exception:
                logger.warning("Failed to authenticate with Dispatcharr")

    return headers


async def get_setting(db: AsyncSession, key: str) -> str | None:
    result = await db.execute(select(AppConfig).where(AppConfig.key == key))
    config = result.scalar_one_or_none()
    return config.value if config else None


async def get_all_settings(db: AsyncSession) -> dict[str, str | None]:
    result = await db.execute(select(AppConfig).where(AppConfig.key.in_(VALID_KEYS)))
    rows = result.scalars().all()
    settings = {key: None for key in VALID_KEYS}
    for row in rows:
        settings[row.key] = row.value
    return settings


@router.get("", response_model=SettingsResponse)
async def read_settings(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = await get_all_settings(db)
    return SettingsResponse(**settings)


@router.put("", response_model=SettingsResponse)
async def update_settings(
    update: SettingsUpdate,
    _user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    updates = update.model_dump(exclude_none=True)

    if "backend_type" in updates and updates["backend_type"] not in ("ecm", "dispatcharr"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="backend_type must be 'ecm' or 'dispatcharr'",
        )

    if "backend_url" in updates:
        url = updates["backend_url"].rstrip("/")
        updates["backend_url"] = url

    for key, value in updates.items():
        result = await db.execute(select(AppConfig).where(AppConfig.key == key))
        existing = result.scalar_one_or_none()
        if existing:
            existing.value = value
        else:
            db.add(AppConfig(key=key, value=value))

    await db.commit()

    settings = await get_all_settings(db)
    return SettingsResponse(**settings)


@router.post("/test-connection", response_model=ConnectionTestResult)
async def test_connection(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = await get_all_settings(db)
    backend_type = settings.get("backend_type")
    backend_url = settings.get("backend_url")

    if not backend_type or not backend_url:
        return ConnectionTestResult(success=False, message="Backend type and URL must be configured first")

    if backend_type == "ecm":
        test_url = f"{backend_url}/api/channels/"
    elif backend_type == "dispatcharr":
        test_url = f"{backend_url}/api/channels/channels/"
    else:
        return ConnectionTestResult(success=False, message=f"Unknown backend type: {backend_type}")

    headers = await get_backend_headers(settings)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(test_url, headers=headers)

        if resp.status_code == 200:
            return ConnectionTestResult(success=True, message=f"Connected to {backend_type} at {backend_url}")
        else:
            return ConnectionTestResult(
                success=False,
                message=f"Server returned HTTP {resp.status_code}: {resp.text[:200]}",
            )
    except httpx.ConnectError:
        return ConnectionTestResult(success=False, message=f"Cannot connect to {backend_url}")
    except httpx.TimeoutException:
        return ConnectionTestResult(success=False, message=f"Connection timed out to {backend_url}")
    except Exception as e:
        logger.exception("Connection test failed")
        return ConnectionTestResult(success=False, message=f"Error: {str(e)}")
