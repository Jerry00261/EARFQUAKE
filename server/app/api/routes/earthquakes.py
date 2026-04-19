from fastapi import APIRouter, HTTPException, Query

from app.db.mongo import earthquakes_collection
from app.schemas.earthquake import (
    EarthquakeListResponse,
    EarthquakeResponse,
    EarthquakeSummaryResponse,
)
from datetime import datetime
router = APIRouter()


def _serialize_earthquake(document: dict) -> dict:
    return {
        "id": document["_id"],
        "magnitude": document.get("magnitude"),
        "place": document.get("place"),
        "original_place": document.get("original_place"),
        "time": document.get("time"),
        "updated": document.get("updated"),
        "title": document.get("title"),
        "url": document.get("url"),
        "status": document.get("status"),
        "mag_type": document.get("mag_type"),
        "event_type": document.get("event_type"),
        "longitude": document.get("longitude"),
        "latitude": document.get("latitude"),
        "depth": document.get("depth"),
    }


@router.get("", response_model=EarthquakeListResponse)
async def list_earthquakes(
    limit: int = Query(default=50, ge=1, le=500),
    min_magnitude: float | None = Query(default=None, ge=0),
    place: str | None = Query(default=None),
    sort_by: str = Query(default="time"),
) -> EarthquakeListResponse:
    query: dict = {}

    if min_magnitude is not None:
        query["magnitude"] = {"$gte": min_magnitude}

    if place:
        query["place"] = {"$regex": place, "$options": "i"}

    sort_field = "magnitude" if sort_by == "magnitude" else "time"
    cursor = earthquakes_collection().find(query).sort(sort_field, -1).limit(limit)
    items = [_serialize_earthquake(document) for document in cursor]
    return EarthquakeListResponse(count=len(items), items=items)


@router.get("/summary", response_model=EarthquakeSummaryResponse)
async def earthquake_summary(place: str | None = None, year: int = datetime.now().year) -> EarthquakeSummaryResponse:
    query = {"time": {"$gte": datetime(year, 1, 1), "$lt": datetime(year + 1, 1, 1)}}
    if place:
        query["place"] = place
    collection = earthquakes_collection()
    latest = collection.find_one(query, sort=[("time", -1)])
    aggregate = list(
        collection.aggregate(
            [
                {"$match": query},
                {
                    "$group": {
                        "_id": None,
                        "total_earthquakes": {"$sum": 1},
                        "max_magnitude": {"$max": "$magnitude"},
                        "average_magnitude": {"$avg": "$magnitude"},
                    }
                }
            ]
        )
    )

    summary = aggregate[0] if aggregate else {}
    return EarthquakeSummaryResponse(
        total_earthquakes=summary.get("total_earthquakes", 0),
        max_magnitude=summary.get("max_magnitude"),
        average_magnitude=summary.get("average_magnitude"),
        latest_earthquake_id=latest["_id"] if latest else None,
        latest_earthquake_time=latest.get("time") if latest else None,
    )


@router.get("/{earthquake_id}", response_model=EarthquakeResponse)
async def get_earthquake(earthquake_id: str) -> EarthquakeResponse:
    document = earthquakes_collection().find_one({"_id": earthquake_id})

    if document is None:
        raise HTTPException(status_code=404, detail="Earthquake not found")

    return EarthquakeResponse(**_serialize_earthquake(document))
