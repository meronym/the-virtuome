import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
import umap
from tqdm import tqdm
import itertools
import warnings

from src.utils.paths import DataPaths

# Suppress specific warnings
warnings.filterwarnings('ignore', category=FutureWarning, module='sklearn.utils.deprecation')
warnings.filterwarnings('ignore', category=UserWarning, module='umap.umap_')


def load_embeddings_from_directory(version: str) -> Tuple[List[str], np.ndarray]:
    """
    Load embeddings from all JSON files in the specified directory.
    Returns a tuple of (file_identifiers, embeddings_array)
    """
    file_identifiers = []
    embeddings_list = []
    
    # Get embeddings directory
    data_path = DataPaths.embeddings_dir(version)
    
    # Get list of JSON files and create progress bar
    json_files = list(sorted(data_path.glob('*.json')))
    
    # Process all JSON files in the directory with progress bar
    for json_file in tqdm(json_files, desc="Loading embeddings", unit="file"):
        try:
            # Extract identifier from filename (removing .json extension)
            identifier = json_file.stem
            
            # Read and parse JSON file
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            embedding = np.array(data)
            
            file_identifiers.append(identifier)
            embeddings_list.append(embedding)
            
        except Exception as e:
            print(f"Error processing {json_file}: {str(e)}")
    
    # Convert list of embeddings to numpy array
    embeddings_array = np.array(embeddings_list)
    
    return file_identifiers, embeddings_array


def reduce_dimensions_umap(embeddings: np.ndarray, 
                         n_components: int = 2, 
                         n_neighbors: int = 15, 
                         min_dist: float = 0.1) -> np.ndarray:
    """
    Reduce dimensions using UMAP
    
    Parameters:
    - n_neighbors: trade-off between local and global structure (higher = more global)
    - min_dist: minimum distance between points in the embedding (lower = tighter clusters)
    """
    reducer = umap.UMAP(
        n_components=n_components,
        n_neighbors=n_neighbors,
        min_dist=min_dist,
        random_state=42  # for reproducibility
    )
    
    reduced_embeddings = reducer.fit_transform(embeddings)
    return reduced_embeddings


def create_output_payload(identifiers: List[str], coordinates: np.ndarray) -> Dict:
    """
    Create a dictionary mapping file identifiers to their 2D coordinates
    """
    payload = {
        "points": {
            identifier: {
                "x": float(coord[0]),  # Convert numpy float to Python float
                "y": float(coord[1])
            }
            for identifier, coord in zip(identifiers, coordinates)
        }
    }
    return payload


def main():
    VERSION = "v1"  # Could be made configurable via command line arguments
    
    # Parameter grid for UMAP
    n_neighbors_options = [15, 30, 50]  # higher values (30-100) for more global structure
    min_dist_options = [0.0, 0.1, 0.3]  # lower values (0.0-0.1) for tighter clusters
    
    # Calculate total number of combinations
    total_combinations = len(n_neighbors_options) * len(min_dist_options)
    
    # 1. Load embeddings (do this once)
    print("Starting embedding loading process...")
    identifiers, embeddings = load_embeddings_from_directory(VERSION)
    print(f"Successfully loaded {len(identifiers)} embeddings")
    
    # 2. Experiment with different parameter combinations
    print(f"\nStarting UMAP experiments with {total_combinations} parameter combinations...")
    
    # Create output directory
    output_dir = DataPaths.processed_dir(VERSION) / "umap"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Create progress bar for parameter combinations
    param_combinations = list(itertools.product(n_neighbors_options, min_dist_options))
    for n_neighbors, min_dist in tqdm(param_combinations, desc="Processing parameter combinations", unit="combination"):
        # Generate output filename based on parameters
        output_file = output_dir / f"umap-n{n_neighbors}-d{min_dist}.json"
        
        # Reduce dimensions with UMAP using current parameters
        reduced_embeddings = reduce_dimensions_umap(
            embeddings,
            n_neighbors=n_neighbors,
            min_dist=min_dist
        )
        
        # Create and save output payload
        output_payload = create_output_payload(identifiers, reduced_embeddings)
        
        # Save to file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_payload, f, indent=2)
        
        tqdm.write(f"Saved projection with n_neighbors={n_neighbors}, min_dist={min_dist}")
    
    # Also save a default UMAP projection
    default_output = output_dir / "umap.json"
    if not default_output.exists():
        reduced_embeddings = reduce_dimensions_umap(embeddings)
        output_payload = create_output_payload(identifiers, reduced_embeddings)
        with open(default_output, 'w', encoding='utf-8') as f:
            json.dump(output_payload, f, indent=2)
        print("\nSaved default UMAP projection")
    
    print("\nAll UMAP experiments completed successfully!")


if __name__ == "__main__":
    main()
