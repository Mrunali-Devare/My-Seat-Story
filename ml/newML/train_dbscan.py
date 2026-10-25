"""Model 2: DBSCAN. Finds dense groups; lonely movies are noise (label -1)."""
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.metrics import silhouette_score

BASE = Path(__file__).resolve().parent
(BASE / "models").mkdir(exist_ok=True)
(BASE / "output").mkdir(exist_ok=True)

EPS = 0.25         # how close two movies must be to be neighbours (cosine distance)
MIN_SAMPLES = 5    # neighbours needed to start a cluster

features = np.load(BASE / "data" / "features.npy")
movies = pd.read_csv(BASE / "data" / "movies_clean.csv")

model = DBSCAN(eps=EPS, min_samples=MIN_SAMPLES, metric="cosine")
labels = model.fit_predict(features)

movies["cluster"] = labels
movies.to_csv(BASE / "output" / "dbscan_labels.csv", index=False)
joblib.dump(model, BASE / "models" / "dbscan.joblib")

n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
n_noise = int((labels == -1).sum())
print("Clusters:", n_clusters)
print("Noise movies:", n_noise, f"({n_noise / len(labels):.1%})")

# silhouette only works with 2+ clusters, and we skip the noise points
mask = labels != -1
if n_clusters >= 2:
    score = silhouette_score(features[mask], labels[mask],
                             sample_size=min(5000, int(mask.sum())), random_state=42)
    print("Silhouette score (no noise):", round(score, 4))
else:
    print("Less than 2 clusters found - change EPS or MIN_SAMPLES.")
print("Movies per cluster:")
print(movies["cluster"].value_counts().sort_index().head(30).to_string())
