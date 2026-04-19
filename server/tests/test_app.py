from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_endpoint() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Earthquake Visualization API is running"}


def test_health_endpoint() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_earthquake_list_endpoint() -> None:
    response = client.get("/api/v1/earthquakes?limit=3")

    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 3
    assert len(payload["items"]) == 3


def test_earthquake_summary_endpoint() -> None:
    response = client.get("/api/v1/earthquakes/summary")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_earthquakes"] > 0


def test_dataset_catalog_endpoint() -> None:
    response = client.get("/api/v1/datasets")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["datasets"]) == 3


def test_source_locations_endpoint() -> None:
    response = client.get("/api/v1/datasets/source-locations?limit=2")

    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 2
