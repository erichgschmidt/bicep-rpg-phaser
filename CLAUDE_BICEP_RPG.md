# CLAUDE_BICEP_RPG.md - Bicep RPG Game Development Context

## Project Overview
A Phaser 3-based arm wrestling RPG with modular architecture following trunk/branch/leaf dependency hierarchy. The game features grid-based movement, arm wrestling combat, progression systems, and infinite world exploration.

## Core Development Principles

### 1. TRUNK/BRANCH/LEAF HIERARCHY (ABSOLUTE PRIORITY)
**This is the #1 priority for all development. Every decision must respect this hierarchy.**

- **TRUNK (Core Engine)**: Foundation systems that everything depends on. NO dependencies on branches or leaves.
- **BRANCHES (Major Systems)**: Depend ONLY on trunk. Provide services to leaves. NO dependencies on other branches or leaves.
- **LEAVES (Features/UI)**: Depend on trunk and branches. Implement specific gameplay. Can depend on multiple branches.

**NEVER VIOLATE THIS HIERARCHY. If a feature requires branch-to-branch communication, use EventBus.**

## Architecture Philosophy

### Trunk/Branch/Leaf Hierarchy
```
TRUNK (Core Engine) - Foundation that everything depends on
├── EventBus - Central communication system
├── Entity - Component-based game objects
├── GameStateManager - State machine for game flow
├── InputController - Centralized input handling
└── ResourceManager - Asset loading and save/load

BRANCHES (Major Systems) - Depend on trunk, provide services to leaves
├── EntityManager - Entity lifecycle and queries
├── CombatSystem - Arm wrestling mechanics
├── ProgressionSystem - XP, levels, talents
├── InventorySystem - Items and equipment
└── ZoneManager - Safe zones, biomes, environments

LEAVES (Features) - Depend on branches, implement specific gameplay
├── Player - Player entity class
├── Enemies - Enemy entity classes
├── UI Components - HUD, menus, dialogs
└── Game Scenes - Actual gameplay implementation
```

### Additional Development Principles
2. **Event-Driven Communication**: Systems communicate via EventBus, not direct references
3. **Component-Based Entities**: Entities are just IDs with components, systems provide behavior
4. **Clean Resource Management**: Every system has proper cleanup in destroy()
5. **No Circular Dependencies**: Use WeakRef or event-based communication when needed
6. **System Isolation**: Each system must function independently with only its declared dependencies

## System Implementations

### EventBus (Trunk)
Central nervous system of the game. All inter-system communication flows through here.
```javascript
// Key events:
'entity:created', 'entity:destroyed', 'entity:moved'
'combat:started', 'combat:victory', 'combat:defeat'  
'zone:entered', 'zone:exited'
'player:died', 'player:respawn'
'inventory:item-added', 'inventory:item-used'
'progression:level-up', 'progression:talent-learned'
```

### Entity System (Trunk)
Component-based architecture for maximum flexibility:
```javascript
// Example entity structure:
{
  id: 'player-001',
  components: {
    position: { x: 0, y: 0 },
    health: { current: 100, max: 100 },
    power: { value: 1 },
    inventory: { items: [], equipment: {} },
    progression: { level: 1, xp: 0 }
  },
  tags: ['player', 'controllable']
}
```

### CombatSystem (Branch)
Manages arm wrestling combat with tug-of-war mechanics:
- Click/tap rapidly to gain advantage
- DPS calculation based on power stats
- Tug position determines victory/defeat
- Enemy AI with configurable click rates

### ProgressionSystem (Branch)
Handles character growth:
- XP rewards from combat victories
- Level-based stat increases
- Talent trees (Strength, Defense)
- Stat point allocation (Strength, Vitality, Agility)

### InventorySystem (Branch)
Item and equipment management:
- Grid-based inventory with size limits
- Equipment slots (gloves, wristband, protein, trophy)
- Stackable consumables
- Item effects and stat bonuses

### ZoneManager (Branch)
Environmental and safe zone management:
- **Bonfire Safe Zones**: No enemy spawns, healing effect, respawn point
- **Biomes**: Different enemy spawn rates and weather
- **Zone Effects**: Healing, damage, buffs/debuffs
- **Weather System**: Affects visibility and combat

## Planned Major Features

### Day/Night Cycle (TimeSystem)
- 24-hour game time cycle (accelerated)
- Dynamic lighting changes
- Time-based events (shops close, different enemies spawn)
- Rest mechanics tied to time of day

### Party System
- Recruit AI companions
- Party members can fight alongside you
- Formation management
- Party member AI behaviors (aggressive, defensive, support)
- Shared inventory and equipment

### Pet System  
- Tame and own pets
- Pets provide combat bonuses
- Pet evolution/growth system
- Pet special abilities
- Pet happiness/loyalty mechanics

### Relationship System
- Faction standings (friendly/neutral/hostile)
- Neutral mobs that can become hostile based on actions
- Reputation affects merchant prices and quest availability
- Party members and pets can aggro neutral mobs

## Current Game Features

### Movement System
- Grid-based movement with smooth animations
- Individual enemy behaviors (erratic, patrol, lazy, aggressive)
- Organic movement timing (no synchronized "clock" movement)
- Camera follows player with smooth lerping

### Infinite World
- Chunk-based world generation (16x16 tiles per chunk)
- Deterministic enemy spawning using seeded random
- Memory-efficient chunk loading/unloading
- Seamless exploration in all directions

### Enemy Types
1. **Pebble**: Fast, weak, erratic movement
2. **Stick**: Normal speed, patrols back and forth  
3. **Rock**: Slow, lazy, rarely moves
4. **Angry Squirrel**: Very fast, aggressive, chases player

### Safe Zone Implementation (Planned)
Using the ZoneManager system:
```javascript
// Bonfire zone at origin
{
  id: 'bonfire_main',
  type: 'bonfire',
  position: { x: 0, y: 0 },
  radius: 5,
  properties: {
    safe: true,
    noEnemySpawn: true,
    healing: true,
    respawnPoint: true
  }
}
```

## Development Workflow

### Adding New Features
1. **Identify the layer**: Is it trunk, branch, or leaf?
2. **Check dependencies**: What systems does it need?
3. **Use EventBus**: Don't create direct system references
4. **Implement cleanup**: Add proper destroy() methods
5. **Test isolation**: Feature should work with minimal dependencies

### Example: Adding a New Enemy Type
```javascript
// 1. Define in enemy configuration (leaf level)
const enemyTypes = {
  'Dumbbell': {
    name: 'Dumbbell',
    color: 0x4169e1,
    power: 5,
    moveSpeed: 500,
    movePattern: 'charge',
    pauseChance: 0.2
  }
};

// 2. Enemy spawns via EntityManager (branch)
const enemy = entityManager.createEntity({
  position: { x: 10, y: 10 },
  health: { current: 250, max: 250 },
  power: { value: 5 },
  enemyType: { name: 'Dumbbell' }
}, ['enemy', 'hostile']);

// 3. Combat handled by CombatSystem (branch)
// Movement handled by GameScene (leaf)
// No new trunk/branch code needed!
```

## Performance Considerations

### Memory Management
- Chunk-based world loading
- Entity pooling for enemies
- Proper cleanup in destroy() methods
- WeakRef for circular dependencies

### Optimization Patterns
```javascript
// Event batching
this.eventBus.queueEvents(() => {
  // Multiple events processed together
});

// Component queries
const combatants = entityManager.getEntitiesWithComponents(['health', 'power', 'inCombat']);

// Spatial indexing for position queries
const nearbyEnemies = entityManager.getEntitiesInRadius(player.position, 10);
```

## Testing Strategy

### Unit Tests
- Test each system in isolation
- Mock EventBus for system tests
- Verify component updates
- Check memory cleanup

### Integration Tests  
- Test system interactions via events
- Verify game state transitions
- Check save/load functionality
- Test combat flow

### Performance Tests
- Entity count stress tests
- Memory leak detection
- Frame rate monitoring
- Event throughput

## Current Status

### Completed
- ✅ Core architecture (Trunk systems)
- ✅ Major systems (EntityManager, CombatSystem, ProgressionSystem, InventorySystem, ZoneManager)
- ✅ Basic game scene with infinite world
- ✅ Player movement and camera
- ✅ Enemy spawning and behaviors
- ✅ Combat UI and mechanics
- ✅ Organic movement patterns

### In Progress
- 🔄 Bonfire safe zone implementation
- 🔄 Entity class refactoring
- 🔄 Full architectural integration

### Planned
- 📅 Save/load system
- 📅 Talent tree UI
- 📅 Inventory UI
- 📅 Multiple biomes
- 📅 Boss enemies
- 📅 Multiplayer support

## Development Commands

```bash
# Start development server
npm run dev

# Build for production  
npm run build

# Run tests
npm test

# Git workflow
git add -A
git commit -m "Description of changes"
git push origin master
```

## Code Quality Standards

1. **No direct system coupling** - Use EventBus
2. **Component data only** - No logic in components
3. **Systems process components** - Business logic in systems
4. **Proper cleanup** - Every creation needs destruction
5. **Event namespacing** - Prefix events by system
6. **Consistent patterns** - Follow existing architecture

Remember: The architecture is designed for **scalability**. When in doubt, follow the trunk/branch/leaf hierarchy and use events for communication.