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
        
        // Bind to transform changes
        this.transform.addListener(() => this.render());
        
        // Setup resize handling
        this.setupResizeHandler();
        this.resize();
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
    
    setHoveredPoint(id) {
        if (this.hoveredPoint !== id) {
            this.hoveredPoint = id;
            this.render();
        }
    }
    
    setSelectedPoint(id) {
        if (this.selectedPoint !== id) {
            this.selectedPoint = id;
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
            
            // Draw all points
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
                    this.ctx.fillStyle = '#ff4081';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.fill();
                    this.ctx.stroke();
                } else if (id === this.hoveredPoint) {
                    this.ctx.fillStyle = '#2196f3';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.fill();
                    this.ctx.stroke();
                } else {
                    this.ctx.fillStyle = 'rgba(33, 150, 243, 0.6)';
                    this.ctx.fill();
                }
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