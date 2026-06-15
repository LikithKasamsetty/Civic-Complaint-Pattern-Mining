"""
This file contains bug fixes and hardcoded configurations extracted from the main pipeline.
"""

# BUG FIX 1: categories defined only once (was defined twice — second one overwrote first)
CATEGORIES = ["Roads", "Water Supply", "Garbage", "Electricity", "Drainage"]

# Island Centers (Left, Middle, Right)
ISLAND_CENTERS = {
    "Electricity":  {"x": -12.0, "y": 0.0}, # Left Island
    "Drainage":     {"x": -12.0, "y": 0.0}, # Left Island
    "Garbage":      {"x": 0.0,   "y": 0.0}, # Middle Island
    "Roads":        {"x": 12.0,  "y": 0.0}, # Right Island
    "Water Supply": {"x": 12.0,  "y": 0.0}  # Right Island
}

# Sub-offset for categories within the same island to prevent exact overlap
SUB_OFFSETS = {
    "Electricity":  {"ox": -1.0, "oy": 0.5},
    "Drainage":     {"ox": 1.0,  "oy": -0.5},
    "Garbage":      {"ox": 0.0,  "oy": 0.0},
    "Roads":        {"ox": -1.0, "oy": 0.5},
    "Water Supply": {"ox": 1.0,  "oy": -0.5}
}

# Wide Gaussian spread (std=2.2) for the 'Elaborated Cloud' look from the screenshot
GAUSSIAN_SPREAD_STD = 2.2

import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

def generate_synthetic(n=1000):
    random.seed(42)
    np.random.seed(42)

    categories = CATEGORIES

    areas = ["Ward 1","Ward 2","Ward 3","Sector 5","Sector 12",
             "Sector 7","Old City","New Colony","Gandhi Nagar","Model Town"]

    templates = {
        "Roads":        ["Potholes on main road","Road broken near school",
                         "No street lights","Road flooded after rain",
                         "Speed breaker needed","Divider damaged on road",
                         "Road cave-in near market","Footpath blocked by vendors"],
        "Water Supply": ["No water since 3 days","Dirty water from tap",
                         "Low water pressure","Water pipe leakage on street",
                         "Water tanker not arriving","Borewell pump not working",
                         "Contaminated water supply","Water meter reading incorrect"],
        "Garbage":      ["Garbage not collected for a week","Dustbin overflowing",
                         "Burning garbage near park","No dustbin in area",
                         "Dead animals not removed","Garbage truck missing",
                         "Waste dumped near school","Stray animals spreading garbage"],
        "Electricity":  ["Power cut for 6 hours","Sparking wire on pole",
                         "Street light not working","Voltage fluctuation",
                         "Transformer burnt in colony","Electricity meter wrong",
                         "Exposed live wire near playground","No electricity in block"],
        "Drainage":     ["Blocked drain causing flooding","Sewage overflow on road",
                         "Foul smell from open drain","Open manhole danger",
                         "Drainage pipe broken","Waterlogging after rain",
                         "Drain not cleaned for months","Sewage mixing with water"],
    }

    statuses = ["Pending","In Progress","Resolved"]

    island_centers = ISLAND_CENTERS

    start = datetime.now() - timedelta(days=365)
    records = []
    for i in range(n):
        cat = random.choice(categories)
        area = random.choice(areas)

        sub_offsets = SUB_OFFSETS
        
        center = island_centers[cat]
        offset = sub_offsets[cat]
        
        px = np.random.normal(center["x"] + offset["ox"], GAUSSIAN_SPREAD_STD)
        py = np.random.normal(center["y"] + offset["oy"], GAUSSIAN_SPREAD_STD)
        
        records.append({
            "complaint_id":  f"CMP{i+1:04d}",
            "text":          random.choice(templates[cat]) + " in " + area,
            "category":      cat,
            "area":          area,
            "date":          str(start + timedelta(days=random.randint(0, 365))),
            "report_count":  random.randint(1, 20),
            "urgency_score": round(random.uniform(1, 10), 1),
            "status":        random.choices(statuses, [0.6, 0.25, 0.15])[0],
            "viz_x":         px,
            "viz_y":         py
        })
    return pd.DataFrame(records)

from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder

def load_dataset(csv_path, log):
    import os
    if csv_path and os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        log(f"✓ Loaded CSV file: {os.path.basename(csv_path)}")
        if "report_count"  not in df.columns: df["report_count"]  = 1
        if "urgency_score" not in df.columns: df["urgency_score"] = np.random.uniform(1, 10, len(df)).round(1)
        if "text"          not in df.columns: df["text"]          = df.iloc[:, 0].astype(str)
        if "category"      not in df.columns: df["category"]      = "Unknown"
        if "area"          not in df.columns: df["area"]          = "Unknown"
        if "status"        not in df.columns: df["status"]        = "Pending"
    else:
        log("⚡ No CSV found — Generating 1000 synthetic complaints...")
        df = generate_synthetic(1000)
        log("✓ Synthetic dataset generated!")
    return df

def apply_3_island_structure(df):
    if "viz_x" not in df.columns or "viz_y" not in df.columns:
        island_centers = ISLAND_CENTERS
        sub_offsets = SUB_OFFSETS
        
        np.random.seed(42)
        vx, vy = [], []
        for cat in df["category"]:
            c = island_centers.get(cat, {"x": 0.0, "y": 15.0})
            o = sub_offsets.get(cat, {"ox": 0.0, "oy": 0.0})
            vx.append(np.random.normal(c["x"] + o["ox"], GAUSSIAN_SPREAD_STD))
            vy.append(np.random.normal(c["y"] + o["oy"], GAUSSIAN_SPREAD_STD))
        df["viz_x"] = vx
        df["viz_y"] = vy
    return df

def extract_association_rules(df, log):
    top_rules = []
    try:
        basket = df.groupby("area")["category"].apply(list).reset_index()
        te      = TransactionEncoder()
        te_arr  = te.fit(basket["category"].tolist()).transform(basket["category"].tolist())
        df_enc  = pd.DataFrame(te_arr, columns=te.columns_)
        freq    = apriori(df_enc, min_support=0.3, use_colnames=True)
        rules   = association_rules(freq, metric="confidence", min_threshold=0.5)
        rules   = rules.sort_values("lift", ascending=False)
        log(f"✓ Found {len(rules)} association rules")
        for _, r in rules.head(5).iterrows():
            rule = {
                "antecedents": list(r["antecedents"]),
                "consequents": list(r["consequents"]),
                "support":     round(float(r["support"]),    3),
                "confidence":  round(float(r["confidence"]), 3),
                "lift":        round(float(r["lift"]),        3)
            }
            top_rules.append(rule)
            log(f"  {rule['antecedents']} → {rule['consequents']}  conf={rule['confidence']}  lift={rule['lift']}")
    except Exception as e:
        log(f"⚠ Association rules skipped: {e}")
    return top_rules

