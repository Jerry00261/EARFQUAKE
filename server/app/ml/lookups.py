import numpy as np
import pandas as pd
from scipy.spatial import KDTree
from pathlib import Path

DATA = Path(__file__).parent.parent.parent / 'data'

# ── Build KDTrees from CSV at startup ─────────────────────────────────────────
print("Loading earthquake data for lookups...")
_df        = pd.read_csv(DATA / 'california_earthquakes.csv')
_coords    = _df[['Lat', 'Lon']].values
_vs30_vals = _df['vs30'].values
_vs30_tree = KDTree(_coords)
_eq_tree   = KDTree(_coords)
print(f"Loaded {len(_df):,} events for KDTree lookups.")

def lookup_vs30(lat: float, lon: float) -> float:
    _, idx = _vs30_tree.query([lat, lon])
    return float(_vs30_vals[idx])

def seismicity_density(lat: float, lon: float, radius_deg: float = 0.5) -> int:
    return len(_eq_tree.query_ball_point([lat, lon], radius_deg))

def fault_distance(lat: float, lon: float) -> float:
    from app.ml.gmpe import _fault_tree
    _, idx = _fault_tree.query([lat, lon])
    raw = _fault_tree.data[idx]
    dlat = (lat - raw[0]) * 111.0
    dlon = (lon - raw[1]) * 111.0 * np.cos(np.radians(36.0))
    return float(np.sqrt(dlat**2 + dlon**2))