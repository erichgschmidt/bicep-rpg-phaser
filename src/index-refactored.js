import Phaser from 'phaser';
import GameSceneRefactored from './scenes/GameSceneRefactored.js';

// Import core infrastructure (TRUNK)
import EventBus from './core/EventBus.js';
import GameStateManager from './core/GameStateManager.js';
import InputController from './core/InputController.js';
import ResourceManager from './core/ResourceManager.js';
import Entity from './core/Entity.js';

// Import major systems (BRANCHES)
import EntityManager from './systems/EntityManager.js';
import CombatSystem from './systems/CombatSystem.js';
import ProgressionSystem from './systems/ProgressionSystem.js';
import InventorySystem from './systems/InventorySystem.js';
import ZoneManager from './systems/ZoneManager.js';
import TimeSystem from './systems/TimeSystem.js';
import RelationshipSystem from './systems/RelationshipSystem.js';
import PartySystem from './systems/PartySystem.js';
import PetSystem from './systems/PetSystem.js';
import DebugSystem from './systems/DebugSystem.js';
import AIMovementSystem from './systems/AIMovementSystem.js';

// Initialize core systems (TRUNK)
const eventBus = new EventBus();
const gameStateManager = new GameStateManager(eventBus);
const inputController = new InputController(eventBus);
const resourceManager = new ResourceManager(eventBus);

// Initialize major systems (BRANCHES) - only depend on trunk
const entityManager = new EntityManager(eventBus);
const combatSystem = new CombatSystem(eventBus, entityManager);
const progressionSystem = new ProgressionSystem(eventBus, entityManager);
const inventorySystem = new InventorySystem(eventBus, entityManager);
const zoneManager = new ZoneManager(eventBus, entityManager);
const timeSystem = new TimeSystem(eventBus);
const relationshipSystem = new RelationshipSystem(eventBus, entityManager);
const partySystem = new PartySystem(eventBus, entityManager);
const petSystem = new PetSystem(eventBus, entityManager);
const debugSystem = new DebugSystem(eventBus, entityManager);
const aiMovementSystem = new AIMovementSystem(eventBus, entityManager);

// Make systems globally accessible (temporary - will use DI later)
window.gameCore = {
    // Trunk
    eventBus,
    gameStateManager,
    inputController,
    resourceManager,
    Entity,
    
    // Branches
    entityManager,
    combatSystem,
    progressionSystem,
    inventorySystem,
    zoneManager,
    timeSystem,
    relationshipSystem,
    partySystem,
    petSystem,
    debugSystem,
    aiMovementSystem
};

// Register game states
gameStateManager.registerState('menu', {
    enter: () => console.log('Menu state entered'),
    update: (dt) => {},
    exit: () => console.log('Menu state exited')
});

gameStateManager.registerState('gameplay', {
    enter: () => {
        console.log('Gameplay state entered');
        // Systems are ready
    },
    update: (dt) => {},
    exit: () => console.log('Gameplay state exited')
});

// Set up basic input context
inputController.registerContext('gameplay', {
    'Space': 'player:attack',
    'KeyW': 'player:move-up',
    'KeyS': 'player:move-down',  
    'KeyA': 'player:move-left',
    'KeyD': 'player:move-right',
    'KeyE': 'player:interact',
    'Escape': 'player:flee',
    'F2': 'debug:toggle-menu',
    'mouse0': 'player:click-attack'
});

// Listen for player movement validation
eventBus.on('entity:request-move', (data) => {
    const { entityId, oldPosition, newPosition } = data;
    
    // Check if move is valid (no collision, etc)
    let blocked = false;
    
    // Check for entity collisions
    const entities = entityManager.getEntitiesWithComponents(['position']);
    for (const entity of entities) {
        if (entity.id === entityId) continue;
        
        const pos = entity.getComponent('position');
        if (pos.x === newPosition.x && pos.y === newPosition.y) {
            blocked = true;
            break;
        }
    }
    
    if (!blocked) {
        // Move is valid
        const entity = entityManager.getEntity(entityId);
        if (entity) {
            const position = entity.getComponent('position');
            if (position) {
                const oldPos = { x: position.x, y: position.y };
                position.moving = true; // Set moving flag to prevent rapid movement
                position.x = newPosition.x;
                position.y = newPosition.y;
                position.worldX = newPosition.x;
                position.worldY = newPosition.y;
                position.pixelX = newPosition.x * 32;
                position.pixelY = newPosition.y * 32;
                
                // Check for combat encounters if this is a player
                if (entity.hasTag('player')) {
                    checkForCombatEncounters(entityManager, eventBus, entityId, newPosition);
                }
                
                eventBus.emit('entity:moved', {
                    entityId,
                    oldPosition: oldPos,
                    newPosition
                });
            }
        }
    }
});

// Function to check for combat encounters on movement
function checkForCombatEncounters(entityManager, eventBus, playerId, playerPosition) {
    // Find all hostile entities at the same position as player
    const hostileEntities = entityManager.getEntitiesByTag('hostile');
    
    for (const enemy of hostileEntities) {
        const enemyPosition = enemy.getComponent('position');
        if (enemyPosition && 
            enemyPosition.x === playerPosition.x && 
            enemyPosition.y === playerPosition.y) {
            
            console.log('Combat encounter! Player moved into enemy at:', playerPosition);
            eventBus.emit('combat:start', {
                attackerId: playerId,
                defenderId: enemy.id
            });
            break; // Only one combat at a time
        }
    }
}

// Log some system events
eventBus.on('combat:started', (data) => {
    console.log('Combat started:', data);
});

eventBus.on('entity:created', (data) => {
    console.log('Entity created:', data.entity.id);
});

eventBus.on('time:hour-changed', (data) => {
    console.log(`Time: Day ${data.day}, Hour ${data.hour}`);
});

// Phaser configuration
const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 800,
    parent: 'game',
    backgroundColor: '#2c3e50',
    scene: [GameSceneRefactored],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

const game = new Phaser.Game(config);

// Store Phaser game instance
window.gameCore.phaserGame = game;

// Start in gameplay state
gameStateManager.changeState('gameplay');

console.log('=== BICEP RPG INITIALIZED ===');
console.log('Architecture: Trunk → Branch → Leaf');
console.log('Press F2 for debug menu');
console.log('Click on enemies to fight!');
console.log('===========================');