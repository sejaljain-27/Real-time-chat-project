import asyncio
import json
import logging

import websockets

from app.core.config import settings
from app.models.tick import Tick
from app.services.tick_service import save_tick
from app.ws.manager import manager

logger = logging.getLogger("ingestion")

RECONNECT_DELAY_SECONDS = 3
MAX_RECONNECT_DELAY_SECONDS = 30


def _build_stream_url(symbols: list[str]) -> str:
    streams = "/".join(f"{s}@trade" for s in symbols)
    return f"{settings.binance_ws_url}?streams={streams}"


async def _handle_trade_message(raw: dict) -> None:
    """Binance combined-stream payload looks like:
    {"stream": "btcusdt@trade", "data": {"s": "BTCUSDT", "p": "67123.45", "q": "0.002", ...}}
    """
    data = raw.get("data", {})
    symbol = data.get("s", "").lower()
    price = data.get("p")
    qty = data.get("q")
    if not symbol or price is None:
        return

    tick = Tick(symbol=symbol, price=float(price), quantity=float(qty or 0))

    # Persist for history/backfill, then fan out to connected browsers.
    await save_tick(tick)
    await manager.broadcast(symbol, tick.to_ws_message())


async def run_ingestion(symbols: list[str] | None = None) -> None:
    """Long-running task: connects to Binance's public trade stream and
    never returns (unless cancelled). Reconnects with backoff on drop —
    upstream WS connections *will* disconnect periodically, and losing
    data silently here would be a real production bug."""
    symbols = symbols or settings.symbol_list
    url = _build_stream_url(symbols)
    delay = RECONNECT_DELAY_SECONDS

    while True:
        try:
            logger.info("Connecting to upstream feed: %s", url)
            async with websockets.connect(url, ping_interval=20, ping_timeout=20) as ws:
                logger.info("Connected. Streaming symbols: %s", symbols)
                delay = RECONNECT_DELAY_SECONDS  # reset backoff after a successful connect

                async for raw_message in ws:
                    try:
                        payload = json.loads(raw_message)
                        await _handle_trade_message(payload)
                    except Exception:
                        logger.exception("Failed to process upstream message")

        except asyncio.CancelledError:
            logger.info("Ingestion task cancelled, shutting down cleanly.")
            raise
        except Exception as exc:
            logger.warning("Upstream connection dropped (%s). Reconnecting in %ss...", exc, delay)
            await asyncio.sleep(delay)
            delay = min(delay * 2, MAX_RECONNECT_DELAY_SECONDS)
