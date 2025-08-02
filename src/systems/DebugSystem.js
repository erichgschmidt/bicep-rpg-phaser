/**
 * DebugSystem - Developer testing and debugging tools
 * Branch-level system for testing game features
 * 
 * Dependencies: EventBus, EntityManager (trunk only)
 */
export default class DebugSystem {
    constructor(eventBus, entityManager) {
        this.eventBus = eventBus;
        this.entityManager = entityManager;
        
        // Debug state
        this.enabled = false;
        this.menuVisible = false;
        this.selectedCategory = null;
        
        // Test configurations
        this.testConfigs = {
            entities: {
                name: 'Entity Spawning',
                items: [
                    { label: 'Spawn Pebble Enemy', event: 'debug:spawn-entity', data: { type: 'enemy', subtype: 'Pebble' } },
                    { label: 'Spawn Rock Enemy', event: 'debug:spawn-entity', data: { type: 'enemy', subtype: 'Rock' } },
                    { label: 'Spawn Angry Squirrel', event: 'debug:spawn-entity', data: { type: 'enemy', subtype: 'AngrySquirrel' } },
                    { label: 'Spawn Boulder Boss', event: 'debug:spawn-entity', data: { type: 'enemy', subtype: 'BoulderBoss' } },
                    { label: 'Spawn Rabbit', event: 'debug:spawn-entity', data: { type: 'neutral', subtype: 'Rabbit' } },
                    { label: 'Spawn Wolf', event: 'debug:spawn-entity', data: { type: 'neutral', subtype: 'Wolf' } },
                    { label: 'Spawn Merchant', event: 'debug:spawn-entity', data: { type: 'neutral', subtype: 'Merchant' } },
                    { label: 'Spawn Guard', event: 'debug:spawn-entity', data: { type: 'neutral', subtype: 'TownGuard' } },
                    { label: 'Spawn Wandering Pet', event: 'debug:spawn-entity', data: { type: 'neutral', subtype: 'WanderingPet' } }
                ]
            },
            
            time: {
                name: 'Time Control',
                items: [
                    { label: 'Set Morning (6 AM)', event: 'time:set', data: { hour: 6, minute: 0 } },
                    { label: 'Set Noon (12 PM)', event: 'time:set', data: { hour: 12, minute: 0 } },
                    { label: 'Set Evening (6 PM)', event: 'time:set', data: { hour: 18, minute: 0 } },
                    { label: 'Set Night (10 PM)', event: 'time:set', data: { hour: 22, minute: 0 } },
                    { label: 'Advance 1 Hour', event: 'time:advance', data: { minutes: 60 } },
                    { label: 'Advance 1 Day', event: 'time:advance', data: { minutes: 1440 } },
                    { label: 'Pause Time', event: 'time:pause' },
                    { label: 'Resume Time', event: 'time:resume' }
                ]
            },
            
            player: {
                name: 'Player Cheats',
                items: [
                    { label: 'Heal Full', event: 'debug:player-heal', data: { amount: 9999 } },
                    { label: 'Damage Player (20)', event: 'debug:player-damage', data: { amount: 20 } },
                    { label: 'Add 1000 XP', event: 'progression:add-xp', data: { amount: 1000 } },
                    { label: 'Add Power (+5)', event: 'debug:player-stat', data: { stat: 'power', amount: 5 } },
                    { label: 'Give Protein Shake', event: 'debug:give-item', data: { itemId: 'protein_shake', quantity: 5 } },
                    { label: 'Give 1000 Gold', event: 'debug:give-gold', data: { amount: 1000 } },
                    { label: 'Teleport to Spawn', event: 'debug:teleport', data: { x: 0, y: 0 } }
                ]
            },
            
            relationships: {
                name: 'Faction/Relationships',
                items: [
                    { label: 'Make Wildlife Hostile', event: 'relationship:modify', data: { faction: 'wildlife', amount: -100 } },
                    { label: 'Make Wildlife Friendly', event: 'relationship:modify', data: { faction: 'wildlife', amount: 100 } },
                    { label: 'Make Merchants Love You', event: 'relationship:modify', data: { faction: 'merchants', amount: 100 } },
                    { label: 'Make Guards Hate You', event: 'relationship:modify', data: { faction: 'guards', amount: -100 } },
                    { label: 'Clear All Aggro', event: 'debug:clear-all-aggro' },
                    { label: 'Reset All Factions', event: 'debug:reset-factions' }
                ]
            },
            
            party: {
                name: 'Party Testing',
                items: [
                    { label: 'Spawn Party Member', event: 'debug:spawn-party-member' },
                    { label: 'Set Formation: Line', event: 'party:set-formation', data: { formation: 'line' } },
                    { label: 'Set Formation: Diamond', event: 'party:set-formation', data: { formation: 'diamond' } },
                    { label: 'Set Behavior: Aggressive', event: 'party:set-behavior', data: { behaviorMode: 'aggressive' } },
                    { label: 'Set Behavior: Defensive', event: 'party:set-behavior', data: { behaviorMode: 'defensive' } },
                    { label: 'Command: Attack Nearest', event: 'debug:party-attack-nearest' },
                    { label: 'Command: Follow', event: 'party:command', data: { command: 'follow' } }
                ]
            },
            
            pets: {
                name: 'Pet Testing',
                items: [
                    { label: 'Spawn Tameable Puppy', event: 'debug:spawn-entity', data: { type: 'pet', subtype: 'puppy' } },
                    { label: 'Instant Tame Target', event: 'debug:instant-tame' },
                    { label: 'Max Pet Loyalty', event: 'debug:max-pet-loyalty' },
                    { label: 'Evolve Pet', event: 'debug:evolve-pet' },
                    { label: 'Pet Use Ability', event: 'debug:pet-ability' },
                    { label: 'Feed All Pets', event: 'debug:feed-all-pets' }
                ]
            },
            
            zones: {
                name: 'Zone Testing',
                items: [
                    { label: 'Create Bonfire Here', event: 'debug:create-bonfire' },
                    { label: 'Create Danger Zone', event: 'debug:create-danger-zone' },
                    { label: 'Create Shop Zone', event: 'debug:create-shop-zone' },
                    { label: 'List Active Zones', event: 'debug:list-zones' },
                    { label: 'Teleport to Nearest Bonfire', event: 'debug:teleport-bonfire' }
                ]
            },
            
            combat: {
                name: 'Combat Testing',
                items: [
                    { label: 'Start Combat with Nearest', event: 'debug:combat-nearest' },
                    { label: 'Win Current Combat', event: 'debug:win-combat' },
                    { label: 'Lose Current Combat', event: 'debug:lose-combat' },
                    { label: 'One-Hit Mode Toggle', event: 'debug:toggle-one-hit' },
                    { label: 'God Mode Toggle', event: 'debug:toggle-god-mode' }
                ]
            },
            
            system: {
                name: 'System Info',
                items: [
                    { label: 'Show Entity Count', event: 'debug:show-entity-count' },
                    { label: 'Show Performance Stats', event: 'debug:show-performance' },
                    { label: 'Show Player Stats', event: 'debug:show-player-stats' },
                    { label: 'Show Current Zone', event: 'debug:show-current-zone' },
                    { label: 'Clear Console', event: 'debug:clear-console' },
                    { label: 'Toggle Debug Logging', event: 'debug:toggle-logging' }
                ]
            }
        };
        
        // Debug flags
        this.debugFlags = {
            godMode: false,
            oneHitMode: false,
            infiniteResources: false,
            showEntityIds: false,
            showPerformance: false,
            verboseLogging: false
        };
        
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Debug menu control
        this.eventBus.on('debug:toggle-menu', this.toggleMenu.bind(this));
        this.eventBus.on('debug:execute-test', this.executeTest.bind(this));
        
        // Debug commands
        this.eventBus.on('debug:enable', () => this.enabled = true);
        this.eventBus.on('debug:disable', () => this.enabled = false);
        
        // Spawn commands
        this.eventBus.on('debug:spawn-entity', this.spawnEntity.bind(this));
        this.eventBus.on('debug:spawn-party-member', this.spawnPartyMember.bind(this));
        
        // Player commands
        this.eventBus.on('debug:player-heal', this.healPlayer.bind(this));
        this.eventBus.on('debug:player-damage', this.damagePlayer.bind(this));
        this.eventBus.on('debug:player-stat', this.modifyPlayerStat.bind(this));
        this.eventBus.on('debug:give-item', this.giveItem.bind(this));
        this.eventBus.on('debug:give-gold', this.giveGold.bind(this));
        this.eventBus.on('debug:teleport', this.teleportPlayer.bind(this));
        
        // System commands
        this.eventBus.on('debug:show-entity-count', this.showEntityCount.bind(this));
        this.eventBus.on('debug:show-player-stats', this.showPlayerStats.bind(this));
        this.eventBus.on('debug:clear-console', () => console.clear());
        this.eventBus.on('debug:toggle-logging', () => {
            this.debugFlags.verboseLogging = !this.debugFlags.verboseLogging;
            console.log('Verbose logging:', this.debugFlags.verboseLogging);
        });
        
        // Combat cheats
        this.eventBus.on('debug:toggle-god-mode', () => {
            this.debugFlags.godMode = !this.debugFlags.godMode;
            console.log('God mode:', this.debugFlags.godMode);
        });
        
        this.eventBus.on('debug:toggle-one-hit', () => {
            this.debugFlags.oneHitMode = !this.debugFlags.oneHitMode;
            console.log('One-hit mode:', this.debugFlags.oneHitMode);
        });
        
        // Intercept damage events for god mode
        this.eventBus.on('damage:deal', (data) => {
            if (this.debugFlags.godMode && this.isPlayer(data.targetId)) {
                data.amount = 0;
            } else if (this.debugFlags.oneHitMode && this.isPlayer(data.attackerId)) {
                data.amount = 9999;
            }
        });
    }

    /**
     * Toggle debug menu visibility
     */
    toggleMenu() {
        if (!this.enabled) {
            console.log('Debug system not enabled. Use debug:enable event first.');
            return;
        }
        
        this.menuVisible = !this.menuVisible;
        this.eventBus.emit('debug:menu-toggled', { visible: this.menuVisible });
    }

    /**
     * Execute a test command
     * @param {Object} data - { event, data }
     */
    executeTest(data) {
        if (!this.enabled) return;
        
        const { event, data: eventData } = data;
        
        // Add player context for player-specific events
        if (event.includes('player') || event.includes('progression')) {
            const player = this.getPlayer();
            if (player && eventData) {
                eventData.entityId = player.id;
            }
        }
        
        console.log(`[DEBUG] Executing: ${event}`, eventData);
        this.eventBus.emit(event, eventData);
    }

    /**
     * Spawn an entity near the player
     * @param {Object} data - { type, subtype }
     */
    spawnEntity(data) {
        const { type, subtype } = data;
        const player = this.getPlayer();
        if (!player) return;
        
        const playerPos = player.getComponent('position');
        if (!playerPos) return;
        
        // Find empty position near player
        const position = this.findEmptyPosition(playerPos.x, playerPos.y, 3);
        
        let entity;
        if (type === 'enemy') {
            const { EnemyFactory } = require('../entities/enemies/index.js');
            entity = EnemyFactory.create(this.entityManager, subtype, position);
        } else if (type === 'neutral') {
            const { NeutralFactory } = require('../entities/neutrals/index.js');
            entity = NeutralFactory.create(this.entityManager, subtype, position);
        } else if (type === 'pet') {
            // Spawn tameable creature
            const { WanderingPet } = require('../entities/neutrals/index.js');
            entity = WanderingPet.create(this.entityManager, position);
        }
        
        if (entity) {
            console.log(`[DEBUG] Spawned ${subtype} at`, position);
            
            // Emit visual creation event
            this.eventBus.emit('entity:spawned', { entity });
        }
    }

    /**
     * Spawn a party member
     */
    spawnPartyMember() {
        const player = this.getPlayer();
        if (!player) return;
        
        const playerPos = player.getComponent('position');
        const position = this.findEmptyPosition(playerPos.x, playerPos.y, 2);
        
        // Create a guard as party member
        const { TownGuard } = require('../entities/neutrals/index.js');
        const guard = TownGuard.create(this.entityManager, position);
        
        if (guard) {
            // Create or join party
            let partyId = this.getPlayerPartyId();
            
            if (!partyId) {
                this.eventBus.emit('party:create', {
                    leaderId: player.id,
                    partyName: 'Debug Party'
                });
                partyId = this.getPlayerPartyId();
            }
            
            if (partyId) {
                this.eventBus.emit('party:join', {
                    entityId: guard.id,
                    partyId: partyId
                });
                
                console.log('[DEBUG] Added party member');
            }
        }
    }

    /**
     * Heal player
     * @param {Object} data - { amount }
     */
    healPlayer(data) {
        const player = this.getPlayer();
        if (!player) return;
        
        const health = player.getComponent('health');
        if (health) {
            health.current = Math.min(health.max, health.current + data.amount);
            this.eventBus.emit('entity:healed', {
                entityId: player.id,
                amount: data.amount,
                source: 'debug'
            });
        }
    }

    /**
     * Damage player
     * @param {Object} data - { amount }
     */
    damagePlayer(data) {
        if (this.debugFlags.godMode) {
            console.log('[DEBUG] God mode active, no damage dealt');
            return;
        }
        
        const player = this.getPlayer();
        if (!player) return;
        
        this.eventBus.emit('damage:deal', {
            attackerId: 'debug',
            targetId: player.id,
            amount: data.amount,
            type: 'debug'
        });
    }

    /**
     * Modify player stat
     * @param {Object} data - { stat, amount }
     */
    modifyPlayerStat(data) {
        const player = this.getPlayer();
        if (!player) return;
        
        const component = player.getComponent(data.stat);
        if (component && component.value !== undefined) {
            component.value += data.amount;
            console.log(`[DEBUG] ${data.stat} increased by ${data.amount}`);
        }
    }

    /**
     * Give item to player
     * @param {Object} data - { itemId, quantity }
     */
    giveItem(data) {
        const player = this.getPlayer();
        if (!player) return;
        
        this.eventBus.emit('inventory:add-item', {
            entityId: player.id,
            itemId: data.itemId,
            quantity: data.quantity || 1
        });
    }

    /**
     * Give gold to player
     * @param {Object} data - { amount }
     */
    giveGold(data) {
        // This would integrate with economy system
        console.log(`[DEBUG] Gave ${data.amount} gold to player`);
    }

    /**
     * Teleport player
     * @param {Object} data - { x, y }
     */
    teleportPlayer(data) {
        const player = this.getPlayer();
        if (!player) return;
        
        const position = player.getComponent('position');
        if (position) {
            position.x = data.x;
            position.y = data.y;
            position.worldX = data.x;
            position.worldY = data.y;
            position.pixelX = data.x * 32;
            position.pixelY = data.y * 32;
            
            this.eventBus.emit('entity:teleported', {
                entityId: player.id,
                position: data
            });
        }
    }

    /**
     * Show entity count
     */
    showEntityCount() {
        const stats = this.entityManager.getStats();
        console.log('[DEBUG] Entity Statistics:', stats);
    }

    /**
     * Show player stats
     */
    showPlayerStats() {
        const player = this.getPlayer();
        if (!player) return;
        
        const stats = {
            position: player.getComponent('position'),
            health: player.getComponent('health'),
            power: player.getComponent('power'),
            progression: player.getComponent('progression'),
            inventory: player.getComponent('inventory')
        };
        
        console.log('[DEBUG] Player Stats:', stats);
    }

    /**
     * Get player entity
     * @returns {Entity|null}
     */
    getPlayer() {
        const players = this.entityManager.getEntitiesByTag('player');
        return players.length > 0 ? players[0] : null;
    }

    /**
     * Check if entity is player
     * @param {string} entityId 
     * @returns {boolean}
     */
    isPlayer(entityId) {
        const entity = this.entityManager.getEntity(entityId);
        return entity ? entity.hasTag('player') : false;
    }

    /**
     * Get player's party ID
     * @returns {string|null}
     */
    getPlayerPartyId() {
        const player = this.getPlayer();
        if (!player) return null;
        
        const partyRole = player.getComponent('partyRole');
        return partyRole ? partyRole.partyId : null;
    }

    /**
     * Find empty position near target
     * @param {number} targetX 
     * @param {number} targetY 
     * @param {number} maxDistance 
     * @returns {Object}
     */
    findEmptyPosition(targetX, targetY, maxDistance) {
        // Simple spiral search for empty position
        for (let d = 1; d <= maxDistance; d++) {
            for (let dx = -d; dx <= d; dx++) {
                for (let dy = -d; dy <= d; dy++) {
                    if (Math.abs(dx) === d || Math.abs(dy) === d) {
                        const x = targetX + dx;
                        const y = targetY + dy;
                        
                        // Check if position is empty
                        const occupied = this.entityManager.query(entity => {
                            const pos = entity.getComponent('position');
                            return pos && pos.x === x && pos.y === y;
                        }).length > 0;
                        
                        if (!occupied) {
                            return { x, y };
                        }
                    }
                }
            }
        }
        
        // Fallback to offset position
        return { x: targetX + 1, y: targetY + 1 };
    }

    /**
     * Get debug menu configuration
     * @returns {Object}
     */
    getMenuConfig() {
        return this.testConfigs;
    }

    /**
     * Get debug flags
     * @returns {Object}
     */
    getDebugFlags() {
        return this.debugFlags;
    }

    /**
     * Clean up
     */
    destroy() {
        this.enabled = false;
        this.menuVisible = false;
    }
}