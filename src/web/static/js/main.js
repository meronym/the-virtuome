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
        this.loadSettings(); // Load saved settings before setting up listeners
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
        
        // UMAP clustering controls
        this.clusterUmapDimInput = document.getElementById('u_dim');
        this.clusterUmapNInput = document.getElementById('u_n');
        this.clusterUmapDInput = document.getElementById('u_d');
        
        // HDBSCAN controls
        this.hdbsMinClusterSizeInput = document.getElementById('hdbs_min_cluster_size');
        this.hdbsMinSamplesInput = document.getElementById('hdbs_min_samples');
        this.hdbsMethodSelect = document.getElementById('hdbs_method');
        this.hdbsEpsilonInput = document.getElementById('hdbs_epsilon');
        this.generateClustersButton = document.getElementById('generate-clusters');
        this.clusterInfo = document.getElementById('cluster-info');

        // Add change listeners to save settings
        const inputsToWatch = [
            this.providerSelect,
            this.umapNInput,
            this.umapDInput,
            this.clusterUmapDimInput,
            this.clusterUmapNInput,
            this.clusterUmapDInput,
            this.hdbsMinClusterSizeInput,
            this.hdbsMinSamplesInput,
            this.hdbsMethodSelect,
            this.hdbsEpsilonInput
        ];

        inputsToWatch.forEach(input => {
            input.addEventListener('change', () => this.saveSettings());
        });
        
        // Handle mobile settings panel visibility
        if (window.innerWidth <= 768) {
            const settingsPanel = document.getElementById('settings-panel');
            settingsPanel.classList.add('visible');
        }
        
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

        // Setup cluster color randomization
        const randomizeColorsButton = document.getElementById('randomize-cluster-colors');
        randomizeColorsButton.addEventListener('click', () => {
            this.renderer.randomizeClusterColors();
        });
    }

    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('virtuomeSettings'));
            if (settings) {
                // Load provider
                if (settings.provider) {
                    this.providerSelect.value = settings.provider;
                }
                
                // Load UMAP settings
                if (settings.umap) {
                    this.umapNInput.value = settings.umap.n;
                    this.umapDInput.value = settings.umap.d;
                }
                
                // Load clustering UMAP settings
                if (settings.clusterUmap) {
                    this.clusterUmapDimInput.value = settings.clusterUmap.dim;
                    this.clusterUmapNInput.value = settings.clusterUmap.n;
                    this.clusterUmapDInput.value = settings.clusterUmap.d;
                }
                
                // Load HDBSCAN settings
                if (settings.hdbscan) {
                    this.hdbsMinClusterSizeInput.value = settings.hdbscan.minClusterSize;
                    this.hdbsMinSamplesInput.value = settings.hdbscan.minSamples;
                    this.hdbsMethodSelect.value = settings.hdbscan.method;
                    this.hdbsEpsilonInput.value = settings.hdbscan.epsilon;
                }
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    saveSettings() {
        try {
            const settings = {
                provider: this.providerSelect.value,
                umap: {
                    n: this.umapNInput.value,
                    d: this.umapDInput.value
                },
                clusterUmap: {
                    dim: this.clusterUmapDimInput.value,
                    n: this.clusterUmapNInput.value,
                    d: this.clusterUmapDInput.value
                },
                hdbscan: {
                    minClusterSize: this.hdbsMinClusterSizeInput.value,
                    minSamples: this.hdbsMinSamplesInput.value,
                    method: this.hdbsMethodSelect.value,
                    epsilon: this.hdbsEpsilonInput.value
                }
            };
            localStorage.setItem('virtuomeSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
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
                u_dim: parseInt(this.clusterUmapDimInput.value),
                u_n: parseInt(this.clusterUmapNInput.value),
                u_d: parseFloat(this.clusterUmapDInput.value),
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