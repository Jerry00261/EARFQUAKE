import numpy as np
from scipy.interpolate import RBFInterpolator
from pathlib import Path

BASE = Path(__file__).parent.parent.parent / 'data'

# ── Site class → receiver mapping ────────────────────────────────────────────
RECEIVERS = [
    (0,  33.8688, -118.3528, "S Inglewood",    180, "soft_basin"),
    (1,  33.9904, -118.3528, "W Hollywood",    270, "stiff_soil"),
    (2,  34.1076, -118.3528, "Sherman Oaks",   300, "stiff_soil"),
    (3,  34.2292, -118.3528, "SF Valley N",    400, "soft_rock"),
    (4,  33.8688, -118.1734, "Whittier/Norwalk",200,"soft_basin"),
    (5,  33.9904, -118.1734, "East LA",        230, "stiff_soil"),
    (6,  34.1076, -118.1734, "Pasadena",       350, "stiff_soil"),
    (7,  34.2292, -118.1734, "Sylmar",         450, "soft_rock"),
    (8,  33.8688, -117.9886, "San Gabriel",    270, "stiff_soil"),
    (9,  33.9904, -117.9886, "Diamond Bar",    400, "soft_rock"),
    (10, 34.1076, -117.9886, "Glendora",       500, "soft_rock"),
    (11, 34.2292, -117.9886, "San Dimas",      560, "soft_rock"),
    (12, 33.8688, -117.8092, "Ontario",        280, "stiff_soil"),
    (13, 33.9904, -117.8092, "Pomona",         350, "stiff_soil"),
    (14, 34.1076, -117.8092, "Upland",         520, "soft_rock"),
    (15, 34.2292, -117.8092, "Fontana N",      620, "hard_rock"),
]

# One representative receiver per site class
ARCHETYPE_RECEIVER = {
    "soft_basin":  0,   # S Inglewood,  vs30=180
    "stiff_soil":  5,   # East LA,      vs30=230
    "soft_rock":   10,  # Glendora,     vs30=500
    "hard_rock":   15,  # Fontana N,    vs30=620
}

# ── Load ROM artifacts once ───────────────────────────────────────────────────
print("Loading ROM...")
_velocity_data  = np.load(BASE / 'seismos_16_receivers.npy')  # (16, 600, 500)
_locations      = np.genfromtxt(BASE / 'source_locations.csv', skip_header=1, delimiter=',')

_vel_stacked    = _velocity_data.reshape(-1, 500)              # (9600, 500)
_u, _s, _vh     = np.linalg.svd(_vel_stacked, full_matrices=False)
_a              = _vel_stacked.T @ _u                          # (500, 9600)
_rbf            = RBFInterpolator(_locations[1:], _a[1:], kernel='cubic')
print("ROM ready.")

def site_class(vs30: float) -> str:
    if vs30 < 200:  return 'soft_basin'
    if vs30 < 400:  return 'stiff_soil'
    if vs30 < 600:  return 'soft_rock'
    return                  'hard_rock'

def get_receiver_for_vs30(vs30: float) -> int:
    sc = site_class(vs30)
    return ARCHETYPE_RECEIVER[sc]

def get_seismogram(
    source_lat: float,
    source_lon: float,
    vs30: float,
    pga_g: float,
) -> dict:
    """
    Interpolate ROM waveform for a source location,
    pick the receiver matching the site class,
    scale by PGA.
    """
    recv_idx    = get_receiver_for_vs30(vs30)

    # ROM interpolation — source location drives waveform shape
    source_pt   = np.array([[source_lat, source_lon]])
    a_pred      = _rbf(source_pt)                      # (1, 9600)
    y_pred      = (_u @ a_pred.T).reshape(16, 600)     # all 16 receivers
    waveform    = y_pred[recv_idx]                      # (600,) m/s

    # Scale amplitude by PGA
    pgv_ms      = min(pga_g * 9.81 * 0.1, 1.0)        # Newmark PGA→PGV, cap 1 m/s
    ref_pgv     = np.max(np.abs(waveform)) or 1e-6
    scale       = pgv_ms / ref_pgv
    scaled      = waveform * scale                      # m/s, physically calibrated

    # Pixel offsets for frontend animation (40px per 1 m/s)
    px          = (scaled * 40.0).tolist()
    py          = (np.roll(scaled, 12) * 0.75 * 40.0).tolist()  # phase-shifted Y

    recv_info   = RECEIVERS[recv_idx]
    return {
        'receiver_index':    recv_idx,
        'receiver_name':     recv_info[3],
        'site_class':        site_class(vs30),
        'waveform_ms':       scaled.tolist(),   # raw m/s values
        'px':                px,                # x pixel offsets
        'py':                py,                # y pixel offsets
        'sample_rate_hz':    10,
        'duration_s':        60,
        'n_frames':          600,
    }