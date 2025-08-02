/**
 * EntityManager - Manages all entities in the game
 * Handles spawning, updating, querying, and destroying entities
 */
export default class EntityManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.entities = new Map();
        this.entitiesByTag = new Map();
        this.entitiesByComponent = new Map();
        this.entitiesToDestroy = new Set();
        
        // Listen for entity events
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        this.eventBus.on('entity:destroy', (data) => {
            this.scheduleDestroy(data.entityId);
        });
    }

    /**
     * Create a new entity
     * @param {Object} components - Initial components
     * @param {Array<string>} tags - Initial tags
     * @returns {Entity}
     */
    createEntity(components = {}, tags = []) {
        const Entity = window.gameCore.Entity; // Will be injected properly later
        const entity = new Entity();
        
        // Add components
        Object.entries(components).forEach(([type, data]) => {
            entity.addComponent(type, data);
        });
        
        // Add tags
        tags.forEach(tag => entity.addTag(tag));
        
        // Register entity
        this.addEntity(entity);
        
        this.eventBus.emit('entity:created', { entity });
        
        return entity;
    }

    /**
     * Add an entity to the manager
     * @param {Entity} entity 
     */
    addEntity(entity) {
        this.entities.set(entity.id, entity);
        
        // Index by tags
        entity.tags.forEach(tag => {
            if (!this.entitiesByTag.has(tag)) {
                this.entitiesByTag.set(tag, new Set());
            }
            this.entitiesByTag.get(tag).add(entity.id);
        });
        
        // Index by components
        entity.components.forEach((data, componentType) => {
            if (!this.entitiesByComponent.has(componentType)) {
                this.entitiesByComponent.set(componentType, new Set());
            }
            this.entitiesByComponent.get(componentType).add(entity.id);
        });
    }

    /**
     * Remove an entity from the manager
     * @param {string} entityId 
     */
    removeEntity(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity) return;
        
        // Remove from tag index
        entity.tags.forEach(tag => {
            const tagSet = this.entitiesByTag.get(tag);
            if (tagSet) {
                tagSet.delete(entityId);
                if (tagSet.size === 0) {
                    this.entitiesByTag.delete(tag);
                }
            }
        });
        
        // Remove from component index
        entity.components.forEach((data, componentType) => {
            const componentSet = this.entitiesByComponent.get(componentType);
            if (componentSet) {
                componentSet.delete(entityId);
                if (componentSet.size === 0) {
                    this.entitiesByComponent.delete(componentType);
                }
            }
        });
        
        // Remove entity
        this.entities.delete(entityId);
        entity.destroy();
        
        this.eventBus.emit('entity:destroyed', { entityId });
    }

    /**
     * Get an entity by ID
     * @param {string} entityId 
     * @returns {Entity|null}
     */
    getEntity(entityId) {
        return this.entities.get(entityId) || null;
    }

    /**
     * Get all entities with a specific tag
     * @param {string} tag 
     * @returns {Array<Entity>}
     */
    getEntitiesByTag(tag) {
        const entityIds = this.entitiesByTag.get(tag);
        if (!entityIds) return [];
        
        return Array.from(entityIds)
            .map(id => this.entities.get(id))
            .filter(entity => entity && entity.active);
    }

    /**
     * Get all entities with specific components
     * @param {Array<string>} componentTypes 
     * @returns {Array<Entity>}
     */
    getEntitiesWithComponents(componentTypes) {
        if (componentTypes.length === 0) return [];
        
        // Find entities that have all requested components
        let entityIds = null;
        
        componentTypes.forEach(componentType => {
            const componentEntityIds = this.entitiesByComponent.get(componentType);
            if (!componentEntityIds) {
                entityIds = new Set();
                return;
            }
            
            if (entityIds === null) {
                entityIds = new Set(componentEntityIds);
            } else {
                // Intersection
                entityIds = new Set([...entityIds].filter(id => componentEntityIds.has(id)));
            }
        });
        
        if (!entityIds) return [];
        
        return Array.from(entityIds)
            .map(id => this.entities.get(id))
            .filter(entity => entity && entity.active);
    }

    /**
     * Query entities with a custom filter
     * @param {Function} filterFn 
     * @returns {Array<Entity>}
     */
    query(filterFn) {
        const results = [];
        
        this.entities.forEach(entity => {
            if (entity.active && filterFn(entity)) {
                results.push(entity);
            }
        });
        
        return results;
    }

    /**
     * Schedule an entity for destruction
     * @param {string} entityId 
     */
    scheduleDestroy(entityId) {
        this.entitiesToDestroy.add(entityId);
    }

    /**
     * Process scheduled destructions
     */
    processDestructions() {
        this.entitiesToDestroy.forEach(entityId => {
            this.removeEntity(entityId);
        });
        this.entitiesToDestroy.clear();
    }

    /**
     * Update all entities
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        // Process any scheduled destructions first
        this.processDestructions();
        
        // Emit update event for systems to process
        this.eventBus.emit('entities:update', { 
            entities: this.entities,
            deltaTime 
        });
    }

    /**
     * Get statistics about entities
     */
    getStats() {
        return {
            totalEntities: this.entities.size,
            activeEntities: Array.from(this.entities.values()).filter(e => e.active).length,
            tagCounts: Object.fromEntries(
                Array.from(this.entitiesByTag.entries()).map(([tag, ids]) => [tag, ids.size])
            ),
            componentCounts: Object.fromEntries(
                Array.from(this.entitiesByComponent.entries()).map(([type, ids]) => [type, ids.size])
            )
        };
    }

    /**
     * Clear all entities
     */
    clear() {
        this.entities.forEach(entity => entity.destroy());
        this.entities.clear();
        this.entitiesByTag.clear();
        this.entitiesByComponent.clear();
        this.entitiesToDestroy.clear();
    }

    /**
     * Destroy the entity manager
     */
    destroy() {
        this.clear();
        this.eventBus.off('entity:destroy', this.scheduleDestroy);
    }
}