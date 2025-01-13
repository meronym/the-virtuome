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
        
        // Bind to transform changes
        this.transform.addListener(() => this.render());
        
        // Setup resize handling
        this.setupResizeHandler();
        this.resize();
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
            
            // First pass: Draw all points
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
                    // Selected point: bright pink fill with white border
                    this.ctx.fillStyle = '#ff4081';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.fill();
                    this.ctx.stroke();
                } else if (id === this.hoveredPoint) {
                    // Hovered point: brighter blue fill with light blue glow
                    this.ctx.fillStyle = '#2196f3';
                    this.ctx.lineWidth = 2.5;
                    this.ctx.strokeStyle = '#90caf9';
                    
                    // Add outer glow
                    this.ctx.shadowColor = '#90caf9';
                    this.ctx.shadowBlur = 8;
                    this.ctx.fill();
                    this.ctx.stroke();
                    this.ctx.shadowBlur = 0; // Reset shadow for other points
                } else {
                    // Normal point: semi-transparent blue
                    this.ctx.fillStyle = 'rgba(33, 150, 243, 0.6)';
                    this.ctx.fill();
                }
            }
            
            // Second pass: Draw hover label on top if there's a hovered point
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
            
            // Debug: log states
            if (this.hoveredPoint || this.selectedPoint) {
                console.log('Render states:', { 
                    hovered: this.hoveredPoint, 
                    selected: this.selectedPoint 
                });
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