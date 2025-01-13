class TreeVisualizer {
    constructor() {
        this.treeData = null;
        this.colorMap = new Map();
        this.nodeElements = new Map(); // Store references to node elements
        this.pinnedNodes = new Set(); // Track pinned nodes
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

    // Get all descendant virtue names for a given node
    getDescendantVirtues(node) {
        const virtues = [];
        if (node.type === 'virtue') {
            virtues.push(node.name);
        }
        if (node.children) {
            for (const child of node.children) {
                virtues.push(...this.getDescendantVirtues(child));
            }
        }
        return virtues;
    }

    // Find node by name in the tree
    findNode(name, nodes = this.treeData) {
        for (const node of nodes) {
            if (node.name === name) return node;
            if (node.children) {
                const found = this.findNode(name, node.children);
                if (found) return found;
            }
        }
        return null;
    }

    // Get the most specific pinned ancestor for a virtue
    getMostSpecificPinnedAncestor(virtueName, nodes = this.treeData, depth = 0, pinnedAncestor = null) {
        for (const node of nodes) {
            // Check if this node is pinned and contains the virtue as a descendant
            if (this.pinnedNodes.has(node.name)) {
                const descendants = this.getAllDescendantNodes(node);
                if (descendants.includes(virtueName) || node.name === virtueName) {
                    // If we found a pinned node that contains our virtue, update pinnedAncestor if it's more specific
                    if (!pinnedAncestor || depth > pinnedAncestor.depth) {
                        pinnedAncestor = { node, depth };
                    }
                }
            }
            
            // Continue searching in children
            if (node.children) {
                const found = this.getMostSpecificPinnedAncestor(virtueName, node.children, depth + 1, pinnedAncestor);
                if (found) {
                    pinnedAncestor = found;
                }
            }
        }
        return pinnedAncestor;
    }

    // Get all descendant node names for a given node
    getAllDescendantNodes(node) {
        const descendants = [];
        if (node.children) {
            for (const child of node.children) {
                descendants.push(child.name);
                descendants.push(...this.getAllDescendantNodes(child));
            }
        }
        return descendants;
    }

    // Update highlighting for pinned nodes and their descendants
    updatePinnedHighlights() {
        // Clear all pinned classes first
        document.querySelectorAll('#tree-panel li').forEach(li => {
            li.classList.remove('pinned', 'pinned-descendant');
        });

        // Add highlighting for pinned nodes and their descendants
        this.pinnedNodes.forEach(pinnedNodeName => {
            const pinnedNode = this.findNode(pinnedNodeName);
            if (pinnedNode) {
                // Highlight the pinned node
                const pinnedElement = document.getElementById(`tree-node-${pinnedNodeName}`);
                if (pinnedElement) {
                    pinnedElement.classList.add('pinned');
                }

                // Highlight all descendants
                const descendants = this.getAllDescendantNodes(pinnedNode);
                descendants.forEach(descendantName => {
                    const descendantElement = document.getElementById(`tree-node-${descendantName}`);
                    if (descendantElement) {
                        descendantElement.classList.add('pinned-descendant');
                    }
                });
            }
        });
    }

    toggleNodePin(nodeName) {
        if (this.pinnedNodes.has(nodeName)) {
            this.pinnedNodes.delete(nodeName);
        } else {
            this.pinnedNodes.add(nodeName);
        }
        this.render(); // Re-render to update pin icons
        this.updatePinnedHighlights(); // Update highlighting
        // Emit event for canvas to update
        window.dispatchEvent(new CustomEvent('treePinsChanged'));
    }

    createTreeHTML(nodes, depth = 0) {
        if (!Array.isArray(nodes)) return '';
        
        return `<ul>${nodes.map(node => {
            const color = this.colorMap.get(node.name);
            const nodeId = `tree-node-${node.name}`;
            const isPinned = this.pinnedNodes.has(node.name);
            
            // Store reference for later use
            this.nodeElements.set(node.name, nodeId);
            
            return `
                <li id="${nodeId}">
                    <span class="color-dot${isPinned ? ' pinned' : ''}" style="background-color: ${color}" data-node="${node.name}">
                        ${isPinned ? '<i class="pin-icon">📌</i>' : ''}
                    </span>
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

        // Add click handlers for color dots
        panel.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const nodeName = dot.dataset.node;
                this.toggleNodePin(nodeName);
            });
        });

        // Update highlighting for pinned nodes
        this.updatePinnedHighlights();
    }
}

export default TreeVisualizer; 