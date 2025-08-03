/**
 * BaseNeutral - Base class for all neutral entities
 * Exactly mirrors BaseEnemy structure for consistent movement
 */
export default class BaseNeutral {
    /**
     * Get base components for neutral entities
     * @param {Object} config 
     * @returns {Object} Components
     */
    static getBaseComponents(config) {
        const {
            position = { x: 0, y: 0 },
            name = 'Neutral',
            color = 0x808080,
            faction = 'neutral',
            health = 50,
            moveSpeed = 400,      // Time between moves (like enemies)
            movePattern = 'wander',
            pauseChance = 0.5,
            interactionRange = 2,
            canTalk = true,
            canTrade = false,
            dialogues = []
        } = config;

        return {
            // Position component (exactly like enemies)
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

            // Visual components (similar to enemies but different colors)
            appearance: {
                type: 'neutral',
                name: name,
                color: color,
                strokeColor: 0xffffff,
                strokeWidth: 2,
                radius: 15,
                armColor: color,
                armLength: 20,
                armWidth: 5
            },

            // AI components (exactly like enemyAI)
            neutralAI: {
                moveSpeed: moveSpeed + (Math.random() * 100 - 50), // Add variation
                movePattern: movePattern,
                pauseChance: pauseChance,
                nextMoveTime: 0,
                moveDirection: { dx: 0, dy: -1 },
                pauseDuration: 0,
                interactionRange: interactionRange,
                state: 'idle'
            },

            // Faction component
            faction: {
                faction: faction,
                reputation: 0
            },

            // Interaction data
            interactionData: {
                canTalk: canTalk,
                canTrade: canTrade,
                dialogues: dialogues
            }
        };
    }

    /**
     * Create neutral visual representation (exactly like enemies)
     * @param {Phaser.Scene} scene 
     * @param {Entity} entity 
     * @returns {Phaser.GameObjects.Container}
     */
    static createVisuals(scene, entity) {
        const position = entity.getComponent('position');
        const appearance = entity.getComponent('appearance');
        
        // Create container at pixel position
        const container = scene.add.container(position.pixelX, position.pixelY);
        
        // Body
        const body = scene.add.circle(0, 0, appearance.radius, appearance.color);
        body.setStrokeStyle(appearance.strokeWidth, appearance.strokeColor);
        body.setInteractive();
        
        // Arm (smaller than enemies)
        const arm = scene.add.rectangle(15, 0, appearance.armLength, appearance.armWidth, appearance.armColor);
        arm.setOrigin(0, 0.5);
        
        // Name
        const nameText = scene.add.text(0, -25, appearance.name, {
            fontSize: '12px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Health bar background
        const healthBarBg = scene.add.rectangle(0, 25, 40, 6, 0x000000);
        const healthBar = scene.add.rectangle(0, 25, 40, 6, 0x00ff00);
        
        // Add all to container
        container.add([body, arm, nameText, healthBarBg, healthBar]);
        
        // Store references
        container.setData('body', body);
        container.setData('arm', arm);
        container.setData('healthBar', healthBar);
        container.setData('entityId', entity.id);
        
        // Click handler
        body.on('pointerdown', () => {
            const canTalk = entity.getComponent('interactionData')?.canTalk;
            const canTrade = entity.getComponent('interactionData')?.canTrade;
            
            scene.events.emit('neutral:clicked', {
                entityId: entity.id,
                canTalk,
                canTrade
            });
        });
        
        return container;
    }

    /**
     * Update neutral visual
     * @param {Phaser.GameObjects.Container} container 
     * @param {Entity} entity 
     */
    static updateVisuals(container, entity) {
        const health = entity.getComponent('health');
        
        // Update health bar
        const healthBar = container.getData('healthBar');
        if (healthBar && health) {
            const healthPercent = health.current / health.max;
            healthBar.setScale(healthPercent, 1);
            healthBar.x = (healthPercent - 1) * 20;
            
            if (healthPercent > 0.6) {
                healthBar.setFillStyle(0x00ff00);
            } else if (healthPercent > 0.3) {
                healthBar.setFillStyle(0xffff00);
            } else {
                healthBar.setFillStyle(0xff0000);
            }
        }
    }
}