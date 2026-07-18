from app.core.db import get_db
from app.models.tick import Tick


async def save_tick(tick: Tick) -> None:
    db = get_db()
    await db.ticks.insert_one(tick.to_mongo())


async def get_recent_ticks(symbol: str, limit: int = 200) -> list[dict]:
    db = get_db()
    cursor = db.ticks.find(
        {"symbol": symbol.lower()},
        {"_id": 0},
    ).sort("timestamp", -1).limit(limit)

    docs = await cursor.to_list(length=limit)
    docs.reverse()  # oldest first, easiest for charting
    for d in docs:
        d["timestamp"] = d["timestamp"].isoformat() + "Z"
    return docs


async def get_stats(symbol: str) -> dict:
    """Rolling 24h-ish high/low/change computed from stored ticks
    (bounded to whatever history we have locally, since this is a demo)."""
    db = get_db()
    pipeline = [
        {"$match": {"symbol": symbol.lower()}},
        {
            "$group": {
                "_id": "$symbol",
                "high": {"$max": "$price"},
                "low": {"$min": "$price"},
                "count": {"$sum": 1},
                "first": {"$first": "$price"},
                "last": {"$last": "$price"},
            }
        },
    ]
    # Need chronological order for first/last to be meaningful
    cursor = db.ticks.find({"symbol": symbol.lower()}, {"_id": 0, "price": 1}).sort("timestamp", 1)
    prices = [doc["price"] async for doc in cursor]

    if not prices:
        return {"symbol": symbol, "high": None, "low": None, "changePct": None, "count": 0}

    first, last = prices[0], prices[-1]
    change_pct = ((last - first) / first) * 100 if first else 0

    return {
        "symbol": symbol,
        "high": max(prices),
        "low": min(prices),
        "last": last,
        "changePct": round(change_pct, 3),
        "count": len(prices),
    }
