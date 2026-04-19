from pydantic import BaseModel


class EarthquakeResponse(BaseModel):
    id: str
    magnitude: float | None = None
    place: str | None = None
    time: int | None = None
    updated: int | None = None
    title: str | None = None
    url: str | None = None
    status: str | None = None
    mag_type: str | None = None
    event_type: str | None = None
    longitude: float | None = None
    latitude: float | None = None
    depth: float | None = None


class EarthquakeListResponse(BaseModel):
    count: int
    items: list[EarthquakeResponse]


class EarthquakeSummaryResponse(BaseModel):
    total_earthquakes: int
    max_magnitude: float | None = None
    average_magnitude: float | None = None
    latest_earthquake_id: str | None = None
    latest_earthquake_time: int | None = None
