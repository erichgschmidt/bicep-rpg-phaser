import Phaser from 'phaser';

console.log('=== BRANCH SYSTEMS TEST ===');

async function testSystems() {
    try {
        // Load core systems first
        console.log('Loading core systems...');
        const EventBus = (await import('./core/EventBus.js')).default;
        const Entity = (await import('./core/Entity.js')).default;
        const GameStateManager = (await import('./core/GameStateManager.js')).default;
        const InputController = (await import('./core/InputController.js')).default;
        const ResourceManager = (await import('./core/ResourceManager.js')).default;

        const eventBus = new EventBus();
        const gameStateManager = new GameStateManager(eventBus);
        const inputController = new InputController(eventBus);
        const resourceManager = new ResourceManager(eventBus);
        console.log('✅ Core systems loaded');

        // Test branch systems one by one
        const branchSystems = [];
        const systemNames = [];

        try {
            console.log('Testing EntityManager...');
            const EntityManager = (await import('./systems/EntityManager.js')).default;
            const entityManager = new EntityManager(eventBus);
            branchSystems.push('EntityManager');
            console.log('✅ EntityManager loaded');
        } catch (e) { console.error('❌ EntityManager failed:', e.message); }

        try {
            console.log('Testing CombatSystem...');
            const CombatSystem = (await import('./systems/CombatSystem.js')).default;
            // CombatSystem needs EntityManager
            const EntityManager = (await import('./systems/EntityManager.js')).default;
            const entityManager = new EntityManager(eventBus);
            const combatSystem = new CombatSystem(eventBus, entityManager);
            branchSystems.push('CombatSystem');
            console.log('✅ CombatSystem loaded');
        } catch (e) { console.error('❌ CombatSystem failed:', e.message); }

        try {
            console.log('Testing ProgressionSystem...');
            const ProgressionSystem = (await import('./systems/ProgressionSystem.js')).default;
            const EntityManager = (await import('./systems/EntityManager.js')).default;
            const entityManager = new EntityManager(eventBus);
            const progressionSystem = new ProgressionSystem(eventBus, entityManager);
            branchSystems.push('ProgressionSystem');
            console.log('✅ ProgressionSystem loaded');
        } catch (e) { console.error('❌ ProgressionSystem failed:', e.message); }

        try {
            console.log('Testing InventorySystem...');
            const InventorySystem = (await import('./systems/InventorySystem.js')).default;
            const EntityManager = (await import('./systems/EntityManager.js')).default;
            const entityManager = new EntityManager(eventBus);
            const inventorySystem = new InventorySystem(eventBus, entityManager);
            branchSystems.push('InventorySystem');
            console.log('✅ InventorySystem loaded');
        } catch (e) { console.error('❌ InventorySystem failed:', e.message); }

        try {
            console.log('Testing ZoneManager...');
            const ZoneManager = (await import('./systems/ZoneManager.js')).default;
            const EntityManager = (await import('./systems/EntityManager.js')).default;
            const entityManager = new EntityManager(eventBus);
            const zoneManager = new ZoneManager(eventBus, entityManager);
            branchSystems.push('ZoneManager');
            console.log('✅ ZoneManager loaded');
        } catch (e) { console.error('❌ ZoneManager failed:', e.message); }

        try {
            console.log('Testing TimeSystem...');
            const TimeSystem = (await import('./systems/TimeSystem.js')).default;
            const timeSystem = new TimeSystem(eventBus);
            branchSystems.push('TimeSystem');
            console.log('✅ TimeSystem loaded');
        } catch (e) { console.error('❌ TimeSystem failed:', e.message); }

        try {
            console.log('Testing RelationshipSystem...');
            const RelationshipSystem = (await import('./systems/RelationshipSystem.js')).default;
            const EntityManager = (await import('./systems/EntityManager.js')).default;
            const entityManager = new EntityManager(eventBus);
            const relationshipSystem = new RelationshipSystem(eventBus, entityManager);
            branchSystems.push('RelationshipSystem');
            console.log('✅ RelationshipSystem loaded');
        } catch (e) { console.error('❌ RelationshipSystem failed:', e.message); }

        try {
            console.log('Testing PartySystem...');
            const PartySystem = (await import('./systems/PartySystem.js')).default;
            const EntityManager = (await import('./systems/EntityManager.js')).default;
            const entityManager = new EntityManager(eventBus);
            const partySystem = new PartySystem(eventBus, entityManager);
            branchSystems.push('PartySystem');
            console.log('✅ PartySystem loaded');
        } catch (e) { console.error('❌ PartySystem failed:', e.message); }

        try {
            console.log('Testing PetSystem...');
            const PetSystem = (await import('./systems/PetSystem.js')).default;
            const EntityManager = (await import('./systems/EntityManager.js')).default;
            const entityManager = new EntityManager(eventBus);
            const petSystem = new PetSystem(eventBus, entityManager);
            branchSystems.push('PetSystem');
            console.log('✅ PetSystem loaded');
        } catch (e) { console.error('❌ PetSystem failed:', e.message); }

        try {
            console.log('Testing DebugSystem...');
            const DebugSystem = (await import('./systems/DebugSystem.js')).default;
            const EntityManager = (await import('./systems/EntityManager.js')).default;
            const entityManager = new EntityManager(eventBus);
            const debugSystem = new DebugSystem(eventBus, entityManager);
            branchSystems.push('DebugSystem');
            console.log('✅ DebugSystem loaded');
        } catch (e) { console.error('❌ DebugSystem failed:', e.message); }

        // Create Phaser scene showing results
        const config = {
            type: Phaser.AUTO,
            width: 1200,
            height: 800,
            parent: 'game',
            backgroundColor: '#2c3e50',
            scene: {
                create: function() {
                    this.add.text(600, 50, 'BRANCH SYSTEMS TEST', {
                        fontSize: '32px',
                        color: '#ffffff'
                    }).setOrigin(0.5);
                    
                    this.add.text(600, 100, `✅ Core Systems: Working`, {
                        fontSize: '16px',
                        color: '#00ff00'
                    }).setOrigin(0.5);
                    
                    this.add.text(600, 130, `✅ Branch Systems Loaded: ${branchSystems.length}/10`, {
                        fontSize: '16px',
                        color: branchSystems.length === 10 ? '#00ff00' : '#ffff00'
                    }).setOrigin(0.5);
                    
                    // List working systems
                    let y = 170;
                    branchSystems.forEach(system => {
                        this.add.text(600, y, `✅ ${system}`, {
                            fontSize: '14px',
                            color: '#00ff00'
                        }).setOrigin(0.5);
                        y += 25;
                    });
                    
                    if (branchSystems.length === 10) {
                        this.add.text(600, y + 20, '🎉 All systems ready for leaf test!', {
                            fontSize: '18px',
                            color: '#00ff00'
                        }).setOrigin(0.5);
                    }
                }
            }
        };

        new Phaser.Game(config);

    } catch (error) {
        console.error('❌ Critical error:', error);
        
        const config = {
            type: Phaser.AUTO,
            width: 1200,
            height: 800,
            parent: 'game',
            backgroundColor: '#2c3e50',
            scene: {
                create: function() {
                    this.add.text(600, 400, 'BRANCH SYSTEM ERROR', {
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
}

testSystems();