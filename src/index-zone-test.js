import Phaser from 'phaser';

console.log('=== ZONE MANAGER SPECIFIC TEST ===');

async function testZoneManager() {
    try {
        // Load core systems first
        console.log('Loading core systems...');
        const EventBus = (await import('./core/EventBus.js')).default;
        const eventBus = new EventBus();
        console.log('✅ EventBus loaded');

        // Load EntityManager (ZoneManager depends on it)
        console.log('Loading EntityManager...');
        const EntityManager = (await import('./systems/EntityManager.js')).default;
        const entityManager = new EntityManager(eventBus);
        console.log('✅ EntityManager loaded');

        // Now test ZoneManager specifically
        console.log('Loading ZoneManager...');
        const ZoneManager = (await import('./systems/ZoneManager.js')).default;
        console.log('✅ ZoneManager import successful');
        
        console.log('Creating ZoneManager instance...');
        const zoneManager = new ZoneManager(eventBus, entityManager);
        console.log('✅ ZoneManager instance created');
        
        console.log('Testing ZoneManager methods...');
        
        // Test basic functionality
        const testZone = {
            id: 'test_zone',
            type: 'bonfire',
            position: { x: 0, y: 0 },
            radius: 5,
            properties: {
                name: 'Test Bonfire',
                safe: true,
                healing: true
            }
        };
        
        console.log('Testing zone creation...');
        zoneManager.createZone(testZone);
        console.log('✅ Zone creation successful');
        
        console.log('Testing zone queries...');
        const zoneInfo = zoneManager.getZoneInfo('test_zone');
        console.log('✅ Zone query successful:', zoneInfo);
        
        console.log('🎉 ZoneManager working perfectly!');

        // Create success display
        const config = {
            type: Phaser.AUTO,
            width: 1200,
            height: 800,
            parent: 'game',
            backgroundColor: '#2c3e50',
            scene: {
                create: function() {
                    this.add.text(600, 200, 'ZONE MANAGER TEST', {
                        fontSize: '32px',
                        color: '#ffffff'
                    }).setOrigin(0.5);
                    
                    this.add.text(600, 280, '✅ ZoneManager Loading: SUCCESS', {
                        fontSize: '18px',
                        color: '#00ff00'
                    }).setOrigin(0.5);
                    
                    this.add.text(600, 320, '✅ Zone Creation: SUCCESS', {
                        fontSize: '18px',
                        color: '#00ff00'
                    }).setOrigin(0.5);
                    
                    this.add.text(600, 360, '✅ Zone Queries: SUCCESS', {
                        fontSize: '18px',
                        color: '#00ff00'
                    }).setOrigin(0.5);
                    
                    this.add.text(600, 420, 'ZoneManager is working correctly!', {
                        fontSize: '16px',
                        color: '#ffffff'
                    }).setOrigin(0.5);
                    
                    this.add.text(600, 460, 'The issue must be in the full system integration', {
                        fontSize: '14px',
                        color: '#ffff00'
                    }).setOrigin(0.5);
                }
            }
        };

        new Phaser.Game(config);

    } catch (error) {
        console.error('❌ ZoneManager failed:', error);
        console.error('Stack trace:', error.stack);
        
        // Create error display
        const config = {
            type: Phaser.AUTO,
            width: 1200,
            height: 800,
            parent: 'game',
            backgroundColor: '#2c3e50',
            scene: {
                create: function() {
                    this.add.text(600, 200, 'ZONE MANAGER ERROR', {
                        fontSize: '32px',
                        color: '#ff0000'
                    }).setOrigin(0.5);
                    
                    this.add.text(600, 280, `Error: ${error.message}`, {
                        fontSize: '16px',
                        color: '#ffffff'
                    }).setOrigin(0.5);
                    
                    this.add.text(600, 320, 'Check console for full error details', {
                        fontSize: '14px',
                        color: '#ffff00'
                    }).setOrigin(0.5);
                }
            }
        };
        new Phaser.Game(config);
    }
}

testZoneManager();