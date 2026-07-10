from fastapi import APIRouter

from app.api.ai import router as ai_router
from app.api.auth import router as auth_router
from app.api.exercises import router as exercises_router
from app.api.health import router as health_router
from app.api.ranks import router as ranks_router
from app.api.routines import router as routines_router
from app.api.stats import router as stats_router
from app.api.users import router as users_router

api_router = APIRouter()
api_router.include_router(ai_router)
api_router.include_router(auth_router)
api_router.include_router(exercises_router)
api_router.include_router(health_router)
api_router.include_router(ranks_router)
api_router.include_router(routines_router)
api_router.include_router(stats_router)
api_router.include_router(users_router)
