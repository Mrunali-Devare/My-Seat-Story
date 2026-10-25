"""Model 3: Gaussian Mixture. Each movie gets a probability for every cluster."""
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import silhouette_score
from sklearn.mixture import GaussianMixture

BASE = Path(__file__).resolve().parent
(BASE / "models").mkdir(exist_ok=True)
(BASE / "output").mkdir(exist_ok=True)

N_CLUSTERS = 20

features = np.load(BASE / "data" / "features.npy")
movies = pd.read_csv(BASE / "data" / "movies_clean.csv")

# "diag" keeps it fast and stable with 100 numbers per movie
model = GaussianMixture(n_components=N_CLUSTERS, covariance_type="diag", random_state=42)
model.fit(features)

probabilities = model.predict_proba(features)   # one row per movie, one column per cluster
labels = probabilities.argmax(axis=1)           # best cluster for each movie

movies["cluster"] = labels
movies["confidence"] = probabilities.max(axis=1).round(4)
movies.to_csv(BASE / "output" / "gmm_labels.csv", index=False)
np.save(BASE / "output" / "gmm_probabilities.npy", probabilities)
joblib.dump(model, BASE / "models" / "gmm.joblib")

score = silhouette_score(features, labels, sample_size=5000, random_state=42)
print("Clusters:", N_CLUSTERS)
print("Silhouette score:", round(score, 4))
print("Average confidence:", round(float(movies["confidence"].mean()), 4))
print("Movies per cluster:")
print(movies["cluster"].value_counts().sort_index().to_string())
