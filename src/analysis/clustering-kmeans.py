#!/usr/bin/env python3

import json
import sys
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from typing import Dict, List, Tuple
import argparse
from pathlib import Path

from src.utils.paths import DataPaths


def load_visualization_data(file_path: Path) -> Tuple[List[str], np.ndarray]:
    """
    Load the visualization data and convert it to a format suitable for clustering
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Extract points data
    points_data = data['points']
    
    # Convert to lists maintaining order
    identifiers = []
    coordinates = []
    
    for identifier, point in sorted(points_data.items()):
        identifiers.append(identifier)
        coordinates.append([point['x'], point['y']])
    
    return identifiers, np.array(coordinates)


def find_optimal_clusters(coordinates: np.ndarray, max_clusters: int = 10) -> Dict:
    """
    Find optimal number of clusters using silhouette score
    Returns scores for different numbers of clusters
    """
    scores = {}
    
    # We start from 2 clusters as 1 cluster doesn't have a silhouette score
    for n_clusters in range(2, min(max_clusters + 1, len(coordinates))):
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        cluster_labels = kmeans.fit_predict(coordinates)
        
        silhouette_avg = silhouette_score(coordinates, cluster_labels)
        scores[n_clusters] = silhouette_avg
        
        print(f"Silhouette score for {n_clusters} clusters: {silhouette_avg:.3f}")
    
    return scores


def perform_clustering(coordinates: np.ndarray, n_clusters: int) -> np.ndarray:
    """
    Perform K-means clustering with the specified number of clusters
    """
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    return kmeans.fit_predict(coordinates)


def group_by_clusters(identifiers: List[str], cluster_labels: np.ndarray) -> List[List[str]]:
    """
    Group identifiers by their cluster assignments
    """
    # Initialize empty lists for each cluster
    clusters = [[] for _ in range(max(cluster_labels) + 1)]
    
    # Group identifiers by cluster
    for identifier, cluster_label in zip(identifiers, cluster_labels):
        clusters[cluster_label].append(identifier)
    
    return clusters


def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Perform K-means clustering on 2D visualization data')
    parser.add_argument('version', help='Version string (e.g., v1)')
    parser.add_argument('provider', help='Provider name (e.g., voyage, openai)')
    parser.add_argument('input_name', help='Input filename (e.g., pca.json or umap.json)')
    parser.add_argument('--max-clusters', type=int, default=10, 
                        help='Maximum number of clusters to try (default: 10)')
    parser.add_argument('--clusters', type=int, 
                        help='Specify number of clusters (skips optimization)')
    args = parser.parse_args()

    # Determine input file path based on filename
    if args.input_name.startswith('pca'):
        input_path = DataPaths.pca_dir(args.version, args.provider) / args.input_name
    elif args.input_name.startswith('umap'):
        input_path = DataPaths.umap_dir(args.version, args.provider) / args.input_name
    else:
        print(f"Error: Input filename must start with 'pca' or 'umap'")
        sys.exit(1)

    # Validate input file
    if not input_path.exists():
        print(f"Error: Input file {input_path} does not exist")
        sys.exit(1)

    # Load data
    print(f"\nLoading data from {input_path}")
    identifiers, coordinates = load_visualization_data(input_path)
    print(f"Loaded {len(identifiers)} points")

    # Determine number of clusters
    n_clusters = args.clusters
    if n_clusters is None:
        print("\nFinding optimal number of clusters...")
        scores = find_optimal_clusters(coordinates, args.max_clusters)
        # Select number of clusters with highest silhouette score
        n_clusters = max(scores.items(), key=lambda x: x[1])[0]
        print(f"\nOptimal number of clusters: {n_clusters}")
    
    # Perform clustering
    print(f"\nPerforming clustering with {n_clusters} clusters...")
    cluster_labels = perform_clustering(coordinates, n_clusters)
    
    # Group results
    clusters = group_by_clusters(identifiers, cluster_labels)
    
    # Print results
    print("\nClustering Results:")
    for i, cluster in enumerate(clusters):
        print(f"\nCluster {i} ({len(cluster)} items):")
        for identifier in sorted(cluster):
            print(f"  {identifier}")

    # Save results to file
    output_dir = input_path.parent / "clusters"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"{input_path.stem}.k-{n_clusters}.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "n_clusters": n_clusters,
            "clusters": clusters
        }, f, indent=2)
    
    print(f"\nResults saved to {output_file}")


if __name__ == "__main__":
    main()
