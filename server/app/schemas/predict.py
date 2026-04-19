from pydantic import BaseModel

class PredictResponse(BaseModel):
    tier:          str
    pga_g:         float
    vs30:          float
    fault_dist_km: float

class HeatmapPoint(BaseModel):
    lat:           float
    lon:           float
    tier:          str
    pga_g:         float
    vs30:          float
    fault_dist_km: float

class HeatmapResponse(BaseModel):
    points: list[HeatmapPoint]

class WaveformResponse(BaseModel):
    frames: list[float]