/**
 * DebugUI - Visual debug menu interface
 * Leaf-level UI component for the debug system
 */
export default class DebugUI {
    constructor(scene, debugSystem) {
        this.scene = scene;
        this.debugSystem = debugSystem;
        this.eventBus = debugSystem.eventBus;
        
        // UI configuration
        this.config = {
            x: 10,
            y: 10,
            width: 300,
            categoryHeight: 30,
            itemHeight: 25,
            padding: 5,
            backgroundColor: 0x000000,
            backgroundAlpha: 0.8,
            textColor: '#ffffff',
            hoverColor: '#ffff00',
            categoryColor: '#00ff00'
        };
        
        // UI state
        this.container = null;
        this.background = null;
        this.elements = [];
        this.expandedCategories = new Set();
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventBus.on('debug:menu-toggled', (data) => {
            if (data.visible) {
                this.show();
            } else {
                this.hide();
            }
        });
    }

    show() {
        if (this.container) {
            this.container.setVisible(true);
            return;
        }
        
        this.create();
    }

    hide() {
        if (this.container) {
            this.container.setVisible(false);
        }
    }

    create() {
        // Create container
        this.container = this.scene.add.container(this.config.x, this.config.y);
        this.container.setScrollFactor(0); // Fixed to camera
        this.container.setDepth(1000); // On top
        
        // Get menu configuration
        const menuConfig = this.debugSystem.getMenuConfig();
        
        // Calculate total height
        let totalHeight = 0;
        Object.entries(menuConfig).forEach(([key, category]) => {
            totalHeight += this.config.categoryHeight;
            if (this.expandedCategories.has(key)) {
                totalHeight += category.items.length * this.config.itemHeight;
            }
        });
        
        // Create background
        this.background = this.scene.add.rectangle(
            0, 0,
            this.config.width,
            totalHeight + this.config.padding * 2,
            this.config.backgroundColor,
            this.config.backgroundAlpha
        );
        this.background.setOrigin(0, 0);
        this.background.setStrokeStyle(2, 0xffffff);
        this.container.add(this.background);
        
        // Create menu items
        let yOffset = this.config.padding;
        
        Object.entries(menuConfig).forEach(([categoryKey, category]) => {
            // Create category header
            const categoryBg = this.scene.add.rectangle(
                this.config.padding,
                yOffset,
                this.config.width - this.config.padding * 2,
                this.config.categoryHeight - 2,
                0x333333
            );
            categoryBg.setOrigin(0, 0);
            categoryBg.setInteractive();
            
            const categoryText = this.scene.add.text(
                this.config.padding + 5,
                yOffset + 5,
                `${this.expandedCategories.has(categoryKey) ? '▼' : '▶'} ${category.name}`,
                {
                    fontSize: '16px',
                    color: this.config.categoryColor,
                    fontStyle: 'bold'
                }
            );
            
            this.container.add([categoryBg, categoryText]);
            
            // Category click handler
            categoryBg.on('pointerdown', () => {
                if (this.expandedCategories.has(categoryKey)) {
                    this.expandedCategories.delete(categoryKey);
                } else {
                    this.expandedCategories.add(categoryKey);
                }
                this.refresh();
            });
            
            categoryBg.on('pointerover', () => {
                categoryBg.setFillStyle(0x555555);
            });
            
            categoryBg.on('pointerout', () => {
                categoryBg.setFillStyle(0x333333);
            });
            
            yOffset += this.config.categoryHeight;
            
            // Create items if expanded
            if (this.expandedCategories.has(categoryKey)) {
                category.items.forEach((item, index) => {
                    const itemBg = this.scene.add.rectangle(
                        this.config.padding + 20,
                        yOffset,
                        this.config.width - this.config.padding * 2 - 20,
                        this.config.itemHeight - 2,
                        0x222222
                    );
                    itemBg.setOrigin(0, 0);
                    itemBg.setInteractive();
                    
                    const itemText = this.scene.add.text(
                        this.config.padding + 25,
                        yOffset + 3,
                        item.label,
                        {
                            fontSize: '14px',
                            color: this.config.textColor
                        }
                    );
                    
                    this.container.add([itemBg, itemText]);
                    
                    // Item click handler
                    itemBg.on('pointerdown', () => {
                        this.debugSystem.executeTest({
                            event: item.event,
                            data: item.data || {}
                        });
                        
                        // Visual feedback
                        itemBg.setFillStyle(0x00ff00);
                        this.scene.time.delayedCall(100, () => {
                            itemBg.setFillStyle(0x222222);
                        });
                    });
                    
                    itemBg.on('pointerover', () => {
                        itemBg.setFillStyle(0x444444);
                        itemText.setColor(this.config.hoverColor);
                    });
                    
                    itemBg.on('pointerout', () => {
                        itemBg.setFillStyle(0x222222);
                        itemText.setColor(this.config.textColor);
                    });
                    
                    yOffset += this.config.itemHeight;
                });
            }
        });
        
        // Update background height
        this.background.setSize(this.config.width, yOffset + this.config.padding);
        
        // Add title
        const title = this.scene.add.text(
            this.config.width / 2,
            -20,
            'DEBUG MENU (F2)',
            {
                fontSize: '18px',
                color: '#ff0000',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);
        this.container.add(title);
        
        // Add flags display
        const flags = this.debugSystem.getDebugFlags();
        let flagText = 'Flags: ';
        if (flags.godMode) flagText += '[GOD] ';
        if (flags.oneHitMode) flagText += '[1HIT] ';
        if (flags.verboseLogging) flagText += '[LOG] ';
        
        const flagsDisplay = this.scene.add.text(
            this.config.padding,
            yOffset + this.config.padding * 2,
            flagText,
            {
                fontSize: '12px',
                color: '#ffff00'
            }
        );
        this.container.add(flagsDisplay);
    }

    refresh() {
        // Destroy and recreate
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        this.create();
    }

    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        this.elements = [];
    }
}