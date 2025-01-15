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
        this.currentProjection = null;
        this.currentVariant = null;
        
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
        
        // Clustering controls
        this.clusteringSidebar = document.getElementById('clustering-sidebar');
        this.uDimInput = document.getElementById('u_dim');
        this.uNInput = document.getElementById('u_n');
        this.uDInput = document.getElementById('u_d');
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
        clusteringBtn.textContent = 'Clustering';
        clusteringBtn.classList.add('clustering-toggle');
        clusteringBtn.addEventListener('click', () => this.toggleClusteringSidebar());
        document.getElementById('controls').appendChild(clusteringBtn);
        
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

        // Setup clustering controls
        this.generateClustersButton.addEventListener('click', () => {
            this.generateClusters();
        });
        
        // Close clustering sidebar on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideClusteringSidebar();
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
        const { provider, type, variant } = this.state.getState();
        
        try {
            // Strip .json from variant if present
            const cleanVariant = variant ? variant.replace(/\.json$/, '') : '';
            
            const data = await this.dataLoader.loadDataset(provider, type, cleanVariant);
            
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
        const variants = this.dataLoader.getAvailableVariants(provider, type);
        
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
        // Setup cluster toggle
        const showClustersCheckbox = document.getElementById('show-clusters');
        showClustersCheckbox.addEventListener('change', (e) => {
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
        const toggleLabel = clusterToggle.closest('.cluster-toggle');
        if (toggleLabel) {
            toggleLabel.style.display = clusters ? 'flex' : 'none';
            clusterToggle.checked = false;
        }
    }

    async generateClusters() {
        const { provider } = this.state.getState();
        
        // Get all parameter values
        const params = {
            u_dim: parseInt(this.uDimInput.value),
            u_n: parseInt(this.uNInput.value),
            u_d: parseFloat(this.uDInput.value),
            hdbs_min_cluster_size: parseInt(this.hdbsMinClusterSizeInput.value),
            hdbs_min_samples: parseInt(this.hdbsMinSamplesInput.value),
            hdbs_method: this.hdbsMethodSelect.value,
            hdbs_epsilon: parseFloat(this.hdbsEpsilonInput.value)
        };

        // Validate parameters
        if (params.u_dim < 1 || params.u_n < 1 || params.u_d < 0 ||
            params.hdbs_min_cluster_size < 1 || params.hdbs_min_samples < 1 ||
            params.hdbs_epsilon < 0) {
            this.showError('Invalid parameter values');
            return;
        }

        // Clear previous info
        this.clusterInfo.textContent = '';

        // Disable all inputs and show loading state
        const inputs = [
            this.uDimInput, this.uNInput, this.uDInput,
            this.hdbsMinClusterSizeInput, this.hdbsMinSamplesInput,
            this.hdbsMethodSelect, this.hdbsEpsilonInput
        ];
        inputs.forEach(input => input.disabled = true);
        this.generateClustersButton.disabled = true;
        this.generateClustersButton.classList.add('loading');

        try {
            const response = await fetch('/api/cluster', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    provider,
                    ...params
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate clusters');
            }

            const clusters = await response.json();
            
            // Update visualization with new clusters
            this.renderer.setData(this.renderer.points, clusters);
            
            // Show clusters
            const clusterToggle = document.getElementById('show-clusters');
            if (clusterToggle) {
                clusterToggle.parentElement.style.display = 'block';
                clusterToggle.checked = true;
            }
            this.renderer.toggleClusters(true);

            // Update info box
            this.clusterInfo.textContent = `Found ${clusters.metadata.num_clusters} clusters, ${clusters.metadata.noise_points} noise points`;
        } catch (error) {
            console.error('Failed to generate clusters:', error);
            this.showError('Failed to generate clusters');
            this.clusterInfo.textContent = 'Clustering failed';
        } finally {
            // Re-enable all inputs and remove loading state
            inputs.forEach(input => input.disabled = false);
            this.generateClustersButton.disabled = false;
            this.generateClustersButton.classList.remove('loading');
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