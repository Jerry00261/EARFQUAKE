# 🌍 EARFQUAKE

A full-stack earthquake visualization and seismic risk analysis platform powered by machine learning. EARFQUAKE provides real-time earthquake exploration, interactive seismic hazard mapping, and AI-driven ground motion prediction for California.

## ✨ Features

### 🗺️ Earthquake Explorer
- **Interactive Map** — Browse thousands of historical and real-time earthquake events on a dark-themed Google Maps interface
- **Real-Time Feed** — Live earthquake event streaming with screen-shake animation for significant events (M5.0+)
- **Filtering & Search** — Filter by year, minimum magnitude, and location
- **Detail Panels** — View event metadata, location history, and year-over-year activity for any seismic zone
- **State Analytics** — Aggregated seismic statistics across geographic regions

### 🔬 Seismic Risk Analysis
- **Hazard Heatmap** — Precomputed seismic hazard visualization across California
- **Point Prediction** — Click anywhere on the map to get an ML-powered risk assessment including:
  - Seismic risk tier classification
  - Peak Ground Acceleration (PGA) estimate
  - Site soil classification (Vs30)
  - Distance to nearest fault
- **Synthetic Seismogram** — Physics-based waveform generation using a Reduced Order Model (ROM) with SVD + RBF interpolation
- **Street View Integration** — Explore locations in Google Street View directly from the map

## 🏗️ Architecture

```
EARFQUAKE/
├── my-app/          # React frontend (Create React App)
│   └── src/
│       ├── components/    # Map, panels, charts (Recharts)
│       ├── hooks/         # Google Maps API loader
│       ├── services/      # API client & real-time feed
│       └── utils/         # Helper functions
├── server/          # Python backend (FastAPI)
│   ├── app/
│   │   ├── api/           # REST endpoints
│   │   ├── core/          # Configuration
│   │   ├── db/            # MongoDB integration
│   │   ├── ml/            # Machine learning models
│   │   └── schemas/       # Pydantic response models
│   ├── data/              # Seismic datasets (CSV, NumPy)
│   └── tests/             # Backend test suite
└── package.json
```

## 🧠 Machine Learning

| Component | Purpose | Method |
|-----------|---------|--------|
| **Risk Classifier** | Categorizes locations into seismic risk tiers | XGBoost trained on Vs30, fault proximity, and seismicity density |
| **GMPE** | Estimates Peak Ground Acceleration for a scenario earthquake (M6.5) | Empirical ground motion prediction equation |
| **ROM Seismogram** | Generates synthetic velocity waveforms | SVD-based Reduced Order Model with RBF interpolation over 16 receiver stations |

## 🛠️ Tech Stack

### Frontend
- **React 19** — UI framework with hooks and transitions
- **Google Maps JavaScript API** — Map rendering, overlays, and Street View
- **Recharts** — Data visualization (histograms, waveform charts)
- **CSS** — Custom dark-themed styling

### Backend
- **FastAPI** — Async Python web framework
- **MongoDB** — Earthquake event storage and querying
- **NumPy / SciPy** — Numerical computation & ROM interpolation
- **scikit-learn / XGBoost** — ML model training and inference
- **Pandas** — Data processing

### Deployment
- **Render** — Cloud hosting (configured via `render.yaml`)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB instance (local or Atlas)
- Google Maps API key

### Backend Setup

```bash
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the `server/` directory:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net
MONGO_DB_NAME=earfquake
```

Start the API server:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000` with interactive docs at `/docs`.

### Frontend Setup

```bash
cd my-app
npm install
npm start
```

The app will open at `http://localhost:3000`.

### Running Tests

```bash
# Backend
cd server
pytest

# Frontend
cd my-app
npm test
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/earthquakes` | List earthquakes with optional filters (year, magnitude, location) |
| `GET` | `/api/v1/earthquakes/summary` | Aggregate stats for a given year |
| `GET` | `/api/v1/earthquakes/{id}` | Single earthquake detail |
| `GET` | `/api/v1/predict` | ML risk prediction for a lat/lon coordinate |
| `GET` | `/api/v1/heatmap` | Precomputed seismic hazard grid |
| `GET` | `/api/v1/seismogram` | Synthetic waveform via ROM for a source location |
| `GET` | `/api/v1/waveform` | Screen-shake pixel offsets for animation |

## 📄 License

This project is for educational and portfolio purposes.
