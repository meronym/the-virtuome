import json
import numpy as np
import argparse
from sklearn.decomposition import PCA
from pathlib import Path
from typing import Dict, List, Tuple

from src.utils.paths import DataPaths

def load_embeddings_from_directory(version: str, provider: str) -> Tuple[List[str], np.ndarray]:
    """
    Load embeddings from all JSON files in the specified provider's directory.
    Returns a tuple of (file_identifiers, embeddings_array)
    """
    file_identifiers = []
    embeddings_list = []
    
    # Get embeddings directory for specific provider
    data_path = DataPaths.embeddings_dir(version, provider)
    
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
    
    if not embeddings_list:
        raise ValueError(f"No embeddings found in {data_path}")
    
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
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Perform PCA dimensionality reduction on embeddings')
    parser.add_argument('--provider', type=str, required=True,
                      choices=['voyage', 'openai', 'cohere'],
                      help='Embedding provider to use')
    parser.add_argument('--version', type=str, default="v1",
                      help='Data version to process')
    parser.add_argument('--components', type=int, default=2,
                      help='Number of PCA components (default: 2)')
    
    args = parser.parse_args()
    
    # 1. Load embeddings
    print(f"Loading embeddings from {args.provider}...")
    identifiers, embeddings = load_embeddings_from_directory(args.version, args.provider)
    print(f"Loaded {len(identifiers)} embeddings")
    
    # 2. Reduce dimensions
    print("\nReducing dimensions...")
    reduced_embeddings = reduce_dimensions(embeddings, args.components)
    
    # 3. Create and save output payload
    print("\nCreating output payload...")
    output_payload = create_output_payload(identifiers, reduced_embeddings)
    
    # Save to provider-specific directory
    output_file = DataPaths.pca_dir(args.version, args.provider) / "pca.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_payload, f, indent=2)
    
    print(f"\nOutput saved to {output_file}")
    print(f"Number of points: {len(output_payload['points'])}")


if __name__ == "__main__":
    main()
