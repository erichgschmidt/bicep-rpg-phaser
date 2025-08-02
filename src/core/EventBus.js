/**
 * EventBus - Core event system for decoupled communication
 * No dependencies on other systems (pure trunk)
 */
export default class EventBus {
    constructor() {
        this.events = new Map();
        this.eventQueue = [];
        this.isProcessing = false;
    }

    /**
     * Subscribe to an event
     * @param {string} eventName 
     * @param {Function} callback 
     * @param {Object} context - Optional context for callback
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback, context = null) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const handler = { callback, context };
        this.events.get(eventName).push(handler);

        // Return unsubscribe function
        return () => this.off(eventName, callback, context);
    }

    /**
     * Subscribe to an event once
     * @param {string} eventName 
     * @param {Function} callback 
     * @param {Object} context 
     */
    once(eventName, callback, context = null) {
        const onceWrapper = (...args) => {
            callback.apply(context, args);
            this.off(eventName, onceWrapper, context);
        };
        this.on(eventName, onceWrapper, context);
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName 
     * @param {Function} callback 
     * @param {Object} context 
     */
    off(eventName, callback, context = null) {
        if (!this.events.has(eventName)) return;

        const handlers = this.events.get(eventName);
        const index = handlers.findIndex(
            h => h.callback === callback && h.context === context
        );

        if (index !== -1) {
            handlers.splice(index, 1);
        }

        if (handlers.length === 0) {
            this.events.delete(eventName);
        }
    }

    /**
     * Emit an event
     * @param {string} eventName 
     * @param {...any} args 
     */
    emit(eventName, ...args) {
        // Queue events to prevent infinite loops
        this.eventQueue.push({ eventName, args });

        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * Process queued events
     */
    processQueue() {
        this.isProcessing = true;

        while (this.eventQueue.length > 0) {
            const { eventName, args } = this.eventQueue.shift();
            
            if (this.events.has(eventName)) {
                const handlers = [...this.events.get(eventName)]; // Copy to prevent modification during iteration
                handlers.forEach(handler => {
                    try {
                        handler.callback.apply(handler.context, args);
                    } catch (error) {
                        console.error(`Error in event handler for ${eventName}:`, error);
                    }
                });
            }
        }

        this.isProcessing = false;
    }

    /**
     * Clear all event listeners
     */
    clear() {
        this.events.clear();
        this.eventQueue = [];
    }

    /**
     * Get event names for debugging
     */
    getEventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Get listener count for an event
     */
    getListenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }
}