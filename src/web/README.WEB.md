# Web Visualization System Documentation

## Overview

The web visualization system provides an interactive 2D visualization of virtue embeddings from multiple AI providers. It allows users to explore and compare different dimensionality reduction techniques (PCA and UMAP) applied to these embeddings, with detailed virtue content and metadata available through an interactive side panel and enhanced hover labels. The system includes a hierarchical tree visualization that shows the organizational structure of virtues and provides color coordination between the tree and the embedding space.

## Core Features

- Interactive 2D canvas visualization
- Multiple data provider support (Voyage AI, OpenAI, Cohere)
- Multiple projection types (PCA, UMAP with variants)
- Dynamic clustering system with:
  - Real-time UMAP dimensionality reduction
  - HDBSCAN clustering with configurable parameters
  - Interactive parameter controls in dedicated sidebar
  - Labeled form inputs with descriptive names
  - Visual feedback during computation
  - Cluster statistics display
  - Toggle for cluster visualization
- Dynamic virtue metadata loading and display:
  - Automatic metadata fetching on hover and selection
  - Rich hover labels with title, tradition, and description
  - Synchronized metadata state between tree and canvas
  - Efficient metadata caching system
  - Shared metadata handling across components
- HDBSCAN clustering visualization with:
  - Distinct cluster colors with semi-transparent fills
  - Noise point identification (excluded from cluster visualization)
  - Dynamic cluster size scaling with zoom level
  - Toggle between cluster and tree-based coloring
  - Real-time cluster generation with custom parameters
- Pan and zoom navigation
- Point selection and hover effects with visual feedback
- Theme-aware point labels with:
  - Multi-row layout with title emphasis
  - Tradition and description display
  - System font rendering
  - Light/dark mode adaptation
  - Rounded corners and subtle shadows
- Detailed virtue content display in left panel preview:
  - Rich metadata presentation (title, tradition, definition)
  - Key aspects and characteristics
  - Full virtue content with formatted text
  - Theme-aware styling
  - Synchronized state with tree and canvas
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
│   └── app.py                 # Flask development server with metadata and clustering endpoints
├── static/
│   ├── css/
│   │   └── style.css          # Core styles including clustering UI
│   ├── js/
│   │   ├── core/              # Core visualization components
│   │   │   ├── transform.js   # Viewport transformations
│   │   │   ├── canvas.js      # Canvas rendering with metadata labels
│   │   │   └── events.js      # Event handling with metadata loading
│   │   ├── data/              # Data management
│   │   │   ├── loader.js      # Data and metadata loading/caching
│   │   │   ├── details.js     # Details panel with metadata display
│   │   │   ├── tree.js        # Tree visualization with metadata sync
│   │   │   └── state.js       # Application state with metadata tracking
│   │   └── main.js            # Application entry point with clustering logic
│   └── index.html             # Main HTML template
└── README.WEB.md              # This documentation
```

## Component Documentation

### DataLoader (`js/data/loader.js`)
Manages data loading and caching:
- Dataset metadata loading
- JSON file caching
- UMAP variant parsing
- Provider/projection type management
- Virtue metadata caching and loading
- Automatic metadata state management
- Shared metadata instance across components

### ClusteringSystem (`js/main.js`)
Manages dynamic clustering functionality:
- Parameter validation and handling
- Real-time UMAP and HDBSCAN computation
- Loading state management
- Cluster visualization updates
- Statistics display
- Error handling and recovery
- Dedicated sidebar interface with:
  - Labeled form inputs
  - Grouped UMAP/HDBSCAN parameters
  - Cluster visibility toggle
  - Results info display

### DetailsPanel (`js/data/details.js`)
Manages the virtue preview panel with:
- Rich metadata display in left panel:
  - Title and tradition header
  - Definition section
  - Key aspects list
  - Full virtue content
- Theme-aware styling with:
  - Subtle backgrounds
  - Hierarchical typography
  - Consistent spacing
- Metadata integration:
  - Efficient cache utilization
  - Synchronized state
  - Shared instance management

### TreeVisualizer (`js/data/tree.js`)
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
- Shared metadata handling with details panel

### AppState (`js/data/state.js`)
Manages application state including:
- Current provider/projection settings
- Selected and hovered virtue tracking
- Metadata loading state
- Event system for metadata updates
- URL parameter synchronization
- Shared metadata coordination

### Virtue Metadata Format
The `*.meta.yaml` files contain structured metadata:

```yaml
# Core fields
id: virtue-identifier
name: Virtue Name
tradition: Tradition Name
category: Category
definition: "Complete definition text"

# Content fields
key_aspects:
  - "Aspect 1"
  - "Aspect 2"
historical_development: "Historical context..."
contemporary_relevance: "Modern applications..."
notable_quotes:
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
- Shared metadata instances across components

### Performance Optimizations
- Point culling outside viewport
- Request caching for data and metadata
- Throttled render updates
- Device pixel ratio handling
- Touch event optimization
- Two-pass rendering for layered elements
- Smart metadata loading on interaction
- Efficient metadata caching system

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