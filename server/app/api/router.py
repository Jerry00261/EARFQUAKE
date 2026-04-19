from fastapi import APIRouter

from app.api.routes import datasets, earthquakes, health, predict  

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(earthquakes.router, prefix="/earthquakes", tags=["earthquakes"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
api_router.include_router(predict.router, prefix="/ml", tags=["ml"])  