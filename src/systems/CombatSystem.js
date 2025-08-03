/**
 * CombatSystem - Handles arm wrestling combat mechanics
 * Manages DPS calculations, combat states, victory/defeat conditions
 */
export default class CombatSystem {
    constructor(eventBus, entityManager) {
        this.eventBus = eventBus;
        this.entityManager = entityManager;
        
        // Combat state
        this.activeCombats = new Map(); // entityId -> combat data
        this.combatPairs = new Map(); // playerId -> enemyId
        
        // Combat configuration
        this.config = {
            baseClickPower: 1,
            clickCooldown: 0, // milliseconds
            combatStartDelay: 1000, // 1 second before combat starts
            tugThreshold: 0.65, // 65% for victory (easier)
            defeatThreshold: 0.35, // 35% for defeat (harder to lose)
            enemyClickInterval: 200 // Enemy clicks every 200ms (slower)
        };
        
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Player input events
        this.eventBus.on('player:click-attack', this.handlePlayerClick.bind(this));
        this.eventBus.on('player:attack', this.handlePlayerClick.bind(this));
        
        // Combat initiation
        this.eventBus.on('combat:start', this.startCombat.bind(this));
        this.eventBus.on('combat:flee', this.fleeCombat.bind(this));
        this.eventBus.on('player:flee', (data) => {
            // Convert player:flee to combat:flee with player's entity ID
            this.fleeCombat({ entityId: data.attackerId });
        });
        
        // Entity events
        this.eventBus.on('entity:destroyed', (data) => {
            this.endCombat(data.entityId);
        });
    }

    /**
     * Start combat between two entities
     * @param {Object} data - { attackerId, defenderId }
     */
    startCombat(data) {
        const { attackerId, defenderId } = data;
        
        const attacker = this.entityManager.getEntity(attackerId);
        const defender = this.entityManager.getEntity(defenderId);
        
        if (!attacker || !defender) {
            console.error('Cannot start combat - entity not found');
            return;
        }
        
        // Check if entities have required components
        if (!attacker.hasComponent('health') || !defender.hasComponent('health')) {
            console.error('Cannot start combat - entities missing health component');
            return;
        }
        
        // Initialize combat data
        const combatData = {
            attackerId,
            defenderId,
            startTime: Date.now(),
            tugPosition: 0.5, // 0 = defender winning, 1 = attacker winning
            attackerDPS: 0,
            defenderDPS: 0,
            lastAttackerClick: 0,
            lastDefenderClick: 0,
            clickCount: 0,
            state: 'preparing', // preparing, active, ending
            result: null // victory, defeat, fled
        };
        
        // Store combat data
        this.activeCombats.set(attackerId, combatData);
        this.activeCombats.set(defenderId, combatData);
        this.combatPairs.set(attackerId, defenderId);
        this.combatPairs.set(defenderId, attackerId);
        
        // Add combat component to entities
        attacker.addComponent('inCombat', { opponentId: defenderId });
        defender.addComponent('inCombat', { opponentId: attackerId });
        
        // Emit combat started event
        this.eventBus.emit('combat:started', {
            attackerId,
            defenderId,
            combatData
        });
        
        // Start combat after delay
        setTimeout(() => {
            if (this.activeCombats.has(attackerId)) {
                combatData.state = 'active';
                combatData.startTime = Date.now();
                this.eventBus.emit('combat:active', { attackerId, defenderId });
            }
        }, this.config.combatStartDelay);
    }

    /**
     * Handle player click during combat
     * @param {Object} data 
     */
    handlePlayerClick(data) {
        console.log('Player click detected!', data);
        
        // Find player entity (tagged as 'player')
        const players = this.entityManager.getEntitiesByTag('player');
        if (players.length === 0) {
            console.log('No player found!');
            return;
        }
        
        const player = players[0];
        const combatData = this.activeCombats.get(player.id);
        
        if (!combatData || combatData.state !== 'active') {
            console.log('No active combat for player');
            return;
        }
        
        console.log('Processing player click in combat');
        
        // Check click cooldown
        const now = Date.now();
        if (now - combatData.lastAttackerClick < this.config.clickCooldown) return;
        
        // Calculate click power
        const powerComponent = player.getComponent('power');
        const clickPower = powerComponent ? powerComponent.value : this.config.baseClickPower;
        
        // Update combat
        combatData.lastAttackerClick = now;
        combatData.clickCount++;
        combatData.attackerDPS = this.calculateDPS(combatData.clickCount, now - combatData.startTime);
        
        // Apply damage to tug position
        const isAttacker = combatData.attackerId === player.id;
        const tugChange = (clickPower / 100) * (isAttacker ? 1 : -1);
        combatData.tugPosition = Math.max(0, Math.min(1, combatData.tugPosition + tugChange));
        
        // Emit click event
        this.eventBus.emit('combat:player-click', {
            playerId: player.id,
            combatData,
            clickPower,
            tugPosition: combatData.tugPosition
        });
        
        // Check victory/defeat conditions
        this.checkCombatEnd(combatData);
    }

    /**
     * Update combat system
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        const now = Date.now();
        
        // Process each active combat
        this.activeCombats.forEach((combatData, entityId) => {
            // Skip if we've already processed this combat pair
            if (combatData.attackerId !== entityId) return;
            
            if (combatData.state !== 'active') return;
            
            // Process enemy clicks
            this.processEnemyClicks(combatData, now);
            
            // Update tug position based on DPS difference
            this.updateTugPosition(combatData, deltaTime);
            
            // Check for combat end
            this.checkCombatEnd(combatData);
        });
    }

    /**
     * Process enemy automatic clicks
     * @param {Object} combatData 
     * @param {number} now 
     */
    processEnemyClicks(combatData, now) {
        const defender = this.entityManager.getEntity(combatData.defenderId);
        if (!defender || !defender.hasTag('enemy')) return;
        
        // Check if it's time for enemy to click
        if (now - combatData.lastDefenderClick >= this.config.enemyClickInterval) {
            combatData.lastDefenderClick = now;
            
            // Get enemy power
            const powerComponent = defender.getComponent('power');
            const enemyPower = powerComponent ? powerComponent.value : 1;
            
            // Calculate enemy DPS
            const combatTime = (now - combatData.startTime) / 1000;
            combatData.defenderDPS = enemyPower * (1000 / this.config.enemyClickInterval);
            
            // Emit enemy click event
            this.eventBus.emit('combat:enemy-click', {
                enemyId: combatData.defenderId,
                combatData,
                enemyPower
            });
        }
    }

    /**
     * Update tug position based on DPS
     * @param {Object} combatData 
     * @param {number} deltaTime 
     */
    updateTugPosition(combatData, deltaTime) {
        const dpsDifference = combatData.attackerDPS - combatData.defenderDPS;
        const tugChange = (dpsDifference / 20) * (deltaTime / 1000); // Made 5x more responsive
        
        // Debug combat calculations
        console.log('Combat Debug:', {
            attackerDPS: combatData.attackerDPS,
            defenderDPS: combatData.defenderDPS,
            dpsDifference,
            tugChange,
            currentPosition: combatData.tugPosition
        });
        
        combatData.tugPosition = Math.max(0, Math.min(1, combatData.tugPosition + tugChange));
        
        // Emit tug update
        this.eventBus.emit('combat:tug-update', {
            combatData,
            tugPosition: combatData.tugPosition
        });
    }

    /**
     * Check if combat should end
     * @param {Object} combatData 
     */
    checkCombatEnd(combatData) {
        if (combatData.state !== 'active') return;
        
        let result = null;
        
        // Check victory condition
        if (combatData.tugPosition >= this.config.tugThreshold) {
            result = 'victory';
        }
        // Check defeat condition
        else if (combatData.tugPosition <= this.config.defeatThreshold) {
            result = 'defeat';
        }
        
        if (result) {
            combatData.state = 'ending';
            combatData.result = result;
            
            // Calculate rewards
            const attacker = this.entityManager.getEntity(combatData.attackerId);
            const defender = this.entityManager.getEntity(combatData.defenderId);
            
            if (result === 'victory' && attacker && defender) {
                // Calculate XP and loot
                const defenderPower = defender.getComponent('power');
                const xpGained = Math.floor((defenderPower?.value || 1) * 10);
                const goldGained = Math.floor((defenderPower?.value || 1) * 5);
                
                this.eventBus.emit('combat:victory', {
                    winnerId: combatData.attackerId,
                    loserId: combatData.defenderId,
                    xpGained,
                    goldGained,
                    combatData
                });
                
                // Destroy defeated enemy
                this.entityManager.scheduleDestroy(combatData.defenderId);
            } else if (result === 'defeat') {
                this.eventBus.emit('combat:defeat', {
                    winnerId: combatData.defenderId,
                    loserId: combatData.attackerId,
                    combatData
                });
            }
            
            // End combat
            this.endCombat(combatData.attackerId);
        }
    }

    /**
     * Flee from combat
     * @param {Object} data - { entityId }
     */
    fleeCombat(data) {
        const combatData = this.activeCombats.get(data.entityId);
        if (!combatData || combatData.state !== 'active') return;
        
        combatData.state = 'ending';
        combatData.result = 'fled';
        
        this.eventBus.emit('combat:fled', {
            fleeingId: data.entityId,
            combatData
        });
        
        this.endCombat(data.entityId);
    }

    /**
     * End combat for an entity
     * @param {string} entityId 
     */
    endCombat(entityId) {
        const combatData = this.activeCombats.get(entityId);
        if (!combatData) return;
        
        const { attackerId, defenderId } = combatData;
        
        // Remove combat data
        this.activeCombats.delete(attackerId);
        this.activeCombats.delete(defenderId);
        this.combatPairs.delete(attackerId);
        this.combatPairs.delete(defenderId);
        
        // Remove combat components
        const attacker = this.entityManager.getEntity(attackerId);
        const defender = this.entityManager.getEntity(defenderId);
        
        if (attacker) attacker.removeComponent('inCombat');
        if (defender) defender.removeComponent('inCombat');
        
        // Emit combat ended event
        this.eventBus.emit('combat:ended', {
            attackerId,
            defenderId,
            result: combatData.result,
            combatData
        });
    }

    /**
     * Calculate DPS from clicks over time
     * @param {number} clicks 
     * @param {number} timeMs 
     * @returns {number}
     */
    calculateDPS(clicks, timeMs) {
        if (timeMs <= 0) return 0;
        const timeSeconds = timeMs / 1000;
        return clicks / timeSeconds;
    }

    /**
     * Get combat data for an entity
     * @param {string} entityId 
     * @returns {Object|null}
     */
    getCombatData(entityId) {
        return this.activeCombats.get(entityId) || null;
    }

    /**
     * Check if entity is in combat
     * @param {string} entityId 
     * @returns {boolean}
     */
    isInCombat(entityId) {
        return this.activeCombats.has(entityId);
    }

    /**
     * Get combat statistics
     */
    getStats() {
        return {
            activeCombats: this.activeCombats.size / 2, // Divided by 2 since each combat has 2 entities
            combatPairs: Array.from(this.combatPairs.entries())
        };
    }

    /**
     * Clean up the combat system
     */
    destroy() {
        // End all active combats
        const combatIds = new Set();
        this.activeCombats.forEach((data, id) => combatIds.add(id));
        combatIds.forEach(id => this.endCombat(id));
        
        // Clear maps
        this.activeCombats.clear();
        this.combatPairs.clear();
    }
}