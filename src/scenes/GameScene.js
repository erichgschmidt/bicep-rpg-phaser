import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.gridSize = 32;
        this.worldChunkSize = 16; // 16x16 tiles per chunk
        this.moveDelay = 0;
        this.moveSpeed = 180; // ms for move animation (faster, more responsive)
        this.moveCooldown = 200; // ms between moves (player can move more frequently)
        this.chunks = new Map(); // Store world chunks
        this.enemies = new Map(); // Store enemies by chunk
    }

    preload() {
        // We'll use simple shapes for now
    }

    create() {
        // Get core systems from global (temporary)
        this.gameCore = window.gameCore;
        this.eventBus = this.gameCore.eventBus;
        
        // Initialize player
        this.createPlayer();
        
        // Generate initial chunks around player
        this.updateVisibleChunks();
        
        // Create UI
        this.createUI();
        
        // Set up input
        this.setupInput();
        
        // Listen for combat events
        this.setupEventListeners();
    }

    createPlayer() {
        // Start player at world origin (0, 0)
        this.playerContainer = this.add.container(0, 0);
        
        // Player body (blue circle)
        this.player = this.add.circle(0, 0, 20, 0x4169e1);
        this.player.setStrokeStyle(3, 0xffffff);
        
        // Player arm (for arm wrestling visual)
        this.playerArm = this.add.rectangle(25, 0, 30, 8, 0xffb6c1);
        this.playerArm.setOrigin(0, 0.5);
        
        // Player name
        this.playerName = this.add.text(0, -35, 'Player', {
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Health bar
        this.playerHealthBg = this.add.rectangle(0, 30, 50, 8, 0x000000);
        this.playerHealthBar = this.add.rectangle(0, 30, 50, 8, 0x00ff00);
        
        // Add all to container
        this.playerContainer.add([
            this.player,
            this.playerArm,
            this.playerName,
            this.playerHealthBg,
            this.playerHealthBar
        ]);
        
        // Player data
        this.playerData = {
            worldX: 0, // World grid position
            worldY: 0,
            pixelX: 0, // Pixel position
            pixelY: 0,
            power: 1,
            health: 100,
            maxHealth: 100,
            moving: false
        };
        
        // Camera follows player
        this.cameras.main.startFollow(this.playerContainer);
        this.cameras.main.setLerp(0.1, 0.1);
        this.cameras.main.setDeadzone(100, 100);
    }

    getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }

    getChunkCoords(worldX, worldY) {
        return {
            chunkX: Math.floor(worldX / this.worldChunkSize),
            chunkY: Math.floor(worldY / this.worldChunkSize)
        };
    }

    generateChunk(chunkX, chunkY) {
        const key = this.getChunkKey(chunkX, chunkY);
        if (this.chunks.has(key)) return;

        const chunk = {
            x: chunkX,
            y: chunkY,
            graphics: this.add.graphics(),
            enemies: []
        };

        // Draw grid for this chunk
        chunk.graphics.lineStyle(1, 0x444444, 0.3);
        const startX = chunkX * this.worldChunkSize * this.gridSize;
        const startY = chunkY * this.worldChunkSize * this.gridSize;

        // Vertical lines
        for (let x = 0; x <= this.worldChunkSize; x++) {
            chunk.graphics.moveTo(startX + x * this.gridSize, startY);
            chunk.graphics.lineTo(startX + x * this.gridSize, startY + this.worldChunkSize * this.gridSize);
        }

        // Horizontal lines
        for (let y = 0; y <= this.worldChunkSize; y++) {
            chunk.graphics.moveTo(startX, startY + y * this.gridSize);
            chunk.graphics.lineTo(startX + this.worldChunkSize * this.gridSize, startY + y * this.gridSize);
        }

        chunk.graphics.strokePath();

        // Generate enemies based on chunk seed (deterministic)
        const seed = Math.abs(chunkX * 1000 + chunkY);
        const rng = this.createSeededRandom(seed);
        
        // Generate 2-4 enemies per chunk
        const enemyCount = Math.floor(rng() * 3) + 2;
        
        for (let i = 0; i < enemyCount; i++) {
            const localX = Math.floor(rng() * this.worldChunkSize);
            const localY = Math.floor(rng() * this.worldChunkSize);
            const worldX = chunkX * this.worldChunkSize + localX;
            const worldY = chunkY * this.worldChunkSize + localY;
            
            // Don't spawn on player start position
            if (worldX === 0 && worldY === 0) continue;
            
            const enemyType = this.getEnemyTypeFromSeed(rng());
            const enemy = this.createEnemy(worldX, worldY, enemyType);
            chunk.enemies.push(enemy);
        }

        this.chunks.set(key, chunk);
    }

    createSeededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    getEnemyTypeFromSeed(value) {
        const types = [
            { 
                name: 'Pebble', 
                color: 0x808080, 
                power: 0.5,
                moveSpeed: 300, // Very fast but weak
                movePattern: 'erratic', // Jumpy movement
                pauseChance: 0.3 // 30% chance to pause
            },
            { 
                name: 'Stick', 
                color: 0x8b4513, 
                power: 1,
                moveSpeed: 220, // Normal speed
                movePattern: 'patrol', // Back and forth
                pauseChance: 0.4
            },
            { 
                name: 'Rock', 
                color: 0x696969, 
                power: 2,
                moveSpeed: 400, // Slow and steady
                movePattern: 'lazy', // Moves rarely
                pauseChance: 0.7 // Often just sits there
            },
            { 
                name: 'Angry Squirrel', 
                color: 0xcd853f, 
                power: 3,
                moveSpeed: 150, // Very fast
                movePattern: 'aggressive', // Moves a lot
                pauseChance: 0.1 // Rarely stops
            }
        ];
        
        // Weighted selection - weaker enemies more common
        if (value < 0.4) return types[0];
        if (value < 0.7) return types[1];
        if (value < 0.9) return types[2];
        return types[3];
    }

    createEnemy(worldX, worldY, enemyType) {
        const pixelX = worldX * this.gridSize;
        const pixelY = worldY * this.gridSize;
        
        const container = this.add.container(pixelX, pixelY);
        
        // Enemy body
        const body = this.add.circle(0, 0, 15, enemyType.color);
        body.setStrokeStyle(2, 0xff0000);
        body.setInteractive();
        
        // Enemy arm
        const arm = this.add.rectangle(-25, 0, 30, 6, 0xff6b6b);
        arm.setOrigin(1, 0.5);
        
        // Enemy name
        const nameText = this.add.text(0, -25, enemyType.name, {
            fontSize: '12px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Health bar
        const healthBarBg = this.add.rectangle(0, 25, 40, 6, 0x000000);
        const healthBar = this.add.rectangle(0, 25, 40, 6, 0xff0000);
        
        container.add([body, arm, nameText, healthBarBg, healthBar]);
        
        const enemyData = {
            container: container,
            body: body,
            arm: arm,
            nameText: nameText,
            healthBar: healthBar,
            healthBarBg: healthBarBg,
            worldX: worldX,
            worldY: worldY,
            pixelX: pixelX,
            pixelY: pixelY,
            name: enemyType.name,
            power: enemyType.power,
            health: enemyType.power * 50,
            maxHealth: enemyType.power * 50,
            moving: false,
            // Individual movement properties
            moveSpeed: enemyType.moveSpeed + (Math.random() * 100 - 50), // Add some variation
            movePattern: enemyType.movePattern,
            pauseChance: enemyType.pauseChance,
            nextMoveTime: 0,
            moveDirection: { dx: 0, dy: -1 }, // Initial direction
            pauseDuration: 0
        };
        
        body.on('pointerdown', () => {
            this.startCombat(enemyData);
        });
        
        body.on('pointerover', () => {
            body.setScale(1.2);
        });
        
        body.on('pointerout', () => {
            body.setScale(1);
        });
        
        return enemyData;
    }

    updateVisibleChunks() {
        const playerChunk = this.getChunkCoords(this.playerData.worldX, this.playerData.worldY);
        const viewDistance = 2; // View 2 chunks in each direction
        
        // Generate chunks around player
        for (let dx = -viewDistance; dx <= viewDistance; dx++) {
            for (let dy = -viewDistance; dy <= viewDistance; dy++) {
                this.generateChunk(playerChunk.chunkX + dx, playerChunk.chunkY + dy);
            }
        }
        
        // Remove far away chunks to save memory
        const maxDistance = viewDistance + 1;
        this.chunks.forEach((chunk, key) => {
            const distance = Math.max(
                Math.abs(chunk.x - playerChunk.chunkX),
                Math.abs(chunk.y - playerChunk.chunkY)
            );
            
            if (distance > maxDistance) {
                // Destroy chunk graphics and enemies
                chunk.graphics.destroy();
                chunk.enemies.forEach(enemy => {
                    enemy.container.destroy();
                });
                this.chunks.delete(key);
            }
        });
    }

    updateEnemies(time) {
        // Update all enemies in visible chunks
        this.chunks.forEach(chunk => {
            chunk.enemies.forEach(enemy => {
                if (this.isInCombat(enemy)) return;
                
                // Check if enemy is ready to make a decision
                if (time >= enemy.nextMoveTime && !enemy.moving) {
                    // Check if enemy should pause
                    if (Math.random() < enemy.pauseChance) {
                        // Enemy decides to pause
                        enemy.pauseDuration = 500 + Math.random() * 2000; // Pause for 0.5-2.5 seconds
                        enemy.nextMoveTime = time + enemy.pauseDuration;
                        return;
                    }
                    
                    // Enemy decides to move based on pattern
                    let dx = 0, dy = 0;
                    
                    switch (enemy.movePattern) {
                        case 'erratic':
                            // Completely random movement
                            const directions = [
                                { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
                                { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
                            ];
                            const randomDir = directions[Math.floor(Math.random() * directions.length)];
                            dx = randomDir.dx;
                            dy = randomDir.dy;
                            break;
                            
                        case 'patrol':
                            // Continue in same direction, turn if blocked
                            dx = enemy.moveDirection.dx;
                            dy = enemy.moveDirection.dy;
                            // Occasionally change direction
                            if (Math.random() < 0.2) {
                                const turns = [{ dx: -dy, dy: dx }, { dx: dy, dy: -dx }];
                                const turn = turns[Math.floor(Math.random() * turns.length)];
                                dx = turn.dx;
                                dy = turn.dy;
                            }
                            break;
                            
                        case 'lazy':
                            // Move very occasionally
                            if (Math.random() < 0.3) { // Only 30% chance to move
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
                            // Move towards player if nearby, otherwise random
                            const distToPlayer = Math.abs(enemy.worldX - this.playerData.worldX) + 
                                               Math.abs(enemy.worldY - this.playerData.worldY);
                            if (distToPlayer <= 5) {
                                // Move towards player
                                dx = Math.sign(this.playerData.worldX - enemy.worldX);
                                dy = Math.sign(this.playerData.worldY - enemy.worldY);
                                // Prefer one direction
                                if (dx !== 0 && dy !== 0) {
                                    if (Math.random() < 0.5) dx = 0;
                                    else dy = 0;
                                }
                            } else {
                                // Random movement
                                const aggrDirs = [
                                    { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
                                    { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
                                ];
                                const aggrDir = aggrDirs[Math.floor(Math.random() * aggrDirs.length)];
                                dx = aggrDir.dx;
                                dy = aggrDir.dy;
                            }
                            break;
                    }
                    
                    if (dx !== 0 || dy !== 0) {
                        enemy.moveDirection = { dx, dy };
                        this.moveEnemy(enemy, dx, dy);
                    }
                    
                    // Schedule next move based on individual speed
                    enemy.nextMoveTime = time + enemy.moveSpeed + (Math.random() * 200 - 100);
                }
            });
        });
    }

    moveEnemy(enemy, dx, dy) {
        const newWorldX = enemy.worldX + dx;
        const newWorldY = enemy.worldY + dy;
        
        // Check if another enemy is at target position
        let blocked = false;
        this.chunks.forEach(chunk => {
            chunk.enemies.forEach(otherEnemy => {
                if (otherEnemy !== enemy && 
                    otherEnemy.worldX === newWorldX && 
                    otherEnemy.worldY === newWorldY) {
                    blocked = true;
                }
            });
        });
        
        // Check if player is at target position
        if (this.playerData.worldX === newWorldX && this.playerData.worldY === newWorldY) {
            blocked = true;
        }
        
        if (!blocked) {
            enemy.moving = true;
            enemy.worldX = newWorldX;
            enemy.worldY = newWorldY;
            enemy.pixelX = newWorldX * this.gridSize;
            enemy.pixelY = newWorldY * this.gridSize;
            
            // Face the direction of movement
            if (dx > 0) {
                enemy.arm.x = 25;
                enemy.arm.setOrigin(0, 0.5);
            } else if (dx < 0) {
                enemy.arm.x = -25;
                enemy.arm.setOrigin(1, 0.5);
            }
            
            this.tweens.add({
                targets: enemy.container,
                x: enemy.pixelX,
                y: enemy.pixelY,
                duration: enemy.moveSpeed, // Use individual enemy speed
                ease: 'Cubic.easeInOut',
                onComplete: () => {
                    enemy.moving = false;
                    // Small bounce effect on landing
                    this.tweens.add({
                        targets: enemy.body,
                        scaleY: 0.9,
                        duration: 50,
                        yoyo: true,
                        ease: 'Quad.easeOut'
                    });
                }
            });
        }
    }

    createUI() {
        // Title
        this.add.text(600, 30, 'BICEP RPG', {
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0);
        
        // Instructions
        const instructions = [
            'Controls:',
            'WASD/Arrow Keys - Move',
            'Click Enemy - Start Combat',
            'SPACE/Click - Attack in Combat',
            'ESC - Flee from Combat'
        ];
        
        instructions.forEach((text, index) => {
            this.add.text(10, 10 + index * 20, text, {
                fontSize: '14px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }).setScrollFactor(0);
        });
        
        // Player stats
        this.powerText = this.add.text(10, 150, `Power: ${this.playerData.power}`, {
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setScrollFactor(0);
        
        this.healthText = this.add.text(10, 170, `Health: ${this.playerData.health}/${this.playerData.maxHealth}`, {
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setScrollFactor(0);
        
        // Position display
        this.positionText = this.add.text(10, 190, `Position: (0, 0)`, {
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setScrollFactor(0);
        
        // Combat UI
        this.createCombatUI();
    }

    createCombatUI() {
        const centerX = 600;
        const centerY = 400;
        
        // Combat panel
        this.combatPanel = this.add.rectangle(centerX, centerY, 400, 200, 0x000000, 0.8);
        this.combatPanel.setStrokeStyle(3, 0xffffff);
        this.combatPanel.setVisible(false);
        this.combatPanel.setScrollFactor(0);
        
        // Combat title
        this.combatTitle = this.add.text(centerX, centerY - 80, 'ARM WRESTLING!', {
            fontSize: '24px',
            color: '#ff0000',
            stroke: '#ffffff',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.combatTitle.setVisible(false);
        this.combatTitle.setScrollFactor(0);
        
        // Tug of war bar
        this.tugBarBg = this.add.rectangle(centerX, centerY, 300, 30, 0x333333);
        this.tugBarBg.setVisible(false);
        this.tugBarBg.setScrollFactor(0);
        
        this.tugBar = this.add.rectangle(centerX, centerY, 150, 30, 0x00ff00);
        this.tugBar.setVisible(false);
        this.tugBar.setScrollFactor(0);
        
        // Combat text
        this.combatText = this.add.text(centerX, centerY + 50, 'Click or press SPACE to attack!', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.combatText.setVisible(false);
        this.combatText.setScrollFactor(0);
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        
        this.input.on('pointerdown', () => {
            if (this.inCombat) {
                this.eventBus.emit('player:click-attack', { x: this.input.x, y: this.input.y });
            }
        });
    }

    setupEventListeners() {
        this.eventBus.on('combat:started', () => this.showCombatUI());
        this.eventBus.on('combat:tug-update', (data) => this.updateTugBar(data.tugPosition));
        this.eventBus.on('combat:victory', () => {
            this.endCombat(true);
            this.playerData.power += 0.5;
            this.updatePlayerStats();
        });
        this.eventBus.on('combat:defeat', () => {
            this.endCombat(false);
            this.playerData.health = Math.max(0, this.playerData.health - 20);
            this.updatePlayerStats();
        });
        this.eventBus.on('combat:fled', () => this.endCombat(false));
    }

    startCombat(enemy) {
        if (this.inCombat) return;
        
        // Check if adjacent
        const dx = Math.abs(this.playerData.worldX - enemy.worldX);
        const dy = Math.abs(this.playerData.worldY - enemy.worldY);
        
        if (dx > 1 || dy > 1) {
            const message = this.add.text(600, 300, 'Move closer to the enemy!', {
                fontSize: '20px',
                color: '#ff0000',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            }).setOrigin(0.5).setScrollFactor(0);
            
            this.time.delayedCall(1000, () => message.destroy());
            return;
        }
        
        this.inCombat = true;
        this.currentEnemy = enemy;
        this.showCombatUI();
    }

    isInCombat(enemy) {
        return this.inCombat && this.currentEnemy === enemy;
    }

    showCombatUI() {
        this.combatPanel.setVisible(true);
        this.combatTitle.setVisible(true);
        this.tugBarBg.setVisible(true);
        this.tugBar.setVisible(true);
        this.combatText.setVisible(true);
        
        if (this.currentEnemy) {
            this.combatTitle.setText(`Fighting ${this.currentEnemy.name}!`);
        }
    }

    updateTugBar(position) {
        const width = 300 * position;
        this.tugBar.setSize(width, 30);
        this.tugBar.x = 600 - 150 + width / 2;
        
        if (position > 0.75) {
            this.tugBar.setFillStyle(0x00ff00);
        } else if (position < 0.25) {
            this.tugBar.setFillStyle(0xff0000);
        } else {
            this.tugBar.setFillStyle(0xffff00);
        }
    }

    endCombat(victory) {
        this.inCombat = false;
        
        this.combatPanel.setVisible(false);
        this.combatTitle.setVisible(false);
        this.tugBarBg.setVisible(false);
        this.tugBar.setVisible(false);
        this.combatText.setVisible(false);
        
        const message = this.add.text(600, 400, victory ? 'VICTORY!' : 'DEFEATED!', {
            fontSize: '48px',
            color: victory ? '#00ff00' : '#ff0000',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0);
        
        this.time.delayedCall(2000, () => message.destroy());
        
        if (victory && this.currentEnemy) {
            // Find and remove enemy from its chunk
            this.chunks.forEach(chunk => {
                const index = chunk.enemies.indexOf(this.currentEnemy);
                if (index > -1) {
                    chunk.enemies.splice(index, 1);
                }
            });
            
            this.currentEnemy.container.destroy();
        }
        
        this.currentEnemy = null;
    }

    updatePlayerStats() {
        this.powerText.setText(`Power: ${this.playerData.power}`);
        this.healthText.setText(`Health: ${this.playerData.health}/${this.playerData.maxHealth}`);
        
        const healthPercent = this.playerData.health / this.playerData.maxHealth;
        this.playerHealthBar.setScale(healthPercent, 1);
        this.playerHealthBar.x = (healthPercent - 1) * 25;
    }

    update(time, delta) {
        // Update enemies
        this.updateEnemies(time);
        
        // Update move delay
        if (this.moveDelay > 0) {
            this.moveDelay -= delta;
        }
        
        // Handle movement - allow diagonal movement
        if (!this.inCombat && !this.playerData.moving && this.moveDelay <= 0) {
            let dx = 0;
            let dy = 0;
            
            if (this.cursors.left.isDown || this.wasd.A.isDown) dx = -1;
            else if (this.cursors.right.isDown || this.wasd.D.isDown) dx = 1;
            
            if (this.cursors.up.isDown || this.wasd.W.isDown) dy = -1;
            else if (this.cursors.down.isDown || this.wasd.S.isDown) dy = 1;
            
            // Only allow one direction at a time for grid movement
            if (dx !== 0 && dy !== 0) {
                // Prioritize the most recent input
                if (Math.random() < 0.5) dy = 0;
                else dx = 0;
            }
            
            if (dx !== 0 || dy !== 0) {
                this.movePlayer(dx, dy);
            }
        }
        
        // Handle combat input
        if (this.inCombat) {
            if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                this.eventBus.emit('player:attack');
            }
            
            if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
                this.eventBus.emit('combat:flee', { entityId: 'player' });
            }
            
            // Animate arms
            const animTime = time * 0.001;
            this.playerArm.rotation = Math.sin(animTime * 5) * 0.2;
            
            if (this.currentEnemy) {
                this.currentEnemy.arm.rotation = Math.sin(animTime * 5 + Math.PI) * 0.2;
            }
        }
        
        // Update position display
        this.positionText.setText(`Position: (${this.playerData.worldX}, ${this.playerData.worldY})`);
    }

    movePlayer(dx, dy) {
        // Check if enemy at target position
        const newWorldX = this.playerData.worldX + dx;
        const newWorldY = this.playerData.worldY + dy;
        
        let blocked = false;
        this.chunks.forEach(chunk => {
            chunk.enemies.forEach(enemy => {
                if (enemy.worldX === newWorldX && enemy.worldY === newWorldY) {
                    blocked = true;
                }
            });
        });
        
        if (!blocked) {
            this.playerData.moving = true;
            this.playerData.worldX = newWorldX;
            this.playerData.worldY = newWorldY;
            this.playerData.pixelX = newWorldX * this.gridSize;
            this.playerData.pixelY = newWorldY * this.gridSize;
            
            // Face the direction of movement
            if (dx > 0) {
                this.playerArm.x = 25;
                this.playerArm.setOrigin(0, 0.5);
            } else if (dx < 0) {
                this.playerArm.x = -25;
                this.playerArm.setOrigin(1, 0.5);
            }
            
            this.tweens.add({
                targets: this.playerContainer,
                x: this.playerData.pixelX,
                y: this.playerData.pixelY,
                duration: this.moveSpeed,
                ease: 'Cubic.easeInOut',
                onComplete: () => {
                    this.playerData.moving = false;
                    this.updateVisibleChunks();
                    // Small bounce effect on landing
                    this.tweens.add({
                        targets: this.player,
                        scaleY: 0.9,
                        duration: 50,
                        yoyo: true,
                        ease: 'Quad.easeOut'
                    });
                }
            });
            
            this.moveDelay = this.moveCooldown;
        }
    }
}