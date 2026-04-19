from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

from app.core.config import settings

_client: MongoClient | None = None


def _get_client() -> MongoClient:
    global _client

    if _client is None:
        if not settings.mongo_uri:
            raise RuntimeError("MONGO_URI is not configured.")

        _client = MongoClient(settings.mongo_uri)

    return _client


def get_database() -> Database:
    return _get_client()[settings.mongo_db_name]


def earthquakes_collection() -> Collection:
    return get_database()["earthquakes"]


def source_locations_collection() -> Collection:
    return get_database()["source_locations"]


def receivers_collection() -> Collection:
    return get_database()["receivers"]


def close_mongo() -> None:
    global _client

    if _client is not None:
        _client.close()
        _client = None
