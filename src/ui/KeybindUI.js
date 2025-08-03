/**
 * KeybindUI - Shows game controls and keybindings
 * Leaf-level UI component
 */
export default class KeybindUI {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.isVisible = false;
        
        this.config = {
            x: this.scene.cameras.main.width / 2,
            y: this.scene.cameras.main.height / 2,
            width: 500,
            height: 600,
            padding: 20,
            titleSize: '28px',
            categorySize: '20px',
            bindingSize: '16px',
            bgColor: 0x2a2a2a,
            borderColor: 0x4a4a4a,
            textColor: '#ffffff',
            keyColor: '#ffcc00'
        };
        
        this.keybinds = {
            'Movement': [
                { action: 'Move Up', keys: ['W', '↑'] },
                { action: 'Move Down', keys: ['S', '↓'] },
                { action: 'Move Left', keys: ['A', '←'] },
                { action: 'Move Right', keys: ['D', '→'] }
            ],
            'Combat': [
                { action: 'Attack/Fight', keys: ['SPACE', 'Left Click'] },
                { action: 'Flee Combat', keys: ['ESC'] },
                { action: 'Target Enemy', keys: ['Click Enemy'] }
            ],
            'Interaction': [
                { action: 'Talk/Trade', keys: ['E', 'Click NPC'] },
                { action: 'Open Inventory', keys: ['I'] },
                { action: 'Pick Up Item', keys: ['F'] }
            ],
            'Interface': [
                { action: 'Toggle Keybinds', keys: ['K'] },
                { action: 'Debug Menu', keys: ['F2'] },
                { action: 'Toggle Fullscreen', keys: ['F11'] }
            ]
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for K key to toggle
        this.scene.input.keyboard.on('keydown-K', () => {
            this.toggle();
        });
        
        // Also allow clicking debug button to show keybinds
        this.scene.eventBus.on('ui:show-keybinds', () => {
            this.show();
        });
        
        this.scene.eventBus.on('ui:hide-keybinds', () => {
            this.hide();
        });
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    show() {
        if (this.isVisible) return;
        
        this.createUI();
        this.isVisible = true;
        
        // Animate in
        this.container.setScale(0.8);
        this.container.setAlpha(0);
        
        this.scene.tweens.add({
            targets: this.container,
            scale: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }
    
    hide() {
        if (!this.isVisible) return;
        
        this.scene.tweens.add({
            targets: this.container,
            scale: 0.8,
            alpha: 0,
            duration: 200,
            ease: 'Back.easeIn',
            onComplete: () => {
                this.container.destroy();
                this.container = null;
                this.isVisible = false;
            }
        });
    }
    
    createUI() {
        this.container = this.scene.add.container(this.config.x, this.config.y);
        this.container.setScrollFactor(0);
        this.container.setDepth(900);
        
        // Background panel
        const bg = this.scene.add.rectangle(0, 0, this.config.width, this.config.height, this.config.bgColor);
        bg.setStrokeStyle(3, this.config.borderColor);
        bg.setInteractive();
        
        // Title
        const title = this.scene.add.text(0, -this.config.height/2 + 40, 'KEYBINDINGS', {
            fontSize: this.config.titleSize,
            color: this.config.textColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Close button
        const closeBtn = this.scene.add.text(
            this.config.width/2 - 30, 
            -this.config.height/2 + 30, 
            'X', 
            {
                fontSize: '24px',
                color: '#ff4444',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        closeBtn.setInteractive();
        closeBtn.on('pointerdown', () => this.hide());
        closeBtn.on('pointerover', () => closeBtn.setScale(1.2));
        closeBtn.on('pointerout', () => closeBtn.setScale(1));
        
        // Create keybind sections
        let yOffset = -this.config.height/2 + 100;
        
        Object.entries(this.keybinds).forEach(([category, bindings]) => {
            // Category header
            const categoryText = this.scene.add.text(-this.config.width/2 + 30, yOffset, category.toUpperCase(), {
                fontSize: this.config.categorySize,
                color: this.config.keyColor,
                fontStyle: 'bold'
            }).setOrigin(0, 0);
            
            yOffset += 35;
            
            // Bindings
            bindings.forEach(binding => {
                // Action name
                const actionText = this.scene.add.text(-this.config.width/2 + 50, yOffset, binding.action, {
                    fontSize: this.config.bindingSize,
                    color: this.config.textColor
                }).setOrigin(0, 0);
                
                // Keys
                const keysText = binding.keys.join(' / ');
                const keyText = this.scene.add.text(this.config.width/2 - 50, yOffset, keysText, {
                    fontSize: this.config.bindingSize,
                    color: this.config.keyColor,
                    fontStyle: 'bold'
                }).setOrigin(1, 0);
                
                this.container.add([actionText, keyText]);
                yOffset += 25;
            });
            
            this.container.add(categoryText);
            yOffset += 15; // Extra space between categories
        });
        
        // Help text at bottom
        const helpText = this.scene.add.text(0, this.config.height/2 - 30, 'Press K to toggle this menu', {
            fontSize: '14px',
            color: '#888888',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        
        // Add all elements to container
        this.container.add([bg, title, closeBtn, helpText]);
        
        // Allow clicking outside to close
        this.scene.input.on('pointerdown', (pointer) => {
            const bounds = bg.getBounds();
            if (!bounds.contains(pointer.x - this.config.x, pointer.y - this.config.y)) {
                this.hide();
            }
        });
    }
    
    destroy() {
        if (this.container) {
            this.container.destroy();
        }
    }
}