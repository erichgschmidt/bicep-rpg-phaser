import Phaser from 'phaser';

console.log('=== CORE SYSTEMS TEST ===');

// Test core imports one by one
try {
    console.log('Testing EventBus...');
    const EventBus = (await import('./core/EventBus.js')).default;
    const eventBus = new EventBus();
    console.log('✅ EventBus loaded');

    console.log('Testing Entity...');
    const Entity = (await import('./core/Entity.js')).default;
    const testEntity = new Entity();
    console.log('✅ Entity loaded');

    console.log('Testing GameStateManager...');
    const GameStateManager = (await import('./core/GameStateManager.js')).default;
    const gameStateManager = new GameStateManager(eventBus);
    console.log('✅ GameStateManager loaded');

    console.log('Testing InputController...');
    const InputController = (await import('./core/InputController.js')).default;
    const inputController = new InputController(eventBus);
    console.log('✅ InputController loaded');

    console.log('Testing ResourceManager...');
    const ResourceManager = (await import('./core/ResourceManager.js')).default;
    const resourceManager = new ResourceManager(eventBus);
    console.log('✅ ResourceManager loaded');

    console.log('🎉 All core systems loaded successfully!');

    // Test basic Phaser scene with core systems
    const config = {
        type: Phaser.AUTO,
        width: 1200,
        height: 800,
        parent: 'game',
        backgroundColor: '#2c3e50',
        scene: {
            create: function() {
                console.log('Scene created with core systems!');
                
                this.add.text(600, 300, 'CORE SYSTEMS TEST', {
                    fontSize: '32px',
                    color: '#ffffff'
                }).setOrigin(0.5);
                
                this.add.text(600, 350, 'All core systems loaded successfully!', {
                    fontSize: '16px',
                    color: '#00ff00'
                }).setOrigin(0.5);
                
                this.add.text(600, 400, 'EventBus, Entity, GameStateManager,', {
                    fontSize: '14px',
                    color: '#ffffff'
                }).setOrigin(0.5);
                
                this.add.text(600, 420, 'InputController, ResourceManager', {
                    fontSize: '14px',
                    color: '#ffffff'
                }).setOrigin(0.5);
            }
        }
    };

    new Phaser.Game(config);

} catch (error) {
    console.error('❌ Core system failed:', error);
    
    // Still create Phaser scene to show error
    const config = {
        type: Phaser.AUTO,
        width: 1200,
        height: 800,
        parent: 'game',
        backgroundColor: '#2c3e50',
        scene: {
            create: function() {
                this.add.text(600, 400, 'CORE SYSTEM ERROR', {
                    fontSize: '32px',
                    color: '#ff0000'
                }).setOrigin(0.5);
                
                this.add.text(600, 450, error.message, {
                    fontSize: '16px',
                    color: '#ffffff'
                }).setOrigin(0.5);
            }
        }
    };
    new Phaser.Game(config);
}