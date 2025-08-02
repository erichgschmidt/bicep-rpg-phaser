/**
 * InventorySystem - Manages items, equipment, and storage
 * Branch-level system that handles all inventory-related operations
 */
export default class InventorySystem {
    constructor(eventBus, entityManager) {
        this.eventBus = eventBus;
        this.entityManager = entityManager;
        
        // Inventory configuration
        this.config = {
            defaultInventorySize: 20,
            defaultEquipmentSlots: {
                gloves: null,      // Main bicep equipment
                wristband: null,   // Support equipment
                protein: null,     // Consumable slot
                trophy: null       // Special item slot
            },
            stackableTypes: ['consumable', 'material'],
            maxStackSize: 99
        };
        
        // Item definitions would normally come from data files
        this.itemDefinitions = new Map();
        
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Inventory operations
        this.eventBus.on('inventory:add-item', this.addItem.bind(this));
        this.eventBus.on('inventory:remove-item', this.removeItem.bind(this));
        this.eventBus.on('inventory:use-item', this.useItem.bind(this));
        this.eventBus.on('inventory:equip-item', this.equipItem.bind(this));
        this.eventBus.on('inventory:unequip-item', this.unequipItem.bind(this));
        
        // Entity events
        this.eventBus.on('entity:created', this.initializeInventory.bind(this));
        
        // Loot events
        this.eventBus.on('combat:victory', this.handleCombatLoot.bind(this));
    }

    /**
     * Initialize inventory for a new entity
     * @param {Object} data - { entity }
     */
    initializeInventory(data) {
        const { entity } = data;
        
        // Only initialize for entities that should have inventory
        if (!entity.hasTag('player') && !entity.hasTag('merchant')) return;
        
        // Add inventory component if not present
        if (!entity.hasComponent('inventory')) {
            entity.addComponent('inventory', {
                items: [],
                maxSize: this.config.defaultInventorySize,
                equipment: { ...this.config.defaultEquipmentSlots }
            });
        }
    }

    /**
     * Add item to entity's inventory
     * @param {Object} data - { entityId, itemId, quantity }
     */
    addItem(data) {
        const { entityId, itemId, quantity = 1 } = data;
        const entity = this.entityManager.getEntity(entityId);
        
        if (!entity || !entity.hasComponent('inventory')) return;
        
        const inventory = entity.getComponent('inventory');
        const itemDef = this.itemDefinitions.get(itemId);
        
        if (!itemDef) {
            this.eventBus.emit('inventory:error', {
                entityId,
                error: `Unknown item: ${itemId}`
            });
            return;
        }
        
        // Check if item is stackable
        if (this.config.stackableTypes.includes(itemDef.type)) {
            // Find existing stack
            const existingStack = inventory.items.find(item => item.itemId === itemId);
            
            if (existingStack) {
                const spaceInStack = this.config.maxStackSize - existingStack.quantity;
                const toAdd = Math.min(quantity, spaceInStack);
                existingStack.quantity += toAdd;
                
                if (toAdd < quantity) {
                    // Need to create new stack for remainder
                    this.addItem({ entityId, itemId, quantity: quantity - toAdd });
                }
                
                this.eventBus.emit('inventory:item-added', {
                    entityId,
                    itemId,
                    quantity: toAdd,
                    totalQuantity: existingStack.quantity
                });
                return;
            }
        }
        
        // Check inventory space
        if (inventory.items.length >= inventory.maxSize) {
            this.eventBus.emit('inventory:error', {
                entityId,
                error: 'Inventory full'
            });
            return;
        }
        
        // Add new item
        inventory.items.push({
            itemId,
            quantity,
            equipped: false
        });
        
        this.eventBus.emit('inventory:item-added', {
            entityId,
            itemId,
            quantity,
            totalQuantity: quantity
        });
    }

    /**
     * Remove item from inventory
     * @param {Object} data - { entityId, itemId, quantity }
     */
    removeItem(data) {
        const { entityId, itemId, quantity = 1 } = data;
        const entity = this.entityManager.getEntity(entityId);
        
        if (!entity || !entity.hasComponent('inventory')) return;
        
        const inventory = entity.getComponent('inventory');
        const itemIndex = inventory.items.findIndex(item => item.itemId === itemId);
        
        if (itemIndex === -1) {
            this.eventBus.emit('inventory:error', {
                entityId,
                error: 'Item not found'
            });
            return;
        }
        
        const item = inventory.items[itemIndex];
        
        if (item.quantity > quantity) {
            item.quantity -= quantity;
        } else {
            // Remove the entire stack
            inventory.items.splice(itemIndex, 1);
        }
        
        this.eventBus.emit('inventory:item-removed', {
            entityId,
            itemId,
            quantity,
            remaining: item.quantity > quantity ? item.quantity - quantity : 0
        });
    }

    /**
     * Use an item
     * @param {Object} data - { entityId, itemId }
     */
    useItem(data) {
        const { entityId, itemId } = data;
        const entity = this.entityManager.getEntity(entityId);
        
        if (!entity || !entity.hasComponent('inventory')) return;
        
        const itemDef = this.itemDefinitions.get(itemId);
        if (!itemDef || !itemDef.usable) {
            this.eventBus.emit('inventory:error', {
                entityId,
                error: 'Item cannot be used'
            });
            return;
        }
        
        // Execute item effect
        if (itemDef.effect) {
            this.eventBus.emit(`item:effect:${itemDef.effect}`, {
                entityId,
                itemId,
                value: itemDef.effectValue
            });
        }
        
        // Consume item if consumable
        if (itemDef.consumable) {
            this.removeItem({ entityId, itemId, quantity: 1 });
        }
        
        this.eventBus.emit('inventory:item-used', {
            entityId,
            itemId
        });
    }

    /**
     * Equip an item
     * @param {Object} data - { entityId, itemId, slot }
     */
    equipItem(data) {
        const { entityId, itemId, slot } = data;
        const entity = this.entityManager.getEntity(entityId);
        
        if (!entity || !entity.hasComponent('inventory')) return;
        
        const inventory = entity.getComponent('inventory');
        const itemDef = this.itemDefinitions.get(itemId);
        
        if (!itemDef || !itemDef.equipable) {
            this.eventBus.emit('inventory:error', {
                entityId,
                error: 'Item cannot be equipped'
            });
            return;
        }
        
        // Check if slot is valid for item
        if (itemDef.slot !== slot) {
            this.eventBus.emit('inventory:error', {
                entityId,
                error: `Item cannot be equipped in ${slot} slot`
            });
            return;
        }
        
        // Unequip current item in slot if any
        if (inventory.equipment[slot]) {
            this.unequipItem({ entityId, slot });
        }
        
        // Find item in inventory
        const item = inventory.items.find(i => i.itemId === itemId);
        if (!item) {
            this.eventBus.emit('inventory:error', {
                entityId,
                error: 'Item not in inventory'
            });
            return;
        }
        
        // Equip item
        inventory.equipment[slot] = itemId;
        item.equipped = true;
        
        // Apply equipment stats
        this.applyEquipmentStats(entity);
        
        this.eventBus.emit('inventory:item-equipped', {
            entityId,
            itemId,
            slot
        });
    }

    /**
     * Unequip an item
     * @param {Object} data - { entityId, slot }
     */
    unequipItem(data) {
        const { entityId, slot } = data;
        const entity = this.entityManager.getEntity(entityId);
        
        if (!entity || !entity.hasComponent('inventory')) return;
        
        const inventory = entity.getComponent('inventory');
        const itemId = inventory.equipment[slot];
        
        if (!itemId) return;
        
        // Find item in inventory
        const item = inventory.items.find(i => i.itemId === itemId);
        if (item) {
            item.equipped = false;
        }
        
        inventory.equipment[slot] = null;
        
        // Recalculate equipment stats
        this.applyEquipmentStats(entity);
        
        this.eventBus.emit('inventory:item-unequipped', {
            entityId,
            itemId,
            slot
        });
    }

    /**
     * Apply equipment stat bonuses
     * @param {Entity} entity 
     */
    applyEquipmentStats(entity) {
        const inventory = entity.getComponent('inventory');
        if (!inventory) return;
        
        // Reset equipment bonuses
        if (!entity.hasComponent('equipmentBonuses')) {
            entity.addComponent('equipmentBonuses', {});
        }
        
        const bonuses = entity.getComponent('equipmentBonuses');
        
        // Clear previous bonuses
        Object.keys(bonuses).forEach(key => delete bonuses[key]);
        
        // Apply bonuses from each equipped item
        Object.entries(inventory.equipment).forEach(([slot, itemId]) => {
            if (!itemId) return;
            
            const itemDef = this.itemDefinitions.get(itemId);
            if (!itemDef || !itemDef.stats) return;
            
            Object.entries(itemDef.stats).forEach(([stat, value]) => {
                bonuses[stat] = (bonuses[stat] || 0) + value;
            });
        });
        
        this.eventBus.emit('inventory:equipment-changed', {
            entityId: entity.id,
            bonuses
        });
    }

    /**
     * Handle combat loot
     * @param {Object} data 
     */
    handleCombatLoot(data) {
        const { winnerId, loserId } = data;
        const loser = this.entityManager.getEntity(loserId);
        
        if (!loser) return;
        
        // Generate loot based on enemy type
        const lootTable = this.getLootTable(loser);
        const loot = this.generateLoot(lootTable);
        
        // Add loot to winner's inventory
        loot.forEach(({ itemId, quantity }) => {
            this.addItem({ entityId: winnerId, itemId, quantity });
        });
        
        this.eventBus.emit('loot:generated', {
            winnerId,
            loserId,
            loot
        });
    }

    /**
     * Get loot table for an entity
     * @param {Entity} entity 
     * @returns {Array}
     */
    getLootTable(entity) {
        // This would normally be data-driven
        const enemyType = entity.getComponent('enemyType');
        if (!enemyType) return [];
        
        // Example loot tables
        const lootTables = {
            'Pebble': [
                { itemId: 'small_protein', chance: 0.3, min: 1, max: 2 },
                { itemId: 'worn_gloves', chance: 0.05, min: 1, max: 1 }
            ],
            'Rock': [
                { itemId: 'protein_shake', chance: 0.5, min: 1, max: 3 },
                { itemId: 'training_gloves', chance: 0.1, min: 1, max: 1 }
            ]
        };
        
        return lootTables[enemyType.name] || [];
    }

    /**
     * Generate loot from loot table
     * @param {Array} lootTable 
     * @returns {Array}
     */
    generateLoot(lootTable) {
        const loot = [];
        
        lootTable.forEach(entry => {
            if (Math.random() < entry.chance) {
                const quantity = Math.floor(Math.random() * (entry.max - entry.min + 1)) + entry.min;
                loot.push({ itemId: entry.itemId, quantity });
            }
        });
        
        return loot;
    }

    /**
     * Get inventory info for an entity
     * @param {string} entityId 
     * @returns {Object|null}
     */
    getInventoryInfo(entityId) {
        const entity = this.entityManager.getEntity(entityId);
        if (!entity || !entity.hasComponent('inventory')) return null;
        
        const inventory = entity.getComponent('inventory');
        return {
            items: [...inventory.items],
            equipment: { ...inventory.equipment },
            usedSlots: inventory.items.length,
            maxSlots: inventory.maxSize
        };
    }

    /**
     * Clean up
     */
    destroy() {
        // Nothing specific to clean up
    }
}