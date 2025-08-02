/**
 * NeutralMob - Base class for neutral entities
 * Leaf-level class for non-hostile NPCs, wildlife, and merchants
 */
export default class NeutralMob {
    /**
     * Create base neutral mob configuration
     * @param {Object} config - Mob-specific configuration
     * @returns {Object} Component configuration for entity
     */
    static getBaseComponents(config) {
        const {
            position = { x: 0, y: 0 },
            name = 'Neutral',
            color = 0x228b22,
            faction = 'wildlife',
            health = 40,
            moveSpeed = 400,
            movePattern = 'wander',
            pauseChance = 0.6,
            fleeHealth = 0.3,
            dialogues = [],
            shopInventory = null,
            tameable = false,
            petType = null
        } = config;

        return {
            // Core components
            position: {
                x: position.x,
                y: position.y,
                worldX: position.x,
                worldY: position.y,
                pixelX: position.x * 32,
                pixelY: position.y * 32,
                moving: false
            },

            // Health component
            health: {
                current: health,
                max: health
            },

            // Visual components
            appearance: {
                type: 'neutral',
                name: name,
                color: color,
                strokeColor: 0xffffff,
                strokeWidth: 2,
                radius: 15
            },

            // Faction component
            faction: {
                faction: faction,
                baseFaction: faction
            },

            // Neutral AI
            neutralAI: {
                state: 'idle', // idle, wandering, fleeing, trading
                moveSpeed: moveSpeed,
                movePattern: movePattern,
                pauseChance: pauseChance,
                nextMoveTime: 0,
                fleeHealth: fleeHealth,
                fleeTarget: null,
                homePosition: { x: position.x, y: position.y },
                maxWanderDistance: 10,
                interactionRange: 2
            },

            // Interaction data
            interactionData: {
                canTalk: dialogues.length > 0,
                canTrade: shopInventory !== null,
                dialogues: dialogues,
                currentDialogueIndex: 0,
                lastInteraction: 0,
                interactionCooldown: 3000
            },

            // Shop data (if merchant)
            ...(shopInventory && {
                shopData: {
                    inventory: shopInventory,
                    priceModifier: 1.0,
                    restockInterval: 86400000, // 24 hours
                    lastRestock: Date.now()
                }
            }),

            // Pet data (if tameable)
            ...(tameable && {
                petData: {
                    isTameable: true,
                    type: petType,
                    tamingDifficulty: config.tamingDifficulty || 0.5
                }
            })
        };
    }

    /**
     * Create visual representation
     * @param {Phaser.Scene} scene 
     * @param {Entity} entity 
     * @returns {Phaser.GameObjects.Container}
     */
    static createVisuals(scene, entity) {
        const position = entity.getComponent('position');
        const appearance = entity.getComponent('appearance');
        
        const container = scene.add.container(position.pixelX, position.pixelY);
        
        // Body
        const body = scene.add.circle(0, 0, appearance.radius, appearance.color);
        body.setStrokeStyle(appearance.strokeWidth, appearance.strokeColor);
        body.setInteractive();
        
        // Name with faction indicator
        const faction = entity.getComponent('faction');
        const nameColor = this.getNameColor(faction.faction);
        const nameText = scene.add.text(0, -25, appearance.name, {
            fontSize: '12px',
            color: nameColor,
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Health bar
        const healthBarBg = scene.add.rectangle(0, 25, 40, 6, 0x000000);
        const healthBar = scene.add.rectangle(0, 25, 40, 6, 0x00ff00);
        
        // Interaction indicator (if applicable)
        const interaction = entity.getComponent('interactionData');
        if (interaction && (interaction.canTalk || interaction.canTrade)) {
            const indicator = scene.add.text(0, -35, interaction.canTrade ? '$' : '!', {
                fontSize: '16px',
                color: '#ffff00',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            container.add(indicator);
        }
        
        container.add([body, nameText, healthBarBg, healthBar]);
        
        // Store references
        container.setData('body', body);
        container.setData('healthBar', healthBar);
        container.setData('entityId', entity.id);
        
        // Interaction handlers
        body.on('pointerdown', () => {
            scene.events.emit('neutral:clicked', {
                entityId: entity.id,
                canTalk: interaction?.canTalk,
                canTrade: interaction?.canTrade
            });
        });
        
        body.on('pointerover', () => {
            body.setScale(1.1);
            // Show interaction hint
            if (interaction && (interaction.canTalk || interaction.canTrade)) {
                scene.events.emit('ui:show-hint', {
                    text: interaction.canTrade ? 'Click to trade' : 'Click to talk',
                    position: { x: position.pixelX, y: position.pixelY - 40 }
                });
            }
        });
        
        body.on('pointerout', () => {
            body.setScale(1);
            scene.events.emit('ui:hide-hint');
        });
        
        return container;
    }

    /**
     * Get name color based on faction
     * @param {string} faction 
     * @returns {string}
     */
    static getNameColor(faction) {
        const colors = {
            wildlife: '#90ee90',
            merchants: '#ffd700',
            guards: '#4682b4',
            player: '#4169e1'
        };
        return colors[faction] || '#ffffff';
    }

    /**
     * Update visual state
     * @param {Phaser.GameObjects.Container} container 
     * @param {Entity} entity 
     */
    static updateVisuals(container, entity) {
        const health = entity.getComponent('health');
        const position = entity.getComponent('position');
        
        // Update health bar
        const healthBar = container.getData('healthBar');
        if (healthBar && health) {
            const healthPercent = health.current / health.max;
            healthBar.setScale(healthPercent, 1);
            healthBar.x = (healthPercent - 1) * 20;
        }
        
        // Update position
        if (position) {
            container.x = position.pixelX;
            container.y = position.pixelY;
        }
    }

    /**
     * Get movement decision
     * @param {Entity} entity 
     * @param {Object} context 
     * @returns {Object|null}
     */
    static getMovementDecision(entity, context) {
        const ai = entity.getComponent('neutralAI');
        const position = entity.getComponent('position');
        const health = entity.getComponent('health');
        
        if (!ai || !position) return null;
        
        // Check if should flee
        if (health && health.current / health.max < ai.fleeHealth && ai.fleeTarget) {
            return this.getFleeMoveemnt(position, ai.fleeTarget);
        }
        
        // Check if ready to move
        if (context.currentTime < ai.nextMoveTime) return null;
        
        // Check if should pause
        if (Math.random() < ai.pauseChance) {
            ai.nextMoveTime = context.currentTime + 1000 + Math.random() * 3000;
            return null;
        }
        
        // Movement based on pattern
        let dx = 0, dy = 0;
        
        switch (ai.movePattern) {
            case 'wander':
                // Wander within home area
                const distFromHome = Math.abs(position.x - ai.homePosition.x) + 
                                   Math.abs(position.y - ai.homePosition.y);
                
                if (distFromHome >= ai.maxWanderDistance) {
                    // Move back towards home
                    dx = Math.sign(ai.homePosition.x - position.x);
                    dy = Math.sign(ai.homePosition.y - position.y);
                } else {
                    // Random wander
                    const dirs = [
                        { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
                        { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
                    ];
                    const dir = dirs[Math.floor(Math.random() * dirs.length)];
                    dx = dir.dx;
                    dy = dir.dy;
                }
                break;
                
            case 'stationary':
                // Don't move
                return null;
                
            case 'patrol':
                // Simple back and forth patrol
                if (!ai.patrolDirection) {
                    ai.patrolDirection = 1;
                    ai.patrolSteps = 0;
                }
                
                if (ai.patrolSteps >= 5) {
                    ai.patrolDirection *= -1;
                    ai.patrolSteps = 0;
                }
                
                dx = ai.patrolDirection;
                ai.patrolSteps++;
                break;
        }
        
        if (dx !== 0 || dy !== 0) {
            ai.nextMoveTime = context.currentTime + ai.moveSpeed + Math.random() * 500;
            return { dx, dy };
        }
        
        return null;
    }

    /**
     * Get flee movement away from threat
     * @param {Object} position 
     * @param {Object} threatPosition 
     * @returns {Object}
     */
    static getFleeMovement(position, threatPosition) {
        const dx = Math.sign(position.x - threatPosition.x) || (Math.random() < 0.5 ? -1 : 1);
        const dy = Math.sign(position.y - threatPosition.y) || (Math.random() < 0.5 ? -1 : 1);
        
        // Prioritize one direction
        if (Math.random() < 0.5) {
            return { dx, dy: 0 };
        } else {
            return { dx: 0, dy };
        }
    }

    /**
     * Handle interaction
     * @param {Entity} entity 
     * @param {string} interactorId 
     * @param {EventBus} eventBus 
     */
    static interact(entity, interactorId, eventBus) {
        const interaction = entity.getComponent('interactionData');
        if (!interaction) return;
        
        // Check cooldown
        const now = Date.now();
        if (now - interaction.lastInteraction < interaction.interactionCooldown) {
            return;
        }
        
        interaction.lastInteraction = now;
        
        // Check distance
        const position = entity.getComponent('position');
        const interactor = eventBus.entityManager?.getEntity(interactorId);
        const interactorPos = interactor?.getComponent('position');
        
        if (position && interactorPos) {
            const distance = Math.abs(position.x - interactorPos.x) + 
                           Math.abs(position.y - interactorPos.y);
            
            if (distance > entity.getComponent('neutralAI').interactionRange) {
                eventBus.emit('interaction:too-far', {
                    entityId: entity.id,
                    interactorId
                });
                return;
            }
        }
        
        // Handle interaction types
        if (interaction.canTrade) {
            const shop = entity.getComponent('shopData');
            if (shop) {
                eventBus.emit('shop:open', {
                    shopId: entity.id,
                    merchantName: entity.getComponent('appearance').name,
                    inventory: shop.inventory,
                    priceModifier: shop.priceModifier
                });
            }
        } else if (interaction.canTalk) {
            const dialogue = interaction.dialogues[interaction.currentDialogueIndex];
            if (dialogue) {
                eventBus.emit('dialogue:show', {
                    speakerId: entity.id,
                    speakerName: entity.getComponent('appearance').name,
                    text: dialogue,
                    options: [] // Could add dialogue options here
                });
                
                // Cycle to next dialogue
                interaction.currentDialogueIndex = 
                    (interaction.currentDialogueIndex + 1) % interaction.dialogues.length;
            }
        }
    }

    /**
     * Handle being attacked
     * @param {Entity} entity 
     * @param {string} attackerId 
     * @param {EventBus} eventBus 
     */
    static handleAttacked(entity, attackerId, eventBus) {
        const ai = entity.getComponent('neutralAI');
        if (!ai) return;
        
        // Switch to fleeing
        ai.state = 'fleeing';
        ai.fleeTarget = eventBus.entityManager?.getEntity(attackerId)?.getComponent('position');
        
        // Emit distress
        eventBus.emit('neutral:attacked', {
            entityId: entity.id,
            attackerId,
            faction: entity.getComponent('faction')?.faction
        });
    }
}