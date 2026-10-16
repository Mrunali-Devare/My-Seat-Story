import os
import requests
import pandas as pd
import numpy as np

from dotenv import load_dotenv

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# =========================================================
# 1. LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "SUPABASE_URL or SUPABASE_KEY is missing from ml/.env"
    )


# =========================================================
# 2. FETCH DATA FROM SUPABASE
# =========================================================

function_url = (
    f"{SUPABASE_URL}/rest/v1/rpc/get_ml_show_revenue"
)

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

response = requests.post(
    function_url,
    headers=headers,
    json={}
)

if response.status_code != 200:
    print("Supabase request failed.")
    print("Status:", response.status_code)
    print("Response:", response.text)
    raise SystemExit(1)

data = response.json()

if not data:
    raise ValueError("No data returned from Supabase.")

df = pd.DataFrame(data)

print("\nData loaded successfully.")
print("Number of records:", len(df))

print("\nFirst 5 records:")
print(df.head())


# =========================================================
# 3. PREPARE DATA
# =========================================================

df["show_date"] = pd.to_datetime(df["show_date"])

df["show_time"] = pd.to_timedelta(
    df["show_time"].astype(str)
)

# Extract useful time features
df["day_of_week"] = df["show_date"].dt.dayofweek
df["month"] = df["show_date"].dt.month

df["show_hour"] = (
    df["show_time"].dt.total_seconds() / 3600
)

# Make sure numeric columns are numeric
df["seats_sold"] = pd.to_numeric(df["seats_sold"])
df["revenue"] = pd.to_numeric(df["revenue"])


# =========================================================
# 4. SELECT FEATURES AND TARGET
# =========================================================

features = [
    "seats_sold",
    "movie_title",
    "city",
    "theatre_name",
    "day_of_week",
    "month",
    "show_hour",
]

target = "revenue"

X = df[features]
y = df[target]


# =========================================================
# 5. TRAIN / TEST SPLIT
# =========================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42
)

print("\nTraining records:", len(X_train))
print("Testing records:", len(X_test))


# =========================================================
# 6. PREPROCESSING
# =========================================================

categorical_features = [
    "movie_title",
    "city",
    "theatre_name",
]

numeric_features = [
    "seats_sold",
    "day_of_week",
    "month",
    "show_hour",
]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(
                handle_unknown="ignore"
            ),
            categorical_features,
        ),
        (
            "numeric",
            "passthrough",
            numeric_features,
        ),
    ]
)


# =========================================================
# 7. CREATE LINEAR REGRESSION PIPELINE
# =========================================================

model = Pipeline(
    steps=[
        (
            "preprocessor",
            preprocessor
        ),
        (
            "regressor",
            LinearRegression()
        ),
    ]
)


# =========================================================
# 8. TRAIN MODEL
# =========================================================

print("\nTraining Linear Regression model...")

model.fit(X_train, y_train)

print("Model training completed.")


# =========================================================
# 9. MAKE PREDICTIONS
# =========================================================

y_pred = model.predict(X_test)


# =========================================================
# 10. EVALUATE MODEL
# =========================================================

mae = mean_absolute_error(
    y_test,
    y_pred
)

rmse = np.sqrt(
    mean_squared_error(
        y_test,
        y_pred
    )
)

r2 = r2_score(
    y_test,
    y_pred
)


print("\n======================================")
print("       LINEAR REGRESSION RESULTS")
print("======================================")

print(f"MAE  : {mae:.2f}")
print(f"RMSE : {rmse:.2f}")
print(f"R²   : {r2:.4f}")


# =========================================================
# 11. ACTUAL VS PREDICTED
# =========================================================

results = pd.DataFrame({
    "Actual Revenue": y_test.values,
    "Predicted Revenue": y_pred
})

results["Difference"] = (
    results["Actual Revenue"]
    - results["Predicted Revenue"]
)

print("\nActual vs Predicted Revenue:")
print(results.head(10).to_string(index=False))


# =========================================================
# 12. SAMPLE PREDICTION
# =========================================================

sample = pd.DataFrame({
    "seats_sold": [20],
    "movie_title": ["Inception"],
    "city": ["Mumbai"],
    "theatre_name": ["PVR Phoenix Marketcity"],
    "day_of_week": [5],
    "month": [10],
    "show_hour": [19],
})

predicted_revenue = model.predict(sample)[0]

print("\n======================================")
print("        SAMPLE REVENUE PREDICTION")
print("======================================")

print(
    f"Predicted revenue for the sample show: "
    f"₹{predicted_revenue:.2f}"
)
# =========================================================
# 13. SAVE REGRESSION PREDICTIONS TO SUPABASE
# =========================================================

print("\nSaving regression predictions to Supabase...")

# Create prediction records from the test dataset
prediction_df = X_test.copy()

prediction_df["actual_revenue"] = y_test.values
prediction_df["predicted_revenue"] = y_pred

# Add show_id from the original dataframe
prediction_df["show_id"] = df.loc[
    X_test.index,
    "show_id"
].values

# Add original show information
prediction_df["show_date"] = df.loc[
    X_test.index,
    "show_date"
].dt.date.astype(str).values

prediction_df["show_time"] = df.loc[
    X_test.index,
    "show_time"
].apply(
    lambda x: str(pd.to_timedelta(x))
    .split()[-1]
).values

# Prepare records for Supabase
upload_records = []

for _, row in prediction_df.iterrows():

    upload_records.append({
        "show_id": row["show_id"],
        "movie_title": row["movie_title"],
        "city": row["city"],
        "theatre_name": row["theatre_name"],
        "show_date": row["show_date"],
        "show_time": row["show_time"],
        "seats_sold": int(row["seats_sold"]),
        "actual_revenue": float(row["actual_revenue"]),
        "predicted_revenue": float(row["predicted_revenue"]),
    })


# Supabase REST endpoint
insert_url = (
    f"{SUPABASE_URL}/rest/v1/ml_revenue_predictions"
)

insert_headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


# Delete old predictions first
delete_response = requests.delete(
    f"{insert_url}?id=gt.0",
    headers=insert_headers
)

if delete_response.status_code not in [200, 204]:
    print("\nFailed to clear old predictions.")
    print("Status:", delete_response.status_code)
    print("Response:", delete_response.text)
    raise SystemExit(1)


# Insert new predictions
insert_response = requests.post(
    insert_url,
    headers=insert_headers,
    json=upload_records
)

if insert_response.status_code not in [200, 201]:
    print("\nFailed to save predictions.")
    print("Status:", insert_response.status_code)
    print("Response:", insert_response.text)
    raise SystemExit(1)


print(
    f"\nSuccessfully saved "
    f"{len(upload_records)} regression predictions to Supabase."
)