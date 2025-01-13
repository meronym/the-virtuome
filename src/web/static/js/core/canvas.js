import { TreeVisualizer } from '../data/tree.js';

export class CanvasRenderer {
    constructor(canvas, transform) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.transform = transform;
        this.points = new Map();
        this.hoveredPoint = null;
        this.selectedPoint = null;
        this.pointRadius = 4;
        this.animationFrame = null;
        this.listeners = new Map();
        
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
    
    setPoints(points) {
        this.points = new Map(Object.entries(points));
        this.render();
    }
    
    setHoveredPoint(point) {
        if (this.hoveredPoint !== point) {
            this.hoveredPoint = point;
            this.emit('pointsChanged', { type: 'hover', point });
            this.render();
        }
    }
    
    setSelectedPoint(point) {
        if (this.selectedPoint !== point) {
            this.selectedPoint = point;
            this.emit('pointsChanged', { type: 'select', point });
            this.render();
        }
    }
    
    render() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.animationFrame = requestAnimationFrame(() => {
            const { width, height } = this.canvas.getBoundingClientRect();
            
            // Clear canvas
            this.ctx.clearRect(0, 0, width, height);
            
            // First pass: Draw halos for pinned nodes' descendants
            for (const [id, point] of this.points) {
                const [screenX, screenY] = this.transform.toScreen(point.x, point.y);
                
                // Skip points outside viewport with padding
                const padding = this.pointRadius * 4; // Larger padding for halos
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
                        // Draw halo
                        this.ctx.beginPath();
                        this.ctx.arc(screenX, screenY, this.pointRadius * 2.5, 0, Math.PI * 2);
                        this.ctx.strokeStyle = `hsla(${haloColor.h}, ${haloColor.s}%, ${haloColor.l}%, 0.3)`;
                        this.ctx.lineWidth = 3;
                        this.ctx.stroke();
                    }
                }
            }
            
            // Second pass: Draw all points
            for (const [id, point] of this.points) {
                const [screenX, screenY] = this.transform.toScreen(point.x, point.y);
                
                // Skip points outside viewport with padding
                const padding = this.pointRadius * 2;
                if (screenX < -padding || screenX > width + padding ||
                    screenY < -padding || screenY > height + padding) {
                    continue;
                }
                
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, this.pointRadius, 0, Math.PI * 2);
                
                // Style based on state
                if (id === this.selectedPoint) {
                    // Selected point: larger with glow and color variations
                    const baseColor = TreeVisualizer.getColor(id);
                    
                    // Create color variations with more pronounced differences
                    const glowColor = `hsl(${baseColor.h}, ${Math.min(baseColor.s + 20, 100)}%, ${Math.min(baseColor.l + 5, 90)}%)`;
                    const fillColor = `hsl(${baseColor.h}, ${Math.min(baseColor.s + 25, 100)}%, ${baseColor.l}%)`;
                    const borderColor = `hsl(${baseColor.h}, ${Math.min(baseColor.s + 15, 100)}%, ${Math.max(baseColor.l - 15, 20)}%)`;
                    
                    // Draw outer glow
                    this.ctx.shadowColor = glowColor;
                    this.ctx.shadowBlur = 15;
                    this.ctx.shadowOffsetX = 0;
                    this.ctx.shadowOffsetY = 0;
                    
                    // Draw larger point
                    this.ctx.beginPath();
                    this.ctx.arc(screenX, screenY, this.pointRadius * 1.5, 0, Math.PI * 2);
                    
                    // Fill with more saturated base color
                    this.ctx.fillStyle = fillColor;
                    this.ctx.fill();
                    
                    // Add darker border of the same hue
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeStyle = borderColor;
                    this.ctx.stroke();
                    
                    // Add subtle outer ring
                    this.ctx.beginPath();
                    this.ctx.arc(screenX, screenY, this.pointRadius * 1.8, 0, Math.PI * 2);
                    this.ctx.strokeStyle = glowColor.replace(')', ', 0.3)').replace('hsl', 'hsla');
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                    
                    // Reset shadow for other points
                    this.ctx.shadowBlur = 0;
                } else if (id === this.hoveredPoint) {
                    // Hovered point: brighter with glow
                    const baseColor = TreeVisualizer.getColor(id);
                    this.ctx.fillStyle = `hsl(${baseColor.h}, ${baseColor.s}%, ${baseColor.l}%)`;
                    this.ctx.lineWidth = 2.5;
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    
                    // Add outer glow
                    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                    this.ctx.shadowBlur = 8;
                    this.ctx.fill();
                    this.ctx.stroke();
                    this.ctx.shadowBlur = 0; // Reset shadow for other points
                } else {
                    // Normal point: use tree color with some transparency
                    const baseColor = TreeVisualizer.getColor(id);
                    this.ctx.fillStyle = `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.l}%, 0.7)`;
                    this.ctx.fill();
                }
            }

            // Third pass: Draw hover label on top if there's a hovered point
            if (this.hoveredPoint && this.points.has(this.hoveredPoint)) {
                const point = this.points.get(this.hoveredPoint);
                const [screenX, screenY] = this.transform.toScreen(point.x, point.y);
                
                // Draw hover label
                this.ctx.font = '14px Arial';
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'bottom';
                
                // Draw background for label
                const labelText = this.hoveredPoint;
                const metrics = this.ctx.measureText(labelText);
                const labelPadding = 4;
                const labelWidth = metrics.width + labelPadding * 2;
                const labelHeight = 20;
                const labelX = screenX - labelWidth / 2;
                const labelY = screenY - this.pointRadius - labelHeight - 2;
                
                // Add a subtle shadow to the label background
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
                this.ctx.shadowBlur = 4;
                this.ctx.shadowOffsetY = 2;
                
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                this.ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
                
                // Reset shadow for text
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
                this.ctx.shadowOffsetY = 0;
                
                // Draw text
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                this.ctx.fillText(labelText, screenX, screenY - this.pointRadius - 4);
            }
        });
    }
    
    // Find point under cursor
    getPointAt(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const scale = window.devicePixelRatio;
        const canvasX = (x - rect.left) * scale;
        const canvasY = (y - rect.top) * scale;
        const [dataX, dataY] = this.transform.toData(canvasX, canvasY);
        
        // Find closest point within threshold
        let closestPoint = null;
        let closestDistance = Infinity;
        const threshold = (this.pointRadius * 2) / this.transform.scale;
        
        for (const [id, point] of this.points) {
            const dx = point.x - dataX;
            const dy = point.y - dataY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < threshold && distance < closestDistance) {
                closestPoint = id;
                closestDistance = distance;
            }
        }
        
        return closestPoint;
    }
    
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
} 