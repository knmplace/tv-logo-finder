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

    result = await conn.execute(text("PRAGMA table_info(logo_sources)"))
    columns = result.fetchall()
    repo_owner_notnull = any(c[1] == "repo_owner" and c[3] for c in columns)
    if repo_owner_notnull:
        await conn.execute(text("""
            CREATE TABLE logo_sources_new (
                id INTEGER PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                repo_owner VARCHAR(255),
                repo_name VARCHAR(255),
                branch VARCHAR(100),
                path_prefix VARCHAR(500),
                enabled BOOLEAN,
                is_builtin BOOLEAN,
                source_type VARCHAR(20) DEFAULT 'repo',
                media_type VARCHAR(20) DEFAULT 'channel',
                created_at DATETIME
            )
        """))
        await conn.execute(text("""
            INSERT INTO logo_sources_new
            SELECT id, name, repo_owner, repo_name, branch, path_prefix,
                   enabled, is_builtin, source_type, media_type, created_at
            FROM logo_sources
        """))
        await conn.execute(text("DROP TABLE logo_sources"))
        await conn.execute(text("ALTER TABLE logo_sources_new RENAME TO logo_sources"))


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
