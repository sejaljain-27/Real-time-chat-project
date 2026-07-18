import pytest

from app.ingestion import binance_client
from app.ws.manager import manager
from tests.fakes import FakeWebSocket


def test_build_stream_url_joins_symbols_with_trade_suffix():
    url = binance_client._build_stream_url(["btcusdt", "ethusdt"])
    assert url.endswith("?streams=btcusdt@trade/ethusdt@trade")
    assert url.startswith("wss://")


@pytest.mark.asyncio
async def test_handle_trade_message_saves_and_broadcasts(monkeypatch):
    saved = []
    broadcasted = []

    async def fake_save_tick(tick):
        saved.append(tick)

    async def fake_broadcast(symbol, message):
        broadcasted.append((symbol, message))

    monkeypatch.setattr(binance_client, "save_tick", fake_save_tick)
    monkeypatch.setattr(manager, "broadcast", fake_broadcast)

    raw = {
        "stream": "btcusdt@trade",
        "data": {"s": "BTCUSDT", "p": "67123.45", "q": "0.002"},
    }

    await binance_client._handle_trade_message(raw)

    assert len(saved) == 1
    assert saved[0].symbol == "btcusdt"
    assert saved[0].price == 67123.45

    assert len(broadcasted) == 1
    symbol, message = broadcasted[0]
    assert symbol == "btcusdt"
    assert message["type"] == "tick"
    assert message["price"] == 67123.45


@pytest.mark.asyncio
async def test_handle_trade_message_ignores_malformed_payload(monkeypatch):
    calls = []
    monkeypatch.setattr(binance_client, "save_tick", lambda tick: calls.append(tick))

    # Missing "data" entirely should be a no-op, not a crash.
    await binance_client._handle_trade_message({})

    assert calls == []
