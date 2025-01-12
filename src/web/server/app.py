from flask import Flask, send_from_directory, jsonify, make_response
from flask_cors import CORS
import os

# Get absolute paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(SCRIPT_DIR)))  # Go up 3 levels from server/
STATIC_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'static')
DATA_DIR = os.path.join(PROJECT_ROOT, 'data', 'processed', 'v1')

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
@app.route('/data/<provider>/<path:filename>')
def serve_data(provider, filename):
    provider_dir = os.path.join(DATA_DIR, provider)
    # Split the filename to handle subdirectories (e.g., pca/pca.json)
    file_parts = filename.split('/')
    
    response = make_response(send_from_directory(
        provider_dir,
        os.path.join(*file_parts)
    ))
    
    # Set cache headers
    response.headers['Cache-Control'] = 'public, max-age=300'  # 5 minutes cache
    return response

if __name__ == '__main__':
    # Ensure data directory exists
    if not os.path.exists(DATA_DIR):
        print(f"Error: Data directory not found at {DATA_DIR}")
        print("Please ensure you have the correct data structure:")
        print("  data/")
        print("  └── processed/")
        print("      └── v1/")
        print("          ├── voyage/")
        print("          ├── openai/")
        print("          └── cohere/")
        exit(1)
        
    print(f"Using data directory: {DATA_DIR}")
    app.run(debug=True) 