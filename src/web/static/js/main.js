import { ViewportTransform } from '/static/js/core/transform.js';
import { CanvasRenderer } from '/static/js/core/canvas.js';
import { EventHandler } from '/static/js/core/events.js';
import { DataLoader } from './data/loader.js';
import { AppState } from '/static/js/data/state.js';
import { TreeVisualizer } from '/static/js/data/tree.js';
import { ThemeManager } from '/static/js/data/theme.js';
import { DetailsPanel } from '/static/js/data/details.js';

class App {
    constructor() {
        this.state = new AppState();
        this.dataLoader = new DataLoader();
        this.transform = new ViewportTransform();
        this.canvas = document.getElementById('visualization');
        this.renderer = new CanvasRenderer(this.canvas, this.transform, this.dataLoader);
        this.themeManager = new ThemeManager();
        this.details = new DetailsPanel(this.dataLoader);
        this.currentProvider = null;
        
        // Initialize event handler after renderer
        this.events = new EventHandler(this.canvas, this.transform, this.renderer, this.dataLoader);
        
        this.setupUI();
        this.setupEventListeners();
        this.setupControls();
    }
    
    async initialize() {
        try {
            // Initialize data loader
            await this.dataLoader.initialize();
            
            // Load initial dataset
            await this.loadCurrentDataset();
            
            // Update UI
            this.updateZoomInfo();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to load initial dataset');
        }
    }
    
    setupUI() {
        // Get UI elements
        this.providerSelect = document.getElementById('provider-select');
        this.umapNInput = document.getElementById('umap_n');
        this.umapDInput = document.getElementById('umap_d');
        this.generateUmapButton = document.getElementById('generate-umap');
        this.zoomInfo = document.getElementById('zoom-info');
        this.clusteringSidebar = document.getElementById('clustering-sidebar');
        
        // HDBSCAN controls
        this.hdbsMinClusterSizeInput = document.getElementById('hdbs_min_cluster_size');
        this.hdbsMinSamplesInput = document.getElementById('hdbs_min_samples');
        this.hdbsMethodSelect = document.getElementById('hdbs_method');
        this.hdbsEpsilonInput = document.getElementById('hdbs_epsilon');
        this.generateClustersButton = document.getElementById('generate-clusters');
        this.clusterInfo = document.getElementById('cluster-info');
        
        // Setup clustering sidebar close button
        const closeClusteringBtn = this.clusteringSidebar.querySelector('.close');
        closeClusteringBtn.addEventListener('click', () => this.hideClusteringSidebar());
        
        // Add clustering button to header
        const clusteringBtn = document.createElement('button');
        clusteringBtn.textContent = 'Parameters';
        clusteringBtn.classList.add('clustering-toggle');
        clusteringBtn.addEventListener('click', () => this.toggleClusteringSidebar());
        document.getElementById('controls').appendChild(clusteringBtn);
        
        // Provider selection
        this.providerSelect.addEventListener('change', () => {
            this.loadCurrentDataset();
        });
        
        // UMAP generation
        this.generateUmapButton.addEventListener('click', async () => {
            await this.generateUmap();
        });
        
        // Cluster generation
        this.generateClustersButton.addEventListener('click', async () => {
            await this.generateClusters();
        });
    }
    
    toggleClusteringSidebar() {
        if (this.clusteringSidebar.classList.contains('visible')) {
            this.hideClusteringSidebar();
        } else {
            this.showClusteringSidebar();
        }
    }
    
    showClusteringSidebar() {
        this.clusteringSidebar.classList.remove('hidden');
        setTimeout(() => {
            this.clusteringSidebar.classList.add('visible');
        }, 10);
    }
    
    hideClusteringSidebar() {
        this.clusteringSidebar.classList.remove('visible');
        setTimeout(() => {
            this.clusteringSidebar.classList.add('hidden');
        }, 300); // Match transition duration
    }
    
    setupEventListeners() {
        // Transform changes
        this.transform.addListener(() => {
            this.updateZoomInfo();
        });
        
        // Update renderer when points change
        if (this.renderer) {
            this.renderer.on('pointsChanged', async ({ type, point }) => {
                // Load metadata when point is hovered or selected
                if (point && (type === 'hover' || type === 'select')) {
                    await this.state.setHoveredVirtue(type === 'hover' ? point : null, this.dataLoader);
                    await this.state.setSelectedVirtue(type === 'select' ? point : null, this.dataLoader);
                    
                    // Show details panel for selected points
                    if (type === 'select') {
                        this.details.showVirtue(point);
                    }
                }
                
                this.renderer.render();
            });
        }
    }
    
    async loadCurrentDataset() {
        const provider = this.providerSelect.value;
        await this.loadDataset(provider);
    }
    
    async loadDataset(provider) {
        try {
            const data = await this.dataLoader.loadDataset(provider);
            
            // Set data in renderer and render
            this.renderer.setData(data.points);
            
            // Fit points to canvas
            const rect = this.canvas.getBoundingClientRect();
            this.transform.fitPoints(Object.values(data.points), rect.width, rect.height);
            
            this.renderer.render();
        } catch (error) {
            console.error('Failed to load dataset:', error);
            this.showError('Failed to load dataset');
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
        // Setup cluster toggle
        const showClustersCheckbox = document.getElementById('show-clusters');
        showClustersCheckbox.addEventListener('change', (e) => {
            this.renderer.toggleClusters(e.target.checked);
        });
    }

    async generateUmap() {
        try {
            this.generateUmapButton.classList.add('loading');
            this.generateUmapButton.disabled = true;
            
            const provider = this.providerSelect.value;
            const umap_n = parseInt(this.umapNInput.value);
            const umap_d = parseFloat(this.umapDInput.value);
            
            const response = await fetch('/api/generate_umap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    provider,
                    umap_n,
                    umap_d
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate UMAP');
            }
            
            const data = await response.json();
            
            // Update the data loader and renderer
            this.dataLoader.setCurrentData(data);
            this.renderer.setData(data.points);
            
            // Fit points to canvas
            const rect = this.canvas.getBoundingClientRect();
            this.transform.fitPoints(Object.values(data.points), rect.width, rect.height);
            
            this.renderer.render();
            
        } catch (error) {
            console.error('Failed to generate UMAP:', error);
            this.showError('Failed to generate UMAP projection');
        } finally {
            this.generateUmapButton.classList.remove('loading');
            this.generateUmapButton.disabled = false;
        }
    }

    async generateClusters() {
        try {
            // Disable inputs and show loading state
            this.generateClustersButton.classList.add('loading');
            this.generateClustersButton.disabled = true;
            this.clusterInfo.textContent = '';
            
            const provider = this.providerSelect.value;
            const params = {
                provider,
                u_dim: 2,  // We're always using 2D for visualization
                u_n: parseInt(this.umapNInput.value),
                u_d: parseFloat(this.umapDInput.value),
                hdbs_min_cluster_size: parseInt(this.hdbsMinClusterSizeInput.value),
                hdbs_min_samples: parseInt(this.hdbsMinSamplesInput.value),
                hdbs_method: this.hdbsMethodSelect.value,
                hdbs_epsilon: parseFloat(this.hdbsEpsilonInput.value)
            };
            
            const response = await fetch('/api/cluster', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate clusters');
            }
            
            const clusters = await response.json();
            
            // Update visualization with new clusters
            this.renderer.setData(this.renderer.points, clusters);
            
            // Show clusters
            const showClustersCheckbox = document.getElementById('show-clusters');
            if (showClustersCheckbox) {
                showClustersCheckbox.parentElement.style.display = 'block';
                showClustersCheckbox.checked = true;
            }
            this.renderer.toggleClusters(true);
            
            // Update info box
            this.clusterInfo.textContent = `Found ${clusters.metadata.num_clusters} clusters, ${clusters.metadata.noise_points} noise points`;
            
        } catch (error) {
            console.error('Failed to generate clusters:', error);
            this.showError('Failed to generate clusters');
            this.clusterInfo.textContent = 'Clustering failed';
        } finally {
            this.generateClustersButton.classList.remove('loading');
            this.generateClustersButton.disabled = false;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.initialize();
    
    // Use the app's DataLoader instance instead of creating a new one
    const treeViz = new TreeVisualizer(app.dataLoader, app.details);
    await treeViz.loadTree();
    
    // Store TreeVisualizer instance on the tree panel element
    const treePanel = document.getElementById('tree-panel');
    treePanel.__treeViz = treeViz;
    
    // Listen for point selection changes
    const canvas = document.getElementById('visualization');
    const renderer = canvas.__renderer;
    
    if (renderer) {
        renderer.on('pointsChanged', async ({ type, point }) => {
            if (type === 'select' && point) {
                await app.state.setSelectedVirtue(point, app.dataLoader);
                await treeViz.highlightNode(point);
                app.details.showVirtue(point);
            } else if (type === 'hover' && point) {
                await app.state.setHoveredVirtue(point, app.dataLoader);
            }
        });
    }
    
    // Add click handlers to tree nodes
    treePanel.addEventListener('click', async (e) => {
        const nodeSpan = e.target.closest('span');
        if (nodeSpan) {
            const li = nodeSpan.closest('li');
            if (li) {
                const nodeId = li.id.replace('tree-node-', '');
                if (nodeSpan.classList.contains('color-dot')) {
                    treeViz.toggleNodePin(nodeId);
                } else {
                    await app.state.setSelectedVirtue(nodeId, app.dataLoader);
                    await treeViz.highlightNode(nodeId);
                    renderer.setSelectedPoint(nodeId);
                    app.details.showVirtue(nodeId);
                }
            }
        }
    });
}); 