export class DataLoader {
    constructor() {
        this.cache = new Map();
        this.metadataCache = new Map();
        this.currentData = null;
        this.version = 'v2';  // Default version
    }
    
    async initialize() {
        // Load dataset metadata
        const response = await fetch('/data/datasets');
        this.datasets = await response.json();
        return this.datasets;
    }
    
    async loadDataset(provider) {
        // First try to use current data if available
        if (this.currentData) {
            return this.currentData;
        }
        
        // Otherwise load initial UMAP with default parameters
        const response = await fetch('/api/generate_umap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider,
                umap_n: 10,
                umap_d: 0.1
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load dataset: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        this.currentData = data;
        return data;
    }
    
    setCurrentData(data) {
        this.currentData = data;
    }
    
    async loadVirtueMetadata(virtueId) {
        if (this.metadataCache.has(virtueId)) {
            return this.metadataCache.get(virtueId);
        }

        const response = await fetch(`/data/virtue/${virtueId}/metadata`);
        if (!response.ok) {
            throw new Error(`Failed to load virtue metadata: ${response.status} ${response.statusText}`);
        }
        
        const metadata = await response.json();
        this.metadataCache.set(virtueId, metadata);
        return metadata;
    }
    
    hasMetadata(virtueId) {
        return this.metadataCache.has(virtueId);
    }
    
    getMetadata(virtueId) {
        return this.metadataCache.get(virtueId);
    }
    
    clearCache() {
        this.cache.clear();
        this.metadataCache.clear();
        this.currentData = null;
    }
} 