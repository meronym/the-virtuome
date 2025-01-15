# Web Visualization System Documentation

## Overview

The web visualization system provides an interactive 2D visualization of virtue embeddings from multiple AI providers. It allows users to explore and compare different dimensionality reduction techniques (PCA and UMAP) applied to these embeddings, with detailed virtue content and metadata available through an interactive side panel and enhanced hover labels. The system includes a hierarchical tree visualization that shows the organizational structure of virtues and provides color coordination between the tree and the embedding space.

## Core Features

- Interactive 2D canvas visualization
- Multiple data provider support (Voyage AI, OpenAI, Cohere)
- Multiple projection types (PCA, UMAP with variants)
- Dynamic virtue metadata loading and display:
  - Automatic metadata fetching on hover and selection
  - Rich hover labels with title, tradition, and description
  - Synchronized metadata state between tree and canvas
- HDBSCAN clustering visualization with:
  - Distinct cluster colors with semi-transparent fills
  - Noise point identification (excluded from cluster visualization)
  - Dynamic cluster size scaling with zoom level
  - Toggle between cluster and tree-based coloring
- Pan and zoom navigation
- Point selection and hover effects with visual feedback
- Theme-aware point labels with:
  - Multi-row layout with title emphasis
  - Tradition and description display
  - System font rendering
  - Light/dark mode adaptation
  - Rounded corners and subtle shadows
- Detailed virtue content display in sliding panel
- Hierarchical tree visualization with:
  - Color coordination with canvas points
  - Interactive node highlighting
  - Smart scrolling with parent expansion
  - Automatic centering of selected nodes
  - Pin-highlighting system for exploring relationships
- Symmetrical interaction between tree and canvas
- Advanced color management for visual hierarchy
- Responsive design with mobile support
- URL state persistence
- Dark/light theme system with system preference detection

## Directory Structure

```
src/web/
├── server/
│   └── app.py                 # Flask development server with metadata endpoints
├── static/
│   ├── css/
│   │   └── style.css          # Core styles
│   ├── js/
│   │   ├── core/              # Core visualization components
│   │   │   ├── transform.js   # Viewport transformations
│   │   │   ├── canvas.js      # Canvas rendering with metadata labels
│   │   │   └── events.js      # Event handling with metadata loading
│   │   ├── data/              # Data management
│   │   │   ├── loader.js      # Data and metadata loading/caching
│   │   │   ├── details.js     # Details panel management
│   │   │   ├── tree.js        # Tree visualization with metadata sync
│   │   │   └── state.js       # Application state with metadata tracking
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
- Virtue metadata serving
- Raw data serving for tree structure
- Version-specific data serving via CLI argument

Key endpoints:
- `/` - Serves the main application
- `/data/datasets` - Lists available datasets
- `/data/<provider>/<path>` - Serves data files
- `/data/virtue/<virtue_id>` - Serves virtue content from raw data
- `/data/virtue/<virtue_id>/metadata` - Serves parsed virtue metadata
- `/data/raw/<version>/<path>` - Serves raw data files including tree structure

### Core Components

#### DataLoader (`js/data/loader.js`)
Manages data loading and caching:
- Dataset metadata loading
- JSON file caching
- UMAP variant parsing
- Provider/projection type management
- Virtue metadata caching and loading
- Automatic metadata state management

#### AppState (`js/data/state.js`)
Manages application state including:
- Current provider/projection settings
- Selected and hovered virtue tracking
- Metadata loading state
- Event system for metadata updates
- URL parameter synchronization

#### CanvasRenderer (`js/core/canvas.js`)
Handles canvas rendering with:
- Dynamic point label generation using metadata
- Rich hover labels with three-row layout:
  - Emphasized title (16px, bold)
  - Tradition subtitle (13px, muted)
  - Description text (13px, truncated)
- Theme-aware label styling
- Automatic metadata loading on hover
- Synchronized selection state with tree

#### TreeVisualizer (`js/data/tree.js`)
Manages the hierarchical tree with:
- Automatic metadata loading on node selection
- Smart scrolling behavior:
  - Parent container expansion
  - Accurate position calculation
  - Smooth centering animation
  - Viewport-aware positioning
- Pin-based relationship exploration
- Synchronized highlighting with canvas
- Color coordination across components

### Data Structure

Expected data directory structure:
```
data/
├── processed/v2/           # Processed embeddings & analysis
│   ├── voyage/
│   │   ├── embeddings/
│   │   ├── pca/
│   │   ├── umap/
│   │   │   └── clusters/  # HDBSCAN clustering results
│   │   │       └── hdbscan-umap-*.json
│   ├── openai/
│   └── cohere/
└── raw/
    └── v2/                  # Raw v2 virtue dataset
        ├── flat/            # Flat list of v2 virtue files
        │   ├── *.md         # Individual virtue files
        │   └── *.meta.yaml  # Parsed virtue metadata
        └── tree.json        # Hierarchical organization of virtues
```

### Virtue Metadata Format
The `*.meta.yaml` files contain structured metadata:

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
key_quotes:
  - "Quote 1"
  - "Quote 2"
related_practices:
  - "Practice 1"
  - "Practice 2"
```

## Implementation Details

### State Management
- Event-based architecture using custom event emitters
- URL state synchronization for shareable views
- Theme preference persistence
- Cached data and metadata loading
- Synchronized tree and canvas state

### Performance Optimizations
- Point culling outside viewport
- Request caching for data and metadata
- Throttled render updates
- Device pixel ratio handling
- Touch event optimization
- Two-pass rendering for layered elements
- Smart metadata loading on interaction

### Mobile Support
- Responsive layout adjustments
- Touch gesture handling
- Performance considerations
- Adaptive UI elements

## Development Workflow

1. Start the development server:
```bash
cd src/web/server
python app.py [--version v2]  # Specify data version, defaults to v2
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
- Metadata state inspection

## Future Enhancements

Planned features:
- Advanced metadata filtering and search
- Comparative metadata analysis
- Batch metadata loading for visible points
- Metadata-driven clustering visualization
- Enhanced metadata display in details panel
- WebGL rendering for larger datasets
- Progressive loading for mobile
- Additional theme customization options
- Enhanced accessibility features 