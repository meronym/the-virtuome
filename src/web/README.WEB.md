# Web Visualization System Documentation

## Overview

The web visualization system provides an interactive 2D visualization of virtue embeddings from multiple AI providers. It allows users to explore and compare different dimensionality reduction techniques (PCA and UMAP) applied to these embeddings, with detailed virtue content available through an interactive side panel. The system includes a hierarchical tree visualization that shows the organizational structure of virtues and provides color coordination between the tree and the embedding space.

## Core Features

- Interactive 2D canvas visualization
- Multiple data provider support (Voyage AI, OpenAI, Cohere)
- Multiple projection types (PCA, UMAP with variants)
- HDBSCAN clustering visualization with:
  - Distinct cluster colors with semi-transparent fills
  - Noise point identification (excluded from cluster visualization)
  - Dynamic cluster size scaling with zoom level
  - Toggle between cluster and tree-based coloring
- Pan and zoom navigation
- Point selection and hover effects with visual feedback
- Theme-aware point labels with:
  - System font rendering
  - Light/dark mode adaptation
  - Rounded corners and subtle shadows
- Detailed virtue content display in sliding panel
- Hierarchical tree visualization with color coordination
- Symmetrical interaction between tree and canvas
- Advanced color management for visual hierarchy
- Pin-highlighting system for exploring virtue relationships
- Responsive design with mobile support
- URL state persistence
- Dark/light theme system with system preference detection
- Optimized tree navigation with smart scrolling behavior

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
- Version-specific data serving via CLI argument

Key endpoints:
- `/` - Serves the main application
- `/data/datasets` - Lists available datasets
- `/data/<provider>/<path>` - Serves data files
- `/data/virtue/<virtue_id>` - Serves virtue content from raw data
- `/data/raw/<version>/<path>` - Serves raw data files including tree structure

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
  - Selected: Enhanced visual treatment with:
    - Increased size (1.5x)
    - Color-coordinated glow effect
    - Saturation-enhanced fill
    - Darker border of the same hue
    - Subtle outer ring
  - Pin-highlighted: Subtle halo effect showing hierarchical relationships
  - Cluster mode: 
    - Distinct semi-transparent colors per cluster
    - Dynamic radius scaling with zoom level
    - Noise point exclusion
    - Smooth transitions between cluster and tree coloring
- Theme-aware labels with:
  - System font stack
  - Dark/light mode adaptation
  - Rounded corners and shadows
  - Optimal contrast and readability
- High DPI support
- Automatic resize handling
- Event emission for state changes
- Multi-pass rendering for optimal visual hierarchy:
  1. Cluster backgrounds (when enabled)
  2. Halos for pinned nodes
  3. Point bodies
  4. Hover labels (always on top)
- Color coordination with tree hierarchy or cluster assignment
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
- Sophisticated color management system:
  - HSL-based color objects for precise control
  - Recursive color assignment algorithm
  - Color coordination with canvas points
  - Depth-based color adjustments
  - Global color map management
  - Fallback colors for unknown nodes
- Interactive node highlighting and auto-scrolling
- Visual feedback for selected nodes
- Symmetrical interaction with canvas:
  - Clicking tree nodes selects corresponding canvas points
  - Selecting canvas points highlights corresponding tree nodes
  - Consistent visual feedback across both views
- Pin-highlighting system for exploring relationships:
  - Click-to-pin any node in the hierarchy
  - Visual feedback with pin icons and background highlights
  - Automatic highlighting of descendant nodes
  - Canvas halos for pinned nodes' virtues
  - Support for multiple simultaneous pins
  - Most-specific-ancestor rule for overlapping pins

Color Management System:
- Uses HSL color space for intuitive color relationships
- Stores colors as objects with h, s, l properties
- Enables sophisticated color transformations:
  - Saturation enhancement for emphasis
  - Lightness adjustments for hierarchy
  - Opacity control for visual layering
- Maintains color consistency across components
- Supports dynamic color variations for different states

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
        <!-- Theme toggle control -->
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
- CSS variable-based theming system
- Details panel styling
- Point state styling
- Optimized tree panel layout:
  - Compact hierarchical indentation
  - Smart color dot positioning
  - Pin indicators for marked nodes
  - Contrast-optimized text for both themes
  - Smooth state transitions

## Data Structure

Expected data directory structure:
```
data/
├── processed/v1/           # Processed embeddings & analysis
│   ├── voyage/
│   │   ├── embeddings/
│   │   ├── pca/
│   │   ├── umap/
│   │   │   └── clusters/  # HDBSCAN clustering results
│   │   │       └── hdbscan-umap-*.json
│   ├── openai/
│   └── cohere/
└── raw/
    ├── v1/              # Raw v1 virtue dataset
    │   ├── flat/        # Flat list of v1 virtue files
    │   │   └── *.md     # Individual virtue files
    │   └── tree.json    # Complete hierarchical organization of v1 virtues
    └── v2/                  # Raw v2 virtue dataset
        └── flat/            # Flat list of v2 virtue files
            ├── *.md         # Individual virtue files
            └── *.meta.yaml  # Parsed virtue metadata (only for v2)
```

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

### Virtue Metadata Format (v2)
The `*.meta.yaml` files contain structured metadata extracted from the markdown content:

```yaml
# Original frontmatter fields
id: virtue-identifier
virtue: Virtue Name
tradition: Tradition Name
category: Category

# Content-derived fields
post_length: 1234
title: "Full Virtue Title"
definition: "Complete definition text"
key_aspects:
  - "Aspect 1"
  - "Aspect 2"
  - "Aspect 3"
notable_quotes:
  - "Quote 1 with attribution"
  - "Quote 2 with attribution"
related_practices:
  - "Practice 1"
  - "Practice 2"
# Additional structured sections...
```

These metadata files provide a structured, machine-readable format for virtue content that will enable enhanced filtering, searching, and display capabilities in future iterations of the web interface.

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

### Cluster Data Format
The `hdbscan-*.json` files contain clustering results:

```json
{
  "points": {
    "virtue-id": {
      "cluster": 0  // -1 for noise points
    }
  },
  "metadata": {
    "num_clusters": 5,
    "noise_points": 10
  }
}
```

This format enables:
- Distinct visualization of clusters
- Identification of noise points
- Cluster statistics tracking
- Toggle between cluster and tree-based coloring

## Implementation Details

### State Management
- Event-based architecture using custom event emitters
- URL state synchronization for shareable views
- Theme preference persistence
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
python app.py [--version v1]  # Optionally specify data version, defaults to v1
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
- Additional theme customization options
- Enhanced accessibility features 