/**
 * ResourceManager - Asset loading, game data, save/load functionality
 * Handles all external resources and data persistence
 */
export default class ResourceManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.resources = new Map();
        this.loading = new Map();
        this.gameData = new Map();
        this.saveData = null;
        this.storageKey = 'bicep-rpg-save';
    }

    /**
     * Load a JSON resource
     * @param {string} key 
     * @param {string} url 
     */
    async loadJSON(key, url) {
        if (this.resources.has(key)) {
            return this.resources.get(key);
        }

        if (this.loading.has(key)) {
            return this.loading.get(key);
        }

        const loadPromise = fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${url}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                this.resources.set(key, data);
                this.loading.delete(key);
                this.eventBus.emit('resource:loaded', { key, type: 'json', data });
                return data;
            })
            .catch(error => {
                this.loading.delete(key);
                this.eventBus.emit('resource:error', { key, error });
                throw error;
            });

        this.loading.set(key, loadPromise);
        return loadPromise;
    }

    /**
     * Load an image resource
     * @param {string} key 
     * @param {string} url 
     */
    async loadImage(key, url) {
        if (this.resources.has(key)) {
            return this.resources.get(key);
        }

        if (this.loading.has(key)) {
            return this.loading.get(key);
        }

        const loadPromise = new Promise((resolve, reject) => {
            const image = new Image();
            
            image.onload = () => {
                this.resources.set(key, image);
                this.loading.delete(key);
                this.eventBus.emit('resource:loaded', { key, type: 'image', data: image });
                resolve(image);
            };
            
            image.onerror = (error) => {
                this.loading.delete(key);
                this.eventBus.emit('resource:error', { key, error });
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            image.src = url;
        });

        this.loading.set(key, loadPromise);
        return loadPromise;
    }

    /**
     * Load audio resource
     * @param {string} key 
     * @param {string} url 
     */
    async loadAudio(key, url) {
        if (this.resources.has(key)) {
            return this.resources.get(key);
        }

        if (this.loading.has(key)) {
            return this.loading.get(key);
        }

        const loadPromise = new Promise((resolve, reject) => {
            const audio = new Audio();
            
            audio.addEventListener('canplaythrough', () => {
                this.resources.set(key, audio);
                this.loading.delete(key);
                this.eventBus.emit('resource:loaded', { key, type: 'audio', data: audio });
                resolve(audio);
            });
            
            audio.addEventListener('error', (error) => {
                this.loading.delete(key);
                this.eventBus.emit('resource:error', { key, error });
                reject(new Error(`Failed to load audio: ${url}`));
            });
            
            audio.src = url;
            audio.load();
        });

        this.loading.set(key, loadPromise);
        return loadPromise;
    }

    /**
     * Load multiple resources
     * @param {Array} resources - [{ key, url, type }]
     */
    async loadMultiple(resources) {
        const promises = resources.map(({ key, url, type }) => {
            switch (type) {
                case 'json':
                    return this.loadJSON(key, url);
                case 'image':
                    return this.loadImage(key, url);
                case 'audio':
                    return this.loadAudio(key, url);
                default:
                    return Promise.reject(new Error(`Unknown resource type: ${type}`));
            }
        });

        return Promise.all(promises);
    }

    /**
     * Get a loaded resource
     * @param {string} key 
     */
    get(key) {
        return this.resources.get(key);
    }

    /**
     * Check if a resource is loaded
     * @param {string} key 
     */
    has(key) {
        return this.resources.has(key);
    }

    /**
     * Store game data
     * @param {string} key 
     * @param {any} data 
     */
    setGameData(key, data) {
        this.gameData.set(key, data);
    }

    /**
     * Get game data
     * @param {string} key 
     */
    getGameData(key) {
        return this.gameData.get(key);
    }

    /**
     * Save game state to local storage
     * @param {Object} saveData 
     */
    saveGame(saveData) {
        try {
            const data = {
                version: '1.0.0',
                timestamp: Date.now(),
                data: saveData
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            this.saveData = data;
            this.eventBus.emit('game:saved', { data });
            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            this.eventBus.emit('game:save-error', { error });
            return false;
        }
    }

    /**
     * Load game state from local storage
     */
    loadGame() {
        try {
            const savedString = localStorage.getItem(this.storageKey);
            if (!savedString) {
                return null;
            }
            
            const savedData = JSON.parse(savedString);
            this.saveData = savedData;
            this.eventBus.emit('game:loaded', { data: savedData });
            return savedData.data;
        } catch (error) {
            console.error('Failed to load game:', error);
            this.eventBus.emit('game:load-error', { error });
            return null;
        }
    }

    /**
     * Delete save data
     */
    deleteSave() {
        try {
            localStorage.removeItem(this.storageKey);
            this.saveData = null;
            this.eventBus.emit('game:save-deleted');
            return true;
        } catch (error) {
            console.error('Failed to delete save:', error);
            return false;
        }
    }

    /**
     * Check if save exists
     */
    hasSave() {
        return localStorage.getItem(this.storageKey) !== null;
    }

    /**
     * Clear all resources
     */
    clearResources() {
        this.resources.clear();
        this.loading.clear();
    }

    /**
     * Get loading progress
     */
    getLoadingProgress() {
        const total = this.resources.size + this.loading.size;
        const loaded = this.resources.size;
        return total > 0 ? loaded / total : 1;
    }
}