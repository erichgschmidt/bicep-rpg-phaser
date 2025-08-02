/**
 * Player - Player entity class
 * Leaf-level class that defines player-specific behavior
 */
export default class Player {
    /**
     * Create a player entity
     * @param {EntityManager} entityManager 
     * @param {Object} config - Player configuration
     */
    static create(entityManager, config = {}) {
        const {
            position = { x: 0, y: 0 },
            name = 'Player',
            startingHealth = 100,
            startingPower = 1
        } = config;

        // Create player entity with all necessary components
        const player = entityManager.createEntity({
            // Core components
            position: {
                x: position.x,
                y: position.y,
                worldX: position.x,
                worldY: position.y,
                pixelX: position.x * 32, // Assuming 32px grid
                pixelY: position.y * 32,
                moving: false
            },
            
            // Combat components
            health: {
                current: startingHealth,
                max: startingHealth
            },
            
            power: {
                value: startingPower
            },
            
            // Visual components
            appearance: {
                type: 'player',
                color: 0x4169e1,
                strokeColor: 0xffffff,
                strokeWidth: 3,
                radius: 20,
                armColor: 0xffb6c1,
                armLength: 30,
                armWidth: 8
            },
            
            // Player-specific components
            playerData: {
                name: name,
                moveSpeed: 200, // Pixels per second for free movement
                moveCooldown: 0 // No cooldown needed for free movement
            },
            
            // Progression component (initialized by ProgressionSystem)
            progression: null,
            
            // Inventory component (initialized by InventorySystem)
            inventory: null,
            
            // Input component
            controllable: {
                enabled: true,
                inputMap: {
                    'up': ['W', 'ArrowUp'],
                    'down': ['S', 'ArrowDown'],
                    'left': ['A', 'ArrowLeft'],
                    'right': ['D', 'ArrowRight'],
                    'attack': ['Space'],
                    'flee': ['Escape'],
                    'interact': ['E']
                }
            }
        }, ['player', 'controllable', 'persistent']);

        return player;
    }

    /**
     * Get default player configuration
     * @returns {Object}
     */
    static getDefaultConfig() {
        return {
            position: { x: 0, y: 0 },
            name: 'Player',
            startingHealth: 100,
            startingPower: 1,
            startingInventorySize: 20,
            startingStatPoints: 0,
            startingTalentPoints: 0
        };
    }

    /**
     * Apply player-specific initialization
     * @param {Entity} playerEntity 
     * @param {EventBus} eventBus 
     */
    static initialize(playerEntity, eventBus) {
        // Player starts at a bonfire (safe zone)
        eventBus.emit('player:spawned', {
            playerId: playerEntity.id,
            position: playerEntity.getComponent('position')
        });

        // Set up player-specific event handlers
        const setupPlayerEvents = () => {
            // Handle respawn
            eventBus.on('player:respawn', (data) => {
                if (data.playerId === playerEntity.id) {
                    const position = playerEntity.getComponent('position');
                    position.x = data.position.x;
                    position.y = data.position.y;
                    position.worldX = data.position.x;
                    position.worldY = data.position.y;
                    position.pixelX = data.position.x * 32;
                    position.pixelY = data.position.y * 32;

                    // Restore health
                    const health = playerEntity.getComponent('health');
                    health.current = Math.floor(health.max * 0.5); // Respawn with 50% health

                    eventBus.emit('player:respawned', {
                        playerId: playerEntity.id,
                        position: data.position
                    });
                }
            });

            // Handle death
            eventBus.on('entity:health-depleted', (data) => {
                if (data.entityId === playerEntity.id) {
                    eventBus.emit('player:died', {
                        playerId: playerEntity.id,
                        position: playerEntity.getComponent('position')
                    });
                }
            });
        };

        setupPlayerEvents();
    }

    /**
     * Create player visual representation
     * @param {Phaser.Scene} scene 
     * @param {Entity} playerEntity 
     * @returns {Phaser.GameObjects.Container}
     */
    static createVisuals(scene, playerEntity) {
        const position = playerEntity.getComponent('position');
        const appearance = playerEntity.getComponent('appearance');
        const playerData = playerEntity.getComponent('playerData');

        // Create container
        const container = scene.add.container(position.pixelX, position.pixelY);

        // Player body
        const body = scene.add.circle(0, 0, appearance.radius, appearance.color);
        body.setStrokeStyle(appearance.strokeWidth, appearance.strokeColor);

        // Player arm
        const arm = scene.add.rectangle(25, 0, appearance.armLength, appearance.armWidth, appearance.armColor);
        arm.setOrigin(0, 0.5);

        // Player name
        const nameText = scene.add.text(0, -35, playerData.name, {
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Health bar background
        const healthBarBg = scene.add.rectangle(0, 30, 50, 8, 0x000000);
        
        // Health bar
        const healthBar = scene.add.rectangle(0, 30, 50, 8, 0x00ff00);

        // Add all to container
        container.add([body, arm, nameText, healthBarBg, healthBar]);

        // Store references for updates
        container.setData('body', body);
        container.setData('arm', arm);
        container.setData('healthBar', healthBar);
        container.setData('entityId', playerEntity.id);

        return container;
    }

    /**
     * Update player visual state
     * @param {Phaser.GameObjects.Container} container 
     * @param {Entity} playerEntity 
     */
    static updateVisuals(container, playerEntity) {
        const health = playerEntity.getComponent('health');
        const position = playerEntity.getComponent('position');

        // Update health bar
        const healthBar = container.getData('healthBar');
        if (healthBar && health) {
            const healthPercent = health.current / health.max;
            healthBar.setScale(healthPercent, 1);
            healthBar.x = (healthPercent - 1) * 25;

            // Change color based on health
            if (healthPercent > 0.6) {
                healthBar.setFillStyle(0x00ff00); // Green
            } else if (healthPercent > 0.3) {
                healthBar.setFillStyle(0xffff00); // Yellow
            } else {
                healthBar.setFillStyle(0xff0000); // Red
            }
        }

        // Update position (handled by movement system usually)
        if (position) {
            container.x = position.pixelX;
            container.y = position.pixelY;
        }
    }

    /**
     * Handle player movement
     * @param {Entity} playerEntity 
     * @param {number} dx - X direction (-1, 0, 1)
     * @param {number} dy - Y direction (-1, 0, 1)
     * @param {EventBus} eventBus 
     */
    static move(playerEntity, dx, dy, eventBus) {
        const position = playerEntity.getComponent('position');
        const controllable = playerEntity.getComponent('controllable');

        if (!position || !controllable || !controllable.enabled || position.moving) {
            return false;
        }

        const oldPosition = {
            x: position.x,
            y: position.y
        };

        const newPosition = {
            x: position.x + dx,
            y: position.y + dy
        };

        // Emit movement request for validation
        eventBus.emit('entity:request-move', {
            entityId: playerEntity.id,
            oldPosition,
            newPosition,
            isPlayer: true
        });

        return true;
    }

    /**
     * Get save data for player
     * @param {Entity} playerEntity 
     * @returns {Object}
     */
    static getSaveData(playerEntity) {
        return {
            id: playerEntity.id,
            components: {
                position: playerEntity.getComponent('position'),
                health: playerEntity.getComponent('health'),
                power: playerEntity.getComponent('power'),
                progression: playerEntity.getComponent('progression'),
                inventory: playerEntity.getComponent('inventory'),
                playerData: playerEntity.getComponent('playerData')
            },
            tags: Array.from(playerEntity.tags)
        };
    }

    /**
     * Load player from save data
     * @param {EntityManager} entityManager 
     * @param {Object} saveData 
     * @returns {Entity}
     */
    static loadFromSave(entityManager, saveData) {
        // Create new player entity
        const player = entityManager.createEntity(saveData.components, saveData.tags);
        
        // Ensure player has all required components
        if (!player.hasComponent('appearance')) {
            player.addComponent('appearance', this.getDefaultConfig().appearance);
        }

        if (!player.hasComponent('controllable')) {
            player.addComponent('controllable', {
                enabled: true,
                inputMap: this.getDefaultConfig().controllable.inputMap
            });
        }

        return player;
    }
}