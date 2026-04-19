import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import numpy as np
from app.ml.model import predict_location

lats = np.arange(32.5, 42.0, 0.1)
lons = np.arange(-124.5, -114.0, 0.1)

points = []
total = len(lats) * len(lons)

for i, lat in enumerate(lats):
    for lon in lons:
        try:
            result = predict_location(lat, lon)
            points.append({
                'lat':           round(float(lat), 2),
                'lon':           round(float(lon), 2),
                'tier':          result['tier'],
                'pga_g':         result['pga_g'],
                'vs30':          result['vs30'],
                'fault_dist_km': result['fault_dist_km'],
            })
        except Exception as e:
            print(f"  Skipped ({lat}, {lon}): {e}")

    print(f"{i * len(lons)}/{total} points done...")

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app', 'ml', 'heatmap.json')
with open(out, 'w') as f:
    json.dump(points, f)

print(f"Done — {len(points):,} points saved to app/ml/heatmap.json")