import requests
import pandas as pd
from mlxtend.preprocessing import TransactionEncoder
from mlxtend.frequent_patterns import apriori, association_rules

# ==============================
# SUPABASE CONFIGURATION
# ==============================

SUPABASE_URL = "https://eyxcyxtqizvboawshvmu.supabase.co"
SUPABASE_KEY = "sb_publishable_IJATqIvYL3Dp6OMSrAXxjw_UWbJf84c"

RPC_URL = f"{SUPABASE_URL}/rest/v1/rpc/get_ml_movie_transactions"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}


# ==============================
# LOAD TRANSACTION DATA
# ==============================

response = requests.post(
    RPC_URL,
    headers=HEADERS,
    json={}
)

if response.status_code != 200:
    print("Error loading data:")
    print(response.text)
    exit()

data = response.json()

df = pd.DataFrame(data)

print("\nTotal transaction records:", len(df))
print(df.head())


# ==============================
# CREATE TRANSACTIONS
# ==============================

transactions = (
    df.groupby("viewer_id")["movie_title"]
    .apply(list)
    .tolist()
)

print("\nNumber of transactions:", len(transactions))

print("\nExample transactions:")

for i, transaction in enumerate(transactions[:3], start=1):
    print(f"Viewer {i}: {transaction}")


# ==============================
# ONE-HOT ENCODING
# ==============================

te = TransactionEncoder()

encoded_array = te.fit(transactions).transform(transactions)

transaction_df = pd.DataFrame(
    encoded_array,
    columns=te.columns_
)

print("\nTransaction matrix shape:")
print(transaction_df.shape)


# ==============================
# APRIORI
# ==============================

frequent_itemsets = apriori(
    transaction_df,
    min_support=0.50,
    max_len=2,
    use_colnames=True
)

frequent_itemsets["item_count"] = (
    frequent_itemsets["itemsets"].apply(len)
)

frequent_itemsets = frequent_itemsets.sort_values(
    by="support",
    ascending=False
)

print("\n================================")
print("FREQUENT ITEMSETS")
print("================================")

print(
    frequent_itemsets[
        ["itemsets", "support"]
    ].to_string(index=False)
)


# ==============================
# ASSOCIATION RULES
# ==============================

rules = association_rules(
    frequent_itemsets,
    metric="lift",
    min_threshold=1.05
)

rules = rules[
    (rules["confidence"] >= 0.75) &
    (rules["support"] >= 0.50) &
    (rules["lift"] > 1.05)
].copy()

rules = rules.sort_values(
    ["lift", "confidence", "support"],
    ascending=False
)

# Keep only useful columns
rules["antecedents"] = rules["antecedents"].apply(
    lambda x: ", ".join(sorted(x))
)

rules["consequents"] = rules["consequents"].apply(
    lambda x: ", ".join(sorted(x))
)

print("\n================================")
print("TOP 10 ASSOCIATION RULES")
print("================================")

print(
    rules[
        ["antecedents", "consequents", "support", "confidence", "lift"]
    ].head(10).to_string(index=False)
)

# Save the filtered rules
rules[
    ["antecedents", "consequents", "support", "confidence", "lift"]
].to_csv(
    "movie_association_rules.csv",
    index=False
)

print("\nResults saved:")
print("frequent_movie_itemsets.csv")
print("movie_association_rules.csv")