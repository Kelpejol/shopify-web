// Cart functionality cart.js
class ShoppingCart {
  constructor() {
    this.items = []
    this.total = 0
    this.count = 0
    this.maxItems = 20 // Maximum different items/variations allowed
    this.init()
    this.baseUrl = "https://api.pluggn.com.ng"
    this.products = [] // Declare the products variable
  }

  getSubdomain() {
    const host = window.location.hostname
    const hostParts = host.split(".")
    return hostParts.length > 2 && host.endsWith("pluggn.store") ? hostParts[0] : null
  }

  init() {
    // Load cart from sessionStorage
    this.loadCart()

    // Update cart UI
    this.updateCartUI()

    // Add event listeners
    this.addEventListeners()
  }

  loadCart() {
    const savedCart = sessionStorage.getItem("cart")
    if (savedCart) {
      this.items = JSON.parse(savedCart)
      this.calculateTotals()
    }
  }

  saveCart() {
    sessionStorage.setItem("cart", JSON.stringify(this.items))
    this.calculateTotals()
    this.updateCartUI()
  }

  calculateTotals() {
    // Count unique items/variations (not quantities)
    this.count = this.items.length
    // Calculate total price
    this.total = this.items.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  // Helper function to convert price string to number
  parsePrice(priceString) {
    // Remove currency symbols and commas, then convert to number
    return Number.parseFloat(priceString.replace(/[₦,]/g, "")) || 0
  }

  showColorModal(product, isBuyNow = false) {
    // Create modal overlay
    const overlay = document.createElement("div")
    overlay.className = "color-modal-overlay"

    // Create modal container
    const modal = document.createElement("div")
    modal.className = "color-modal"

    // Create modal content
   modal.innerHTML = `
  <div class="color-modal-header">
    <h3>Choose Color</h3>
    <button class="color-modal-close">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  </div>
  <div class="color-modal-body">
    <div class="product-color-info">
      <div class="product-color-top">
        <img src="${product.image}" alt="${product.title}" class="color-product-image" crossorigin="anonymous">
        <p class="color-product-price">₦${product.price.toLocaleString()}</p>
      </div>
      <h4 class="color-product-title">${product.title}</h4>
    </div>
    <div class="colors-list">
      ${product.colors
        .map(
          (color, index) => `
          <div class="color-item" data-color="${color}">
            <div class="color-option">
              <span class="color-name">${color.toUpperCase()}</span>
            </div>
            <button class="btn btn-primary color-select-btn" data-color-index="${index}">
              ${isBuyNow ? "Buy Now" : "Add to Cart"}
            </button>
          </div>
        `
        )
        .join("")}
    </div>
  </div>
`


    // Add modal to overlay
    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    document.body.style.overflow = "hidden"

    // Add event listeners
    const closeBtn = modal.querySelector(".color-modal-close")
    const selectBtns = modal.querySelectorAll(".color-select-btn")

    // Close modal function
    const closeModal = () => {
      overlay.remove()
      document.body.style.overflow = ""
    }

    // Close button
    closeBtn.addEventListener("click", closeModal)

    // Click outside to close
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeModal()
      }
    })

    // Color selection
    selectBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const colorIndex = Number.parseInt(btn.getAttribute("data-color-index"))
        const selectedColor = product.colors[colorIndex]

        if (isBuyNow) {
          // Redirect to checkout with color
          const ref = this.getSubdomain()
          const checkoutUrl = `https://pluggn.store/checkout?pid=${product.id}&color=${encodeURIComponent(selectedColor)}&ref=${ref}&platform=store`
          window.open(checkoutUrl, "_blank")
          closeModal()
        } else {
          // Add to cart with color
          this.addItemWithColor(product, selectedColor)
          closeModal()
        }
      })
    })

    // Show modal with animation
    setTimeout(() => {
      overlay.classList.add("active")
    }, 10)
  }

  showVariationModal(product, isBuyNow = false) {
  const overlay = document.createElement("div")
  overlay.className = "variation-modal-overlay"

  const modal = document.createElement("div")
  modal.className = "variation-modal"

  modal.innerHTML = `
    <div class="variation-modal-header">
      <h3>Choose Variation</h3>
      <button class="variation-modal-close">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" 
          viewBox="0 0 24 24" fill="none" stroke="currentColor" 
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
    <div class="variation-modal-body">
      <div class="product-variant-info">
        <img src="${product.image}" alt="${product.title}" class="variation-product-image" crossorigin="anonymous">
        <h4 class="variation-product-title">${product.title}</h4>
        <p class="variation-product-price">₦${product.price.toLocaleString()}</p>
      </div>
      <div class="variations-list">
        ${product.variations.map((variation, index) => `
          <div class="variation-item" data-variation-id="${variation.id}">
            <div class="variation-header">
              <h5>Variant ${index + 1}</h5>
              <span class="variation-stock ${variation.stocks < 5 ? "low-stock" : ""}">
                ${variation.stocks} in stock
              </span>
            </div>
            <div class="variation-details">
              ${variation.size ? `<span class="variation-size">Size: ${variation.size}</span>` : ""}
            </div>

            ${variation.colors && variation.colors.length > 0 ? `
              <div class="variation-colors-popover">
                <button class="variation-color-toggle">
                  ${variation.colors[0].toUpperCase()} ▼
                </button>
                <div class="variation-colors-list">
                  ${variation.colors.map((color, cIndex) => `
                    <div class="variation-color-option ${cIndex === 0 ? "active" : ""}" 
                         data-color="${color}">
                      
                      <span class="color-name">${color.toUpperCase()}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            ` : ""}

            <button class="btn btn-primary variation-select-btn"
              ${variation.stocks < 1 ? "disabled" : ""}
              data-variation-index="${index}">
              ${variation.stocks < 1 ? "Out of Stock" : isBuyNow ? "Buy Now" : "Add to Cart"}
            </button>
          </div>
        `).join("")}
      </div>
    </div>
  `

  overlay.appendChild(modal)
  document.body.appendChild(overlay)
  document.body.style.overflow = "hidden"

  // ===== Event handling =====
  const closeBtn = modal.querySelector(".variation-modal-close")
  const selectBtns = modal.querySelectorAll(".variation-select-btn")
  const popoverToggles = modal.querySelectorAll(".variation-color-toggle")

  let selectedColors = {} // track color per variation

  const closeModal = () => {
    overlay.remove()
    document.body.style.overflow = ""
  }

  closeBtn.addEventListener("click", closeModal)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal()
  })

  // Toggle color popovers
  popoverToggles.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      const popover = btn.nextElementSibling
      popover.classList.toggle("active")
    })
  })

  // Color selection per variation
  modal.querySelectorAll(".variation-color-option").forEach((option) => {
    option.addEventListener("click", () => {
      const parent = option.closest(".variation-colors-popover")
      const toggleBtn = parent.querySelector(".variation-color-toggle")
      const allOptions = parent.querySelectorAll(".variation-color-option")

      allOptions.forEach(o => o.classList.remove("active"))
      option.classList.add("active")

      const chosenColor = option.getAttribute("data-color")
      toggleBtn.textContent = chosenColor + " ▼"

      const variationId = option.closest(".variation-item").getAttribute("data-variation-id")
      selectedColors[variationId] = chosenColor

      parent.querySelector(".variation-colors-list").classList.remove("active")
    })
  })

  // Handle variation select
  selectBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const variationIndex = parseInt(btn.getAttribute("data-variation-index"))
      const selectedVariation = product.variations[variationIndex]
      const chosenColor = selectedColors[selectedVariation.id] || selectedVariation.colors?.[0] || null

      if (selectedVariation.stocks > 0) {
        if (isBuyNow) {
          const ref = this.getSubdomain()
          let checkoutUrl = `https://pluggn.store/checkout?pid=${product.id}&variation=${selectedVariation.id}&ref=${ref}&platform=store`
          if (chosenColor) checkoutUrl += `&color=${encodeURIComponent(chosenColor)}`
          window.open(checkoutUrl, "_blank")
          closeModal()
        } else {
          this.addItemWithVariationAndColor(product, selectedVariation, chosenColor)
          closeModal()
        }
      } else {
        this.showNotification("This variation is out of stock", "error")
      }
    })
  })

  setTimeout(() => overlay.classList.add("active"), 10)
}


  addItemWithColor(product, selectedColor) {
    // Create a unique item ID that includes color
    const itemId = `${product.id}_color_${selectedColor}`

    // Check if product already exists in cart
    const existingItem = this.items.find((item) => item.itemId === itemId)

    // Determine stock limit
    const stockLimit = product.stocks

    if (existingItem) {
      // Check stock before increasing quantity
      if (stockLimit !== null && existingItem.quantity >= stockLimit) {
        this.showNotification(`Cannot add more ${product.title}. Only ${stockLimit} available in stock.`, "error")
        return
      }
      existingItem.quantity += 1
    } else {
      // Check if we've reached the maximum number of different items
      if (this.items.length >= this.maxItems) {
        this.showNotification(
          `Cart limit reached! You can only have ${this.maxItems} different items in your cart.`,
          "error",
        )
        return
      }

      // Check if stock is available for new item
      if (stockLimit !== null && stockLimit < 1) {
        this.showNotification(`${product.title} is out of stock.`, "error")
        return
      }

      this.items.push({
        ...product,
        itemId: itemId,
        quantity: 1,
        stock: stockLimit,
        selectedColor: selectedColor,
        image: product.image || product.images[0] || `${this.baseUrl}/image/placeholder.svg`,
        displayTitle: `${product.title} (${selectedColor})`,
      })
    }

    this.saveCart()
    const capitalizedName = `${product.title} (${selectedColor})`
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
    this.showNotification(`${capitalizedName} added to cart!`)
  }

  addItemWithVariationAndColor(product, selectedVariation, selectedColor) {
    // Create a unique item ID that includes variation and color
    let itemId = `${product.id}_${selectedVariation.id}`
    if (selectedColor) {
      itemId += `_color_${selectedColor}`
    }

    // Check if product already exists in cart
    const existingItem = this.items.find((item) => item.itemId === itemId)

    // Determine stock limit
    const stockLimit = selectedVariation.stocks

    if (existingItem) {
      // Check stock before increasing quantity
      if (stockLimit !== null && existingItem.quantity >= stockLimit) {
        this.showNotification(`Cannot add more ${product.title}. Only ${stockLimit} available in stock.`, "error")
        return
      }
      existingItem.quantity += 1
    } else {
      // Check if we've reached the maximum number of different items
      if (this.items.length >= this.maxItems) {
        this.showNotification(
          `Cart limit reached! You can only have ${this.maxItems} different items in your cart.`,
          "error",
        )
        return
      }

      // Check if stock is available for new item
      if (stockLimit !== null && stockLimit < 1) {
        this.showNotification(`${product.title} is out of stock.`, "error")
        return
      }

      let displayTitle = product.title
      if (selectedColor) {
        displayTitle += ` (${selectedColor})`
      }

      this.items.push({
        ...product,
        itemId: itemId,
        quantity: 1,
        stock: stockLimit,
        variation: selectedVariation,
        selectedColor: selectedColor,
        image: product.image || product.images[0] || `${this.baseUrl}/image/placeholder.svg`,
        displayTitle: displayTitle,
      })
    }

    this.saveCart()
    let displayName = product.title
    if (selectedColor) {
      displayName += ` (${selectedColor})`
    }
    const capitalizedName = displayName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
    this.showNotification(`${capitalizedName} added to cart!`)
  }

  addItem(product, selectedVariation = null) {
    // Create a unique item ID that includes variation if present
    const itemId = selectedVariation ? `${product.id}_${selectedVariation.id}` : product.id

    // Check if product already exists in cart
    const existingItem = this.items.find((item) => item.itemId === itemId)

    // Determine stock limit
    const stockLimit = selectedVariation ? selectedVariation.stocks : product.stocks

    if (existingItem) {
      // Check stock before increasing quantity
      if (stockLimit !== null && existingItem.quantity >= stockLimit) {
        this.showNotification(`Cannot add more ${product.title}. Only ${stockLimit} available in stock.`, "error")
        return
      }
      existingItem.quantity += 1
    } else {
      // Check if we've reached the maximum number of different items
      if (this.items.length >= this.maxItems) {
        this.showNotification(
          `Cart limit reached! You can only have ${this.maxItems} different items in your cart.`,
          "error",
        )
        return
      }

      // Check if stock is available for new item
      if (stockLimit !== null && stockLimit < 1) {
        this.showNotification(`${product.title} is out of stock.`, "error")
        return
      }

      this.items.push({
        ...product,
        itemId: itemId,
        quantity: 1,
        stock: stockLimit,
        variation: selectedVariation,
        // Add variation display name for cart
        image: product.image || product.images[0] || `${this.baseUrl}/image/placeholder.svg`,
        displayTitle: selectedVariation ? `${product.title}` : product.title,
      })
    }

    this.saveCart()
    const displayName = selectedVariation ? `${product.title}` : product.title
    const capitalizedName = displayName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
    this.showNotification(`${capitalizedName} added to cart!`)
  }

  removeItem(itemId) {
    this.items = this.items.filter((item) => item.itemId !== itemId)
    this.saveCart()
  }

  updateQuantity(itemId, quantity) {
    const item = this.items.find((item) => item.itemId === itemId)

    if (item) {
      // Check stock limit before updating quantity
      if (item.stock !== null && quantity > item.stock) {
        this.showNotification(
          `Cannot add more ${item.displayTitle || item.title}. Only ${item.stock} available in stock.`,
          "error",
        )
        return
      }

      item.quantity = quantity

      if (item.quantity <= 0) {
        this.removeItem(itemId)
      } else {
        this.saveCart()
      }
    }
  }

  clearCart() {
    this.items = []
    this.saveCart()
  }

  updateCartUI() {
    // Update cart count (shows number of different items, not quantities)
    const cartCountElements = document.querySelectorAll(".cart-count")
    cartCountElements.forEach((element) => {
      element.textContent = this.count
    })

    // Update cart items
    const cartItemsContainer = document.querySelector(".cart-modal-items")
    const cartEmptyElement = document.querySelector(".cart-empty")
    const totalAmountElement = document.querySelector(".total-amount")

    if (cartItemsContainer) {
      if (this.items.length === 0) {
        // Show empty cart message
        cartItemsContainer.innerHTML = `
          <div class="cart-empty">
            <p>Your cart is empty</p>
            <a href="/marketplace" class="btn btn-primary">Shop Now</a>
          </div>
        `
      } else {
        // Hide empty cart message if it exists
        if (cartEmptyElement) {
          cartEmptyElement.style.display = "none"
        }

        // Replace the cart items rendering part in updateCartUI method
        cartItemsContainer.innerHTML = this.items
          .map(
            (item) => `
          <div class="cart-item" data-id="${item.itemId}">
            <div class="cart-item-image">
              <img src="${item.image}" alt="${item.title}" crossorigin="anonymous">
            </div>
            <div class="cart-item-details">
              <h4 class="cart-item-title">${item.displayTitle || item.title}</h4>
              ${
                item.variation
                  ? `
                <div class="cart-item-variation">
                  ${item.variation.color ? `<span class="variation-info">Color: ${item.variation.color}</span>` : ""}
                  ${item.variation.size ? `<span class="variation-info">Size: ${item.variation.size}</span>` : ""}
                </div>
              `
                  : ""
              }
              
              <p class="cart-item-price">₦${item.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</p>
              <div class="cart-item-quantity">
                <button class="quantity-btn decrease-quantity" data-id="${item.itemId}">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn increase-quantity" data-id="${item.itemId}" ${
                  item.stock !== null && item.quantity >= item.stock ? "disabled" : ""
                }>+</button>
                <span class="cart-item-remove" data-id="${item.itemId}">Remove</span>
              </div>
            </div>
          </div>
        `,
          )
          .join("")

        // Add event listeners to cart items
        this.addCartItemEventListeners()
      }

      // Update total amount
      if (totalAmountElement) {
        totalAmountElement.textContent = `₦${this.total.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
`
      }
    }
  }

  addCartItemEventListeners() {
    // Increase quantity
    const increaseButtons = document.querySelectorAll(".increase-quantity")
    increaseButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const itemId = button.getAttribute("data-id")
        const item = this.items.find((item) => item.itemId === itemId)
        if (item) {
          this.updateQuantity(itemId, item.quantity + 1)
        }
      })
    })

    // Decrease quantity
    const decreaseButtons = document.querySelectorAll(".decrease-quantity")
    decreaseButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const itemId = button.getAttribute("data-id")
        const item = this.items.find((item) => item.itemId === itemId)
        if (item) {
          this.updateQuantity(itemId, item.quantity - 1)
        }
      })
    })

    // Remove item
    const removeButtons = document.querySelectorAll(".cart-item-remove")
    removeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const itemId = button.getAttribute("data-id")
        this.removeItem(itemId)
      })
    })
  }

  addEventListeners() {
    // Cart toggle
    const cartBtn = document.querySelector(".cart-btn")
    const cartModal = document.querySelector(".cart-modal")
    const cartClose = document.querySelector(".cart-close")
    const sidebarOverlay = document.querySelector(".sidebar-overlay")

    const checkoutBtn = document.querySelector(".checkout-btn")
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", () => {
        this.redirectToCheckout()
      })
    }

    if (cartBtn && cartModal && cartClose && sidebarOverlay) {
      cartBtn.addEventListener("click", () => {
        cartModal.classList.add("active")
        sidebarOverlay.classList.add("active")
        document.body.style.overflow = "hidden"
      })

      cartClose.addEventListener("click", () => {
        cartModal.classList.remove("active")
        sidebarOverlay.classList.remove("active")
        document.body.style.overflow = ""
      })

      sidebarOverlay.addEventListener("click", () => {
        cartModal.classList.remove("active")
        sidebarOverlay.classList.remove("active")
        document.body.style.overflow = ""
      })
    }

    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("add-to-cart-btn")) {
        e.preventDefault()
        e.stopPropagation()

        const productId = e.target.getAttribute("data-product-id")
        let product = null

        // Try to get product from EnhancedProductCache
        if (window.EnhancedProductCache) {
          const cached = window.EnhancedProductCache.getFromMemoryCache()
          if (cached && cached.data) {
            product = cached.data.find((p) => p.id == productId)
          }
        }

        // Another fallback: try to get from FeaturedProducts
        if (!product && window.FeaturedProducts && window.FeaturedProducts.getFeaturedProducts) {
          const featuredProducts = window.FeaturedProducts.getFeaturedProducts()
          product = featuredProducts.find((p) => p.id == productId)
        }

        // Final fallback: check if products array exists globally
        if (!product && typeof this.products !== "undefined") {
          product = this.products.find((p) => p.id == productId)
        }

        if (product) {
          // Check if product has variations
          if (product.hasVariations && product.variations && product.variations.length > 0) {
            this.showVariationModal(product)
          } else if (product.colors && product.colors.length > 1) {
            this.showColorModal(product)
          } else {
            // Simple product or single color
            this.addItem(product)
          }
        } else {
          console.error("Product not found with ID:", productId)
          this.showNotification("Product not found. Please try again.", "error")
        }
      }

      if (e.target.classList.contains("buy-now-btn")) {
        e.preventDefault()
        e.stopPropagation()

        const productId = e.target.getAttribute("data-product-id")
        const product = this.getProductFromCache(productId)

        if (product) {
          // Check if product is out of stock
          const productStock = product.stocks || product.stock || 0

          if (product.hasVariations && product.variations && product.variations.length > 0) {
            // Check if all variations are out of stock
            const hasAvailableVariations = product.variations.some((v) => v.stocks > 0)
            if (!hasAvailableVariations) {
              this.showNotification("This product is out of stock", "error")
              return
            }
            // Show variation modal for buy now
            this.showVariationModal(product, true)
          } else if (product.colors && product.colors.length > 1) {
            if (productStock < 1) {
              this.showNotification("This product is out of stock", "error")
              return
            }
            this.showColorModal(product, true)
          } else {
            // Check stock for simple product
            if (productStock < 1) {
              this.showNotification("This product is out of stock", "error")
              return
            }

            const ref = this.getSubdomain()
            let checkoutUrl = `https://pluggn.store/checkout?pid=${product.id}&ref=${ref}&platform=store`
            if (product.colors && product.colors.length === 1) {
              checkoutUrl += `&color=${encodeURIComponent(product.colors[0])}`
            }
            window.open(checkoutUrl, "_blank")
          }
        } else {
          console.error("Product not found with ID:", productId)
          this.showNotification("Product not found. Please try again.", "error")
        }
      }
    })
  }

  getProductFromCache(productId) {
    // Try EnhancedProductCache first
    if (window.EnhancedProductCache) {
      const cached = window.EnhancedProductCache.getFromMemoryCache()
      if (cached && cached.data) {
        return cached.data.find((p) => p.id == productId)
      }
    }

    return null
  }

  showNotification(message, type = "success") {
    // Check if notification container exists
    let notificationContainer = document.querySelector(".notification-container")

    // Create notification container if it doesn't exist
    if (!notificationContainer) {
      notificationContainer = document.createElement("div")
      notificationContainer.className = "notification-container"
      document.body.appendChild(notificationContainer)

      // Add styles
      notificationContainer.style.position = "fixed"
      notificationContainer.style.bottom = "20px"
      notificationContainer.style.right = "20px"
      notificationContainer.style.zIndex = "1000"
    }

    // Create notification
    const notification = document.createElement("div")
    notification.className = "notification"
    notification.textContent = message

    // Add styles based on type
    const backgroundColor = type === "error" ? "#dc3545" : "var(--color-success)"
    notification.style.backgroundColor = backgroundColor
    notification.style.color = "white"
    notification.style.padding = "10px 20px"
    notification.style.borderRadius = "var(--radius-md)"
    notification.style.marginTop = "10px"
    notification.style.boxShadow = "var(--shadow-md)"
    notification.style.animation = "fadeIn 0.3s, fadeOut 0.3s 2.7s"

    // Add animation styles if not already added
    if (!document.querySelector("#notification-styles")) {
      const style = document.createElement("style")
      style.id = "notification-styles"
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(20px); }
        }
      `
      document.head.appendChild(style)
    }

    // Add notification to container
    notificationContainer.appendChild(notification)

    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 3000)
  }

  redirectToCheckout() {
    if (this.items.length === 0) {
      this.showNotification("Your cart is empty", "error")
      return
    }

    const ref = this.getSubdomain()
    const baseUrl = "https://pluggn.store/checkout"
    const params = new URLSearchParams()

    // Add each cart item as a parameter
    this.items.forEach((item, index) => {
      params.append(`item[${index}][pid]`, item.id)
      params.append(`item[${index}][qty]`, item.quantity.toString())

      if (item.variation && item.variation.id) {
        params.append(`item[${index}][variation]`, item.variation.id)
      }

      if (item.selectedColor) {
        params.append(`item[${index}][color]`, item.selectedColor)
      }
    })

    params.append("ref", ref)
    params.append("platform", "store")

    const checkoutUrl = `${baseUrl}?${params.toString()}`
    window.open(checkoutUrl, "_blank")
  }
}

// Initialize cart
const cart = new ShoppingCart()

// Export cart for use in other files
window.cart = cart
