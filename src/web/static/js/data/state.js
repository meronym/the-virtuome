export class AppState {
    constructor() {
        this.provider = 'voyage';
        this.type = 'pca';
        this.variant = null;
        this.points = null;
        this.selectedPoint = null;
        this.hoveredPoint = null;
        this.listeners = new Map();
        
        // Initialize from URL if available
        this.initFromUrl();
        
        // Listen for URL changes
        window.addEventListener('popstate', () => this.initFromUrl());
    }
    
    // State management
    async setProvider(provider) {
        if (this.provider !== provider) {
            this.provider = provider;
            this.updateUrl();
            this.emit('providerChanged', provider);
        }
    }
    
    async setType(type) {
        if (this.type !== type) {
            this.type = type;
            this.variant = null; // Reset variant when changing type
            this.updateUrl();
            this.emit('typeChanged', type);
        }
    }
    
    async setVariant(variant) {
        if (this.variant !== variant) {
            this.variant = variant;
            this.updateUrl();
            this.emit('variantChanged', variant);
        }
    }
    
    setPoints(points) {
        this.points = points;
        this.emit('pointsChanged', points);
    }
    
    setSelectedPoint(id) {
        if (this.selectedPoint !== id) {
            this.selectedPoint = id;
            this.emit('selectedPointChanged', id);
        }
    }
    
    setHoveredPoint(id) {
        if (this.hoveredPoint !== id) {
            this.hoveredPoint = id;
            this.emit('hoveredPointChanged', id);
        }
    }
    
    // URL management
    initFromUrl() {
        const params = new URLSearchParams(window.location.search);
        
        // Update state from URL parameters
        const provider = params.get('provider');
        const type = params.get('type');
        const variant = params.get('variant');
        
        if (provider) this.provider = provider;
        if (type) this.type = type;
        if (variant) this.variant = variant;
        
        // Notify listeners of initial state
        this.emit('providerChanged', this.provider);
        this.emit('typeChanged', this.type);
        this.emit('variantChanged', this.variant);
    }
    
    updateUrl() {
        const params = new URLSearchParams();
        params.set('provider', this.provider);
        params.set('type', this.type);
        if (this.variant) params.set('variant', this.variant);
        
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
    }
    
    // Event handling
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }
    
    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }
    
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            for (const callback of callbacks) {
                callback(data);
            }
        }
    }
    
    // Get current state
    getState() {
        return {
            provider: this.provider,
            type: this.type,
            variant: this.variant,
            points: this.points,
            selectedPoint: this.selectedPoint,
            hoveredPoint: this.hoveredPoint
        };
    }
} 