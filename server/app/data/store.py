import json
from functools import cached_property

import numpy as np
import pandas as pd
from fastapi import HTTPException

from app.core.config import settings


class PandasDataLoader:
    @cached_property
    def earthquakes(self) -> pd.DataFrame:
        with (settings.data_dir / "earthquakes_full.json").open("r", encoding="utf-8") as file:
            payload = json.load(file)

        features = payload.get("features", [])
        dataframe = pd.json_normalize(features)
        coordinates = pd.DataFrame(
            dataframe["geometry.coordinates"].tolist(),
            columns=["longitude", "latitude", "depth"],
        )

        earthquakes = pd.DataFrame(
            {
                "id": dataframe["id"],
                "magnitude": dataframe["properties.mag"],
                "place": dataframe["properties.place"],
                "time": dataframe["properties.time"],
                "updated": dataframe["properties.updated"],
                "title": dataframe["properties.title"],
                "url": dataframe["properties.url"],
                "status": dataframe["properties.status"],
                "mag_type": dataframe["properties.magType"],
                "event_type": dataframe["properties.type"],
            }
        ).join(coordinates)

        return earthquakes.sort_values("time", ascending=False).reset_index(drop=True)

    @cached_property
    def source_locations(self) -> pd.DataFrame:
        return pd.read_csv(settings.data_dir / "source_locations.csv")

    @cached_property
    def receivers(self) -> pd.DataFrame:
        array = np.load(settings.data_dir / "seismos_16_receivers.npy")

        if array.ndim == 1:
            return pd.DataFrame(
                {
                    "receiver_index": range(len(array)),
                    "trace_count": 1,
                    "sample_count": 1,
                    "min_amplitude": array,
                    "max_amplitude": array,
                    "mean_amplitude": array,
                    "std_amplitude": 0.0,
                }
            )

        receiver_count = array.shape[0]
        flattened = array.reshape(receiver_count, -1)

        trace_count = array.shape[1] if array.ndim >= 2 else 1
        sample_count = array.shape[2] if array.ndim >= 3 else 1

        return pd.DataFrame(
            {
                "receiver_index": range(receiver_count),
                "trace_count": trace_count,
                "sample_count": sample_count,
                "min_amplitude": flattened.min(axis=1),
                "max_amplitude": flattened.max(axis=1),
                "mean_amplitude": flattened.mean(axis=1),
                "std_amplitude": flattened.std(axis=1),
            }
        )

    def list_earthquakes(
        self,
        *,
        limit: int,
        min_magnitude: float | None,
        place: str | None,
        sort_by: str,
    ) -> list[dict]:
        dataframe = self.earthquakes

        if min_magnitude is not None:
            dataframe = dataframe[dataframe["magnitude"].fillna(-1) >= min_magnitude]

        if place:
            dataframe = dataframe[
                dataframe["place"].fillna("").str.contains(place, case=False, regex=False)
            ]

        if sort_by == "magnitude":
            dataframe = dataframe.sort_values(["magnitude", "time"], ascending=[False, False])
        else:
            dataframe = dataframe.sort_values("time", ascending=False)

        return self._frame_to_records(dataframe.head(limit))

    def get_earthquake(self, earthquake_id: str) -> dict:
        matches = self.earthquakes[self.earthquakes["id"] == earthquake_id]

        if matches.empty:
            raise HTTPException(status_code=404, detail="Earthquake not found")

        return self._row_to_record(matches.iloc[0])

    def earthquake_summary(self) -> dict:
        dataframe = self.earthquakes
        latest_row = dataframe.iloc[0]

        return {
            "total_earthquakes": int(len(dataframe)),
            "max_magnitude": float(dataframe["magnitude"].max()),
            "average_magnitude": float(dataframe["magnitude"].mean()),
            "latest_earthquake_id": str(latest_row["id"]),
            "latest_earthquake_time": int(latest_row["time"]),
        }

    def dataset_catalog(self) -> dict:
        return {
            "datasets": [
                {
                    "name": "earthquakes",
                    "rows": int(len(self.earthquakes)),
                    "columns": list(self.earthquakes.columns),
                },
                {
                    "name": "source_locations",
                    "rows": int(len(self.source_locations)),
                    "columns": list(self.source_locations.columns),
                },
                {
                    "name": "receivers",
                    "rows": int(len(self.receivers)),
                    "columns": list(self.receivers.columns),
                },
            ]
        }

    def list_source_locations(self, *, limit: int) -> list[dict]:
        return self._frame_to_records(self.source_locations.head(limit))

    def list_receivers(self, *, limit: int) -> list[dict]:
        return self._frame_to_records(self.receivers.head(limit))

    @staticmethod
    def _row_to_record(row: pd.Series) -> dict:
        return {
            key: (None if pd.isna(value) else value.item() if hasattr(value, "item") else value)
            for key, value in row.to_dict().items()
        }

    @staticmethod
    def _frame_to_records(dataframe: pd.DataFrame) -> list[dict]:
        return [PandasDataLoader._row_to_record(row) for _, row in dataframe.iterrows()]


data_loader = PandasDataLoader()
