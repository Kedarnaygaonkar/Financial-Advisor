from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import connect_to_mongodb, close_mongodb_connection

# Routers
from app.auth.router import router as auth_router
from app.individual.dashboard.router import router as dashboard_router
from app.individual.income.router import router as income_router
from app.individual.expenses.router import router as expenses_router
from app.individual.investments.router import router as investments_router
from app.individual.credit.router import router as credit_router
from app.individual.tax.router import router as tax_router
from app.individual.goals.router import router as goals_router
from app.individual.retirement.router import router as retirement_router
from app.individual.financial_health.router import router as financial_health_router
from app.individual.ai.router import router as ai_router
from app.business.router import router as business_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    await connect_to_mongodb()
    yield
    await close_mongodb_connection()


# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(
    title="AI Financial OS",
    description="AI-powered Financial Advisor — Individual & Business",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-Access-Token"],
)

# ─── API Routes ───────────────────────────────────────────────────────────────
API_V1 = "/api/v1"

app.include_router(auth_router, prefix=API_V1)

# Individual
app.include_router(dashboard_router, prefix=f"{API_V1}/individual")
app.include_router(income_router, prefix=f"{API_V1}/individual")
app.include_router(expenses_router, prefix=f"{API_V1}/individual")
app.include_router(investments_router, prefix=f"{API_V1}/individual")
app.include_router(credit_router, prefix=f"{API_V1}/individual")
app.include_router(tax_router, prefix=f"{API_V1}/individual")
app.include_router(goals_router, prefix=f"{API_V1}/individual")
app.include_router(retirement_router, prefix=f"{API_V1}/individual")
app.include_router(financial_health_router, prefix=f"{API_V1}/individual")
app.include_router(ai_router, prefix=f"{API_V1}/individual")

# Business
app.include_router(business_router, prefix=f"{API_V1}")


@app.get("/")
async def root():
    return {
        "name": "AI Financial OS API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
