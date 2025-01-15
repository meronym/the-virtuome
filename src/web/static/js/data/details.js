// Details panel manager
export class DetailsPanel {
    constructor(dataLoader) {
        this.panel = document.getElementById('details');
        this.content = this.panel.querySelector('.content');
        this.closeBtn = this.panel.querySelector('.close');
        this.dataLoader = dataLoader;
        
        this.closeBtn.addEventListener('click', () => this.hide());
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide();
        });
    }
    
    async showVirtue(virtueId) {
        console.log('Showing virtue:', virtueId);
        try {
            // Show loading state
            this.content.innerHTML = '<div class="loading">Loading...</div>';
            this.show();
            
            // Load virtue content
            const response = await fetch(`/data/virtue/${virtueId}`);
            if (!response.ok) {
                throw new Error(`Failed to load virtue: ${response.statusText}`);
            }
            const data = await response.json();
            
            // Extract frontmatter and content
            const frontmatter = this._extractFrontmatter(data.content);
            const mainContent = data.content.replace(/^---[\s\S]*?---/, '').trim();
            
            // Try to get metadata from cache first, if not available, load it
            let metadata = this.dataLoader.getMetadata(virtueId);
            if (!metadata) {
                metadata = await this.dataLoader.loadVirtueMetadata(virtueId);
            }
            
            // Format the content with metadata
            this.content.innerHTML = `
                <div class="virtue-header">
                    <h1>${metadata?.title || frontmatter.virtue || virtueId}</h1>
                    ${metadata?.tradition ? `<h2 class="tradition">${metadata.tradition}</h2>` : ''}
                </div>
                <div class="virtue-metadata">
                    ${metadata?.definition ? `
                        <div class="definition">
                            <h3>Definition</h3>
                            <p>${metadata.definition}</p>
                        </div>
                    ` : ''}
                    ${metadata?.key_aspects?.length ? `
                        <div class="key-aspects">
                            <h3>Key Aspects</h3>
                            <ul>
                                ${metadata.key_aspects.map(aspect => `<li>${aspect}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                <div class="virtue-content">
                    ${this._formatContent(mainContent)}
                </div>
            `;
            
            // Add styles if not already present
            if (!document.querySelector('#details-panel-styles')) {
                const styles = document.createElement('style');
                styles.id = 'details-panel-styles';
                styles.textContent = `
                    .virtue-header { margin-bottom: 1.5rem; }
                    .virtue-header h1 { margin-bottom: 0.5rem; }
                    .virtue-header .tradition { 
                        color: var(--text-muted);
                        font-weight: normal;
                        margin-top: 0;
                    }
                    .virtue-metadata {
                        background: var(--bg-subtle);
                        border-radius: 8px;
                        padding: 1rem;
                        margin-bottom: 1.5rem;
                    }
                    .virtue-metadata h3 {
                        font-size: 1rem;
                        margin: 0 0 0.5rem 0;
                    }
                    .virtue-metadata .definition {
                        margin-bottom: 1rem;
                    }
                    .virtue-metadata .definition p {
                        margin: 0;
                    }
                    .virtue-metadata .key-aspects ul {
                        margin: 0;
                        padding-left: 1.5rem;
                    }
                    .virtue-metadata .key-aspects li {
                        margin: 0.25rem 0;
                    }
                `;
                document.head.appendChild(styles);
            }
            
        } catch (error) {
            console.error('Error loading virtue:', error);
            this.content.innerHTML = `
                <div class="error">
                    <h3>Error Loading Virtue Data</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
    
    _extractFrontmatter(content) {
        const match = content.match(/^---([\s\S]*?)---/);
        if (!match) return {};
        
        const frontmatter = {};
        const lines = match[1].trim().split('\n');
        
        for (const line of lines) {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length) {
                frontmatter[key.trim()] = valueParts.join(':').trim();
            }
        }
        
        return frontmatter;
    }
    
    _formatContent(content) {
        return content
            // Headers
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            // Lists
            .replace(/^\* (.*$)/gm, '<li>$1</li>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
            // Paragraphs
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(?!<[hpul])/gm, '<p>')
            .replace(/([^>])$/gm, '$1</p>')
            // Clean up
            .replace(/<p>\s*<\/p>/g, '');
    }
    
    show() {
        console.log('Showing details panel'); // Debug log
        this.panel.classList.add('visible');
    }
    
    hide() {
        console.log('Hiding details panel'); // Debug log
        this.panel.classList.remove('visible');
    }
} 