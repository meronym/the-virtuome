export class ViewportTransform {
    constructor() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.matrix = new DOMMatrix();
        this.listeners = new Set();
    }
    
    update(scale, offsetX, offsetY) {
        this.scale = scale;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.matrix = new DOMMatrix()
            .translate(this.offsetX, this.offsetY)
            .scale(this.scale);
        
        this.notifyListeners();
    }
    
    // Convert data coordinates to screen coordinates
    toScreen(x, y) {
        const point = new DOMPoint(x, y).matrixTransform(this.matrix);
        return [point.x, point.y];
    }
    
    // Convert screen coordinates to data coordinates
    toData(x, y) {
        const inverse = this.matrix.inverse();
        const point = new DOMPoint(x, y).matrixTransform(inverse);
        return [point.x, point.y];
    }
    
    // Pan by a relative amount
    pan(dx, dy) {
        this.update(this.scale, this.offsetX + dx, this.offsetY + dy);
    }
    
    // Zoom centered on a specific point
    zoomAt(x, y, factor) {
        // Convert to data space
        const [dataX, dataY] = this.toData(x, y);
        
        // Apply zoom
        const newScale = this.scale * factor;
        
        // Calculate new offset to maintain zoom center
        const newOffsetX = x - dataX * newScale;
        const newOffsetY = y - dataY * newScale;
        
        this.update(newScale, newOffsetX, newOffsetY);
    }
    
    // Reset to initial state
    reset() {
        this.update(1, 0, 0);
    }
    
    // Add change listener
    addListener(callback) {
        this.listeners.add(callback);
    }
    
    // Remove change listener
    removeListener(callback) {
        this.listeners.delete(callback);
    }
    
    // Notify all listeners of changes
    notifyListeners() {
        for (const listener of this.listeners) {
            listener(this);
        }
    }
} 