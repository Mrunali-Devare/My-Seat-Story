import os
import requests
import pandas as pd

from dotenv import load_dotenv

from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


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
# 2. LOAD VIEWER DATA
# ==========================================

url = (
    f"{SUPABASE_URL}"
    "/rest/v1/rpc/get_ml_viewer_behavior"
)

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
print("Number of viewers:", len(df))

print("\nViewer behavior data:")
print(df.to_string(index=False))


# ==========================================
# 3. SELECT FEATURES
# ==========================================

features = [
    "total_bookings",
    "total_tickets",
    "total_spending",
    "average_booking_value"
]

X = df[features].copy()


# ==========================================
# 4. SCALE THE DATA
# ==========================================

scaler = StandardScaler()

X_scaled = scaler.fit_transform(X)


# ==========================================
# 5. FIND BEST K USING SILHOUETTE SCORE
# ==========================================

print("\n======================================")
print("       K-MEANS CLUSTER ANALYSIS")
print("======================================")

print("\nSilhouette scores:")

best_k = None
best_score = -1

for k in range(2, 5):

    kmeans_test = KMeans(
        n_clusters=k,
        random_state=42,
        n_init=10
    )

    labels = kmeans_test.fit_predict(X_scaled)

    score = silhouette_score(
        X_scaled,
        labels
    )

    print(
        f"K = {k}  ->  "
        f"Silhouette Score = {score:.4f}"
    )

    if score > best_score:
        best_score = score
        best_k = k


print("\nSelected number of clusters:", best_k)
print("Best silhouette score:", round(best_score, 4))


# ==========================================
# 6. TRAIN FINAL K-MEANS MODEL
# ==========================================

kmeans = KMeans(
    n_clusters=best_k,
    random_state=42,
    n_init=10
)

df["cluster"] = kmeans.fit_predict(
    X_scaled
)


# ==========================================
# 7. DISPLAY CLUSTER RESULTS
# ==========================================

print("\n======================================")
print("       VIEWER CLUSTER RESULTS")
print("======================================")

result_columns = [
    "viewer_name",
    "city",
    "total_bookings",
    "total_tickets",
    "total_spending",
    "average_booking_value",
    "cluster"
]

print(
    df[result_columns]
    .sort_values("cluster")
    .to_string(index=False)
)


# ==========================================
# 8. CLUSTER SUMMARY
# ==========================================

print("\n======================================")
print("       CLUSTER SUMMARY")
print("======================================")

cluster_summary = (
    df.groupby("cluster")[features]
    .mean()
    .round(2)
)

cluster_counts = (
    df["cluster"]
    .value_counts()
    .sort_index()
)

cluster_summary["viewer_count"] = cluster_counts

print(
    cluster_summary.to_string()
)


# ==========================================
# 9. AUTOMATIC CLUSTER LABELS
# ==========================================

print("\n======================================")
print("       VIEWER SEGMENTS")
print("======================================")


# Rank clusters according to average spending
spending_rank = cluster_summary["total_spending"].rank(method="first")

segment_names = {}

for cluster in cluster_summary.index:
    rank = spending_rank[cluster]

    if rank == 1:
        segment_names[cluster] = "Regular Viewers"
    elif rank == len(cluster_summary):
        segment_names[cluster] = "High-Value Viewer"
    else:
        segment_names[cluster] = "Medium Activity"

df["segment"] = df["cluster"].map(
    segment_names
)


print(
    df[
        [
            "viewer_name",
            "city",
            "total_bookings",
            "total_tickets",
            "total_spending",
            "cluster",
            "segment"
        ]
    ]
    .sort_values("cluster")
    .to_string(index=False)
)


# ==========================================
# 10. SAVE RESULTS
# ==========================================

output_file = "viewer_segments.csv"

df[
    [
        "viewer_id",
        "viewer_name",
        "city",
        "total_bookings",
        "total_tickets",
        "total_spending",
        "average_booking_value",
        "cluster",
        "segment"
    ]
].to_csv(
    output_file,
    index=False
)

print("\nResults saved to:", output_file)
# ==========================================
# SAVE K-MEANS RESULTS TO SUPABASE
# ==========================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Delete previous K-Means results
delete_url = f"{SUPABASE_URL}/rest/v1/ml_viewer_kmeans_results"

delete_response = requests.delete(
    delete_url,
    headers=headers,
    params={"id": "not.is.null"}
)

if delete_response.status_code not in [200, 204]:
    print("Failed to clear old K-Means results:")
    print(delete_response.text)
    raise SystemExit(1)

# Prepare new results
results = []

for _, row in df.iterrows():
    results.append({
        "viewer_id": row["viewer_id"],
        "viewer_name": row["viewer_name"],
        "city": row["city"],
        "total_bookings": int(row["total_bookings"]),
        "total_tickets": int(row["total_tickets"]),
        "total_spending": float(row["total_spending"]),
        "average_booking_value": float(row["average_booking_value"]),
        "cluster": int(row["cluster"]),
        "segment": row["segment"],
        "silhouette_score": float(best_score)
    })

# Insert results into Supabase
insert_response = requests.post(
    delete_url,
    headers=headers,
    json=results
)

if insert_response.status_code not in [200, 201]:
    print("Failed to save K-Means results:")
    print(insert_response.text)
    raise SystemExit(1)

print(f"Successfully saved {len(results)} K-Means viewer results to Supabase.")