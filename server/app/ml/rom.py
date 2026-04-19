import numpy as np
from scipy.interpolate import RBFInterpolator
from pathlib import Path
from app.core.config import settings

# ── Site class → receiver mapping ────────────────────────────────────────────
RECEIVERS = [
    (0,  33.8688, -118.3528, "S Inglewood",     180, "soft_basin"),
    (1,  33.9904, -118.3528, "W Hollywood",     270, "stiff_soil"),
    (2,  34.1076, -118.3528, "Sherman Oaks",    300, "stiff_soil"),
    (3,  34.2292, -118.3528, "SF Valley N",     400, "soft_rock"),
    (4,  33.8688, -118.1734, "Whittier/Norwalk",200, "soft_basin"),
    (5,  33.9904, -118.1734, "East LA",         230, "stiff_soil"),
    (6,  34.1076, -118.1734, "Pasadena",        350, "stiff_soil"),
    (7,  34.2292, -118.1734, "Sylmar",          450, "soft_rock"),
    (8,  33.8688, -117.9886, "San Gabriel",     270, "stiff_soil"),
    (9,  33.9904, -117.9886, "Diamond Bar",     400, "soft_rock"),
    (10, 34.1076, -117.9886, "Glendora",        500, "soft_rock"),
    (11, 34.2292, -117.9886, "San Dimas",       560, "soft_rock"),
    (12, 33.8688, -117.8092, "Ontario",         280, "stiff_soil"),
    (13, 33.9904, -117.8092, "Pomona",          350, "stiff_soil"),
    (14, 34.1076, -117.8092, "Upland",          520, "soft_rock"),
    (15, 34.2292, -117.8092, "Fontana N",       620, "hard_rock"),
]

ARCHETYPE_RECEIVER = {
    "soft_basin": 0,
    "stiff_soil": 5,
    "soft_rock":  10,
    "hard_rock":  15,
}

# ── Load ROM artifacts once at startup ───────────────────────────────────────
print("Loading ROM...")
_velocity_data = np.load(settings.data_dir / 'seismos_16_receivers.npy')  # (16, 600, 500)
_locations     = np.genfromtxt(settings.data_dir / 'source_locations.csv', skip_header=1, delimiter=',')  # (500, 3)

_vel_stacked = _velocity_data.reshape(-1, 500)          # (9600, 500)
_u, _s, _vh  = np.linalg.svd(_vel_stacked, full_matrices=False)
_a           = _vel_stacked.T @ _u                      # (500, 9600)
_rbf         = RBFInterpolator(_locations[1:], _a[1:], kernel='cubic')

# Precompute parameter ranges for mapping
_len_min, _len_max = _locations[:,0].min(), _locations[:,0].max()
_len_med           = float(np.median(_locations[:,0]))  
_wid_med           = float(np.median(_locations[:,1]))
_dep_med           = float(np.median(_locations[:,2]))
print("ROM ready.")

def site_class(vs30: float) -> str:
    if vs30 < 200: return 'soft_basin'
    if vs30 < 400: return 'stiff_soil'
    if vs30 < 600: return 'soft_rock'
    return                'hard_rock'

def get_receiver_for_vs30(vs30: float) -> int:
    return ARCHETYPE_RECEIVER[site_class(vs30)]

def _lat_lon_to_source_params(fault_dist_km: float) -> np.ndarray:
    # Deeper rupture for locations farther from fault
    # Near fault → shallow rupture (more intense)
    # Far from fault → deeper rupture (more diffuse)
    depth = np.clip(
        _dep_med + (fault_dist_km - 10.0) * 200.0,  # 200m deeper per km
        _locations[:,2].min(),
        _locations[:,2].max()
    )
    # Length and width fixed at median — we're not varying rupture geometry
    return np.array([[_len_med, _wid_med, depth]])

def get_seismogram(
    source_lat:    float,
    source_lon:    float,
    vs30:          float,
    pga_g:         float,
    fault_dist_km: float = 10.0,
) -> dict:
    recv_idx  = get_receiver_for_vs30(vs30)
    sc        = site_class(vs30)

    # Map location to ROM source parameter space
    source_pt = _lat_lon_to_source_params(fault_dist_km)  # (1, 3)

    # ROM interpolation
    a_pred   = _rbf(source_pt)                    # (1, 9600)
    y_pred   = (_u @ a_pred.T).reshape(16, 600)   # (16, 600)
    waveform = y_pred[recv_idx]                    # (600,)

    # Scale amplitude by PGA
    pgv_ms  = min(pga_g * 9.81 * 0.1, 5.0)
    ref_pgv = float(np.max(np.abs(waveform))) or 1e-6
    scale   = pgv_ms / ref_pgv
    scaled  = waveform * scale

    px = (scaled * 300.0).tolist()
    py = (np.roll(scaled, 12) * 0.9 * 300.0).tolist()

    return {
        'receiver_index': recv_idx,
        'receiver_name':  RECEIVERS[recv_idx][3],
        'site_class':     sc,
        'waveform_ms':    scaled.tolist(),
        'px':             px,
        'py':             py,
        'sample_rate_hz': 10,
        'duration_s':     60,
        'n_frames':       600,
    }