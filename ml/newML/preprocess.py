"""
Step 1: Prepare the movie data so all four clustering models can use it.

Input : ../datasets/movies_metadata.csv, keywords.csv, credits.csv
Output: data/movies_clean.csv   (one row per movie)
        data/features.npy       (one numeric row per movie, same order)
"""
import ast
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import Normalizer

BASE = Path(__file__).resolve().parent
DATASETS = BASE.parent / "datasets"
DATA_OUT = BASE / "data"
DATA_OUT.mkdir(exist_ok=True)

MIN_VOTES = 20        # drop movies that almost nobody rated
N_COMPONENTS = 100    # size of each movie's final number vector


def get_names(text, limit=None):
    """Turn "[{'id': 1, 'name': 'Comedy'}]" into ['Comedy']."""
    try:
        items = ast.literal_eval(text)
    except (ValueError, SyntaxError):
        return []
    names = [item["name"] for item in items if "name" in item]
    return names[:limit] if limit else names


def get_director(text):
    try:
        crew = ast.literal_eval(text)
    except (ValueError, SyntaxError):
        return []
    return [p["name"] for p in crew if p.get("job") == "Director"][:1]


def clean_word(word):
    """'Science Fiction' -> 'sciencefiction' so each name stays one token."""
    return word.lower().replace(" ", "").replace("-", "")


def clean_ids(df):
    """Make 'id' a number, drop broken rows and duplicates."""
    df["id"] = pd.to_numeric(df["id"], errors="coerce")
    df = df.dropna(subset=["id"]).copy()
    df["id"] = df["id"].astype(int)
    return df.drop_duplicates(subset="id")


# ---------- 1. load ----------
print("Loading files...")
movies = pd.read_csv(DATASETS / "movies_metadata.csv", low_memory=False)
keywords = pd.read_csv(DATASETS / "keywords.csv")
credits = pd.read_csv(DATASETS / "credits.csv")

# ---------- 2. clean ----------
movies = clean_ids(movies)
keywords = clean_ids(keywords)
credits = clean_ids(credits)

movies["vote_count"] = pd.to_numeric(movies["vote_count"], errors="coerce")
movies["vote_average"] = pd.to_numeric(movies["vote_average"], errors="coerce")
movies = movies[movies["vote_count"] >= MIN_VOTES]
movies = movies.dropna(subset=["title"])

# ---------- 3. join ----------
movies = movies.merge(keywords[["id", "keywords"]], on="id", how="left")
movies = movies.merge(credits[["id", "cast", "crew"]], on="id", how="left")
movies = movies.reset_index(drop=True)
print("Movies kept:", len(movies))

# ---------- 4. turn the text columns into lists ----------
movies["genre_list"] = movies["genres"].fillna("").apply(get_names)
movies["keyword_list"] = movies["keywords"].fillna("").apply(get_names)
movies["cast_list"] = movies["cast"].fillna("").apply(lambda t: get_names(t, 3))
movies["director_list"] = movies["crew"].fillna("").apply(get_director)


# ---------- 5. build one text "soup" per movie ----------
def make_soup(row):
    parts = []
    parts += [clean_word(g) for g in row["genre_list"]] * 2   # genres count double
    parts += [clean_word(k) for k in row["keyword_list"]]
    parts += [clean_word(c) for c in row["cast_list"]]
    parts += [clean_word(d) for d in row["director_list"]]
    parts.append(str(row["overview"]) if pd.notna(row["overview"]) else "")
    return " ".join(parts)


movies["soup"] = movies.apply(make_soup, axis=1)

# ---------- 6. text -> numbers ----------
print("Turning text into numbers...")
tfidf = TfidfVectorizer(stop_words="english", min_df=2, max_features=10000)
tfidf_matrix = tfidf.fit_transform(movies["soup"])

# shrink to 100 numbers per movie, then scale each row to length 1
svd = TruncatedSVD(n_components=N_COMPONENTS, random_state=42)
features = Normalizer().fit_transform(svd.fit_transform(tfidf_matrix))
print("Feature matrix shape:", features.shape)

# ---------- 7. save ----------
movies["year"] = pd.to_datetime(movies["release_date"], errors="coerce").dt.year
movies["genres_text"] = movies["genre_list"].apply(lambda g: "|".join(g))

movies[["id", "title", "genres_text", "year", "vote_count", "vote_average"]] \
    .rename(columns={"id": "tmdb_id", "genres_text": "genres"}) \
    .to_csv(DATA_OUT / "movies_clean.csv", index=False)
np.save(DATA_OUT / "features.npy", features)

# keep the fitted steps so new movies (e.g. the website catalog) can be converted the same way
(BASE / "models").mkdir(exist_ok=True)
joblib.dump({"tfidf": tfidf, "svd": svd}, BASE / "models" / "preprocessing.joblib")

print("Saved to", DATA_OUT)
