from collections.abc import Iterable
from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.main import app


class FakeCursor:
    def __init__(self, documents: Iterable[dict]):
        self.documents = list(documents)

    def sort(self, field: str, direction: int):
        reverse = direction == -1
        self.documents.sort(key=lambda item: item.get(field, 0) or 0, reverse=reverse)
        return self

    def limit(self, count: int):
        self.documents = self.documents[:count]
        return self

    def __iter__(self):
        return iter(self.documents)


class FakeCollection:
    def __init__(self, documents: Iterable[dict]):
        self.documents = list(documents)

    def find(self, query: dict | None = None, projection: dict | None = None):
        query = query or {}
        items = list(self.documents)

        magnitude_filter = query.get("magnitude", {})
        if "$gte" in magnitude_filter:
            items = [
                item for item in items if (item.get("magnitude") or 0) >= magnitude_filter["$gte"]
            ]

        if "place" in query and "$regex" in query["place"]:
            needle = query["place"]["$regex"].lower()
            items = [item for item in items if needle in (item.get("place", "").lower())]

        if projection and projection.get("values") == 0:
            items = [{key: value for key, value in item.items() if key != "values"} for item in items]

        return FakeCursor(items)

    def find_one(self, query: dict | None = None, sort: list[tuple[str, int]] | None = None):
        if sort:
            field, direction = sort[0]
            items = sorted(
                self.documents,
                key=lambda item: item.get(field, 0) or 0,
                reverse=direction == -1,
            )
            return items[0] if items else None

        query = query or {}
        for item in self.documents:
            if all(item.get(key) == value for key, value in query.items()):
                return item
        return None

    def count_documents(self, query: dict):
        return len(list(self.find(query)))

    def aggregate(self, _pipeline: list[dict]):
        if not self.documents:
            return []

        magnitudes = [item.get("magnitude") for item in self.documents if item.get("magnitude") is not None]
        return [
            {
                "_id": None,
                "total_earthquakes": len(self.documents),
                "max_magnitude": max(magnitudes),
                "average_magnitude": sum(magnitudes) / len(magnitudes),
            }
        ]


EARTHQUAKE_FIXTURES = [
    {
        "_id": "quake-1",
        "magnitude": 4.2,
        "place": "Los Angeles",
        "original_place": "1 km SW of Los Angeles, CA",
        "time": datetime(2025, 1, 3, 12, 0, tzinfo=UTC),
        "updated": datetime(2025, 1, 3, 12, 5, tzinfo=UTC),
        "title": "M 4.2 - Los Angeles, CA",
        "url": "https://example.com/quake-1",
        "status": "reviewed",
        "mag_type": "ml",
        "event_type": "earthquake",
        "longitude": -118.25,
        "latitude": 34.05,
        "depth": 12.3,
    },
    {
        "_id": "quake-2",
        "magnitude": 3.1,
        "place": "Gardena",
        "original_place": "4 km NNE of Gardena, CA",
        "time": datetime(2025, 1, 2, 12, 0, tzinfo=UTC),
        "updated": datetime(2025, 1, 2, 12, 5, tzinfo=UTC),
        "title": "M 3.1 - Gardena, CA",
        "url": "https://example.com/quake-2",
        "status": "reviewed",
        "mag_type": "ml",
        "event_type": "earthquake",
        "longitude": -118.30,
        "latitude": 33.92,
        "depth": 10.1,
    },
    {
        "_id": "quake-3",
        "magnitude": 2.8,
        "place": "Pasadena",
        "original_place": "2 km S of Pasadena, CA",
        "time": datetime(2025, 1, 1, 12, 0, tzinfo=UTC),
        "updated": datetime(2025, 1, 1, 12, 5, tzinfo=UTC),
        "title": "M 2.8 - Pasadena, CA",
        "url": "https://example.com/quake-3",
        "status": "reviewed",
        "mag_type": "ml",
        "event_type": "earthquake",
        "longitude": -118.14,
        "latitude": 34.14,
        "depth": 8.0,
    },
]

SOURCE_LOCATION_FIXTURES = [
    {"_id": 0, "length": 1.0, "width": 2.0, "depth": 3.0},
    {"_id": 1, "length": 4.0, "width": 5.0, "depth": 6.0},
]

RECEIVER_FIXTURES = [
    {
        "_id": 0,
        "receiver_index": 0,
        "trace_count": 2,
        "sample_count": 3,
        "min_amplitude": -0.2,
        "max_amplitude": 0.4,
        "mean_amplitude": 0.1,
        "std_amplitude": 0.05,
        "values": [[0.1, 0.2, 0.3], [0.0, -0.2, 0.4]],
    },
    {
        "_id": 1,
        "receiver_index": 1,
        "trace_count": 2,
        "sample_count": 3,
        "min_amplitude": -0.3,
        "max_amplitude": 0.5,
        "mean_amplitude": 0.12,
        "std_amplitude": 0.08,
        "values": [[0.2, 0.1, 0.5], [0.0, -0.3, 0.2]],
    },
]


def install_fake_db(monkeypatch) -> None:
    from app.api.routes import datasets, earthquakes

    monkeypatch.setattr(
        earthquakes,
        "earthquakes_collection",
        lambda: FakeCollection(EARTHQUAKE_FIXTURES),
    )
    monkeypatch.setattr(
        datasets,
        "earthquakes_collection",
        lambda: FakeCollection(EARTHQUAKE_FIXTURES),
    )
    monkeypatch.setattr(
        datasets,
        "source_locations_collection",
        lambda: FakeCollection(SOURCE_LOCATION_FIXTURES),
    )
    monkeypatch.setattr(
        datasets,
        "receivers_collection",
        lambda: FakeCollection(RECEIVER_FIXTURES),
    )


def test_root_endpoint() -> None:
    with TestClient(app) as client:
        response = client.get("/")

        assert response.status_code == 200
        assert response.json() == {"message": "Earthquake Visualization API is running"}


def test_health_endpoint() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/health")

        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_earthquake_list_endpoint(monkeypatch) -> None:
    install_fake_db(monkeypatch)

    with TestClient(app) as client:
        response = client.get("/api/v1/earthquakes?limit=3")

        assert response.status_code == 200
        payload = response.json()
        assert payload["count"] == 3
        assert len(payload["items"]) == 3
        assert payload["items"][1]["place"] == "Gardena"
        assert payload["items"][1]["original_place"] == "4 km NNE of Gardena, CA"
        assert payload["items"][0]["time"].endswith("Z")


def test_earthquake_summary_endpoint(monkeypatch) -> None:
    install_fake_db(monkeypatch)

    with TestClient(app) as client:
        response = client.get("/api/v1/earthquakes/summary")

        assert response.status_code == 200
        payload = response.json()
        assert payload["total_earthquakes"] > 0
        assert payload["latest_earthquake_time"].endswith("Z")


def test_earthquake_place_filter_uses_normalized_locality(monkeypatch) -> None:
    install_fake_db(monkeypatch)

    with TestClient(app) as client:
        response = client.get("/api/v1/earthquakes?place=Gardena")

        assert response.status_code == 200
        payload = response.json()
        assert payload["count"] == 1
        assert payload["items"][0]["place"] == "Gardena"


def test_dataset_catalog_endpoint(monkeypatch) -> None:
    install_fake_db(monkeypatch)

    with TestClient(app) as client:
        response = client.get("/api/v1/datasets")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["datasets"]) == 3


def test_source_locations_endpoint(monkeypatch) -> None:
    install_fake_db(monkeypatch)

    with TestClient(app) as client:
        response = client.get("/api/v1/datasets/source-locations?limit=2")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload) == 2


def test_receivers_endpoint(monkeypatch) -> None:
    install_fake_db(monkeypatch)

    with TestClient(app) as client:
        response = client.get("/api/v1/datasets/receivers?limit=2")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload) == 2
