from fastapi import APIRouter, Query
from app.db.mongo import earthquakes_collection
from app.schemas.earthquake import EarthquakeListResponse, EarthquakeResponse, EarthquakeSummaryResponse
from datetime import datetime

router = APIRouter()

def _serialize(doc: dict) -> dict:
    return {
        "id":             str(doc["_id"]),
        "source":         doc.get("source"),
        "time":           doc["time"],
        "lat":            doc["lat"],
        "lon":            doc["lon"],
        "depth":          doc["depth"],
        "mag":            doc["mag"],
        "mmi":            doc.get("mmi"),
        "sig":            doc.get("sig"),
        "vs30":           doc.get("vs30"),
        "site_class":     doc.get("site_class"),
        "place":          doc.get("place"),
        "original_place": doc.get("original_place"),
    }

@router.get("", response_model=EarthquakeListResponse)
async def list_earthquakes(
    limit:         int          = Query(default=50, ge=1, le=5000),
    min_magnitude: float | None = Query(default=None, ge=0),
    site_class:    str | None   = Query(default=None),
    place:         str | None   = Query(default=None),
    year:          int | None   = Query(default=None),
    sort_by:       str          = Query(default="time"),
) -> EarthquakeListResponse:
    query: dict = {}
    if min_magnitude is not None:
        query["mag"] = {"$gte": min_magnitude}
    if site_class:
        query["site_class"] = site_class
    if place:
        query["place"] = place
    if year is not None:
        query["time"] = {
            "$gte": datetime(year, 1, 1),
            "$lt": datetime(year + 1, 1, 1),
        }

    sort_field = "mag" if sort_by == "magnitude" else "time"
    cursor = earthquakes_collection().find(query).sort(sort_field, -1).limit(limit)
    items  = [_serialize(doc) for doc in cursor]
    return EarthquakeListResponse(count=len(items), items=items)

@router.get("/summary", response_model=EarthquakeSummaryResponse)
async def earthquake_summary(
    year: int = datetime.now().year
) -> EarthquakeSummaryResponse:
    query = {"time": {"$gte": datetime(year, 1, 1), "$lt": datetime(year + 1, 1, 1)}}
    collection = earthquakes_collection()
    latest     = collection.find_one(query, sort=[("time", -1)])
    agg        = list(collection.aggregate([
        {"$match": query},
        {"$group": {
            "_id": None,
            "total_earthquakes": {"$sum": 1},
            "max_magnitude":     {"$max": "$mag"},
            "average_magnitude": {"$avg": "$mag"},
        }}
    ]))
    summary = agg[0] if agg else {}
    return EarthquakeSummaryResponse(
        total_earthquakes=      summary.get("total_earthquakes", 0),
        max_magnitude=          summary.get("max_magnitude"),
        average_magnitude=      summary.get("average_magnitude"),
        latest_earthquake_time= latest.get("time") if latest else None,
    )

@router.get("/{earthquake_id}", response_model=EarthquakeResponse)
async def get_earthquake(earthquake_id: str) -> EarthquakeResponse:
    doc = earthquakes_collection().find_one({"_id": earthquake_id})
    if doc is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Earthquake not found")
    return EarthquakeResponse(**_serialize(doc))