export class AppState {
    constructor() {
        // Initialize from URL parameters
        const params = new URLSearchParams(window.location.search);
        this.state = {
            provider: params.get('provider') || 'voyage',
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
    
    updateURL() {
        const params = new URLSearchParams();
        if (this.state.provider) params.set('provider', this.state.provider);
        
        const newURL = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newURL);
    }
    
    async setSelectedVirtue(virtueId, dataLoader) {
        this.state.selectedVirtueId = virtueId;
        
        if (virtueId && !dataLoader.hasMetadata(virtueId)) {
            try {
                await dataLoader.loadVirtueMetadata(virtueId);
                if (this.onMetadataLoaded) {
                    this.onMetadataLoaded(virtueId);
                }
            } catch (error) {
                console.error('Failed to load virtue metadata:', error);
            }
        }
        
        if (this.onVirtueSelected) {
            this.onVirtueSelected(virtueId);
        }
    }
    
    async setHoveredVirtue(virtueId, dataLoader) {
        this.state.hoveredVirtueId = virtueId;
        
        if (virtueId && !dataLoader.hasMetadata(virtueId)) {
            try {
                await dataLoader.loadVirtueMetadata(virtueId);
                if (this.onMetadataLoaded) {
                    this.onMetadataLoaded(virtueId);
                }
            } catch (error) {
                console.error('Failed to load virtue metadata:', error);
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