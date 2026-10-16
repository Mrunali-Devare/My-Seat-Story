from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from scipy.sparse import csr_matrix
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "datasets" / "ml-1m"
MODEL_DIR = BASE_DIR / "models"
OUTPUT_DIR = BASE_DIR / "output"

MODEL_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)


MOVIES_FILE = DATA_DIR / "movies.dat"
RATINGS_FILE = DATA_DIR / "ratings.dat"


# ============================================================
# LOAD MOVIE DATA
# ============================================================

def load_movies():
    movies = pd.read_csv(
        MOVIES_FILE,
        sep="::",
        engine="python",
        encoding="latin-1",
        names=["movie_id", "title", "genres"],
    )

    return movies


# ============================================================
# LOAD RATINGS
# ============================================================

def load_ratings():
    ratings = pd.read_csv(
        RATINGS_FILE,
        sep="::",
        engine="python",
        encoding="latin-1",
        names=["user_id", "movie_id", "rating", "timestamp"],
    )

    return ratings


# ============================================================
# CREATE USER-MOVIE MATRIX
# ============================================================

def create_user_movie_matrix(ratings):

    user_ids = ratings["user_id"].unique()
    movie_ids = ratings["movie_id"].unique()

    user_to_index = {
        user_id: index
        for index, user_id in enumerate(user_ids)
    }

    movie_to_index = {
        movie_id: index
        for index, movie_id in enumerate(movie_ids)
    }

    rows = ratings["user_id"].map(user_to_index)
    cols = ratings["movie_id"].map(movie_to_index)

    matrix = csr_matrix(
        (
            ratings["rating"].values,
            (rows, cols),
        ),
        shape=(len(user_ids), len(movie_ids)),
    )

    return matrix, user_to_index, movie_to_index


# ============================================================
# TRAIN MODEL
# ============================================================

def train_model():

    print("Loading MovieLens dataset...")

    movies = load_movies()
    ratings = load_ratings()

    print(f"Movies: {len(movies):,}")
    print(f"Ratings: {len(ratings):,}")
    print(f"Users: {ratings['user_id'].nunique():,}")

    print("\nCreating user-movie matrix...")

    matrix, user_to_index, movie_to_index = create_user_movie_matrix(
        ratings
    )

    print(
        f"Matrix shape: {matrix.shape[0]} users × "
        f"{matrix.shape[1]} movies"
    )

    # --------------------------------------------------------
    # SVD
    # --------------------------------------------------------

    print("\nTraining Truncated SVD model...")

    n_components = min(50, matrix.shape[1] - 1)

    svd = TruncatedSVD(
        n_components=n_components,
        random_state=42,
    )

    user_latent = svd.fit_transform(matrix)

    movie_latent = svd.components_.T

    explained_variance = svd.explained_variance_ratio_.sum()

    print(
        f"Explained variance: "
        f"{explained_variance:.4f}"
    )

    # --------------------------------------------------------
    # Movie similarity
    # --------------------------------------------------------

    print("\nCalculating movie similarity...")

    movie_similarity = cosine_similarity(movie_latent)

    movie_ids = list(movie_to_index.keys())

    # --------------------------------------------------------
    # Save model
    # --------------------------------------------------------

    model = {
        "svd": svd,
        "movie_similarity": movie_similarity,
        "movie_ids": movie_ids,
        "movie_to_index": movie_to_index,
        "movies": movies,
    }

    model_path = MODEL_DIR / "movie_recommender.joblib"

    joblib.dump(model, model_path)

    print(f"\nModel saved to:")
    print(model_path)

    return model


# ============================================================
# RECOMMEND MOVIES
# ============================================================

def recommend_movies(movie_id, top_n=5):

    model_path = MODEL_DIR / "movie_recommender.joblib"

    if not model_path.exists():
        raise FileNotFoundError(
            "Trained model not found. "
            "Run train_model() first."
        )

    model = joblib.load(model_path)

    movie_to_index = model["movie_to_index"]
    movie_similarity = model["movie_similarity"]
    movies = model["movies"]

    if movie_id not in movie_to_index:
        return pd.DataFrame()

    index = movie_to_index[movie_id]

    similarity_scores = movie_similarity[index]

    similar_indices = np.argsort(
        similarity_scores
    )[::-1]

    recommendations = []

    for similar_index in similar_indices:

        if similar_index == index:
            continue

        recommended_movie_id = model["movie_ids"][
            similar_index
        ]

        score = similarity_scores[similar_index]

        movie_row = movies[
            movies["movie_id"] == recommended_movie_id
        ]

        if movie_row.empty:
            continue

        movie = movie_row.iloc[0]

        recommendations.append(
            {
                "movie_id": int(movie["movie_id"]),
                "title": movie["title"],
                "genres": movie["genres"],
                "similarity_score": round(
                    float(score), 4
                ),
            }
        )

        if len(recommendations) >= top_n:
            break

    return pd.DataFrame(recommendations)


# ============================================================
# GENERATE ALL RECOMMENDATIONS
# ============================================================

def generate_recommendation_file(top_n=5):

    model_path = MODEL_DIR / "movie_recommender.joblib"

    model = joblib.load(model_path)

    movies = model["movies"]
    movie_to_index = model["movie_to_index"]
    movie_similarity = model["movie_similarity"]
    movie_ids = model["movie_ids"]

    all_recommendations = []

    print("\nGenerating recommendations...")

    for movie_id in movie_ids:

        index = movie_to_index[movie_id]

        similarity_scores = movie_similarity[index]

        similar_indices = np.argsort(
            similarity_scores
        )[::-1]

        count = 0

        for similar_index in similar_indices:

            if similar_index == index:
                continue

            recommended_movie_id = movie_ids[
                similar_index
            ]

            score = similarity_scores[similar_index]

            source_movie = movies[
                movies["movie_id"] == movie_id
            ]

            recommended_movie = movies[
                movies["movie_id"] == recommended_movie_id
            ]

            if source_movie.empty or recommended_movie.empty:
                continue

            all_recommendations.append(
                {
                    "movie_id": int(movie_id),
                    "movie_title": source_movie.iloc[0]["title"],
                    "recommended_movie_id": int(
                        recommended_movie_id
                    ),
                    "recommended_movie_title":
                        recommended_movie.iloc[0]["title"],
                    "similarity_score": round(
                        float(score), 4
                    ),
                    "rank": count + 1,
                }
            )

            count += 1

            if count >= top_n:
                break

    output = pd.DataFrame(all_recommendations)

    output_file = (
        OUTPUT_DIR /
        "movie_recommendations.csv"
    )

    output.to_csv(
        output_file,
        index=False
    )

    print(
        f"\nRecommendations saved to:"
        f"\n{output_file}"
    )

    print(
        f"Total recommendation rows: "
        f"{len(output):,}"
    )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    train_model()

    generate_recommendation_file(
        top_n=5
    )