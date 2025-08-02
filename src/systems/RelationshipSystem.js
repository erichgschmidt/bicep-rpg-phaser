/**
 * RelationshipSystem - Manages faction standings, aggro states, and entity relationships
 * Branch-level system that determines how entities interact with each other
 * 
 * Dependencies: EventBus, EntityManager (trunk only)
 */
export default class RelationshipSystem {
    constructor(eventBus, entityManager) {
        this.eventBus = eventBus;
        this.entityManager = entityManager;
        
        // Faction definitions
        this.factions = {
            player: { name: 'Player', color: 0x4169e1 },
            wildlife: { name: 'Wildlife', color: 0x228b22 },
            bandits: { name: 'Bandits', color: 0x8b0000 },
            merchants: { name: 'Merchants', color: 0xffd700 },
            guards: { name: 'Guards', color: 0x4682b4 },
            monsters: { name: 'Monsters', color: 0x800080 }
        };
        
        // Default faction relationships (-100 to 100)
        // Positive = friendly, 0 = neutral, negative = hostile
        this.defaultRelationships = {
            player: {
                wildlife: 0,      // Neutral
                bandits: -50,     // Hostile
                merchants: 25,    // Friendly
                guards: 10,       // Slightly friendly
                monsters: -75     // Very hostile
            },
            wildlife: {
                player: 0,
                bandits: -25,
                merchants: 0,
                guards: 0,
                monsters: -50
            },
            bandits: {
                player: -50,
                wildlife: -25,
                merchants: -75,
                guards: -100,     // Enemies
                monsters: 0
            },
            merchants: {
                player: 25,
                wildlife: 0,
                bandits: -75,
                guards: 50,       // Protected by guards
                monsters: -50
            },
            guards: {
                player: 10,
                wildlife: 0,
                bandits: -100,    // Enemies
                merchants: 50,    // Protect merchants
                monsters: -75
            },
            monsters: {
                player: -75,
                wildlife: -50,
                bandits: 0,
                merchants: -50,
                guards: -75
            }
        };
        
        // Current relationships (can change during gameplay)
        this.relationships = JSON.parse(JSON.stringify(this.defaultRelationships));
        
        // Aggro states - tracks who is actively hostile to whom
        this.aggroStates = new Map(); // entityId -> Set of entityIds
        
        // Reputation modifiers
        this.reputationModifiers = new Map(); // entityId -> { faction -> modifier }
        
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Entity events
        this.eventBus.on('entity:created', this.initializeRelationships.bind(this));
        this.eventBus.on('entity:attacked', this.handleAttack.bind(this));
        this.eventBus.on('entity:died', this.handleDeath.bind(this));
        
        // Relationship events
        this.eventBus.on('relationship:modify', this.modifyRelationship.bind(this));
        this.eventBus.on('relationship:reset-faction', this.resetFactionRelationships.bind(this));
        
        // Aggro events
        this.eventBus.on('aggro:add', this.addAggro.bind(this));
        this.eventBus.on('aggro:remove', this.removeAggro.bind(this));
        this.eventBus.on('aggro:clear', this.clearAggro.bind(this));
        
        // Zone events (safe zones clear aggro)
        this.eventBus.on('entity:entered-zone', this.handleZoneEntry.bind(this));
    }

    /**
     * Initialize relationships for a new entity
     * @param {Object} data - { entity }
     */
    initializeRelationships(data) {
        const { entity } = data;
        
        // Add faction component if not present
        if (!entity.hasComponent('faction')) {
            // Determine faction based on tags
            let faction = 'wildlife'; // Default
            
            if (entity.hasTag('player')) faction = 'player';
            else if (entity.hasTag('bandit')) faction = 'bandits';
            else if (entity.hasTag('merchant')) faction = 'merchants';
            else if (entity.hasTag('guard')) faction = 'guards';
            else if (entity.hasTag('monster') || entity.hasTag('hostile')) faction = 'monsters';
            
            entity.addComponent('faction', {
                faction: faction,
                baseFaction: faction, // Original faction
                reputation: {}
            });
        }
        
        // Initialize aggro state
        this.aggroStates.set(entity.id, new Set());
    }

    /**
     * Get relationship between two factions
     * @param {string} faction1 
     * @param {string} faction2 
     * @returns {number} -100 to 100
     */
    getRelationship(faction1, faction2) {
        if (faction1 === faction2) return 100; // Same faction always friendly
        
        return this.relationships[faction1]?.[faction2] || 0;
    }

    /**
     * Get relationship between two entities
     * @param {string} entityId1 
     * @param {string} entityId2 
     * @returns {number} -100 to 100
     */
    getEntityRelationship(entityId1, entityId2) {
        if (entityId1 === entityId2) return 100;
        
        const entity1 = this.entityManager.getEntity(entityId1);
        const entity2 = this.entityManager.getEntity(entityId2);
        
        if (!entity1 || !entity2) return 0;
        
        const faction1 = entity1.getComponent('faction');
        const faction2 = entity2.getComponent('faction');
        
        if (!faction1 || !faction2) return 0;
        
        // Base faction relationship
        let relationship = this.getRelationship(faction1.faction, faction2.faction);
        
        // Apply personal reputation modifiers
        const rep1 = this.reputationModifiers.get(entityId1);
        if (rep1 && rep1[faction2.faction]) {
            relationship += rep1[faction2.faction];
        }
        
        const rep2 = this.reputationModifiers.get(entityId2);
        if (rep2 && rep2[faction1.faction]) {
            relationship += rep2[faction1.faction];
        }
        
        // Check aggro state (overrides relationship)
        if (this.hasAggro(entityId1, entityId2) || this.hasAggro(entityId2, entityId1)) {
            relationship = Math.min(relationship, -50); // Force hostile
        }
        
        return Math.max(-100, Math.min(100, relationship));
    }

    /**
     * Check if two entities should be hostile
     * @param {string} entityId1 
     * @param {string} entityId2 
     * @returns {boolean}
     */
    areHostile(entityId1, entityId2) {
        return this.getEntityRelationship(entityId1, entityId2) < -25;
    }

    /**
     * Check if two entities should be friendly
     * @param {string} entityId1 
     * @param {string} entityId2 
     * @returns {boolean}
     */
    areFriendly(entityId1, entityId2) {
        return this.getEntityRelationship(entityId1, entityId2) > 25;
    }

    /**
     * Check if two entities are neutral
     * @param {string} entityId1 
     * @param {string} entityId2 
     * @returns {boolean}
     */
    areNeutral(entityId1, entityId2) {
        const rel = this.getEntityRelationship(entityId1, entityId2);
        return rel >= -25 && rel <= 25;
    }

    /**
     * Handle attack event
     * @param {Object} data - { attackerId, targetId, damage }
     */
    handleAttack(data) {
        const { attackerId, targetId } = data;
        
        const attacker = this.entityManager.getEntity(attackerId);
        const target = this.entityManager.getEntity(targetId);
        
        if (!attacker || !target) return;
        
        // Add aggro
        this.addAggro({ entityId: targetId, targetId: attackerId });
        
        // Faction consequences
        const attackerFaction = attacker.getComponent('faction');
        const targetFaction = target.getComponent('faction');
        
        if (attackerFaction && targetFaction) {
            // Attacking someone reduces reputation with their faction
            this.modifyRelationship({
                entityId: attackerId,
                faction: targetFaction.faction,
                amount: -10
            });
            
            // Allies of the target may aggro
            this.checkAlliedAggro(targetId, attackerId);
            
            // Emit faction combat event
            this.eventBus.emit('faction:combat', {
                attackerFaction: attackerFaction.faction,
                targetFaction: targetFaction.faction,
                attackerId,
                targetId
            });
        }
    }

    /**
     * Handle entity death
     * @param {Object} data - { entityId, killerId }
     */
    handleDeath(data) {
        const { entityId, killerId } = data;
        
        // Clear all aggro for dead entity
        this.clearAggro({ entityId });
        
        if (killerId) {
            const killer = this.entityManager.getEntity(killerId);
            const victim = this.entityManager.getEntity(entityId);
            
            if (killer && victim) {
                const killerFaction = killer.getComponent('faction');
                const victimFaction = victim.getComponent('faction');
                
                if (killerFaction && victimFaction) {
                    // Killing reduces reputation significantly
                    this.modifyRelationship({
                        entityId: killerId,
                        faction: victimFaction.faction,
                        amount: -25
                    });
                    
                    // Emit faction kill event
                    this.eventBus.emit('faction:kill', {
                        killerFaction: killerFaction.faction,
                        victimFaction: victimFaction.faction,
                        killerId,
                        victimId: entityId
                    });
                }
            }
        }
    }

    /**
     * Modify relationship with a faction
     * @param {Object} data - { entityId, faction, amount }
     */
    modifyRelationship(data) {
        const { entityId, faction, amount } = data;
        
        if (!this.reputationModifiers.has(entityId)) {
            this.reputationModifiers.set(entityId, {});
        }
        
        const modifiers = this.reputationModifiers.get(entityId);
        modifiers[faction] = (modifiers[faction] || 0) + amount;
        
        // Clamp to reasonable bounds
        modifiers[faction] = Math.max(-100, Math.min(100, modifiers[faction]));
        
        this.eventBus.emit('relationship:changed', {
            entityId,
            faction,
            modifier: modifiers[faction],
            total: this.getRelationship('player', faction) + modifiers[faction]
        });
    }

    /**
     * Reset faction relationships to default
     * @param {Object} data - { faction }
     */
    resetFactionRelationships(data) {
        const { faction } = data;
        
        if (this.defaultRelationships[faction]) {
            this.relationships[faction] = JSON.parse(JSON.stringify(this.defaultRelationships[faction]));
        }
        
        // Clear all reputation modifiers for this faction
        this.reputationModifiers.forEach((modifiers, entityId) => {
            delete modifiers[faction];
        });
        
        this.eventBus.emit('faction:reset', { faction });
    }

    /**
     * Add aggro between entities
     * @param {Object} data - { entityId, targetId }
     */
    addAggro(data) {
        const { entityId, targetId } = data;
        
        if (!this.aggroStates.has(entityId)) {
            this.aggroStates.set(entityId, new Set());
        }
        
        this.aggroStates.get(entityId).add(targetId);
        
        this.eventBus.emit('aggro:added', {
            entityId,
            targetId
        });
    }

    /**
     * Remove aggro between entities
     * @param {Object} data - { entityId, targetId }
     */
    removeAggro(data) {
        const { entityId, targetId } = data;
        
        const aggros = this.aggroStates.get(entityId);
        if (aggros) {
            aggros.delete(targetId);
        }
        
        this.eventBus.emit('aggro:removed', {
            entityId,
            targetId
        });
    }

    /**
     * Clear all aggro for an entity
     * @param {Object} data - { entityId }
     */
    clearAggro(data) {
        const { entityId } = data;
        
        // Clear this entity's aggro list
        const aggros = this.aggroStates.get(entityId);
        if (aggros) {
            aggros.clear();
        }
        
        // Remove this entity from all other aggro lists
        this.aggroStates.forEach((otherAggros, otherId) => {
            otherAggros.delete(entityId);
        });
        
        this.eventBus.emit('aggro:cleared', { entityId });
    }

    /**
     * Check if entity has aggro on target
     * @param {string} entityId 
     * @param {string} targetId 
     * @returns {boolean}
     */
    hasAggro(entityId, targetId) {
        const aggros = this.aggroStates.get(entityId);
        return aggros ? aggros.has(targetId) : false;
    }

    /**
     * Get all entities that have aggro on target
     * @param {string} targetId 
     * @returns {Array<string>}
     */
    getAggroList(targetId) {
        const aggressors = [];
        
        this.aggroStates.forEach((aggros, entityId) => {
            if (aggros.has(targetId)) {
                aggressors.push(entityId);
            }
        });
        
        return aggressors;
    }

    /**
     * Check if allies should aggro when faction member is attacked
     * @param {string} victimId 
     * @param {string} attackerId 
     */
    checkAlliedAggro(victimId, attackerId) {
        const victim = this.entityManager.getEntity(victimId);
        if (!victim) return;
        
        const victimFaction = victim.getComponent('faction');
        if (!victimFaction) return;
        
        const victimPos = victim.getComponent('position');
        if (!victimPos) return;
        
        // Find nearby allies
        const nearbyAllies = this.entityManager.query(entity => {
            if (entity.id === victimId) return false;
            
            const faction = entity.getComponent('faction');
            const position = entity.getComponent('position');
            
            if (!faction || !position) return false;
            
            // Same faction or friendly
            const relationship = this.getEntityRelationship(entity.id, victimId);
            if (relationship < 25) return false;
            
            // Within aggro assist range (10 tiles)
            const distance = Math.abs(position.x - victimPos.x) + Math.abs(position.y - victimPos.y);
            return distance <= 10;
        });
        
        // Make allies aggro the attacker
        nearbyAllies.forEach(ally => {
            this.addAggro({ entityId: ally.id, targetId: attackerId });
            
            this.eventBus.emit('aggro:assist', {
                allyId: ally.id,
                victimId,
                attackerId
            });
        });
    }

    /**
     * Handle zone entry (safe zones clear aggro)
     * @param {Object} data - { entityId, zone }
     */
    handleZoneEntry(data) {
        const { entityId, zone } = data;
        
        if (zone.properties.safe) {
            // Clear all aggro in safe zones
            this.clearAggro({ entityId });
        }
    }

    /**
     * Get faction info for display
     * @param {string} faction 
     * @returns {Object}
     */
    getFactionInfo(faction) {
        const info = this.factions[faction];
        if (!info) return null;
        
        return {
            ...info,
            relationships: this.relationships[faction] || {}
        };
    }

    /**
     * Get entity's reputation summary
     * @param {string} entityId 
     * @returns {Object}
     */
    getReputationSummary(entityId) {
        const entity = this.entityManager.getEntity(entityId);
        if (!entity) return null;
        
        const faction = entity.getComponent('faction');
        if (!faction) return null;
        
        const modifiers = this.reputationModifiers.get(entityId) || {};
        const summary = {};
        
        Object.keys(this.factions).forEach(factionName => {
            if (factionName !== faction.faction) {
                const base = this.getRelationship(faction.faction, factionName);
                const modifier = modifiers[factionName] || 0;
                summary[factionName] = {
                    base,
                    modifier,
                    total: base + modifier,
                    standing: this.getStandingName(base + modifier)
                };
            }
        });
        
        return summary;
    }

    /**
     * Get standing name from relationship value
     * @param {number} value 
     * @returns {string}
     */
    getStandingName(value) {
        if (value <= -75) return 'Hated';
        if (value <= -50) return 'Hostile';
        if (value <= -25) return 'Unfriendly';
        if (value < 25) return 'Neutral';
        if (value < 50) return 'Friendly';
        if (value < 75) return 'Honored';
        return 'Revered';
    }

    /**
     * Clean up
     */
    destroy() {
        this.aggroStates.clear();
        this.reputationModifiers.clear();
    }
}