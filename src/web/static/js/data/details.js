// Details panel manager
export class DetailsPanel {
    constructor() {
        this.panel = document.getElementById('details');
        this.content = this.panel.querySelector('.content');
        this.closeBtn = this.panel.querySelector('.close');
        
        this.closeBtn.addEventListener('click', () => this.hide());
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide();
        });
    }
    
    async showVirtue(virtueId) {
        console.log('Showing virtue:', virtueId); // Debug log
        try {
            // Show loading state
            this.content.innerHTML = '<div class="loading">Loading...</div>';
            this.show();
            
            const response = await fetch(`/data/virtue/${virtueId}`);
            if (!response.ok) {
                throw new Error(`Failed to load virtue: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Loaded virtue data:', data); // Debug log
            
            // Extract frontmatter
            const frontmatter = this._extractFrontmatter(data.content);
            const mainContent = data.content.replace(/^---[\s\S]*?---/, '').trim();
            
            // Format the content
            this.content.innerHTML = `
                <div class="virtue-header">
                    <h1>${frontmatter.virtue || virtueId}</h1>
                    ${frontmatter.tradition ? `<h2>${frontmatter.tradition}</h2>` : ''}
                </div>
                <div class="virtue-content">
                    ${this._formatContent(mainContent)}
                </div>
            `;
            
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