"""
Expense Classifier — Rule-based (v1)
Architecture is designed so a trained ML model can replace this in v2
by implementing the same classify() interface.
"""
import re
from typing import Optional


RULES: list[tuple[list[str], str]] = [
    # FOOD
    (["swiggy", "zomato", "dunzo", "restaurant", "cafe", "dhaba", "hotel", "biryani",
      "pizza", "burger", "coffee", "chai", "food", "meal", "lunch", "dinner", "breakfast",
      "snack", "grocery", "vegetables", "fruits", "supermart", "bigbasket", "blinkit",
      "zepto", "instamart"], "FOOD"),
    # TRAVEL
    (["uber", "ola", "rapido", "auto", "cab", "taxi", "bus", "metro", "train", "irctc",
      "flight", "indigo", "air india", "spicejet", "vistara", "airline", "petrol", "fuel",
      "diesel", "cng", "toll", "parking", "travel", "trip", "journey"], "TRAVEL"),
    # SHOPPING
    (["amazon", "flipkart", "myntra", "meesho", "ajio", "nykaa", "shopping", "clothes",
      "dress", "shoes", "shirt", "jeans", "accessories", "watch", "electronics", "mobile",
      "laptop", "gadget", "purchase", "buy", "order"], "SHOPPING"),
    # BILLS
    (["electricity", "water", "gas", "broadband", "wifi", "internet", "airtel", "jio",
      "vodafone", "bsnl", "recharge", "mobile bill", "utility", "maintenance", "society",
      "cable", "dth", "tata sky", "subscription", "netflix", "hotstar", "prime",
      "spotify", "youtube premium"], "BILLS"),
    # RENT
    (["rent", "rental", "house rent", "flat rent", "pg", "hostel", "accommodation",
      "lease"], "RENT"),
    # EMI
    (["emi", "loan payment", "equated monthly", "home loan", "car loan", "personal loan",
      "credit card payment", "mortgage"], "EMI"),
    # MEDICAL
    (["hospital", "clinic", "doctor", "medicine", "pharmacy", "medical", "health",
      "apollo", "fortis", "max hospital", "1mg", "netmeds", "pharmeasy", "diagnostic",
      "lab", "test", "surgery", "dental", "eye care", "physiotherapy"], "MEDICAL"),
    # EDUCATION
    (["school", "college", "university", "course", "fees", "tuition", "coaching",
      "udemy", "coursera", "byju", "unacademy", "books", "stationery", "exam",
      "certification", "education"], "EDUCATION"),
    # ENTERTAINMENT
    (["movie", "cinema", "pvr", "inox", "concert", "show", "theatre", "gaming",
      "game", "sports", "gym", "fitness", "club", "party", "outing", "fun",
      "amusement", "bowling", "karting"], "ENTERTAINMENT"),
    # INVESTMENT
    (["zerodha", "groww", "upstox", "angel", "mutual fund", "sip", "nps", "ppf",
      "stock", "share", "equity", "bond", "fd", "fixed deposit", "gold", "invest",
      "portfolio", "demat"], "INVESTMENT"),
]


class ExpenseClassifier:
    """
    Rule-based expense classifier (v1).
    Replace this class with a trained model in v2 by keeping the same interface.
    """

    model_version: str = "rule-based-v1"

    def classify(self, text: str) -> dict:
        """
        Classify expense description into a category.
        Returns: {category, confidence, model_version}
        """
        text_lower = text.lower().strip()

        for keywords, category in RULES:
            for kw in keywords:
                if kw in text_lower:
                    return {
                        "category": category,
                        "confidence": 0.85,
                        "model_version": self.model_version,
                        "matched_keyword": kw,
                    }

        return {
            "category": "OTHER",
            "confidence": 0.5,
            "model_version": self.model_version,
            "matched_keyword": None,
        }

    def get_model_info(self) -> dict:
        return {
            "model_version": self.model_version,
            "type": "rule_based",
            "categories": [cat for _, cat in RULES],
            "note": "Replace with trained text classifier in v2",
        }
