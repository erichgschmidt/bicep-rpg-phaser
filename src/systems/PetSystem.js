/**
 * PetSystem - Manages pet ownership, taming, evolution, and pet AI
 * Branch-level system for pet mechanics
 * 
 * Dependencies: EventBus, EntityManager (trunk only)
 */
export default class PetSystem {
    constructor(eventBus, entityManager) {
        this.eventBus = eventBus;
        this.entityManager = entityManager;
        
        // Pet configuration
        this.config = {
            maxPetsPerPlayer: 3,
            tamingDuration: 3000, // 3 seconds
            feedCooldown: 30000, // 30 seconds
            evolutionLevelRequirement: 10,
            happinessDecayRate: 0.1, // Per minute
            loyaltyGainRate: 0.05, // Per positive interaction
            petFollowDistance: {
                min: 1,
                max: 3,
                teleport: 10
            }
        };
        
        // Pet ownership tracking
        this.petOwnership = new Map(); // ownerId -> Set of petIds
        this.petData = new Map(); // petId -> pet data
        
        // Pet types and their properties
        this.petTypes = {
            // Starter pets
            'puppy': {
                name: 'Puppy',
                tier: 1,
                stats: { power: 0.5, speed: 1.2, defense: 0.8 },
                abilities: ['bark', 'fetch'],
                evolution: 'dog',
                tamingDifficulty: 0.8,
                preferredFood: ['bone', 'meat_scrap']
            },
            'kitten': {
                name: 'Kitten',
                tier: 1,
                stats: { power: 0.3, speed: 1.5, defense: 0.6 },
                abilities: ['scratch', 'pounce'],
                evolution: 'cat',
                tamingDifficulty: 0.7,
                preferredFood: ['fish', 'milk']
            },
            'chick': {
                name: 'Chick',
                tier: 1,
                stats: { power: 0.2, speed: 1.0, defense: 0.5 },
                abilities: ['peck', 'flutter'],
                evolution: 'rooster',
                tamingDifficulty: 0.9,
                preferredFood: ['seeds', 'worms']
            },
            
            // Evolved pets
            'dog': {
                name: 'Dog',
                tier: 2,
                stats: { power: 1.5, speed: 1.3, defense: 1.2 },
                abilities: ['bite', 'howl', 'guard'],
                evolution: 'war_hound',
                tamingDifficulty: 0.5,
                preferredFood: ['bone', 'prime_meat']
            },
            'cat': {
                name: 'Cat',
                tier: 2,
                stats: { power: 1.0, speed: 1.8, defense: 1.0 },
                abilities: ['slash', 'stealth', 'nine_lives'],
                evolution: 'panther',
                tamingDifficulty: 0.4,
                preferredFood: ['fish', 'catnip']
            },
            'rooster': {
                name: 'Rooster',
                tier: 2,
                stats: { power: 0.8, speed: 1.2, defense: 0.8 },
                abilities: ['crow', 'spur_attack', 'morning_call'],
                evolution: 'phoenix_chick',
                tamingDifficulty: 0.6,
                preferredFood: ['golden_seeds', 'corn']
            },
            
            // Rare pets
            'mini_dragon': {
                name: 'Mini Dragon',
                tier: 3,
                stats: { power: 2.0, speed: 1.5, defense: 1.8 },
                abilities: ['fire_breath', 'fly', 'dragon_roar'],
                evolution: null, // No further evolution
                tamingDifficulty: 0.2,
                preferredFood: ['gems', 'rare_meat']
            }
        };
        
        // Pet abilities
        this.abilities = {
            // Basic abilities
            'bark': { 
                type: 'debuff', 
                target: 'enemy', 
                effect: 'fear', 
                duration: 2000,
                cooldown: 10000
            },
            'fetch': { 
                type: 'utility', 
                effect: 'retrieve_items', 
                range: 5,
                cooldown: 5000
            },
            'scratch': { 
                type: 'damage', 
                damage: 0.5, 
                cooldown: 3000
            },
            'pounce': { 
                type: 'damage', 
                damage: 0.7, 
                stun: 1000,
                cooldown: 8000
            },
            
            // Advanced abilities
            'bite': { 
                type: 'damage', 
                damage: 1.5, 
                bleed: true,
                cooldown: 5000
            },
            'howl': { 
                type: 'buff', 
                target: 'allies', 
                effect: 'attack_boost', 
                boost: 1.2,
                duration: 10000,
                cooldown: 30000
            },
            'guard': { 
                type: 'defensive', 
                effect: 'protect_owner', 
                damageReduction: 0.3,
                duration: 5000,
                cooldown: 20000
            },
            'stealth': { 
                type: 'buff', 
                target: 'self', 
                effect: 'invisible', 
                duration: 5000,
                cooldown: 15000
            },
            
            // Rare abilities
            'fire_breath': { 
                type: 'damage', 
                damage: 3.0, 
                aoe: true,
                range: 3,
                cooldown: 15000
            },
            'dragon_roar': { 
                type: 'debuff', 
                target: 'all_enemies', 
                effect: 'fear', 
                duration: 3000,
                range: 5,
                cooldown: 60000
            }
        };
        
        // Pet moods affect behavior
        this.moods = {
            happy: { loyaltyBonus: 1.2, abilityBonus: 1.1 },
            neutral: { loyaltyBonus: 1.0, abilityBonus: 1.0 },
            sad: { loyaltyBonus: 0.8, abilityBonus: 0.9 },
            angry: { loyaltyBonus: 0.5, abilityBonus: 1.2 }
        };
        
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Pet management
        this.eventBus.on('pet:start-taming', this.startTaming.bind(this));
        this.eventBus.on('pet:complete-taming', this.completeTaming.bind(this));
        this.eventBus.on('pet:release', this.releasePet.bind(this));
        this.eventBus.on('pet:feed', this.feedPet.bind(this));
        this.eventBus.on('pet:pet', this.petPet.bind(this)); // Petting action
        
        // Pet commands
        this.eventBus.on('pet:command', this.issuePetCommand.bind(this));
        this.eventBus.on('pet:use-ability', this.usePetAbility.bind(this));
        
        // Pet evolution
        this.eventBus.on('pet:check-evolution', this.checkEvolution.bind(this));
        
        // Combat events
        this.eventBus.on('combat:started', this.handleCombat.bind(this));
        this.eventBus.on('entity:died', this.handlePetDeath.bind(this));
        
        // Owner events
        this.eventBus.on('entity:attacked', this.handleOwnerAttacked.bind(this));
        this.eventBus.on('entity:moved', this.handleOwnerMovement.bind(this));
        
        // Time events for happiness decay
        this.eventBus.on('time:hour-changed', this.updatePetHappiness.bind(this));
    }

    /**
     * Start taming a wild creature
     * @param {Object} data - { tamerId, targetId }
     */
    startTaming(data) {
        const { tamerId, targetId } = data;
        
        const tamer = this.entityManager.getEntity(tamerId);
        const target = this.entityManager.getEntity(targetId);
        
        if (!tamer || !target) return;
        
        // Check if target is tameable
        const targetData = target.getComponent('petData');
        if (!targetData || !targetData.isTameable) {
            this.eventBus.emit('pet:error', {
                tamerId,
                error: 'Target cannot be tamed'
            });
            return;
        }
        
        // Check pet limit
        const ownedPets = this.petOwnership.get(tamerId) || new Set();
        if (ownedPets.size >= this.config.maxPetsPerPlayer) {
            this.eventBus.emit('pet:error', {
                tamerId,
                error: 'Pet limit reached'
            });
            return;
        }
        
        // Start taming process
        const tamingData = {
            tamerId,
            targetId,
            startTime: Date.now(),
            progress: 0,
            difficulty: targetData.tamingDifficulty || 0.5,
            interrupted: false
        };
        
        // Add taming component
        target.addComponent('beingTamed', tamingData);
        
        this.eventBus.emit('pet:taming-started', {
            tamerId,
            targetId,
            duration: this.config.tamingDuration
        });
        
        // Schedule completion
        setTimeout(() => {
            if (!tamingData.interrupted) {
                this.completeTaming({ tamerId, targetId });
            }
        }, this.config.tamingDuration);
    }

    /**
     * Complete taming process
     * @param {Object} data - { tamerId, targetId }
     */
    completeTaming(data) {
        const { tamerId, targetId } = data;
        
        const target = this.entityManager.getEntity(targetId);
        if (!target) return;
        
        const tamingData = target.getComponent('beingTamed');
        if (!tamingData || tamingData.interrupted) return;
        
        // Success chance based on difficulty
        const successChance = 1 - tamingData.difficulty;
        if (Math.random() > successChance) {
            this.eventBus.emit('pet:taming-failed', {
                tamerId,
                targetId
            });
            target.removeComponent('beingTamed');
            return;
        }
        
        // Convert to pet
        this.convertToPet(targetId, tamerId);
        
        this.eventBus.emit('pet:tamed', {
            ownerId: tamerId,
            petId: targetId
        });
    }

    /**
     * Convert entity to pet
     * @param {string} entityId 
     * @param {string} ownerId 
     */
    convertToPet(entityId, ownerId) {
        const entity = this.entityManager.getEntity(entityId);
        if (!entity) return;
        
        // Remove hostile tags
        entity.removeTag('hostile');
        entity.removeTag('enemy');
        
        // Add pet tags
        entity.addTag('pet');
        entity.addTag('friendly');
        
        // Initialize pet data
        const petInfo = {
            ownerId,
            petType: entity.getComponent('petData')?.type || 'puppy',
            name: entity.getComponent('appearance')?.name || 'Pet',
            level: 1,
            experience: 0,
            happiness: 100,
            loyalty: 50,
            lastFed: Date.now(),
            lastPetted: Date.now(),
            abilities: [],
            mood: 'happy'
        };
        
        // Get pet type data
        const typeData = this.petTypes[petInfo.petType];
        if (typeData) {
            petInfo.abilities = [...typeData.abilities];
            petInfo.stats = { ...typeData.stats };
        }
        
        // Update components
        entity.addComponent('pet', petInfo);
        entity.addComponent('petAI', {
            state: 'following',
            command: null,
            target: null,
            lastAbilityUse: {}
        });
        
        // Remove taming component
        entity.removeComponent('beingTamed');
        
        // Update ownership
        if (!this.petOwnership.has(ownerId)) {
            this.petOwnership.set(ownerId, new Set());
        }
        this.petOwnership.get(ownerId).add(entityId);
        this.petData.set(entityId, petInfo);
        
        // Change faction to match owner
        const ownerFaction = this.entityManager.getEntity(ownerId)?.getComponent('faction');
        if (ownerFaction) {
            entity.addComponent('faction', {
                faction: ownerFaction.faction,
                baseFaction: 'pet'
            });
        }
    }

    /**
     * Release a pet
     * @param {Object} data - { ownerId, petId }
     */
    releasePet(data) {
        const { ownerId, petId } = data;
        
        const pets = this.petOwnership.get(ownerId);
        if (!pets || !pets.has(petId)) return;
        
        const pet = this.entityManager.getEntity(petId);
        if (!pet) return;
        
        // Remove from ownership
        pets.delete(petId);
        this.petData.delete(petId);
        
        // Remove pet components
        pet.removeComponent('pet');
        pet.removeComponent('petAI');
        
        // Remove pet tags
        pet.removeTag('pet');
        pet.removeTag('friendly');
        
        // Make neutral
        pet.addTag('neutral');
        pet.addComponent('faction', {
            faction: 'wildlife',
            baseFaction: 'wildlife'
        });
        
        this.eventBus.emit('pet:released', {
            ownerId,
            petId
        });
    }

    /**
     * Feed a pet
     * @param {Object} data - { ownerId, petId, itemId }
     */
    feedPet(data) {
        const { ownerId, petId, itemId } = data;
        
        const petInfo = this.petData.get(petId);
        if (!petInfo || petInfo.ownerId !== ownerId) return;
        
        // Check feed cooldown
        const timeSinceLastFed = Date.now() - petInfo.lastFed;
        if (timeSinceLastFed < this.config.feedCooldown) {
            this.eventBus.emit('pet:error', {
                ownerId,
                error: 'Pet is not hungry yet'
            });
            return;
        }
        
        // Check if food is preferred
        const typeData = this.petTypes[petInfo.petType];
        const isPreferred = typeData?.preferredFood?.includes(itemId);
        
        // Update pet stats
        petInfo.lastFed = Date.now();
        petInfo.happiness = Math.min(100, petInfo.happiness + (isPreferred ? 20 : 10));
        petInfo.loyalty = Math.min(100, petInfo.loyalty + this.config.loyaltyGainRate * 10);
        
        // Update mood
        this.updatePetMood(petId);
        
        // Remove food item
        this.eventBus.emit('inventory:remove-item', {
            entityId: ownerId,
            itemId,
            quantity: 1
        });
        
        this.eventBus.emit('pet:fed', {
            ownerId,
            petId,
            itemId,
            happiness: petInfo.happiness
        });
    }

    /**
     * Pet a pet (affection action)
     * @param {Object} data - { ownerId, petId }
     */
    petPet(data) {
        const { ownerId, petId } = data;
        
        const petInfo = this.petData.get(petId);
        if (!petInfo || petInfo.ownerId !== ownerId) return;
        
        // Update stats
        petInfo.lastPetted = Date.now();
        petInfo.happiness = Math.min(100, petInfo.happiness + 5);
        petInfo.loyalty = Math.min(100, petInfo.loyalty + this.config.loyaltyGainRate * 5);
        
        // Update mood
        this.updatePetMood(petId);
        
        this.eventBus.emit('pet:petted', {
            ownerId,
            petId,
            happiness: petInfo.happiness
        });
    }

    /**
     * Issue command to pet
     * @param {Object} data - { ownerId, petId, command, target }
     */
    issuePetCommand(data) {
        const { ownerId, petId, command, target } = data;
        
        const petInfo = this.petData.get(petId);
        if (!petInfo || petInfo.ownerId !== ownerId) return;
        
        const pet = this.entityManager.getEntity(petId);
        const ai = pet?.getComponent('petAI');
        if (!ai) return;
        
        // Check loyalty for complex commands
        const requiredLoyalty = {
            'follow': 0,
            'stay': 20,
            'attack': 40,
            'defend': 60,
            'fetch': 30
        };
        
        if (petInfo.loyalty < (requiredLoyalty[command] || 0)) {
            this.eventBus.emit('pet:error', {
                ownerId,
                error: 'Pet loyalty too low for this command'
            });
            return;
        }
        
        // Update AI state
        ai.command = command;
        ai.target = target;
        
        switch (command) {
            case 'follow':
                ai.state = 'following';
                break;
            case 'stay':
                ai.state = 'staying';
                const pos = pet.getComponent('position');
                if (pos) {
                    ai.stayPosition = { x: pos.x, y: pos.y };
                }
                break;
            case 'attack':
                ai.state = 'attacking';
                break;
            case 'defend':
                ai.state = 'defending';
                break;
            case 'fetch':
                ai.state = 'fetching';
                break;
        }
        
        this.eventBus.emit('pet:command-issued', {
            ownerId,
            petId,
            command,
            target
        });
    }

    /**
     * Use pet ability
     * @param {Object} data - { ownerId, petId, abilityName, target }
     */
    usePetAbility(data) {
        const { ownerId, petId, abilityName, target } = data;
        
        const petInfo = this.petData.get(petId);
        if (!petInfo || petInfo.ownerId !== ownerId) return;
        
        // Check if pet has ability
        if (!petInfo.abilities.includes(abilityName)) {
            this.eventBus.emit('pet:error', {
                ownerId,
                error: 'Pet does not have this ability'
            });
            return;
        }
        
        const ability = this.abilities[abilityName];
        if (!ability) return;
        
        const pet = this.entityManager.getEntity(petId);
        const ai = pet?.getComponent('petAI');
        if (!ai) return;
        
        // Check cooldown
        const lastUse = ai.lastAbilityUse[abilityName] || 0;
        if (Date.now() - lastUse < ability.cooldown) {
            this.eventBus.emit('pet:error', {
                ownerId,
                error: 'Ability on cooldown'
            });
            return;
        }
        
        // Apply mood bonus
        const mood = this.moods[petInfo.mood];
        const abilityPower = ability.damage ? ability.damage * mood.abilityBonus : 1;
        
        // Execute ability
        this.executeAbility(petId, abilityName, target, abilityPower);
        
        // Update cooldown
        ai.lastAbilityUse[abilityName] = Date.now();
        
        this.eventBus.emit('pet:ability-used', {
            petId,
            abilityName,
            target
        });
    }

    /**
     * Execute pet ability
     * @param {string} petId 
     * @param {string} abilityName 
     * @param {string} target 
     * @param {number} power 
     */
    executeAbility(petId, abilityName, target, power) {
        const ability = this.abilities[abilityName];
        
        switch (ability.type) {
            case 'damage':
                if (target) {
                    this.eventBus.emit('damage:deal', {
                        attackerId: petId,
                        targetId: target,
                        amount: ability.damage * power,
                        type: 'pet_ability'
                    });
                }
                break;
                
            case 'buff':
                const buffTargets = ability.target === 'self' ? [petId] : 
                                  ability.target === 'owner' ? [this.petData.get(petId).ownerId] :
                                  this.getNearbyAllies(petId, ability.range || 5);
                
                buffTargets.forEach(targetId => {
                    this.eventBus.emit('buff:apply', {
                        targetId,
                        buff: {
                            type: ability.effect,
                            value: ability.boost || 1,
                            duration: ability.duration
                        }
                    });
                });
                break;
                
            case 'debuff':
                const debuffTargets = ability.target === 'enemy' ? [target] :
                                    this.getNearbyEnemies(petId, ability.range || 5);
                
                debuffTargets.forEach(targetId => {
                    this.eventBus.emit('debuff:apply', {
                        targetId,
                        debuff: {
                            type: ability.effect,
                            duration: ability.duration
                        }
                    });
                });
                break;
                
            case 'utility':
                if (ability.effect === 'retrieve_items') {
                    this.eventBus.emit('pet:fetch-items', {
                        petId,
                        range: ability.range
                    });
                }
                break;
        }
    }

    /**
     * Check if pet can evolve
     * @param {Object} data - { petId }
     */
    checkEvolution(data) {
        const { petId } = data;
        
        const petInfo = this.petData.get(petId);
        if (!petInfo) return;
        
        const typeData = this.petTypes[petInfo.petType];
        if (!typeData || !typeData.evolution) return;
        
        // Check requirements
        if (petInfo.level >= this.config.evolutionLevelRequirement &&
            petInfo.loyalty >= 80) {
            
            this.evolvePet(petId, typeData.evolution);
        }
    }

    /**
     * Evolve pet to next form
     * @param {string} petId 
     * @param {string} evolutionType 
     */
    evolvePet(petId, evolutionType) {
        const petInfo = this.petData.get(petId);
        const pet = this.entityManager.getEntity(petId);
        
        if (!petInfo || !pet) return;
        
        const newTypeData = this.petTypes[evolutionType];
        if (!newTypeData) return;
        
        // Update pet info
        petInfo.petType = evolutionType;
        petInfo.abilities = [...newTypeData.abilities];
        petInfo.stats = { ...newTypeData.stats };
        
        // Update appearance
        const appearance = pet.getComponent('appearance');
        if (appearance) {
            appearance.name = newTypeData.name;
            // Could update visual properties here
        }
        
        // Update power based on new stats
        const power = pet.getComponent('power');
        if (power) {
            power.value *= newTypeData.stats.power;
        }
        
        this.eventBus.emit('pet:evolved', {
            petId,
            oldType: petInfo.petType,
            newType: evolutionType
        });
    }

    /**
     * Handle combat involving pets
     * @param {Object} data - { attackerId, defenderId }
     */
    handleCombat(data) {
        const { defenderId } = data;
        
        // Check if defender has pets
        const defenderPets = this.petOwnership.get(defenderId);
        if (!defenderPets) return;
        
        // Pets defend their owner
        defenderPets.forEach(petId => {
            const pet = this.entityManager.getEntity(petId);
            const ai = pet?.getComponent('petAI');
            if (ai && ai.state !== 'staying') {
                ai.state = 'defending';
                ai.target = data.attackerId;
            }
        });
    }

    /**
     * Handle pet death
     * @param {Object} data - { entityId }
     */
    handlePetDeath(data) {
        const { entityId } = data;
        
        const petInfo = this.petData.get(entityId);
        if (!petInfo) return;
        
        // Remove from ownership but keep data for potential revival
        const pets = this.petOwnership.get(petInfo.ownerId);
        if (pets) {
            pets.delete(entityId);
        }
        
        this.eventBus.emit('pet:died', {
            ownerId: petInfo.ownerId,
            petId: entityId,
            petInfo
        });
    }

    /**
     * Handle owner being attacked
     * @param {Object} data - { targetId, attackerId }
     */
    handleOwnerAttacked(data) {
        const { targetId, attackerId } = data;
        
        const pets = this.petOwnership.get(targetId);
        if (!pets) return;
        
        pets.forEach(petId => {
            const pet = this.entityManager.getEntity(petId);
            const ai = pet?.getComponent('petAI');
            const petInfo = this.petData.get(petId);
            
            if (ai && petInfo) {
                // Loyal pets defend their owner
                if (petInfo.loyalty > 30 && ai.state !== 'staying') {
                    ai.state = 'defending';
                    ai.target = attackerId;
                    
                    // Use defensive abilities if available
                    if (petInfo.abilities.includes('guard')) {
                        this.usePetAbility({
                            ownerId: targetId,
                            petId,
                            abilityName: 'guard',
                            target: targetId
                        });
                    }
                }
            }
        });
    }

    /**
     * Handle owner movement for pet following
     * @param {Object} data - { entityId, newPosition }
     */
    handleOwnerMovement(data) {
        const { entityId } = data;
        
        const pets = this.petOwnership.get(entityId);
        if (!pets) return;
        
        const owner = this.entityManager.getEntity(entityId);
        const ownerPos = owner?.getComponent('position');
        if (!ownerPos) return;
        
        pets.forEach(petId => {
            const pet = this.entityManager.getEntity(petId);
            const ai = pet?.getComponent('petAI');
            const petPos = pet?.getComponent('position');
            
            if (ai && petPos && ai.state === 'following') {
                const distance = Math.abs(petPos.x - ownerPos.x) + 
                               Math.abs(petPos.y - ownerPos.y);
                
                // Teleport if too far
                if (distance > this.config.petFollowDistance.teleport) {
                    petPos.x = ownerPos.x;
                    petPos.y = ownerPos.y;
                    this.eventBus.emit('pet:teleported', { petId });
                }
                // Move closer if needed
                else if (distance > this.config.petFollowDistance.max) {
                    this.eventBus.emit('entity:request-move', {
                        entityId: petId,
                        targetPosition: ownerPos,
                        isPetMovement: true
                    });
                }
            }
        });
    }

    /**
     * Update pet happiness over time
     */
    updatePetHappiness() {
        this.petData.forEach((petInfo, petId) => {
            // Decay happiness
            petInfo.happiness = Math.max(0, petInfo.happiness - this.config.happinessDecayRate);
            
            // Update mood based on happiness
            this.updatePetMood(petId);
            
            // Very unhappy pets may run away
            if (petInfo.happiness < 20 && petInfo.loyalty < 50) {
                this.eventBus.emit('pet:considering-leaving', {
                    petId,
                    ownerId: petInfo.ownerId
                });
            }
        });
    }

    /**
     * Update pet mood based on stats
     * @param {string} petId 
     */
    updatePetMood(petId) {
        const petInfo = this.petData.get(petId);
        if (!petInfo) return;
        
        const oldMood = petInfo.mood;
        
        if (petInfo.happiness > 80) {
            petInfo.mood = 'happy';
        } else if (petInfo.happiness > 50) {
            petInfo.mood = 'neutral';
        } else if (petInfo.happiness > 20) {
            petInfo.mood = 'sad';
        } else {
            petInfo.mood = 'angry';
        }
        
        if (oldMood !== petInfo.mood) {
            this.eventBus.emit('pet:mood-changed', {
                petId,
                oldMood,
                newMood: petInfo.mood
            });
        }
    }

    /**
     * Get nearby allies for ability targeting
     * @param {string} petId 
     * @param {number} range 
     * @returns {Array<string>}
     */
    getNearbyAllies(petId, range) {
        const pet = this.entityManager.getEntity(petId);
        const petPos = pet?.getComponent('position');
        const petFaction = pet?.getComponent('faction');
        
        if (!petPos || !petFaction) return [];
        
        return this.entityManager.query(entity => {
            const pos = entity.getComponent('position');
            const faction = entity.getComponent('faction');
            
            if (!pos || !faction) return false;
            
            const distance = Math.abs(pos.x - petPos.x) + Math.abs(pos.y - petPos.y);
            return distance <= range && faction.faction === petFaction.faction;
        }).map(e => e.id);
    }

    /**
     * Get nearby enemies for ability targeting
     * @param {string} petId 
     * @param {number} range 
     * @returns {Array<string>}
     */
    getNearbyEnemies(petId, range) {
        const pet = this.entityManager.getEntity(petId);
        const petPos = pet?.getComponent('position');
        
        if (!petPos) return [];
        
        return this.entityManager.query(entity => {
            if (!entity.hasTag('hostile') && !entity.hasTag('enemy')) return false;
            
            const pos = entity.getComponent('position');
            if (!pos) return false;
            
            const distance = Math.abs(pos.x - petPos.x) + Math.abs(pos.y - petPos.y);
            return distance <= range;
        }).map(e => e.id);
    }

    /**
     * Get pet info
     * @param {string} petId 
     * @returns {Object|null}
     */
    getPetInfo(petId) {
        return this.petData.get(petId) || null;
    }

    /**
     * Get all pets for owner
     * @param {string} ownerId 
     * @returns {Array}
     */
    getOwnerPets(ownerId) {
        const petIds = this.petOwnership.get(ownerId);
        if (!petIds) return [];
        
        return Array.from(petIds).map(petId => ({
            id: petId,
            ...this.petData.get(petId)
        }));
    }

    /**
     * Clean up
     */
    destroy() {
        this.petOwnership.clear();
        this.petData.clear();
    }
}