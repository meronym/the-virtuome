export class DataLoader {
    constructor() {
        this.cache = new Map();
        this.clusterCache = new Map();
        this.metadataCache = new Map();  // New cache for virtue metadata
        this.datasets = null;
        this.version = 'v2';  // Default version
    }
    
    async initialize() {
        // Load dataset metadata
        const response = await fetch('/data/datasets');
        this.datasets = await response.json();
        return this.datasets;
    }
    
    async loadDataset(provider, projectionType, variant = '') {
        const normalizedVariant = this.normalizeVariantName(variant);
        const cacheKey = `${provider}-${projectionType}-${normalizedVariant}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Handle variant filename
        let filename;
        if (normalizedVariant) {
            // If it already has .json, use as is, otherwise append it
            filename = normalizedVariant.endsWith('.json') ? 
                normalizedVariant : 
                `${normalizedVariant}.json`;
        } else {
            filename = `${projectionType}.json`;
        }

        const response = await fetch(`/data/${this.version}/${provider}/${projectionType}/${filename}`);
        if (!response.ok) {
            throw new Error(`Failed to load dataset: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        this.cache.set(cacheKey, data);
        return data;
    }
    
    async loadClusters(provider, projectionType, variant = '', algorithm = 'hdbscan') {
        const normalizedVariant = this.normalizeVariantName(variant);
        const cacheKey = `${provider}-${projectionType}-${normalizedVariant}-${algorithm}`;
        if (this.clusterCache.has(cacheKey)) {
            return this.clusterCache.get(cacheKey);
        }

        const baseFilename = normalizedVariant || projectionType;
        const response = await fetch(`/data/${this.version}/${provider}/${projectionType}/clusters/${algorithm}-${baseFilename}.json`);
        if (!response.ok) {
            console.warn(`No cluster data found for ${cacheKey}`);
            return null;
        }
        const data = await response.json();
        this.clusterCache.set(cacheKey, data);
        return data;
    }
    
    getAvailableVariants(provider, type) {
        if (!this.datasets || !this.datasets[provider]) {
            return [];
        }
        return this.datasets[provider][type] || [];
    }
    
    // Normalize variant names to handle decimal points consistently
    normalizeVariantName(variant) {
        if (!variant) return '';
        
        // Handle UMAP variants with parameters
        const match = variant.match(/umap-n(\d+)-d([\d.]+)(\.json)?/);
        if (match) {
            const n = match[1];
            // Don't normalize the decimal places, use the exact value from the file
            const d = match[2];
            return `umap-n${n}-d${d}${match[3] || ''}`;
        }
        
        return variant;
    }
    
    async loadVirtueMetadata(virtueId) {
        // Return cached metadata if available
        if (this.metadataCache.has(virtueId)) {
            return this.metadataCache.get(virtueId);
        }

        try {
            const response = await fetch(`/data/virtue/${virtueId}/metadata`);
            if (!response.ok) {
                console.warn(`Failed to load metadata for virtue ${virtueId}`);
                return null;
            }
            const metadata = await response.json();
            this.metadataCache.set(virtueId, metadata);
            return metadata;
        } catch (error) {
            console.error(`Error loading metadata for virtue ${virtueId}:`, error);
            return null;
        }
    }

    hasMetadata(virtueId) {
        return this.metadataCache.has(virtueId);
    }

    getMetadata(virtueId) {
        return this.metadataCache.get(virtueId) || null;
    }
    
    clearCache() {
        this.cache.clear();
        this.clusterCache.clear();
        this.metadataCache.clear();  // Clear metadata cache as well
    }
    
    // Get dataset info
    getDatasetInfo(provider, type, variant = null) {
        const normalizedVariant = this.normalizeVariantName(variant);
        const info = {
            provider,
            type,
            variant: normalizedVariant || 'default'
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
        
        if (normalizedVariant) {
            // Parse UMAP parameters from normalized variant
            const match = normalizedVariant.match(/umap-n(\d+)-d([\d.]+)/);
            if (match) {
                info.variantLabel = `n=${match[1]}, d=${match[2]}`;
            } else {
                info.variantLabel = normalizedVariant;
            }
        }
        
        return info;
    }
} 