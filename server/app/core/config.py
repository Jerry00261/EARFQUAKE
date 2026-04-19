import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


@dataclass(frozen=True)
class Settings:
    app_name: str = "Earthquake Visualization API"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"
    data_dir: Path = field(
        default_factory=lambda: Path(__file__).resolve().parents[2] / "data"
    )
    mongo_uri: str = field(default_factory=lambda: os.getenv("MONGO_URI", "").strip())
    mongo_db_name: str = field(
        default_factory=lambda: os.getenv("MONGO_DB_NAME", "earfquake")
    )
    allowed_origins: list[str] = field(
        default_factory=lambda: os.getenv("BACKEND_CORS_ORIGINS", "*").split(",")
    )


settings = Settings()
