"""
Step 3: Compare the four clustering models on the real recommendation task.

For every user in ratings_small.csv:
  1. Take the movies they liked (rating >= 4).
  2. Hide 20% of those liked movies (the "test" movies).
  3. Build a taste profile from the remaining liked movies.
  4. Recommend TOP_K movies from the user's best clusters, ranked by similarity.
  5. Check how many hidden movies we found.

Run order: preprocess.py -> train_*.py (all four) -> evaluate.py
Output: output/comparison_results.csv and output/comparison_chart.png
"""
from pathlib import Path

import matplotlib
import numpy as np
import pandas as pd

matplotlib.use("Agg")
import matplotlib.pyplot as plt

BASE = Path(__file__).resolve().parent
DATASETS = BASE.parent / "datasets"

TOP_K = 10          # how many movies we recommend
TOP_CLUSTERS = 3    # how many clusters we search for each user
LIKE_RATING = 4.0   # rating that counts as "liked"
MIN_LIKED = 5       # skip users with fewer liked movies
HIDE_FRACTION = 0.2
rng = np.random.default_rng(42)

# ---------- 1. load movies and features ----------
movies = pd.read_csv(BASE / "data" / "movies_clean.csv")
features = np.load(BASE / "data" / "features.npy")
n_movies = len(movies)
tmdb_to_row = {tmdb_id: row for row, tmdb_id in enumerate(movies["tmdb_id"])}

# ---------- 2. load ratings and turn them into (user, liked rows) ----------
links = pd.read_csv(DATASETS / "links.csv")
links["tmdbId"] = pd.to_numeric(links["tmdbId"], errors="coerce")
links = links.dropna(subset=["tmdbId"])
movielens_to_row = {
    int(r.movieId): tmdb_to_row[int(r.tmdbId)]
    for r in links.itertuples()
    if int(r.tmdbId) in tmdb_to_row
}

ratings = pd.read_csv(DATASETS / "ratings_small.csv")
ratings["row"] = ratings["movieId"].map(movielens_to_row)
ratings = ratings.dropna(subset=["row"])
ratings["row"] = ratings["row"].astype(int)
liked = ratings[ratings["rating"] >= LIKE_RATING]

users = []   # each item: (profile_rows, hidden_rows)
for _, group in liked.groupby("userId"):
    rows = group["row"].unique()
    if len(rows) < MIN_LIKED:
        continue
    rows = rng.permutation(rows)
    n_hidden = max(1, int(len(rows) * HIDE_FRACTION))
    users.append((rows[n_hidden:], rows[:n_hidden]))
print(f"Users evaluated: {len(users)}")


# ---------- 3. cluster membership for every model ----------
def hard_membership(labels):
    """One-hot matrix. Noise movies (-1) get all zeros."""
    n_clusters = labels.max() + 1
    matrix = np.zeros((len(labels), n_clusters))
    for row, label in enumerate(labels):
        if label >= 0:
            matrix[row, label] = 1
    return matrix


models = {}
for name in ["kmeans", "dbscan", "gmm", "hdbscan"]:
    labels = pd.read_csv(BASE / "output" / f"{name}_labels.csv")["cluster"].values
    if name == "gmm":
        membership = np.load(BASE / "output" / "gmm_probabilities.npy")
    else:
        membership = hard_membership(labels)
    models[name] = (labels, membership)


# ---------- 4. recommenders ----------
popularity_order = np.argsort(-movies["vote_count"].values)


def make_profile(profile_rows):
    profile = features[profile_rows].mean(axis=0)
    return profile / np.linalg.norm(profile)


def rank_by_similarity(candidates, profile):
    scores = features[candidates] @ profile
    return candidates[np.argsort(-scores)]


def recommend_random(profile_rows):
    return rng.permutation(n_movies)


def recommend_popular(profile_rows):
    return popularity_order


def recommend_cosine(profile_rows):
    """No clusters at all: rank every movie by similarity."""
    everything = np.arange(n_movies)
    return rank_by_similarity(everything, make_profile(profile_rows))


def recommend_with_clusters(name, profile_rows):
    """Returns (ranked movie rows, used_fallback, pool_size)."""
    labels, membership = models[name]
    profile = make_profile(profile_rows)

    # which clusters does this user like? average membership of liked movies
    cluster_scores = membership[profile_rows].mean(axis=0)
    best = np.argsort(-cluster_scores)[:TOP_CLUSTERS]
    best = best[cluster_scores[best] > 0]

    pool = np.where(np.isin(labels, best))[0]
    pool = np.setdiff1d(pool, profile_rows)

    if len(pool) < TOP_K:   # all liked movies were noise, or tiny cluster
        return recommend_cosine(profile_rows), True, n_movies
    return rank_by_similarity(pool, profile), False, len(pool)


# ---------- 5. metrics ----------
def score_one_user(ranked, profile_rows, hidden_rows):
    ranked = [m for m in ranked if m not in set(profile_rows)][:TOP_K]
    hidden = set(hidden_rows)
    hits = [1 if m in hidden else 0 for m in ranked]

    n_hits = sum(hits)
    dcg = sum(h / np.log2(i + 2) for i, h in enumerate(hits))
    ideal = sum(1 / np.log2(i + 2) for i in range(min(len(hidden), TOP_K)))
    return {
        "hit_rate": 1 if n_hits > 0 else 0,
        "precision": n_hits / TOP_K,
        "recall": n_hits / len(hidden),
        "ndcg": dcg / ideal,
    }, ranked


def evaluate(name, recommend_function):
    scores, recommended, fallbacks, pools = [], set(), 0, []
    for profile_rows, hidden_rows in users:
        result = recommend_function(profile_rows)
        if isinstance(result, tuple):
            ranked, used_fallback, pool_size = result
            fallbacks += used_fallback
            pools.append(pool_size)
        else:
            ranked = result
        user_scores, top = score_one_user(ranked, profile_rows, hidden_rows)
        scores.append(user_scores)
        recommended.update(top)

    table = pd.DataFrame(scores).mean()
    return {
        "method": name,
        f"hit_rate@{TOP_K}": round(table["hit_rate"], 4),
        f"precision@{TOP_K}": round(table["precision"], 4),
        f"recall@{TOP_K}": round(table["recall"], 4),
        f"ndcg@{TOP_K}": round(table["ndcg"], 4),
        "coverage": round(len(recommended) / n_movies, 4),
        "fallback_rate": round(fallbacks / len(users), 4),
        "avg_pool_size": int(np.mean(pools)) if pools else n_movies,
    }


# ---------- 6. run everything ----------
results = [
    evaluate("random", recommend_random),
    evaluate("popular", recommend_popular),
    evaluate("cosine_all (no clusters)", recommend_cosine),
]
for name in models:
    results.append(
        evaluate(name, lambda rows, name=name: recommend_with_clusters(name, rows))
    )

results = pd.DataFrame(results)
results.to_csv(BASE / "output" / "comparison_results.csv", index=False)
print()
print(results.to_string(index=False))

# ---------- 7. chart ----------
results.set_index("method")[[f"hit_rate@{TOP_K}", f"ndcg@{TOP_K}"]].plot.bar(figsize=(9, 5))
plt.title("Recommendation quality (higher is better)")
plt.ylabel("score")
plt.xticks(rotation=30, ha="right")
plt.tight_layout()
plt.savefig(BASE / "output" / "comparison_chart.png", dpi=120)
print("\nSaved: output/comparison_results.csv and output/comparison_chart.png")
