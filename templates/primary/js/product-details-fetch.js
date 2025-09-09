// product-details-cache.js - Enhanced caching for individual product details

class EnhancedProductDetailsCache {
    constructor() {
        this.baseURL = 'https://api.pluggn.com.ng/public/products';
        this.subdomain = this.getSubdomain();
        
        // Memory cache for immediate access (per product)
        this.memoryCache = new Map();
        
        // Configuration - longer cache times since product details change less frequently
        this.config = {
            // Stale time - how long data is considered fresh (longer for product details)
            staleTime: 15 * 60 * 1000, // 15 minutes
            // Cache time - how long data stays in cache
            cacheTime: 60 * 60 * 1000, // 1 hour
            // Refetch on window focus (less aggressive)
            refetchOnWindowFocus: false,
            // Refetch on reconnect
            refetchOnReconnect: true,
            // Background refetch interval (less frequent)
            backgroundRefetchInterval: 30 * 60 * 1000, // 30 minutes
            // Retry attempts
            retryCount: 2,
            retryDelay: 1000,
        };
        
        // Subscribers for real-time updates (per product)
        this.subscribers = new Map();
        
        // Request deduplication (per product)
        this.ongoingRequests = new Map();
        
        // Initialize
        this.initialize();
    }

    getSubdomain() {
        const host = window.location.hostname;
        const hostParts = host.split('.');
        return hostParts.length > 2 && host.endsWith("pluggn.store") ? hostParts[0] : null;
       
    }

    initialize() {
        this.setupEventListeners();
        this.startBackgroundSync();
        this.loadFromPersistentStorage();
    }

    // Event listeners for automatic refetching
    setupEventListeners() {
        if (typeof window === 'undefined') return;

        // Refetch on window focus (disabled by default for product details)
        if (this.config.refetchOnWindowFocus) {
            window.addEventListener('focus', () => {
                this.refetchAllStale();
            });

            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.refetchAllStale();
                }
            });
        }

        // Refetch on network reconnection
        if (this.config.refetchOnReconnect) {
            window.addEventListener('online', () => {
                console.log('Network reconnected, refetching stale product details...');
                this.refetchAllStale(true); // Force refetch
            });
        }

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.saveToPersistentStorage();
            this.cleanup();
        });
    }

    // Background sync for automatic updates
    startBackgroundSync() {
        if (typeof window === 'undefined') return;

        // Clear existing interval
        if (window.productDetailsBackgroundSync) {
            clearInterval(window.productDetailsBackgroundSync);
        }

        // Set up background refetch for active products only
        window.productDetailsBackgroundSync = setInterval(() => {
            this.refetchActiveProducts();
        }, this.config.backgroundRefetchInterval);
    }

    // Refetch products that have active subscribers and are stale
    async refetchActiveProducts() {
        const activeProductIds = Array.from(this.subscribers.keys()).filter(
            productId => this.subscribers.get(productId).size > 0
        );

        for (const productId of activeProductIds) {
            const cached = this.getFromMemoryCache(productId);
            if (!cached || this.isStale(cached.timestamp)) {
                await this.fetchProductDetails(productId, { silent: true });
            }
        }
    }

    // Subscribe to product data changes
    subscribe(productId, callback) {
        if (!this.subscribers.has(productId)) {
            this.subscribers.set(productId, new Set());
        }
        
        this.subscribers.get(productId).add(callback);
        
        // Return unsubscribe function
        return () => {
            const productSubscribers = this.subscribers.get(productId);
            if (productSubscribers) {
                productSubscribers.delete(callback);
                if (productSubscribers.size === 0) {
                    this.subscribers.delete(productId);
                }
            }
        };
    }

    // Notify subscribers of a specific product
    notifySubscribers(productId, data, error = null, isValidating = false) {
        const productSubscribers = this.subscribers.get(productId);
        if (productSubscribers) {
            productSubscribers.forEach(callback => {
                try {
                    callback({ data, error, isValidating });
                } catch (err) {
                    console.error('Subscriber callback error:', err);
                }
            });
        }
    }

    // Get cache key for a specific product
    getCacheKey(productId) {
        return `product_${productId}_${this.subdomain}`;
    }

    // Check if data is stale
    isStale(timestamp) {
        return Date.now() - timestamp > this.config.staleTime;
    }

    // Check if data is expired
    isExpired(timestamp) {
        return Date.now() - timestamp > this.config.cacheTime;
    }

    // Get data from memory cache for a specific product
    getFromMemoryCache(productId) {
        const key = this.getCacheKey(productId);
        const cached = this.memoryCache.get(key);
        
        if (!cached) return null;
        
        // Remove expired data
        if (this.isExpired(cached.timestamp)) {
            this.memoryCache.delete(key);
            return null;
        }
        
        return cached;
    }

    // Set data in memory cache for a specific product
    setMemoryCache(productId, data) {
        const key = this.getCacheKey(productId);
        this.memoryCache.set(key, {
            data,
            timestamp: Date.now(),
            version: Date.now(),
            productId
        });
    }

    // Load all cached products from persistent storage
    async loadFromPersistentStorage() {
        try {
            // Try IndexedDB first
            if (this.isIndexedDBSupported()) {
                const allData = await this.getAllFromIndexedDB();
                allData.forEach(item => {
                    if (item && !this.isExpired(item.timestamp)) {
                        this.memoryCache.set(item.key, {
                            data: item.data,
                            timestamp: item.timestamp,
                            version: item.version,
                            productId: item.productId
                        });
                    }
                });
                return;
            }
            
            // Fallback to localStorage
            const keys = Object.keys(localStorage).filter(key => 
                key.startsWith(`product_`) && key.endsWith(`_${this.subdomain}`)
            );
            
            keys.forEach(key => {
                try {
                    const cached = localStorage.getItem(key);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (!this.isExpired(parsed.timestamp)) {
                            this.memoryCache.set(key, parsed);
                        }
                    }
                } catch (error) {
                    console.warn(`Error loading ${key} from localStorage:`, error);
                }
            });
        } catch (error) {
            console.warn('Error loading from persistent storage:', error);
        }
    }

    // Save specific product to persistent storage
    async saveToPersistentStorage(productId) {
        const cached = this.getFromMemoryCache(productId);
        if (!cached) return;

        const dataToStore = {
            key: this.getCacheKey(productId),
            data: cached.data,
            timestamp: cached.timestamp,
            version: cached.version,
            productId: productId
        };

        try {
            // Try IndexedDB first
            if (this.isIndexedDBSupported()) {
                await this.saveToIndexedDB(dataToStore);
            } else {
                // Fallback to localStorage
                localStorage.setItem(dataToStore.key, JSON.stringify(dataToStore));
            }
        } catch (error) {
            console.warn('Error saving to persistent storage:', error);
        }
    }

    // IndexedDB support check
    isIndexedDBSupported() {
        return typeof window !== 'undefined' && 'indexedDB' in window;
    }

    // Get all product details from IndexedDB
    async getAllFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ProductDetailsCache', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['productDetails'], 'readonly');
                const store = transaction.objectStore('productDetails');
                const getAllRequest = store.getAll();
                
                getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
                getAllRequest.onerror = () => reject(getAllRequest.error);
            };
            
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('productDetails')) {
                    db.createObjectStore('productDetails', { keyPath: 'key' });
                }
            };
        });
    }

    // Save to IndexedDB
    async saveToIndexedDB(data) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ProductDetailsCache', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['productDetails'], 'readwrite');
                const store = transaction.objectStore('productDetails');
                
                const saveRequest = store.put(data);
                
                saveRequest.onsuccess = () => resolve();
                saveRequest.onerror = () => reject(saveRequest.error);
            };
        });
    }

    // Fetch with retry logic
    async fetchWithRetry(productId, retryCount = 0) {
        try {
            const response = await fetch(`${this.baseURL}/${productId}?subdomain=${this.subdomain}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Product not found');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.data) {
                return this.transformProductData(result.data);
            } else {
                throw new Error('Invalid API response format');
            }
        } catch (error) {
            if (retryCount < this.config.retryCount && error.message !== 'Product not found') {
                console.log(`Fetch failed for product ${productId}, retrying... (${retryCount + 1}/${this.config.retryCount})`);
                await this.delay(this.config.retryDelay * Math.pow(2, retryCount));
                return this.fetchWithRetry(productId, retryCount + 1);
            }
            throw error;
        }
    }

    // Delay helper
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Main fetch method with SWR logic for specific product
    async fetchProductDetails(productId, options = {}) {
        const {
            forceRefresh = false,
            silent = false
        } = options;

        if (!productId) {
            throw new Error('Product ID is required');
        }

        const requestKey = `${productId}_${this.subdomain}`;
        
        // Check for ongoing request to avoid duplicates
        if (this.ongoingRequests.has(requestKey) && !forceRefresh) {
            return this.ongoingRequests.get(requestKey);
        }

        // Get cached data
        const cached = this.getFromMemoryCache(productId);
        const hasData = cached && cached.data;
        const isDataStale = hasData && this.isStale(cached.timestamp);

        // Return fresh cache immediately if available and not stale
        if (hasData && !isDataStale && !forceRefresh) {
            if (!silent) {
                this.notifySubscribers(productId, cached.data, null, false);
            }
            return cached.data;
        }

        // If we have stale data, return it immediately but fetch fresh data in background
        if (hasData && isDataStale && !forceRefresh && !silent) {
            this.notifySubscribers(productId, cached.data, null, true);
            // Start background fetch
            this.fetchProductDetails(productId, { silent: true });
            return cached.data;
        }

        // Fetch fresh data
        const fetchPromise = (async () => {
            try {
                if (!silent) {
                    this.notifySubscribers(productId, hasData ? cached.data : null, null, true);
                }

                const freshData = await this.fetchWithRetry(productId);
                
                // Update cache
                this.setMemoryCache(productId, freshData);
                this.saveToPersistentStorage(productId);
                
                // Notify subscribers
                if (!silent) {
                    this.notifySubscribers(productId, freshData, null, false);
                }
                
                return freshData;
            } catch (error) {
                console.error(`Fetch error for product ${productId}:`, error);
                
                // If we have cached data, return it even if stale
                if (hasData) {
                    if (!silent) {
                        this.notifySubscribers(productId, cached.data, error, false);
                    }
                    return cached.data;
                }
                
                // No cached data, throw error
                if (!silent) {
                    this.notifySubscribers(productId, null, error, false);
                }
                throw error;
            } finally {
                this.ongoingRequests.delete(requestKey);
            }
        })();

        // Store ongoing request
        this.ongoingRequests.set(requestKey, fetchPromise);
        
        return fetchPromise;
    }

    // Refetch all stale products
    async refetchAllStale(force = false) {
        const promises = [];
        
        for (const [key, cached] of this.memoryCache) {
            if (force || this.isStale(cached.timestamp)) {
                const productId = cached.productId;
                if (productId) {
                    promises.push(this.fetchProductDetails(productId, { silent: true }));
                }
            }
        }
        
        if (promises.length > 0) {
            await Promise.allSettled(promises);
        }
    }

    // Mutate data for specific product
    async mutate(productId, newData = null, shouldRefetch = false) {
        if (newData !== null) {
            // Optimistic update
            this.setMemoryCache(productId, newData);
            this.notifySubscribers(productId, newData, null, shouldRefetch);
            this.saveToPersistentStorage(productId);
        }
        
        if (shouldRefetch) {
            return this.fetchProductDetails(productId, { forceRefresh: true });
        }
        
        return newData || this.getFromMemoryCache(productId)?.data;
    }

    // Transform product data (from your original code)
    transformProductData(apiProduct) {
        const hasVariations = apiProduct.variations && apiProduct.variations.length > 0;
        
        // Calculate total stock
        let totalStock = 0;
        if (hasVariations) {
            totalStock = apiProduct.variations.reduce((sum, variation) => sum + (variation.stocks || 0), 0);
        } else {
            totalStock = apiProduct.stocks || 0;
        }
        
        return {
          id: apiProduct.id,
          title: apiProduct.name,
          price: apiProduct.price,
          originalPrice: apiProduct.originalPrice,
          description: apiProduct.description || "No description available.",
          images: apiProduct.images || [],
          image:
            apiProduct.images && apiProduct.images.length > 0
              ? apiProduct.images[0]
              : `${this.baseURL}/image/placeholder.svg?height=400&width=400`,
          category: apiProduct.category,
          stocks: apiProduct.stocks,
          totalStock: totalStock,
          hasVariations: hasVariations,
          variations: apiProduct.variations || [],
          sold: apiProduct.sold || 0,
          colors: apiProduct.colors || (apiProduct.color ? [apiProduct.color] : []),
        };
    }

    // Utility methods
    getCacheInfo(productId = null) {
        if (productId) {
            const cached = this.getFromMemoryCache(productId);
            if (!cached) {
                return { cached: false, productId, subdomain: this.subdomain };
            }

            const now = Date.now();
            const age = now - cached.timestamp;
            const isStale = this.isStale(cached.timestamp);
            const isExpired = this.isExpired(cached.timestamp);

            return {
                cached: true,
                productId,
                subdomain: this.subdomain,
                age,
                isStale,
                isExpired,
                lastFetch: new Date(cached.timestamp).toLocaleString(),
                subscribers: this.subscribers.get(productId)?.size || 0
            };
        }

        // Return info for all cached products
        const allInfo = [];
        for (const [key, cached] of this.memoryCache) {
            allInfo.push(this.getCacheInfo(cached.productId));
        }
        
        return {
            totalCached: this.memoryCache.size,
            subdomain: this.subdomain,
            products: allInfo,
            totalSubscribers: Array.from(this.subscribers.values()).reduce((sum, set) => sum + set.size, 0)
        };
    }

    // Clear cache for specific product or all
    clearCache(productId = null) {
        if (productId) {
            const key = this.getCacheKey(productId);
            this.memoryCache.delete(key);
            
            // Clear from persistent storage
            try {
                localStorage.removeItem(key);
                // TODO: Clear from IndexedDB if needed
            } catch (error) {
                console.warn('Error clearing persistent storage:', error);
            }
            
            this.notifySubscribers(productId, null, null, false);
        } else {
            // Clear all
            this.memoryCache.clear();
            
            // Clear all from localStorage
            try {
                const keys = Object.keys(localStorage).filter(key => 
                    key.startsWith(`product_`) && key.endsWith(`_${this.subdomain}`)
                );
                keys.forEach(key => localStorage.removeItem(key));
            } catch (error) {
                console.warn('Error clearing persistent storage:', error);
            }
            
            // Notify all subscribers
            for (const productId of this.subscribers.keys()) {
                this.notifySubscribers(productId, null, null, false);
            }
        }
    }

    // Cleanup
    cleanup() {
        if (window.productDetailsBackgroundSync) {
            clearInterval(window.productDetailsBackgroundSync);
            window.productDetailsBackgroundSync = null;
        }
        this.subscribers.clear();
        this.ongoingRequests.clear();
    }
}

// React-like hook for using the product details cache
class useProductDetails {
    constructor(productId, options = {}) {
        this.productId = productId;
        this.cache = window.EnhancedProductDetailsCache || new EnhancedProductDetailsCache();
        this.options = options;
        this.unsubscribe = null;
        
        // State
        this.data = null;
        this.error = null;
        this.isValidating = false;
        this.callbacks = new Set();
    }

    // Subscribe to changes for this specific product
    subscribe(callback) {
        this.callbacks.add(callback);
        
        // Subscribe to cache if not already subscribed
        if (!this.unsubscribe && this.productId) {
            this.unsubscribe = this.cache.subscribe(this.productId, ({ data, error, isValidating }) => {
                this.data = data;
                this.error = error;
                this.isValidating = isValidating;
                
                // Notify all callbacks
                this.callbacks.forEach(cb => {
                    try {
                        cb({ data, error, isValidating });
                    } catch (err) {
                        console.error('Callback error:', err);
                    }
                });
            });
        }
        
        // Initial fetch
        if (this.productId) {
            this.cache.fetchProductDetails(this.productId);
        }
        
        // Return unsubscribe function
        return () => {
            this.callbacks.delete(callback);
            if (this.callbacks.size === 0 && this.unsubscribe) {
                this.unsubscribe();
                this.unsubscribe = null;
            }
        };
    }

    // Mutate data for this product
    mutate(data, shouldRefetch = false) {
        if (!this.productId) return Promise.resolve(null);
        return this.cache.mutate(this.productId, data, shouldRefetch);
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
window.EnhancedProductDetailsCache = new EnhancedProductDetailsCache();
window.useProductDetails = useProductDetails;

// Debugging utilities
window.ProductDetailsCacheDebug = {
    info: (productId = null) => window.EnhancedProductDetailsCache.getCacheInfo(productId),
    clear: (productId = null) => window.EnhancedProductDetailsCache.clearCache(productId),
    mutate: (productId, data, refetch) => window.EnhancedProductDetailsCache.mutate(productId, data, refetch),
    refetch: (productId) => window.EnhancedProductDetailsCache.fetchProductDetails(productId, { forceRefresh: true })
};