from movie_recommendation import recommend_movies


def show_recommendations(movie_id):

    recommendations = recommend_movies(
        movie_id,
        top_n=5
    )

    if recommendations.empty:
        print("Movie not found in trained model.")
        return

    print("\nRecommended Movies:")
    print("=" * 60)

    for _, row in recommendations.iterrows():

        print(
            f"{row['title']} "
            f"({row['similarity_score']:.2%} similarity)"
        )


if __name__ == "__main__":

    # Toy Story in MovieLens 1M
    show_recommendations(1)