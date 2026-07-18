import asyncio
from collections import defaultdict
from fastapi import WebSocket


class ConnectionManager:
    """Tracks which browser sockets are subscribed to which symbol and
    fans out ticks to them. One backend connection per browser tab;
    N browsers can share a single upstream Binance subscription."""

    def __init__(self) -> None:
        # symbol -> set of active websockets
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, symbol: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._rooms[symbol].add(websocket)

    async def disconnect(self, symbol: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._rooms[symbol].discard(websocket)
            if not self._rooms[symbol]:
                del self._rooms[symbol]

    async def broadcast(self, symbol: str, message: dict) -> None:
        dead: list[WebSocket] = []
        for ws in list(self._rooms.get(symbol, [])):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(symbol, ws)

    def active_symbols(self) -> list[str]:
        return list(self._rooms.keys())

    def connection_count(self, symbol: str) -> int:
        return len(self._rooms.get(symbol, set()))


manager = ConnectionManager()
