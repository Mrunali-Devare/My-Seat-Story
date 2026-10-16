import os
import requests
import pandas as pd

from dotenv import load_dotenv

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)


# ==========================================
# 1. LOAD ENVIRONMENT VARIABLES
# ==========================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "SUPABASE_URL or SUPABASE_KEY is missing from ml/.env"
    )


# ==========================================
# 2. LOAD DATA FROM SUPABASE
# ==========================================

url = f"{SUPABASE_URL}/rest/v1/rpc/get_ml_movie_popularity"

headers = {
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json"
}

response = requests.post(
    url,
    headers=headers
)

if response.status_code != 200:
    print("Supabase request failed.")
    print("Status:", response.status_code)
    print("Response:", response.text)
    raise SystemExit()


data = response.json()

df = pd.DataFrame(data)

print("Data loaded successfully.")
print("Number of records:", len(df))

print("\nFirst 5 records:")
print(df.head())


# ==========================================
# 3. DATA PREPARATION
# ==========================================

df["show_date"] = pd.to_datetime(df["show_date"])

df["day_of_week"] = df["show_date"].dt.dayofweek
df["month"] = df["show_date"].dt.month
df["show_hour"] = pd.to_datetime(
    df["show_time"].astype(str),
    format="mixed"
).dt.hour


# ==========================================
# 4. CREATE POPULARITY TARGET
# ==========================================

# ==========================================
# 4. CREATE POPULARITY TARGET
# ==========================================

# Calculate median using only shows that have
# at least one ticket sold.
non_zero_seats = df.loc[
    df["seats_sold"] > 0,
    "seats_sold"
]

if len(non_zero_seats) == 0:
    raise ValueError(
        "No shows have ticket sales. "
        "Cannot create popularity classes."
    )

median_seats = non_zero_seats.median()

print("\nMedian seats sold among booked shows:", median_seats)

# Popular = seats sold >= median of booked shows
# Not Popular = seats sold below that median
df["popularity"] = (
    df["seats_sold"] >= median_seats
).astype(int)

df["popularity_label"] = df["popularity"].map({
    0: "Not Popular",
    1: "Popular"
})

print("\nPopularity distribution:")
print(df["popularity_label"].value_counts())

df["popularity_label"] = df["popularity"].map({
    0: "Not Popular",
    1: "Popular"
})


print("\nPopularity distribution:")
print(df["popularity_label"].value_counts())


# ==========================================
# 5. FEATURES
# ==========================================

features = [
    "movie_title",
    "city",
    "theatre_name",
    "day_of_week",
    "month",
    "show_hour"
]

X = df[features]

y = df["popularity"]


# ==========================================
# 6. TRAIN / TEST SPLIT
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\nTraining records:", len(X_train))
print("Testing records:", len(X_test))


# ==========================================
# 7. PREPROCESSING
# ==========================================

categorical_features = [
    "movie_title",
    "city",
    "theatre_name"
]

numeric_features = [
    "day_of_week",
    "month",
    "show_hour"
]


preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        )
    ],
    remainder="passthrough"
)


# ==========================================
# 8. DECISION TREE MODEL
# ==========================================

model = DecisionTreeClassifier(
    criterion="entropy",
    max_depth=5,
    random_state=42
)


pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", model)
    ]
)


# ==========================================
# 9. TRAIN MODEL
# ==========================================

print("\nTraining Decision Tree model...")

pipeline.fit(X_train, y_train)

print("Model training completed.")


# ==========================================
# 10. PREDICTION
# ==========================================

y_pred = pipeline.predict(X_test)


# ==========================================
# 11. EVALUATION
# ==========================================

accuracy = accuracy_score(
    y_test,
    y_pred
)

print("\n======================================")
print("       DECISION TREE RESULTS")
print("======================================")

print(f"Accuracy : {accuracy:.4f}")
print(f"Accuracy : {accuracy * 100:.2f}%")


print("\nClassification Report:")
print(
    classification_report(
        y_test,
        y_pred,
        labels=[0, 1],
        target_names=[
            "Not Popular",
            "Popular"
        ],
        zero_division=0
    )
)


print("\nConfusion Matrix:")

cm = confusion_matrix(
    y_test,
    y_pred,
    labels=[0, 1]
)

print(cm)


# ==========================================
# 12. ACTUAL VS PREDICTED
# ==========================================

results = X_test.copy()

results["Actual"] = y_test.values
results["Predicted"] = y_pred

results["Actual Label"] = results["Actual"].map({
    0: "Not Popular",
    1: "Popular"
})

results["Predicted Label"] = results["Predicted"].map({
    0: "Not Popular",
    1: "Popular"
})


print("\nActual vs Predicted:")
print(
    results[
        [
            "movie_title",
            "city",
            "theatre_name",
            "show_hour",
            "Actual Label",
            "Predicted Label"
        ]
    ].head(15).to_string(index=False)
)


# ==========================================
# 13. SAMPLE PREDICTION
# ==========================================

sample_show = pd.DataFrame({
    "movie_title": ["Inception"],
    "city": ["Mumbai"],
    "theatre_name": ["PVR Phoenix Marketcity"],
    "day_of_week": [5],
    "month": [10],
    "show_hour": [19]
})


prediction = pipeline.predict(
    sample_show
)[0]

probability = pipeline.predict_proba(
    sample_show
)[0]


prediction_label = (
    "Popular"
    if prediction == 1
    else "Not Popular"
)


print("\n======================================")
print("       SAMPLE POPULARITY PREDICTION")
print("======================================")

print("Movie        : Inception")
print("City         : Mumbai")
print("Theatre      : PVR Phoenix Marketcity")
print("Show Time    : 7:00 PM")

print("Prediction   :", prediction_label)

print(
    "Probability  : "
    f"{max(probability) * 100:.2f}%"
)
# ==========================================
# 14. SAVE ALL PREDICTIONS TO SUPABASE
# ==========================================

print("\nSaving Decision Tree predictions to Supabase...")

# Create prediction dataset for all shows
all_predictions = df[
    [
        "show_id",
        "movie_title",
        "city",
        "theatre_name",
        "show_date",
        "show_time",
        "seats_sold",
        "popularity_label"
    ]
].copy()

# Predict popularity for all 840 shows
all_predictions["predicted_popularity"] = pipeline.predict(
    df[features]
)

# Get prediction probabilities
all_probabilities = pipeline.predict_proba(
    df[features]
)

# Probability of the predicted class
all_predictions["prediction_probability"] = [
    max(probability) * 100
    for probability in all_probabilities
]

# Convert prediction number to label
all_predictions["predicted_popularity"] = (
    all_predictions["predicted_popularity"]
    .map({
        0: "Not Popular",
        1: "Popular"
    })
)

# Rename actual popularity column
all_predictions = all_predictions.rename(
    columns={
        "popularity_label": "actual_popularity"
    }
)

# Round probability
all_predictions["prediction_probability"] = (
    all_predictions["prediction_probability"]
    .round(2)
)

# Convert dates/times to strings for JSON
all_predictions["show_date"] = (
    all_predictions["show_date"]
    .dt.strftime("%Y-%m-%d")
)

all_predictions["show_time"] = (
    all_predictions["show_time"]
    .astype(str)
)

# Convert NaN/unsupported values safely
records = all_predictions.to_dict(
    orient="records"
)

# ------------------------------------------
# Clear previous predictions
# ------------------------------------------

delete_url = (
    f"{SUPABASE_URL}/rest/v1/"
    "ml_movie_popularity_predictions"
)

delete_response = requests.delete(
    delete_url,
    headers={
        **headers,
        "Prefer": "return=minimal"
    },
    params={
        "id": "not.is.null"
    }
)

if delete_response.status_code not in [200, 204]:
    print("Warning: Could not clear old predictions.")
    print("Status:", delete_response.status_code)
    print("Response:", delete_response.text)

# ------------------------------------------
# Insert new predictions
# ------------------------------------------

insert_response = requests.post(
    delete_url,
    headers={
        **headers,
        "Prefer": "return=minimal"
    },
    json=records
)

if insert_response.status_code not in [200, 201]:
    print("Failed to save predictions.")
    print("Status:", insert_response.status_code)
    print("Response:", insert_response.text)
    raise SystemExit()

print(
    f"Successfully saved "
    f"{len(records)} predictions to Supabase."
)