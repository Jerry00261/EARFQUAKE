from fastapi import APIRouter, Query

from app.data.store import data_loader

router = APIRouter()


@router.get("")
async def list_earthquakes(
    limit: int = Query(default=50, ge=1, le=500),
    min_magnitude: float | None = Query(default=None, ge=0),
    place: str | None = Query(default=None),
    sort_by: str = Query(default="time"),
) -> dict:
    items = data_loader.list_earthquakes(
        limit=limit,
        min_magnitude=min_magnitude,
        place=place,
        sort_by=sort_by,
    )
    return {"count": len(items), "items": items}


@router.get("/summary")
async def earthquake_summary() -> dict:
    return data_loader.earthquake_summary()


@router.get("/{earthquake_id}")
async def get_earthquake(earthquake_id: str) -> dict:
    return data_loader.get_earthquake(earthquake_id)
