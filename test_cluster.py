import sys
try:
    from graphify.cluster import cluster
    print("Cluster imported successfully")
except Exception as e:
    print(f"Error: {e}")
