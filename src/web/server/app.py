from flask import Flask, send_from_directory, jsonify, make_response, send_file
from flask_cors import CORS
import os
import argparse

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