export class AppState {
    constructor() {
        // Initialize from URL parameters
        const params = new URLSearchParams(window.location.search);
        this.state = {
            provider: params.get('provider') || 'voyage',
            type: params.get('type') || 'pca',
            variant: params.get('variant') || '',
            selectedVirtueId: null,
            hoveredVirtueId: null
        };
        
        // Event handlers for metadata state changes
        this.onMetadataLoaded = null;
        this.onVirtueSelected = null;
        this.onVirtueHovered = null;
        
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

    async setSelectedVirtue(virtueId, dataLoader) {
        this.state.selectedVirtueId = virtueId;
        
        if (virtueId && !dataLoader.hasMetadata(virtueId)) {
            const metadata = await dataLoader.loadVirtueMetadata(virtueId);
            if (metadata && this.onMetadataLoaded) {
                this.onMetadataLoaded(virtueId, metadata);
            }
        }
        
        if (this.onVirtueSelected) {
            this.onVirtueSelected(virtueId);
        }
    }

    async setHoveredVirtue(virtueId, dataLoader) {
        this.state.hoveredVirtueId = virtueId;
        
        if (virtueId && !dataLoader.hasMetadata(virtueId)) {
            const metadata = await dataLoader.loadVirtueMetadata(virtueId);
            if (metadata && this.onMetadataLoaded) {
                this.onMetadataLoaded(virtueId, metadata);
            }
        }
        
        if (this.onVirtueHovered) {
            this.onVirtueHovered(virtueId);
        }
    }

    getSelectedVirtue() {
        return this.state.selectedVirtueId;
    }

    getHoveredVirtue() {
        return this.state.hoveredVirtueId;
    }

    // Event handler setters
    setOnMetadataLoaded(handler) {
        this.onMetadataLoaded = handler;
    }

    setOnVirtueSelected(handler) {
        this.onVirtueSelected = handler;
    }

    setOnVirtueHovered(handler) {
        this.onVirtueHovered = handler;
    }
} 