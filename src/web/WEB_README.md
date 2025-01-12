# Project Context for Web Visualization Implementation

## Project Overview
The Human Virtuome Project analyzes virtues across philosophical traditions using AI generation and data analysis. The web visualization component displays the results of dimensionality reduction algorithms (PCA and UMAP) applied to virtue embeddings from multiple providers (Voyage AI, OpenAI, and Cohere).

## Data Locations and Formats

### Input Data Directory Structure
```
data/processed/v1/
├── voyage/                   # Voyage AI embeddings & analysis
│   ├── embeddings/
│   ├── pca/
│   │   └── clusters/
│   └── umap/
│       ├── umap.json        # Default UMAP projection
│       ├── umap-n15-d0.0.json
│       └── clusters/
├── openai/                   # OpenAI embeddings & analysis
│   ├── embeddings/
│   ├── pca/
│   │   └── clusters/
│   └── umap/
│       └── clusters/
└── cohere/                   # Cohere embeddings & analysis
    ├── embeddings/
    ├── pca/
    │   └── clusters/
    └── umap/
        └── clusters/
```

### Data Format (PCA and UMAP files)
```json
{
  "points": {
    "wisdom-stoic": {          // identifier is the virtue slug
      "x": 0.123,              // x-coordinate in 2D space
      "y": 0.456               // y-coordinate in 2D space
    },
    "compassion-buddhist": {
      "x": -0.789,
      "y": 0.321
    },
    // ... approximately 1000 points total
  }
}
```

### Point Identifier Format
- All lowercase, hyphen-separated
- Unique across dataset

## Visualization Requirements

### Core Functionality
1. Display all points (~1000) on a 2D canvas
2. Pan and zoom navigation
3. Point selection shows identifier
4. Switch between:
   - Embedding providers (Voyage, OpenAI, Cohere)
   - Projection methods (PCA, UMAP)
   - Parameter variations (for UMAP)
   - Clustering results (optional)

### User Interface
1. Canvas takes majority of screen space
2. Simple controls for dataset selection
3. Area for displaying selected point information
4. Optional: zoom level indicator

### Technical Constraints
1. Support modern browsers (Chrome, Firefox, Safari)
2. Responsive design (desktop first)
3. Handle touch events for mobile
4. Maintain 60fps during interaction

### Performance Considerations
1. Dataset size: ~1000 points
2. JSON file sizes: ~100KB each
3. Point radius: 3-5 pixels
4. Viewport dimensions: variable

## Development Environment
- Python 3.8+ for development server
- Modern browser with ES6+ support
- No build tools required
- Local data access through Flask server

## Deployment Target
- Static file hosting (Vercel/Netlify/GitHub Pages)
- No server-side requirements
- All data bundled with application


# Visualization Implementation Plan

## Directory Structure

```
src/web/
├── server/
│   ├── __init__.py
│   └── app.py                  # Flask development server
├── static/
│   ├── css/
│   │   └── style.css          # Core styles
│   ├── js/
│   │   ├── core/              # Core functionality
│   │   │   ├── canvas.js      # Canvas and rendering
│   │   │   ├── transform.js   # Viewport transformations
│   │   │   └── events.js      # Event handling
│   │   ├── data/              # Data management
│   │   │   ├── loader.js      # Data loading and caching
│   │   │   └── state.js       # Application state
│   │   ├── ui/                # UI components
│   │   │   ├── controls.js    # Dataset controls
│   │   │   └── details.js     # Point details panel
│   │   ├── utils/             # Utilities
│   │   │   ├── spatial.js     # Spatial indexing
│   │   │   ├── scale.js       # Coordinate scaling
│   │   │   └── debug.js       # Development utilities
│   │   └── main.js            # Application entry
│   └── index.html             # Single page application
└── data/                      # Symlink to processed data
```

## Implementation Details

### 1. Development Server
`server/app.py`: Flask server with development utilities

```python
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='../static')
CORS(app)

# Serve static files
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# Data endpoint with dataset enumeration
@app.route('/data/datasets')
def list_datasets():
    base_path = '../data/processed/v1'
    datasets = {}
    
    # List available providers
    providers = [d for d in os.listdir(base_path) 
                if os.path.isdir(os.path.join(base_path, d))]
    
    for provider in providers:
        provider_path = os.path.join(base_path, provider)
        datasets[provider] = {
            'pca': [f for f in os.listdir(f'{provider_path}/pca') 
                   if f.endswith('.json')],
            'umap': [f for f in os.listdir(f'{provider_path}/umap') 
                    if f.endswith('.json')]
        }
    return jsonify(datasets)

# Serve data files with proper caching
@app.route('/data/<provider>/<path:filename>')
def serve_data(provider, filename):
    return send_from_directory(
        f'../data/processed/v1/{provider}', 
        filename,
        cache_timeout=300
    )

if __name__ == '__main__':
    app.run(debug=True)
```

### 2. Core Application Structure

`static/index.html`: Application shell with responsive layout

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Virtuome Visualization</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div id="app">
        <header id="controls">
            <select id="provider">
                <option value="voyage">Voyage AI</option>
                <option value="openai">OpenAI</option>
                <option value="cohere">Cohere</option>
            </select>
            <select id="projection">
                <option value="pca">PCA</option>
                <option value="umap">UMAP</option>
            </select>
            <select id="variant" disabled></select>
            <div id="zoom-info"></div>
        </header>
        
        <main>
            <canvas id="visualization"></canvas>
            <aside id="details" class="hidden">
                <div class="content"></div>
                <button class="close">&times;</button>
            </aside>
        </main>
    </div>
    <script type="module" src="/js/main.js"></script>
</body>
</html>
```

`static/css/style.css`: Core styles with responsive layout

```css
:root {
    --header-height: 50px;
    --details-width: 300px;
    --bg-color: #ffffff;
    --text-color: #333333;
    --point-color: #2196f3;
    --point-hover: #ff4081;
}

/* Layout */
#app {
    height: 100vh;
    display: flex;
    flex-direction: column;
}

header {
    height: var(--header-height);
    padding: 0 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    background: #f5f5f5;
}

main {
    flex: 1;
    position: relative;
    overflow: hidden;
}

#visualization {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

#details {
    position: absolute;
    right: 0;
    top: 0;
    width: var(--details-width);
    height: 100%;
    background: white;
    box-shadow: -2px 0 5px rgba(0,0,0,0.1);
    transform: translateX(100%);
    transition: transform 0.3s ease;
}

#details.visible {
    transform: translateX(0);
}

/* Responsive */
@media (max-width: 768px) {
    :root {
        --details-width: 100%;
    }
    
    #details {
        height: 50%;
        top: 50%;
        width: 100%;
        transform: translateY(100%);
    }
    
    #details.visible {
        transform: translateY(0);
    }
}
```

### 3. Core Modules

`js/core/transform.js`: Viewport transformation management

```javascript
export class ViewportTransform {
    constructor() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.matrix = new DOMMatrix();
    }
    
    update(scale, offsetX, offsetY) {
        this.scale = scale;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.matrix = new DOMMatrix()
            .translate(this.offsetX, this.offsetY)
            .scale(this.scale);
    }
    
    // Convert data coordinates to screen coordinates
    toScreen(x, y) {
        const point = new DOMPoint(x, y).matrixTransform(this.matrix);
        return [point.x, point.y];
    }
    
    // Convert screen coordinates to data coordinates
    toData(x, y) {
        const inverse = this.matrix.inverse();
        const point = new DOMPoint(x, y).matrixTransform(inverse);
        return [point.x, point.y];
    }
}
```

`js/data/state.js`: Application state management

```javascript
export class AppState {
    constructor() {
        this.datasets = null;
        this.currentData = null;
        this.selectedPoint = null;
        this.transform = new ViewportTransform();
        this.listeners = new Map();
    }
    
    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }
    
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
    }
}
```

[Additional implementation details for other modules would follow...]

## Development Workflow

1. **Initial Setup**

The web visualization needs access to the processed data files. Given the project structure:

```
project_root/
├── data/
│   └── processed/
│       └── v1/
│           ├── voyage/
│           ├── openai/
│           └── cohere/
│               ├── embeddings/
│               ├── pca/
│               └── umap/
│                   ├── umap.json
│                   └── ...
└── src/
    └── web/
        ├── server/
        ├── static/
        └── data/  # We'll create this symlink
```

Create the symlink from the web directory to the processed data:

```bash
# From project root
cd src/web
ln -s ../../data/processed data

# Verify the symlink works
ls -l data/v1/voyage/pca/pca.json  # Should show the PCA file
```

For Windows systems:
```cmd
# From project root, as administrator
cd src\web
mklink /D data ..\..\data\processed
```

The Flask server is configured to serve files from this symlinked directory via the `/data` route:
```python
@app.route('/data/<provider>/<path:filename>')
def serve_data(provider, filename):
    return send_from_directory(
        f'../data/processed/v1/{provider}',  # Note: relative to server.py location
        filename,
        cache_timeout=300
    )
```

2. **Development Process**
- Use browser dev tools for canvas debugging
- Monitor performance with Chrome DevTools
- Test with different datasets
- Verify mobile responsiveness

3. **Testing Checklist**
- [ ] Data loading and caching
- [ ] Pan/zoom functionality
- [ ] Point selection
- [ ] Dataset switching
- [ ] Mobile interaction
- [ ] Performance metrics

## Deployment

1. **Preparation**
- Verify all paths are relative
- Test with production data
- Check browser compatibility

2. **Vercel Configuration**
Create `vercel.json`:

```json
{
  "version": 2,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/data/(.*)", "dest": "/data/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "headers": [
    {
      "source": "/data/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    }
  ]
}
```

## Performance Optimizations

1. **Rendering**
- Use `requestAnimationFrame` for smooth updates
- Implement point culling outside viewport
- Buffer visible points for quick redraws

2. **Data Management**
- Cache loaded datasets
- Implement spatial indexing for hit detection
- Throttle pan/zoom updates

3. **Memory Management**
- Clear unused datasets
- Reuse canvas buffers
- Minimize object creation during animation

## Future Enhancements

1. **Visualization Features**
- Color coding by tradition
- Cluster visualization
- Search/filter functionality
- Provider comparison view
- Embedding space analysis tools

2. **User Interface**
- Dataset metadata display
- Export/share capabilities
- Custom color themes
- Provider-specific settings
- Comparative analysis tools

3. **Performance**
- WebGL rendering for larger datasets
- Worker-based data processing
- Progressive loading for mobile
- Efficient provider switching
- Cached comparative analysis
