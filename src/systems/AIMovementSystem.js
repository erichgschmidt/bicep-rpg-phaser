/**
 * AIMovementSystem - Handles AI movement for NPCs and enemies
 * Branch-level system that provides AI behavior services
 * 
 * Dependencies: EventBus (trunk), EntityManager (branch)
 */
export default class AIMovementSystem {
    constructor(eventBus, entityManager) {
        this.eventBus = eventBus;
        this.entityManager = entityManager;
        
        // AI configuration - varied for more natural movement
        this.config = {
            wanderInterval: {
                base: 1500,        // Base interval
                variance: 1000     // Random variance (±500ms)
            },
            wanderChance: 0.4,     // 40% chance to move each interval
            maxWanderDistance: 4,  // Maximum tiles from spawn point
            pauseAfterMove: {
                base: 800,         // Base pause
                variance: 600      // Random variance (±300ms)
            },
            moveDuration: {
                base: 400,         // Base movement duration
                variance: 200      // Random variance (±100ms)
            }
        };
        
        // AI state tracking
        this.aiEntities = new Map(); // entityId -> ai state
        this.lastUpdate = Date.now();
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Track AI entities when they're created
        this.eventBus.on('entity:created', this.handleEntityCreated.bind(this));
        this.eventBus.on('entity:destroyed', this.handleEntityDestroyed.bind(this));
    }

    handleEntityCreated(data) {
        const { entity } = data;
        
        // Add AI behavior to enemies and neutrals (but not player)
        if ((entity.hasTag('enemy') || entity.hasTag('neutral')) && !entity.hasTag('player')) {
            const position = entity.getComponent('position');
            if (position) {
                this.aiEntities.set(entity.id, {
                    spawnPoint: { x: position.x, y: position.y },
                    lastMoveTime: Date.now() + Math.random() * 2000, // Stagger initial movement
                    isMoving: false,
                    pauseUntil: 0,
                    movePattern: this.getMovePattern(entity),
                    personalityMultiplier: 0.7 + Math.random() * 0.6, // 0.7-1.3x speed modifier
                    nextMoveInterval: this.getRandomInterval(),
                    movementStyle: this.getMovementStyle(entity)
                });
                console.log(`Added AI behavior to ${entity.id}`);
            }
        }
    }

    handleEntityDestroyed(data) {
        const { entityId } = data;
        this.aiEntities.delete(entityId);
    }

    getMovePattern(entity) {
        // Determine movement pattern based on entity type
        if (entity.hasTag('enemy')) {
            const enemyData = entity.getComponent('enemyData');
            return enemyData?.movePattern || 'wander';
        } else if (entity.hasTag('neutral')) {
            return 'patrol'; // Neutrals patrol around their area
        }
        return 'wander';
    }

    update(deltaTime) {
        const now = Date.now();
        
        // Process AI for each entity
        this.aiEntities.forEach((aiState, entityId) => {
            const entity = this.entityManager.getEntity(entityId);
            if (!entity) {
                this.aiEntities.delete(entityId);
                return;
            }

            // Skip if entity is currently moving or paused
            const position = entity.getComponent('position');
            if (!position || position.moving || now < aiState.pauseUntil) {
                return;
            }

            // Check if it's time to consider moving (using individual intervals)
            if (now - aiState.lastMoveTime < aiState.nextMoveInterval) {
                return;
            }

            // Roll for movement chance
            if (Math.random() > this.config.wanderChance) {
                aiState.lastMoveTime = now;
                return;
            }

            // Attempt to move based on pattern
            this.processAIMovement(entity, aiState, now);
        });
    }

    processAIMovement(entity, aiState, now) {
        const position = entity.getComponent('position');
        if (!position) return;

        let targetX = position.x;
        let targetY = position.y;

        switch (aiState.movePattern) {
            case 'wander':
                const wanderDirection = this.getRandomDirection();
                targetX += wanderDirection.x;
                targetY += wanderDirection.y;
                break;

            case 'patrol':
                const patrolDirection = this.getPatrolDirection(position, aiState.spawnPoint);
                targetX += patrolDirection.x;
                targetY += patrolDirection.y;
                break;

            case 'erratic':
                // More random movement
                if (Math.random() < 0.7) {
                    const erraticDir = this.getRandomDirection();
                    targetX += erraticDir.x * (Math.random() < 0.5 ? 1 : 2);
                    targetY += erraticDir.y * (Math.random() < 0.5 ? 1 : 2);
                }
                break;

            default:
                return; // No movement for unknown patterns
        }

        // Check distance from spawn point
        const distanceFromSpawn = Math.abs(targetX - aiState.spawnPoint.x) + 
                                 Math.abs(targetY - aiState.spawnPoint.y);
        
        if (distanceFromSpawn > this.config.maxWanderDistance) {
            // Move back towards spawn instead
            targetX = position.x + Math.sign(aiState.spawnPoint.x - position.x);
            targetY = position.y + Math.sign(aiState.spawnPoint.y - position.y);
        }

        // Request movement
        this.eventBus.emit('entity:request-move', {
            entityId: entity.id,
            oldPosition: { x: position.x, y: position.y },
            newPosition: { x: targetX, y: targetY }
        });

        // Update AI state with varied timing
        aiState.lastMoveTime = now;
        aiState.nextMoveInterval = this.getRandomInterval() * aiState.personalityMultiplier;
        aiState.pauseUntil = now + this.getRandomPause() * aiState.personalityMultiplier;
    }

    getRandomDirection() {
        const directions = [
            { x: 0, y: -1 },  // Up
            { x: 0, y: 1 },   // Down
            { x: -1, y: 0 },  // Left
            { x: 1, y: 0 },   // Right
        ];
        return directions[Math.floor(Math.random() * directions.length)];
    }

    getPatrolDirection(currentPos, spawnPoint) {
        // Simple patrol: move away from spawn, then back
        const distanceFromSpawn = Math.abs(currentPos.x - spawnPoint.x) + 
                                 Math.abs(currentPos.y - spawnPoint.y);
        
        if (distanceFromSpawn >= 2) {
            // Move back towards spawn
            return {
                x: Math.sign(spawnPoint.x - currentPos.x),
                y: Math.sign(spawnPoint.y - currentPos.y)
            };
        } else {
            // Move away from spawn
            return this.getRandomDirection();
        }
    }

    getRandomInterval() {
        // Generate random interval with variance
        const base = this.config.wanderInterval.base;
        const variance = this.config.wanderInterval.variance;
        return base + (Math.random() * variance * 2 - variance);
    }

    getRandomPause() {
        // Generate random pause with variance
        const base = this.config.pauseAfterMove.base;
        const variance = this.config.pauseAfterMove.variance;
        return base + (Math.random() * variance * 2 - variance);
    }

    getMovementStyle(entity) {
        // Different movement styles for different entity types
        if (entity.hasTag('enemy')) {
            const styles = ['aggressive', 'lurking', 'restless'];
            return styles[Math.floor(Math.random() * styles.length)];
        } else if (entity.hasTag('neutral')) {
            const styles = ['calm', 'curious', 'lazy'];
            return styles[Math.floor(Math.random() * styles.length)];
        }
        return 'normal';
    }

    destroy() {
        this.aiEntities.clear();
    }
}