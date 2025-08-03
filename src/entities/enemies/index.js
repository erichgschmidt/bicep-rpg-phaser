/**
 * Enemy entity definitions
 * Leaf-level classes that define specific enemy types
 */
import BaseEnemy from './BaseEnemy.js';

export class Pebble {
    static create(entityManager, position) {
        const config = {
            position,
            name: 'Pebble',
            color: 0x808080,
            power: 0.5,
            health: 30,
            moveSpeed: 300,
            movePattern: 'erratic',
            pauseChance: 0.3,
            tier: 1,  // Level 1 enemy - easiest
            lootTable: [
                { itemId: 'small_protein', chance: 0.3, min: 1, max: 2 },
                { itemId: 'pebble_dust', chance: 0.5, min: 1, max: 3 }
            ]
        };

        const components = BaseEnemy.getBaseComponents(config);
        const enemy = entityManager.createEntity(components, ['enemy', 'hostile', 'pebble']);
        
        return enemy;
    }
}

export class Stick {
    static create(entityManager, position) {
        const config = {
            position,
            name: 'Stick',
            color: 0x8b4513,
            power: 1,
            health: 50,
            moveSpeed: 220,
            movePattern: 'patrol',
            pauseChance: 0.4,
            tier: 2,  // Level 2 enemy - medium
            lootTable: [
                { itemId: 'protein_bar', chance: 0.4, min: 1, max: 2 },
                { itemId: 'wooden_bracelet', chance: 0.1, min: 1, max: 1 },
                { itemId: 'stick_splinter', chance: 0.6, min: 2, max: 4 }
            ]
        };

        const components = BaseEnemy.getBaseComponents(config);
        const enemy = entityManager.createEntity(components, ['enemy', 'hostile', 'stick']);
        
        return enemy;
    }
}

export class Rock {
    static create(entityManager, position) {
        const config = {
            position,
            name: 'Rock',
            color: 0x696969,
            power: 2,
            health: 100,
            moveSpeed: 400,
            movePattern: 'lazy',
            pauseChance: 0.7,
            tier: 3,  // Level 3 enemy - hard
            lootTable: [
                { itemId: 'protein_shake', chance: 0.5, min: 1, max: 3 },
                { itemId: 'stone_gloves', chance: 0.15, min: 1, max: 1 },
                { itemId: 'rock_chunk', chance: 0.7, min: 1, max: 2 }
            ]
        };

        const components = BaseEnemy.getBaseComponents(config);
        const enemy = entityManager.createEntity(components, ['enemy', 'hostile', 'rock']);
        
        return enemy;
    }
}

export class AngrySquirrel {
    static create(entityManager, position) {
        const config = {
            position,
            name: 'Angry Squirrel',
            color: 0xcd853f,
            power: 3,
            health: 75,
            moveSpeed: 150,
            movePattern: 'aggressive',
            pauseChance: 0.1,
            tier: 4,  // Level 4 enemy - boss tier
            lootTable: [
                { itemId: 'rage_protein', chance: 0.6, min: 1, max: 2 },
                { itemId: 'squirrel_gloves', chance: 0.2, min: 1, max: 1 },
                { itemId: 'acorn', chance: 0.8, min: 3, max: 5 },
                { itemId: 'fluffy_tail', chance: 0.3, min: 1, max: 1 }
            ]
        };

        const components = BaseEnemy.getBaseComponents(config);
        // Angry Squirrels have extended aggro range
        components.enemyAI.aggroRange = 8;
        
        const enemy = entityManager.createEntity(components, ['enemy', 'hostile', 'angry_squirrel']);
        
        return enemy;
    }
}

// Boss variants
export class BoulderBoss {
    static create(entityManager, position) {
        const config = {
            position,
            name: 'Boulder Boss',
            color: 0x2f4f4f,
            power: 5,
            health: 300,
            moveSpeed: 600,
            movePattern: 'lazy',
            pauseChance: 0.5,
            tier: 2,
            lootTable: [
                { itemId: 'mega_protein', chance: 0.8, min: 2, max: 4 },
                { itemId: 'boulder_gloves', chance: 0.5, min: 1, max: 1 },
                { itemId: 'boss_trophy_boulder', chance: 1.0, min: 1, max: 1 }
            ]
        };

        const components = BaseEnemy.getBaseComponents(config);
        // Boss has special properties
        components.enemyData.isBoss = true;
        components.appearance.radius = 25; // Bigger
        components.appearance.strokeWidth = 4;
        
        const enemy = entityManager.createEntity(components, ['enemy', 'hostile', 'boss', 'boulder']);
        
        return enemy;
    }
}

// Export all enemy types
export const EnemyTypes = {
    Pebble,
    Stick,
    Rock,
    AngrySquirrel,
    BoulderBoss
};

// Enemy factory for easy creation
export class EnemyFactory {
    static create(entityManager, type, position) {
        const EnemyClass = EnemyTypes[type];
        if (!EnemyClass) {
            console.error(`Unknown enemy type: ${type}`);
            return null;
        }
        
        return EnemyClass.create(entityManager, position);
    }

    static getRandomEnemyType(tier = 1) {
        const tierOneEnemies = ['Pebble', 'Stick', 'Rock', 'AngrySquirrel'];
        const tierTwoEnemies = ['BoulderBoss'];
        
        if (tier === 1) {
            return tierOneEnemies[Math.floor(Math.random() * tierOneEnemies.length)];
        } else if (tier === 2) {
            return tierTwoEnemies[Math.floor(Math.random() * tierTwoEnemies.length)];
        }
        
        return 'Pebble'; // Default fallback
    }

    static getEnemyByDifficulty(difficulty) {
        if (difficulty < 0.4) return 'Pebble';
        if (difficulty < 0.7) return 'Stick';
        if (difficulty < 0.9) return 'Rock';
        return 'AngrySquirrel';
    }
}

export default BaseEnemy;