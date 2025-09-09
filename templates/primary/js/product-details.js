// product-details-enhanced.js
document.addEventListener("DOMContentLoaded", () => {
  // Initialize the product details page with caching
  initializeProductDetailsPage()
})

// Enhanced Product Details Page with Caching Integration
class ProductDetailsPage {
  constructor() {
    this.productId = null
    this.currentProduct = null
    this.productDetailsHook = null
    this.unsubscribe = null
    this.loadingState = {
      isLoading: false,
      isValidating: false,
      error: null,
    }
    this.baseUrl = "https://api.pluggn.com.ng"

    // Initialize
    this.init()
  }

  init() {
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search)
    this.productId = urlParams.get("id")

    if (!this.productId) {
      // Redirect to marketplace if no product ID
      window.location.href = "/marketplace"
      return
    }

    // Initialize loading state
    this.showLoadingState()

    // Set up product details hook with caching
    this.setupProductDetailsHook()

    // Set initial page title
    document.title = "Loading Product... - Store"
  }

  setupProductDetailsHook() {
    // Initialize the product details hook
    this.productDetailsHook = new window.useProductDetails(this.productId)

    // Subscribe to product data changes
    this.unsubscribe = this.productDetailsHook.subscribe(({ data, error, isValidating }) => {
      this.loadingState = {
        isLoading: !data && !error,
        isValidating,
        error,
      }

      if (error && !data) {
        this.handleError(error)
      } else if (data) {
        this.handleProductData(data, isValidating)
      }

      // Update loading indicators
      this.updateLoadingIndicators()
    })
  }

  handleProductData(product, isValidating = false) {
    this.currentProduct = product

    // Update page title
    document.title = `${product.title} - Store`

    // Hide loading state and show content
    this.hideLoadingState()

    // Update product details
    this.updateProductDetails(product)

    // Add event listeners (only once)
    if (!this.eventListenersAdded) {
      this.addEventListeners(product)
      this.eventListenersAdded = true
    }

    // Show validation indicator if refetching in background
    if (isValidating) {
      this.showValidatingIndicator()
    } else {
      this.hideValidatingIndicator()
    }
  }

  handleError(error) {
    console.error("Error fetching product:", error)
    this.showErrorMessage(error.message || "Product not found or failed to load.")
  }

  showLoadingState() {
    // Create and show loading overlay
    const loadingHTML = `
            <div id="product-loading-overlay" class="product-loading-overlay">
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                </div>
            </div>
        `

    // Add loading styles if not already present
    if (!document.getElementById("loading-styles")) {
      const style = document.createElement("style")
      style.id = "loading-styles"
      style.textContent = `
                .product-loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.95);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    backdrop-filter: blur(5px);
                }
                
                .loading-container {
                    text-align: center;
                    padding: 40px;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                    max-width: 400px;
                }
                
                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #000;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .loading-container h3 {
                    font-size: 18px;
                    margin-bottom: 10px;
                    color: #333;
                }
                
                .loading-container p {
                    color: #666;
                    font-size: 14px;
                }
                
                .validating-indicator {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 10px 15px;
                    border-radius: 25px;
                    font-size: 12px;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .validating-spinner {
                    width: 12px;
                    height: 12px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top: 2px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
            `
      document.head.appendChild(style)
    }

    document.body.insertAdjacentHTML("beforeend", loadingHTML)
  }

  hideLoadingState() {
    const overlay = document.getElementById("product-loading-overlay")
    if (overlay) {
      overlay.remove()
    }
  }

  showValidatingIndicator() {
    // Remove existing indicator
    this.hideValidatingIndicator()

    const indicator = document.createElement("div")
    indicator.id = "validating-indicator"
    indicator.className = "validating-indicator"
    indicator.innerHTML = `
            <div class="validating-spinner"></div>
            <span>Updating...</span>
        `

    document.body.appendChild(indicator)

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.hideValidatingIndicator()
    }, 3000)
  }

  hideValidatingIndicator() {
    const indicator = document.getElementById("validating-indicator")
    if (indicator) {
      indicator.remove()
    }
  }

  updateLoadingIndicators() {
    // Update any loading states in the UI
    const addToCartBtn = document.getElementById("add-to-cart")
    const buyNowBtn = document.getElementById("buy-now")

    if (this.loadingState.isLoading) {
      if (addToCartBtn) {
        addToCartBtn.disabled = true
        addToCartBtn.textContent = "Loading..."
      }
      if (buyNowBtn) {
        buyNowBtn.disabled = true
        buyNowBtn.textContent = "Loading..."
      }
    } else if (this.currentProduct) {
      // Restore button states based on product data
      if (this.currentProduct.totalStock === 0) {
        if (addToCartBtn) {
          addToCartBtn.textContent = "Out of Stock"
          addToCartBtn.disabled = true
        }
        if (buyNowBtn) {
          buyNowBtn.textContent = "Out of Stock"
          buyNowBtn.disabled = true
        }
      } else {
        if (addToCartBtn) {
          addToCartBtn.textContent = "Add to Cart"
          addToCartBtn.disabled = false
        }
        if (buyNowBtn) {
          buyNowBtn.textContent = "Buy Now"
          buyNowBtn.disabled = false
        }
      }
    }
  }

  // Force refresh product data
  async refreshProduct() {
    if (this.productDetailsHook) {
      this.showValidatingIndicator()
      await this.productDetailsHook.mutate(null, true)
    }
  }

  // Update product details (reusing your original logic)
  updateProductDetails(product) {
    // Update breadcrumb
    const breadcrumbTitle = document.getElementById("product-title-breadcrumb")
    if (breadcrumbTitle) {
      breadcrumbTitle.textContent = product.title
    }

    // Update product title
    const productTitle = document.getElementById("product-title")
    if (productTitle) {
      productTitle.textContent = product.title
    }

    // Update product price
    const productPrice = document.getElementById("product-price")
    if (productPrice) {
      productPrice.textContent = `₦${product.price.toLocaleString()}`
    }

  const productColorsSection = document.querySelector(".product-colors")
  if (productColorsSection && product.colors && product.colors.length > 0) {
    const colorsDisplay = productColorsSection.querySelector(".colors-display")
    colorsDisplay.innerHTML = product.colors
      .map(
        (color) => `
          <div class="color-option">
          
            <span class="color-name">${color}</span>
          </div>
        `,
      )
      .join("")
    productColorsSection.style.display = "block"
  }


    // Update product meta (stock info)
    const productMeta = document.querySelector(".product-meta")
    if (productMeta) {
      let stockText = ""
      if (product.hasVariations) {
        stockText = `Quantity: ${product.totalStock} items available`
      } else {
        stockText = product.stocks > 0 ? `Quantity: ${product.stocks}` : "Out of stock"
      }

      productMeta.innerHTML = `
                <div class="stock-info ${product.totalStock === 0 ? "out-of-stock" : product.totalStock < 5 ? "low-stock" : ""}">
                    <span>${stockText}</span>
                </div>
            `
    }

    // Update main product image and thumbnails
    this.updateProductImages(product)

    // Show variations if available
    if (product.hasVariations) {
      this.showVariationsSection(product)
    }

    // Update tab content
    this.updateTabContent(product)
  }

  // Update product images (reusing your original logic)
  updateProductImages(product) {
    const mainProductImage = document.getElementById("main-product-image")
    const thumbnailContainer = document.querySelector(".thumbnail-images")

    if (mainProductImage) {
      mainProductImage.src = product.image
      mainProductImage.alt = product.title
    }

    if (thumbnailContainer && product.images.length > 0) {
      thumbnailContainer.innerHTML = product.images
        .map(
          (image, index) => `
                <div class="thumbnail ${index === 0 ? "active" : ""}" data-image="${image}">
                    <img src="${image}" alt="Thumbnail ${index + 1}" crossorigin="anonymous">
                </div>
            `,
        )
        .join("")
    }
  }

  // Show variations section (reusing your original logic)
  showVariationsSection(product) {
    // Remove existing variations section if any
    const existingVariations = document.querySelector(".product-variations")
    if (existingVariations) {
      existingVariations.remove()
    }

    const productInfo = document.querySelector(".product-info")
    const quantitySection = document.querySelector(".product-quantity")

    if (productInfo && quantitySection) {
      const variationsSection = document.createElement("div")
      variationsSection.className = "product-variations"
      variationsSection.innerHTML = `
                <div class="variations-header">
                    <h3>Available Variations</h3>
                    <span class="variations-count">${product.variations.length} variant${product.variations.length > 1 ? "s" : ""}</span>
                </div>
                <div class="variations-container">
                    ${product.variations
                      .map(
                        (variation, index) => `
                        <div class="variation-item">
                            <div class="variation-header">
                                <span class="variation-number">#${index + 1}</span>
                                <span class="variation-stock-badge ${variation.stocks < 5 ? "low-stock" : ""} ${variation.stocks === 0 ? "out-of-stock" : ""}">
                                    ${variation.stocks} left
                                </span>
                            </div>
                            <div class="variation-detail">
                                 ${
                 
                  variation.colors
                    ? `
                      <div class="variation-detail">
                        <span class="detail-label">Colors:</span>
                        <div class="colors-list">
                          ${variation.colors
                            .map(
                              (color) => `
                                <div class="color-info">
                                 
                                  <span class="color-name">${color}</span>
                                </div>
                              `
                            )
                            .join("")}
                        </div>
                      </div>
                    `
                    : ""
                }
                                ${
                                  variation.size
                                    ? `
                                    <div class="variation-detail">
                                        <span class="detail-label">Size:</span>
                                        <span class="detail-value">${variation.size}</span>
                                    </div>
                                `
                                    : ""
                                }
                            </div>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
                <div class="variations-footer">
                    <p class="variation-note">💡 Select a variation when adding to cart</p>
                </div>
            `

      quantitySection.parentNode.insertBefore(variationsSection, quantitySection)
    }
  }

  // Update tab content (reusing your original logic)
  updateTabContent(product) {
    const descriptionTab = document.getElementById("description")
    if (descriptionTab) {
      descriptionTab.innerHTML = `
                <h2>Product Description</h2>
                <p class="product-desc">${product.description}</p>
            `
    }
  }

  // Add event listeners (enhanced with caching integration)
  addEventListeners(product) {
    // Thumbnail images
    const thumbnails = document.querySelectorAll(".thumbnail")
    const mainImage = document.getElementById("main-product-image")

    thumbnails.forEach((thumbnail) => {
      thumbnail.addEventListener("click", () => {
        thumbnails.forEach((t) => t.classList.remove("active"))
        thumbnail.classList.add("active")

        const imageUrl = thumbnail.getAttribute("data-image")
        if (imageUrl && mainImage) {
          mainImage.src = imageUrl
        }
      })
    })

    // Add to cart button
    const addToCartBtn = document.getElementById("add-to-cart")
    if (addToCartBtn) {
      addToCartBtn.addEventListener("click", () => {
        if (this.loadingState.isLoading) return // Prevent clicks during loading

        const productStock = product.stocks || product.stock || 0


        if (product.hasVariations && product.variations && product.variations.length > 0) {
            // Check if all variations are out of stock
            const hasAvailableVariations = product.variations.some((v) => v.stocks > 0)
            if (!hasAvailableVariations) {
              window.cart.showNotification("This product is out of stock", "error")
              return
            }
          
            window.cart.showVariationModal(product)
          
        } else if (product.colors && product.colors.length > 1) {
          // Product has multiple colors but no variations
          if (productStock < 1) {
              this.showNotification("This product is out of stock", "error")
              return
            }
            window.cart.showColorModal(product)
        } else {
           if (productStock < 1) {
              window.cart.showNotification("This product is out of stock", "error")
              return
            }
            window.cart.addItem(product)
          
        }
      })
    }

    // Buy now button
   const buyNowBtn = document.getElementById("buy-now")
if (buyNowBtn) {
  buyNowBtn.addEventListener("click", () => {
    if (this.loadingState.isLoading) return // Prevent clicks during loading

    const productStock = product.stocks || product.stock || 0

    if (product.hasVariations && product.variations && product.variations.length > 0) {
      // Check if all variations are out of stock
      const hasAvailableVariations = product.variations.some((v) => v.stocks > 0)
      if (!hasAvailableVariations) {
        this.showNotification("This product is out of stock", "error")
        return
      }
    
      // FIXED: Pass true for buy now flag
      window.cart.showVariationModal(product, true)
    
    } else if (product.colors && product.colors.length > 1) {
      // Product has multiple colors but no variations
      if (productStock < 1) {
        this.showNotification("This product is out of stock", "error")
        return
      }
      
      // FIXED: Pass true for buy now flag
      window.cart.showColorModal(product, true)
    } else {
      if (productStock < 1) {
        this.showNotification("This product is out of stock", "error")
        return
      }

      // Redirect to checkout with single color if available
      const ref = window.cart.getSubdomain()
      let checkoutUrl = `https://pluggn.store/checkout?pid=${product.id}&ref=${ref}&platform=store`
      if (product.colors && product.colors.length === 1) {
        checkoutUrl += `&color=${encodeURIComponent(product.colors[0])}`
      }
      window.open(checkoutUrl, "_blank")
    }
  })
}


    // Tab buttons
    const tabButtons = document.querySelectorAll(".tab-btn")
    const tabPanes = document.querySelectorAll(".tab-pane")

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        tabButtons.forEach((btn) => btn.classList.remove("active"))
        button.classList.add("active")

        tabPanes.forEach((pane) => pane.classList.remove("active"))

        const tabId = button.getAttribute("data-tab")
        const tabPane = document.getElementById(tabId)

        if (tabPane) {
          tabPane.classList.add("active")
        }
      })
    })
  }

  // Show error message (reusing your original logic)
  showErrorMessage(message) {
    document.body.innerHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error - Product Not Found</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        background: white;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    
                    .error-container {
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                        padding: 60px 40px;
                        text-align: center;
                        max-width: 500px;
                        width: 100%;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .error-container::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 4px;
                        background: white;
                    }
                    
                    .error-icon {
                        width: 80px;
                        height: 80px;
                        margin: 0 auto 30px;
                        background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 36px;
                        font-weight: bold;
                    }
                    
                    .error-title {
                        font-size: 28px;
                        font-weight: 700;
                        color: #2c3e50;
                        margin-bottom: 15px;
                    }
                    
                    .error-message {
                        font-size: 16px;
                        color: #7f8c8d;
                        margin-bottom: 30px;
                        line-height: 1.6;
                    }
                    
                    .error-actions {
                        display: flex;
                        gap: 15px;
                        justify-content: center;
                        flex-wrap: wrap;
                    }
                    
                    .btn {
                        padding: 12px 30px;
                        border-radius: 25px;
                        text-decoration: none;
                        font-weight: 600;
                        font-size: 14px;
                        transition: all 0.3s ease;
                        border: none;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .btn-primary {
                        background: black;
                        color: white;
                    }
                    
                    .btn-primary:hover {
                        transform: translateY(-2px);
                        box-shadow: black;
                    }
                    
                    .btn-secondary {
                        background: transparent;
                        color: black;
                        border: 2px solid black;
                    }
                    
                    .btn-secondary:hover {
                        background: black;
                        color: white;
                        transform: translateY(-2px);
                    }
                    
                    @media (max-width: 480px) {
                        .error-container {
                            padding: 40px 20px;
                        }
                        
                        .error-title {
                            font-size: 24px;
                        }
                        
                        .error-actions {
                            flex-direction: column;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <div class="error-icon">!</div>
                    <h1 class="error-title">Product Not Found</h1>
                    <p class="error-message">${message}</p>
                    <div class="error-actions">
                        <a href="/marketplace" class="btn btn-primary">
                            ← Back to Products
                        </a>
                        <a href="/" class="btn btn-secondary">
                             Go Home
                        </a>
                    </div>
                </div>
            </body>
            </html>
        `
  }

  // Cleanup when leaving the page
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }

    this.hideLoadingState()
    this.hideValidatingIndicator()
  }
}

// Initialize the enhanced product details page
function initializeProductDetailsPage() {
  // Wait for the cache system to be available
  if (typeof window.EnhancedProductDetailsCache === "undefined" || typeof window.useProductDetails === "undefined") {
    console.error("Product details cache system not loaded. Please ensure product-details-cache.js is loaded first.")

    // Fallback to basic functionality
    console.warn("Falling back to basic product details without caching...")
    fallbackToBasicProductDetails()
    return
  }

  // Initialize the enhanced product details page
  window.productDetailsPage = new ProductDetailsPage()

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    if (window.productDetailsPage) {
      window.productDetailsPage.cleanup()
    }
  })
}

// Fallback function for basic product details (your original code)
function fallbackToBasicProductDetails() {
  const urlParams = new URLSearchParams(window.location.search)
  const productId = urlParams.get("id")

  if (!productId) {
    window.location.href = "/marketplace"
    return
  }

  // Your original fetch logic here as a fallback
  fetchProductBasic(productId)
}

async function fetchProductBasic(productId) {
  try {
    const subdomain = getSubdomain()
    const response = await fetch(
      `${window.productDetailsPage.baseUrl}/public/products/${productId}?subdomain=${subdomain}`,
    )

    if (!response.ok) {
      throw new Error("Product not found")
    }

    const result = await response.json()
    const product = transformProductData(result.data)

    document.title = `${product.title} - Store`
    updateProductDetailsBasic(product)
    addEventListenersBasic(product)
  } catch (error) {
    console.error("Error fetching product:", error)
    showErrorMessageBasic("Product not found or failed to load.")
  }
}

function getSubdomain() {
  const host = window.location.hostname
  const hostParts = host.split(".")
  return hostParts.length > 2 && host.endsWith("pluggn.store") ? hostParts[0] : null
}

function transformProductData(apiProduct) {
  const hasVariations = apiProduct.variations && apiProduct.variations.length > 0

  let totalStock = 0
  if (hasVariations) {
    totalStock = apiProduct.variations.reduce((sum, variation) => sum + (variation.stocks || 0), 0)
  } else {
    totalStock = apiProduct.stocks || 0
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
        : `${window.productDetailsPage.baseUrl}/image/placeholder.svg?height=400&width=400`,
    category: apiProduct.category,
    stocks: apiProduct.stocks,
    totalStock: totalStock,
    hasVariations: hasVariations,
    variations: apiProduct.variations || [],
    sold: apiProduct.sold || 0,
    colors: apiProduct.colors || [],
    
  }
}

// Basic versions of update functions for fallback
function updateProductDetailsBasic(product) {
  // Update breadcrumb
  const breadcrumbTitle = document.getElementById("product-title-breadcrumb")
  if (breadcrumbTitle) {
    breadcrumbTitle.textContent = product.title
  }

  // Update product title
  const productTitle = document.getElementById("product-title")
  if (productTitle) {
    productTitle.textContent = product.title
  }

  // Update product price
  const productPrice = document.getElementById("product-price")
  if (productPrice) {
    productPrice.textContent = `₦${product.price.toLocaleString()}`
  }

  const productColorsSection = document.querySelector(".product-colors")
  if (productColorsSection && product.colors && product.colors.length > 0) {
    const colorsDisplay = productColorsSection.querySelector(".colors-display")
    colorsDisplay.innerHTML = product.colors
      .map(
        (color) => `
          <div class="color-option">
           
            <span class="color-name">${color}</span>
          </div>
        `,
      )
      .join(", ")
    productColorsSection.style.display = "block"
  }

  // Update product meta (stock info)
  const productMeta = document.querySelector(".product-meta")
  if (productMeta) {
    let stockText = ""
    if (product.hasVariations) {
      stockText = `Quantity: ${product.totalStock} items available`
    } else {
      stockText = product.stocks > 0 ? `Quantity: ${product.stocks}` : "Out of stock"
    }

    productMeta.innerHTML = `
            <div class="stock-info ${product.totalStock === 0 ? "out-of-stock" : product.totalStock < 5 ? "low-stock" : ""}">
                <span>${stockText}</span>
            </div>
        `
  }

  // Update main product image and thumbnails
  updateProductImages(product)

  // Show variations if available
  if (product.hasVariations) {
    showVariationsSection(product)
  }

  // Update tab content
  updateTabContent(product)
}

function updateProductImages(product) {
  const mainProductImage = document.getElementById("main-product-image")
  const thumbnailContainer = document.querySelector(".thumbnail-images")

  if (mainProductImage) {
    mainProductImage.src = product.image
    mainProductImage.alt = product.title
  }

  if (thumbnailContainer && product.images.length > 0) {
    thumbnailContainer.innerHTML = product.images
      .map(
        (image, index) => `
            <div class="thumbnail ${index === 0 ? "active" : ""}" data-image="${image}">
                <img src="${image}" alt="Thumbnail ${index + 1}" crossorigin="anonymous">
            </div>
        `,
      )
      .join("")
  }
}

function showVariationsSection(product) {
  // Remove existing variations section if any
  const existingVariations = document.querySelector(".product-variations")
  if (existingVariations) {
    existingVariations.remove()
  }

  const productInfo = document.querySelector(".product-info")
  const quantitySection = document.querySelector(".product-quantity")

  if (productInfo && quantitySection) {
    const variationsSection = document.createElement("div")
    variationsSection.className = "product-variations"
    variationsSection.innerHTML = `
      <div class="variations-header">
        <h3>Available Variations</h3>
        <span class="variations-count">${product.variations.length} variant${product.variations.length > 1 ? "s" : ""}</span>
      </div>
      <div class="variations-container">
        ${product.variations
          .map(
            (variation, index) => `
            <div class="variation-item">
              <div class="variation-header">
                <span class="variation-number">#${index + 1}</span>
                <span class="variation-stock-badge ${variation.stocks < 5 ? "low-stock" : ""} ${variation.stocks === 0 ? "out-of-stock" : ""}">
                  ${variation.stocks} left
                </span>
              </div>
              <div class="variation-details">
                ${
                 
                  variation.colors
                    ? `
                      <div class="variation-detail">
                        <span class="detail-label">Colors:</span>
                        <div class="colors-list">
                          ${variation.colors
                            .map(
                              (color) => `
                                <div class="color-info">
                                 
                                  <span class="color-name">${color}</span>
                                </div>
                              `
                            )
                            .join("")}
                        </div>
                      </div>
                    `
                    : ""
                }
                ${
                  variation.size
                    ? `
                      <div class="variation-detail">
                        <span class="detail-label">Size:</span>
                        <span class="detail-value">${variation.size}</span>
                      </div>
                    `
                    : ""
                }
              </div>
            </div>
          `,
          )
          .join("")}
      </div>
      <div class="variations-footer">
        <p class="variation-note">💡 Select a variation when adding to cart</p>
      </div>
    `

    quantitySection.parentNode.insertBefore(variationsSection, quantitySection)
  }
}

function updateTabContent(product) {
  const descriptionTab = document.getElementById("description")
  if (descriptionTab) {
    descriptionTab.innerHTML = `
            <h2>Product Description</h2>
            <p class="product-desc">${product.description}</p>
        `
  }
}

function addEventListenersBasic(product) {
  // Thumbnail images
  const thumbnails = document.querySelectorAll(".thumbnail")
  const mainImage = document.getElementById("main-product-image")

  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener("click", () => {
      thumbnails.forEach((t) => t.classList.remove("active"))
      thumbnail.classList.add("active")

      const imageUrl = thumbnail.getAttribute("data-image")
      if (imageUrl && mainImage) {
        mainImage.src = imageUrl
      }
    })
  })

  // Add to cart button
  const addToCartBtn = document.getElementById("add-to-cart")
  if (addToCartBtn && !addToCartBtn.disabled) {
    addToCartBtn.addEventListener("click", () => {
      if (product.hasVariations) {
        if (window.cart && typeof window.cart.showVariationModal === "function") {
          window.cart.showVariationModal(product)
        } else {
          console.error("Cart variation modal not available")
        }
      } else if (product.colors && product.colors.length > 1) {
        if (window.cart && typeof window.cart.showColorModal === "function") {
          window.cart.showColorModal(product)
        } else {
          console.error("Cart color modal not available")
        }
      } else {
        if (window.cart && typeof window.cart.addItem === "function") {
          window.cart.addItem(product)
        } else {
          console.error("Cart functionality not available")
        }
      }
    })
  }

  // Buy now button (FIXED VERSION)
  const buyNowBtn = document.getElementById("buy-now")
  if (buyNowBtn && !buyNowBtn.disabled) {
    buyNowBtn.addEventListener("click", () => {
      if (product.hasVariations) {
        if (window.cart && typeof window.cart.showVariationModal === "function") {
          // FIXED: Pass true for buy now flag
          window.cart.showVariationModal(product, true)
        } else {
          console.error("Cart variation modal not available")
        }
      } else if (product.colors && product.colors.length > 1) {
        if (product.stocks < 1) {
          window.cart.showNotification("This product is out of stock", "error")
          return
        }
        if (window.cart && typeof window.cart.showColorModal === "function") {
          // FIXED: Pass true for buy now flag  
          window.cart.showColorModal(product, true)
        } else {
          console.error("Cart color modal not available")
        }
      } else {
        if (product.stocks < 1) {
          window.cart.showNotification("This product is out of stock", "error")
          return
        }

        // Redirect to checkout for simple product
        const ref = getSubdomain()
        let checkoutUrl = `https://pluggn.store/checkout?pid=${product.id}&ref=${ref}&platform=store`
        if (product.colors && product.colors.length === 1) {
          checkoutUrl += `&color=${encodeURIComponent(product.colors[0])}`
        }
        window.open(checkoutUrl, "_blank")
      }
    })
  }

  // Tab buttons
  const tabButtons = document.querySelectorAll(".tab-btn")
  const tabPanes = document.querySelectorAll(".tab-pane")

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((btn) => btn.classList.remove("active"))
      button.classList.add("active")

      tabPanes.forEach((pane) => pane.classList.remove("active"))

      const tabId = button.getAttribute("data-tab")
      const tabPane = document.getElementById(tabId)

      if (tabPane) {
        tabPane.classList.add("active")
      }
    })
  })
}

function showErrorMessageBasic(message) {
  document.body.innerHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error - Product Not Found</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: white;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                
                .error-container {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                    padding: 60px 40px;
                    text-align: center;
                    max-width: 500px;
                    width: 100%;
                    position: relative;
                    overflow: hidden;
                }
                
                .error-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: white;
                }
                
                .error-icon {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 30px;
                    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 36px;
                    font-weight: bold;
                }
                
                .error-title {
                    font-size: 28px;
                    font-weight: 700;
                    color: #2c3e50;
                    margin-bottom: 15px;
                }
                
                .error-message {
                    font-size: 16px;
                    color: #7f8c8d;
                    margin-bottom: 30px;
                    line-height: 1.6;
                }
                
                .error-actions {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                
                .btn {
                    padding: 12px 30px;
                    border-radius: 25px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    border: none;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .btn-primary {
                    background: black;
                    color: white;
                }
                
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: black;
                }
                
                .btn-secondary {
                    background: transparent;
                    color: black;
                    border: 2px solid black;
                }
                
                .btn-secondary:hover {
                    background: black;
                    color: white;
                    transform: translateY(-2px);
                }
                
                @media (max-width: 480px) {
                    .error-container {
                        padding: 40px 20px;
                    }
                    
                    .error-title {
                        font-size: 24px;
                    }
                    
                    .error-actions {
                        flex-direction: column;
                    }
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <div class="error-icon">!</div>
                <h1 class="error-title">Product Not Found</h1>
                <p class="error-message">${message}</p>
                <div class="error-actions">
                    <a href="/marketplace" class="btn btn-primary">
                        ← Back to Products
                    </a>
                    <a href="/" class="btn btn-secondary">
                        🏠 Go Home
                    </a>
                </div>
            </div>
        </body>
        </html>
    `
}

// Export for debugging
window.ProductDetailsCacheDebug = {
  ...window.ProductDetailsCacheDebug,
  page: () => window.productDetailsPage,
  refresh: () => window.productDetailsPage?.refreshProduct(),
  state: () => window.productDetailsPage?.loadingState,
}
