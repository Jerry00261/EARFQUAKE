from app.ml.rom import get_seismogram
from fastapi import APIRouter, Query
from app.schemas.predict import PredictResponse, HeatmapResponse, WaveformResponse
from app.ml.model import predict_location
from app.ml.gmpe import get_screen_shake
import json
from pathlib import Path

router = APIRouter()

# Load precomputed heatmap once
_heatmap = json.loads((Path(__file__).parent.parent.parent / 'ml' / 'heatmap.json').read_text())

@router.get("/predict", response_model=PredictResponse)
async def predict(
    lat: float = Query(..., ge=32.0, le=42.0),
    lon: float = Query(..., ge=-125.0, le=-114.0),
) -> PredictResponse:
    result = predict_location(lat, lon)
    return PredictResponse(**result)

@router.get("/heatmap", response_model=HeatmapResponse)
async def heatmap() -> HeatmapResponse:
    return HeatmapResponse(points=_heatmap)

@router.get("/waveform", response_model=WaveformResponse)
async def waveform(
    pga_g: float = Query(..., gt=0),
    vs30:  float = Query(..., gt=0),
    receiver_index: int = Query(default=0, ge=0, le=15),
) -> WaveformResponse:
    from app.db.mongo import receivers_collection
    doc    = receivers_collection().find_one({"_id": receiver_index})
    frames = doc["values"] if doc else []
    pixels = get_screen_shake(pga_g, vs30, frames)
    return WaveformResponse(frames=pixels)

@router.get("/seismogram")
async def seismogram(
    source_lat:    float = Query(..., ge=32.0, le=42.0),
    source_lon:    float = Query(..., ge=-125.0, le=-114.0),
    vs30:          float = Query(..., gt=0),
    pga_g:         float = Query(..., gt=0),
    fault_dist_km: float = Query(default=10.0, gt=0),
):
    from app.ml.rom import get_seismogram
    return get_seismogram(source_lat, source_lon, vs30, pga_g, fault_dist_km)
