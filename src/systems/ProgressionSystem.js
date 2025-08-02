/**
 * ProgressionSystem - Handles XP, levels, talent trees, stat calculations
 * Manages character growth and progression mechanics
 */
export default class ProgressionSystem {
    constructor(eventBus, entityManager) {
        this.eventBus = eventBus;
        this.entityManager = entityManager;
        
        // Progression configuration
        this.config = {
            baseXPRequired: 100,
            xpScalingFactor: 2,
            basePowerPerLevel: 1.5,
            baseHealthPerLevel: 10,
            statPointsPerLevel: 3,
            talentPointsPerLevel: 1
        };
        
        // Talent tree definitions
        this.talentTrees = {
            strength: {
                name: 'Strength',
                talents: {
                    ironGrip: {
                        name: 'Iron Grip',
                        maxRanks: 5,
                        effect: 'clickPowerBonus',
                        value: 0.1 // 10% per rank
                    },
                    muscleMemory: {
                        name: 'Muscle Memory',
                        maxRanks: 5,
                        effect: 'attackSpeedBonus',
                        value: 0.05 // 5% per rank
                    },
                    titanStrength: {
                        name: 'Titan Strength',
                        maxRanks: 1,
                        requires: ['ironGrip:3'],
                        effect: 'doubleSizeWhenWinning',
                        value: true
                    }
                }
            },
            defense: {
                name: 'Defense',
                talents: {
                    thickSkin: {
                        name: 'Thick Skin',
                        maxRanks: 5,
                        effect: 'maxHealthBonus',
                        value: 0.1 // 10% per rank
                    },
                    regeneration: {
                        name: 'Regeneration',
                        maxRanks: 3,
                        effect: 'healthRegenPerSecond',
                        value: 1
                    },
                    unstoppable: {
                        name: 'Unstoppable',
                        maxRanks: 1,
                        requires: ['thickSkin:3'],
                        effect: 'immuneWhileFlexing',
                        value: true
                    }
                }
            }
        };
        
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Combat rewards
        this.eventBus.on('combat:victory', this.handleCombatVictory.bind(this));
        
        // Progression events
        this.eventBus.on('progression:add-xp', this.addExperience.bind(this));
        this.eventBus.on('progression:spend-talent', this.spendTalentPoint.bind(this));
        this.eventBus.on('progression:spend-stat', this.spendStatPoint.bind(this));
        
        // Entity creation
        this.eventBus.on('entity:created', this.initializeProgression.bind(this));
    }

    /**
     * Initialize progression for a new entity
     * @param {Object} data - { entity }
     */
    initializeProgression(data) {
        const { entity } = data;
        
        // Only initialize for entities that should have progression
        if (!entity.hasTag('player') && !entity.hasTag('npc')) return;
        
        // Add progression component if not present
        if (!entity.hasComponent('progression')) {
            entity.addComponent('progression', {
                level: 1,
                experience: 0,
                experienceToNext: this.calculateXPRequired(1),
                statPoints: 0,
                talentPoints: 0,
                talents: {},
                stats: {
                    strength: 1,
                    vitality: 1,
                    agility: 1
                }
            });
        }
        
        // Update derived stats
        this.updateDerivedStats(entity);
    }

    /**
     * Handle combat victory rewards
     * @param {Object} data 
     */
    handleCombatVictory(data) {
        const { winnerId, xpGained } = data;
        this.addExperience({ entityId: winnerId, amount: xpGained });
    }

    /**
     * Add experience to an entity
     * @param {Object} data - { entityId, amount }
     */
    addExperience(data) {
        const { entityId, amount } = data;
        const entity = this.entityManager.getEntity(entityId);
        
        if (!entity || !entity.hasComponent('progression')) return;
        
        const progression = entity.getComponent('progression');
        progression.experience += amount;
        
        // Check for level up
        let levelsGained = 0;
        while (progression.experience >= progression.experienceToNext) {
            progression.experience -= progression.experienceToNext;
            progression.level++;
            levelsGained++;
            progression.experienceToNext = this.calculateXPRequired(progression.level);
            
            // Award points
            progression.statPoints += this.config.statPointsPerLevel;
            progression.talentPoints += this.config.talentPointsPerLevel;
        }
        
        if (levelsGained > 0) {
            // Update derived stats
            this.updateDerivedStats(entity);
            
            // Emit level up event
            this.eventBus.emit('progression:level-up', {
                entityId,
                newLevel: progression.level,
                levelsGained,
                progression
            });
        }
        
        // Emit XP gained event
        this.eventBus.emit('progression:xp-gained', {
            entityId,
            amount,
            currentXP: progression.experience,
            progression
        });
    }

    /**
     * Spend a talent point
     * @param {Object} data - { entityId, treeName, talentName }
     */
    spendTalentPoint(data) {
        const { entityId, treeName, talentName } = data;
        const entity = this.entityManager.getEntity(entityId);
        
        if (!entity || !entity.hasComponent('progression')) return;
        
        const progression = entity.getComponent('progression');
        
        // Check if has talent points
        if (progression.talentPoints <= 0) {
            this.eventBus.emit('progression:error', {
                entityId,
                error: 'No talent points available'
            });
            return;
        }
        
        // Get talent definition
        const tree = this.talentTrees[treeName];
        if (!tree) return;
        
        const talent = tree.talents[talentName];
        if (!talent) return;
        
        // Initialize talent tracking
        if (!progression.talents[treeName]) {
            progression.talents[treeName] = {};
        }
        
        const currentRank = progression.talents[treeName][talentName] || 0;
        
        // Check max ranks
        if (currentRank >= talent.maxRanks) {
            this.eventBus.emit('progression:error', {
                entityId,
                error: 'Talent at max rank'
            });
            return;
        }
        
        // Check requirements
        if (talent.requires && !this.checkTalentRequirements(progression, talent.requires)) {
            this.eventBus.emit('progression:error', {
                entityId,
                error: 'Talent requirements not met'
            });
            return;
        }
        
        // Spend point
        progression.talentPoints--;
        progression.talents[treeName][talentName] = currentRank + 1;
        
        // Apply talent effects
        this.applyTalentEffects(entity);
        
        // Emit event
        this.eventBus.emit('progression:talent-learned', {
            entityId,
            treeName,
            talentName,
            newRank: currentRank + 1,
            progression
        });
    }

    /**
     * Spend a stat point
     * @param {Object} data - { entityId, statName }
     */
    spendStatPoint(data) {
        const { entityId, statName } = data;
        const entity = this.entityManager.getEntity(entityId);
        
        if (!entity || !entity.hasComponent('progression')) return;
        
        const progression = entity.getComponent('progression');
        
        // Check if has stat points
        if (progression.statPoints <= 0) {
            this.eventBus.emit('progression:error', {
                entityId,
                error: 'No stat points available'
            });
            return;
        }
        
        // Check valid stat
        if (!progression.stats.hasOwnProperty(statName)) {
            this.eventBus.emit('progression:error', {
                entityId,
                error: 'Invalid stat name'
            });
            return;
        }
        
        // Spend point
        progression.statPoints--;
        progression.stats[statName]++;
        
        // Update derived stats
        this.updateDerivedStats(entity);
        
        // Emit event
        this.eventBus.emit('progression:stat-increased', {
            entityId,
            statName,
            newValue: progression.stats[statName],
            progression
        });
    }

    /**
     * Calculate XP required for a level
     * @param {number} level 
     * @returns {number}
     */
    calculateXPRequired(level) {
        return Math.floor(this.config.baseXPRequired * Math.pow(level, this.config.xpScalingFactor));
    }

    /**
     * Check if talent requirements are met
     * @param {Object} progression 
     * @param {Array<string>} requirements 
     * @returns {boolean}
     */
    checkTalentRequirements(progression, requirements) {
        return requirements.every(req => {
            const [fullTalentName, requiredRank] = req.split(':');
            const [treeName, talentName] = fullTalentName.split('.');
            
            const currentRank = progression.talents[treeName]?.[talentName] || 0;
            return currentRank >= parseInt(requiredRank);
        });
    }

    /**
     * Update derived stats based on level and talents
     * @param {Entity} entity 
     */
    updateDerivedStats(entity) {
        const progression = entity.getComponent('progression');
        if (!progression) return;
        
        // Calculate base stats from level
        const basePower = this.config.basePowerPerLevel * progression.level;
        const baseHealth = this.config.baseHealthPerLevel * progression.level;
        
        // Apply stat bonuses (ensure stats exist)
        if (!progression.stats) {
            progression.stats = { strength: 1, vitality: 1, agility: 1 };
        }
        const strengthBonus = progression.stats.strength * 2;
        const vitalityBonus = progression.stats.vitality * 5;
        
        // Update power component
        if (!entity.hasComponent('power')) {
            entity.addComponent('power', { value: 1 });
        }
        const powerComponent = entity.getComponent('power');
        powerComponent.value = basePower + strengthBonus;
        
        // Update health component
        if (!entity.hasComponent('health')) {
            entity.addComponent('health', { current: 100, max: 100 });
        }
        const healthComponent = entity.getComponent('health');
        const oldMaxHealth = healthComponent.max;
        healthComponent.max = baseHealth + vitalityBonus;
        
        // Scale current health if max increased
        if (healthComponent.max > oldMaxHealth) {
            const healthRatio = healthComponent.current / oldMaxHealth;
            healthComponent.current = Math.floor(healthComponent.max * healthRatio);
        }
        
        // Apply talent effects
        this.applyTalentEffects(entity);
    }

    /**
     * Apply talent effects to entity
     * @param {Entity} entity 
     */
    applyTalentEffects(entity) {
        const progression = entity.getComponent('progression');
        if (!progression) return;
        
        // Reset talent bonuses
        if (!entity.hasComponent('talentBonuses')) {
            entity.addComponent('talentBonuses', {});
        }
        const bonuses = entity.getComponent('talentBonuses');
        
        // Clear previous bonuses
        Object.keys(bonuses).forEach(key => delete bonuses[key]);
        
        // Apply each learned talent
        Object.entries(progression.talents).forEach(([treeName, talents]) => {
            const tree = this.talentTrees[treeName];
            if (!tree) return;
            
            Object.entries(talents).forEach(([talentName, rank]) => {
                const talent = tree.talents[talentName];
                if (!talent || rank <= 0) return;
                
                // Apply effect based on type
                switch (talent.effect) {
                    case 'clickPowerBonus':
                        bonuses.clickPowerMultiplier = (bonuses.clickPowerMultiplier || 1) + (talent.value * rank);
                        break;
                    case 'attackSpeedBonus':
                        bonuses.attackSpeedMultiplier = (bonuses.attackSpeedMultiplier || 1) + (talent.value * rank);
                        break;
                    case 'maxHealthBonus':
                        bonuses.maxHealthMultiplier = (bonuses.maxHealthMultiplier || 1) + (talent.value * rank);
                        break;
                    case 'healthRegenPerSecond':
                        bonuses.healthRegen = (bonuses.healthRegen || 0) + (talent.value * rank);
                        break;
                    case 'doubleSizeWhenWinning':
                    case 'immuneWhileFlexing':
                        bonuses[talent.effect] = true;
                        break;
                }
            });
        });
        
        // Emit talents updated event
        this.eventBus.emit('progression:talents-updated', {
            entityId: entity.id,
            bonuses
        });
    }

    /**
     * Get progression stats for an entity
     * @param {string} entityId 
     * @returns {Object|null}
     */
    getProgressionStats(entityId) {
        const entity = this.entityManager.getEntity(entityId);
        if (!entity || !entity.hasComponent('progression')) return null;
        
        const progression = entity.getComponent('progression');
        return {
            level: progression.level,
            experience: progression.experience,
            experienceToNext: progression.experienceToNext,
            experienceProgress: progression.experience / progression.experienceToNext,
            statPoints: progression.statPoints,
            talentPoints: progression.talentPoints,
            stats: { ...progression.stats },
            talents: JSON.parse(JSON.stringify(progression.talents)) // Deep copy
        };
    }

    /**
     * Reset progression for an entity
     * @param {string} entityId 
     */
    resetProgression(entityId) {
        const entity = this.entityManager.getEntity(entityId);
        if (!entity || !entity.hasComponent('progression')) return;
        
        const progression = entity.getComponent('progression');
        
        // Reset to level 1
        progression.level = 1;
        progression.experience = 0;
        progression.experienceToNext = this.calculateXPRequired(1);
        progression.statPoints = 0;
        progression.talentPoints = 0;
        progression.talents = {};
        progression.stats = {
            strength: 1,
            vitality: 1,
            agility: 1
        };
        
        // Update derived stats
        this.updateDerivedStats(entity);
        
        // Emit reset event
        this.eventBus.emit('progression:reset', { entityId });
    }

    /**
     * Clean up
     */
    destroy() {
        // Nothing to clean up specifically
    }
}