/**
 * Neutral entity factory and definitions
 * Using EXACT same pattern as enemies for consistent movement
 */
import BaseNeutral from './BaseNeutral.js';

// Wildlife neutrals
export class Rabbit {
    static create(entityManager, position) {
        const components = BaseNeutral.getBaseComponents({
            position,
            name: 'Rabbit',
            color: 0x8b7355,
            health: 20,
            moveSpeed: 200,  // Fast movement interval
            movePattern: 'erratic',
            pauseChance: 0.7,
            canTalk: false,
            canTrade: false
        });

        // Create with 'enemy' tag too so MovementManager picks it up
        return entityManager.createEntity(components, ['neutral', 'wildlife', 'enemy']);
    }
}

export class Deer {
    static create(entityManager, position) {
        const components = BaseNeutral.getBaseComponents({
            position,
            name: 'Deer',
            color: 0xcd853f,
            health: 40,
            moveSpeed: 400,
            movePattern: 'wander',
            pauseChance: 0.6,
            canTalk: false,
            canTrade: false
        });

        return entityManager.createEntity(components, ['neutral', 'wildlife', 'enemy']);
    }
}

export class Wolf {
    static create(entityManager, position) {
        const components = BaseNeutral.getBaseComponents({
            position,
            name: 'Wolf',
            color: 0x696969,
            health: 60,
            moveSpeed: 300,
            movePattern: 'patrol',
            pauseChance: 0.4,
            canTalk: false,
            canTrade: false
        });

        return entityManager.createEntity(components, ['neutral', 'wildlife', 'enemy']);
    }
}

// NPC neutrals
export class Merchant {
    static create(entityManager, position) {
        const components = BaseNeutral.getBaseComponents({
            position,
            name: 'Merchant',
            color: 0xffd700,
            health: 100,
            moveSpeed: 500,
            movePattern: 'stationary',
            pauseChance: 1.0,  // Never moves
            canTalk: true,
            canTrade: true,
            dialogues: [
                "Welcome to my shop!",
                "Best prices in the kingdom!",
                "Protein shakes for strong arms!",
                "Come back anytime!"
            ]
        });

        return entityManager.createEntity(components, ['neutral', 'npc', 'merchant', 'enemy']);
    }
}

export class TownGuard {
    static create(entityManager, position) {
        const components = BaseNeutral.getBaseComponents({
            position,
            name: 'Town Guard',
            color: 0x4682b4,
            health: 150,
            moveSpeed: 600,
            movePattern: 'patrol',
            pauseChance: 0.5,
            canTalk: true,
            canTrade: false,
            dialogues: [
                "Keep the peace, citizen.",
                "No trouble in my town.",
                "Move along.",
                "Report any bandits immediately."
            ]
        });

        return entityManager.createEntity(components, ['neutral', 'npc', 'guard', 'enemy']);
    }
}

export class Villager {
    static create(entityManager, position) {
        const dialogueSets = [
            [
                "Nice weather today!",
                "Have you heard about the arm wrestling tournament?",
                "The merchant has new items today.",
                "Be careful in the wilderness."
            ],
            [
                "I used to be an arm wrestler like you...",
                "My cousin went to the big city to compete.",
                "The guards keep us safe from bandits.",
                "Sometimes I see strange creatures at night."
            ],
            [
                "Welcome to our humble village!",
                "The blacksmith might have work for you.",
                "Don't go into the forest after dark.",
                "I hear there's treasure in the old ruins."
            ]
        ];

        const dialogues = dialogueSets[Math.floor(Math.random() * dialogueSets.length)];
        const names = ['Villager', 'Townsperson', 'Local', 'Resident'];
        
        const components = BaseNeutral.getBaseComponents({
            position,
            name: names[Math.floor(Math.random() * names.length)],
            color: 0x8fbc8f,
            health: 50,
            moveSpeed: 500,
            movePattern: 'wander',
            pauseChance: 0.8,
            canTalk: true,
            canTrade: false,
            dialogues: dialogues
        });

        return entityManager.createEntity(components, ['neutral', 'npc', 'villager', 'enemy']);
    }
}

// Factory class
export class NeutralFactory {
    static create(entityManager, type, position) {
        switch (type) {
            // Wildlife
            case 'Rabbit':
                return Rabbit.create(entityManager, position);
            case 'Deer':
                return Deer.create(entityManager, position);
            case 'Wolf':
                return Wolf.create(entityManager, position);
            
            // NPCs
            case 'Merchant':
                return Merchant.create(entityManager, position);
            case 'TownGuard':
                return TownGuard.create(entityManager, position);
            case 'Villager':
                return Villager.create(entityManager, position);
            
            default:
                console.error(`Unknown neutral type: ${type}`);
                return null;
        }
    }

    static getRandomWildlife() {
        const wildlife = ['Rabbit', 'Deer', 'Wolf'];
        return wildlife[Math.floor(Math.random() * wildlife.length)];
    }

    static getRandomVillageNPC() {
        const npcs = ['Villager', 'Merchant', 'TownGuard'];
        return npcs[Math.floor(Math.random() * npcs.length)];
    }
}