from datetime import datetime

from app.models.tick import Tick


def test_to_mongo_shape():
    tick = Tick(symbol="btcusdt", price=67123.45, quantity=0.002, timestamp=datetime(2026, 1, 1, 12, 0, 0))
    doc = tick.to_mongo()

    assert doc == {
        "symbol": "btcusdt",
        "price": 67123.45,
        "quantity": 0.002,
        "timestamp": datetime(2026, 1, 1, 12, 0, 0),
    }


def test_to_ws_message_has_iso_timestamp_and_type():
    tick = Tick(symbol="ethusdt", price=3000.5, quantity=1.2, timestamp=datetime(2026, 1, 1, 12, 0, 0))
    msg = tick.to_ws_message()

    assert msg["type"] == "tick"
    assert msg["symbol"] == "ethusdt"
    assert msg["price"] == 3000.5
    assert msg["timestamp"].startswith("2026-01-01T12:00:00")


def test_defaults_timestamp_to_now_when_omitted():
    before = datetime.utcnow()
    tick = Tick(symbol="solusdt", price=150.0, quantity=5.0)
    after = datetime.utcnow()

    assert before <= tick.timestamp <= after
