# EARFQUAKE

A full-stack earthquake visualization and seismic risk prediction platform focused on California. The application combines a React dashboard with an ML-powered FastAPI backend to let users explore historical earthquake data, assess site-specific seismic risk, and synthesize ground-motion waveforms for any location in the state.

---

## Features

- **Earthquake Explorer** — Interactive Google Maps interface for browsing historical California earthquakes. Filter by year, minimum magnitude, site class, and location. Up to 20,000 events rendered at once with hover and selection states.
- **Seismic Risk Map** — Precomputed risk heatmap overlaid on a map. Click any point in California to receive a risk-tier classification, estimated peak ground acceleration (PGA), Vs30 site velocity, and fault distance.
- **Waveform Viewer** — Synthetic seismograms generated on demand using a Reduced Order Model (ROM) built from SVD decomposition of a 16-receiver simulation dataset. Output is scaled to pixel displacement for animated ground-shaking visualization.
- **State Analytics Panel** — Aggregated statistics including event counts, magnitude distribution histograms, and per-location breakdowns.
- **Dashboard Panel** — Summary metrics and live earthquake feed subscription.

---

## Architecture

```
my-app/          React 19 single-page application
server/          FastAPI REST API + ML inference
  app/
    api/         Route handlers (earthquakes, predict, datasets, health)
    core/        Configuration and settings
    db/          MongoDB connection and seeding scripts
    ml/          Trained models, GMPE, ROM, and lookup tables
  data/          Raw training data (CSV, NumPy arrays)
  scripts/       Data generation and database seeding utilities
  tests/         Pytest integration tests
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Google Maps JavaScript API, Recharts |
| Backend | FastAPI, Uvicorn, Python 3.12 |
| Database | MongoDB (Atlas) |
| ML / Numerics | XGBoost, scikit-learn, NumPy, SciPy, pandas |
| Deployment | Render (backend), environment-variable-driven config |

---

## Machine Learning

### Seismic Risk Classifier
An XGBoost classifier trained on historical California earthquake records predicts a discrete risk tier for any (lat, lon) coordinate. Input features are derived at inference time: Vs30 site velocity (from a lookup grid), distance to the nearest mapped fault trace (KDTree query), and local seismicity density.

### Ground Motion Prediction Equation (GMPE)
A simplified GMPE computes scenario PGA from fault distance and Vs30, calibrated to a M6.5 reference event. The equation follows a log-linear attenuation model with site amplification.

### Reduced Order Model (ROM)
A 16-receiver velocity dataset (`seismos_16_receivers.npy`, shape 16 x 600 x 500) is compressed via truncated SVD. At inference time, an RBF interpolator reconstructs receiver-specific time-series waveforms for arbitrary source parameters. Receivers are mapped to one of four site classes (soft basin, stiff soil, soft rock, hard rock) based on Vs30.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/earthquakes` | List earthquakes with optional filters |
| GET | `/api/v1/earthquakes/summary` | Aggregated stats for a given year |
| GET | `/api/v1/predict/predict` | Risk tier + PGA for a lat/lon |
| GET | `/api/v1/predict/heatmap` | Precomputed statewide risk heatmap |
| GET | `/api/v1/predict/waveform` | Scaled pixel displacement waveform |
| GET | `/api/v1/predict/seismogram` | Full synthetic seismogram |
| GET | `/api/v1/health` | Health check |

---

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.12+
- MongoDB instance (local or Atlas)

### Backend

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create a .env file with:
# MONGO_URI=<your connection string>
# MONGO_DB_NAME=earfquake

uvicorn app.main:app --reload
```

### Frontend

```bash
cd my-app
npm install
npm start
```

The React app reads environment variables from the root `.env` file via the custom `run-react-with-root-env.js` script.

### Seeding the Database

```bash
cd server
python scripts/seed_mongo.py
```

---

## Testing

```bash
cd server
pytest tests/
```

---

## Deployment

The backend is configured for deployment on Render via `server/render.yaml`. Set `MONGO_URI` and `MONGO_DB_NAME` as environment variables in the Render dashboard. The start command is:

```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

## Data Sources

- California historical earthquake catalog (`california_earthquakes.csv`)
- 16-receiver ground-motion simulation dataset (`seismos_16_receivers.npy`)
- Fault trace geometry modeled after major California fault systems including the San Andreas, Calaveras, San Jacinto, and Garlock faults
