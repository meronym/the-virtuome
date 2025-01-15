import { TreeVisualizer } from '../data/tree.js';

export class CanvasRenderer {
    constructor(canvas, transform) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.transform = transform;
        this.points = null;
        this.clusters = null;
        this.hoveredPoint = null;
        this.selectedPoint = null;
        this.showClusters = false;
        this.clusterColors = null;
        this.listeners = new Map();
        this.animationFrame = null;
        this.pointRadius = 4;  // Base point radius
        this.clusterRadius = 16;  // Base cluster radius in screen pixels (6x point radius)
        
        // Generate initial set of cluster colors
        this.generateClusterColors(20);  // Pre-generate some colors
        
        // Store reference to this renderer on the canvas element
        canvas.__renderer = this;
        
        // Bind to transform changes
        this.transform.addListener(() => this.render());
        
        // Setup resize handling
        this.setupResizeHandler();
        this.resize();

        // Listen for tree pin changes
        window.addEventListener('treePinsChanged', () => this.render());
    }
    
    // Event emitter methods
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
    
    setupResizeHandler() {
        const resizeObserver = new ResizeObserver(() => {
            this.resize();
            this.render();
        });
        resizeObserver.observe(this.canvas);
    }
    
    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    
    generateClusterColors(n) {
        // Generate visually distinct colors using HSL
        this.clusterColors = Array.from({length: n}, (_, i) => {
            const hue = (i * 137.508) % 360; // Golden angle in degrees
            return {
                fill: `hsla(${hue}, 70%, 60%, 0.2)`,  // More opaque for better visibility
                stroke: `hsla(${hue}, 70%, 60%, 0.3)`   // Slightly more visible edges
            };
        });
        // Add color for noise points (-1)
        this.clusterColors[-1] = {
            fill: 'rgba(150, 150, 150, 0.05)',
            stroke: 'rgba(150, 150, 150, 0.1)'
        };
    }
    
    drawClusterBackground(x, y, cluster) {
        const ctx = this.ctx;
        // Use data coordinates directly - no need to divide by scale
        const radius = this.clusterRadius;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        
        const colors = this.clusterColors[cluster] || this.clusterColors[-1];  // Fallback to noise colors
        ctx.fillStyle = colors.fill;
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 0.001;  // Very thin line in data coordinates
        
        ctx.fill();
        ctx.stroke();
    }
    
    setData(points, clusters = null) {
        this.points = points;
        this.clusters = clusters;
        if (clusters && clusters.metadata.num_clusters > this.clusterColors.length) {
            this.generateClusterColors(clusters.metadata.num_clusters);
        }
        this.render();
    }
    
    toggleClusters(show) {
        this.showClusters = show;
        this.render();
    }
    
    drawPoint(x, y, pointId, skipLabel = false) {
        const radius = this.selectedPoint === pointId ? this.pointRadius * 1.5 : this.pointRadius;
        const ctx = this.ctx;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        
        // Use original color logic based on point state
        if (pointId === this.selectedPoint) {
            // Selected point: larger with glow and color variations
            const baseColor = TreeVisualizer.getColor(pointId);
            
            // Create color variations with more pronounced differences
            const glowColor = `hsl(${baseColor.h}, ${Math.min(baseColor.s + 20, 100)}%, ${Math.min(baseColor.l + 5, 90)}%)`;
            const fillColor = `hsl(${baseColor.h}, ${Math.min(baseColor.s + 25, 100)}%, ${baseColor.l}%)`;
            const borderColor = `hsl(${baseColor.h}, ${Math.min(baseColor.s + 15, 100)}%, ${Math.max(baseColor.l - 15, 20)}%)`;
            
            // Draw outer glow
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // Fill with more saturated base color
            ctx.fillStyle = fillColor;
            ctx.fill();
            
            // Add darker border of the same hue
            ctx.lineWidth = 2;
            ctx.strokeStyle = borderColor;
            ctx.stroke();
            
            // Add subtle outer ring
            ctx.beginPath();
            ctx.arc(x, y, radius * 1.2, 0, Math.PI * 2);
            ctx.strokeStyle = glowColor.replace(')', ', 0.3)').replace('hsl', 'hsla');
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Reset shadow for other points
            ctx.shadowBlur = 0;
            return; // Exit early as we've handled all rendering for selected point
        } else if (pointId === this.hoveredPoint) {
            // Hovered point: brighter with glow
            const baseColor = TreeVisualizer.getColor(pointId);
            ctx.fillStyle = `hsl(${baseColor.h}, ${baseColor.s}%, ${baseColor.l}%)`;
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            
            // Add outer glow
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            ctx.shadowBlur = 8;
        } else {
            // Normal point: use tree color with some transparency
            const baseColor = TreeVisualizer.getColor(pointId);
            ctx.fillStyle = `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.l}%, 0.7)`;
        }
        
        // Fill the point
        ctx.fill();
        
        // Add stroke for hovered points
        if (pointId === this.hoveredPoint) {
            ctx.stroke();
        }
        
        // Reset shadow effects
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // Draw label if needed (and not skipping labels)
        if (!skipLabel && pointId === this.hoveredPoint) {  // Only show label on hover
            this.drawLabel(x, y, pointId, radius);
        }
    }

    drawLabel(x, y, pointId, radius) {
        const ctx = this.ctx;
        const labelPadding = 6;  // Increased padding
        const labelHeight = 24;   // Increased height for larger font
        
        // Use larger font
        ctx.font = '14px system-ui, -apple-system, sans-serif';  // System font for better rendering
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // Measure text for background
        const metrics = ctx.measureText(pointId);
        const labelWidth = metrics.width + labelPadding * 2;
        
        // Check if we're in dark mode
        const isDarkMode = document.documentElement.classList.contains('dark');
        
        // Theme-aware colors
        const bgColor = isDarkMode ? 
            'rgba(0, 0, 0, 0.85)' : 
            'rgba(255, 255, 255, 0.95)';
        const textColor = isDarkMode ? 
            'rgba(255, 255, 255, 0.95)' : 
            'rgba(0, 0, 0, 0.95)';
        const borderColor = isDarkMode ?
            'rgba(255, 255, 255, 0.2)' :
            'rgba(0, 0, 0, 0.1)';
            
        // Draw background with border
        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        
        const labelX = x + radius + 6;
        const labelY = y - labelHeight/2;
        
        // Draw background with rounded corners
        const cornerRadius = 4;
        ctx.beginPath();
        ctx.moveTo(labelX + cornerRadius, labelY);
        ctx.lineTo(labelX + labelWidth - cornerRadius, labelY);
        ctx.quadraticCurveTo(labelX + labelWidth, labelY, labelX + labelWidth, labelY + cornerRadius);
        ctx.lineTo(labelX + labelWidth, labelY + labelHeight - cornerRadius);
        ctx.quadraticCurveTo(labelX + labelWidth, labelY + labelHeight, labelX + labelWidth - cornerRadius, labelY + labelHeight);
        ctx.lineTo(labelX + cornerRadius, labelY + labelHeight);
        ctx.quadraticCurveTo(labelX, labelY + labelHeight, labelX, labelY + labelHeight - cornerRadius);
        ctx.lineTo(labelX, labelY + cornerRadius);
        ctx.quadraticCurveTo(labelX, labelY, labelX + cornerRadius, labelY);
        ctx.closePath();
        
        // Add subtle shadow
        ctx.shadowColor = isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        
        ctx.fill();
        ctx.shadowColor = 'transparent';  // Reset shadow before stroke
        ctx.stroke();
        
        // Draw text
        ctx.fillStyle = textColor;
        ctx.fillText(pointId, labelX + labelPadding, y);
    }

    render() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.animationFrame = requestAnimationFrame(() => {
            const { width, height } = this.canvas.getBoundingClientRect();
            
            // Clear canvas
            this.ctx.clearRect(0, 0, width, height);
            
            // Skip if no points data
            if (!this.points) return;
            
            // Convert points object to entries if it's not already a Map
            const pointEntries = this.points instanceof Map ? 
                this.points : 
                Object.entries(this.points);
            
            // First pass: Draw cluster backgrounds if enabled
            if (this.showClusters && this.clusters) {
                for (const [id, point] of pointEntries) {
                    // Convert to screen coordinates like we do for points
                    const [screenX, screenY] = this.transform.toScreen(point.x, point.y);
                    
                    // Use wider padding for cluster backgrounds
                    const padding = this.clusterRadius;  // No need to scale padding
                    if (screenX < -padding || screenX > width + padding ||
                        screenY < -padding || screenY > height + padding) {
                        continue;
                    }

                    const cluster = this.clusters.points[id]?.cluster ?? -1;
                    
                    // Draw cluster background in screen coordinates
                    const ctx = this.ctx;
                    const radius = this.clusterRadius;  // No need to scale radius
                    
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
                    
                    const colors = this.clusterColors[cluster] || this.clusterColors[-1];
                    ctx.fillStyle = colors.fill;
                    ctx.strokeStyle = colors.stroke;
                    ctx.lineWidth = 0.5;  // Thinner line for subtler edges
                    
                    ctx.fill();
                    ctx.stroke();
                }
            }
            
            // Second pass: Draw halos for pinned nodes' descendants
            for (const [id, point] of pointEntries) {
                const [screenX, screenY] = this.transform.toScreen(point.x, point.y);
                
                // Skip points outside viewport with padding
                const padding = 8; // Larger padding for halos
                if (screenX < -padding || screenX > width + padding ||
                    screenY < -padding || screenY > height + padding) {
                    continue;
                }

                // Check if this point is a descendant of any pinned node
                const treeViz = document.querySelector('#tree-panel')?.__treeViz;
                if (treeViz) {
                    const pinnedAncestor = treeViz.getMostSpecificPinnedAncestor(id);
                    if (pinnedAncestor) {
                        const haloColor = treeViz.colorMap.get(pinnedAncestor.node.name);
                        if (haloColor) {
                            // Draw halo
                            this.ctx.beginPath();
                            this.ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
                            this.ctx.strokeStyle = `hsla(${haloColor.h}, ${haloColor.s}%, ${haloColor.l}%, 0.5)`;
                            this.ctx.lineWidth = 4;
                            
                            // Add glow effect
                            this.ctx.shadowColor = `hsla(${haloColor.h}, ${haloColor.s}%, ${haloColor.l}%, 0.4)`;
                            this.ctx.shadowBlur = 8;
                            this.ctx.shadowOffsetX = 0;
                            this.ctx.shadowOffsetY = 0;
                            
                            this.ctx.stroke();
                            
                            // Reset shadow for other elements
                            this.ctx.shadowBlur = 0;
                            this.ctx.shadowColor = 'transparent';
                        }
                    }
                }
            }
            
            // Third pass: Draw all points (without labels)
            for (const [id, point] of pointEntries) {
                const [screenX, screenY] = this.transform.toScreen(point.x, point.y);
                
                // Skip points outside viewport
                const padding = 4;
                if (screenX < -padding || screenX > width + padding ||
                    screenY < -padding || screenY > height + padding) {
                    continue;
                }
                
                this.drawPoint(screenX, screenY, id, true);  // Skip labels in this pass
            }

            // Fourth pass: Draw label for hovered point only
            if (this.hoveredPoint) {
                const point = this.points[this.hoveredPoint];
                if (point) {
                    const [screenX, screenY] = this.transform.toScreen(point.x, point.y);
                    const radius = this.hoveredPoint === this.selectedPoint ? 
                        this.pointRadius * 1.5 : this.pointRadius;
                    this.drawLabel(screenX, screenY, this.hoveredPoint, radius);
                }
            }
        });
    }
    
    // Find point under cursor
    getPointAt(x, y) {
        if (!this.points) return null;
        
        const rect = this.canvas.getBoundingClientRect();
        const scale = window.devicePixelRatio;
        const canvasX = (x - rect.left) * scale;
        const canvasY = (y - rect.top) * scale;
        const [dataX, dataY] = this.transform.toData(canvasX / scale, canvasY / scale);
        
        // Find closest point within threshold
        let closestPoint = null;
        let closestDistance = Infinity;
        const threshold = (this.pointRadius * 2) / this.transform.scale;
        
        // Convert points object to entries if it's not already a Map
        const pointEntries = this.points instanceof Map ? 
            this.points : 
            Object.entries(this.points);
        
        for (const [id, point] of pointEntries) {
            const dx = point.x - dataX;
            const dy = point.y - dataY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < threshold && distance < closestDistance) {
                closestPoint = id;
                closestDistance = distance;
            }
        }
        
        // Update cursor style based on whether we found a point
        this.canvas.style.cursor = closestPoint ? 'pointer' : 'grab';
        
        return closestPoint;
    }
    
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
} 