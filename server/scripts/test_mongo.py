from pymongo import MongoClient
from app.core.config import settings

try:
    client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)

    # Force connection immediately
    client.server_info()

    print("✅ Connected successfully!")

    print("Databases:", client.list_database_names())

except Exception as e:
    print("❌ Connection failed:")
    print(e)