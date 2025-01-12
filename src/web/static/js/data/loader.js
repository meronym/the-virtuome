export class DataLoader {
    constructor() {
        this.cache = new Map();
        this.datasets = null;
    }
    
    async initialize() {
        // Load dataset metadata
        const response = await fetch('/data/datasets');
        this.datasets = await response.json();
        return this.datasets;
    }
    
    async loadDataset(provider, type, variant = null) {
        const cacheKey = `${provider}/${type}/${variant || 'default'}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        // Construct path based on type and variant
        let path;
        if (type === 'pca') {
            path = `/data/${provider}/pca/pca.json`;
        } else if (type === 'umap') {
            path = `/data/${provider}/umap/${variant || 'umap.json'}`;
        } else {
            throw new Error(`Unknown dataset type: ${type}`);
        }
        
        // Load data
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Cache the result
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error(`Failed to load dataset: ${path}`, error);
            throw error;
        }
    }
    
    getAvailableVariants(provider, type) {
        if (!this.datasets || !this.datasets[provider]) {
            return [];
        }
        return this.datasets[provider][type] || [];
    }
    
    clearCache() {
        this.cache.clear();
    }
    
    // Get dataset info
    getDatasetInfo(provider, type, variant = null) {
        const info = {
            provider,
            type,
            variant: variant || 'default'
        };
        
        // Add human-readable labels
        info.providerLabel = {
            'voyage': 'Voyage AI',
            'openai': 'OpenAI',
            'cohere': 'Cohere'
        }[provider] || provider;
        
        info.typeLabel = {
            'pca': 'PCA',
            'umap': 'UMAP'
        }[type] || type;
        
        if (variant) {
            // Parse UMAP parameters from filename
            const match = variant.match(/umap-n(\d+)-d([\d.]+)\.json/);
            if (match) {
                info.variantLabel = `n=${match[1]}, d=${match[2]}`;
            } else {
                info.variantLabel = variant.replace(/\.json$/, '');
            }
        }
        
        return info;
    }
} 