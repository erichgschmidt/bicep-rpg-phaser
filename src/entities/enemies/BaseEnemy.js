/**
 * BaseEnemy - Base class for all enemy types
 * Leaf-level class that provides common enemy functionality
 */
export default class BaseEnemy {
    /**
     * Create base enemy configuration
     * @param {Object} config - Enemy-specific configuration
     * @returns {Object} Component configuration for entity
     */
    static getBaseComponents(config) {
        const {
            position = { x: 0, y: 0 },
            name = 'Enemy',
            color = 0x808080,
            power = 1,
            health = 50,
            moveSpeed = 300,
            movePattern = 'random',
            pauseChance = 0.5,
            lootTable = []
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
                type: 'enemy',
                name: name,
                color: color,
                strokeColor: 0xff0000,
                strokeWidth: 2,
                radius: 15,
                armColor: 0xff6b6b,
                armLength: 30,
                armWidth: 6
            },

            // AI components
            enemyAI: {
                moveSpeed: moveSpeed + (Math.random() * 100 - 50), // Add variation
                movePattern: movePattern,
                pauseChance: pauseChance,
                nextMoveTime: 0,
                moveDirection: { dx: 0, dy: -1 },
                pauseDuration: 0,
                aggroRange: 5,
                currentTarget: null
            },

            // Enemy-specific data
            enemyData: {
                type: name,
                baseType: config.baseType || name,
                tier: config.tier || 1,
                xpValue: Math.floor(power * 10),
                lootTable: lootTable
            }
        };
    }

    /**
     * Create enemy visual representation
     * @param {Phaser.Scene} scene 
     * @param {Entity} enemyEntity 
     * @returns {Phaser.GameObjects.Container}
     */
    static createVisuals(scene, enemyEntity) {
        const position = enemyEntity.getComponent('position');
        const appearance = enemyEntity.getComponent('appearance');

        // Create container
        const container = scene.add.container(position.pixelX, position.pixelY);

        // Enemy body
        const body = scene.add.circle(0, 0, appearance.radius, appearance.color);
        body.setStrokeStyle(appearance.strokeWidth, appearance.strokeColor);
        body.setInteractive();

        // Enemy arm
        const arm = scene.add.rectangle(-25, 0, appearance.armLength, appearance.armWidth, appearance.armColor);
        arm.setOrigin(1, 0.5);

        // Enemy name
        const nameText = scene.add.text(0, -25, appearance.name, {
            fontSize: '12px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Health bar background
        const healthBarBg = scene.add.rectangle(0, 25, 40, 6, 0x000000);
        
        // Health bar
        const healthBar = scene.add.rectangle(0, 25, 40, 6, 0xff0000);

        // Add all to container
        container.add([body, arm, nameText, healthBarBg, healthBar]);

        // Store references
        container.setData('body', body);
        container.setData('arm', arm);
        container.setData('healthBar', healthBar);
        container.setData('entityId', enemyEntity.id);

        // Set up interaction
        body.on('pointerdown', () => {
            console.log('Enemy clicked!', enemyEntity.id);
            scene.events.emit('enemy:clicked', {
                entityId: enemyEntity.id,
                enemyData: enemyEntity.getComponent('enemyData')
            });
        });

        body.on('pointerover', () => {
            body.setScale(1.2);
        });

        body.on('pointerout', () => {
            body.setScale(1);
        });

        return container;
    }

    /**
     * Update enemy visual state
     * @param {Phaser.GameObjects.Container} container 
     * @param {Entity} enemyEntity 
     */
    static updateVisuals(container, enemyEntity) {
        const health = enemyEntity.getComponent('health');
        const position = enemyEntity.getComponent('position');

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
     * Get movement decision for enemy
     * @param {Entity} enemyEntity 
     * @param {Object} context - { playerPosition, nearbyEnemies, currentTime }
     * @returns {Object|null} - { dx, dy } or null if no movement
     */
    static getMovementDecision(enemyEntity, context) {
        const ai = enemyEntity.getComponent('enemyAI');
        const position = enemyEntity.getComponent('position');

        if (!ai || !position) return null;

        // Check if ready to move
        if (context.currentTime < ai.nextMoveTime) return null;

        // Check if should pause
        if (Math.random() < ai.pauseChance) {
            ai.pauseDuration = 500 + Math.random() * 2000;
            ai.nextMoveTime = context.currentTime + ai.pauseDuration;
            return null;
        }

        // Get movement based on pattern
        let dx = 0, dy = 0;

        switch (ai.movePattern) {
            case 'random':
            case 'erratic':
                const directions = [
                    { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
                    { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
                ];
                const randomDir = directions[Math.floor(Math.random() * directions.length)];
                dx = randomDir.dx;
                dy = randomDir.dy;
                break;

            case 'patrol':
                dx = ai.moveDirection.dx;
                dy = ai.moveDirection.dy;
                // Occasionally change direction
                if (Math.random() < 0.2) {
                    const turns = [{ dx: -dy, dy: dx }, { dx: dy, dy: -dx }];
                    const turn = turns[Math.floor(Math.random() * turns.length)];
                    dx = turn.dx;
                    dy = turn.dy;
                }
                break;

            case 'lazy':
                if (Math.random() < 0.3) {
                    const dirs = [
                        { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
                        { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
                    ];
                    const lazyDir = dirs[Math.floor(Math.random() * dirs.length)];
                    dx = lazyDir.dx;
                    dy = lazyDir.dy;
                }
                break;

            case 'aggressive':
                if (context.playerPosition) {
                    const distToPlayer = Math.abs(position.x - context.playerPosition.x) + 
                                       Math.abs(position.y - context.playerPosition.y);
                    if (distToPlayer <= ai.aggroRange) {
                        dx = Math.sign(context.playerPosition.x - position.x);
                        dy = Math.sign(context.playerPosition.y - position.y);
                        if (dx !== 0 && dy !== 0) {
                            if (Math.random() < 0.5) dx = 0;
                            else dy = 0;
                        }
                    } else {
                        // Random movement when not aggro
                        const aggrDirs = [
                            { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
                            { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
                        ];
                        const aggrDir = aggrDirs[Math.floor(Math.random() * aggrDirs.length)];
                        dx = aggrDir.dx;
                        dy = aggrDir.dy;
                    }
                }
                break;
        }

        if (dx !== 0 || dy !== 0) {
            ai.moveDirection = { dx, dy };
            ai.nextMoveTime = context.currentTime + ai.moveSpeed + (Math.random() * 200 - 100);
            return { dx, dy };
        }

        return null;
    }

    /**
     * Get loot table for enemy
     * @param {Entity} enemyEntity 
     * @returns {Array}
     */
    static getLootTable(enemyEntity) {
        const enemyData = enemyEntity.getComponent('enemyData');
        return enemyData ? enemyData.lootTable : [];
    }

    /**
     * Handle enemy death
     * @param {Entity} enemyEntity 
     * @param {EventBus} eventBus 
     */
    static handleDeath(enemyEntity, eventBus) {
        const enemyData = enemyEntity.getComponent('enemyData');
        const position = enemyEntity.getComponent('position');

        // Emit death event
        eventBus.emit('enemy:died', {
            entityId: enemyEntity.id,
            enemyType: enemyData.type,
            position: position,
            xpValue: enemyData.xpValue,
            lootTable: enemyData.lootTable
        });
    }
}