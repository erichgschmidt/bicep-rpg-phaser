/**
 * Neutral entity definitions
 * Leaf-level classes for NPCs, wildlife, and merchants
 */
import NeutralMob from './NeutralMob.js';

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
            movePattern: 'wander',
            pauseChance: 0.7,
            fleeHealth: 0.8, // Flees easily
            tameable: true,
            petType: 'bunny',
            tamingDifficulty: 0.8
        };

        const components = NeutralMob.getBaseComponents(config);
        const entity = entityManager.createEntity(components, ['neutral', 'wildlife', 'tameable', 'rabbit']);
        
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
            fleeHealth: 0.7,
            dialogues: [] // No dialogue, just wildlife
        };

        const components = NeutralMob.getBaseComponents(config);
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
            fleeHealth: 0.3, // Brave
            tameable: true,
            petType: 'wolf_pup',
            tamingDifficulty: 0.3 // Harder to tame
        };

        const components = NeutralMob.getBaseComponents(config);
        // Wolves can become hostile if provoked
        components.neutralAI.aggroThreshold = 2; // Attacks after 2 hits
        components.neutralAI.packBehavior = true;
        
        const entity = entityManager.createEntity(components, ['neutral', 'wildlife', 'tameable', 'wolf']);
        
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
            fleeHealth: 0.5,
            dialogues: [
                "Welcome! Take a look at my wares!",
                "Best prices in the land, I guarantee!",
                "Protein shakes for the aspiring arm wrestler!",
                "Come back anytime!"
            ],
            shopInventory: [
                { itemId: 'protein_shake', stock: 10, price: 50 },
                { itemId: 'energy_bar', stock: 20, price: 25 },
                { itemId: 'training_gloves', stock: 3, price: 200 },
                { itemId: 'lucky_bracelet', stock: 1, price: 500 }
            ]
        };

        const components = NeutralMob.getBaseComponents(config);
        const entity = entityManager.createEntity(components, ['neutral', 'merchant', 'npc']);
        
        return entity;
    }
}

export class TravelingMerchant {
    static create(entityManager, position) {
        const config = {
            position,
            name: 'Traveling Merchant',
            color: 0xcd853f,
            faction: 'merchants',
            health: 100,
            moveSpeed: 600,
            movePattern: 'wander',
            pauseChance: 0.3,
            fleeHealth: 0.4,
            dialogues: [
                "Rare items from distant lands!",
                "You won't find these anywhere else!",
                "Limited time offers!",
                "I'll be moving on soon..."
            ],
            shopInventory: [
                { itemId: 'rare_protein', stock: 5, price: 150 },
                { itemId: 'champion_gloves', stock: 1, price: 1000 },
                { itemId: 'pet_treat', stock: 10, price: 30 },
                { itemId: 'mini_dragon_egg', stock: 1, price: 5000 }
            ]
        };

        const components = NeutralMob.getBaseComponents(config);
        // Traveling merchant has special schedule
        components.scheduleData = {
            appearTime: 8, // 8 AM
            disappearTime: 18, // 6 PM
            daysPresent: [1, 3, 5] // Monday, Wednesday, Friday
        };
        
        const entity = entityManager.createEntity(components, ['neutral', 'merchant', 'traveling', 'npc']);
        
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
            fleeHealth: 0.1, // Very brave
            dialogues: [
                "Keep the peace, citizen.",
                "No trouble in my town.",
                "Move along.",
                "Report any bandits to me immediately."
            ]
        };

        const components = NeutralMob.getBaseComponents(config);
        // Guards have combat stats
        components.power = { value: 3 };
        components.guardAI = {
            patrolRoute: position, // Starting position is center of patrol
            patrolRadius: 5,
            pursuitRadius: 10,
            protectedFaction: 'merchants'
        };
        
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
            faction: 'merchants', // Allied with merchants faction
            health: 50,
            moveSpeed: 600,
            movePattern: 'wander',
            pauseChance: 0.8,
            fleeHealth: 0.6,
            dialogues: dialogues
        };

        const components = NeutralMob.getBaseComponents(config);
        const entity = entityManager.createEntity(components, ['neutral', 'villager', 'npc']);
        
        return entity;
    }
}

// Quest NPCs
export class QuestGiver {
    static create(entityManager, position, questData) {
        const config = {
            position,
            name: questData?.name || 'Quest Giver',
            color: 0xff69b4,
            faction: 'merchants',
            health: 100,
            moveSpeed: 500,
            movePattern: 'stationary',
            pauseChance: 1.0,
            fleeHealth: 0.3,
            dialogues: questData?.dialogues || [
                "I have a task for you, if you're interested.",
                "Help me and I'll make it worth your while.",
                "Come back when you've completed the task.",
                "Thank you for your help!"
            ]
        };

        const components = NeutralMob.getBaseComponents(config);
        components.questData = questData || {
            questId: 'default_quest',
            requirements: [],
            rewards: []
        };
        
        const entity = entityManager.createEntity(components, ['neutral', 'quest_giver', 'npc']);
        
        return entity;
    }
}

// Special neutral entities
export class WanderingPet {
    static create(entityManager, position) {
        const petTypes = [
            { name: 'Lost Puppy', color: 0x8b4513, petType: 'puppy' },
            { name: 'Stray Kitten', color: 0x696969, petType: 'kitten' },
            { name: 'Wild Chick', color: 0xffff00, petType: 'chick' }
        ];
        
        const chosen = petTypes[Math.floor(Math.random() * petTypes.length)];
        
        const config = {
            position,
            name: chosen.name,
            color: chosen.color,
            faction: 'wildlife',
            health: 30,
            moveSpeed: 300,
            movePattern: 'wander',
            pauseChance: 0.5,
            fleeHealth: 0.6,
            tameable: true,
            petType: chosen.petType,
            tamingDifficulty: 0.9 // Easy to tame
        };

        const components = NeutralMob.getBaseComponents(config);
        const entity = entityManager.createEntity(components, ['neutral', 'wildlife', 'tameable', 'wandering_pet']);
        
        return entity;
    }
}

// Faction leaders
export class MerchantGuildLeader {
    static create(entityManager, position) {
        const config = {
            position,
            name: 'Guild Master',
            color: 0xffd700,
            faction: 'merchants',
            health: 200,
            moveSpeed: 500,
            movePattern: 'stationary',
            pauseChance: 1.0,
            fleeHealth: 0.2,
            dialogues: [
                "Welcome to the Merchant's Guild!",
                "Our reputation system rewards loyal customers.",
                "Harm one merchant, and we all remember.",
                "Trade flourishes under our protection."
            ],
            shopInventory: [
                { itemId: 'guild_membership', stock: 1, price: 1000 },
                { itemId: 'merchant_license', stock: 5, price: 500 },
                { itemId: 'rare_trade_goods', stock: 10, price: 200 }
            ]
        };

        const components = NeutralMob.getBaseComponents(config);
        components.factionLeader = {
            faction: 'merchants',
            influenceRadius: 20,
            canChangeRelations: true
        };
        
        const entity = entityManager.createEntity(components, ['neutral', 'merchant', 'faction_leader', 'npc']);
        
        return entity;
    }
}

// Export all neutral types
export const NeutralTypes = {
    // Wildlife
    Rabbit,
    Deer,
    Wolf,
    
    // Merchants
    Merchant,
    TravelingMerchant,
    
    // Guards
    TownGuard,
    
    // Villagers
    Villager,
    
    // Special
    QuestGiver,
    WanderingPet,
    MerchantGuildLeader
};

// Neutral factory
export class NeutralFactory {
    static create(entityManager, type, position, extraData) {
        const NeutralClass = NeutralTypes[type];
        if (!NeutralClass) {
            console.error(`Unknown neutral type: ${type}`);
            return null;
        }
        
        if (type === 'QuestGiver' && extraData) {
            return NeutralClass.create(entityManager, position, extraData);
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

export default NeutralMob;