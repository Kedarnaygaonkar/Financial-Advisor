"""
Credit Scorer — Weighted formula model (v1)
Architecture: stable interface for replacement with Gradient Boosting in v2.
All scores are ESTIMATED — not official CIBIL/bureau scores.
"""
from typing import Optional


class CreditScorer:
    """
    Estimates credit health using a weighted composite scoring model.
    Score range: 300–900 (mirrors standard Indian credit score range for familiarity).
    
    ⚠️  This is an ESTIMATED Credit Health score, not an official CIBIL/Experian/Equifax score.
    """
    model_version: str = "weighted-formula-v1"
    score_min: int = 300
    score_max: int = 900

    def score(
        self,
        monthly_income: float,
        total_loans: float,
        monthly_emi: float,
        credit_utilization_pct: float,  # 0-100
        repayment_history_pct: float,   # 0-100, higher is better
        num_credit_accounts: int,
        num_missed_payments: int,
    ) -> dict:
        """
        Compute estimated credit health score.
        Returns: score, risk_category, component_scores, suggestions
        """
        components = {}

        # 1. Repayment History (35% weight) — most important
        repayment_score = min(repayment_history_pct / 100, 1.0)
        components["repayment_history"] = round(repayment_score * 35, 1)

        # 2. Credit Utilization (30% weight) — lower is better
        util_score = max(0, 1 - (credit_utilization_pct / 100))
        components["credit_utilization"] = round(util_score * 30, 1)

        # 3. Debt-to-Income Ratio (20% weight)
        if monthly_income > 0:
            dti = min(monthly_emi / monthly_income, 1.0)
            dti_score = max(0, 1 - (dti / 0.5))  # ideal: <50% DTI
        else:
            dti_score = 0
        components["debt_to_income"] = round(dti_score * 20, 1)

        # 4. Credit History / Accounts (10% weight)
        account_score = min(num_credit_accounts / 5, 1.0)  # ideal: 5+ accounts
        components["credit_mix"] = round(account_score * 10, 1)

        # 5. Missed payments penalty (5% weight)
        missed_penalty = max(0, 1 - (num_missed_payments * 0.2))
        components["payment_consistency"] = round(missed_penalty * 5, 1)

        total_pct = sum(components.values()) / 100  # 0-1
        score = int(self.score_min + total_pct * (self.score_max - self.score_min))
        score = max(self.score_min, min(self.score_max, score))

        # Risk category
        if score >= 750:
            risk_category = "LOW"
        elif score >= 650:
            risk_category = "MEDIUM"
        else:
            risk_category = "HIGH"

        # Suggestions
        suggestions = self._generate_suggestions(
            credit_utilization_pct, repayment_history_pct,
            monthly_emi, monthly_income, num_missed_payments
        )

        # Trajectory
        trajectory = self._predict_trajectory(score, repayment_history_pct, credit_utilization_pct)

        return {
            "estimated_credit_score": score,
            "risk_category": risk_category,
            "component_scores": components,
            "suggestions": suggestions,
            "trajectory": trajectory,
            "model_version": self.model_version,
            "disclaimer": "This is an estimated credit health score, not an official CIBIL/bureau score.",
        }

    def _generate_suggestions(self, utilization, repayment, emi, income, missed) -> list[str]:
        suggestions = []
        if utilization > 30:
            suggestions.append(f"Reduce credit card utilization below 30% (current: {utilization:.0f}%)")
        if repayment < 95:
            suggestions.append("Maintain 100% on-time payments to improve repayment history")
        if income > 0 and emi / income > 0.4:
            suggestions.append(f"Your EMI/income ratio ({emi/income*100:.0f}%) is high. Aim to keep it below 40%")
        if missed > 0:
            suggestions.append(f"Avoid missed payments — you have {missed} missed payment(s) recorded")
        if not suggestions:
            suggestions.append("Keep maintaining your excellent credit habits!")
        return suggestions

    def _predict_trajectory(self, score, repayment, utilization) -> str:
        if repayment >= 100 and utilization <= 30:
            return "IMPROVING"
        elif repayment < 90 or utilization > 70:
            return "DECLINING"
        return "STABLE"

    def get_model_info(self) -> dict:
        return {
            "model_version": self.model_version,
            "type": "weighted_formula",
            "note": "Replace with Gradient Boosting model in v2",
        }
