/**
 * BaseNeutral - Base class for all neutral types
 * Exact copy of BaseEnemy pattern but for neutral entities
 */
export default class BaseNeutral {
    /**
     * Create base neutral configuration
     * @param {Object} config - Neutral-specific configuration
     * @returns {Object} Component configuration for entity
     */
    static getBaseComponents(config) {
        const {
            position = { x: 0, y: 0 },
            name = 'Neutral',
            color = 0x808080,
            power = 0,
            health = 50,
            moveSpeed = 300,
            movePattern = 'wander',
            pauseChance = 0.5,
            lootTable = [],
            canTalk = false,
            canTrade = false,
            dialogues = []
        } = config;

        return {
            // Core components - EXACTLY like enemies
            position: {
                x: position.x,
                y: position.y,
                worldX: position.x,
                worldY: position.y,
                pixelX: position.x * 32,
                pixelY: position.y * 32,
                moving: false
            },

            // Combat components
            health: {
                current: health,
                max: health
            },

            power: {
                value: power
            },

            // Visual components
            appearance: {
                type: 'neutral',
                name: name,
                color: color,
                strokeColor: 0x00ff00,  // Green for neutrals
                strokeWidth: 2,
                radius: 15,
                armColor: color,
                armLength: 20,  // Smaller than enemies
                armWidth: 5
            },

            // AI components - EXACTLY like enemyAI
            enemyAI: {  // Use enemyAI component name so MovementManager works
                moveSpeed: moveSpeed + (Math.random() * 100 - 50), // Add variation
                movePattern: movePattern,
                pauseChance: pauseChance,
                nextMoveTime: 0,
                moveDirection: { dx: 0, dy: -1 },
                pauseDuration: 0,
                aggroRange: 0,  // No aggro for neutrals
                currentTarget: null
            },

            // Neutral-specific data
            neutralData: {
                type: name,
                baseType: config.baseType || name,
                tier: 1,
                canTalk: canTalk,
                canTrade: canTrade,
                dialogues: dialogues,
                lootTable: lootTable
            }
        };
    }

    /**
     * Create neutral visual representation - EXACTLY like enemies
     * @param {Phaser.Scene} scene 
     * @param {Entity} neutralEntity 
     * @returns {Phaser.GameObjects.Container}
     */
    static createVisuals(scene, neutralEntity) {
        const position = neutralEntity.getComponent('position');
        const appearance = neutralEntity.getComponent('appearance');

        // Create container - EXACTLY like enemies
        const container = scene.add.container(position.pixelX, position.pixelY);

        // Neutral body
        const body = scene.add.circle(0, 0, appearance.radius, appearance.color);
        body.setStrokeStyle(appearance.strokeWidth, appearance.strokeColor);
        body.setInteractive();

        // Neutral arm
        const arm = scene.add.rectangle(15, 0, appearance.armLength, appearance.armWidth, appearance.armColor);
        arm.setOrigin(0, 0.5);

        // Neutral name
        const nameText = scene.add.text(0, -25, appearance.name, {
            fontSize: '12px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Health bar background
        const healthBarBg = scene.add.rectangle(0, 25, 40, 6, 0x000000);
        
        // Health bar
        const healthBar = scene.add.rectangle(0, 25, 40, 6, 0x00ff00);

        // Add all to container
        container.add([body, arm, nameText, healthBarBg, healthBar]);

        // Store references
        container.setData('body', body);
        container.setData('arm', arm);
        container.setData('healthBar', healthBar);
        container.setData('entityId', neutralEntity.id);

        // Set up interaction
        body.on('pointerdown', () => {
            console.log('Neutral clicked!', neutralEntity.id);
            const neutralData = neutralEntity.getComponent('neutralData');
            scene.events.emit('neutral:clicked', {
                entityId: neutralEntity.id,
                canTalk: neutralData?.canTalk,
                canTrade: neutralData?.canTrade
            });
        });

        body.on('pointerover', () => {
            body.setScale(1.1);
        });

        body.on('pointerout', () => {
            body.setScale(1);
        });

        return container;
    }

    /**
     * Update neutral visual state - EXACTLY like enemies
     * @param {Phaser.GameObjects.Container} container 
     * @param {Entity} neutralEntity 
     */
    static updateVisuals(container, neutralEntity) {
        const health = neutralEntity.getComponent('health');
        const position = neutralEntity.getComponent('position');

        // Update health bar
        const healthBar = container.getData('healthBar');
        if (healthBar && health) {
            const healthPercent = health.current / health.max;
            healthBar.setScale(healthPercent, 1);
            healthBar.x = (healthPercent - 1) * 20;
            
            // Color based on health
            if (healthPercent > 0.6) {
                healthBar.setFillStyle(0x00ff00);
            } else if (healthPercent > 0.3) {
                healthBar.setFillStyle(0xffff00);
            } else {
                healthBar.setFillStyle(0xff0000);
            }
        }

        // Update position - CRITICAL for movement
        if (position) {
            container.x = position.pixelX;
            container.y = position.pixelY;
        }
    }

    /**
     * Handle neutral interaction
     * @param {Entity} neutralEntity 
     * @param {EventBus} eventBus 
     */
    static handleInteraction(neutralEntity, eventBus) {
        const neutralData = neutralEntity.getComponent('neutralData');
        const position = neutralEntity.getComponent('position');

        if (neutralData?.canTalk && neutralData.dialogues.length > 0) {
            const dialogue = neutralData.dialogues[Math.floor(Math.random() * neutralData.dialogues.length)];
            eventBus.emit('dialogue:show', {
                entityId: neutralEntity.id,
                text: dialogue,
                position: position
            });
        }

        if (neutralData?.canTrade) {
            eventBus.emit('shop:open', {
                entityId: neutralEntity.id,
                shopType: neutralData.type
            });
        }
    }
}