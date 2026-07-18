import pytest

from app.ws.manager import ConnectionManager
from tests.fakes import FakeWebSocket


@pytest.mark.asyncio
async def test_connect_accepts_and_tracks_socket():
    manager = ConnectionManager()
    ws = FakeWebSocket()

    await manager.connect("btcusdt", ws)

    assert ws.accepted is True
    assert manager.connection_count("btcusdt") == 1
    assert "btcusdt" in manager.active_symbols()


@pytest.mark.asyncio
async def test_broadcast_delivers_to_all_sockets_in_room():
    manager = ConnectionManager()
    ws1, ws2 = FakeWebSocket(), FakeWebSocket()
    await manager.connect("btcusdt", ws1)
    await manager.connect("btcusdt", ws2)

    message = {"type": "tick", "price": 100}
    await manager.broadcast("btcusdt", message)

    assert ws1.sent_messages == [message]
    assert ws2.sent_messages == [message]


@pytest.mark.asyncio
async def test_broadcast_only_reaches_subscribers_of_that_symbol():
    manager = ConnectionManager()
    btc_ws = FakeWebSocket()
    eth_ws = FakeWebSocket()
    await manager.connect("btcusdt", btc_ws)
    await manager.connect("ethusdt", eth_ws)

    await manager.broadcast("btcusdt", {"price": 1})

    assert len(btc_ws.sent_messages) == 1
    assert len(eth_ws.sent_messages) == 0


@pytest.mark.asyncio
async def test_dead_socket_is_pruned_during_broadcast():
    manager = ConnectionManager()
    healthy = FakeWebSocket()
    dead = FakeWebSocket(fail_on_send=True)
    await manager.connect("btcusdt", healthy)
    await manager.connect("btcusdt", dead)

    assert manager.connection_count("btcusdt") == 2

    await manager.broadcast("btcusdt", {"price": 1})

    # the dead socket should have been removed after a failed send
    assert manager.connection_count("btcusdt") == 1
    assert healthy.sent_messages == [{"price": 1}]


@pytest.mark.asyncio
async def test_disconnect_removes_symbol_room_when_empty():
    manager = ConnectionManager()
    ws = FakeWebSocket()
    await manager.connect("btcusdt", ws)

    await manager.disconnect("btcusdt", ws)

    assert manager.connection_count("btcusdt") == 0
    assert "btcusdt" not in manager.active_symbols()
