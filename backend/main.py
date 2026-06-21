import asyncio
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router
from channels import router as channels_router
from config import router as config_router
from database import init_db
from logos import router as logos_router, _get_tree

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def _preload_logo_tree():
    try:
        entries = await _get_tree()
        logger.info("Preloaded %d logo entries from GitHub", len(entries))
    except Exception as e:
        logger.warning("Logo tree preload failed (will retry on first search): %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database")
    await init_db()
    asyncio.create_task(_preload_logo_tree())
    logger.info("TV Logo Finder backend ready")
    yield


app = FastAPI(
    title="TV Logo Finder (Beta)",
    version="1.0.0-beta.4",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(config_router)
app.include_router(channels_router)
app.include_router(logos_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=6102, reload=True)
