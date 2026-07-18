from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.ws.manager import manager

router = APIRouter()


@router.websocket("/ws/{symbol}")
async def ticker_socket(websocket: WebSocket, symbol: str):
    symbol = symbol.lower()
    await manager.connect(symbol, websocket)
    try:
        while True:
            # We don't expect client -> server messages here (this is a
            # push feed), but we still need to await something to detect
            # disconnects promptly.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(symbol, websocket)
