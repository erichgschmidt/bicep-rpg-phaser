/**
 * TimeSystem - Manages game time, day/night cycles, and time-based events
 * Branch-level system that provides time services to the game
 * 
 * Dependencies: EventBus (trunk only)
 */
export default class TimeSystem {
    constructor(eventBus) {
        this.eventBus = eventBus;
        
        // Time configuration
        this.config = {
            // Real time to game time ratio (1 real second = X game minutes)
            timeScale: 1, // 1 real second = 1 game minute
            startHour: 6, // Start at 6 AM
            startDay: 1,
            dawnHour: 5,
            dayHour: 7,
            duskHour: 19,
            nightHour: 21,
            // Time periods for events
            shopOpenHour: 8,
            shopCloseHour: 18
        };
        
        // Current time state
        this.timeState = {
            totalMinutes: this.config.startHour * 60,
            currentHour: this.config.startHour,
            currentMinute: 0,
            currentDay: this.config.startDay,
            timeOfDay: 'dawn', // night, dawn, day, dusk
            isPaused: false,
            lastUpdate: Date.now()
        };
        
        // Time-based modifiers
        this.timeModifiers = {
            night: {
                visibility: 0.3,
                enemySpawnRate: 1.5,
                enemyAggression: 1.3,
                ambientLight: 0x222244
            },
            dawn: {
                visibility: 0.7,
                enemySpawnRate: 0.8,
                enemyAggression: 0.9,
                ambientLight: 0x665544
            },
            day: {
                visibility: 1.0,
                enemySpawnRate: 1.0,
                enemyAggression: 1.0,
                ambientLight: 0xffffff
            },
            dusk: {
                visibility: 0.6,
                enemySpawnRate: 1.2,
                enemyAggression: 1.1,
                ambientLight: 0x884422
            }
        };
        
        // Scheduled events
        this.scheduledEvents = new Map();
        
        this.setupEventListeners();
        this.startTimeLoop();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Time control events
        this.eventBus.on('time:pause', () => this.pauseTime());
        this.eventBus.on('time:resume', () => this.resumeTime());
        this.eventBus.on('time:set', (data) => this.setTime(data.hour, data.minute));
        this.eventBus.on('time:advance', (data) => this.advanceTime(data.minutes));
        
        // Schedule events
        this.eventBus.on('time:schedule-event', (data) => this.scheduleEvent(data));
        this.eventBus.on('time:cancel-event', (data) => this.cancelEvent(data.eventId));
        
        // Query events
        this.eventBus.on('time:query', (data) => {
            this.eventBus.emit('time:current', this.getCurrentTime());
        });
    }

    /**
     * Start the time update loop
     */
    startTimeLoop() {
        this.timeInterval = setInterval(() => {
            if (!this.timeState.isPaused) {
                this.updateTime();
            }
        }, 1000); // Update every second
    }

    /**
     * Update game time
     */
    updateTime() {
        const now = Date.now();
        const deltaMs = now - this.timeState.lastUpdate;
        this.timeState.lastUpdate = now;
        
        // Calculate minutes passed based on time scale
        const minutesPassed = (deltaMs / 1000) * this.config.timeScale;
        this.timeState.totalMinutes += minutesPassed;
        
        // Update current time
        const oldHour = this.timeState.currentHour;
        this.timeState.currentMinute = Math.floor(this.timeState.totalMinutes % 60);
        this.timeState.currentHour = Math.floor((this.timeState.totalMinutes / 60) % 24);
        this.timeState.currentDay = Math.floor(this.timeState.totalMinutes / (60 * 24)) + this.config.startDay;
        
        // Check for hour change
        if (Math.floor(oldHour) !== Math.floor(this.timeState.currentHour)) {
            this.onHourChanged(Math.floor(this.timeState.currentHour));
        }
        
        // Update time of day
        const oldTimeOfDay = this.timeState.timeOfDay;
        this.timeState.timeOfDay = this.getTimeOfDay(this.timeState.currentHour);
        
        if (oldTimeOfDay !== this.timeState.timeOfDay) {
            this.onTimeOfDayChanged(this.timeState.timeOfDay, oldTimeOfDay);
        }
        
        // Process scheduled events
        this.processScheduledEvents();
        
        // Emit time update
        this.eventBus.emit('time:updated', this.getCurrentTime());
    }

    /**
     * Get time of day based on hour
     * @param {number} hour 
     * @returns {string}
     */
    getTimeOfDay(hour) {
        if (hour >= this.config.nightHour || hour < this.config.dawnHour) {
            return 'night';
        } else if (hour >= this.config.dawnHour && hour < this.config.dayHour) {
            return 'dawn';
        } else if (hour >= this.config.dayHour && hour < this.config.duskHour) {
            return 'day';
        } else {
            return 'dusk';
        }
    }

    /**
     * Handle hour change
     * @param {number} newHour 
     */
    onHourChanged(newHour) {
        this.eventBus.emit('time:hour-changed', {
            hour: newHour,
            day: this.timeState.currentDay,
            timeOfDay: this.timeState.timeOfDay
        });
        
        // Check for special hour events
        if (newHour === this.config.shopOpenHour) {
            this.eventBus.emit('time:shops-opened');
        } else if (newHour === this.config.shopCloseHour) {
            this.eventBus.emit('time:shops-closed');
        }
        
        // Midnight - new day
        if (newHour === 0) {
            this.eventBus.emit('time:new-day', {
                day: this.timeState.currentDay
            });
        }
    }

    /**
     * Handle time of day change
     * @param {string} newTimeOfDay 
     * @param {string} oldTimeOfDay 
     */
    onTimeOfDayChanged(newTimeOfDay, oldTimeOfDay) {
        const modifiers = this.timeModifiers[newTimeOfDay];
        
        this.eventBus.emit('time:day-night-transition', {
            from: oldTimeOfDay,
            to: newTimeOfDay,
            modifiers: modifiers
        });
        
        // Specific transitions
        if (newTimeOfDay === 'night') {
            this.eventBus.emit('time:nightfall');
        } else if (newTimeOfDay === 'day') {
            this.eventBus.emit('time:daybreak');
        }
    }

    /**
     * Schedule an event at a specific time
     * @param {Object} data - { eventId, hour, minute, callback, recurring }
     */
    scheduleEvent(data) {
        const { eventId, hour, minute = 0, callback, recurring = false } = data;
        
        this.scheduledEvents.set(eventId, {
            hour,
            minute,
            callback,
            recurring,
            lastTriggered: -1
        });
    }

    /**
     * Cancel a scheduled event
     * @param {string} eventId 
     */
    cancelEvent(eventId) {
        this.scheduledEvents.delete(eventId);
    }

    /**
     * Process scheduled events
     */
    processScheduledEvents() {
        const currentTotalMinutes = Math.floor(this.timeState.totalMinutes);
        
        this.scheduledEvents.forEach((event, eventId) => {
            const eventMinutes = (this.timeState.currentDay - 1) * 24 * 60 + event.hour * 60 + event.minute;
            
            if (currentTotalMinutes >= eventMinutes && event.lastTriggered < eventMinutes) {
                // Trigger event
                event.lastTriggered = eventMinutes;
                
                this.eventBus.emit('time:scheduled-event', {
                    eventId,
                    time: this.getCurrentTime()
                });
                
                if (event.callback) {
                    event.callback(this.getCurrentTime());
                }
                
                // Remove non-recurring events
                if (!event.recurring) {
                    this.scheduledEvents.delete(eventId);
                }
            }
        });
    }

    /**
     * Pause time
     */
    pauseTime() {
        this.timeState.isPaused = true;
        this.eventBus.emit('time:paused');
    }

    /**
     * Resume time
     */
    resumeTime() {
        this.timeState.isPaused = false;
        this.timeState.lastUpdate = Date.now(); // Reset to prevent time jump
        this.eventBus.emit('time:resumed');
    }

    /**
     * Set time to specific hour and minute
     * @param {number} hour 
     * @param {number} minute 
     */
    setTime(hour, minute = 0) {
        const oldTime = this.getCurrentTime();
        
        this.timeState.totalMinutes = (this.timeState.currentDay - 1) * 24 * 60 + hour * 60 + minute;
        this.timeState.currentHour = hour;
        this.timeState.currentMinute = minute;
        
        const newTimeOfDay = this.getTimeOfDay(hour);
        if (newTimeOfDay !== this.timeState.timeOfDay) {
            this.onTimeOfDayChanged(newTimeOfDay, this.timeState.timeOfDay);
            this.timeState.timeOfDay = newTimeOfDay;
        }
        
        this.eventBus.emit('time:changed', {
            from: oldTime,
            to: this.getCurrentTime()
        });
    }

    /**
     * Advance time by minutes
     * @param {number} minutes 
     */
    advanceTime(minutes) {
        const targetMinutes = this.timeState.totalMinutes + minutes;
        
        // Simulate time passing with events
        while (this.timeState.totalMinutes < targetMinutes) {
            this.timeState.totalMinutes++;
            this.updateTime();
        }
    }

    /**
     * Get current time
     * @returns {Object}
     */
    getCurrentTime() {
        return {
            hour: Math.floor(this.timeState.currentHour),
            minute: Math.floor(this.timeState.currentMinute),
            day: this.timeState.currentDay,
            timeOfDay: this.timeState.timeOfDay,
            totalMinutes: Math.floor(this.timeState.totalMinutes),
            modifiers: this.timeModifiers[this.timeState.timeOfDay],
            isPaused: this.timeState.isPaused
        };
    }

    /**
     * Get time as formatted string
     * @returns {string}
     */
    getTimeString() {
        const hour = Math.floor(this.timeState.currentHour);
        const minute = Math.floor(this.timeState.currentMinute);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        
        return `Day ${this.timeState.currentDay} - ${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    }

    /**
     * Check if current time is between two hours
     * @param {number} startHour 
     * @param {number} endHour 
     * @returns {boolean}
     */
    isTimeBetween(startHour, endHour) {
        const hour = this.timeState.currentHour;
        
        if (startHour <= endHour) {
            return hour >= startHour && hour < endHour;
        } else {
            // Handles cases like 22:00 to 6:00
            return hour >= startHour || hour < endHour;
        }
    }

    /**
     * Get visibility modifier for current time
     * @returns {number}
     */
    getVisibilityModifier() {
        return this.timeModifiers[this.timeState.timeOfDay].visibility;
    }

    /**
     * Get enemy spawn rate modifier for current time
     * @returns {number}
     */
    getEnemySpawnModifier() {
        return this.timeModifiers[this.timeState.timeOfDay].enemySpawnRate;
    }

    /**
     * Update time system (called by game loop)
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     */
    update(deltaTime) {
        if (this.timeState.isPaused) return;
        
        // Update time based on delta (for smooth time progression)
        this.updateTime();
        
        // Process any scheduled events
        this.processScheduledEvents();
    }

    /**
     * Clean up
     */
    destroy() {
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
        }
        this.scheduledEvents.clear();
    }
}