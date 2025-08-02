/**
 * Entity - Base class for all game objects
 * Components stored as plain data, systems handle logic
 */
export default class Entity {
    constructor(id = null) {
        this.id = id || this.generateId();
        this.components = new Map();
        this.tags = new Set();
        this.active = true;
        this.destroyed = false;
    }

    /**
     * Generate unique entity ID
     */
    generateId() {
        return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add a component to the entity
     * @param {string} componentType 
     * @param {Object} componentData 
     */
    addComponent(componentType, componentData = {}) {
        if (this.destroyed) {
            console.error('Cannot add component to destroyed entity');
            return this;
        }

        this.components.set(componentType, { ...componentData });
        return this;
    }

    /**
     * Get a component from the entity
     * @param {string} componentType 
     */
    getComponent(componentType) {
        return this.components.get(componentType);
    }

    /**
     * Check if entity has a component
     * @param {string} componentType 
     */
    hasComponent(componentType) {
        return this.components.has(componentType);
    }

    /**
     * Check if entity has all specified components
     * @param {Array<string>} componentTypes 
     */
    hasComponents(componentTypes) {
        return componentTypes.every(type => this.hasComponent(type));
    }

    /**
     * Remove a component from the entity
     * @param {string} componentType 
     */
    removeComponent(componentType) {
        this.components.delete(componentType);
        return this;
    }

    /**
     * Add a tag to the entity
     * @param {string} tag 
     */
    addTag(tag) {
        this.tags.add(tag);
        return this;
    }

    /**
     * Remove a tag from the entity
     * @param {string} tag 
     */
    removeTag(tag) {
        this.tags.delete(tag);
        return this;
    }

    /**
     * Check if entity has a tag
     * @param {string} tag 
     */
    hasTag(tag) {
        return this.tags.has(tag);
    }

    /**
     * Set entity active state
     * @param {boolean} active 
     */
    setActive(active) {
        this.active = active;
        return this;
    }

    /**
     * Mark entity for destruction
     */
    destroy() {
        this.destroyed = true;
        this.active = false;
    }

    /**
     * Clone the entity with all components
     */
    clone() {
        const clone = new Entity();
        
        // Copy components
        this.components.forEach((data, type) => {
            clone.addComponent(type, { ...data });
        });

        // Copy tags
        this.tags.forEach(tag => clone.addTag(tag));

        clone.active = this.active;
        
        return clone;
    }

    /**
     * Serialize entity to JSON
     */
    serialize() {
        return {
            id: this.id,
            components: Object.fromEntries(this.components),
            tags: Array.from(this.tags),
            active: this.active
        };
    }

    /**
     * Deserialize entity from JSON
     */
    static deserialize(data) {
        const entity = new Entity(data.id);
        
        // Restore components
        Object.entries(data.components || {}).forEach(([type, componentData]) => {
            entity.addComponent(type, componentData);
        });

        // Restore tags
        (data.tags || []).forEach(tag => entity.addTag(tag));

        entity.active = data.active !== false;
        
        return entity;
    }
}