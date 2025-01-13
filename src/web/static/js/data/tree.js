class TreeVisualizer {
    constructor() {
        this.treeData = null;
        this.colorMap = new Map();
        this.nodeElements = new Map(); // Store references to node elements
    }

    async loadTree() {
        const response = await fetch('/data/raw/v1/tree.json');
        this.treeData = await response.json();
        this.assignColors(this.treeData, 0, 360); // Full hue spectrum
        this.render();
        
        // Make the color map globally accessible
        window.virtueColors = this.colorMap;
    }

    // Get color for a virtue, defaulting to a fallback color if not found
    static getColor(virtueName) {
        return window.virtueColors?.get(virtueName) || 'hsl(210, 70%, 70%)';
    }

    assignColors(nodes, startHue, endHue, depth = 0) {
        if (!Array.isArray(nodes)) return;

        const hueStep = (endHue - startHue) / nodes.length;
        
        nodes.forEach((node, index) => {
            const nodeHue = startHue + (hueStep * index);
            
            // Adjust saturation and brightness based on depth
            const saturation = 70; // Base saturation
            const brightness = Math.max(85 - (depth * 10), 50); // Decrease brightness with depth
            
            this.colorMap.set(node.name, `hsl(${nodeHue}, ${saturation}%, ${brightness}%)`);
            
            if (node.children) {
                this.assignColors(
                    node.children,
                    nodeHue,
                    nodeHue + hueStep,
                    depth + 1
                );
            }
        });
    }

    createTreeHTML(nodes, depth = 0) {
        if (!Array.isArray(nodes)) return '';
        
        return `<ul>${nodes.map(node => {
            const color = this.colorMap.get(node.name);
            const nodeId = `tree-node-${node.name}`;
            
            // Store reference for later use
            this.nodeElements.set(node.name, nodeId);
            
            return `
                <li id="${nodeId}">
                    <span class="color-dot" style="background-color: ${color}"></span>
                    <span>${node.name}</span>
                    ${node.children ? this.createTreeHTML(node.children, depth + 1) : ''}
                </li>
            `;
        }).join('')}</ul>`;
    }

    highlightNode(nodeName) {
        // Remove previous highlight
        const highlighted = document.querySelector('#tree-panel .highlighted');
        if (highlighted) {
            highlighted.classList.remove('highlighted');
        }

        // Add new highlight
        const nodeId = this.nodeElements.get(nodeName);
        if (nodeId) {
            const element = document.getElementById(nodeId);
            if (element) {
                element.classList.add('highlighted');
                // Scroll into view with some padding
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    render() {
        const panel = document.getElementById('tree-panel');
        if (!panel) return;
        
        this.nodeElements.clear(); // Clear previous references
        panel.innerHTML = this.createTreeHTML(this.treeData);
    }
}

export default TreeVisualizer; 