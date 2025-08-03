/**
 * CombatUI - Combat interface for arm wrestling
 * Leaf-level UI component
 */
export default class CombatUI {
    constructor(scene, combatSystem) {
        this.scene = scene;
        this.combatSystem = combatSystem;
        this.eventBus = combatSystem.eventBus;
        
        // UI configuration
        this.config = {
            centerX: 600,
            centerY: 350,
            panelWidth: 500,
            panelHeight: 250,
            tugBarWidth: 400,
            tugBarHeight: 40,
            clickButtonSize: 100
        };
        
        // UI elements
        this.container = null;
        this.isVisible = false;
        this.currentCombat = null;
        
        // Click tracking
        this.clickCount = 0;
        this.lastClickTime = 0;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventBus.on('combat:started', this.showCombat.bind(this));
        this.eventBus.on('combat:tug-update', this.updateTugBar.bind(this));
        this.eventBus.on('combat:ended', this.hideCombat.bind(this));
        this.eventBus.on('combat:victory', this.showVictory.bind(this));
        this.eventBus.on('combat:defeat', this.showDefeat.bind(this));
        
        // Global click handler for combat
        this.scene.input.on('pointerdown', (pointer) => {
            if (this.isVisible && this.currentCombat && pointer.button === 0) {
                this.handleClick();
            }
        });
        
        // Space key handler for combat
        this.scene.input.keyboard.on('keydown-SPACE', () => {
            if (this.isVisible && this.currentCombat) {
                this.handleClick();
            }
        });
        
        // Escape key handler for fleeing
        this.scene.input.keyboard.on('keydown-ESC', () => {
            if (this.isVisible && this.currentCombat) {
                this.handleFlee();
            }
        });
    }

    showCombat(data) {
        const { attackerId, defenderId, combatData } = data;
        this.currentCombat = { attackerId, defenderId, combatData };
        
        if (this.container) {
            this.container.destroy();
        }
        
        // Create container
        this.container = this.scene.add.container(this.config.centerX, this.config.centerY);
        this.container.setScrollFactor(0);
        this.container.setDepth(999);
        
        // Background panel
        const panel = this.scene.add.rectangle(0, 0, this.config.panelWidth, this.config.panelHeight, 0x000000, 0.9);
        panel.setStrokeStyle(4, 0xffffff);
        this.container.add(panel);
        
        // Title
        const title = this.scene.add.text(0, -80, 'ARM WRESTLING BATTLE!', {
            fontSize: '32px',
            color: '#ff0000',
            stroke: '#ffffff',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.container.add(title);
        
        // Get entity names
        const attacker = this.eventBus.entityManager?.getEntity(attackerId);
        const defender = this.eventBus.entityManager?.getEntity(defenderId);
        
        const attackerName = attacker?.getComponent('playerData')?.name || 
                           attacker?.getComponent('appearance')?.name || 'Player';
        const defenderName = defender?.getComponent('appearance')?.name || 'Enemy';
        
        // VS text
        const vsText = this.scene.add.text(0, -40, `${attackerName} VS ${defenderName}`, {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(vsText);
        
        // Tug of war bar background
        const tugBg = this.scene.add.rectangle(0, 0, this.config.tugBarWidth, this.config.tugBarHeight, 0x333333);
        tugBg.setStrokeStyle(2, 0xffffff);
        this.container.add(tugBg);
        
        // Center line
        const centerLine = this.scene.add.rectangle(0, 0, 4, this.config.tugBarHeight + 10, 0xffffff);
        this.container.add(centerLine);
        
        // Tug bar (starts at center)
        this.tugBar = this.scene.add.rectangle(0, 0, this.config.tugBarWidth * 0.5, this.config.tugBarHeight - 4, 0x00ff00);
        this.container.add(this.tugBar);
        
        // Click button
        const clickButton = this.scene.add.circle(0, 80, this.config.clickButtonSize / 2, 0xff0000);
        clickButton.setStrokeStyle(4, 0xffffff);
        clickButton.setInteractive();
        this.container.add(clickButton);
        
        // Click text
        const clickText = this.scene.add.text(0, 80, 'CLICK!', {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.container.add(clickText);
        
        // Instructions
        const instructions = this.scene.add.text(0, 140, 'Click rapidly or press SPACE!\nESC to flee', {
            fontSize: '16px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        this.container.add(instructions);
        
        // Click counter
        this.clickCountText = this.scene.add.text(-200, -100, 'Clicks: 0', {
            fontSize: '16px',
            color: '#00ff00'
        });
        this.container.add(this.clickCountText);
        
        // DPS display
        this.dpsText = this.scene.add.text(200, -100, 'DPS: 0', {
            fontSize: '16px',
            color: '#00ff00'
        }).setOrigin(1, 0);
        this.container.add(this.dpsText);
        
        // Setup click handlers
        clickButton.on('pointerdown', () => {
            this.handleClick();
            
            // Visual feedback
            this.scene.tweens.add({
                targets: clickButton,
                scale: 0.9,
                duration: 50,
                yoyo: true,
                ease: 'Quad.easeOut'
            });
        });
        
        // Keyboard input
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.escKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        
        // Also listen for general click anywhere on combat panel
        panel.setInteractive();
        panel.on('pointerdown', () => this.handleClick());
        
        this.isVisible = true;
        this.clickCount = 0;
        
        // Animate in
        this.container.setScale(0.5);
        this.container.setAlpha(0);
        this.scene.tweens.add({
            targets: this.container,
            scale: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    handleClick() {
        if (!this.isVisible || !this.currentCombat) return;
        
        console.log('CombatUI: Click detected! Current combat:', this.currentCombat);
        
        this.clickCount++;
        this.lastClickTime = Date.now();
        
        // Update click counter
        if (this.clickCountText) {
            this.clickCountText.setText(`Clicks: ${this.clickCount}`);
        }
        
        // Emit player attack event
        this.eventBus.emit('player:attack');
        
        // Visual click feedback
        const clickEffect = this.scene.add.circle(
            this.config.centerX + (Math.random() - 0.5) * 100,
            this.config.centerY + 80 + (Math.random() - 0.5) * 20,
            20,
            0xffff00,
            0.8
        );
        clickEffect.setScrollFactor(0);
        clickEffect.setDepth(1000);
        
        this.scene.tweens.add({
            targets: clickEffect,
            scale: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => clickEffect.destroy()
        });
    }
    
    handleFlee() {
        if (!this.isVisible || !this.currentCombat) return;
        
        console.log('CombatUI: Flee requested!');
        
        // Emit flee event
        this.eventBus.emit('player:flee', {
            attackerId: this.currentCombat.attackerId,
            defenderId: this.currentCombat.defenderId
        });
        
        // Hide combat UI
        this.hideCombat();
    }

    updateTugBar(data) {
        if (!this.tugBar) return;
        
        const { tugPosition } = data;
        
        // tugPosition: 0 = enemy winning, 0.5 = center, 1 = player winning
        const barWidth = this.config.tugBarWidth * tugPosition;
        const barX = (tugPosition - 0.5) * this.config.tugBarWidth / 2;
        
        this.tugBar.x = barX;
        this.tugBar.setSize(Math.abs(barX) * 2, this.config.tugBarHeight - 4);
        
        // Change color based on position
        if (tugPosition > 0.75) {
            this.tugBar.setFillStyle(0x00ff00); // Green - winning
        } else if (tugPosition > 0.5) {
            this.tugBar.setFillStyle(0xffff00); // Yellow - advantage
        } else if (tugPosition > 0.25) {
            this.tugBar.setFillStyle(0xff8800); // Orange - disadvantage
        } else {
            this.tugBar.setFillStyle(0xff0000); // Red - losing
        }
        
        // Update DPS if we have combat data
        const combatData = this.combatSystem.getCombatData(this.currentCombat.attackerId);
        if (combatData && this.dpsText) {
            this.dpsText.setText(`DPS: ${combatData.attackerDPS.toFixed(1)}`);
        }
    }

    showVictory() {
        if (!this.container) return;
        
        // Victory text
        const victoryText = this.scene.add.text(0, 0, 'VICTORY!', {
            fontSize: '64px',
            color: '#00ff00',
            stroke: '#ffffff',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        this.container.add(victoryText);
        
        // Animate
        victoryText.setScale(0);
        this.scene.tweens.add({
            targets: victoryText,
            scale: 1.2,
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.time.delayedCall(1500, () => this.hideCombat());
            }
        });
        
        // Particles or effects could go here
    }

    showDefeat() {
        if (!this.container) return;
        
        // Defeat text
        const defeatText = this.scene.add.text(0, 0, 'DEFEATED...', {
            fontSize: '64px',
            color: '#ff0000',
            stroke: '#ffffff',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        this.container.add(defeatText);
        
        // Animate
        defeatText.setScale(0);
        this.scene.tweens.add({
            targets: defeatText,
            scale: 1,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.scene.time.delayedCall(1500, () => this.hideCombat());
            }
        });
    }

    hideCombat() {
        if (!this.container) return;
        
        this.isVisible = false;
        
        // Animate out
        this.scene.tweens.add({
            targets: this.container,
            scale: 0.5,
            alpha: 0,
            duration: 300,
            ease: 'Back.easeIn',
            onComplete: () => {
                this.container.destroy();
                this.container = null;
                this.currentCombat = null;
            }
        });
    }

    update(time, delta) {
        if (!this.isVisible) return;
        
        // Check keyboard input
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.handleClick();
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.eventBus.emit('combat:flee', { entityId: this.currentCombat.attackerId });
        }
    }

    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }
}