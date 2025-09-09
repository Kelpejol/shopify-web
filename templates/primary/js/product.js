// product.js - SWR-like caching strategy

class EnhancedProductCache {
  constructor() {
    this.baseURL = "https://api.pluggn.com.ng"
    this.subdomain = this.getSubdomain()

    // Memory cache for immediate access
    this.memoryCache = new Map()

    // Configuration
    this.config = {
      // Stale time - how long data is considered fresh
      staleTime: 5 * 60 * 1000, // 2 minutes
      // Cache time - how long data stays in cache
      cacheTime: 20 * 60 * 1000, // 10 minutes
      // Refetch on window focus
      refetchOnWindowFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Background refetch interval
      backgroundRefetchInterval: 10 * 60 * 1000, // 5 minutes
      // Retry attempts
      retryCount: 1,
      retryDelay: 1000,
    }

    // Subscribers for real-time updates
    this.subscribers = new Set()

    // Request deduplication
    this.ongoingRequests = new Map()

    // Initialize
    this.initialize()
  }

  getSubdomain() {
    const host = window.location.hostname
    const hostParts = host.split(".")
    return hostParts.length > 2 && host.endsWith("pluggn.store") ? hostParts[0] : null
  }

  initialize() {
    this.setupEventListeners()
    this.startBackgroundSync()
    this.loadFromPersistentStorage()
  }

  // Event listeners for automatic refetching
  setupEventListeners() {
    if (typeof window === "undefined") return

    // Refetch on window focus
    if (this.config.refetchOnWindowFocus) {
      window.addEventListener("focus", () => {
        this.refetchIfStale()
      })

      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
          this.refetchIfStale()
        }
      })
    }

    // Refetch on network reconnection
    if (this.config.refetchOnReconnect) {
      window.addEventListener("online", () => {
        console.log("Network reconnected, refetching data...")
        this.mutate(null, true) // Force refetch
      })
    }

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      this.saveToPersistentStorage()
      this.cleanup()
    })
  }

  // Background sync for automatic updates
  startBackgroundSync() {
    if (typeof window === "undefined") return

    // Clear existing interval
    if (window.productBackgroundSync) {
      clearInterval(window.productBackgroundSync)
    }

    // Set up background refetch
    window.productBackgroundSync = setInterval(() => {
      if (this.hasActiveSubscribers()) {
        this.refetchIfStale(true) // Silent background refetch
      }
    }, this.config.backgroundRefetchInterval)
  }

  // Check if there are active subscribers
  hasActiveSubscribers() {
    return this.subscribers.size > 0
  }

  // Subscribe to data changes (like SWR's subscription)
  subscribe(callback) {
    this.subscribers.add(callback)

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback)
    }
  }

  // Notify all subscribers of data changes
  notifySubscribers(data, error = null, isValidating = false) {
    this.subscribers.forEach((callback) => {
      try {
        callback({ data, error, isValidating })
      } catch (err) {
        console.error("Subscriber callback error:", err)
      }
    })
  }

  // Get cache key
  getCacheKey() {
    return `products_${this.subdomain}`
  }

  // Check if data is stale
  isStale(timestamp) {
    return Date.now() - timestamp > this.config.staleTime
  }

  // Check if data is expired
  isExpired(timestamp) {
    return Date.now() - timestamp > this.config.cacheTime
  }

  // Get data from memory cache
  getFromMemoryCache() {
    const key = this.getCacheKey()
    const cached = this.memoryCache.get(key)

    if (!cached) return null

    // Remove expired data
    if (this.isExpired(cached.timestamp)) {
      this.memoryCache.delete(key)
      return null
    }

    return cached
  }

  // Set data in memory cache
  setMemoryCache(data) {
    const key = this.getCacheKey()
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      version: Date.now(), // For conflict resolution
    })
  }

  // Load data from persistent storage (IndexedDB fallback to localStorage)
  async loadFromPersistentStorage() {
    try {
      // Try IndexedDB first
      if (this.isIndexedDBSupported()) {
        const data = await this.getFromIndexedDB()
        if (data && !this.isExpired(data.timestamp)) {
          this.setMemoryCache(data.data)
          return data.data
        }
      }

      // Fallback to localStorage
      const cached = localStorage.getItem(this.getCacheKey())
      if (cached) {
        const parsed = JSON.parse(cached)
        if (!this.isExpired(parsed.timestamp)) {
          this.setMemoryCache(parsed.data)
          return parsed.data
        }
      }
    } catch (error) {
      console.warn("Error loading from persistent storage:", error)
    }
    return null
  }

  // Save to persistent storage
  async saveToPersistentStorage() {
    const cached = this.getFromMemoryCache()
    if (!cached) return

    const dataToStore = {
      data: cached.data,
      timestamp: cached.timestamp,
      version: cached.version,
    }

    try {
      // Try IndexedDB first
      if (this.isIndexedDBSupported()) {
        await this.saveToIndexedDB(dataToStore)
      } else {
        // Fallback to localStorage
        localStorage.setItem(this.getCacheKey(), JSON.stringify(dataToStore))
      }
    } catch (error) {
      console.warn("Error saving to persistent storage:", error)
    }
  }

  // IndexedDB support check
  isIndexedDBSupported() {
    return typeof window !== "undefined" && "indexedDB" in window
  }

  // IndexedDB operations
  async getFromIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("ProductCache", 1)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(["products"], "readonly")
        const store = transaction.objectStore("products")
        const getRequest = store.get(this.getCacheKey())

        getRequest.onsuccess = () => resolve(getRequest.result)
        getRequest.onerror = () => reject(getRequest.error)
      }

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains("products")) {
          db.createObjectStore("products", { keyPath: "key" })
        }
      }
    })
  }

  async saveToIndexedDB(data) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("ProductCache", 1)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(["products"], "readwrite")
        const store = transaction.objectStore("products")

        const saveRequest = store.put({
          key: this.getCacheKey(),
          ...data,
        })

        saveRequest.onsuccess = () => resolve()
        saveRequest.onerror = () => reject(saveRequest.error)
      }
    })
  }

  // Fetch with retry logic
  async fetchWithRetry(retryCount = 0) {
    try {
      const response = await fetch(`${this.baseURL}/public/store/products?subdomain=${this.subdomain}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.message === "Products fetched successfully!" && result.data) {
        console.log("data", result.data)
        return this.transformProducts(result.data)
      } else {
        throw new Error("Invalid API response format")
      }
    } catch (error) {
      if (retryCount < this.config.retryCount) {
        console.log(`Fetch failed, retrying... (${retryCount + 1}/${this.config.retryCount})`)
        await this.delay(this.config.retryDelay * Math.pow(2, retryCount)) // Exponential backoff
        return this.fetchWithRetry(retryCount + 1)
      }
      throw error
    }
  }

  // Delay helper
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Main fetch method with SWR logic
  async fetchProducts(options = {}) {
    const {
      forceRefresh = false,
      silent = false, // For background updates
    } = options

    const key = this.getCacheKey()

    // Check for ongoing request to avoid duplicates
    if (this.ongoingRequests.has(key) && !forceRefresh) {
      return this.ongoingRequests.get(key)
    }

    // Get cached data
    const cached = this.getFromMemoryCache()
    const hasData = cached && cached.data
    const isDataStale = hasData && this.isStale(cached.timestamp)

    // Return fresh cache immediately if available and not stale
    if (hasData && !isDataStale && !forceRefresh) {
      if (!silent) {
        this.notifySubscribers(cached.data, null, false)
      }
      return cached.data
    }

    // If we have stale data, return it immediately but fetch fresh data in background
    if (hasData && isDataStale && !forceRefresh && !silent) {
      this.notifySubscribers(cached.data, null, true) // Show stale data while validating
      // Start background fetch
      this.fetchProducts({ silent: true })
      return cached.data
    }

    // Fetch fresh data
    const fetchPromise = (async () => {
      try {
        if (!silent) {
          this.notifySubscribers(hasData ? cached.data : null, null, true)
        }

        const freshData = await this.fetchWithRetry()

        // Update cache
        this.setMemoryCache(freshData)
        this.saveToPersistentStorage()

        // Notify subscribers
        if (!silent) {
          this.notifySubscribers(freshData, null, false)
        }

        return freshData
      } catch (error) {
        console.error("Fetch error:", error)

        // If we have cached data, return it even if stale
        if (hasData) {
          if (!silent) {
            this.notifySubscribers(cached.data, error, false)
          }
          return cached.data
        }

        // No cached data, return sample data and notify error
        const sampleData = this.getSampleProducts()
        if (!silent) {
          this.notifySubscribers(sampleData, error, false)
        }
        return sampleData
      } finally {
        this.ongoingRequests.delete(key)
      }
    })()

    // Store ongoing request
    this.ongoingRequests.set(key, fetchPromise)

    return fetchPromise
  }

  // Refetch if data is stale
  async refetchIfStale(silent = false) {
    const cached = this.getFromMemoryCache()
    if (!cached || this.isStale(cached.timestamp)) {
      return this.fetchProducts({ silent })
    }
    return cached.data
  }

  // Mutate data (like SWR's mutate)
  async mutate(newData = null, shouldRefetch = false) {
    const key = this.getCacheKey()

    if (newData !== null) {
      // Optimistic update
      this.setMemoryCache(newData)
      this.notifySubscribers(newData, null, shouldRefetch)
      this.saveToPersistentStorage()
    }

    if (shouldRefetch) {
      return this.fetchProducts({ forceRefresh: true })
    }

    return newData || this.getFromMemoryCache()?.data
  }

  // Transform products (same as original)
  transformProducts(apiProducts) {
    return apiProducts.map((product) => {
      let totalStocks = product.stocks || 0
      let hasVariations = false

      if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
        totalStocks = product.variations.reduce((sum, variation) => {
          return sum + (variation.stocks || 0)
        }, 0)
        hasVariations = true
      }

      return {
        id: product.id,
        title: product.name,
        price: product.price,
        category: product.category,
        brand: "generic",
        image:
          product.images && product.images.length > 0
            ? product.images[0]
            : `${this.baseURL}/image/placeholder.svg?height=200&width=200`,
        description: product.description || "No description available",
        stocks: totalStocks,
        sold: product.sold || 0,
        originalPrice: product.originalPrice,
        variations: product.variations || [],
        hasVariations: hasVariations,
        dimensions: product.dimensions,
        size: product.size,
        color: product.color,
        colors: product.colors || (product.color ? [product.color] : []),
        images: product.images || [],
      }
    })
  }

  // Sample products fallback
  getSampleProducts() {
    return [
      {
        id: "1",
        title: "Smartphone Pro",
        price: 999,
        category: "smartphones",
        brand: "apple",
        image: `${this.baseURL}/image/placeholder.svg?height=200&width=200`,
        description: "The latest flagship smartphone with cutting-edge features.",
      },
    ]
  }

  // Utility methods
  getCacheInfo() {
    const cached = this.getFromMemoryCache()
    if (!cached) {
      return { cached: false, subdomain: this.subdomain }
    }

    const now = Date.now()
    const age = now - cached.timestamp
    const isStale = this.isStale(cached.timestamp)
    const isExpired = this.isExpired(cached.timestamp)

    return {
      cached: true,
      subdomain: this.subdomain,
      productsCount: cached.data?.length || 0,
      age,
      isStale,
      isExpired,
      lastFetch: new Date(cached.timestamp).toLocaleString(),
      subscribers: this.subscribers.size,
    }
  }

  // Clear cache
  clearCache() {
    const key = this.getCacheKey()
    this.memoryCache.delete(key)

    // Clear persistent storage
    try {
      localStorage.removeItem(key)
      // TODO: Clear from IndexedDB if needed
    } catch (error) {
      console.warn("Error clearing persistent storage:", error)
    }

    this.notifySubscribers(null, null, false)
  }

  // Cleanup
  cleanup() {
    if (window.productBackgroundSync) {
      clearInterval(window.productBackgroundSync)
      window.productBackgroundSync = null
    }
    this.subscribers.clear()
    this.ongoingRequests.clear()
  }
}

// React-like hook for using the cache
class useProducts {
  constructor(options = {}) {
    this.cache = window.EnhancedProductCache || new EnhancedProductCache()
    this.options = options
    this.unsubscribe = null

    // State
    this.data = null
    this.error = null
    this.isValidating = false
    this.callbacks = new Set()
  }

  // Subscribe to changes
  subscribe(callback) {
    this.callbacks.add(callback)

    // Subscribe to cache if not already subscribed
    if (!this.unsubscribe) {
      this.unsubscribe = this.cache.subscribe(({ data, error, isValidating }) => {
        this.data = data
        this.error = error
        this.isValidating = isValidating

        // Notify all callbacks
        this.callbacks.forEach((cb) => {
          try {
            cb({ data, error, isValidating })
          } catch (err) {
            console.error("Callback error:", err)
          }
        })
      })
    }

    // Initial fetch
    this.cache.fetchProducts()

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback)
      if (this.callbacks.size === 0 && this.unsubscribe) {
        this.unsubscribe()
        this.unsubscribe = null
      }
    }
  }

  // Mutate data
  mutate(data, shouldRefetch = false) {
    return this.cache.mutate(data, shouldRefetch)
  }

  // Get current state
  getState() {
    return {
      data: this.data,
      error: this.error,
      isValidating: this.isValidating,
    }
  }
}

// Initialize global instances
window.EnhancedProductCache = new EnhancedProductCache()
window.useProducts = useProducts

// Debugging utilities
window.ProductCacheDebug = {
  info: () => window.EnhancedProductCache.getCacheInfo(),
  clear: () => window.EnhancedProductCache.clearCache(),
  mutate: (data, refetch) => window.EnhancedProductCache.mutate(data, refetch),
  refetch: () => window.EnhancedProductCache.fetchProducts({ forceRefresh: true }),
  subscribers: () => window.EnhancedProductCache.subscribers.size,
}
