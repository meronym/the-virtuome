# Web Visualization System Documentation

## Overview

The web visualization system provides an interactive 2D visualization of virtue embeddings from multiple AI providers. It allows users to explore and compare different dimensionality reduction techniques (PCA and UMAP) applied to these embeddings.

## Core Features

- Interactive 2D canvas visualization
- Multiple data provider support (Voyage AI, OpenAI, Cohere)
- Multiple projection types (PCA, UMAP with variants)
- Pan and zoom navigation
- Point selection and hover effects
- Responsive design with mobile support
- URL state persistence

## Directory Structure

```
src/web/
├── server/
│   └── app.py                 # Flask development server
├── static/
│   ├── css/
│   │   └── style.css          # Core styles
│   ├── js/
│   │   ├── core/              # Core visualization components
│   │   │   ├── transform.js   # Viewport transformations
│   │   │   ├── canvas.js      # Canvas rendering
│   │   │   └── events.js      # Event handling
│   │   ├── data/              # Data management
│   │   │   ├── loader.js      # Data loading and caching
│   │   │   └── state.js       # Application state
│   │   └── main.js            # Application entry point
│   └── index.html             # Main HTML template
└── README.WEB.md              # This documentation
```

## Component Documentation

### Server (`server/app.py`)

The Flask server handles:
- Static file serving
- Data file serving with caching
- Dataset enumeration API

Key endpoints:
- `/` - Serves the main application
- `/data/datasets` - Lists available datasets
- `/data/<provider>/<path>` - Serves data files

### Core Components

#### ViewportTransform (`js/core/transform.js`)
Manages the viewport's transformation matrix for pan and zoom operations.

Key methods:
- `pan(dx, dy)` - Pan by relative amount
- `zoomAt(x, y, factor)` - Zoom centered on point
- `toScreen(x, y)` - Convert data to screen coordinates
- `toData(x, y)` - Convert screen to data coordinates

#### CanvasRenderer (`js/core/canvas.js`)
Handles the canvas rendering and point visualization.

Key features:
- Point culling for performance
- Different point styles for hover/selection
- High DPI support
- Automatic resize handling

#### EventHandler (`js/core/events.js`)
Manages user interactions with the canvas.

Supported interactions:
- Mouse drag for panning
- Mouse wheel for zooming
- Point hover and selection
- Touch gestures (pan, pinch zoom)

### Data Management

#### DataLoader (`js/data/loader.js`)
Handles data loading and caching.

Features:
- Dataset metadata loading
- JSON file caching
- UMAP variant parsing
- Provider/projection type management

#### AppState (`js/data/state.js`)
Manages application state and URL synchronization.

State elements:
- Current provider
- Projection type
- UMAP variant
- Selected/hovered points
- URL parameters

### UI Components

#### Main Layout (`static/index.html`)
```html
<div id="app">
    <header id="controls">
        <!-- Dataset selection controls -->
    </header>
    <main>
        <canvas id="visualization"></canvas>
        <aside id="details">
            <!-- Point details panel -->
        </aside>
    </main>
</div>
```

#### Styles (`static/css/style.css`)
Key features:
- Responsive layout
- Mobile adaptations
- Smooth transitions
- Theme variables

## Data Structure

Expected data directory structure:
```
data/processed/v1/
├── voyage/                   # Voyage AI embeddings & analysis
│   ├── embeddings/
│   ├── pca/
│   │   └── pca.json         # PCA projection
│   └── umap/
│       ├── umap.json        # Default UMAP
│       └── umap-n15-d0.0.json  # UMAP variants
├── openai/                   # OpenAI embeddings & analysis
└── cohere/                   # Cohere embeddings & analysis
```

Data file format (PCA/UMAP JSON):
```json
{
  "points": {
    "virtue-tradition": {     // Point identifier
      "x": 0.123,            // X coordinate
      "y": 0.456             // Y coordinate
    },
    // ... more points
  }
}
```

## Implementation Details

### State Management
- Event-based architecture using custom event emitters
- URL state synchronization for shareable views
- Cached data loading with memory management

### Performance Optimizations
- Point culling outside viewport
- Request caching
- Throttled render updates
- Device pixel ratio handling
- Touch event optimization

### Mobile Support
- Responsive layout adjustments
- Touch gesture handling
- Performance considerations
- Adaptive UI elements

## Common Tasks

### Adding a New Provider
1. Add provider option in `index.html`
2. Update provider labels in `loader.js`
3. Ensure data directory structure matches

### Adding a New Projection Type
1. Add projection option in `index.html`
2. Update data loading logic in `loader.js`
3. Add type-specific handling in state management

### Modifying Point Visualization
1. Update point rendering in `canvas.js`
2. Adjust point styles in `style.css`
3. Update point interaction in `events.js`

### Adding UI Features
1. Add HTML elements in `index.html`
2. Add corresponding styles in `style.css`
3. Add event handling in `main.js`
4. Update state management if needed

## Development Workflow

1. Start the development server:
```bash
cd src/web/server
python app.py
```

2. Access the application:
```
http://localhost:5000
```

3. Development tools:
- Browser DevTools for debugging
- Canvas debugging helpers in `canvas.js`
- State logging in browser console
- Network tab for data loading

## Future Enhancements

Planned features:
- Color coding by tradition
- Cluster visualization
- Search/filter functionality
- Provider comparison view
- Embedding space analysis tools
- WebGL rendering for larger datasets
- Progressive loading for mobile
- Cached comparative analysis 