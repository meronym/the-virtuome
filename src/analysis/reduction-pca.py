import json
import numpy as np
from sklearn.decomposition import PCA
from pathlib import Path
from typing import Dict, List, Tuple

from src.utils.paths import DataPaths

def load_embeddings_from_directory(version: str) -> Tuple[List[str], np.ndarray]:
    """
    Load embeddings from all JSON files in the specified directory.
    Returns a tuple of (file_identifiers, embeddings_array)
    """
    file_identifiers = []
    embeddings_list = []
    
    # Get embeddings directory
    data_path = DataPaths.embeddings_dir(version)
    
    # Process all JSON files in the directory
    for json_file in sorted(data_path.glob('*.json')):
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


def reduce_dimensions(embeddings: np.ndarray, n_components: int = 2) -> np.ndarray:
    """
    Reduce dimensions using PCA
    """
    pca = PCA(n_components=n_components)
    reduced_embeddings = pca.fit_transform(embeddings)
    
    # Print explained variance ratio to understand how much information is retained
    print("Explained variance ratio:", pca.explained_variance_ratio_)
    print("Total explained variance:", sum(pca.explained_variance_ratio_))
    
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
    
    # 1. Load embeddings
    print("Loading embeddings...")
    identifiers, embeddings = load_embeddings_from_directory(VERSION)
    print(f"Loaded {len(identifiers)} embeddings")
    
    # 2. Reduce dimensions
    print("\nReducing dimensions...")
    reduced_embeddings = reduce_dimensions(embeddings)
    
    # 3. Create and save output payload
    print("\nCreating output payload...")
    output_payload = create_output_payload(identifiers, reduced_embeddings)
    
    # Save to file
    output_file = DataPaths.processed_dir(VERSION) / "pca" / "pca.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_payload, f, indent=2)
    
    print(f"\nOutput saved to {output_file}")
    print(f"Number of points: {len(output_payload['points'])}")


if __name__ == "__main__":
    main()
