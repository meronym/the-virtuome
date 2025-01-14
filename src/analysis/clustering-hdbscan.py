import argparse
import json
import os
from pathlib import Path
import numpy as np
import hdbscan

def load_points(points_file):
    with open(points_file) as f:
        data = json.load(f)
    points = data["points"]
    
    # Convert to numpy array while preserving point IDs
    point_ids = list(points.keys())
    coords = np.array([[points[pid]["x"], points[pid]["y"]] for pid in point_ids])
    return point_ids, coords

def save_clusters(output_file, point_ids, labels):
    # Convert labels to 0-based index for visualization
    unique_labels = np.unique(labels)
    label_map = {label: idx for idx, label in enumerate(unique_labels) if label != -1}
    label_map[-1] = -1  # Keep noise points as -1
    
    clusters = {
        "points": {
            point_id: {"cluster": int(label_map[label])} 
            for point_id, label in zip(point_ids, labels)
        },
        "metadata": {
            "num_clusters": len(label_map) - 1,  # Exclude noise cluster
            "noise_points": int(np.sum(labels == -1))
        }
    }
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(clusters, f, indent=2)

def main():
    parser = argparse.ArgumentParser(description='Perform HDBSCAN clustering on 2D point data')
    parser.add_argument('points_file', help='Input JSON file containing 2D points')
    parser.add_argument('--min-cluster-size', type=int, default=5,
                      help='Minimum cluster size (default: 5)')
    parser.add_argument('--min-samples', type=int, default=3,
                      help='Min samples for core point (default: 3)')
    args = parser.parse_args()

    # Determine version and provider from input path
    input_path = Path(args.points_file)
    version = input_path.parts[2]  # e.g., 'v2'
    provider = input_path.parts[3]  # e.g., 'voyage'
    projection_file = input_path.name  # e.g., 'umap-n10-d0.0.json'
    projection_base = projection_file.rsplit('.', 1)[0]  # Remove .json

    # Load and cluster points
    point_ids, coords = load_points(args.points_file)
    
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=args.min_cluster_size,
        min_samples=args.min_samples,
        metric='euclidean'
    )
    labels = clusterer.fit_predict(coords)

    # Save results
    output_dir = f"data/processed/{version}/{provider}/{input_path.parent.name}/clusters"
    output_file = f"{output_dir}/hdbscan-{projection_base}.json"
    save_clusters(output_file, point_ids, labels)
    
    print(f"Clustering complete. Found {len(np.unique(labels)) - 1} clusters")
    print(f"Results saved to: {output_file}")

if __name__ == "__main__":
    main() 