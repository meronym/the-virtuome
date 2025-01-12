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
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        this.canvas.addEventListener('click', this.onClick.bind(this));
        
        // Touch events
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    }
    
    onMouseDown(e) {
        this.isDragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.dragStartTime = Date.now();
        this.canvas.style.cursor = 'grabbing';
    }
    
    onMouseMove(e) {
        if (this.isDragging) {
            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;
            this.transform.pan(dx, dy);
            this.renderer.render();
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        } else {
            // Hover effect
            const point = this.findPointNear(e.clientX, e.clientY);
            this.canvas.style.cursor = point ? 'pointer' : 'grab';
            this.renderer.setHoveredPoint(point ? point.id : null);
        }
    }
    
    onMouseUp(e) {
        // Only handle as a click if the drag was very short
        const dragTime = Date.now() - this.dragStartTime;
        if (dragTime < 200 && Math.abs(e.clientX - this.lastX) < 5 && Math.abs(e.clientY - this.lastY) < 5) {
            this.handlePointClick(e.clientX, e.clientY);
        }
        
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }
    
    onClick(e) {
        // Handle click only if not dragging
        if (!this.isDragging) {
            this.handlePointClick(e.clientX, e.clientY);
        }
    }
    
    handlePointClick(x, y) {
        const point = this.findPointNear(x, y);
        if (point) {
            console.log('Point clicked:', point); // Debug log
            this.renderer.setSelectedPoint(point.id);
            this.details.showVirtue(point.id);
        }
    }
    
    onWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Zoom factor based on wheel delta
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        this.transform.zoomAt(x, y, factor);
        this.renderer.render();
    }
    
    onTouchStart(e) {
        if (e.touches.length === 1) {
            e.preventDefault();
            const touch = e.touches[0];
            this.lastX = touch.clientX;
            this.lastY = touch.clientY;
            this.dragStartTime = Date.now();
            this.isDragging = true;
        }
    }
    
    onTouchMove(e) {
        if (e.touches.length === 1 && this.isDragging) {
            e.preventDefault();
            const touch = e.touches[0];
            const dx = touch.clientX - this.lastX;
            const dy = touch.clientY - this.lastY;
            this.transform.pan(dx, dy);
            this.renderer.render();
            this.lastX = touch.clientX;
            this.lastY = touch.clientY;
        }
    }
    
    onTouchEnd(e) {
        if (e.touches.length === 0) {
            // Handle tap/click if the touch was short and didn't move much
            const dragTime = Date.now() - this.dragStartTime;
            if (dragTime < 200 && 
                Math.abs(e.changedTouches[0].clientX - this.lastX) < 10 &&
                Math.abs(e.changedTouches[0].clientY - this.lastY) < 10) {
                this.handlePointClick(this.lastX, this.lastY);
            }
            this.isDragging = false;
        }
    }
    
    findPointNear(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // Convert screen coordinates to data coordinates
        const [dataX, dataY] = this.transform.toData(x, y);
        
        // Find closest point within threshold
        const threshold = 10 / this.transform.scale; // Adjust based on zoom level
        let closest = null;
        let minDist = threshold;
        
        for (const [id, point] of this.renderer.points) {
            const dx = point.x - dataX;
            const dy = point.y - dataY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist) {
                minDist = dist;
                closest = { id, ...point };
            }
        }
        
        return closest;
    }
} 