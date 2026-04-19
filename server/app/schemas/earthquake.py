from pydantic import BaseModel
from datetime import datetime

class EarthquakeResponse(BaseModel):
    id:         int
    time:       datetime
    lat:        float
    lon:        float
    depth:      float
    mag:        float
    mmi:        float | None
    sig:        float | None
    vs30:       float
    site_class: str

class EarthquakeListResponse(BaseModel):
    count: int
    items: list[EarthquakeResponse]

class EarthquakeSummaryResponse(BaseModel):
    total_earthquakes:      int
    max_magnitude:          float | None
    average_magnitude:      float | None
    latest_earthquake_time: datetime | None