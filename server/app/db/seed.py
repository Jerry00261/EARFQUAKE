import csv
import json
import re
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
from pymongo import UpdateOne

from app.db.mongo import earthquakes_collection, receivers_collection, source_locations_collection
from app.core.config import settings


def _parse_epoch_milliseconds(value: int | float | None) -> datetime | None:
    if value is None:
        return None

    return datetime.fromtimestamp(value / 1000, tz=UTC)


def _extract_california_locality(place: str | None) -> str | None:
    if not place:
        return None

    base = place.split(",")[0].strip()
    match = re.search(r"\bof\s+(.+)$", base)

    if match:
        return match.group(1).strip()

    return base


def _seed_earthquakes(data_dir: Path) -> int:
    collection = earthquakes_collection()

    with (data_dir / "earthquakes_full.json").open("r", encoding="utf-8") as file:
        payload = json.load(file)

    features = payload.get("features", [])
    operations = []

    for feature in features:
        properties = feature.get("properties", {})
        coordinates = feature.get("geometry", {}).get("coordinates", [None, None, None])
        earthquake_id = feature.get("id")

        if not earthquake_id:
            continue

        document = {
            "_id": earthquake_id,
            "magnitude": properties.get("mag"),
            "place": _extract_california_locality(properties.get("place")),
            "original_place": properties.get("place"),
            "time": _parse_epoch_milliseconds(properties.get("time")),
            "updated": _parse_epoch_milliseconds(properties.get("updated")),
            "title": properties.get("title"),
            "url": properties.get("url"),
            "status": properties.get("status"),
            "mag_type": properties.get("magType"),
            "event_type": properties.get("type"),
            "longitude": coordinates[0],
            "latitude": coordinates[1],
            "depth": coordinates[2],
        }
        operations.append(UpdateOne({"_id": earthquake_id}, {"$set": document}, upsert=True))

    if operations:
        collection.bulk_write(operations, ordered=False)

    collection.create_index("time")
    collection.create_index("magnitude")
    collection.create_index("place")
    collection.create_index("original_place")
    return len(operations)


def _seed_source_locations(data_dir: Path) -> int:
    collection = source_locations_collection()
    operations = []

    with (data_dir / "source_locations.csv").open("r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for index, row in enumerate(reader):
            document = {
                "_id": index,
                "length": float(row["length"]),
                "width": float(row["width"]),
                "depth": float(row["depth"]),
            }
            operations.append(UpdateOne({"_id": index}, {"$set": document}, upsert=True))

    if operations:
        collection.bulk_write(operations, ordered=False)

    return len(operations)


def _seed_receivers(data_dir: Path) -> int:
    collection = receivers_collection()
    array = np.load(data_dir / "seismos_16_receivers.npy")
    operations = []

    if array.ndim == 1:
        arrays = [array]
        trace_count = 1
        sample_count = len(array)
    else:
        arrays = list(array)
        trace_count = int(array.shape[1]) if array.ndim >= 2 else 1
        sample_count = int(array.shape[2]) if array.ndim >= 3 else 1

    for receiver_index, receiver_array in enumerate(arrays):
        flattened = receiver_array.reshape(-1)
        document = {
            "_id": receiver_index,
            "receiver_index": receiver_index,
            "trace_count": trace_count,
            "sample_count": sample_count,
            "min_amplitude": float(flattened.min()),
            "max_amplitude": float(flattened.max()),
            "mean_amplitude": float(flattened.mean()),
            "std_amplitude": float(flattened.std()),
            "values": receiver_array.tolist(),
        }
        operations.append(
            UpdateOne({"_id": receiver_index}, {"$set": document}, upsert=True)
        )

    if operations:
        collection.bulk_write(operations, ordered=False)

    return len(operations)


def seed_mongodb() -> dict[str, int]:
    data_dir = settings.data_dir
    return {
        "earthquakes": _seed_earthquakes(data_dir),
        "source_locations": _seed_source_locations(data_dir),
        "receivers": _seed_receivers(data_dir),
    }
