from flask import Flask, send_from_directory, jsonify, make_response, send_file, request
from flask_cors import CORS
import os
import argparse
import yaml
import json
import numpy as np
import umap
import hdbscan
from pathlib import Path
from typing import List, Tuple

# Add argument parser
parser = argparse.ArgumentParser(description='Start the Flask server with a specific data version')
parser.add_argument('--version', default='v1', help='Data version to serve (default: v1)')
args = parser.parse_args()

# Get absolute paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(SCRIPT_DIR)))  # Go up 3 levels from server/
STATIC_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'static')
DATA_DIR = os.path.join(PROJECT_ROOT, 'data', 'processed', args.version)
RAW_DATA_DIR = os.path.join(PROJECT_ROOT, 'data', 'raw', args.version, 'flat')


def load_embeddings(version: str, provider: str) -> Tuple[List[str], np.ndarray]:
    """Load embeddings from all JSON files in the specified directory."""
    embeddings_dir = Path(DATA_DIR).parent / version / provider / "embeddings"
    
    file_identifiers = []
    embeddings_list = []
    
    # Get list of JSON files
    json_files = sorted(embeddings_dir.glob('*.json'))
    
    if not json_files:
        raise ValueError(f"No embeddings found for provider '{provider}' in version '{version}'")
    
    # Process all JSON files in the directory
    for json_file in json_files:
        # Extract identifier from filename (removing .json extension)
        identifier = json_file.stem
        
        # Read and parse JSON file
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        embedding = np.array(data)
        
        file_identifiers.append(identifier)
        embeddings_list.append(embedding)
    
    # Convert list of embeddings to numpy array
    embeddings_array = np.array(embeddings_list)
    
    return file_identifiers, embeddings_array


def reduce_dimensions_umap(embeddings: np.ndarray, 
                         n_components: int = 2,
                         n_neighbors: int = 15,
                         min_dist: float = 0.1) -> np.ndarray:
    """Reduce dimensions using UMAP with specified parameters."""
    reducer = umap.UMAP(
        n_components=n_components,
        n_neighbors=n_neighbors,
        min_dist=min_dist,
        random_state=42  # for reproducibility
    )
    
    return reducer.fit_transform(embeddings)


def cluster_points(coords: np.ndarray,
                  min_cluster_size: int = 5,
                  min_samples: int = 3,
                  cluster_selection_method: str = 'leaf',
                  cluster_selection_epsilon: float = 0.0) -> np.ndarray:
    """Cluster points using HDBSCAN with specified parameters."""
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=min_samples,
        cluster_selection_method=cluster_selection_method,
        cluster_selection_epsilon=cluster_selection_epsilon,
        metric='euclidean'
    )
    
    return clusterer.fit_predict(coords)


app = Flask(__name__, static_folder=STATIC_DIR, static_url_path='/static')
CORS(app)

# Serve static files
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# Data endpoint with dataset enumeration
@app.route('/data/datasets')
def list_datasets():
    datasets = {}
    
    # List available providers
    providers = [d for d in os.listdir(DATA_DIR) 
                if os.path.isdir(os.path.join(DATA_DIR, d))]
    
    for provider in providers:
        provider_path = os.path.join(DATA_DIR, provider)
        datasets[provider] = {
            'pca': [f for f in os.listdir(os.path.join(provider_path, 'pca')) 
                   if f.endswith('.json')],
            'umap': [f for f in os.listdir(os.path.join(provider_path, 'umap')) 
                    if f.endswith('.json')]
        }
    return jsonify(datasets)

# Serve data files with proper caching
@app.route('/data/<version>/<provider>/<path:filename>')
def serve_data(version, provider, filename):
    provider_dir = os.path.join(DATA_DIR.replace(args.version, version), provider)
    # Split the filename to handle subdirectories (e.g., pca/pca.json)
    file_parts = filename.split('/')
    
    response = make_response(send_from_directory(
        provider_dir,
        os.path.join(*file_parts)
    ))
    
    # Set cache headers
    response.headers['Cache-Control'] = 'public, max-age=300'  # 5 minutes cache
    return response

# Serve virtue content
@app.route('/data/virtue/<virtue_id>')
def serve_virtue(virtue_id):
    try:
        # Ensure no directory traversal
        if '..' in virtue_id or '/' in virtue_id:
            return jsonify({'error': 'Invalid virtue ID'}), 400
            
        virtue_path = os.path.join(RAW_DATA_DIR, f"{virtue_id}.md")
        if not os.path.exists(virtue_path):
            return jsonify({'error': 'Virtue not found'}), 404
            
        with open(virtue_path, 'r') as f:
            content = f.read()
            
        return jsonify({
            'id': virtue_id,
            'content': content
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve raw data files including tree.json
@app.route('/data/raw/v1/<path:filename>')
def serve_raw_data(filename):
    raw_dir = os.path.join(PROJECT_ROOT, 'data', 'raw', args.version)
    response = make_response(send_from_directory(
        raw_dir,
        filename
    ))
    response.headers['Cache-Control'] = 'public, max-age=300'  # 5 minutes cache
    return response

# Serve cluster data files
@app.route('/data/<version>/<provider>/<projection_type>/clusters/<path:filename>')
def serve_cluster_data(version, provider, projection_type, filename):
    path = os.path.join(PROJECT_ROOT, 'data', 'processed', version, provider, projection_type, 'clusters', filename)
    if os.path.exists(path):
        return send_file(path)
    else:
        return f'Cluster data not found at {path}', 404

# Serve virtue metadata
@app.route('/data/virtue/<virtue_id>/metadata')
def serve_virtue_metadata(virtue_id):
    try:
        # Ensure no directory traversal
        if '..' in virtue_id or '/' in virtue_id:
            return jsonify({'error': 'Invalid virtue ID'}), 400
            
        metadata_path = os.path.join(RAW_DATA_DIR, f"{virtue_id}.meta.yaml")
        if not os.path.exists(metadata_path):
            return jsonify({'error': 'Virtue metadata not found'}), 404
            
        with open(metadata_path, 'r') as f:
            metadata = yaml.safe_load(f)
            
        return jsonify(metadata)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Dynamic clustering endpoint
@app.route('/api/cluster', methods=['POST'])
def generate_clusters():
    try:
        # Get parameters from request
        data = request.get_json()
        provider = data.get('provider')
        
        # UMAP parameters
        u_dim = int(data.get('u_dim', 2))
        u_n = int(data.get('u_n', 10))
        u_d = float(data.get('u_d', 0.1))
        
        # HDBSCAN parameters
        hdbs_min_cluster_size = int(data.get('hdbs_min_cluster_size', 5))
        hdbs_min_samples = int(data.get('hdbs_min_samples', 3))
        hdbs_method = data.get('hdbs_method', 'leaf')
        hdbs_epsilon = float(data.get('hdbs_epsilon', 0.0))
        
        # Validate parameters
        if u_dim < 1 or u_n < 1 or u_d < 0 or \
           hdbs_min_cluster_size < 1 or hdbs_min_samples < 1 or \
           hdbs_epsilon < 0 or hdbs_method not in ['leaf', 'eom']:
            return jsonify({'error': 'Invalid parameter values'}), 400
        
        # Load embeddings
        point_ids, embeddings = load_embeddings(args.version, provider)
        
        # Reduce dimensions with UMAP
        reduced_coords = reduce_dimensions_umap(
            embeddings,
            n_components=u_dim,
            n_neighbors=u_n,
            min_dist=u_d
        )
        
        # Cluster the reduced points
        labels = cluster_points(
            reduced_coords,
            min_cluster_size=hdbs_min_cluster_size,
            min_samples=hdbs_min_samples,
            cluster_selection_method=hdbs_method,
            cluster_selection_epsilon=hdbs_epsilon
        )
        
        # Convert labels to 0-based index for visualization
        unique_labels = np.unique(labels)
        label_map = {label: idx for idx, label in enumerate(unique_labels) if label != -1}
        label_map[-1] = -1  # Keep noise points as -1
        
        # Create response payload
        clusters = {
            'points': {
                point_id: {'cluster': int(label_map[label])} 
                for point_id, label in zip(point_ids, labels)
            },
            'metadata': {
                'num_clusters': len(label_map) - 1,  # Exclude noise cluster
                'noise_points': int(np.sum(labels == -1)),
                'params': {
                    'umap': {
                        'dim': u_dim,
                        'n': u_n,
                        'd': u_d
                    },
                    'hdbscan': {
                        'min_cluster_size': hdbs_min_cluster_size,
                        'min_samples': hdbs_min_samples,
                        'method': hdbs_method,
                        'epsilon': hdbs_epsilon
                    }
                }
            }
        }
        
        return jsonify(clusters)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Generate UMAP projection dynamically
@app.route('/api/generate_umap', methods=['POST'])
def generate_umap():
    try:
        # Get parameters from request
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        provider = data.get('provider')
        if not provider:
            return jsonify({'error': 'Provider parameter is required'}), 400
            
        umap_n = int(data.get('umap_n', 10))
        umap_d = float(data.get('umap_d', 0.1))
        
        # Load embeddings
        identifiers, embeddings = load_embeddings(args.version, provider)
        
        # Generate UMAP
        coords = reduce_dimensions_umap(
            embeddings,
            n_neighbors=umap_n,
            min_dist=umap_d
        )
        
        # Format response
        points = {}
        for idx, identifier in enumerate(identifiers):
            points[identifier] = {
                'x': float(coords[idx, 0]),
                'y': float(coords[idx, 1])
            }
            
        response = {
            'points': points,
            'version': args.version
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Ensure data directories exist
    for dir_path in [DATA_DIR, RAW_DATA_DIR]:
        if not os.path.exists(dir_path):
            print(f"Error: Directory not found at {dir_path}")
            print("Please ensure you have the correct data structure")
            exit(1)
            
    print(f"Using data directory: {DATA_DIR}")
    print(f"Using raw data directory: {RAW_DATA_DIR}")
    app.run(debug=True) 