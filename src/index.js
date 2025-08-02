import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

// Import core infrastructure
import EventBus from './core/EventBus.js';
import GameStateManager from './core/GameStateManager.js';
import InputController from './core/InputController.js';
import ResourceManager from './core/ResourceManager.js';
import Entity from './core/Entity.js';

// Initialize core systems
const eventBus = new EventBus();
const gameStateManager = new GameStateManager(eventBus);
const inputController = new InputController(eventBus);
const resourceManager = new ResourceManager(eventBus);

// Make core systems globally accessible for now (will use DI later)
window.gameCore = {
    eventBus,
    gameStateManager,
    inputController,
    resourceManager,
    Entity
};

// Set up some test event listeners
eventBus.on('test:message', (data) => {
    console.log('Test event received:', data);
});

eventBus.on('state:enter', (data) => {
    console.log('Entered state:', data.state);
});

eventBus.on('input:keydown', (data) => {
    console.log('Key pressed:', data.key);
});

// Register game states
gameStateManager.registerState('menu', {
    enter: () => console.log('Menu state entered'),
    update: (dt) => {},
    exit: () => console.log('Menu state exited')
});

gameStateManager.registerState('gameplay', {
    enter: () => console.log('Gameplay state entered'),
    update: (dt) => {},
    exit: () => console.log('Gameplay state exited')
});

// Set up input contexts
inputController.registerContext('gameplay', {
    'Space': 'player:attack',
    'KeyW': 'player:move-up',
    'KeyS': 'player:move-down',
    'KeyA': 'player:move-left',
    'KeyD': 'player:move-right',
    'mouse0': 'player:click-attack'
});

// Listen for player actions
eventBus.on('player:attack', () => {
    console.log('Player attacked with Space!');
});

eventBus.on('player:click-attack', (data) => {
    console.log('Player clicked at:', data.x, data.y);
});

// Test entity creation
const testEntity = new Entity();
testEntity
    .addComponent('position', { x: 100, y: 100 })
    .addComponent('health', { current: 100, max: 100 })
    .addComponent('power', { value: 1 })
    .addTag('player');

console.log('Test entity created:', testEntity);
console.log('Core systems initialized!');

// Emit a test event
eventBus.emit('test:message', { content: 'Core infrastructure is working!' });

// Start in menu state
gameStateManager.changeState('menu');

const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 800,
    parent: 'game',
    backgroundColor: '#2c3e50',
    scene: [GameScene],
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