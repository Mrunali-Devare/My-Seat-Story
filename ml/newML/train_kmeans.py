"""Model 1: K-Means. Every movie gets exactly one of K clusters."""
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

BASE = Path(__file__).resolve().parent
(BASE / "models").mkdir(exist_ok=True)
(BASE / "output").mkdir(exist_ok=True)

N_CLUSTERS = 20   # try other values and compare the silhouette score

features = np.load(BASE / "data" / "features.npy")
movies = pd.read_csv(BASE / "data" / "movies_clean.csv")

model = KMeans(n_clusters=N_CLUSTERS, n_init=10, random_state=42)
labels = model.fit_predict(features)

movies["cluster"] = labels
movies.to_csv(BASE / "output" / "kmeans_labels.csv", index=False)
joblib.dump(model, BASE / "models" / "kmeans.joblib")

score = silhouette_score(features, labels, sample_size=5000, random_state=42)
print("Clusters:", N_CLUSTERS)
print("Silhouette score:", round(score, 4))
print("Movies per cluster:")
print(movies["cluster"].value_counts().sort_index().to_string())
