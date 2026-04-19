import joblib
import numpy as np
from scipy.spatial import KDTree
import pandas as pd
import json
from pathlib import Path

BASE = Path(__file__).parent

# Load artifacts once
_model = joblib.load(BASE / 'risk_model.pkl')
_le    = joblib.load(BASE / 'label_encoder.pkl')

# Rebuild vs30 tree (or load precomputed)
from app.ml.gmpe import compute_scenario_pga
from app.ml.lookups import lookup_vs30, fault_distance, seismicity_density

def predict_location(lat: float, lon: float) -> dict:
    vs30    = lookup_vs30(lat, lon)
    fdist   = fault_distance(lat, lon)
    density = seismicity_density(lat, lon)
    tier    = _le.inverse_transform(
                _model.predict([[lat, lon, vs30, density, fdist]])
              )[0]
    pga     = compute_scenario_pga(fdist, vs30)
    return {
        'tier':          tier,
        'pga_g':         round(float(pga), 4),
        'vs30':          round(float(vs30), 1),
        'fault_dist_km': round(float(fdist), 1),
    }