from pydantic import BaseModel
from datetime import datetime

class EarthquakeResponse(BaseModel):
    id:             str
    source:         str | None = None
    time:           datetime
    lat:            float
    lon:            float
    depth:          float
    mag:            float
    mmi:            float | None = None
    sig:            float | None = None
    vs30:           float | None = None
    site_class:     str | None = None
    place:          str | None = None
    original_place: str | None = None

class EarthquakeListResponse(BaseModel):
    count: int
    items: list[EarthquakeResponse]

class EarthquakeSummaryResponse(BaseModel):
    total_earthquakes:      int
    max_magnitude:          float | None
    average_magnitude:      float | None
    latest_earthquake_time: datetime | None