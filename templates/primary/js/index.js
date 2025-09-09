// index.js - Handle featured products on homepage with smart caching

document.addEventListener("DOMContentLoaded", function () {
  // Products will be loaded from API
  let products = [];
  const maxFeaturedProducts = 8;
  const baseUrl = "https://api.pluggn.com.ng";

  // DOM elements
  const productGrid = document.querySelector(".product-grid");
  const featuredSection = document.querySelector(".featured-products");

  async function init() {
    try {
      // Show loading state
      showLoadingState();

      // Use EnhancedProductCache instead of ProductAPI
      if (window.EnhancedProductCache) {
        // Subscribe to real-time updates
        const unsubscribe = window.EnhancedProductCache.subscribe(
          ({ data, error, isValidating }) => {
            if (data) {
              products = data;
              renderFeaturedProducts(); // Re-render with fresh data
            }
            if (error) {
              console.error("Product fetch error:", error);
              showErrorState();
            }
            if (!isValidating) {
              hideLoadingState();
            }
          }
        );

        // Initial fetch
        products = await window.EnhancedProductCache.fetchProducts();
      } else {
        console.error("EnhancedProductCache not available");
        products = [];
      }

      // Render featured products (initial render)
      renderFeaturedProducts();
    } catch (error) {
      console.error("Error initializing featured products:", error);
      showErrorState();
    } finally {
      hideLoadingState();
    }
  }

  // Show loading state
  function showLoadingState() {
    if (productGrid) {
      productGrid.innerHTML = `
          <div class="loading-state">
            <div class="loader-spinner"></div>
            <p>Loading featured products...</p>
          </div>
        `;
    }
  }

  // Hide loading state
  function hideLoadingState() {
    const loadingState = document.querySelector(".loading-state");
    if (loadingState) {
      loadingState.remove();
    }
  }

  // Show error state
  function showErrorState() {
    if (productGrid) {
      productGrid.innerHTML = `
          <div class="error-state">
            <div class="error-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>
            <h3>Unable to load products</h3>
            <p>We're having trouble loading our featured products. Please try again later.</p>
            <button class="btn btn-primary retry-btn">Retry</button>
          </div>
        `;

      // Add event listener for retry button
      const retryBtn = productGrid.querySelector(".retry-btn");
      if (retryBtn) {
        retryBtn.addEventListener("click", function () {
          location.reload();
        });
      }
    }
  }

  // Show no products state
  function showNoProductsState() {
    if (productGrid) {
      productGrid.innerHTML = `
          <div class="no-products-state">
            <div class="no-products-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package-icon lucide-package"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/></svg></div>
            <h3>No Products Available</h3>
            <p>We don't have any products to show right now. Check back soon for amazing deals!</p>
            <a href="/marketplace" class="btn btn-primary">Visit Marketplace</a>
          </div>
        `;
    }
  }

  // Get random featured products
  function getFeaturedProducts() {
    if (products.length === 0) {
      return [];
    }

    // Shuffle products array and take up to maxFeaturedProducts
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(maxFeaturedProducts, products.length));
  }

  // Handle image load errors
  function handleImageError(imgElement) {
    // Prevent infinite loop by checking if we've already tried to set a fallback
    if (imgElement.dataset.errorHandled) {
      return;
    }

    // Mark as handled to prevent infinite loop
    imgElement.dataset.errorHandled = "true";

    // Try placeholder first, if you have one
    if (!imgElement.src.includes("placeholder.svg")) {
      imgElement.src =
        `${baseUrl}/image/placeholder.svg?height=200&width=200`;
    } else {
      // If placeholder also fails, use a data URL or hide the image
      imgElement.style.display = "none";

      // Optionally, show a fallback div with icon/text
      const fallbackDiv = document.createElement("div");
      fallbackDiv.className = "image-fallback";
      fallbackDiv.innerHTML = `
          <div style="
            width: 200px; 
            height: 200px; 
            background: #f0f0f0; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: #999;
            font-size: 14px;
            border-radius: 8px;
          ">
            📦<br>Image not available
          </div>
        `;
      imgElement.parentNode.appendChild(fallbackDiv);
    }
  }

  function renderFeaturedProducts() {
    if (!productGrid) return;

    const featuredProducts = getFeaturedProducts();

    if (featuredProducts.length === 0) {
      showNoProductsState();
      return;
    }

    productGrid.innerHTML = "";

    featuredProducts.forEach((product) => {
      const productCard = document.createElement("a");
      productCard.className = "product-card";
      productCard.href = `/product-details?id=${product.id}`;
      productCard.setAttribute("data-id", product.id);

      // Updated price formatting - EnhancedProductCache doesn't have formatPrice method
      const formattedPrice = `₦${product.price.toLocaleString()}`;

      // Create stock display if available
      const stockDisplay =
        product.stocks !== undefined
          ? `<p class="product-stock">Stock: ${product.stocks}</p>`
          : "";

      productCard.innerHTML = `
          <div class="product-image">
            <img src="${product.image}" alt="${
        product.title
      }" loading="lazy" class="product-img" crossorigin="anonymous">
            ${
              product.hasVariations
                ? '<div class="variations-badge">Variants</div>'
                : ""
            }
          </div>
          <div class="product-info">
            <h3 class="product-title">${product.title}</h3>
            <p class="product-price">${formattedPrice}</p>
            ${stockDisplay}
            
            <div class="product-actions">
              <button class="btn btn-sm btn-dark add-to-cart-btn" data-product-id="${
                product.id
              }">Add to Cart</button>
              <button class="btn btn-sm btn-primary buy-now-btn" data-product-id="${
                product.id
              }">Buy Now</button>
            </div>
          </div>
        `;

      // Add error handler for the image
      const img = productCard.querySelector(".product-img");
      if (img) {
        img.addEventListener("error", function () {
          handleImageError(this);
        });
      }

      productGrid.appendChild(productCard);
    });

    // Add event listeners to product actions
    addProductActionListeners();
  }

  // Add event listeners to product actions
  function addProductActionListeners() {
    const addToCartBtns = document.querySelectorAll(".add-to-cart-btn");
    const buyNowBtns = document.querySelectorAll(".buy-now-btn");

    addToCartBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const productId = btn.getAttribute("data-product-id");
        const product = products.find((p) => p.id == productId);

       


        if (product && window.cart) {
          // Check if product has variations
          if (
            product.hasVariations &&
            product.variations &&
            product.variations.length > 0
          ) {
            window.cart.showVariationModal(product);
          } 
          else if (product.colors && product.colors.length > 1) {
            window.cart.showColorModal(product)
          }
          else {
            // Prepare product data for cart
            const cartProduct = {
              id: product.id,
              title: product.title,
              price: product.price,
              image:
                product.image ||
                `${baseUrl}/image/placeholder.svg`,
              stocks: product.stocks || product.stock || 0,
              hasVariations: product.hasVariations,
              variations: product.variations,
            };

            window.cart.addItem(cartProduct);
          }
        } else {
          console.error("Product not found or cart not available");
          showNotification(
            "Unable to add product to cart. Please try again.",
            "error"
          );
        }
      });
    });

   buyNowBtns.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const productId = btn.getAttribute("data-product-id");
    const product = products.find((p) => p.id == productId);

    if (product && window.cart) {
      // Check if product is out of stock
      const productStock = product.stocks || product.stock || 0;

      if (
        product.hasVariations &&
        product.variations &&
        product.variations.length > 0
      ) {
        // Check if all variations are out of stock
        const hasAvailableVariations = product.variations.some(
          (v) => v.stocks > 0
        );
        if (!hasAvailableVariations) {
          showNotification("This product is out of stock", "error");
          return;
        }  

        // For buy now with variations, show modal with buy now flag
        window.cart.showVariationModal(product, true);
      } else if (product.colors && product.colors.length > 1) {
        // Check stock for multiple colors
        if (productStock < 1) {
          showNotification("This product is out of stock", "error");
          return;
        }
        
        // FIXED: Pass true as the second parameter for buy now
        window.cart.showColorModal(product, true);
      } else {
        // Check stock for simple product
        if (productStock < 1) {
          showNotification("This product is out of stock", "error");
          return;
        }

        // Get subdomain and redirect to checkout
        const getSubdomain = () => {
          const host = window.location.hostname;
          const hostParts = host.split(".");
          return hostParts.length > 2 && host.endsWith("pluggn.store")
            ? hostParts[0]
            : null;
        };

        const ref = getSubdomain();
       
        let checkoutUrl = `https://pluggn.store/checkout?pid=${product.id}&ref=${ref}&platform=store`;
        if (product.colors && product.colors.length === 1) {
          checkoutUrl += `&color=${encodeURIComponent(product.colors[0])}`;
        }
        window.open(checkoutUrl, "_blank");
      }
    } else {
      console.error("Product not found or cart not available");
      showNotification(
        "Unable to process buy now. Please try again.",
        "error"
      );
    }
  });
});
  }

  // Show notification function (fallback if not available from cart)
  function showNotification(message, type = "success") {
    if (window.cart && window.cart.showNotification) {
      window.cart.showNotification(message, type);
      return;
    }

    // Fallback notification
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(message);
  }

  async function refreshProducts() {
    try {
      showLoadingState();
      // Use mutate with force refetch instead of refreshProducts
      products = await window.EnhancedProductCache.mutate(null, true);
      renderFeaturedProducts();
    } catch (error) {
      console.error("Error refreshing products:", error);
      showErrorState();
    } finally {
      hideLoadingState();
    }
  }

  // Initialize when DOM is ready
  init();

  window.FeaturedProducts = {
    init,
    renderFeaturedProducts,
    getFeaturedProducts: () => getFeaturedProducts(),
    refreshProducts,
    getCacheInfo: () =>
      window.EnhancedProductCache
        ? window.EnhancedProductCache.getCacheInfo()
        : null,
  };
});
