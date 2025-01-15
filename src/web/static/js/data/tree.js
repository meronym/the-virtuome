import { DetailsPanel } from './details.js';

class TreeVisualizer {
    constructor(dataLoader, detailsPanel) {
        this.treeData = null;
        this.colorMap = new Map();
        this.nodeElements = new Map(); // Store references to node elements
        this.pinnedNodes = new Set(); // Track pinned nodes
        this.highlightedNode = null; // Track currently highlighted node
        this.dataLoader = dataLoader;
        this.details = detailsPanel;
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
        const color = window.virtueColors?.get(virtueName);
        if (!color) return { h: 210, s: 70, l: 70 };
        return color;
    }

    assignColors(nodes, startHue, endHue, depth = 0) {
        if (!Array.isArray(nodes)) return;

        const hueStep = (endHue - startHue) / nodes.length;
        
        nodes.forEach((node, index) => {
            const nodeHue = startHue + (hueStep * index);
            
            // Adjust saturation and brightness based on depth
            const saturation = 70; // Base saturation
            const brightness = Math.max(85 - (depth * 10), 50); // Decrease brightness with depth
            
            // Store HSL values as an object instead of a string
            this.colorMap.set(node.name, {
                h: nodeHue,
                s: saturation,
                l: brightness
            });
            
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
        // Store the currently highlighted node's ID before making changes
        const highlightedElement = document.querySelector('#tree-panel .highlighted');
        const highlightedId = highlightedElement?.id;

        // Clear only pinned classes, preserve highlighted
        document.querySelectorAll('#tree-panel li').forEach(li => {
            // Remove only pin-related classes
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

        // Restore the highlighted state if it was present
        if (highlightedId && this.highlightedNode) {
            const element = document.getElementById(highlightedId);
            if (element) {
                const color = this.colorMap.get(this.highlightedNode);
                if (color) {
                    const bgColor = `hsla(${color.h}, ${Math.min(color.s + 10, 100)}%, ${Math.min(color.l + 25, 95)}%, 0.2)`;
                    const textColor = this.getTextColor(color);
                    
                    element.classList.add('highlighted');
                    element.style.backgroundColor = bgColor;
                    const span = element.querySelector('span:not(.color-dot)');
                    if (span) {
                        span.style.color = textColor;
                    }
                }
            }
        }
    }

    toggleNodePin(nodeName) {
        if (this.pinnedNodes.has(nodeName)) {
            this.pinnedNodes.delete(nodeName);
        } else {
            this.pinnedNodes.add(nodeName);
        }
        
        // Update pin icons without full re-render
        const element = document.getElementById(`tree-node-${nodeName}`);
        if (element) {
            const dot = element.querySelector('.color-dot');
            if (dot) {
                if (this.pinnedNodes.has(nodeName)) {
                    dot.classList.add('pinned');
                    dot.innerHTML = '<i class="pin-icon">📌</i>';
                } else {
                    dot.classList.remove('pinned');
                    dot.innerHTML = '';
                }
            }
        }
        
        this.updatePinnedHighlights(); // Update highlighting
        // Emit event for canvas to update
        window.dispatchEvent(new CustomEvent('treePinsChanged'));
    }

    // Helper function to calculate text color from base color
    getTextColor(baseColor) {
        if (!baseColor) return null;
        return `hsl(${baseColor.h}, ${Math.min(baseColor.s + 15, 100)}%, ${Math.max(baseColor.l - 25, 25)}%)`;
    }

    createTreeHTML(nodes, depth = 0) {
        if (!Array.isArray(nodes)) return '';

        return `<ul>${nodes.map(node => {
            const color = this.colorMap.get(node.name);
            const colorStr = color ? `hsl(${color.h}, ${color.s}%, ${color.l}%)` : 'hsl(210, 70%, 70%)';
            const nodeId = `tree-node-${node.name}`;
            const isPinned = this.pinnedNodes.has(node.name);
            
            // Store reference for later use
            this.nodeElements.set(node.name, nodeId);
            
            // Calculate text color for hover state
            const textColor = color ? 
                `hsl(${color.h}, ${Math.min(color.s + 20, 100)}%, ${Math.max(color.l - 20, 30)}%)` : 
                'hsl(210, 90%, 50%)';
            
            return `
                <li id="${nodeId}">
                    <span class="color-dot${isPinned ? ' pinned' : ''}" style="background-color: ${colorStr}" data-node="${node.name}">
                        ${isPinned ? '<i class="pin-icon">📌</i>' : ''}
                    </span>
                    <span style="--hover-color: ${textColor}">${node.name}</span>
                    ${node.children ? this.createTreeHTML(node.children, depth + 1) : ''}
                </li>
            `;
        }).join('')}</ul>`;
    }

    async highlightNode(nodeName) {
        // If the same node is already highlighted, don't do anything
        if (this.highlightedNode === nodeName) {
            return;
        }

        // Remove previous highlight
        const highlighted = document.querySelector('#tree-panel .highlighted');
        if (highlighted) {
            highlighted.classList.remove('highlighted');
            highlighted.style.backgroundColor = '';
            const span = highlighted.querySelector('span:not(.color-dot)');
            if (span) {
                span.style.color = '';
            }
        }

        // Store new highlighted node
        this.highlightedNode = nodeName;

        if (nodeName) {
            // Find and highlight new node
            const element = document.getElementById(`tree-node-${nodeName}`);
            if (element) {
                const color = this.colorMap.get(nodeName);
                if (color) {
                    const bgColor = `hsla(${color.h}, ${Math.min(color.s + 10, 100)}%, ${Math.min(color.l + 25, 95)}%, 0.2)`;
                    const textColor = this.getTextColor(color);
                    
                    element.classList.add('highlighted');
                    element.style.backgroundColor = bgColor;
                    const span = element.querySelector('span:not(.color-dot)');
                    if (span) {
                        span.style.color = textColor;
                    }
                }

                // Scroll node into view
                const treePanel = document.getElementById('tree-panel');
                if (treePanel) {
                    // Expand all parent <ul> elements to ensure the node is visible
                    let parent = element.parentElement;
                    while (parent && parent !== treePanel) {
                        if (parent.tagName === 'UL') {
                            parent.style.display = 'block';
                        }
                        parent = parent.parentElement;
                    }

                    // Get the element's position relative to the tree panel
                    const elementRect = element.getBoundingClientRect();
                    const treePanelRect = treePanel.getBoundingClientRect();
                    
                    // Calculate relative position and adjust scroll
                    const relativeTop = elementRect.top - treePanelRect.top + treePanel.scrollTop;
                    const targetScroll = relativeTop - (treePanelRect.height / 2) + (elementRect.height / 2);
                    
                    // Smooth scroll to position
                    treePanel.scrollTo({
                        top: Math.max(0, targetScroll),
                        behavior: 'smooth'
                    });
                }
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

        // Add click handlers for virtue names
        panel.querySelectorAll('li').forEach(li => {
            const nameSpan = li.querySelector('span:not(.color-dot)');
            if (nameSpan) {
                nameSpan.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const virtueName = nameSpan.textContent.trim();
                    // Only handle clicks for virtue nodes
                    const node = this.findNode(virtueName);
                    if (node && node.type === 'virtue') {
                        // Highlight the node in the tree
                        this.highlightNode(virtueName);
                        // Trigger the same behavior as clicking on canvas
                        const canvas = document.getElementById('visualization');
                        const renderer = canvas.__renderer;
                        if (renderer) {
                            renderer.setSelectedPoint(virtueName);
                        }
                        // Use the shared details panel instance
                        this.details.showVirtue(virtueName);
                    }
                });
            }
        });

        // Update highlighting for pinned nodes
        this.updatePinnedHighlights();

        // Restore highlighted node if there was one
        if (this.highlightedNode) {
            this.highlightNode(this.highlightedNode);
        }
    }
}

export { TreeVisualizer }; 