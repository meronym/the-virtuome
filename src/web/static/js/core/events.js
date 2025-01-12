export class EventHandler {
    constructor(canvas, transform, renderer) {
        this.canvas = canvas;
        this.transform = transform;
        this.renderer = renderer;
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        this.listeners = new Map();
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Touch events
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        window.addEventListener('touchmove', this.handleTouchMove.bind(this));
        window.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    // Event handling
    handleMouseDown(e) {
        e.preventDefault();
        this.isDragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        
        // Check for point selection
        const point = this.renderer.getPointAt(e.clientX, e.clientY);
        if (point) {
            this.emit('select', point);
            this.isDragging = false;
        }
    }
    
    handleMouseMove(e) {
        if (this.isDragging) {
            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;
            this.transform.pan(dx, dy);
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        } else {
            const point = this.renderer.getPointAt(e.clientX, e.clientY);
            this.emit('hover', point);
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Zoom factor based on wheel delta
        const factor = Math.pow(0.999, e.deltaY);
        this.transform.zoomAt(x, y, factor);
    }
    
    // Touch event handling
    handleTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            // Single touch - start drag or select point
            const touch = e.touches[0];
            this.isDragging = true;
            this.lastX = touch.clientX;
            this.lastY = touch.clientY;
            
            const point = this.renderer.getPointAt(touch.clientX, touch.clientY);
            if (point) {
                this.emit('select', point);
                this.isDragging = false;
            }
        } else if (e.touches.length === 2) {
            // Two touches - start pinch zoom
            this.lastTouchDistance = this.getTouchDistance(e.touches);
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1 && this.isDragging) {
            // Single touch - pan
            const touch = e.touches[0];
            const dx = touch.clientX - this.lastX;
            const dy = touch.clientY - this.lastY;
            this.transform.pan(dx, dy);
            this.lastX = touch.clientX;
            this.lastY = touch.clientY;
        } else if (e.touches.length === 2) {
            // Two touches - pinch zoom
            const distance = this.getTouchDistance(e.touches);
            const factor = distance / this.lastTouchDistance;
            
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = centerX - rect.left;
            const y = centerY - rect.top;
            
            this.transform.zoomAt(x, y, factor);
            this.lastTouchDistance = distance;
        }
    }
    
    handleTouchEnd(e) {
        if (e.touches.length === 0) {
            this.isDragging = false;
        }
    }
    
    // Helper methods
    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
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
    
    destroy() {
        // Remove event listeners
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('wheel', this.handleWheel);
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        window.removeEventListener('touchmove', this.handleTouchMove);
        window.removeEventListener('touchend', this.handleTouchEnd);
    }
} 