import { DetailsPanel } from '../data/details.js';

export class EventHandler {
    constructor(canvas, transform, renderer) {
        this.canvas = canvas;
        this.transform = transform;
        this.renderer = renderer;
        this.details = new DetailsPanel();
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        this.dragStartTime = 0;
        
        // Bind event handlers
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onWheel = this.onWheel.bind(this);
        
        // Add event listeners
        canvas.addEventListener('mousedown', this.onMouseDown);
        canvas.addEventListener('mousemove', this.onMouseMove);
        canvas.addEventListener('mouseup', this.onMouseUp);
        canvas.addEventListener('mouseleave', this.onMouseUp);
        canvas.addEventListener('wheel', this.onWheel);

        // Set initial cursor style
        canvas.style.cursor = 'grab';
    }
    
    onMouseDown(e) {
        const point = this.findPointNear(e.clientX, e.clientY);
        if (point) {
            // If clicking on a point, select it
            this.renderer.selectedPoint = point;
            this.renderer.emit('pointsChanged', { type: 'select', point });
            this.details.showVirtue(point);
        } else {
            // Otherwise start dragging
            this.isDragging = true;
            this.canvas.style.cursor = 'grabbing';
        }
        
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.dragStartTime = Date.now();
    }
    
    onMouseMove(e) {
        if (this.isDragging) {
            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;
            this.transform.pan(dx, dy);
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        } else {
            // Handle hover effect
            const point = this.findPointNear(e.clientX, e.clientY);
            if (point !== this.renderer.hoveredPoint) {
                this.renderer.hoveredPoint = point;
                this.canvas.style.cursor = point ? 'pointer' : 'grab';
                this.renderer.render();
            }
        }
    }
    
    onMouseUp(e) {
        if (this.isDragging) {
            const dragTime = Date.now() - this.dragStartTime;
            const dragDistance = Math.hypot(e.clientX - this.lastX, e.clientY - this.lastY);
            
            // Only handle as a click if the drag was very short in time and distance
            if (dragTime < 200 && dragDistance < 5) {
                const point = this.findPointNear(e.clientX, e.clientY);
                if (point) {
                    this.renderer.selectedPoint = point;
                    this.renderer.emit('pointsChanged', { type: 'select', point });
                    this.details.showVirtue(point);
                }
            }
        }
        
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }
    
    onWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Zoom factor based on wheel delta
        const delta = -Math.sign(e.deltaY);
        const factor = Math.pow(1.1, delta);
        this.transform.zoomAt(x, y, factor);
    }
    
    findPointNear(clientX, clientY) {
        if (!this.renderer.points) return null;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // Convert screen coordinates to data coordinates
        const [dataX, dataY] = this.transform.toData(x, y);
        
        // Find closest point within threshold
        const threshold = 10 / this.transform.scale; // Adjust based on zoom level
        let closest = null;
        let minDist = threshold;
        
        const pointEntries = this.renderer.points instanceof Map ? 
            this.renderer.points : 
            Object.entries(this.renderer.points);
        
        for (const [id, point] of pointEntries) {
            const dx = point.x - dataX;
            const dy = point.y - dataY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist) {
                minDist = dist;
                closest = id;
            }
        }
        
        return closest;
    }
    
    destroy() {
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.removeEventListener('mouseleave', this.onMouseUp);
        this.canvas.removeEventListener('wheel', this.onWheel);
    }
} 