import Phaser from 'phaser';

console.log('=== MINIMAL BICEP RPG TEST ===');
console.log('Phaser version:', Phaser.VERSION);

// Minimal Phaser config
const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 800,
    parent: 'game',
    backgroundColor: '#2c3e50',
    scene: {
        create: function() {
            console.log('Minimal scene created successfully!');
            
            // Add simple test text
            this.add.text(600, 400, 'BICEP RPG - MINIMAL TEST', {
                fontSize: '32px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            
            this.add.text(600, 450, 'If you see this, Phaser is working!', {
                fontSize: '16px',
                color: '#00ff00'
            }).setOrigin(0.5);
        }
    }
};

console.log('Creating Phaser game...');
const game = new Phaser.Game(config);
console.log('Game created successfully!');