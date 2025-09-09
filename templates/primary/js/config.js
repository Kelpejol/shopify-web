// enhanced-config-manager.js - SWR-like caching strategy optimized for configuration data

class EnhancedConfigurationManager {
    constructor() {
        // Subdomain & Main App Detection
        const host = window.location.hostname;
        const hostParts = host.split('.');
        this.subdomain = hostParts.length > 2 && host.endsWith("pluggn.store") ? hostParts[0] : null;
        this.isMainApp = !this.subdomain && (
            host === "pluggn.store" || host === "pluggn.com.ng"
        );

        // Base URLs
        this.baseURL = "https://api.pluggn.com.ng";
        
        // Memory cache for immediate access
        this.memoryCache = new Map();
        
        // Configuration optimized for config data (longer intervals since config changes infrequently)
        this.config = {
            // Stale time - how long config is considered fresh (longer for config)
            staleTime: 30 * 60 * 1000, // 30 minutes
            // Cache time - how long config stays in cache
            cacheTime: 4 * 60 * 60 * 1000, // 4 hours
            // Refetch on window focus (less aggressive for config)
            refetchOnWindowFocus: false,
            // Refetch on reconnect
            refetchOnReconnect: true,
            // Background refetch interval (longer for config)
            backgroundRefetchInterval: 60 * 60 * 1000, // 1 hour
            // Retry attempts
            retryCount: 2,
            retryDelay: 2000,
            // Cache version for invalidation
            version: '1.1.0'
        };
        
        // Subscribers for real-time updates
        this.subscribers = new Set();
        
        // Request deduplication
        this.ongoingRequests = new Map();
        
        // Default configuration
        this.defaultConfig = {
            templateId: "primary",
            styles: {
                FONT_FAMILY: null,
                TEXT_COLOR: null,
                BACKGROUND_COLOR: null,
                PRIMARY_COLOR: null,
                SECONDARY_COLOR: null,
                ACCENT_COLOR: null,
               
                
            },
            content: {
                BRAND_NAME: "TechVibe",
                HERO_TITLE: "Next-Gen Tech at Your Fingertips",
                HERO_DESCRIPTION: "Discover the latest in cutting-edge technology. Premium devices with exceptional performance, stunning design, and innovative features.",
                PRIMARY_CTA_TEXT: "shop now",
                SECONDARY_CTA_TEXT: "learn more",
                ABOUT_TEXT: ` Welcome to TechVibe, your premier destination for cutting-edge electronics and tech accessories. Founded in 2018, we've been committed to providing our customers with the latest innovations and exceptional service. Our mission is to make technology accessible to everyone by offering high-quality products  at competitive prices. We carefully select each item in our inventory to ensure it meets our standards for performance, reliability, and value. At TechVibe, we believe that technology should enhance your life, not complicate it. That's why we offer detailed product information, expert advice, and responsive customer support to help you make informed decisions.`,
                INSTAGRAM_LINK: null,
                FACEBOOK_LINK: null,
                TWITTER_LINK: null,
                PHONE_NUMBER: "+1 (123) 456-7890",
                MAIL: "support@techvibe.com",
            },
            metadata: {
                title: "TechVibe - Premium Electronics Store",
                description: "TechVibe - Premium Electronics Store. Shop the latest smartphones, laptops, and accessories.",
            },
        };
        
        // Initialize
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.startBackgroundSync();
        this.loadFromPersistentStorage();
    }

    // Check if we should use API or default config
    shouldUseAPI() {
        // Use API only if we're in main app or have a valid subdomain
        return this.isMainApp || (this.subdomain && this.subdomain !== 'null');
    }

    // Event listeners for automatic refetching (less aggressive for config)
    setupEventListeners() {
        if (typeof window === 'undefined') return;

        // Only refetch on network reconnection for config
        if (this.config.refetchOnReconnect) {
            window.addEventListener('online', () => {
                console.log('Network reconnected, checking config...');
                this.refetchIfStale(true); // Silent refetch
            });
        }

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.saveToPersistentStorage();
            this.cleanup();
        });
    }

    // Background sync for automatic updates (less frequent for config)
    startBackgroundSync() {
        if (typeof window === 'undefined') return;

        // Clear existing interval
        if (window.configBackgroundSync) {
            clearInterval(window.configBackgroundSync);
        }

        // Only start background sync if we should use API
        if (!this.shouldUseAPI()) {
            return;
        }

        // Set up background refetch (less frequent than products)
        window.configBackgroundSync = setInterval(() => {
            if (this.hasActiveSubscribers()) {
                this.refetchIfStale(true); // Silent background refetch
            }
        }, this.config.backgroundRefetchInterval);
    }

    // Check if there are active subscribers
    hasActiveSubscribers() {
        return this.subscribers.size > 0;
    }

    // Subscribe to config changes
    subscribe(callback) {
        this.subscribers.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }

    // Notify all subscribers of config changes
    notifySubscribers(data, error = null, isValidating = false) {
        this.subscribers.forEach(callback => {
            try {
                callback({ data, error, isValidating });
            } catch (err) {
                console.error('Config subscriber callback error:', err);
            }
        });
    }

    // Get cache key
    getCacheKey() {
        return `config_${this.subdomain || 'main'}`;
    }

    // Check if config is stale
    isStale(timestamp) {
        return Date.now() - timestamp > this.config.staleTime;
    }

    // Check if config is expired
    isExpired(timestamp) {
        return Date.now() - timestamp > this.config.cacheTime;
    }

    // Get config from memory cache
    getFromMemoryCache() {
        const key = this.getCacheKey();
        const cached = this.memoryCache.get(key);
        
        if (!cached) return null;
        
        // Remove expired config
        if (this.isExpired(cached.timestamp)) {
            this.memoryCache.delete(key);
            return null;
        }
        
        return cached;
    }

    // Set config in memory cache
    setMemoryCache(data) {
        const key = this.getCacheKey();
        this.memoryCache.set(key, {
            data,
            timestamp: Date.now(),
            version: this.config.version,
            configHash: this.generateConfigHash(data)
        });
    }

    // Generate a simple hash for config comparison
    generateConfigHash(config) {
        try {
            const configString = JSON.stringify(config);
            let hash = 0;
            for (let i = 0; i < configString.length; i++) {
                const char = configString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString();
        } catch (error) {
            return Date.now().toString();
        }
    }

    // Load config from persistent storage (IndexedDB fallback to localStorage)
    async loadFromPersistentStorage() {
        try {
            // Try IndexedDB first
            if (this.isIndexedDBSupported()) {
                const data = await this.getFromIndexedDB();
                if (data && !this.isExpired(data.timestamp)) {
                    // Validate version
                    if (data.version === this.config.version) {
                        this.setMemoryCache(data.data);
                        return data.data;
                    }
                }
            }
            
            // Fallback to localStorage
            const cached = localStorage.getItem(this.getCacheKey());
            if (cached) {
                const parsed = JSON.parse(cached);
                if (!this.isExpired(parsed.timestamp) && parsed.version === this.config.version) {
                    this.setMemoryCache(parsed.data);
                    return parsed.data;
                }
            }
        } catch (error) {
            console.warn('Error loading config from persistent storage:', error);
        }
        return null;
    }

    // Save to persistent storage
    async saveToPersistentStorage() {
        const cached = this.getFromMemoryCache();
        if (!cached) return;

        const dataToStore = {
            data: cached.data,
            timestamp: cached.timestamp,
            version: cached.version,
            configHash: cached.configHash
        };

        try {
            // Try IndexedDB first
            if (this.isIndexedDBSupported()) {
                await this.saveToIndexedDB(dataToStore);
            } else {
                // Fallback to localStorage
                localStorage.setItem(this.getCacheKey(), JSON.stringify(dataToStore));
            }
        } catch (error) {
            console.warn('Error saving config to persistent storage:', error);
            // Handle localStorage quota exceeded
            if (error.name === 'QuotaExceededError') {
                this.clearAllConfigCache();
            }
        }
    }

    // IndexedDB support check
    isIndexedDBSupported() {
        return typeof window !== 'undefined' && 'indexedDB' in window;
    }

    // IndexedDB operations
    async getFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ConfigCache', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['configs'], 'readonly');
                const store = transaction.objectStore('configs');
                const getRequest = store.get(this.getCacheKey());
                
                getRequest.onsuccess = () => resolve(getRequest.result);
                getRequest.onerror = () => reject(getRequest.error);
            };
            
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('configs')) {
                    db.createObjectStore('configs', { keyPath: 'key' });
                }
            };
        });
    }

    async saveToIndexedDB(data) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ConfigCache', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['configs'], 'readwrite');
                const store = transaction.objectStore('configs');
                
                const saveRequest = store.put({
                    key: this.getCacheKey(),
                    ...data
                });
                
                saveRequest.onsuccess = () => resolve();
                saveRequest.onerror = () => reject(saveRequest.error);
            };
        });
    }

    // NEW: Load and serve 404.html content without changing URL
     serve404Page() {
       
        document.body.innerHTML = `
        <div style="
            display: flex; 
            flex-direction: column; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh;
            background-color: #f6f8fa;
            color: #1f1f1f;
            font-family: 'Inter', sans-serif;
            padding: 2rem;
            text-align: center;
        ">
            <img 
                src="${this.baseURL}/image/404.svg" 
                alt="Lost in space" 
                crossorigin="anonymous"
                style="
                    max-width: 300px;
                    margin-bottom: 2rem;
                "
            >    
            <h2 style="font-size: 1.5rem; margin: 10px 0; color: #495057;">Store Not Found</h2>
            <p style="font-size: 1rem; color: #6c757d; max-width: 500px;">
                Oops! something went wrong.
                Please check the URL and try again.
            </p>
        </div>
    `;

        // Remove loading class if it exists
        document.body.classList.remove("loading");

        // Add a special class to indicate this is a 404 state
        document.body.classList.add("config-404");
    }

    // Fetch with retry logic
    async fetchWithRetry(retryCount = 0) {
        try {

            if (this.isMainApp) {
                return;
            }

            const url = `${this.baseURL}/public/store/config?subdomain=${this.subdomain}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const storeConfig = await response.json();
            return this.mergeConfigs(this.defaultConfig, storeConfig);
            
        } catch (error) {
            if (retryCount < this.config.retryCount) {
                console.log(`Config fetch failed, retrying... (${retryCount + 1}/${this.config.retryCount})`);
                await this.delay(this.config.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
                return this.fetchWithRetry(retryCount + 1);
            }
            throw error;
        }
    }

    // Delay helper
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Deep merge configuration objects
    mergeConfigs(defaultConfig, apiConfig) {
        const merged = JSON.parse(JSON.stringify(defaultConfig)); // Deep clone
        
        function deepMerge(target, source) {
            for (const key in source) {
                if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    deepMerge(target[key], source[key]);
                } else if (source[key] !== null && source[key] !== undefined) {
                    target[key] = source[key];
                }
            }
        }
        
        deepMerge(merged, apiConfig);
        return merged;
    }

    // Main fetch method with SWR logic (optimized for config)
    async fetchConfig(options = {}) {
        const {
            forceRefresh = false,
            silent = false // For background updates
        } = options;

        const key = this.getCacheKey();
        
        // If we shouldn't use API, return default config immediately
        if (!this.shouldUseAPI()) {
           
            const config = { ...this.defaultConfig };
            this.setMemoryCache(config);
            if (!silent) {
                this.notifySubscribers(config, null, false);
            }
            this.applyConfig(config);
            return config;
        }
        
        // Check for ongoing request to avoid duplicates
        if (this.ongoingRequests.has(key) && !forceRefresh) {
            return this.ongoingRequests.get(key);
        }

        // Get cached config
        const cached = this.getFromMemoryCache();
        const hasConfig = cached && cached.data;
        const isConfigStale = hasConfig && this.isStale(cached.timestamp);

        // Return fresh cache immediately if available and not stale
        if (hasConfig && !isConfigStale && !forceRefresh) {
            if (!silent) {
                this.notifySubscribers(cached.data, null, false);
            }
            return cached.data;
        }

        // If we have stale config, return it immediately but fetch fresh config in background
        if (hasConfig && isConfigStale && !forceRefresh && !silent) {
            this.notifySubscribers(cached.data, null, true); // Show stale config while validating
            // Start background fetch
            this.fetchConfig({ silent: true });
            return cached.data;
        }

        // Fetch fresh config
        const fetchPromise = (async () => {
            try {
                if (!silent) {
                    this.notifySubscribers(hasConfig ? cached.data : null, null, true);
                }

                const freshConfig = await this.fetchWithRetry();
                
                // Check if config actually changed
                const configChanged = hasConfig && cached.configHash !== this.generateConfigHash(freshConfig);
                
                // Update cache
                this.setMemoryCache(freshConfig);
                this.saveToPersistentStorage();
                
                // Notify subscribers
                if (!silent) {
                    this.notifySubscribers(freshConfig, null, false);
                }
                
                // Apply config to DOM if changed or first load
                if (!hasConfig || configChanged) {
                    this.applyConfig(freshConfig);
                }
                
                return freshConfig;
            } catch (error) {
                console.error('Config fetch error:', error);
                
                // If we have cached config, return it even if stale
                if (hasConfig) {
                    console.log('Using cached config due to fetch error');
                    if (!silent) {
                        this.notifySubscribers(cached.data, error, false);
                    }
                    this.applyConfig(cached.data);
                    return cached.data;
                }
                
                // MODIFIED: Instead of using default config, serve 404 page
                console.log('No cached config available, serving 404 page');
                if (!silent) {
                    this.notifySubscribers(null, error, false);
                }
                
                // Serve 404 without changing URL
                 this.serve404Page();
                
                // Throw the error so callers know the config failed
                throw error;
            } finally {
                this.ongoingRequests.delete(key);
            }
        })();

        // Store ongoing request
        this.ongoingRequests.set(key, fetchPromise);
        
        return fetchPromise;
    }

    // Refetch if config is stale
    async refetchIfStale(silent = false) {
        // Don't refetch if we shouldn't use API
        if (!this.shouldUseAPI()) {
            const config = { ...this.defaultConfig };
            this.setMemoryCache(config);
            if (!silent) {
                this.notifySubscribers(config, null, false);
            }
            return config;
        }

        const cached = this.getFromMemoryCache();
        if (!cached || this.isStale(cached.timestamp)) {
            return this.fetchConfig({ silent });
        }
        return cached.data;
    }

    // Mutate config (like SWR's mutate)
    async mutate(newConfig = null, shouldRefetch = false) {
        const key = this.getCacheKey();
        
        if (newConfig !== null) {
            // Optimistic update
            this.setMemoryCache(newConfig);
            this.notifySubscribers(newConfig, null, shouldRefetch);
            this.saveToPersistentStorage();
            this.applyConfig(newConfig);
        }
        
        if (shouldRefetch && this.shouldUseAPI()) {
            return this.fetchConfig({ forceRefresh: true });
        }
        
        return newConfig || this.getFromMemoryCache()?.data;
    }

    // Apply configuration to DOM
    applyConfig(config = null) {
        const currentConfig = config || this.getFromMemoryCache()?.data || this.defaultConfig;
        const root = document.documentElement;

        // Apply styles
        const styleMap = {
            '--font-family': currentConfig.styles.FONT_FAMILY,
            '--color-primary': currentConfig.styles.PRIMARY_COLOR,
            '--color-secondary': currentConfig.styles.SECONDARY_COLOR,
            '--color-accent': currentConfig.styles.ACCENT_COLOR,
            '--color-background': currentConfig.styles.BACKGROUND_COLOR,
            '--color-text': currentConfig.styles.TEXT_COLOR,
        };

        Object.entries(styleMap).forEach(([key, value]) => {
            if (value) root.style.setProperty(key, value);
        });

        // Branding
        if (currentConfig.content.BRAND_NAME) {
            document.querySelectorAll('.logo h1, .logo').forEach(el => 
                el.textContent = currentConfig.content.BRAND_NAME
            );

            const footerTitle = document.querySelector('.footer-title');
            if (footerTitle) footerTitle.textContent = currentConfig.content.BRAND_NAME;

            const copyrightEl = document.querySelector('.footer-bottom p');
            if (copyrightEl) {
                copyrightEl.textContent = `© ${new Date().getFullYear()} ${currentConfig.content.BRAND_NAME}. All rights reserved.`;
            }
        }

        // Hero Section
        const heroTitleEl = document.querySelector('.hero h1');
        if (heroTitleEl && currentConfig.content.HERO_TITLE) {
            heroTitleEl.textContent = currentConfig.content.HERO_TITLE;
        }

        const heroDescEl = document.querySelector('.hero .description');
        if (heroDescEl && currentConfig.content.HERO_DESCRIPTION) {
            heroDescEl.textContent = currentConfig.content.HERO_DESCRIPTION;
        }

        // CTA Buttons
        const primaryCTA = document.querySelector('.hero-actions .btn-primary');
        if (primaryCTA && currentConfig.content.PRIMARY_CTA_TEXT) {
            primaryCTA.textContent = currentConfig.content.PRIMARY_CTA_TEXT;
        }

        const secondaryCTA = document.querySelector('.hero-actions .btn-outline');
        if (secondaryCTA && currentConfig.content.SECONDARY_CTA_TEXT) {
            secondaryCTA.textContent = currentConfig.content.SECONDARY_CTA_TEXT;
        }

        // About Section
        const aboutTextEl = document.querySelector('.about-text');
        if (aboutTextEl && currentConfig.content.ABOUT_TEXT) {
            if (currentConfig.content.ABOUT_TEXT.trim().startsWith('<p>')) {
                aboutTextEl.innerHTML = currentConfig.content.ABOUT_TEXT;
            } else {
                aboutTextEl.innerHTML = '';
                currentConfig.content.ABOUT_TEXT.split('\n\n').forEach(text => {
                    if (text.trim()) {
                        const p = document.createElement('p');
                        p.textContent = text.trim();
                        aboutTextEl.appendChild(p);
                    }
                });
            }
        }

        // Social Links
        const socialLinks = document.querySelectorAll('.social-links a');
        if (socialLinks.length >= 3) {
            if (currentConfig.content.FACEBOOK_LINK) socialLinks[0].href = currentConfig.content.FACEBOOK_LINK;
            if (currentConfig.content.TWITTER_LINK) socialLinks[1].href = currentConfig.content.TWITTER_LINK;
            if (currentConfig.content.INSTAGRAM_LINK) socialLinks[2].href = currentConfig.content.INSTAGRAM_LINK;
        }

        // Footer Contact Info
        const footerParas = document.querySelectorAll('.footer-column p');
        footerParas.forEach(p => {
            const txt = p.textContent.toLowerCase();
            if (txt.includes('email') && currentConfig.content.MAIL) {
                p.textContent = `Email: ${currentConfig.content.MAIL}`;
            }
            if (txt.includes('phone') && currentConfig.content.PHONE_NUMBER) {
                p.textContent = `Phone: ${currentConfig.content.PHONE_NUMBER}`;
            }
        });

        // Metadata
        if (currentConfig.metadata.title) document.title = currentConfig.metadata.title;

        if (currentConfig.metadata.description) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.setAttribute('name', 'description');
                document.head.appendChild(metaDesc);
            }
            metaDesc.setAttribute('content', currentConfig.metadata.description);
        }

        // Remove loading class to hide loader
        document.body.classList.remove("loading");
    }

    // Get cache info and statistics
    getCacheInfo() {
        try {
            const cached = this.getFromMemoryCache();
            if (!cached) {
                return { 
                    cached: false, 
                    subdomain: this.subdomain || 'main',
                    shouldUseAPI: this.shouldUseAPI(),
                    isMainApp: this.isMainApp 
                };
            }

            const now = Date.now();
            const age = now - cached.timestamp;
            const isStale = this.isStale(cached.timestamp);
            const isExpired = this.isExpired(cached.timestamp);

            return {
                cached: true,
                subdomain: this.subdomain || 'main',
                isMainApp: this.isMainApp,
                shouldUseAPI: this.shouldUseAPI(),
                age,
                isStale,
                isExpired,
                lastFetch: new Date(cached.timestamp).toLocaleString(),
                subscribers: this.subscribers.size,
                version: cached.version,
                configHash: cached.configHash
            };
        } catch (error) {
            return { cached: false, error: error.message };
        }
    }

    // Clear config cache
    clearCache() {
        const key = this.getCacheKey();
        this.memoryCache.delete(key);
        
        // Clear persistent storage
        try {
            localStorage.removeItem(key);
            // TODO: Clear from IndexedDB if needed
        } catch (error) {
            console.warn('Error clearing config persistent storage:', error);
        }
        
        this.notifySubscribers(null, null, false);
    }

    // Clear all config caches (for all subdomains)
    clearAllConfigCache() {
        try {
            const keys = Object.keys(localStorage);
            const configKeys = keys.filter(key => key.startsWith('config_'));
            
            configKeys.forEach(key => localStorage.removeItem(key));
            this.memoryCache.clear();
            console.log(`Cleared ${configKeys.length} config cache entries`);
        } catch (error) {
            console.warn('Error clearing all config cache:', error);
        }
    }

    // Cleanup
    cleanup() {
        if (window.configBackgroundSync) {
            clearInterval(window.configBackgroundSync);
            window.configBackgroundSync = null;
        }
        this.subscribers.clear();
        this.ongoingRequests.clear();
    }

    // Public API methods for backward compatibility
    async loadStoreConfig(forceRefresh = false) {
        return this.fetchConfig({ forceRefresh });
    }

    async refreshConfig() {
       
        return this.fetchConfig({ forceRefresh: true });
    }

    async smartLoad(updateCallback = null) {
        if (updateCallback) {
            this.subscribe(({ data, error }) => {
                if (data && !error) {
                    updateCallback(data);
                }
            });
        }
        
        try {
            const config = await this.fetchConfig();
            return config;
        } catch (error) {
            // Config fetch failed and 404 was served
            console.log('Config fetch failed, 404 page served');
            return null;
        }
    }

    getCurrentConfig() {
        const cached = this.getFromMemoryCache();
        return cached ? { ...cached.data } : { ...this.defaultConfig };
    }

    updateConfig(newConfig) {
        const current = this.getCurrentConfig();
        const merged = this.mergeConfigs(current, newConfig);
        this.mutate(merged);
    }
}

// React-like hook for using the config cache
class useConfig {
    constructor(options = {}) {
        this.cache = window.EnhancedConfigManager || new EnhancedConfigurationManager();
        this.options = options;
        this.unsubscribe = null;
        
        // State
        this.data = null;
        this.error = null;
        this.isValidating = false;
        this.callbacks = new Set();
    }

    // Subscribe to changes
    subscribe(callback) {
        this.callbacks.add(callback);
        
        // Subscribe to cache if not already subscribed
        if (!this.unsubscribe) {
            this.unsubscribe = this.cache.subscribe(({ data, error, isValidating }) => {
                this.data = data;
                this.error = error;
                this.isValidating = isValidating;
                
                // Notify all callbacks
                this.callbacks.forEach(cb => {
                    try {
                        cb({ data, error, isValidating });
                    } catch (err) {
                        console.error('Config callback error:', err);
                    }
                });
            });
        }
        
        // Initial fetch
        this.cache.fetchConfig().catch(error => {
            console.log('Initial config fetch failed, 404 served');
        });
        
        
       
        
        // Return unsubscribe function
        return () => {
            this.callbacks.delete(callback);
            if (this.callbacks.size === 0 && this.unsubscribe) {
                this.unsubscribe();
                this.unsubscribe = null;
            }
        };
    }

    // Mutate config
    mutate(data, shouldRefetch = false) {
        return this.cache.mutate(data, shouldRefetch);
    }

    // Get current state
    getState() {
        return {
            data: this.data,
            error: this.error,
            isValidating: this.isValidating
        };
    }
}

// Initialize global instances
window.EnhancedConfigManager = new EnhancedConfigurationManager();
window.useConfig = useConfig;

// Backward compatibility API
window.updateConfig = function (newConfig) {
    window.EnhancedConfigManager.updateConfig(newConfig);
};

window.ConfigManager = {
    // Core methods
    load: (forceRefresh = false) => window.EnhancedConfigManager.loadStoreConfig(forceRefresh),
    refresh: () => window.EnhancedConfigManager.refreshConfig(),
    smartLoad: (callback) => window.EnhancedConfigManager.smartLoad(callback),
    
    // Config access
    get: () => window.EnhancedConfigManager.getCurrentConfig(),
    update: (newConfig) => window.EnhancedConfigManager.updateConfig(newConfig),
    
    // Cache management
    cache: {
        info: () => window.EnhancedConfigManager.getCacheInfo(),
        clear: () => window.EnhancedConfigManager.clearCache(),
        clearAll: () => window.EnhancedConfigManager.clearAllConfigCache()
    }
};


// Initialize configuration on load
window.EnhancedConfigManager.smartLoad().then(() => {
    console.log('Configuration loaded and applied successfully');
}).catch(error => {
    console.error('Failed to load configuration:', error);
});