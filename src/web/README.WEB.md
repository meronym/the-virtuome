# Web Visualization System Documentation

## Overview

The web visualization system provides an interactive 2D visualization of virtue embeddings from multiple AI providers. It allows users to explore and compare different dimensionality reduction techniques (PCA and UMAP) applied to these embeddings, with detailed virtue content available through an interactive side panel. The system includes a hierarchical tree visualization that shows the organizational structure of virtues and provides color coordination between the tree and the embedding space.

## Core Features

- Interactive 2D canvas visualization
- Multiple data provider support (Voyage AI, OpenAI, Cohere)
- Multiple projection types (PCA, UMAP with variants)
- Pan and zoom navigation
- Point selection and hover effects with visual feedback
- Point identification labels on hover
- Detailed virtue content display in sliding panel
- Hierarchical tree visualization with color coordination
- Pin-highlighting system for exploring virtue relationships
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
│   │   │   ├── details.js     # Details panel management
│   │   │   ├── tree.js        # Tree visualization
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
- Virtue content serving
- Raw data serving for tree structure

Key endpoints:
- `/` - Serves the main application
- `/data/datasets` - Lists available datasets
- `/data/<provider>/<path>` - Serves data files
- `/data/virtue/<virtue_id>` - Serves virtue content from raw data
- `/data/raw/v1/<path>` - Serves raw data files including tree structure

### Core Components

#### ViewportTransform (`js/core/transform.js`)
Manages the viewport's transformation matrix for pan and zoom operations.

Key methods:
- `pan(dx, dy)` - Pan by relative amount
- `zoomAt(x, y, factor)` - Zoom centered on point
- `toScreen(x, y)` - Convert data to screen coordinates
- `toData(x, y)` - Convert screen to data coordinates
- `fitPoints(points, width, height)` - Fit points to viewport

#### CanvasRenderer (`js/core/canvas.js`)
Handles the canvas rendering and point visualization.

Key features:
- Point culling for performance
- Different point styles for states:
  - Normal: Semi-transparent color based on tree position
  - Hover: Tree-assigned color with white glow effect and floating identifier label
  - Selected: Tree-assigned color with white border
- High DPI support
- Automatic resize handling
- Event emission for state changes
- Two-pass rendering for optimal label visibility
- Color coordination with tree hierarchy
- Interactive point selection with tree synchronization

#### EventHandler (`js/core/events.js`)
Manages user interactions with the canvas.

Supported interactions:
- Mouse drag for panning
- Mouse wheel for zooming
- Point hover and selection
- Touch gestures (pan, pinch zoom)
- Click/tap detection with timing checks

### Data Management

#### DataLoader (`js/data/loader.js`)
Handles data loading and caching.

Features:
- Dataset metadata loading
- JSON file caching
- UMAP variant parsing
- Provider/projection type management

#### DetailsPanel (`js/data/details.js`)
Manages the sliding details panel for virtue content.

Features:
- Async content loading
- Markdown-like formatting
- Frontmatter parsing
- Loading state handling
- Error state handling
- Keyboard shortcuts (Esc to close)

#### TreeVisualizer (`js/data/tree.js`)
Manages the hierarchical tree visualization, color assignment, and pin-highlighting system.

Features:
- Hierarchical tree rendering
- Recursive color assignment algorithm
- Color coordination with canvas points
- Depth-based color adjustments
- Global color map management
- Fallback colors for unknown nodes
- Interactive node highlighting and auto-scrolling
- Visual feedback for selected nodes
- Pin-highlighting system for exploring relationships:
  - Click-to-pin any node in the hierarchy
  - Visual feedback with pin icons and background highlights
  - Automatic highlighting of descendant nodes
  - Canvas halos for pinned nodes' virtues
  - Support for multiple simultaneous pins
  - Most-specific-ancestor rule for overlapping pins

Color Assignment Algorithm:
- Uses HSL color space for intuitive color relationships
- Recursively splits hue spectrum among siblings
- Adjusts brightness based on tree depth
- Maintains consistent saturation for visual cohesion

Interactive Features:
- Automatic highlighting of tree nodes when points are selected on canvas
- Smooth scrolling to bring highlighted nodes into view
- Visual emphasis through bold text and subtle underline
- Synchronized selection state between canvas and tree
- Pin-based exploration of virtue relationships
- Visual hierarchy for pinned nodes and their descendants

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
        <div id="tree-panel">
            <!-- Hierarchical tree visualization -->
        </div>
        <canvas id="visualization"></canvas>
        <aside id="details">
            <!-- Virtue details panel -->
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
- Details panel styling
- Point state styling

## Data Structure

Expected data directory structure:
```
data/
├── processed/v1/           # Processed embeddings & analysis
│   ├── voyage/
│   │   ├── embeddings/
│   │   ├── pca/
│   │   └── umap/
│   ├── openai/
│   └── cohere/
└── raw/v1/                # Raw virtue content
    ├── flat/              # Flattened virtue files
    │   └── *.md          # Individual virtue files
    └── tree.json         # Complete hierarchical tree structure
```

### Tree Structure Format
The `tree.json` file provides a complete hierarchical view of all virtues, organized by period, tradition, and school:

```json
[
  {
    "type": "period",
    "name": "CLASSICAL PHILOSOPHICAL TRADITIONS",
    "children": [
      {
        "type": "tradition",
        "name": "Greek Philosophy (c. 600 BCE - 300 CE)",
        "children": [
          {
            "type": "school",
            "name": "Stoicism",
            "children": [
              {
                "type": "virtue",
                "name": "wisdom-stoic"
              },
              {
                "type": "virtue",
                "name": "justice-stoic"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

Each node in the tree has a `type` ("period", "tradition", "school", or "virtue") and a `name`. Non-leaf nodes have a `children` array containing their child nodes. This structure enables hierarchical navigation and filtering of virtues in the visualization system.

### Virtue Content Format
```markdown
---
id: virtue-identifier
virtue: Virtue Name
tradition: Tradition Name
category: Category
---

# Detailed content in markdown format
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
- Two-pass rendering for layered elements

### Mobile Support
- Responsive layout adjustments
- Touch gesture handling
- Performance considerations
- Adaptive UI elements

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