"""
India Tax Engine — FY 2024-25
Modular: add new files (fy_2025_26.py) for future years.
This is a TAX ESTIMATION / PLANNING tool — not an authorized filing system.
"""
from dataclasses import dataclass


@dataclass
class TaxInput:
    gross_income: float
    deductions_80c: float = 0.0       # Max 1.5L
    deductions_80d: float = 0.0       # Health insurance
    other_deductions: float = 0.0
    home_loan_interest: float = 0.0   # Sec 24(b) max 2L
    hra_exemption: float = 0.0
    capital_gains_stcg: float = 0.0   # Short term 20%
    capital_gains_ltcg: float = 0.0   # Long term >1L taxable at 12.5%


@dataclass
class TaxResult:
    regime: str
    gross_income: float
    taxable_income: float
    total_tax: float
    effective_rate: float
    slab_breakdown: list[dict]
    total_deductions: float
    cess: float
    surcharge: float
    take_home_monthly: float
    suggestions: list[str]


STANDARD_DEDUCTION_NEW = 75_000   # FY 2024-25 new regime
STANDARD_DEDUCTION_OLD = 50_000   # Old regime

# New Regime Slabs FY 2024-25
NEW_REGIME_SLABS = [
    (300_000, 0.00),
    (700_000, 0.05),
    (1_000_000, 0.10),
    (1_200_000, 0.15),
    (1_500_000, 0.20),
    (float("inf"), 0.30),
]

# Old Regime Slabs
OLD_REGIME_SLABS = [
    (250_000, 0.00),
    (500_000, 0.05),
    (1_000_000, 0.20),
    (float("inf"), 0.30),
]


def _compute_slab_tax(taxable_income: float, slabs: list) -> tuple[float, list[dict]]:
    tax = 0.0
    breakdown = []
    prev = 0
    for limit, rate in slabs:
        if taxable_income <= prev:
            break
        chunk = min(taxable_income, limit) - prev
        slab_tax = chunk * rate
        tax += slab_tax
        if chunk > 0:
            breakdown.append({
                "from": prev,
                "to": min(taxable_income, limit),
                "rate_pct": rate * 100,
                "tax": round(slab_tax, 2),
            })
        prev = limit
    return tax, breakdown


def _add_cess(tax: float) -> tuple[float, float]:
    """Health & Education Cess: 4%"""
    cess = tax * 0.04
    return cess, tax + cess


def calculate_old_regime(inp: TaxInput) -> TaxResult:
    # Standard deduction
    std_deduction = STANDARD_DEDUCTION_OLD
    deductions_80c = min(inp.deductions_80c, 150_000)
    home_loan = min(inp.home_loan_interest, 200_000)
    total_deductions = std_deduction + deductions_80c + inp.deductions_80d + inp.other_deductions + home_loan + inp.hra_exemption

    taxable = max(0, inp.gross_income - total_deductions)
    # Rebate u/s 87A: if taxable income ≤ 5L, rebate up to ₹12,500
    base_tax, breakdown = _compute_slab_tax(taxable, OLD_REGIME_SLABS)
    if taxable <= 500_000:
        base_tax = max(0, base_tax - 12_500)
    cess, total_tax = _add_cess(base_tax)

    # Add capital gains
    stcg_tax = inp.capital_gains_stcg * 0.20
    ltcg_taxable = max(0, inp.capital_gains_ltcg - 100_000)
    ltcg_tax = ltcg_taxable * 0.125
    total_tax += stcg_tax + ltcg_tax

    effective_rate = (total_tax / inp.gross_income * 100) if inp.gross_income > 0 else 0
    take_home_monthly = (inp.gross_income - total_tax) / 12

    return TaxResult(
        regime="OLD",
        gross_income=inp.gross_income,
        taxable_income=taxable,
        total_tax=round(total_tax, 2),
        effective_rate=round(effective_rate, 2),
        slab_breakdown=breakdown,
        total_deductions=round(total_deductions, 2),
        cess=round(cess, 2),
        surcharge=0,
        take_home_monthly=round(take_home_monthly, 2),
        suggestions=_old_regime_suggestions(inp, deductions_80c),
    )


def calculate_new_regime(inp: TaxInput) -> TaxResult:
    std_deduction = STANDARD_DEDUCTION_NEW
    taxable = max(0, inp.gross_income - std_deduction)

    # Rebate u/s 87A: if taxable income ≤ 7L, full rebate
    base_tax, breakdown = _compute_slab_tax(taxable, NEW_REGIME_SLABS)
    if taxable <= 700_000:
        base_tax = 0

    cess, total_tax = _add_cess(base_tax)

    # Capital gains
    stcg_tax = inp.capital_gains_stcg * 0.20
    ltcg_taxable = max(0, inp.capital_gains_ltcg - 100_000)
    ltcg_tax = ltcg_taxable * 0.125
    total_tax += stcg_tax + ltcg_tax

    effective_rate = (total_tax / inp.gross_income * 100) if inp.gross_income > 0 else 0
    take_home_monthly = (inp.gross_income - total_tax) / 12

    return TaxResult(
        regime="NEW",
        gross_income=inp.gross_income,
        taxable_income=taxable,
        total_tax=round(total_tax, 2),
        effective_rate=round(effective_rate, 2),
        slab_breakdown=breakdown,
        total_deductions=round(std_deduction, 2),
        cess=round(cess, 2),
        surcharge=0,
        take_home_monthly=round(take_home_monthly, 2),
        suggestions=_new_regime_suggestions(inp),
    )


def _old_regime_suggestions(inp: TaxInput, used_80c: float) -> list[str]:
    tips = []
    if used_80c < 150_000:
        remaining = 150_000 - used_80c
        tips.append(f"Invest ₹{remaining:,.0f} more in 80C (ELSS/PPF/NPS) to save additional tax")
    if inp.deductions_80d < 25_000:
        tips.append("Consider health insurance to claim 80D deduction (up to ₹25,000)")
    if inp.home_loan_interest == 0:
        tips.append("Home loan interest (Sec 24b) gives up to ₹2L deduction under old regime")
    if not tips:
        tips.append("You are effectively utilizing available deductions under the old regime")
    return tips


def _new_regime_suggestions(inp: TaxInput) -> list[str]:
    return [
        "New regime has fewer deductions — but lower slabs make it beneficial for incomes above ₹15L",
        "Standard deduction of ₹75,000 is available in new regime",
        "NPS employer contribution (Sec 80CCD(2)) is available even in new regime",
    ]


FINANCIAL_YEAR = "2024-25"
