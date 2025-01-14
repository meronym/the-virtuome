import { ViewportTransform } from '/static/js/core/transform.js';
import { CanvasRenderer } from '/static/js/core/canvas.js';
import { EventHandler } from '/static/js/core/events.js';
import { DataLoader } from '/static/js/data/loader.js';
import { AppState } from '/static/js/data/state.js';
import { TreeVisualizer } from '/static/js/data/tree.js';
import { ThemeManager } from '/static/js/data/theme.js';

class App {
    constructor() {
        this.state = new AppState();
        this.loader = new DataLoader();
        this.transform = new ViewportTransform();
        this.canvas = document.getElementById('visualization');
        this.renderer = new CanvasRenderer(this.canvas, this.transform);
        this.themeManager = new ThemeManager();
        this.dataLoader = new DataLoader();
        this.currentProvider = null;
        this.currentProjection = null;
        this.currentVariant = null;
        
        // Initialize event handler after renderer
        this.events = new EventHandler(this.canvas, this.transform, this.renderer);
        
        this.setupUI();
        this.setupEventListeners();
        this.setupControls();
    }
    
    async initialize() {
        try {
            // Initialize data loader
            await this.loader.initialize();
            
            // Load initial dataset
            await this.loadCurrentDataset();
            
            // Update UI
            this.updateVariantSelect();
            this.updateZoomInfo();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to load initial dataset');
        }
    }
    
    setupUI() {
        // Get UI elements
        this.providerSelect = document.getElementById('provider');
        this.typeSelect = document.getElementById('projection');
        this.variantSelect = document.getElementById('variant');
        this.zoomInfo = document.getElementById('zoom-info');
        
        // Setup event listeners
        this.providerSelect.addEventListener('change', () => {
            this.state.setProvider(this.providerSelect.value);
            this.loadCurrentDataset();
        });
        
        this.typeSelect.addEventListener('change', () => {
            this.state.setType(this.typeSelect.value);
            this.updateVariantSelect();
            this.loadCurrentDataset();
        });
        
        this.variantSelect.addEventListener('change', () => {
            this.state.setVariant(this.variantSelect.value);
            this.loadCurrentDataset();
        });
    }
    
    setupEventListeners() {
        // Transform changes
        this.transform.addListener(() => {
            this.updateZoomInfo();
        });
        
        // Update renderer when points change
        if (this.renderer) {
            this.renderer.on('pointsChanged', () => {
                this.renderer.render();
            });
        }
    }
    
    async loadCurrentDataset() {
        const { provider, type, variant } = this.state.getState();
        
        try {
            // Strip .json from variant if present
            const cleanVariant = variant ? variant.replace(/\.json$/, '') : '';
            
            const data = await this.loader.loadDataset(provider, type, cleanVariant);
            
            // Try to load cluster data if available
            const clusters = await this.dataLoader.loadClusters(
                provider, 
                type, 
                cleanVariant
            ).catch(() => null);
            
            // Update visualization
            this.renderer.setData(data.points, clusters);
            
            // Update cluster toggle visibility
            const clusterToggle = document.getElementById('show-clusters');
            if (clusterToggle) {
                clusterToggle.parentElement.style.display = clusters ? 'block' : 'none';
                clusterToggle.checked = false;
            }
            
            // Fit points to canvas
            const rect = this.canvas.getBoundingClientRect();
            this.transform.fitPoints(Object.values(data.points), rect.width, rect.height);
        } catch (error) {
            console.error('Failed to load dataset:', error);
            this.showError('Failed to load dataset');
        }
    }
    
    updateVariantSelect() {
        const { provider, type } = this.state.getState();
        const variants = this.loader.getAvailableVariants(provider, type);
        
        // Clear existing options
        this.variantSelect.innerHTML = '';
        
        if (type === 'umap' && variants.length > 0) {
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Default';
            this.variantSelect.appendChild(defaultOption);
            
            // Sort variants by N and d
            const sortedVariants = [...variants].sort((a, b) => {
                const matchA = a.match(/umap-n(\d+)-d([\d.]+)\.json/);
                const matchB = b.match(/umap-n(\d+)-d([\d.]+)\.json/);
                
                if (!matchA || !matchB) return 0;
                
                const nA = parseInt(matchA[1]);
                const nB = parseInt(matchB[1]);
                
                if (nA !== nB) return nA - nB;
                
                const dA = parseFloat(matchA[2]);
                const dB = parseFloat(matchB[2]);
                return dA - dB;
            });
            
            // Add variant options
            for (const variant of sortedVariants) {
                const option = document.createElement('option');
                option.value = variant;
                
                // Parse parameters from filename for display
                const match = variant.match(/umap-n(\d+)-d([\d.]+)\.json/);
                if (match) {
                    const n = match[1];
                    const d = match[2];  // Use exact value from filename
                    option.textContent = `n=${n}, d=${d}`;
                } else {
                    option.textContent = variant.replace(/\.json$/, '');
                }
                
                this.variantSelect.appendChild(option);
            }
            
            this.variantSelect.disabled = false;
        } else {
            this.variantSelect.disabled = true;
        }
    }
    
    updateZoomInfo() {
        this.zoomInfo.textContent = `Zoom: ${(this.transform.scale * 100).toFixed(0)}%`;
    }
    
    showError(message) {
        // Simple error display - could be enhanced
        alert(message);
    }
    
    setupControls() {
        // Add cluster toggle control
        const clusterToggle = document.createElement('div');
        clusterToggle.className = 'control-group';
        clusterToggle.innerHTML = `
            <label>
                <input type="checkbox" id="show-clusters">
                Show Clusters
            </label>
        `;
        document.getElementById('controls').appendChild(clusterToggle);

        document.getElementById('show-clusters').addEventListener('change', (e) => {
            this.renderer.toggleClusters(e.target.checked);
        });
    }

    async loadDataset(provider, projectionType, variant = '') {
        this.currentProvider = provider;
        this.currentProjection = projectionType;
        this.currentVariant = variant;

        const data = await this.dataLoader.loadDataset(provider, projectionType, variant);
        
        // Try to load cluster data if available
        const clusters = await this.dataLoader.loadClusters(
            provider, 
            projectionType, 
            variant
        ).catch(() => null);

        // Update visualization
        this.renderer.setData(data.points, clusters);
        
        // Update cluster toggle visibility
        const clusterToggle = document.getElementById('show-clusters');
        clusterToggle.parentElement.style.display = clusters ? 'block' : 'none';
        clusterToggle.checked = false;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.initialize();
    
    const treeViz = new TreeVisualizer();
    await treeViz.loadTree();
    
    // Store TreeVisualizer instance on the tree panel element
    const treePanel = document.getElementById('tree-panel');
    treePanel.__treeViz = treeViz;
    
    // Listen for point selection changes
    const canvas = document.getElementById('visualization');
    const renderer = canvas.__renderer; // Access the renderer instance
    
    if (renderer) {
        renderer.on('pointsChanged', ({ type, point }) => {
            if (type === 'select' && point) {
                treeViz.highlightNode(point);
            }
        });
    }
}); 