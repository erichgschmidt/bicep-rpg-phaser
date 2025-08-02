/**
 * ZoneManager - Manages game zones, safe areas, biomes, and environmental effects
 * Branch-level system that handles all zone-related operations
 */
export default class ZoneManager {
    constructor(eventBus, entityManager) {
        this.eventBus = eventBus;
        this.entityManager = entityManager;
        
        // Zone configuration
        this.config = {
            defaultZoneRadius: 5, // In grid units
            bonfireHealRate: 5,   // HP per second
            bonfireRespawnDelay: 2000, // 2 seconds
            weatherTickRate: 1000, // Check weather every second
            biomeTransitionDistance: 3 // Grid units for smooth transitions
        };
        
        // Active zones
        this.zones = new Map(); // zoneId -> zone data
        this.entityZones = new Map(); // entityId -> Set of zoneIds
        
        // Biome definitions
        this.biomes = {
            plains: {
                name: 'Plains',
                enemySpawnRate: 1.0,
                weatherTypes: ['clear', 'cloudy', 'light_rain'],
                movementSpeed: 1.0
            },
            swamp: {
                name: 'Swamp',
                enemySpawnRate: 1.5,
                weatherTypes: ['fog', 'heavy_rain', 'storm'],
                movementSpeed: 0.7
            },
            mountain: {
                name: 'Mountain',
                enemySpawnRate: 0.8,
                weatherTypes: ['clear', 'snow', 'blizzard'],
                movementSpeed: 0.8
            }
        };
        
        // Weather effects
        this.weatherEffects = {
            clear: { visibility: 1.0, combatModifier: 1.0 },
            fog: { visibility: 0.5, combatModifier: 0.9 },
            rain: { visibility: 0.8, combatModifier: 0.95 },
            storm: { visibility: 0.3, combatModifier: 0.8 },
            snow: { visibility: 0.7, combatModifier: 0.9 },
            blizzard: { visibility: 0.2, combatModifier: 0.7 }
        };
        
        this.setupEventListeners();
        this.initializeDefaultZones();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Zone events
        this.eventBus.on('zone:create', this.createZone.bind(this));
        this.eventBus.on('zone:remove', this.removeZone.bind(this));
        
        // Entity movement
        this.eventBus.on('entity:moved', this.updateEntityZones.bind(this));
        
        // Player death
        this.eventBus.on('player:died', this.handlePlayerDeath.bind(this));
        
        // Weather updates
        this.eventBus.on('weather:update', this.updateWeather.bind(this));
        
        // Entity creation
        this.eventBus.on('entity:created', this.checkInitialZone.bind(this));
    }

    /**
     * Initialize default zones
     */
    initializeDefaultZones() {
        // Create bonfire safe zone at origin
        this.createZone({
            id: 'bonfire_main',
            type: 'bonfire',
            position: { x: 0, y: 0 },
            radius: this.config.defaultZoneRadius,
            properties: {
                name: 'Main Bonfire',
                safe: true,
                noEnemySpawn: true,
                healing: true,
                respawnPoint: true,
                light: { radius: 10, color: 0xffa500 }
            }
        });
    }

    /**
     * Create a new zone
     * @param {Object} data - Zone configuration
     */
    createZone(data) {
        const {
            id,
            type,
            position,
            radius = this.config.defaultZoneRadius,
            shape = 'circle',
            properties = {}
        } = data;
        
        const zone = {
            id,
            type,
            position,
            radius,
            shape,
            properties,
            active: true,
            entitiesInZone: new Set(),
            effects: []
        };
        
        // Set up zone-specific behaviors
        switch (type) {
            case 'bonfire':
                this.setupBonfireZone(zone);
                break;
            case 'boss_arena':
                this.setupBossArena(zone);
                break;
            case 'weather':
                this.setupWeatherZone(zone);
                break;
        }
        
        this.zones.set(id, zone);
        
        // Check all entities for zone entry
        this.entityManager.entities.forEach(entity => {
            this.checkEntityZoneEntry(entity, zone);
        });
        
        this.eventBus.emit('zone:created', { zone });
    }

    /**
     * Set up bonfire zone behaviors
     * @param {Object} zone 
     */
    setupBonfireZone(zone) {
        // Healing effect
        if (zone.properties.healing) {
            zone.effects.push({
                type: 'healing',
                interval: 1000, // Every second
                value: this.config.bonfireHealRate,
                lastTick: 0
            });
        }
        
        // Visual effects
        this.eventBus.emit('visual:create-bonfire', {
            position: zone.position,
            radius: zone.properties.light?.radius || zone.radius
        });
    }

    /**
     * Remove a zone
     * @param {Object} data - { zoneId }
     */
    removeZone(data) {
        const { zoneId } = data;
        const zone = this.zones.get(zoneId);
        
        if (!zone) return;
        
        // Remove all entities from zone
        zone.entitiesInZone.forEach(entityId => {
            const entityZones = this.entityZones.get(entityId);
            if (entityZones) {
                entityZones.delete(zoneId);
            }
        });
        
        this.zones.delete(zoneId);
        
        this.eventBus.emit('zone:removed', { zoneId });
    }

    /**
     * Update entity zones when they move
     * @param {Object} data - { entityId, oldPosition, newPosition }
     */
    updateEntityZones(data) {
        const { entityId, newPosition } = data;
        const entity = this.entityManager.getEntity(entityId);
        
        if (!entity) return;
        
        const entityZones = this.entityZones.get(entityId) || new Set();
        
        // Check each zone
        this.zones.forEach(zone => {
            const wasInZone = entityZones.has(zone.id);
            const isInZone = this.isPositionInZone(newPosition, zone);
            
            if (!wasInZone && isInZone) {
                // Entity entered zone
                this.handleEntityEnterZone(entity, zone);
            } else if (wasInZone && !isInZone) {
                // Entity left zone
                this.handleEntityExitZone(entity, zone);
            }
        });
    }

    /**
     * Check if entity starts in a zone
     * @param {Object} data - { entity }
     */
    checkInitialZone(data) {
        const { entity } = data;
        const position = entity.getComponent('position');
        
        if (!position) return;
        
        this.zones.forEach(zone => {
            if (this.isPositionInZone(position, zone)) {
                this.handleEntityEnterZone(entity, zone);
            }
        });
    }

    /**
     * Check if position is within zone
     * @param {Object} position - { x, y }
     * @param {Object} zone 
     * @returns {boolean}
     */
    isPositionInZone(position, zone) {
        if (zone.shape === 'circle') {
            const dx = position.x - zone.position.x;
            const dy = position.y - zone.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= zone.radius;
        } else if (zone.shape === 'rectangle') {
            return position.x >= zone.position.x - zone.width / 2 &&
                   position.x <= zone.position.x + zone.width / 2 &&
                   position.y >= zone.position.y - zone.height / 2 &&
                   position.y <= zone.position.y + zone.height / 2;
        }
        return false;
    }

    /**
     * Handle entity entering a zone
     * @param {Entity} entity 
     * @param {Object} zone 
     */
    handleEntityEnterZone(entity, zone) {
        // Update tracking
        zone.entitiesInZone.add(entity.id);
        
        if (!this.entityZones.has(entity.id)) {
            this.entityZones.set(entity.id, new Set());
        }
        this.entityZones.get(entity.id).add(zone.id);
        
        // Add zone component to entity
        if (!entity.hasComponent('zones')) {
            entity.addComponent('zones', { current: [] });
        }
        const zonesComponent = entity.getComponent('zones');
        zonesComponent.current.push(zone.id);
        
        // Apply zone properties
        if (zone.properties.safe) {
            entity.addTag('in_safe_zone');
        }
        
        this.eventBus.emit('entity:entered-zone', {
            entityId: entity.id,
            zoneId: zone.id,
            zone
        });
    }

    /**
     * Handle entity exiting a zone
     * @param {Entity} entity 
     * @param {Object} zone 
     */
    handleEntityExitZone(entity, zone) {
        // Update tracking
        zone.entitiesInZone.delete(entity.id);
        
        const entityZones = this.entityZones.get(entity.id);
        if (entityZones) {
            entityZones.delete(zone.id);
        }
        
        // Update entity's zone component
        const zonesComponent = entity.getComponent('zones');
        if (zonesComponent) {
            const index = zonesComponent.current.indexOf(zone.id);
            if (index > -1) {
                zonesComponent.current.splice(index, 1);
            }
        }
        
        // Remove zone properties
        if (zone.properties.safe) {
            // Check if entity is still in another safe zone
            const stillInSafeZone = this.isEntityInZoneType(entity.id, 'bonfire');
            if (!stillInSafeZone) {
                entity.removeTag('in_safe_zone');
            }
        }
        
        this.eventBus.emit('entity:exited-zone', {
            entityId: entity.id,
            zoneId: zone.id,
            zone
        });
    }

    /**
     * Check if entity is in a zone of specific type
     * @param {string} entityId 
     * @param {string} zoneType 
     * @returns {boolean}
     */
    isEntityInZoneType(entityId, zoneType) {
        const entityZones = this.entityZones.get(entityId);
        if (!entityZones) return false;
        
        for (const zoneId of entityZones) {
            const zone = this.zones.get(zoneId);
            if (zone && zone.type === zoneType) {
                return true;
            }
        }
        return false;
    }

    /**
     * Handle player death - respawn at bonfire
     * @param {Object} data - { playerId }
     */
    handlePlayerDeath(data) {
        const { playerId } = data;
        
        // Find nearest respawn point (bonfire)
        const respawnZone = this.findNearestZoneOfType('bonfire', { x: 0, y: 0 });
        
        if (!respawnZone) {
            console.error('No respawn point found!');
            return;
        }
        
        // Schedule respawn
        setTimeout(() => {
            this.eventBus.emit('player:respawn', {
                playerId,
                position: respawnZone.position,
                zoneId: respawnZone.id
            });
        }, this.config.bonfireRespawnDelay);
    }

    /**
     * Find nearest zone of type
     * @param {string} type 
     * @param {Object} position 
     * @returns {Object|null}
     */
    findNearestZoneOfType(type, position) {
        let nearestZone = null;
        let nearestDistance = Infinity;
        
        this.zones.forEach(zone => {
            if (zone.type === type) {
                const dx = position.x - zone.position.x;
                const dy = position.y - zone.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestZone = zone;
                }
            }
        });
        
        return nearestZone;
    }

    /**
     * Update zone effects
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        const now = Date.now();
        
        this.zones.forEach(zone => {
            if (!zone.active) return;
            
            // Process zone effects
            zone.effects.forEach(effect => {
                if (now - effect.lastTick >= effect.interval) {
                    effect.lastTick = now;
                    this.processZoneEffect(zone, effect);
                }
            });
        });
    }

    /**
     * Process a zone effect
     * @param {Object} zone 
     * @param {Object} effect 
     */
    processZoneEffect(zone, effect) {
        switch (effect.type) {
            case 'healing':
                zone.entitiesInZone.forEach(entityId => {
                    const entity = this.entityManager.getEntity(entityId);
                    if (entity && entity.hasComponent('health')) {
                        const health = entity.getComponent('health');
                        health.current = Math.min(health.max, health.current + effect.value);
                        
                        this.eventBus.emit('entity:healed', {
                            entityId,
                            amount: effect.value,
                            source: 'zone',
                            zoneId: zone.id
                        });
                    }
                });
                break;
                
            case 'damage':
                zone.entitiesInZone.forEach(entityId => {
                    const entity = this.entityManager.getEntity(entityId);
                    if (entity && entity.hasComponent('health') && !entity.hasTag('immune_to_environment')) {
                        this.eventBus.emit('damage:environmental', {
                            entityId,
                            amount: effect.value,
                            source: zone.id
                        });
                    }
                });
                break;
        }
    }

    /**
     * Get biome at position
     * @param {Object} position - { x, y }
     * @returns {Object}
     */
    getBiomeAtPosition(position) {
        // Simple biome generation based on position
        // In a real game, this would use noise functions
        const biomeNoise = Math.sin(position.x * 0.1) + Math.cos(position.y * 0.1);
        
        if (biomeNoise > 0.5) return this.biomes.mountain;
        if (biomeNoise < -0.5) return this.biomes.swamp;
        return this.biomes.plains;
    }

    /**
     * Check if enemy spawn is allowed at position
     * @param {Object} position - { x, y }
     * @returns {boolean}
     */
    canSpawnEnemyAt(position) {
        // Check all zones at position
        for (const [zoneId, zone] of this.zones) {
            if (this.isPositionInZone(position, zone)) {
                if (zone.properties.noEnemySpawn) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Get zone info for display
     * @param {string} zoneId 
     * @returns {Object|null}
     */
    getZoneInfo(zoneId) {
        const zone = this.zones.get(zoneId);
        if (!zone) return null;
        
        return {
            id: zone.id,
            type: zone.type,
            name: zone.properties.name || zone.type,
            entityCount: zone.entitiesInZone.size,
            properties: { ...zone.properties }
        };
    }

    /**
     * Clean up
     */
    destroy() {
        this.zones.clear();
        this.entityZones.clear();
    }
}