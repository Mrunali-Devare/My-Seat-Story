"""
Step 4: Use the four trained models on the website's own movies.

The website has its own movie catalog (Supabase), which is mostly NOT in the
Kaggle dataset. So we cannot join by title. Instead we:
  1. download the website movies (public read),
  2. turn them into numbers with the SAME tfidf + svd used in preprocess.py,
  3. ask each trained model which cluster every movie belongs to,
  4. write a Supabase migration (tables + data + 2 SQL functions).

Run:  python export_site.py
Then apply the file created in supabase/migrations/ to your database.
(Re-run this script whenever the website catalog changes.)
"""
import os
import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import requests
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import Normalizer

BASE = Path(__file__).resolve().parent
PROJECT = BASE.parent.parent
MIGRATION = PROJECT / "supabase" / "migrations" / "20261013000000_cluster_recommendations.sql"

SIMILAR_PER_MOVIE = 30     # how many similar movies we keep for each movie
GMM_MIN_WEIGHT = 0.05      # ignore GMM clusters with less than 5% probability
DBSCAN_EPS = 0.25          # must match train_dbscan.py
HDBSCAN_RADIUS = 0.25      # a movie must be this close to a clustered movie
ALGORITHMS = ["kmeans", "dbscan", "gmm", "hdbscan"]


# ---------- 1. get the website movies ----------
def read_env_file():
    """Read SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY from .env (nothing else)."""
    values = {}
    env_path = PROJECT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            key, _, value = line.partition("=")
            if key in ("SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"):
                values[key] = value.strip().strip('"')
    return values


env = {**read_env_file(), **os.environ}
url, key = env.get("SUPABASE_URL"), env.get("SUPABASE_PUBLISHABLE_KEY")
if not url or not key:
    raise SystemExit("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (in .env or the shell).")

response = requests.get(
    f"{url}/rest/v1/movies",
    params={"select": "id,title,description,genres", "limit": 1000},
    headers={"apikey": key, "Authorization": f"Bearer {key}"},
    timeout=60,
)
response.raise_for_status()
site = pd.DataFrame(response.json())
print("Website movies:", len(site))


# ---------- 2. movies -> numbers (same recipe as preprocess.py) ----------
def clean_word(word):
    return word.lower().replace(" ", "").replace("-", "")


def make_soup(row):
    genres = [clean_word(g) for g in (row["genres"] or [])] * 2
    return " ".join(genres + [row["description"] or ""])


steps = joblib.load(BASE / "models" / "preprocessing.joblib")
site["soup"] = site.apply(make_soup, axis=1)
site_features = Normalizer().fit_transform(
    steps["svd"].transform(steps["tfidf"].transform(site["soup"]))
)
train_features = np.load(BASE / "data" / "features.npy")


# ---------- 3. a readable name for every cluster ----------
def cluster_names(algorithm):
    """Name each cluster after the 2 most common genres of its training movies."""
    table = pd.read_csv(BASE / "output" / f"{algorithm}_labels.csv")
    names = {}
    for cluster_id, group in table[table["cluster"] >= 0].groupby("cluster"):
        genres = group["genres"].dropna().str.split("|").explode().value_counts()
        names[int(cluster_id)] = " / ".join(genres.index[:2]) or f"Group {cluster_id}"
    return names


# ---------- 4. assign every website movie to clusters ----------
def assign(algorithm):
    """Returns a list of (movie_index, cluster_id, weight). cluster_id -1 = noise."""
    rows = []
    if algorithm == "kmeans":
        model = joblib.load(BASE / "models" / "kmeans.joblib")
        for i, cluster in enumerate(model.predict(site_features)):
            centre = model.cluster_centers_[cluster]
            weight = float(site_features[i] @ centre / np.linalg.norm(centre))
            rows.append((i, int(cluster), round(max(weight, 0.0), 4)))

    elif algorithm == "gmm":
        model = joblib.load(BASE / "models" / "gmm.joblib")
        probabilities = model.predict_proba(site_features)
        for i, row in enumerate(probabilities):
            keep = [(c, p) for c, p in enumerate(row) if p >= GMM_MIN_WEIGHT]
            for cluster, p in keep or [(int(row.argmax()), float(row.max()))]:
                rows.append((i, int(cluster), round(float(p), 4)))

    elif algorithm == "dbscan":
        # DBSCAN has no predict(): a movie joins the cluster of the nearest
        # core point if that point is within EPS, otherwise it is noise.
        model = joblib.load(BASE / "models" / "dbscan.joblib")
        core_features = train_features[model.core_sample_indices_]
        core_labels = model.labels_[model.core_sample_indices_]
        nearest = NearestNeighbors(n_neighbors=1, metric="cosine").fit(core_features)
        distance, index = nearest.kneighbors(site_features)
        for i in range(len(site_features)):
            if distance[i, 0] <= DBSCAN_EPS:
                rows.append((i, int(core_labels[index[i, 0]]), round(1 - float(distance[i, 0]), 4)))
            else:
                rows.append((i, -1, 1.0))

    elif algorithm == "hdbscan":
        # sklearn's HDBSCAN has no predict() either: vote among the 5 nearest
        # clustered movies, but only those closer than HDBSCAN_RADIUS.
        model = joblib.load(BASE / "models" / "hdbscan.joblib")
        member = model.labels_ >= 0
        member_features = train_features[member]
        member_labels = model.labels_[member]
        nearest = NearestNeighbors(n_neighbors=5, metric="cosine").fit(member_features)
        distances, indexes = nearest.kneighbors(site_features)
        for i in range(len(site_features)):
            close = indexes[i][distances[i] <= HDBSCAN_RADIUS]
            if len(close) == 0:
                rows.append((i, -1, 1.0))
            else:
                votes = pd.Series(member_labels[close]).value_counts()
                rows.append((i, int(votes.index[0]), round(float(votes.iloc[0]) / len(close), 4)))
    return rows


assignments = []   # (movie_id, algorithm, cluster_id, label, weight)
for algorithm in ALGORITHMS:
    names = cluster_names(algorithm)
    rows = assign(algorithm)
    noise = sum(1 for _, c, _ in rows if c == -1)
    print(f"{algorithm:8s} clusters used: {len({c for _, c, _ in rows if c >= 0}):3d}   noise movies: {noise}/{len(site)}")
    for i, cluster, weight in rows:
        label = "Unclustered" if cluster == -1 else names.get(cluster, f"Group {cluster}")
        assignments.append((site.loc[i, "id"], algorithm, cluster, label, weight))


# ---------- 5. similarity between website movies ----------
similarity = site_features @ site_features.T
pairs = []   # (movie_id, similar_movie_id, score)
for i in range(len(site)):
    order = [j for j in np.argsort(-similarity[i]) if j != i][:SIMILAR_PER_MOVIE]
    for j in order:
        pairs.append((site.loc[i, "id"], site.loc[j, "id"], round(float(similarity[i, j]), 4)))


# ---------- 6. write the SQL migration ----------
def sql_text(value):
    return "'" + str(value).replace("'", "''") + "'"


cluster_values = ",\n".join(
    f"  ({sql_text(m)}, {sql_text(a)}, {c}, {sql_text(label)}, {w})"
    for m, a, c, label, w in assignments
)
similar_values = ",\n".join(
    f"  ({sql_text(m)}, {sql_text(s)}, {score})" for m, s, score in pairs
)

migration = f"""-- Generated by ml/newML/export_site.py - do not edit by hand.
-- Cluster-based recommendations from K-Means, DBSCAN, GMM and HDBSCAN.

CREATE TABLE IF NOT EXISTS public.movie_clusters (
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  algorithm TEXT NOT NULL CHECK (algorithm IN ('kmeans','dbscan','gmm','hdbscan')),
  cluster_id INT NOT NULL,            -- -1 means "noise / unclustered"
  cluster_label TEXT NOT NULL,
  weight NUMERIC(5,4) NOT NULL DEFAULT 1,
  PRIMARY KEY (movie_id, algorithm, cluster_id)
);
CREATE INDEX IF NOT EXISTS idx_movie_clusters_lookup ON public.movie_clusters(algorithm, cluster_id);

CREATE TABLE IF NOT EXISTS public.movie_similarity (
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  similar_movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  score NUMERIC(5,4) NOT NULL,
  PRIMARY KEY (movie_id, similar_movie_id)
);

GRANT SELECT ON public.movie_clusters, public.movie_similarity TO anon, authenticated;
GRANT ALL ON public.movie_clusters, public.movie_similarity TO service_role;
ALTER TABLE public.movie_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_similarity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "movie_clusters_select_all" ON public.movie_clusters;
DROP POLICY IF EXISTS "movie_similarity_select_all" ON public.movie_similarity;
CREATE POLICY "movie_clusters_select_all" ON public.movie_clusters FOR SELECT USING (true);
CREATE POLICY "movie_similarity_select_all" ON public.movie_similarity FOR SELECT USING (true);

-- refresh the data
DELETE FROM public.movie_clusters;
DELETE FROM public.movie_similarity;

INSERT INTO public.movie_clusters (movie_id, algorithm, cluster_id, cluster_label, weight) VALUES
{cluster_values};

INSERT INTO public.movie_similarity (movie_id, similar_movie_id, score) VALUES
{similar_values};

-- "More like this": movies in the same cluster(s) as one movie.
-- Movies from the same cluster come first; if there are fewer than p_limit
-- (or the movie is noise) the list is filled with the most similar movies.
CREATE OR REPLACE FUNCTION public.get_similar_movies_by_cluster(
  p_movie_id UUID, p_algorithm TEXT, p_limit INT DEFAULT 10
)
RETURNS TABLE (
  movie_id UUID, title TEXT, poster_url TEXT, rating NUMERIC, genres TEXT[],
  duration_minutes INT, certificate TEXT, languages TEXT[],
  cluster_label TEXT, similarity NUMERIC, in_cluster BOOLEAN
)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH source_clusters AS (
    SELECT mc.cluster_id FROM public.movie_clusters mc
    WHERE mc.movie_id = p_movie_id AND mc.algorithm = p_algorithm AND mc.cluster_id >= 0
  ),
  best_label AS (
    SELECT DISTINCT ON (mc.movie_id) mc.movie_id, mc.cluster_label
    FROM public.movie_clusters mc
    WHERE mc.algorithm = p_algorithm AND mc.cluster_id >= 0
    ORDER BY mc.movie_id, mc.weight DESC
  )
  SELECT m.id, m.title, m.poster_url, m.rating, m.genres, m.duration_minutes,
         m.certificate, m.languages, bl.cluster_label,
         COALESCE(ms.score, 0) AS similarity,
         EXISTS (
           SELECT 1 FROM public.movie_clusters mc
           WHERE mc.movie_id = m.id AND mc.algorithm = p_algorithm
             AND mc.cluster_id IN (SELECT cluster_id FROM source_clusters)
         ) AS in_cluster
  FROM public.movies m
  LEFT JOIN public.movie_similarity ms ON ms.movie_id = p_movie_id AND ms.similar_movie_id = m.id
  LEFT JOIN best_label bl ON bl.movie_id = m.id
  WHERE m.id <> p_movie_id
  ORDER BY in_cluster DESC, similarity DESC
  LIMIT p_limit
$$;
GRANT EXECUTE ON FUNCTION public.get_similar_movies_by_cluster(UUID, TEXT, INT) TO anon, authenticated;

-- "Picked for you": uses the logged-in user's liked movies (reviews with
-- 4+ stars and confirmed bookings). The user's top 3 clusters are searched
-- first (for GMM the cluster weights are soft probabilities), ranked by
-- average similarity to the liked movies. Runs as the user, so RLS applies.
CREATE OR REPLACE FUNCTION public.get_personalized_recommendations(
  p_algorithm TEXT, p_limit INT DEFAULT 10
)
RETURNS TABLE (
  movie_id UUID, title TEXT, poster_url TEXT, rating NUMERIC, genres TEXT[],
  duration_minutes INT, certificate TEXT, languages TEXT[],
  cluster_label TEXT, similarity NUMERIC, in_cluster BOOLEAN
)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH liked AS (
    SELECT r.movie_id FROM public.reviews r
    WHERE r.user_id = auth.uid() AND r.rating >= 4
    UNION
    SELECT s.movie_id FROM public.bookings b JOIN public.shows s ON s.id = b.show_id
    WHERE b.user_id = auth.uid() AND b.status = 'confirmed'
  ),
  top_clusters AS (
    SELECT mc.cluster_id, SUM(mc.weight) AS strength
    FROM liked l
    JOIN public.movie_clusters mc ON mc.movie_id = l.movie_id
    WHERE mc.algorithm = p_algorithm AND mc.cluster_id >= 0
    GROUP BY mc.cluster_id ORDER BY strength DESC LIMIT 3
  ),
  best_label AS (
    SELECT DISTINCT ON (mc.movie_id) mc.movie_id, mc.cluster_label
    FROM public.movie_clusters mc
    WHERE mc.algorithm = p_algorithm AND mc.cluster_id >= 0
    ORDER BY mc.movie_id, mc.weight DESC
  ),
  scored AS (
    SELECT m.id AS candidate_id, AVG(COALESCE(ms.score, 0)) AS similarity
    FROM public.movies m
    CROSS JOIN liked l
    LEFT JOIN public.movie_similarity ms ON ms.movie_id = l.movie_id AND ms.similar_movie_id = m.id
    WHERE m.id NOT IN (SELECT movie_id FROM liked)
    GROUP BY m.id
  )
  SELECT m.id, m.title, m.poster_url, m.rating, m.genres, m.duration_minutes,
         m.certificate, m.languages, bl.cluster_label, sc.similarity,
         EXISTS (
           SELECT 1 FROM public.movie_clusters mc
           WHERE mc.movie_id = m.id AND mc.algorithm = p_algorithm
             AND mc.cluster_id IN (SELECT cluster_id FROM top_clusters)
         ) AS in_cluster
  FROM scored sc
  JOIN public.movies m ON m.id = sc.candidate_id
  LEFT JOIN best_label bl ON bl.movie_id = m.id
  ORDER BY in_cluster DESC, sc.similarity DESC
  LIMIT p_limit
$$;
GRANT EXECUTE ON FUNCTION public.get_personalized_recommendations(TEXT, INT) TO authenticated;
"""

MIGRATION.write_text(migration, encoding="utf-8")
print("\nWrote", MIGRATION.relative_to(PROJECT))
print("Cluster rows:", len(assignments), " Similarity rows:", len(pairs))
