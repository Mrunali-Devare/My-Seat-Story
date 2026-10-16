import os
import requests
import pandas as pd

from dotenv import load_dotenv
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import silhouette_score

# -----------------------------------------
# 1. Load environment variables
# -----------------------------------------

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL or SUPABASE_KEY is missing in .env")

# -----------------------------------------
# 2. Fetch viewer behavior data
# -----------------------------------------

url = f"{SUPABASE_URL}/rest/v1/rpc/get_ml_viewer_behavior"

headers = {
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json"
}

response = requests.post(
    url,
    headers=headers
)

if response.status_code != 200:
    print("Error fetching data:")
    print(response.text)
    raise SystemExit()

data = response.json()

df = pd.DataFrame(data)

print("Data loaded successfully.")
print(f"Number of viewers: {len(df)}")

print("\nViewer behavior data:")
print(df.to_string(index=False))

# -----------------------------------------
# 3. Select clustering features
# -----------------------------------------

features = [
    "total_bookings",
    "total_tickets",
    "total_spending",
    "average_booking_value"
]

X = df[features].copy()

# -----------------------------------------
# 4. Standardize features
# -----------------------------------------

scaler = StandardScaler()

X_scaled = scaler.fit_transform(X)

# -----------------------------------------
# 5. Test different numbers of clusters
# -----------------------------------------

print("\n======================================")
print(" AGGLOMERATIVE CLUSTER ANALYSIS")
print("======================================")

silhouette_scores = {}

for k in [2, 3, 4]:

    model = AgglomerativeClustering(
        n_clusters=k,
        linkage="ward"
    )

    labels = model.fit_predict(X_scaled)

    score = silhouette_score(
        X_scaled,
        labels
    )

    silhouette_scores[k] = score

    print(
        f"K = {k}  ->  "
        f"Silhouette Score = {score:.4f}"
    )

# -----------------------------------------
# 6. Select best K
# -----------------------------------------

best_k = max(
    silhouette_scores,
    key=silhouette_scores.get
)

best_score = silhouette_scores[best_k]

print("\nSelected number of clusters:", best_k)
print(f"Best silhouette score: {best_score:.4f}")

# -----------------------------------------
# 7. Train final model
# -----------------------------------------

final_model = AgglomerativeClustering(
    n_clusters=best_k,
    linkage="ward"
)

df["cluster"] = final_model.fit_predict(X_scaled)

# -----------------------------------------
# 8. Display cluster results
# -----------------------------------------

print("\n======================================")
print(" HIERARCHICAL CLUSTER RESULTS")
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

# -----------------------------------------
# 9. Cluster summary
# -----------------------------------------

print("\n======================================")
print(" CLUSTER SUMMARY")
print("======================================")

summary = (
    df.groupby("cluster")
    .agg(
        total_bookings=("total_bookings", "mean"),
        total_tickets=("total_tickets", "mean"),
        total_spending=("total_spending", "mean"),
        average_booking_value=("average_booking_value", "mean"),
        viewer_count=("viewer_name", "count")
    )
    .round(2)
)

print(summary)

# -----------------------------------------
# 10. Assign meaningful segment names
# -----------------------------------------

cluster_spending = (
    df.groupby("cluster")["total_spending"]
    .mean()
    .sort_values()
)

segment_names = {}

for rank, cluster_id in enumerate(cluster_spending.index):

    if best_k == 2:

        if rank == 0:
            segment_names[cluster_id] = "Regular Viewers"
        else:
            segment_names[cluster_id] = "High-Value Viewers"

    elif best_k == 3:

        if rank == 0:
            segment_names[cluster_id] = "Low Activity"
        elif rank == 1:
            segment_names[cluster_id] = "Regular Viewers"
        else:
            segment_names[cluster_id] = "High-Value Viewers"

    else:

        if rank == 0:
            segment_names[cluster_id] = "Low Activity"
        elif rank == 1:
            segment_names[cluster_id] = "Regular Viewers"
        elif rank == 2:
            segment_names[cluster_id] = "Active Viewers"
        else:
            segment_names[cluster_id] = "High-Value Viewers"

df["segment"] = df["cluster"].map(segment_names)

# -----------------------------------------
# 11. Display final segments
# -----------------------------------------

print("\n======================================")
print(" VIEWER SEGMENTS")
print("======================================")

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

# -----------------------------------------
# 12. Save results
# -----------------------------------------

output_file = "agglomerative_viewer_segments.csv"

df.to_csv(
    output_file,
    index=False
)

print("\nResults saved to:", output_file)
# ==========================================
# SAVE AGGLOMERATIVE RESULTS TO SUPABASE
# ==========================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

table_url = f"{SUPABASE_URL}/rest/v1/ml_viewer_agglomerative_results"

# Delete previous results
delete_response = requests.delete(
    table_url,
    headers=headers,
    params={"id": "not.is.null"}
)

if delete_response.status_code not in [200, 204]:
    print("Failed to clear old Agglomerative results:")
    print(delete_response.text)
    raise SystemExit(1)

# Prepare results
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

# Insert results
insert_response = requests.post(
    table_url,
    headers=headers,
    json=results
)

if insert_response.status_code not in [200, 201]:
    print("Failed to save Agglomerative results:")
    print(insert_response.text)
    raise SystemExit(1)

print(
    f"Successfully saved {len(results)} "
    "Agglomerative viewer results to Supabase."
)