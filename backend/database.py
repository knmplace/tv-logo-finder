import os
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

DATA_DIR = Path(os.getenv("DATA_DIR", "/data"))
if not DATA_DIR.exists():
    DATA_DIR = Path("./data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "tvlogofinder.db"
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        yield session


async def init_db():
    from models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _migrate(conn)


async def _migrate(conn):
    from sqlalchemy import text
    try:
        await conn.execute(text(
            "ALTER TABLE cached_channels ADD COLUMN cache_logo_url TEXT"
        ))
    except Exception:
        pass
    try:
        await conn.execute(text(
            "ALTER TABLE logo_sources ADD COLUMN source_type VARCHAR(20) DEFAULT 'repo'"
        ))
    except Exception:
        pass
    try:
        await conn.execute(text(
            "ALTER TABLE logo_sources ADD COLUMN media_type VARCHAR(20) DEFAULT 'channel'"
        ))
    except Exception:
        pass


async def seed_builtin_sources():
    from models import LogoSource
    from sqlalchemy import select

    BUILTIN_SOURCES = [
        {
            "name": "TVLogos (jesmannstl)",
            "repo_owner": "jesmannstl",
            "repo_name": "tvlogos",
            "branch": "main",
            "path_prefix": "AllNamedByChannel/",
            "source_type": "repo",
            "media_type": "channel",
        },
        {
            "name": "TV Logos (tv-logo)",
            "repo_owner": "tv-logo",
            "repo_name": "tv-logos",
            "branch": "main",
            "path_prefix": "countries/",
            "source_type": "repo",
            "media_type": "channel",
        },
        {
            "name": "TVmaze",
            "repo_owner": None,
            "repo_name": None,
            "branch": "",
            "path_prefix": "",
            "source_type": "tvmaze",
            "media_type": "show",
        },
    ]

    async with async_session() as session:
        result = await session.execute(
            select(LogoSource).where(LogoSource.is_builtin == True)
        )
        existing = {(s.repo_owner, s.repo_name, s.source_type) for s in result.scalars().all()}

        for src in BUILTIN_SOURCES:
            key = (src["repo_owner"], src["repo_name"], src["source_type"])
            if key not in existing:
                session.add(LogoSource(**src, enabled=True, is_builtin=True))

        await session.commit()
