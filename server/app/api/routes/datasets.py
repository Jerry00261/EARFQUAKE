from fastapi import APIRouter, Query

from app.data.store import data_loader

router = APIRouter()


@router.get("")
async def dataset_catalog() -> dict:
    return data_loader.dataset_catalog()


@router.get("/source-locations")
async def list_source_locations(
    limit: int = Query(default=25, ge=1, le=500),
) -> dict:
    items = data_loader.list_source_locations(limit=limit)
    return {"count": len(items), "items": items}


@router.get("/receivers")
async def list_receivers(
    limit: int = Query(default=25, ge=1, le=500),
) -> dict:
    items = data_loader.list_receivers(limit=limit)
    return {"count": len(items), "items": items}
