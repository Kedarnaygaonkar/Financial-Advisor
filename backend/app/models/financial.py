from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import Field
from app.models.base import MongoBaseModel, utcnow


class GoalType(str, Enum):
    HOUSE = "HOUSE"
    CAR = "CAR"
    EDUCATION = "EDUCATION"
    MARRIAGE = "MARRIAGE"
    TRAVEL = "TRAVEL"
    EMERGENCY_FUND = "EMERGENCY_FUND"
    RETIREMENT = "RETIREMENT"
    OTHER = "OTHER"


class CreditRiskCategory(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class TaxRegime(str, Enum):
    OLD = "OLD"
    NEW = "NEW"


class FinancialGoalDocument(MongoBaseModel):
    user_id: str
    name: str
    goal_type: GoalType = GoalType.OTHER
    target_amount: float
    current_amount: float = 0.0
    target_date: datetime
    inflation_rate: float = 6.0  # Default 6% India inflation
    expected_return: float = 12.0  # Default 12% equity return
    monthly_contribution: float = 0.0
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class CreditProfileDocument(MongoBaseModel):
    user_id: str
    monthly_income: float
    total_loans: float = 0.0
    monthly_emi: float = 0.0
    credit_utilization_pct: float = 0.0
    repayment_history_pct: float = 100.0
    num_credit_accounts: int = 0
    num_missed_payments: int = 0
    estimated_credit_score: int = 700
    risk_category: CreditRiskCategory = CreditRiskCategory.LOW
    suggestions: list[str] = []
    computed_at: datetime = Field(default_factory=utcnow)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class RetirementPlanDocument(MongoBaseModel):
    user_id: str
    current_age: int
    retirement_age: int = 60
    current_monthly_income: float
    current_monthly_expenses: float
    current_investments: float = 0.0
    inflation_rate: float = 6.0
    expected_return: float = 12.0
    computed_corpus_required: float = 0.0
    computed_corpus_projected: float = 0.0
    computed_monthly_investment: float = 0.0
    updated_at: datetime = Field(default_factory=utcnow)


class TaxProfileDocument(MongoBaseModel):
    user_id: str
    financial_year: str = "2024-25"
    gross_income: float = 0.0
    deductions_80c: float = 0.0
    deductions_80d: float = 0.0
    other_deductions: float = 0.0
    capital_gains_stcg: float = 0.0
    capital_gains_ltcg: float = 0.0
    home_loan_interest: float = 0.0
    hra_exemption: float = 0.0
    preferred_regime: Optional[TaxRegime] = None
    updated_at: datetime = Field(default_factory=utcnow)


class FinancialHealthScoreDocument(MongoBaseModel):
    user_id: str
    score: int  # 0-100
    components: dict = {}  # savings, debt, liquidity, investments, income_stability, emergency_fund, goals, insurance
    delta_reasons: list[str] = []
    computed_at: datetime = Field(default_factory=utcnow)
