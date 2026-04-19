from fastapi import APIRouter, HTTPException, Query

from app.db.mongo import earthquakes_collection, receivers_collection, source_locations_collection
from app.schemas.dataset import (
    DatasetCatalogResponse,
    DatasetInfo,
    ReceiverResponse,
    ReceiverSummaryResponse,
    SourceLocationResponse,
)

router = APIRouter()


def _serialize_source_location(document: dict) -> dict:
    return {
        "id": document["_id"],
        "length": document["length"],
        "width": document["width"],
        "depth": document["depth"],
    }


def _serialize_receiver_summary(document: dict) -> dict:
    return {
        "id": document["_id"],
        "receiver_index": document["receiver_index"],
        "trace_count": document["trace_count"],
        "sample_count": document["sample_count"],
        "min_amplitude": document["min_amplitude"],
        "max_amplitude": document["max_amplitude"],
        "mean_amplitude": document["mean_amplitude"],
        "std_amplitude": document["std_amplitude"],
    }


@router.get("", response_model=DatasetCatalogResponse)
async def dataset_catalog() -> DatasetCatalogResponse:
    return DatasetCatalogResponse(
        datasets=[
            DatasetInfo(name="earthquakes", count=earthquakes_collection().count_documents({})),
            DatasetInfo(
                name="source_locations",
                count=source_locations_collection().count_documents({}),
            ),
            DatasetInfo(name="receivers", count=receivers_collection().count_documents({})),
        ]
    )


@router.get("/source-locations", response_model=list[SourceLocationResponse])
async def list_source_locations(
    limit: int = Query(default=25, ge=1, le=500),
) -> list[SourceLocationResponse]:
    cursor = source_locations_collection().find().sort("_id", 1).limit(limit)
    return [SourceLocationResponse(**_serialize_source_location(document)) for document in cursor]


@router.get("/receivers", response_model=list[ReceiverSummaryResponse])
async def list_receivers(
    limit: int = Query(default=25, ge=1, le=500),
) -> list[ReceiverSummaryResponse]:
    cursor = receivers_collection().find({}, {"values": 0}).sort("_id", 1).limit(limit)
    return [ReceiverSummaryResponse(**_serialize_receiver_summary(document)) for document in cursor]


@router.get("/receivers/{receiver_index}", response_model=ReceiverResponse)
async def get_receiver(receiver_index: int) -> ReceiverResponse:
    document = receivers_collection().find_one({"_id": receiver_index})

    if document is None:
        raise HTTPException(status_code=404, detail="Receiver not found")

    payload = _serialize_receiver_summary(document)
    payload["values"] = document["values"]
    return ReceiverResponse(**payload)
