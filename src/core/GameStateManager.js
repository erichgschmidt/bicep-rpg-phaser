/**
 * GameStateManager - Handles scene transitions, game states, pause/resume
 * Core system with no dependencies on game-specific logic
 */
export default class GameStateManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.states = new Map();
        this.currentState = null;
        this.previousState = null;
        this.transitioning = false;
        this.paused = false;
        this.stateStack = [];
    }

    /**
     * Register a game state
     * @param {string} stateName 
     * @param {Object} stateConfig - { enter, update, exit, pause, resume }
     */
    registerState(stateName, stateConfig) {
        this.states.set(stateName, {
            enter: stateConfig.enter || (() => {}),
            update: stateConfig.update || (() => {}),
            exit: stateConfig.exit || (() => {}),
            pause: stateConfig.pause || (() => {}),
            resume: stateConfig.resume || (() => {})
        });
    }

    /**
     * Transition to a new state
     * @param {string} stateName 
     * @param {Object} data - Optional data to pass to the new state
     */
    async changeState(stateName, data = {}) {
        if (!this.states.has(stateName)) {
            console.error(`State ${stateName} not registered`);
            return;
        }

        if (this.transitioning) {
            console.warn('State transition already in progress');
            return;
        }

        this.transitioning = true;

        // Exit current state
        if (this.currentState) {
            const currentStateConfig = this.states.get(this.currentState);
            await currentStateConfig.exit();
            this.eventBus.emit('state:exit', { state: this.currentState });
        }

        // Store previous state
        this.previousState = this.currentState;
        this.currentState = stateName;

        // Enter new state
        const newStateConfig = this.states.get(stateName);
        await newStateConfig.enter(data);
        
        this.eventBus.emit('state:enter', { state: stateName, data });
        this.transitioning = false;
    }

    /**
     * Push a state onto the stack (for modals, menus, etc)
     * @param {string} stateName 
     * @param {Object} data 
     */
    async pushState(stateName, data = {}) {
        if (!this.states.has(stateName)) {
            console.error(`State ${stateName} not registered`);
            return;
        }

        // Pause current state
        if (this.currentState) {
            const currentStateConfig = this.states.get(this.currentState);
            await currentStateConfig.pause();
            this.stateStack.push(this.currentState);
        }

        this.currentState = stateName;
        const newStateConfig = this.states.get(stateName);
        await newStateConfig.enter(data);
        
        this.eventBus.emit('state:push', { state: stateName, data });
    }

    /**
     * Pop the top state from the stack
     */
    async popState() {
        if (this.stateStack.length === 0) {
            console.warn('No states to pop');
            return;
        }

        // Exit current state
        if (this.currentState) {
            const currentStateConfig = this.states.get(this.currentState);
            await currentStateConfig.exit();
        }

        // Resume previous state
        const previousStateName = this.stateStack.pop();
        this.currentState = previousStateName;
        
        const previousStateConfig = this.states.get(previousStateName);
        await previousStateConfig.resume();
        
        this.eventBus.emit('state:pop', { state: previousStateName });
    }

    /**
     * Update current state
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        if (this.currentState && !this.paused && !this.transitioning) {
            const stateConfig = this.states.get(this.currentState);
            stateConfig.update(deltaTime);
        }
    }

    /**
     * Pause the game
     */
    pause() {
        if (this.paused) return;
        
        this.paused = true;
        
        if (this.currentState) {
            const stateConfig = this.states.get(this.currentState);
            stateConfig.pause();
        }
        
        this.eventBus.emit('game:pause');
    }

    /**
     * Resume the game
     */
    resume() {
        if (!this.paused) return;
        
        this.paused = false;
        
        if (this.currentState) {
            const stateConfig = this.states.get(this.currentState);
            stateConfig.resume();
        }
        
        this.eventBus.emit('game:resume');
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.paused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**
     * Get current state name
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Check if in a specific state
     */
    isInState(stateName) {
        return this.currentState === stateName;
    }

    /**
     * Reset state manager
     */
    reset() {
        this.currentState = null;
        this.previousState = null;
        this.stateStack = [];
        this.paused = false;
        this.transitioning = false;
    }
}