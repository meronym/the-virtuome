// Details panel manager
export class DetailsPanel {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.panel = document.getElementById('virtue-preview');
        this.content = this.panel.querySelector('.content');
        
        // Initialize state
        this.currentVirtueId = null;
        this.isLoading = false;
        this.isVisible = false;
    }
    
    async showVirtue(virtueId) {
        if (!virtueId) {
            this.hide();
            return;
        }
        
        this.currentVirtueId = virtueId;
        this.show();
        
        try {
            this.isLoading = true;
            this.content.innerHTML = '<div class="loading">Loading...</div>';
            
            const metadata = await this.dataLoader.loadVirtueMetadata(virtueId);
            if (!metadata) {
                throw new Error('Failed to load virtue metadata');
            }
            
            // Only update if this is still the current virtue
            if (this.currentVirtueId === virtueId) {
                this.renderVirtue(metadata);
            }
        } catch (error) {
            console.error('Failed to load virtue details:', error);
            this.content.innerHTML = `
                <div class="error">
                    <h3>Error</h3>
                    <p>Failed to load virtue details</p>
                </div>
            `;
        } finally {
            this.isLoading = false;
        }
    }
    
    renderVirtue(metadata) {
        const content = `
            <div class="virtue-header">
                <h1>${metadata.name}</h1>
                <h2>${metadata.tradition}</h2>
            </div>
            <div class="virtue-content">
                <h2>Definition</h2>
                <p>${metadata.definition}</p>
                ${this.renderKeyAspects(metadata)}
                ${this.renderHistoricalDevelopment(metadata)}
                ${this.renderContemporaryRelevance(metadata)}
                ${this.renderNotableQuotes(metadata)}
                ${this.renderRelatedPractices(metadata)}
            </div>
        `;
        
        this.content.innerHTML = content;
    }
    
    renderKeyAspects(metadata) {
        if (!metadata.key_aspects?.length) return '';
        
        return `
            <h2>Key Aspects</h2>
            <ul>
                ${metadata.key_aspects.map(aspect => `<li>${aspect}</li>`).join('')}
            </ul>
        `;
    }
    
    renderHistoricalDevelopment(metadata) {
        if (!metadata.historical_development) return '';
        
        return `
            <h2>Historical Development</h2>
            <p>${metadata.historical_development}</p>
        `;
    }
    
    renderContemporaryRelevance(metadata) {
        if (!metadata.contemporary_relevance) return '';
        
        return `
            <h2>Contemporary Relevance</h2>
            <p>${metadata.contemporary_relevance}</p>
        `;
    }
    
    renderNotableQuotes(metadata) {
        if (!metadata.notable_quotes?.length) return '';
        
        return `
            <h2>Notable Quotes</h2>
            <ul>
                ${metadata.notable_quotes.map(quote => `<li>${quote}</li>`).join('')}
            </ul>
        `;
    }
    
    renderRelatedPractices(metadata) {
        if (!metadata.related_practices?.length) return '';
        
        return `
            <h2>Related Practices</h2>
            <ul>
                ${metadata.related_practices.map(practice => `<li>${practice}</li>`).join('')}
            </ul>
        `;
    }
    
    show() {
        if (!this.isVisible) {
            this.panel.classList.remove('hidden');
            this.isVisible = true;
        }
    }
    
    hide() {
        if (this.isVisible) {
            this.panel.classList.add('hidden');
            this.isVisible = false;
            this.currentVirtueId = null;
        }
    }
} 