from pydantic import BaseModel


class DatasetInfo(BaseModel):
    name: str
    count: int


class DatasetCatalogResponse(BaseModel):
    datasets: list[DatasetInfo]


class SourceLocationResponse(BaseModel):
    id: int
    length: float
    width: float
    depth: float


class ReceiverSummaryResponse(BaseModel):
    id: int
    receiver_index: int
    trace_count: int
    sample_count: int
    min_amplitude: float
    max_amplitude: float
    mean_amplitude: float
    std_amplitude: float


class ReceiverResponse(ReceiverSummaryResponse):
    values: list
