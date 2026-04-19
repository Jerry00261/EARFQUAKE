import numpy as np
from scipy.spatial import KDTree

SCENARIO_MAG = 6.5
PX_PER_MS    = 40.0

# ── Fault traces ──────────────────────────────────────────────────────────────
def _interpolate_fault(points, n=50):
    dense = []
    for i in range(len(points) - 1):
        lats = np.linspace(points[i][0], points[i+1][0], n, endpoint=False)
        lons = np.linspace(points[i][1], points[i+1][1], n, endpoint=False)
        dense.extend(zip(lats, lons))
    dense.append(points[-1])
    return dense

_faults = [
    [[33.0,-115.6],[33.5,-116.0],[34.0,-116.8],[34.3,-117.3],[34.5,-117.7],
     [34.8,-118.2],[35.0,-118.5],[35.3,-119.0],[35.6,-119.5],[35.9,-120.4],
     [36.2,-120.8],[36.5,-121.0],[37.0,-121.5],[37.5,-121.8],[37.8,-122.2],
     [38.0,-122.5],[38.5,-122.9],[39.0,-123.3],[39.5,-123.6],[40.0,-124.0]],
    [[37.4,-121.9],[37.5,-122.0],[37.6,-122.05],[37.7,-122.1],[37.8,-122.15],[37.9,-122.2]],
    [[33.2,-116.0],[33.5,-116.5],[33.8,-116.9],[34.0,-117.1],[34.2,-117.3]],
    [[34.7,-116.0],[34.8,-116.8],[34.9,-117.5],[35.0,-118.0],[35.1,-118.5],[35.2,-119.0]],
    [[33.2,-115.8],[33.5,-116.2],[33.8,-116.8],[34.0,-117.2]],
    [[33.6,-117.9],[33.8,-118.1],[33.9,-118.2],[34.0,-118.3]],
    [[36.8,-121.2],[37.0,-121.5],[37.2,-121.7],[37.4,-121.8]],
]

_all_fault_points = []
for f in _faults:
    _all_fault_points.extend(_interpolate_fault(f))

_fault_tree = KDTree(np.array(_all_fault_points))

# ── GMPE ──────────────────────────────────────────────────────────────────────
def compute_scenario_pga(fault_dist_km: float, vs30: float) -> float:
    R    = max(fault_dist_km, 5.0)
    Vref = 760.0
    ln_pga = (
        0.5
        + 1.0 * (SCENARIO_MAG - 6.5)
        - 1.2 * np.log(R)
        - 0.3 * np.log(min(vs30, Vref) / Vref)
    )
    return max(float(np.exp(ln_pga)), 1e-6)

def get_screen_shake(pga_g: float, vs30: float, frames: list) -> list:
    pgv_ms  = min(pga_g * 9.81 * 0.1, 1.0)
    scale   = pgv_ms * PX_PER_MS
    ref_max = max(abs(v) for v in frames) or 1.0
    return [round((v / ref_max) * scale, 2) for v in frames]