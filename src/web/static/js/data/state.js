export class AppState {
    constructor() {
        // Initialize from URL parameters
        const params = new URLSearchParams(window.location.search);
        this.state = {
            provider: params.get('provider') || 'voyage',
            type: params.get('type') || 'pca',
            variant: params.get('variant') || ''
        };
        
        // Update URL to match state
        this.updateURL();
    }
    
    getState() {
        return { ...this.state };
    }
    
    setProvider(provider) {
        this.state.provider = provider;
        this.updateURL();
    }
    
    setType(type) {
        this.state.type = type;
        // Clear variant when changing type
        this.state.variant = '';
        this.updateURL();
    }
    
    setVariant(variant) {
        // Store variant exactly as provided
        this.state.variant = variant;
        this.updateURL();
    }
    
    updateURL() {
        const params = new URLSearchParams();
        if (this.state.provider) params.set('provider', this.state.provider);
        if (this.state.type) params.set('type', this.state.type);
        if (this.state.variant) params.set('variant', this.state.variant);
        
        const newURL = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newURL);
    }
} 