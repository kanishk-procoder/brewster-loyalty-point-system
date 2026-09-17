from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import init_db
from app.routers import auth, members, dashboard, customer, evaluation

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="☕ BrewRewards API",
    description="Backend API for Café Loyalty, Counter Operations, and Customer Wallet",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(members.router)
app.include_router(dashboard.router)
app.include_router(customer.router)
app.include_router(evaluation.router)

@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "app": "BrewRewards API", "version": "2.0.0"}
