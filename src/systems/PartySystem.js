/**
 * PartySystem - Manages party members, AI companions, and group mechanics
 * Branch-level system for party management
 * 
 * Dependencies: EventBus, EntityManager (trunk only)
 */
export default class PartySystem {
    constructor(eventBus, entityManager) {
        this.eventBus = eventBus;
        this.entityManager = entityManager;
        
        // Party configuration
        this.config = {
            maxPartySize: 4,
            formationSpacing: 1.5, // Grid units
            sharedXPPercent: 0.5, // 50% of XP shared among party
            reviveHealthPercent: 0.3, // Revive with 30% health
            followDistance: {
                min: 2,
                max: 5,
                catch_up: 8
            }
        };
        
        // Party state
        this.parties = new Map(); // partyId -> party data
        this.entityParties = new Map(); // entityId -> partyId
        
        // Formation patterns
        this.formations = {
            line: {
                name: 'Line',
                positions: [
                    { x: 0, y: 0 },    // Leader
                    { x: -1, y: 0 },   // Left
                    { x: 1, y: 0 },    // Right
                    { x: 0, y: -1 }    // Behind
                ]
            },
            diamond: {
                name: 'Diamond',
                positions: [
                    { x: 0, y: 0 },    // Leader
                    { x: -1, y: -1 },  // Left back
                    { x: 1, y: -1 },   // Right back
                    { x: 0, y: -2 }    // Far back
                ]
            },
            square: {
                name: 'Square',
                positions: [
                    { x: 0, y: 0 },    // Leader
                    { x: 1, y: 0 },    // Right
                    { x: 0, y: 1 },    // Behind
                    { x: 1, y: 1 }     // Behind right
                ]
            },
            protect: {
                name: 'Protect',
                positions: [
                    { x: 0, y: 0 },    // Protected (center)
                    { x: 0, y: -1 },   // Front guard
                    { x: -1, y: 0 },   // Left guard
                    { x: 1, y: 0 }     // Right guard
                ]
            }
        };
        
        // AI behavior modes for party members
        this.behaviorModes = {
            aggressive: {
                name: 'Aggressive',
                aggroRange: 8,
                pursuitRange: 12,
                helpRange: 10,
                fleeThreshold: 0.1 // Flee at 10% health
            },
            defensive: {
                name: 'Defensive',
                aggroRange: 4,
                pursuitRange: 6,
                helpRange: 15,
                fleeThreshold: 0.3 // Flee at 30% health
            },
            passive: {
                name: 'Passive',
                aggroRange: 2,
                pursuitRange: 3,
                helpRange: 5,
                fleeThreshold: 0.5 // Flee at 50% health
            },
            support: {
                name: 'Support',
                aggroRange: 0, // Don't initiate combat
                pursuitRange: 0,
                helpRange: 20, // Large help range
                fleeThreshold: 0.4
            }
        };
        
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Party management
        this.eventBus.on('party:create', this.createParty.bind(this));
        this.eventBus.on('party:join', this.joinParty.bind(this));
        this.eventBus.on('party:leave', this.leaveParty.bind(this));
        this.eventBus.on('party:disband', this.disbandParty.bind(this));
        
        // Party commands
        this.eventBus.on('party:set-formation', this.setFormation.bind(this));
        this.eventBus.on('party:set-behavior', this.setBehavior.bind(this));
        this.eventBus.on('party:command', this.issueCommand.bind(this));
        
        // Combat events
        this.eventBus.on('combat:started', this.handleCombatStarted.bind(this));
        this.eventBus.on('entity:died', this.handleMemberDeath.bind(this));
        this.eventBus.on('entity:attacked', this.handleMemberAttacked.bind(this));
        
        // Movement events
        this.eventBus.on('entity:moved', this.handleLeaderMovement.bind(this));
        
        // XP events
        this.eventBus.on('progression:xp-gained', this.handleXPGained.bind(this));
    }

    /**
     * Create a new party
     * @param {Object} data - { leaderId, partyName }
     */
    createParty(data) {
        const { leaderId, partyName = 'Party' } = data;
        
        const leader = this.entityManager.getEntity(leaderId);
        if (!leader) return;
        
        const partyId = `party_${Date.now()}`;
        
        const party = {
            id: partyId,
            name: partyName,
            leaderId: leaderId,
            members: [leaderId],
            formation: 'line',
            behaviorMode: 'defensive',
            sharedInventory: [],
            partyBuffs: [],
            created: Date.now()
        };
        
        this.parties.set(partyId, party);
        this.entityParties.set(leaderId, partyId);
        
        // Add party component to leader
        leader.addComponent('partyRole', {
            partyId: partyId,
            role: 'leader',
            position: 0
        });
        
        this.eventBus.emit('party:created', {
            partyId,
            party
        });
    }

    /**
     * Join an existing party
     * @param {Object} data - { entityId, partyId }
     */
    joinParty(data) {
        const { entityId, partyId } = data;
        
        const party = this.parties.get(partyId);
        const entity = this.entityManager.getEntity(entityId);
        
        if (!party || !entity) return;
        
        // Check party size
        if (party.members.length >= this.config.maxPartySize) {
            this.eventBus.emit('party:error', {
                entityId,
                error: 'Party is full'
            });
            return;
        }
        
        // Check if already in a party
        if (this.entityParties.has(entityId)) {
            this.eventBus.emit('party:error', {
                entityId,
                error: 'Already in a party'
            });
            return;
        }
        
        // Add to party
        party.members.push(entityId);
        this.entityParties.set(entityId, partyId);
        
        // Add party component
        entity.addComponent('partyRole', {
            partyId: partyId,
            role: 'member',
            position: party.members.length - 1,
            behavior: this.behaviorModes[party.behaviorMode]
        });
        
        // Initialize AI for party member
        if (!entity.hasTag('player')) {
            this.initializePartyAI(entity, party);
        }
        
        this.eventBus.emit('party:member-joined', {
            partyId,
            entityId,
            party
        });
    }

    /**
     * Leave party
     * @param {Object} data - { entityId }
     */
    leaveParty(data) {
        const { entityId } = data;
        
        const partyId = this.entityParties.get(entityId);
        if (!partyId) return;
        
        const party = this.parties.get(partyId);
        if (!party) return;
        
        // Remove from party
        const index = party.members.indexOf(entityId);
        if (index > -1) {
            party.members.splice(index, 1);
        }
        
        this.entityParties.delete(entityId);
        
        // Remove party component
        const entity = this.entityManager.getEntity(entityId);
        if (entity) {
            entity.removeComponent('partyRole');
            entity.removeComponent('partyAI');
        }
        
        // Check if party should disband
        if (party.members.length === 0) {
            this.disbandParty({ partyId });
        } else if (entityId === party.leaderId) {
            // Assign new leader
            party.leaderId = party.members[0];
            const newLeader = this.entityManager.getEntity(party.leaderId);
            if (newLeader) {
                const role = newLeader.getComponent('partyRole');
                if (role) role.role = 'leader';
            }
        }
        
        this.eventBus.emit('party:member-left', {
            partyId,
            entityId,
            party
        });
    }

    /**
     * Disband party
     * @param {Object} data - { partyId }
     */
    disbandParty(data) {
        const { partyId } = data;
        
        const party = this.parties.get(partyId);
        if (!party) return;
        
        // Remove all members
        party.members.forEach(memberId => {
            this.entityParties.delete(memberId);
            const entity = this.entityManager.getEntity(memberId);
            if (entity) {
                entity.removeComponent('partyRole');
                entity.removeComponent('partyAI');
            }
        });
        
        this.parties.delete(partyId);
        
        this.eventBus.emit('party:disbanded', {
            partyId,
            party
        });
    }

    /**
     * Set party formation
     * @param {Object} data - { partyId, formation }
     */
    setFormation(data) {
        const { partyId, formation } = data;
        
        const party = this.parties.get(partyId);
        if (!party || !this.formations[formation]) return;
        
        party.formation = formation;
        
        // Update member positions
        this.updateFormation(party);
        
        this.eventBus.emit('party:formation-changed', {
            partyId,
            formation,
            party
        });
    }

    /**
     * Set party behavior mode
     * @param {Object} data - { partyId, behaviorMode }
     */
    setBehavior(data) {
        const { partyId, behaviorMode } = data;
        
        const party = this.parties.get(partyId);
        if (!party || !this.behaviorModes[behaviorMode]) return;
        
        party.behaviorMode = behaviorMode;
        const behavior = this.behaviorModes[behaviorMode];
        
        // Update all member behaviors
        party.members.forEach(memberId => {
            const entity = this.entityManager.getEntity(memberId);
            if (entity) {
                const role = entity.getComponent('partyRole');
                if (role) {
                    role.behavior = behavior;
                }
            }
        });
        
        this.eventBus.emit('party:behavior-changed', {
            partyId,
            behaviorMode,
            party
        });
    }

    /**
     * Issue command to party
     * @param {Object} data - { partyId, command, target }
     */
    issueCommand(data) {
        const { partyId, command, target } = data;
        
        const party = this.parties.get(partyId);
        if (!party) return;
        
        switch (command) {
            case 'attack':
                this.commandAttack(party, target);
                break;
            case 'move':
                this.commandMove(party, target);
                break;
            case 'defend':
                this.commandDefend(party, target);
                break;
            case 'follow':
                this.commandFollow(party);
                break;
            case 'stay':
                this.commandStay(party);
                break;
        }
        
        this.eventBus.emit('party:command-issued', {
            partyId,
            command,
            target
        });
    }

    /**
     * Initialize AI for party member
     * @param {Entity} entity 
     * @param {Object} party 
     */
    initializePartyAI(entity, party) {
        entity.addComponent('partyAI', {
            state: 'following',
            target: null,
            lastLeaderPosition: null,
            stayPosition: null,
            commandTimeout: 0
        });
    }

    /**
     * Update party formation positions
     * @param {Object} party 
     */
    updateFormation(party) {
        const formation = this.formations[party.formation];
        const leader = this.entityManager.getEntity(party.leaderId);
        
        if (!leader) return;
        
        const leaderPos = leader.getComponent('position');
        if (!leaderPos) return;
        
        party.members.forEach((memberId, index) => {
            if (memberId === party.leaderId) return;
            
            const member = this.entityManager.getEntity(memberId);
            if (!member) return;
            
            const role = member.getComponent('partyRole');
            if (!role) return;
            
            // Calculate target position based on formation
            const formPos = formation.positions[Math.min(index, formation.positions.length - 1)];
            role.targetPosition = {
                x: leaderPos.x + formPos.x,
                y: leaderPos.y + formPos.y
            };
        });
    }

    /**
     * Handle leader movement
     * @param {Object} data - { entityId, oldPosition, newPosition }
     */
    handleLeaderMovement(data) {
        const { entityId } = data;
        
        const partyId = this.entityParties.get(entityId);
        if (!partyId) return;
        
        const party = this.parties.get(partyId);
        if (!party || party.leaderId !== entityId) return;
        
        // Update formation positions
        this.updateFormation(party);
        
        // Trigger follower movement
        this.updateFollowerMovement(party);
    }

    /**
     * Update follower movement AI
     * @param {Object} party 
     */
    updateFollowerMovement(party) {
        const leader = this.entityManager.getEntity(party.leaderId);
        if (!leader) return;
        
        const leaderPos = leader.getComponent('position');
        if (!leaderPos) return;
        
        party.members.forEach(memberId => {
            if (memberId === party.leaderId) return;
            
            const member = this.entityManager.getEntity(memberId);
            if (!member) return;
            
            const ai = member.getComponent('partyAI');
            const role = member.getComponent('partyRole');
            if (!ai || !role) return;
            
            // Update based on AI state
            if (ai.state === 'following' && role.targetPosition) {
                const memberPos = member.getComponent('position');
                if (!memberPos) return;
                
                const distance = Math.abs(memberPos.x - role.targetPosition.x) + 
                               Math.abs(memberPos.y - role.targetPosition.y);
                
                // Move if too far from target position
                if (distance > 1) {
                    this.eventBus.emit('entity:request-move', {
                        entityId: memberId,
                        targetPosition: role.targetPosition,
                        isPartyMovement: true
                    });
                }
            }
        });
    }

    /**
     * Handle combat started
     * @param {Object} data - { attackerId, defenderId }
     */
    handleCombatStarted(data) {
        const { attackerId, defenderId } = data;
        
        // Check if any party member is involved
        const attackerParty = this.entityParties.get(attackerId);
        const defenderParty = this.entityParties.get(defenderId);
        
        if (attackerParty) {
            this.handlePartyMemberCombat(attackerParty, defenderId, 'attacking');
        }
        
        if (defenderParty) {
            this.handlePartyMemberCombat(defenderParty, attackerId, 'defending');
        }
    }

    /**
     * Handle party member entering combat
     * @param {string} partyId 
     * @param {string} enemyId 
     * @param {string} role 
     */
    handlePartyMemberCombat(partyId, enemyId, role) {
        const party = this.parties.get(partyId);
        if (!party) return;
        
        // Alert other party members based on behavior
        party.members.forEach(memberId => {
            const member = this.entityManager.getEntity(memberId);
            if (!member) return;
            
            const partyRole = member.getComponent('partyRole');
            const ai = member.getComponent('partyAI');
            if (!partyRole || !ai) return;
            
            const behavior = partyRole.behavior || this.behaviorModes[party.behaviorMode];
            
            // Check if should help
            const memberPos = member.getComponent('position');
            const enemyEntity = this.entityManager.getEntity(enemyId);
            const enemyPos = enemyEntity?.getComponent('position');
            
            if (memberPos && enemyPos) {
                const distance = Math.abs(memberPos.x - enemyPos.x) + 
                               Math.abs(memberPos.y - enemyPos.y);
                
                if (distance <= behavior.helpRange && ai.state !== 'commanded') {
                    // Switch to combat mode
                    ai.state = 'combat';
                    ai.target = enemyId;
                    
                    this.eventBus.emit('party:member-assisting', {
                        partyId,
                        memberId,
                        targetId: enemyId
                    });
                }
            }
        });
    }

    /**
     * Handle member being attacked
     * @param {Object} data - { attackerId, targetId }
     */
    handleMemberAttacked(data) {
        const { targetId } = data;
        
        const partyId = this.entityParties.get(targetId);
        if (!partyId) return;
        
        const party = this.parties.get(partyId);
        if (!party) return;
        
        // Emit distress call
        this.eventBus.emit('party:member-in-danger', {
            partyId,
            memberId: targetId,
            party
        });
    }

    /**
     * Handle member death
     * @param {Object} data - { entityId }
     */
    handleMemberDeath(data) {
        const { entityId } = data;
        
        const partyId = this.entityParties.get(entityId);
        if (!partyId) return;
        
        const party = this.parties.get(partyId);
        if (!party) return;
        
        // Don't remove from party, mark as dead
        const entity = this.entityManager.getEntity(entityId);
        if (entity) {
            const role = entity.getComponent('partyRole');
            if (role) {
                role.isDead = true;
            }
        }
        
        this.eventBus.emit('party:member-died', {
            partyId,
            memberId: entityId,
            party
        });
        
        // Check if all members are dead
        const allDead = party.members.every(memberId => {
            const member = this.entityManager.getEntity(memberId);
            const memberRole = member?.getComponent('partyRole');
            return memberRole?.isDead;
        });
        
        if (allDead) {
            this.eventBus.emit('party:wiped', {
                partyId,
                party
            });
        }
    }

    /**
     * Handle XP gained - share with party
     * @param {Object} data - { entityId, amount }
     */
    handleXPGained(data) {
        const { entityId, amount } = data;
        
        const partyId = this.entityParties.get(entityId);
        if (!partyId) return;
        
        const party = this.parties.get(partyId);
        if (!party) return;
        
        // Calculate shared XP
        const sharedAmount = Math.floor(amount * this.config.sharedXPPercent);
        const individualShare = Math.floor(sharedAmount / party.members.length);
        
        // Distribute to living party members
        party.members.forEach(memberId => {
            if (memberId === entityId) return; // Original earner gets full amount
            
            const member = this.entityManager.getEntity(memberId);
            const role = member?.getComponent('partyRole');
            
            if (member && !role?.isDead) {
                this.eventBus.emit('progression:add-xp', {
                    entityId: memberId,
                    amount: individualShare,
                    source: 'party-share'
                });
            }
        });
    }

    // Command implementations
    commandAttack(party, targetId) {
        party.members.forEach(memberId => {
            const member = this.entityManager.getEntity(memberId);
            const ai = member?.getComponent('partyAI');
            if (ai) {
                ai.state = 'commanded';
                ai.target = targetId;
                ai.commandTimeout = Date.now() + 30000; // 30 second timeout
            }
        });
    }

    commandMove(party, position) {
        party.members.forEach(memberId => {
            const member = this.entityManager.getEntity(memberId);
            const ai = member?.getComponent('partyAI');
            if (ai) {
                ai.state = 'commanded';
                ai.targetPosition = position;
                ai.commandTimeout = Date.now() + 10000; // 10 second timeout
            }
        });
    }

    commandDefend(party, targetId) {
        const targetEntity = targetId ? this.entityManager.getEntity(targetId) : null;
        const defendPosition = targetEntity?.getComponent('position') || 
                             this.entityManager.getEntity(party.leaderId)?.getComponent('position');
        
        party.members.forEach(memberId => {
            const member = this.entityManager.getEntity(memberId);
            const ai = member?.getComponent('partyAI');
            if (ai && defendPosition) {
                ai.state = 'defending';
                ai.defendPosition = { ...defendPosition };
                ai.defendRadius = 3;
            }
        });
    }

    commandFollow(party) {
        party.members.forEach(memberId => {
            const member = this.entityManager.getEntity(memberId);
            const ai = member?.getComponent('partyAI');
            if (ai) {
                ai.state = 'following';
                ai.target = null;
            }
        });
    }

    commandStay(party) {
        party.members.forEach(memberId => {
            const member = this.entityManager.getEntity(memberId);
            const ai = member?.getComponent('partyAI');
            const pos = member?.getComponent('position');
            if (ai && pos) {
                ai.state = 'staying';
                ai.stayPosition = { x: pos.x, y: pos.y };
            }
        });
    }

    /**
     * Get party info
     * @param {string} partyId 
     * @returns {Object|null}
     */
    getPartyInfo(partyId) {
        const party = this.parties.get(partyId);
        if (!party) return null;
        
        return {
            ...party,
            formation: this.formations[party.formation],
            behavior: this.behaviorModes[party.behaviorMode]
        };
    }

    /**
     * Clean up
     */
    destroy() {
        this.parties.clear();
        this.entityParties.clear();
    }
}