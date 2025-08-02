/**
 * InputController - Centralized input handling with event emission
 * Maps raw inputs to game events
 */
export default class InputController {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.enabled = true;
        this.contexts = new Map();
        this.activeContext = 'default';
        
        // Input states
        this.keys = new Map();
        this.mouseButtons = new Map();
        this.mousePosition = { x: 0, y: 0 };
        this.touches = new Map();
        
        // Input bindings by context
        this.registerContext('default', {});
        
        // Initialize input listeners
        this.setupListeners();
    }

    /**
     * Register an input context (e.g., 'menu', 'gameplay', 'building')
     * @param {string} contextName 
     * @param {Object} bindings - { 'keyCode/mouseButton': 'eventName' }
     */
    registerContext(contextName, bindings) {
        this.contexts.set(contextName, bindings);
    }

    /**
     * Switch to a different input context
     * @param {string} contextName 
     */
    switchContext(contextName) {
        if (!this.contexts.has(contextName)) {
            console.error(`Input context ${contextName} not registered`);
            return;
        }
        
        this.activeContext = contextName;
        this.eventBus.emit('input:context-changed', { context: contextName });
    }

    /**
     * Add binding to current context
     * @param {string} input - Key code or mouse button
     * @param {string} eventName - Event to emit
     */
    addBinding(input, eventName) {
        const context = this.contexts.get(this.activeContext);
        context[input] = eventName;
    }

    /**
     * Remove binding from current context
     * @param {string} input 
     */
    removeBinding(input) {
        const context = this.contexts.get(this.activeContext);
        delete context[input];
    }

    /**
     * Setup DOM event listeners
     */
    setupListeners() {
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Mouse events
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('wheel', this.handleMouseWheel.bind(this));
        
        // Touch events
        document.addEventListener('touchstart', this.handleTouchStart.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this));
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Handle key down event
     */
    handleKeyDown(event) {
        if (!this.enabled) return;
        
        const key = event.code;
        
        // Prevent repeat events
        if (this.keys.get(key)) return;
        
        this.keys.set(key, true);
        
        // Emit raw key event
        this.eventBus.emit('input:keydown', { key, event });
        
        // Check context bindings
        const context = this.contexts.get(this.activeContext);
        if (context[key]) {
            this.eventBus.emit(context[key], { key, event });
        }
    }

    /**
     * Handle key up event
     */
    handleKeyUp(event) {
        if (!this.enabled) return;
        
        const key = event.code;
        this.keys.set(key, false);
        
        // Emit raw key event
        this.eventBus.emit('input:keyup', { key, event });
        
        // Check context bindings for release events
        const context = this.contexts.get(this.activeContext);
        const releaseEvent = context[`${key}_release`];
        if (releaseEvent) {
            this.eventBus.emit(releaseEvent, { key, event });
        }
    }

    /**
     * Handle mouse down event
     */
    handleMouseDown(event) {
        if (!this.enabled) return;
        
        const button = `mouse${event.button}`;
        this.mouseButtons.set(button, true);
        
        const data = {
            button: event.button,
            x: event.clientX,
            y: event.clientY,
            event
        };
        
        // Emit raw mouse event
        this.eventBus.emit('input:mousedown', data);
        
        // Check context bindings
        const context = this.contexts.get(this.activeContext);
        if (context[button]) {
            this.eventBus.emit(context[button], data);
        }
    }

    /**
     * Handle mouse up event
     */
    handleMouseUp(event) {
        if (!this.enabled) return;
        
        const button = `mouse${event.button}`;
        this.mouseButtons.set(button, false);
        
        const data = {
            button: event.button,
            x: event.clientX,
            y: event.clientY,
            event
        };
        
        // Emit raw mouse event
        this.eventBus.emit('input:mouseup', data);
        
        // Check context bindings for release events
        const context = this.contexts.get(this.activeContext);
        const releaseEvent = context[`${button}_release`];
        if (releaseEvent) {
            this.eventBus.emit(releaseEvent, data);
        }
    }

    /**
     * Handle mouse move event
     */
    handleMouseMove(event) {
        if (!this.enabled) return;
        
        this.mousePosition.x = event.clientX;
        this.mousePosition.y = event.clientY;
        
        this.eventBus.emit('input:mousemove', {
            x: event.clientX,
            y: event.clientY,
            deltaX: event.movementX,
            deltaY: event.movementY,
            event
        });
    }

    /**
     * Handle mouse wheel event
     */
    handleMouseWheel(event) {
        if (!this.enabled) return;
        
        this.eventBus.emit('input:wheel', {
            deltaY: event.deltaY,
            deltaX: event.deltaX,
            event
        });
    }

    /**
     * Handle touch start event
     */
    handleTouchStart(event) {
        if (!this.enabled) return;
        
        Array.from(event.changedTouches).forEach(touch => {
            this.touches.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY,
                startX: touch.clientX,
                startY: touch.clientY
            });
        });
        
        this.eventBus.emit('input:touchstart', {
            touches: Array.from(event.touches),
            event
        });
    }

    /**
     * Handle touch end event
     */
    handleTouchEnd(event) {
        if (!this.enabled) return;
        
        Array.from(event.changedTouches).forEach(touch => {
            this.touches.delete(touch.identifier);
        });
        
        this.eventBus.emit('input:touchend', {
            touches: Array.from(event.changedTouches),
            event
        });
    }

    /**
     * Handle touch move event
     */
    handleTouchMove(event) {
        if (!this.enabled) return;
        
        Array.from(event.changedTouches).forEach(touch => {
            if (this.touches.has(touch.identifier)) {
                const touchData = this.touches.get(touch.identifier);
                touchData.x = touch.clientX;
                touchData.y = touch.clientY;
            }
        });
        
        this.eventBus.emit('input:touchmove', {
            touches: Array.from(event.touches),
            event
        });
    }

    /**
     * Check if a key is currently pressed
     * @param {string} key 
     */
    isKeyPressed(key) {
        return this.keys.get(key) || false;
    }

    /**
     * Check if a mouse button is currently pressed
     * @param {number} button 
     */
    isMouseButtonPressed(button) {
        return this.mouseButtons.get(`mouse${button}`) || false;
    }

    /**
     * Get current mouse position
     */
    getMousePosition() {
        return { ...this.mousePosition };
    }

    /**
     * Enable/disable input
     * @param {boolean} enabled 
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('wheel', this.handleMouseWheel);
        document.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('touchmove', this.handleTouchMove);
    }
}