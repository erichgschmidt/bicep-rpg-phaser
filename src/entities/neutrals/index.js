/**
 * Neutral entity definitions
 * Built exactly like enemy entities for consistent movement
 */
import BaseNeutral from './BaseNeutral.js';

// Wildlife entities
export class Rabbit {
    static create(entityManager, position) {
        const config = {
            position,
            name: 'Rabbit',
            color: 0x8b7355,
            faction: 'wildlife',
            health: 20,
            moveSpeed: 200,
            movePattern: 'erratic',
            pauseChance: 0.7,
            canTalk: false,
            canTrade: false,
            dialogues: []
        };

        const components = BaseNeutral.getBaseComponents(config);
        const entity = entityManager.createEntity(components, ['neutral', 'wildlife', 'rabbit']);
        
        return entity;
    }
}

export class Deer {
    static create(entityManager, position) {
        const config = {
            position,
            name: 'Deer',
            color: 0xdaa520,
            faction: 'wildlife',
            health: 40,
            moveSpeed: 250,
            movePattern: 'wander',
            pauseChance: 0.6,
            canTalk: false,
            canTrade: false,
            dialogues: []
        };

        const components = BaseNeutral.getBaseComponents(config);
        const entity = entityManager.createEntity(components, ['neutral', 'wildlife', 'deer']);
        
        return entity;
    }
}

export class Wolf {
    static create(entityManager, position) {
        const config = {
            position,
            name: 'Wolf',
            color: 0x696969,
            faction: 'wildlife',
            health: 60,
            moveSpeed: 300,
            movePattern: 'patrol',
            pauseChance: 0.4,
            canTalk: false,
            canTrade: false,
            dialogues: []
        };

        const components = BaseNeutral.getBaseComponents(config);
        const entity = entityManager.createEntity(components, ['neutral', 'wildlife', 'wolf']);
        
        return entity;
    }
}

// Merchant NPCs
export class Merchant {
    static create(entityManager, position) {
        const config = {
            position,
            name: 'Merchant',
            color: 0xffd700,
            faction: 'merchants',
            health: 80,
            moveSpeed: 500,
            movePattern: 'stationary',
            pauseChance: 1.0,
            canTalk: true,
            canTrade: true,
            dialogues: [
                "Welcome! Take a look at my wares!",
                "Best prices in the land, I guarantee!",
                "Protein shakes for the aspiring arm wrestler!",
                "Come back anytime!"
            ]
        };

        const components = BaseNeutral.getBaseComponents(config);
        const entity = entityManager.createEntity(components, ['neutral', 'merchant', 'npc']);
        
        return entity;
    }
}

// Guard NPCs
export class TownGuard {
    static create(entityManager, position) {
        const config = {
            position,
            name: 'Town Guard',
            color: 0x4682b4,
            faction: 'guards',
            health: 150,
            moveSpeed: 350,
            movePattern: 'patrol',
            pauseChance: 0.5,
            canTalk: true,
            canTrade: false,
            dialogues: [
                "Keep the peace, citizen.",
                "No trouble in my town.",
                "Move along.",
                "Report any bandits to me immediately."
            ]
        };

        const components = BaseNeutral.getBaseComponents(config);
        const entity = entityManager.createEntity(components, ['neutral', 'guard', 'npc']);
        
        return entity;
    }
}

// Villager NPCs
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
        
        const config = {
            position,
            name: names[Math.floor(Math.random() * names.length)],
            color: 0x8fbc8f,
            faction: 'merchants',
            health: 50,
            moveSpeed: 600,
            movePattern: 'wander',
            pauseChance: 0.8,
            canTalk: true,
            canTrade: false,
            dialogues: dialogues
        };

        const components = BaseNeutral.getBaseComponents(config);
        const entity = entityManager.createEntity(components, ['neutral', 'villager', 'npc']);
        
        return entity;
    }
}

// Export all neutral types
export const NeutralTypes = {
    // Wildlife
    Rabbit,
    Deer,
    Wolf,
    
    // NPCs
    Merchant,
    TownGuard,
    Villager
};

// Neutral factory
export class NeutralFactory {
    static create(entityManager, type, position) {
        const NeutralClass = NeutralTypes[type];
        if (!NeutralClass) {
            console.error(`Unknown neutral type: ${type}`);
            return null;
        }
        
        return NeutralClass.create(entityManager, position);
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

// Keep the old NeutralMob export for compatibility
export { default as NeutralMob } from './BaseNeutral.js';
export default BaseNeutral;