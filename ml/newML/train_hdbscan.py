"""Model 4: HDBSCAN. Like DBSCAN but no EPS needed; handles groups of different density."""
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import HDBSCAN
from sklearn.metrics import silhouette_score

BASE = Path(__file__).resolve().parent
(BASE / "models").mkdir(exist_ok=True)
(BASE / "output").mkdir(exist_ok=True)

MIN_CLUSTER_SIZE = 10   # smallest group we accept as a cluster
MIN_SAMPLES = 3         # lower = fewer movies called noise

features = np.load(BASE / "data" / "features.npy")
movies = pd.read_csv(BASE / "data" / "movies_clean.csv")

# features are length-1 rows, so normal (euclidean) distance matches cosine
model = HDBSCAN(min_cluster_size=MIN_CLUSTER_SIZE, min_samples=MIN_SAMPLES, copy=True)
labels = model.fit_predict(features)

movies["cluster"] = labels
movies.to_csv(BASE / "output" / "hdbscan_labels.csv", index=False)
joblib.dump(model, BASE / "models" / "hdbscan.joblib")

n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
n_noise = int((labels == -1).sum())
print("Clusters:", n_clusters)
print("Noise movies:", n_noise, f"({n_noise / len(labels):.1%})")

mask = labels != -1
if n_clusters >= 2:
    score = silhouette_score(features[mask], labels[mask],
                             sample_size=min(5000, int(mask.sum())), random_state=42)
    print("Silhouette score (no noise):", round(score, 4))
else:
    print("Less than 2 clusters found - lower MIN_CLUSTER_SIZE.")
print("Movies per cluster:")
print(movies["cluster"].value_counts().sort_index().head(30).to_string())
