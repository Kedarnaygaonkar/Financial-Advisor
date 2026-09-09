from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import Field
from app.models.base import MongoBaseModel, utcnow


class AssetType(str, Enum):
    STOCKS = "STOCKS"
    MUTUAL_FUNDS = "MUTUAL_FUNDS"
    ETF = "ETF"
    BONDS = "BONDS"
    FD = "FD"
    GOLD = "GOLD"
    OTHER = "OTHER"


class InvestmentDocument(MongoBaseModel):
    user_id: str
    asset_type: AssetType
    name: str
    symbol: Optional[str] = None
    quantity: float
    purchase_price: float
    purchase_date: datetime
    current_price: float
    current_price_updated_at: datetime = Field(default_factory=utcnow)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    @property
    def invested_amount(self) -> float:
        return self.quantity * self.purchase_price

    @property
    def current_value(self) -> float:
        return self.quantity * self.current_price

    @property
    def profit_loss(self) -> float:
        return self.current_value - self.invested_amount

    @property
    def return_pct(self) -> float:
        if self.invested_amount == 0:
            return 0.0
        return (self.profit_loss / self.invested_amount) * 100
