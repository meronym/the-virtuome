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
        
        // Initialize event handler after renderer
        this.events = new EventHandler(this.canvas, this.transform, this.renderer);
        
        this.setupUI();
        this.setupEventListeners();
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
        
        // Update renderer when points are hovered
        this.renderer.on('pointsChanged', () => {
            this.renderer.render();
        });
    }
    
    async loadCurrentDataset() {
        const { provider, type, variant } = this.state.getState();
        
        try {
            const data = await this.loader.loadDataset(provider, type, variant);
            this.state.setPoints(data.points);
            this.renderer.setPoints(data.points);
            
            // Fit points to canvas
            const rect = this.canvas.getBoundingClientRect();
            this.transform.fitPoints(data.points, rect.width, rect.height);
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
            
            // Add variant options
            for (const variant of variants) {
                const option = document.createElement('option');
                option.value = variant;
                
                // Parse parameters from filename
                const match = variant.match(/umap-n(\d+)-d([\d.]+)\.json/);
                option.textContent = match ? 
                    `n=${match[1]}, d=${match[2]}` : 
                    variant.replace(/\.json$/, '');
                
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