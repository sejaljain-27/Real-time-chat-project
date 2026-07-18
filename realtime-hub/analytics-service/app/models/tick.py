from datetime import datetime
from pydantic import BaseModel, Field


class Tick(BaseModel):
    """A single trade tick relayed from the upstream exchange."""

    symbol: str
    price: float
    quantity: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    def to_mongo(self) -> dict:
        return {
            "symbol": self.symbol,
            "price": self.price,
            "quantity": self.quantity,
            "timestamp": self.timestamp,
        }

    def to_ws_message(self) -> dict:
        return {
            "type": "tick",
            "symbol": self.symbol,
            "price": self.price,
            "quantity": self.quantity,
            "timestamp": self.timestamp.isoformat() + "Z",
        }
