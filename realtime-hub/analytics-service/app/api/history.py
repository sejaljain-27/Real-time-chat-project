from fastapi import APIRouter, Query

from app.services.tick_service import get_recent_ticks, get_stats
from app.ws.manager import manager

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/history")
async def history(
    symbol: str = Query(..., description="e.g. btcusdt"),
    limit: int = Query(200, ge=1, le=1000),
):
    ticks = await get_recent_ticks(symbol.lower(), limit=limit)
    return {"symbol": symbol.lower(), "ticks": ticks}


@router.get("/stats")
async def stats(symbol: str = Query(..., description="e.g. btcusdt")):
    return await get_stats(symbol.lower())


@router.get("/status")
async def status():
    symbols = manager.active_symbols()
    return {
        "activeSymbols": symbols,
        "connections": {s: manager.connection_count(s) for s in symbols},
    }
