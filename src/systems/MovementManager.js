/**
 * MovementManager - Unified movement system for all entities
 * Branch-level system that handles all entity movement consistently
 * 
 * Based on the working enemy movement system
 */
export default class MovementManager {
    constructor(eventBus, entityManager) {
        this.eventBus = eventBus;
        this.entityManager = entityManager;
        
        // Movement configuration
        this.config = {
            baseWanderInterval: 1500,      // Base time between moves
            intervalVariance: 1000,        // Random variance (±500ms)
            baseMoveDuration: 400,         // Base movement animation time
            durationVariance: 200,         // Animation variance (±100ms)
            wanderDistance: {
                min: 30,
                max: 80
            },
            maxDistanceFromSpawn: 150      // Max pixels from spawn point
        };
        
        // Track all moving entities
        this.movingEntities = new Map(); // entityId -> movement data
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for entity creation
        this.eventBus.on('entity:created', this.handleEntityCreated.bind(this));
        this.eventBus.on('entity:destroyed', this.handleEntityDestroyed.bind(this));
        
        // Listen for movement requests
        this.eventBus.on('movement:request-wander', this.handleWanderRequest.bind(this));
        this.eventBus.on('movement:request-move-to', this.handleMoveToRequest.bind(this));
    }
    
    handleEntityCreated(data) {
        const { entity } = data;
        
        // Register all non-player entities for movement
        if (!entity.hasTag('player') && entity.hasTag('enemy')) {
            // Wait one frame to ensure visual is created
            setTimeout(() => {
                this.registerEntity(entity);
            }, 0);
        }
    }
    
    handleEntityDestroyed(data) {
        const { entityId } = data;
        this.movingEntities.delete(entityId);
    }
    
    registerEntity(entity) {
        const visual = this.getEntityVisual(entity.id);
        if (!visual) {
            console.warn(`No visual found for entity ${entity.id}`);
            return;
        }
        
        // Get initial position from visual
        const spawnX = visual.x;
        const spawnY = visual.y;
        
        // Determine movement pattern
        let movePattern = 'wander';
        if (entity.hasTag('enemy')) {
            const enemyAI = entity.getComponent('enemyAI');
            movePattern = enemyAI?.movePattern || 'wander';
        }
        
        // Create movement data
        const movementData = {
            entityId: entity.id,
            spawnPoint: { x: spawnX, y: spawnY },
            currentPosition: { x: spawnX, y: spawnY },
            lastMoveTime: Date.now() + Math.random() * 2000, // Stagger initial movement
            nextMoveInterval: this.getRandomInterval(),
            movePattern: movePattern,
            isMoving: false,
            personalityMultiplier: 0.7 + Math.random() * 0.6 // 0.7-1.3x speed
        };
        
        this.movingEntities.set(entity.id, movementData);
        console.log(`MovementManager: Registered ${entity.id} at (${spawnX}, ${spawnY})`);
    }
    
    update(deltaTime) {
        const now = Date.now();
        
        // Process each entity
        this.movingEntities.forEach((movementData, entityId) => {
            // Skip if entity is already moving
            if (movementData.isMoving) return;
            
            // Check if it's time to move
            if (now - movementData.lastMoveTime < movementData.nextMoveInterval) return;
            
            // Get entity and visual
            const entity = this.entityManager.getEntity(entityId);
            if (!entity) {
                this.movingEntities.delete(entityId);
                return;
            }
            
            const visual = this.getEntityVisual(entityId);
            if (!visual) return;
            
            // Update current position from visual (source of truth)
            movementData.currentPosition.x = visual.x;
            movementData.currentPosition.y = visual.y;
            
            // Process movement based on pattern
            this.processMovement(entity, movementData, visual);
            
            // Update timing
            movementData.lastMoveTime = now;
            movementData.nextMoveInterval = this.getRandomInterval() * movementData.personalityMultiplier;
        });
    }
    
    processMovement(entity, movementData, visual) {
        let targetX, targetY;
        const distance = this.config.wanderDistance.min + 
                        Math.random() * (this.config.wanderDistance.max - this.config.wanderDistance.min);
        
        switch (movementData.movePattern) {
            case 'wander':
                const angle = Math.random() * Math.PI * 2;
                targetX = movementData.currentPosition.x + Math.cos(angle) * distance;
                targetY = movementData.currentPosition.y + Math.sin(angle) * distance;
                break;
                
            case 'patrol':
                const toSpawn = Math.atan2(
                    movementData.spawnPoint.y - movementData.currentPosition.y,
                    movementData.spawnPoint.x - movementData.currentPosition.x
                );
                const distToSpawn = Math.sqrt(
                    Math.pow(movementData.currentPosition.x - movementData.spawnPoint.x, 2) +
                    Math.pow(movementData.currentPosition.y - movementData.spawnPoint.y, 2)
                );
                
                let moveAngle;
                if (distToSpawn > 100) {
                    moveAngle = toSpawn; // Move back to spawn
                } else {
                    moveAngle = toSpawn + Math.PI/2 + (Math.random() - 0.5); // Circle around
                }
                
                targetX = movementData.currentPosition.x + Math.cos(moveAngle) * distance;
                targetY = movementData.currentPosition.y + Math.sin(moveAngle) * distance;
                break;
                
            case 'stationary':
                return; // Don't move
                
            default:
                // Default to wander
                const defaultAngle = Math.random() * Math.PI * 2;
                targetX = movementData.currentPosition.x + Math.cos(defaultAngle) * distance;
                targetY = movementData.currentPosition.y + Math.sin(defaultAngle) * distance;
        }
        
        // Check distance from spawn
        const distFromSpawn = Math.sqrt(
            Math.pow(targetX - movementData.spawnPoint.x, 2) +
            Math.pow(targetY - movementData.spawnPoint.y, 2)
        );
        
        // If too far, move back towards spawn
        if (distFromSpawn > this.config.maxDistanceFromSpawn) {
            const backAngle = Math.atan2(
                movementData.spawnPoint.y - movementData.currentPosition.y,
                movementData.spawnPoint.x - movementData.currentPosition.x
            );
            targetX = movementData.currentPosition.x + Math.cos(backAngle) * distance;
            targetY = movementData.currentPosition.y + Math.sin(backAngle) * distance;
        }
        
        // Execute movement
        this.moveEntity(entity, visual, targetX, targetY, movementData);
    }
    
    moveEntity(entity, visual, targetX, targetY, movementData) {
        movementData.isMoving = true;
        
        // Get scene reference
        const scene = this.getScene();
        if (!scene) return;
        
        // Calculate duration
        const duration = (this.config.baseMoveDuration + 
                         (Math.random() * this.config.durationVariance * 2 - this.config.durationVariance)) *
                         movementData.personalityMultiplier;
        
        // Update position component to current visual position BEFORE tween
        const position = entity.getComponent('position');
        if (position) {
            position.x = visual.x;
            position.y = visual.y;
            position.pixelX = visual.x;
            position.pixelY = visual.y;
            position.worldX = Math.floor(visual.x / 32);
            position.worldY = Math.floor(visual.y / 32);
        }
        
        // Create movement tween
        scene.tweens.add({
            targets: visual,
            x: targetX,
            y: targetY,
            duration: duration,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                // Keep position in sync during movement
                if (position) {
                    position.x = visual.x;
                    position.y = visual.y;
                    position.pixelX = visual.x;
                    position.pixelY = visual.y;
                    position.worldX = Math.floor(visual.x / 32);
                    position.worldY = Math.floor(visual.y / 32);
                }
            },
            onComplete: () => {
                movementData.isMoving = false;
                movementData.currentPosition.x = visual.x;
                movementData.currentPosition.y = visual.y;
            }
        });
    }
    
    getRandomInterval() {
        return this.config.baseWanderInterval + 
               (Math.random() * this.config.intervalVariance * 2 - this.config.intervalVariance);
    }
    
    getEntityVisual(entityId) {
        const scene = this.getScene();
        if (scene && scene.entityVisuals) {
            return scene.entityVisuals.get(entityId);
        }
        return null;
    }
    
    getScene() {
        if (window.gameCore && window.gameCore.phaserGame) {
            return window.gameCore.phaserGame.scene.getScene('GameSceneRefactored');
        }
        return null;
    }
    
    // Handle specific movement requests
    handleWanderRequest(data) {
        const { entityId } = data;
        const movementData = this.movingEntities.get(entityId);
        if (movementData) {
            movementData.lastMoveTime = 0; // Force immediate movement
        }
    }
    
    handleMoveToRequest(data) {
        const { entityId, targetX, targetY, duration } = data;
        const entity = this.entityManager.getEntity(entityId);
        const visual = this.getEntityVisual(entityId);
        
        if (entity && visual) {
            const movementData = this.movingEntities.get(entityId);
            if (movementData) {
                movementData.isMoving = true;
                this.moveEntity(entity, visual, targetX, targetY, movementData);
            }
        }
    }
    
    destroy() {
        this.movingEntities.clear();
    }
}