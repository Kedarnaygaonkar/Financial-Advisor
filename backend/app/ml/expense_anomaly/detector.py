"""
Expense Anomaly Detector — Z-score based (v1)
Architecture allows replacement with Isolation Forest / LSTM in v2.
"""


class AnomalyDetector:
    """
    Detects expense anomalies using statistical thresholds.
    Uses Z-score (2.5 sigma) approach.
    """
    model_version: str = "zscore-v1"
    threshold_sigma: float = 2.5

    def detect(
        self,
        amount: float,
        category: str,
        historical_avg: float,
        historical_std: float,
        sample_count: int,
    ) -> dict:
        """
        Returns is_anomaly, reason, severity.
        Requires at least 3 historical data points.
        """
        if sample_count < 3:
            return {"is_anomaly": False, "reason": None, "severity": None}

        std = historical_std or historical_avg * 0.3
        z_score = (amount - historical_avg) / std if std > 0 else 0

        if z_score > self.threshold_sigma:
            severity = "HIGH" if z_score > 4.0 else "MEDIUM"
            return {
                "is_anomaly": True,
                "z_score": round(z_score, 2),
                "severity": severity,
                "reason": (
                    f"This {category.lower()} expense (₹{amount:,.0f}) is unusually high. "
                    f"Your typical range is ₹{historical_avg - std:,.0f}–₹{historical_avg + std:,.0f} "
                    f"(avg ₹{historical_avg:,.0f})."
                ),
            }

        return {"is_anomaly": False, "z_score": round(z_score, 2), "reason": None, "severity": None}

    def get_model_info(self) -> dict:
        return {
            "model_version": self.model_version,
            "type": "statistical_zscore",
            "threshold_sigma": self.threshold_sigma,
            "note": "Replace with Isolation Forest or LSTM in v2",
        }
