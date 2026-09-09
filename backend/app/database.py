import motor.motor_asyncio
from app.config import settings

client: motor.motor_asyncio.AsyncIOMotorClient = None
db: motor.motor_asyncio.AsyncIOMotorDatabase = None


async def connect_to_mongodb():
    global client, db
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    # Verify connection
    await client.admin.command("ping")
    print(f"✅ Connected to MongoDB Atlas: {settings.MONGODB_DB_NAME}")
    # Create indexes
    await create_indexes()


async def close_mongodb_connection():
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")


async def create_indexes():
    """Create all necessary indexes for performance and uniqueness."""
    # Users
    await db.users.create_index("email", unique=True)

    # Profiles
    await db.profiles.create_index("user_id", unique=True)

    # Income
    await db.income.create_index([("user_id", 1), ("date", -1)])

    # Expenses
    await db.expenses.create_index([("user_id", 1), ("date", -1)])
    await db.expenses.create_index([("user_id", 1), ("category", 1)])

    # Investments
    await db.investments.create_index([("user_id", 1), ("asset_type", 1)])

    # Credit Profiles
    await db.credit_profiles.create_index("user_id", unique=True)

    # Financial Goals
    await db.financial_goals.create_index([("user_id", 1), ("is_active", 1)])

    # Retirement Plans
    await db.retirement_plans.create_index("user_id", unique=True)

    # Tax Profiles
    await db.tax_profiles.create_index("user_id")

    # Financial Health Scores
    await db.financial_health_scores.create_index([("user_id", 1), ("computed_at", -1)])

    # AI conversations
    await db.ai_conversations.create_index([("user_id", 1), ("updated_at", -1)])
    await db.ai_messages.create_index([("conversation_id", 1), ("created_at", 1)])

    # Recommendations
    await db.recommendations.create_index([("user_id", 1), ("is_dismissed", 1)])

    # Business
    await db.companies.create_index("created_by")
    await db.company_users.create_index([("company_id", 1), ("user_id", 1)], unique=True)
    await db.customers.create_index("company_id")
    await db.vendors.create_index("company_id")
    await db.invoices.create_index([("company_id", 1), ("created_at", -1)])

    print("📑 MongoDB indexes created")


def get_db() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    return db
