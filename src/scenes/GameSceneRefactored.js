/**
 * GameSceneRefactored - Main game scene using proper architecture
 * Leaf-level scene that orchestrates all systems
 */
import Phaser from 'phaser';
import Player from '../entities/Player.js';
import { EnemyFactory } from '../entities/enemies/index.js';
import { NeutralFactory } from '../entities/neutrals/index.js';
import BaseEnemy from '../entities/enemies/BaseEnemy.js';
import NeutralMob from '../entities/neutrals/NeutralMob.js';
import CombatUI from '../ui/CombatUI.js';
import DebugUI from '../ui/DebugUI.js';

export default class GameSceneRefactored extends Phaser.Scene {
    constructor() {
        super({ key: 'GameSceneRefactored' });
        
        // Scene configuration
        this.config = {
            gridSize: 32,
            chunkSize: 16,
            viewDistance: 2
        };
        
        // Visual containers
        this.entityVisuals = new Map(); // entityId -> Phaser container
        this.chunks = new Map(); // chunkKey -> chunk data
    }

    preload() {
        // Load any assets if needed
    }

    create() {
        // Get systems from game core
        this.systems = window.gameCore;
        this.eventBus = this.systems.eventBus;
        
        // Enable debug system
        this.eventBus.emit('debug:enable');
        
        // Create background
        this.createBackground();
        
        // Initialize systems that need scene reference
        this.initializeSystems();
        
        // Create player at bonfire
        this.createPlayer();
        
        // Create initial world
        this.createInitialWorld();
        
        // Set up input handling
        this.setupInput();
        
        // Set up system event listeners
        this.setupEventListeners();
        
        // Start time system
        this.eventBus.emit('time:resume');
        
        // Create UI components
        this.combatUI = new CombatUI(this, this.systems.combatSystem);
        this.debugUI = new DebugUI(this, this.systems.debugSystem);
        
        // Create debug button
        this.createDebugButton();
        
        // Create game HUD
        this.createGameHUD();
    }

    initializeSystems() {
        // Register scene with systems that need it
        this.eventBus.emit('scene:register', {
            scene: this,
            sceneKey: 'GameSceneRefactored'
        });
    }

    createBackground() {
        // Create grid background
        this.gridGraphics = this.add.graphics();
        this.updateGridDisplay();
    }

    createPlayer() {
        // Create player entity using Player class
        const playerEntity = Player.create(this.systems.entityManager, {
            position: { x: 0, y: 0 },
            name: 'Hero',
            startingHealth: 100,
            startingPower: 2  // Increased for testing combat
        });
        
        // Initialize player
        Player.initialize(playerEntity, this.eventBus);
        
        // Create visual representation
        const playerVisual = Player.createVisuals(this, playerEntity);
        this.entityVisuals.set(playerEntity.id, playerVisual);
        
        // Ensure position is synced with visual
        const pos = playerEntity.getComponent('position');
        if (pos) {
            pos.pixelX = playerVisual.x;
            pos.pixelY = playerVisual.y;
        }
        
        // Store player reference
        this.playerId = playerEntity.id;
        
        // Camera follows player
        this.cameras.main.startFollow(playerVisual);
        this.cameras.main.setLerp(0.1, 0.1);
        this.cameras.main.setDeadzone(100, 100);
    }

    createInitialWorld() {
        // Create bonfire safe zone at origin
        this.eventBus.emit('zone:create', {
            id: 'bonfire_spawn',
            type: 'bonfire',
            position: { x: 0, y: 0 },
            radius: 5,
            properties: {
                name: 'Spawn Bonfire',
                safe: true,
                noEnemySpawn: true,
                healing: true,
                respawnPoint: true,
                light: { radius: 10, color: 0xffa500 }
            }
        });
        
        // Create visual bonfire
        this.createBonfireVisual(0, 0);
        
        // Generate initial chunks
        this.updateVisibleChunks();
        
        // Create some initial NPCs near spawn
        this.createInitialNPCs();
        
        // Create test enemy for combat debugging
        // this.createTestEnemy(); // Commented out - was spawning enemy in safe zone
    }

    createBonfireVisual(x, y) {
        const pixelX = x * this.config.gridSize;
        const pixelY = y * this.config.gridSize;
        
        // Bonfire base
        const base = this.add.circle(pixelX, pixelY, 20, 0x8b4513);
        base.setStrokeStyle(3, 0x654321);
        
        // Fire effect (simple animation)
        const fire1 = this.add.circle(pixelX - 5, pixelY - 5, 8, 0xff6600);
        const fire2 = this.add.circle(pixelX + 5, pixelY - 5, 8, 0xff9900);
        const fire3 = this.add.circle(pixelX, pixelY - 10, 10, 0xffcc00);
        
        // Animate fire
        this.tweens.add({
            targets: [fire1, fire2, fire3],
            scaleX: 1.2,
            scaleY: 1.3,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Light glow
        const glow = this.add.circle(pixelX, pixelY, 150, 0xffa500, 0.1);
    }

    createTestEnemy() {
        // Create a test enemy right next to the player for easy combat testing
        const testEnemy = EnemyFactory.create(
            this.systems.entityManager,
            'Pebble',
            { x: 1, y: 0 }  // Right next to player at spawn
        );
        
        if (testEnemy) {
            this.createEntityVisual(testEnemy);
            console.log('Test enemy created for combat testing at (1,0)');
            
            // Add a manual combat starter for testing
            window.startTestCombat = () => {
                console.log('Starting test combat manually...');
                this.eventBus.emit('combat:start', {
                    attackerId: this.playerId,
                    defenderId: testEnemy.id
                });
            };
        }
    }

    createDebugButton() {
        // Create debug button in top-right corner
        const buttonX = this.cameras.main.width - 80;
        const buttonY = 30;
        
        // Button background
        const buttonBg = this.add.rectangle(buttonX, buttonY, 70, 40, 0xff0000, 0.8);
        buttonBg.setStrokeStyle(2, 0xffffff);
        buttonBg.setScrollFactor(0); // Fixed to camera
        buttonBg.setDepth(500);
        buttonBg.setInteractive();
        
        // Button text
        const buttonText = this.add.text(buttonX, buttonY, 'DEBUG', {
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        buttonText.setScrollFactor(0);
        buttonText.setDepth(501);
        
        // Click handler
        buttonBg.on('pointerdown', () => {
            this.eventBus.emit('debug:toggle-menu');
            
            // Visual feedback
            this.tweens.add({
                targets: [buttonBg, buttonText],
                scale: 0.9,
                duration: 100,
                yoyo: true,
                ease: 'Quad.easeOut'
            });
        });
        
        // Hover effects
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0xff4444);
            buttonText.setScale(1.1);
        });
        
        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0xff0000);
            buttonText.setScale(1.0);
        });
        
        // Store references
        this.debugButton = buttonBg;
        this.debugButtonText = buttonText;
    }

    createGameHUD() {
        // Game title
        const title = this.add.text(20, 20, 'BICEP RPG', {
            fontSize: '28px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold'
        });
        title.setScrollFactor(0);
        title.setDepth(500);
        
        // Instructions
        const instructions = this.add.text(20, 60, [
            'WASD/Arrows: Move',
            'Click Enemy: Fight',
            'Click Neutral: Interact',
            'Space/Click: Attack in Combat',
            'ESC: Flee Combat'
        ], {
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            lineSpacing: 2
        });
        instructions.setScrollFactor(0);
        instructions.setDepth(500);
        
        // Player stats area
        this.playerStatsText = this.add.text(20, 180, '', {
            fontSize: '16px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.playerStatsText.setScrollFactor(0);
        this.playerStatsText.setDepth(500);
        
        // Time display
        this.timeText = this.add.text(this.cameras.main.width - 20, 20, '', {
            fontSize: '16px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0);
        this.timeText.setScrollFactor(0);
        this.timeText.setDepth(500);
        
        // Position display
        this.positionText = this.add.text(this.cameras.main.width - 20, 50, '', {
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0);
        this.positionText.setScrollFactor(0);
        this.positionText.setDepth(500);
    }

    updateHUD() {
        // Update player stats
        const player = this.systems.entityManager.getEntity(this.playerId);
        if (player && this.playerStatsText) {
            const health = player.getComponent('health');
            const power = player.getComponent('power');
            const position = player.getComponent('position');
            const progression = player.getComponent('progression');
            
            let statsText = '';
            if (health) {
                statsText += `Health: ${health.current}/${health.max}\n`;
            }
            if (power) {
                statsText += `Power: ${power.value}\n`;
            }
            if (progression) {
                statsText += `Level: ${progression.level}\n`;
                statsText += `XP: ${progression.experience}/${progression.experienceToNext}`;
            }
            
            this.playerStatsText.setText(statsText);
            
            // Update position
            if (position && this.positionText) {
                this.positionText.setText(`Position: (${position.x}, ${position.y})`);
            }
        }
        
        // Update time
        if (this.timeText) {
            const currentTime = this.systems.timeSystem.getCurrentTime();
            const timeString = this.systems.timeSystem.getTimeString();
            this.timeText.setText(timeString);
        }
    }

    createInitialNPCs() {
        // Create a merchant near spawn
        const merchant = NeutralFactory.create(
            this.systems.entityManager,
            'Merchant',
            { x: 3, y: 0 }
        );
        this.createEntityVisual(merchant);
        
        // Create a town guard
        const guard = NeutralFactory.create(
            this.systems.entityManager,
            'TownGuard',
            { x: -2, y: -2 }
        );
        this.createEntityVisual(guard);
        
        // Create some villagers
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const x = Math.round(Math.cos(angle) * 8);
            const y = Math.round(Math.sin(angle) * 8);
            
            const villager = NeutralFactory.create(
                this.systems.entityManager,
                'Villager',
                { x, y }
            );
            this.createEntityVisual(villager);
        }
        
        // Create some wildlife
        for (let i = 0; i < 5; i++) {
            const x = Math.floor(Math.random() * 20 - 10);
            const y = Math.floor(Math.random() * 20 - 10);
            
            // Don't spawn in safe zone
            if (Math.abs(x) < 5 && Math.abs(y) < 5) continue;
            
            const wildlife = NeutralFactory.create(
                this.systems.entityManager,
                NeutralFactory.getRandomWildlife(),
                { x, y }
            );
            this.createEntityVisual(wildlife);
        }
    }

    createEntityVisual(entity) {
        let visual;
        
        console.log('Creating visual for entity:', entity.id, 'Tags:', entity.tags);
        
        // Determine visual creation based on entity type
        if (entity.hasTag('enemy') || entity.hasTag('hostile')) {
            console.log('Creating enemy visual for:', entity.id);
            visual = BaseEnemy.createVisuals(this, entity);
        } else if (entity.hasTag('neutral')) {
            console.log('Creating neutral visual for:', entity.id);
            visual = NeutralMob.createVisuals(this, entity);
        } else if (entity.hasTag('player')) {
            console.log('Creating player visual for:', entity.id);
            visual = Player.createVisuals(this, entity);
        }
        
        if (visual) {
            this.entityVisuals.set(entity.id, visual);
            
            // Sync position component with visual position
            const position = entity.getComponent('position');
            if (position) {
                position.pixelX = visual.x;
                position.pixelY = visual.y;
            }
            
            // Add subtle idle animation for more life
            this.addIdleAnimation(visual, entity);
        }
    }

    updateVisibleChunks() {
        const player = this.systems.entityManager.getEntity(this.playerId);
        if (!player) return;
        
        const playerPos = player.getComponent('position');
        if (!playerPos) return;
        
        const playerChunk = this.getChunkCoords(playerPos.x, playerPos.y);
        
        // Generate chunks around player
        for (let dx = -this.config.viewDistance; dx <= this.config.viewDistance; dx++) {
            for (let dy = -this.config.viewDistance; dy <= this.config.viewDistance; dy++) {
                const chunkX = playerChunk.x + dx;
                const chunkY = playerChunk.y + dy;
                this.generateChunk(chunkX, chunkY);
            }
        }
        
        // Clean up distant chunks
        this.cleanupDistantChunks(playerChunk);
    }

    generateChunk(chunkX, chunkY) {
        const key = this.getChunkKey(chunkX, chunkY);
        if (this.chunks.has(key)) return;
        
        const chunk = {
            x: chunkX,
            y: chunkY,
            entities: []
        };
        
        // Generate entities for chunk
        const seed = Math.abs(chunkX * 1000 + chunkY);
        const rng = this.createSeededRandom(seed);
        
        // Check if chunk should have special features
        const startX = chunkX * this.config.chunkSize;
        const startY = chunkY * this.config.chunkSize;
        
        // Generate enemies (but not in safe zones)
        const enemyCount = Math.floor(rng() * 3) + 2;
        for (let i = 0; i < enemyCount; i++) {
            const localX = Math.floor(rng() * this.config.chunkSize);
            const localY = Math.floor(rng() * this.config.chunkSize);
            const worldX = startX + localX;
            const worldY = startY + localY;
            
            // Check if position is in safe zone
            if (this.systems.zoneManager.canSpawnEnemyAt({ x: worldX, y: worldY })) {
                const difficulty = rng();
                const enemyType = EnemyFactory.getEnemyByDifficulty(difficulty);
                const enemy = EnemyFactory.create(
                    this.systems.entityManager,
                    enemyType,
                    { x: worldX, y: worldY }
                );
                
                if (enemy) {
                    chunk.entities.push(enemy.id);
                    this.createEntityVisual(enemy);
                }
            }
        }
        
        // Occasionally spawn neutral mobs
        if (rng() < 0.3) {
            const localX = Math.floor(rng() * this.config.chunkSize);
            const localY = Math.floor(rng() * this.config.chunkSize);
            const worldX = startX + localX;
            const worldY = startY + localY;
            
            const neutral = NeutralFactory.create(
                this.systems.entityManager,
                NeutralFactory.getRandomWildlife(),
                { x: worldX, y: worldY }
            );
            
            if (neutral) {
                chunk.entities.push(neutral.id);
                this.createEntityVisual(neutral);
            }
        }
        
        this.chunks.set(key, chunk);
    }

    cleanupDistantChunks(playerChunk) {
        const maxDistance = this.config.viewDistance + 1;
        
        this.chunks.forEach((chunk, key) => {
            const distance = Math.max(
                Math.abs(chunk.x - playerChunk.x),
                Math.abs(chunk.y - playerChunk.y)
            );
            
            if (distance > maxDistance) {
                // Remove entities from chunk
                chunk.entities.forEach(entityId => {
                    const visual = this.entityVisuals.get(entityId);
                    if (visual) {
                        visual.destroy();
                        this.entityVisuals.delete(entityId);
                    }
                    // Schedule entity destruction
                    this.systems.entityManager.scheduleDestroy(entityId);
                });
                
                this.chunks.delete(key);
            }
        });
    }

    setupInput() {
        // Create input controller context
        this.eventBus.emit('input:create-context', {
            contextName: 'gameplay',
            bindings: {
                'move_up': ['W', 'ArrowUp'],
                'move_down': ['S', 'ArrowDown'],
                'move_left': ['A', 'ArrowLeft'],
                'move_right': ['D', 'ArrowRight'],
                'interact': ['E'],
                'attack': ['Space'],
                'flee': ['Escape'],
                'inventory': ['I'],
                'debug_menu': ['F1']
            }
        });
        
        // Set active context
        this.eventBus.emit('input:set-context', { contextName: 'gameplay' });
        
        // Phaser input handling
        this.input.on('pointerdown', (pointer) => {
            this.eventBus.emit('input:pointer-down', {
                x: pointer.worldX,
                y: pointer.worldY,
                button: pointer.button
            });
        });
    }

    setupEventListeners() {
        // Entity visual updates
        this.eventBus.on('entity:moved', this.handleEntityMoved.bind(this));
        this.eventBus.on('entity:move-free', this.handleEntityMoveFree.bind(this));
        this.eventBus.on('entity:destroyed', this.handleEntityDestroyed.bind(this));
        this.eventBus.on('entity:created', this.handleEntityCreated.bind(this));
        
        // Time updates
        this.eventBus.on('time:day-night-transition', this.handleDayNightTransition.bind(this));
        
        // Zone visuals
        this.eventBus.on('visual:create-bonfire', this.handleCreateBonfire.bind(this));
        
        // Combat visuals
        this.eventBus.on('combat:started', this.handleCombatStarted.bind(this));
        
        // UI events
        this.eventBus.on('shop:open', this.handleShopOpen.bind(this));
        this.eventBus.on('dialogue:show', this.handleDialogueShow.bind(this));
        
        // Scene events for clicks
        this.events.on('enemy:clicked', (data) => {
            console.log('Scene received enemy:clicked', data);
            this.handleEnemyClicked(data);
        });
        
        this.events.on('neutral:clicked', (data) => {
            this.handleNeutralClicked(data);
        });
    }

    handleEntityMoved(data) {
        const { entityId, oldPosition, newPosition } = data;
        const visual = this.entityVisuals.get(entityId);
        
        if (!visual) return;
        
        const entity = this.systems.entityManager.getEntity(entityId);
        if (!entity) return;
        
        // Get movement style for varied animation
        const movementConfig = this.getMovementConfig(entity);
        
        // Add subtle anticipation for more organic feel
        if (movementConfig.anticipation > 0) {
            const anticipationX = oldPosition.x * this.config.gridSize + (Math.random() - 0.5) * 4;
            const anticipationY = oldPosition.y * this.config.gridSize + (Math.random() - 0.5) * 4;
            
            this.tweens.add({
                targets: visual,
                x: anticipationX,
                y: anticipationY,
                duration: movementConfig.anticipation,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    // Main movement tween
                    this.performMainMovement(visual, newPosition, entityId, movementConfig);
                }
            });
        } else {
            // Direct movement
            this.performMainMovement(visual, newPosition, entityId, movementConfig);
        }
    }

    getMovementConfig(entity) {
        // Different movement styles based on entity type
        if (entity.hasTag('player')) {
            return {
                duration: 280 + Math.random() * 80, // 280-360ms
                ease: 'Quad.easeInOut',
                anticipation: 0,
                overshoot: 0
            };
        } else if (entity.hasTag('enemy')) {
            const enemyData = entity.getComponent('enemyData');
            const baseSpeed = enemyData?.moveSpeed || 1;
            
            return {
                duration: (400 - baseSpeed * 50) + Math.random() * 150, // Variable based on enemy type
                ease: Math.random() < 0.3 ? 'Back.easeOut' : 'Cubic.easeInOut',
                anticipation: Math.random() < 0.2 ? 30 + Math.random() * 40 : 0,
                overshoot: Math.random() < 0.1 ? 2 : 0
            };
        } else if (entity.hasTag('neutral')) {
            return {
                duration: 450 + Math.random() * 200, // Slower, more leisurely
                ease: Math.random() < 0.4 ? 'Sine.easeInOut' : 'Quad.easeInOut',
                anticipation: Math.random() < 0.3 ? 40 + Math.random() * 60 : 0,
                overshoot: 0
            };
        }
        
        // Default
        return {
            duration: 320,
            ease: 'Cubic.easeInOut',
            anticipation: 0,
            overshoot: 0
        };
    }

    performMainMovement(visual, newPosition, entityId, config) {
        const targetX = newPosition.x * this.config.gridSize;
        const targetY = newPosition.y * this.config.gridSize;
        
        this.tweens.add({
            targets: visual,
            x: targetX + config.overshoot,
            y: targetY + config.overshoot,
            duration: config.duration,
            ease: config.ease,
            onComplete: () => {
                // Settle back if there was overshoot
                if (config.overshoot > 0) {
                    this.tweens.add({
                        targets: visual,
                        x: targetX,
                        y: targetY,
                        duration: 80,
                        ease: 'Quad.easeOut'
                    });
                }
                
                // Clear moving flag with varied delay
                const entity = this.systems.entityManager.getEntity(entityId);
                if (entity) {
                    const position = entity.getComponent('position');
                    if (position) {
                        const delay = 30 + Math.random() * 40; // 30-70ms variance
                        setTimeout(() => {
                            position.moving = false;
                        }, delay);
                    }
                }
                
                // Update chunks if needed
                if (entityId === this.playerId) {
                    this.updateVisibleChunks();
                }
            }
        });
    }

    handleEntityMoveFree(data) {
        const { entityId, targetX, targetY, duration } = data;
        const visual = this.entityVisuals.get(entityId);
        
        if (!visual) return;
        
        const entity = this.systems.entityManager.getEntity(entityId);
        if (!entity) return;
        
        // Update position to current visual position BEFORE starting tween
        const position = entity.getComponent('position');
        if (position) {
            position.x = visual.x;
            position.y = visual.y;
            position.pixelX = visual.x;
            position.pixelY = visual.y;
            position.worldX = Math.floor(visual.x / this.config.gridSize);
            position.worldY = Math.floor(visual.y / this.config.gridSize);
        }
        
        // Smooth tween to target position
        this.tweens.add({
            targets: visual,
            x: targetX,
            y: targetY,
            duration: duration || 500,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                // Keep position in sync during movement
                if (position) {
                    position.x = visual.x;
                    position.y = visual.y;
                    position.pixelX = visual.x;
                    position.pixelY = visual.y;
                    position.worldX = Math.floor(visual.x / this.config.gridSize);
                    position.worldY = Math.floor(visual.y / this.config.gridSize);
                }
            }
        });
    }

    handleEntityDestroyed(data) {
        const { entityId } = data;
        const visual = this.entityVisuals.get(entityId);
        
        if (visual) {
            // Death animation
            this.tweens.add({
                targets: visual,
                alpha: 0,
                scale: 0.5,
                duration: 500,
                onComplete: () => {
                    visual.destroy();
                    this.entityVisuals.delete(entityId);
                }
            });
        }
    }

    handleEntityCreated(data) {
        const { entity } = data;
        
        // Check if entity is in visible range
        const playerEntity = this.systems.entityManager.getEntity(this.playerId);
        if (!playerEntity) return;
        
        const playerPos = playerEntity.getComponent('position');
        const entityPos = entity.getComponent('position');
        
        if (!playerPos || !entityPos) return;
        
        const distance = Math.abs(playerPos.x - entityPos.x) + Math.abs(playerPos.y - entityPos.y);
        if (distance <= this.config.viewDistance * this.config.chunkSize) {
            this.createEntityVisual(entity);
        }
    }

    handleDayNightTransition(data) {
        const { to, modifiers } = data;
        
        // Update ambient lighting
        const color = modifiers.ambientLight;
        const alpha = to === 'night' ? 0.5 : 0.1;
        
        // Could add overlay for lighting effects
        if (this.lightOverlay) {
            this.tweens.add({
                targets: this.lightOverlay,
                alpha: alpha,
                duration: 3000
            });
        }
    }

    handleCreateBonfire(data) {
        const { position } = data;
        this.createBonfireVisual(position.x, position.y);
    }

    handleCombatStarted(data) {
        // Could add combat indicators
        const { attackerId, defenderId } = data;
        
        const attackerVisual = this.entityVisuals.get(attackerId);
        const defenderVisual = this.entityVisuals.get(defenderId);
        
        if (attackerVisual && defenderVisual) {
            // Add combat indicators
            const swordIcon = this.add.text(0, -40, '⚔️', { fontSize: '20px' });
            attackerVisual.add(swordIcon);
            
            // Remove after delay
            this.time.delayedCall(3000, () => swordIcon.destroy());
        }
    }

    handleEnemyClicked(data) {
        const { entityId } = data;
        console.log('handleEnemyClicked called with entityId:', entityId);
        
        // Check if player is adjacent
        const player = this.systems.entityManager.getEntity(this.playerId);
        const enemy = this.systems.entityManager.getEntity(entityId);
        console.log('Player:', player?.id, 'Enemy:', enemy?.id);
        
        if (!player || !enemy) return;
        
        const playerPos = player.getComponent('position');
        const enemyPos = enemy.getComponent('position');
        
        const distance = Math.abs(playerPos.x - enemyPos.x) + Math.abs(playerPos.y - enemyPos.y);
        
        if (distance <= 1) {
            // Start combat
            this.eventBus.emit('combat:start', {
                attackerId: this.playerId,
                defenderId: entityId
            });
        } else {
            // Show message
            this.showFloatingText('Move closer to attack!', playerPos);
        }
    }

    handleNeutralClicked(data) {
        const { entityId, canTalk, canTrade } = data;
        
        if (canTalk || canTrade) {
            NeutralMob.interact(
                this.systems.entityManager.getEntity(entityId),
                this.playerId,
                this.eventBus
            );
        }
    }

    handleShopOpen(data) {
        // This would open shop UI
        console.log('Shop opened:', data);
    }

    handleDialogueShow(data) {
        // This would show dialogue UI
        console.log('Dialogue:', data.text);
    }

    showFloatingText(text, position) {
        const pixelX = position.x * this.config.gridSize;
        const pixelY = position.y * this.config.gridSize;
        
        const floatingText = this.add.text(pixelX, pixelY - 20, text, {
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: floatingText,
            y: pixelY - 50,
            alpha: 0,
            duration: 1500,
            onComplete: () => floatingText.destroy()
        });
    }

    updateGridDisplay() {
        // Subtle grid display for visual reference
        this.gridGraphics.clear();
        this.gridGraphics.lineStyle(1, 0x333333, 0.2); // Very subtle gray lines
        
        const worldView = this.cameras.main.worldView;
        const gridSize = this.config.gridSize;
        
        const startX = Math.floor(worldView.left / gridSize) * gridSize;
        const startY = Math.floor(worldView.top / gridSize) * gridSize;
        const endX = Math.ceil(worldView.right / gridSize) * gridSize;
        const endY = Math.ceil(worldView.bottom / gridSize) * gridSize;
        
        // Vertical lines
        for (let x = startX; x <= endX; x += gridSize) {
            this.gridGraphics.moveTo(x, startY);
            this.gridGraphics.lineTo(x, endY);
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += gridSize) {
            this.gridGraphics.moveTo(startX, y);
            this.gridGraphics.lineTo(endX, y);
        }
        
        this.gridGraphics.strokePath();
    }

    addIdleAnimation(visual, entity) {
        // Add subtle breathing/idle animation for more organic feel
        const animationType = entity.hasTag('player') ? 'breathing' : 
                             entity.hasTag('enemy') ? 'menacing' : 'gentle';
        
        switch (animationType) {
            case 'breathing':
                // Subtle scale breathing
                this.tweens.add({
                    targets: visual,
                    scaleX: 1.02,
                    scaleY: 0.98,
                    duration: 1500 + Math.random() * 1000,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1
                });
                break;
                
            case 'menacing':
                // Slightly aggressive idle movement
                this.tweens.add({
                    targets: visual,
                    angle: Math.random() < 0.5 ? 2 : -2,
                    duration: 2000 + Math.random() * 1500,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1,
                    delay: Math.random() * 3000
                });
                break;
                
            case 'gentle':
                // Very subtle gentle sway
                this.tweens.add({
                    targets: visual,
                    y: visual.y + 1,
                    duration: 3000 + Math.random() * 2000,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1,
                    delay: Math.random() * 4000
                });
                break;
        }
        
        // Random occasional blink or small movement
        if (Math.random() < 0.3) {
            this.time.addEvent({
                delay: 5000 + Math.random() * 10000,
                callback: () => {
                    if (visual && visual.active) {
                        this.tweens.add({
                            targets: visual,
                            alpha: 0.7,
                            duration: 100,
                            yoyo: true,
                            ease: 'Quad.easeInOut'
                        });
                    }
                },
                loop: true
            });
        }
    }

    checkCombatProximity(player, position) {
        // Check for nearby hostile entities
        const hostileEntities = this.systems.entityManager.getEntitiesByTag('hostile');
        const combatRange = 40; // pixels
        
        for (const enemy of hostileEntities) {
            const enemyPosition = enemy.getComponent('position');
            if (enemyPosition) {
                const distance = Math.sqrt(
                    Math.pow(position.x - enemyPosition.pixelX, 2) + 
                    Math.pow(position.y - enemyPosition.pixelY, 2)
                );
                
                if (distance < combatRange) {
                    // Start combat if not already in combat
                    if (!this.systems.combatSystem.isInCombat(player.id)) {
                        console.log('Combat proximity triggered!');
                        this.eventBus.emit('combat:start', {
                            attackerId: player.id,
                            defenderId: enemy.id
                        });
                        break;
                    }
                }
            }
        }
    }

    getChunkKey(x, y) {
        return `${x},${y}`;
    }

    getChunkCoords(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.config.chunkSize),
            y: Math.floor(worldY / this.config.chunkSize)
        };
    }

    createSeededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    update(time, delta) {
        // Update all systems
        this.systems.entityManager.update(delta);
        this.systems.combatSystem.update(delta);
        this.systems.timeSystem.update(delta);
        this.systems.zoneManager.update(delta);
        this.systems.aiMovementSystem.update(delta);
        
        // Update UI
        if (this.combatUI) this.combatUI.update(time, delta);
        
        // Update entity visuals
        this.entityVisuals.forEach((visual, entityId) => {
            const entity = this.systems.entityManager.getEntity(entityId);
            if (!entity) return;
            
            // Update based on entity type
            if (entity.hasTag('enemy')) {
                BaseEnemy.updateVisuals(visual, entity);
            } else if (entity.hasTag('neutral')) {
                NeutralMob.updateVisuals(visual, entity);
            } else if (entity.hasTag('player')) {
                Player.updateVisuals(visual, entity);
            }
        });
        
        // Update HUD
        this.updateHUD();
        
        // Update grid display
        this.updateGridDisplay();
        
        // Handle input
        this.handleInput(time, delta);
    }

    handleInput(time, delta) {
        // Check for movement input
        const cursors = this.input.keyboard.createCursorKeys();
        const wasd = this.input.keyboard.addKeys('W,S,A,D');
        
        const player = this.systems.entityManager.getEntity(this.playerId);
        if (!player) return;
        
        const position = player.getComponent('position');
        if (!position) return;
        
        const playerData = player.getComponent('playerData');
        const moveSpeed = (playerData?.moveSpeed || 150) * delta / 1000; // pixels per second
        
        let dx = 0, dy = 0;
        
        // Allow diagonal movement
        if (cursors.left.isDown || wasd.A.isDown) dx = -1;
        else if (cursors.right.isDown || wasd.D.isDown) dx = 1;
        
        if (cursors.up.isDown || wasd.W.isDown) dy = -1;
        else if (cursors.down.isDown || wasd.S.isDown) dy = 1;
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707; // 1/sqrt(2)
            dy *= 0.707;
        }
        
        if (dx !== 0 || dy !== 0) {
            // Update position directly for free movement
            const newX = position.x + dx * moveSpeed;
            const newY = position.y + dy * moveSpeed;
            
            // Check for collisions or boundaries here if needed
            const visual = this.entityVisuals.get(this.playerId);
            if (visual) {
                visual.x = newX;
                visual.y = newY;
                
                // Update position component
                position.x = newX;
                position.y = newY;
                position.pixelX = newX;
                position.pixelY = newY;
                position.worldX = Math.floor(newX / this.config.gridSize);
                position.worldY = Math.floor(newY / this.config.gridSize);
                
                // Check for combat encounters based on distance
                this.checkCombatProximity(player, position);
                
                // Update chunks if needed
                this.updateVisibleChunks();
            }
        }
        
        // Debug menu
        if (this.input.keyboard.addKey('F2').isDown) {
            this.eventBus.emit('debug:toggle-menu');
        }
    }
}