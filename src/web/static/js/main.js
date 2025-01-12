import { ViewportTransform } from '/static/js/core/transform.js';
import { CanvasRenderer } from '/static/js/core/canvas.js';
import { EventHandler } from '/static/js/core/events.js';
import { DataLoader } from '/static/js/data/loader.js';
import { AppState } from '/static/js/data/state.js';

class App {
    constructor() {
        this.state = new AppState();
        this.loader = new DataLoader();
        this.transform = new ViewportTransform();
        this.canvas = document.getElementById('visualization');
        this.renderer = new CanvasRenderer(this.canvas, this.transform);
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
        this.details = document.getElementById('details');
        this.detailsContent = this.details.querySelector('.content');
        this.closeDetails = this.details.querySelector('.close');
        
        // Setup event listeners
        this.providerSelect.addEventListener('change', () => {
            this.state.setProvider(this.providerSelect.value);
        });
        
        this.typeSelect.addEventListener('change', () => {
            this.state.setType(this.typeSelect.value);
        });
        
        this.variantSelect.addEventListener('change', () => {
            this.state.setVariant(this.variantSelect.value);
        });
        
        this.closeDetails.addEventListener('click', () => {
            this.hideDetails();
        });
    }
    
    setupEventListeners() {
        // State changes
        this.state.on('providerChanged', () => this.loadCurrentDataset());
        this.state.on('typeChanged', () => {
            this.updateVariantSelect();
            this.loadCurrentDataset();
        });
        this.state.on('variantChanged', () => this.loadCurrentDataset());
        
        // Point interaction
        this.events.on('hover', (point) => {
            this.state.setHoveredPoint(point);
        });
        
        this.events.on('select', (point) => {
            this.state.setSelectedPoint(point);
            if (point) {
                this.showDetails(point);
            } else {
                this.hideDetails();
            }
        });
        
        // Transform changes
        this.transform.addListener(() => {
            this.updateZoomInfo();
        });
    }
    
    async loadCurrentDataset() {
        const { provider, type, variant } = this.state.getState();
        
        try {
            const data = await this.loader.loadDataset(provider, type, variant);
            this.state.setPoints(data.points);
            this.renderer.setPoints(data.points);
            
            // Fit points to canvas instead of just resetting
            const rect = this.canvas.getBoundingClientRect();
            this.transform.fitPoints(data.points, rect.width, rect.height);
            this.hideDetails();
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
    
    showDetails(pointId) {
        const point = this.state.points[pointId];
        if (!point) return;
        
        // Format point details
        const [tradition, virtue] = pointId.split('-');
        this.detailsContent.innerHTML = `
            <h3>${virtue.charAt(0).toUpperCase() + virtue.slice(1)}</h3>
            <p><strong>Tradition:</strong> ${tradition.charAt(0).toUpperCase() + tradition.slice(1)}</p>
            <p><strong>Coordinates:</strong></p>
            <p>x: ${point.x.toFixed(3)}</p>
            <p>y: ${point.y.toFixed(3)}</p>
        `;
        
        this.details.classList.add('visible');
    }
    
    hideDetails() {
        this.details.classList.remove('visible');
        this.state.setSelectedPoint(null);
    }
    
    showError(message) {
        // Simple error display - could be enhanced
        alert(message);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.initialize();
}); 