import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import ensure_indexes
from app.ingestion.binance_client import run_ingestion
from app.ws.router import router as ws_router
from app.api.history import router as history_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

_ingestion_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _ingestion_task
    await ensure_indexes()
    _ingestion_task = asyncio.create_task(run_ingestion())
    yield
    if _ingestion_task:
        _ingestion_task.cancel()
        try:
            await _ingestion_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Realtime Analytics Service",
    description="FastAPI microservice that relays live crypto trade ticks over WebSocket.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.client_origin.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_router)
app.include_router(history_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "analytics-service"}
