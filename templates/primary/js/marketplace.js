


document.addEventListener('DOMContentLoaded', function() {
  // Products will be loaded from API
  let products = [];
  
  // Filter and sort state
  let filters = {
    category: [],
    brand: [],
    price: {
      min: 0,
      max: 5000
    }
  };
  
  let sortBy = 'featured';
  let currentPage = 1;
  const productsPerPage = 9;
  
  // DOM elements
  const productGrid = document.querySelector('.product-grid');
  const productsTotalElement = document.getElementById('products-total');
  const sortSelect = document.getElementById('sort-by');
  const minPriceInput = document.getElementById('min-price');
  const maxPriceInput = document.getElementById('max-price');
  const priceRangeSlider = document.getElementById('price-range');
  const applyFiltersBtn = document.querySelector('.apply-filters-btn');
  const resetFiltersBtn = document.querySelector('.reset-filters-btn');
 
  const paginationNumbers = document.querySelector('.pagination-numbers');
  const prevPageBtn = document.querySelector('.prev-page');
  const nextPageBtn = document.querySelector('.next-page');
  
  

 async function init() {
    try {
      // Show loading state
      showLoadingState();
      
      // Initialize the products hook for reactive updates
      const productsHook = new window.useProducts();
      
      // Subscribe to product updates
      const unsubscribe = productsHook.subscribe(({ data, error, isValidating }) => {
        if (data) {
          products = data;
          
          // Update price range and filters only if we have products
          updatePriceRange();
          generateDynamicFilters();
          
          // Apply URL filters
          applyURLFilters();
          
          // Render products
          renderProducts();
        }
        
        if (error) {
          console.error('Error loading products:', error);
          showErrorState();
        }
        
        // Handle loading states
        if (isValidating && !data) {
          showLoadingState();
        } else {
          hideLoadingState();
        }
      });
      
      // Store unsubscribe function for cleanup
      window.productUnsubscribe = unsubscribe;
      
      // Initial fetch will be handled by the subscription
      
      // Add event listeners
      addEventListeners();
      
    } catch (error) {
      console.error('Error initializing marketplace:', error);
      showErrorState();
    }
  }
  
  
  // Show loading state
  function showLoadingState() {
    if (productGrid) {
      productGrid.innerHTML = `
        <div class="loading-state">
          <div class="loader-spinner"></div>
          <p>Loading products...</p>
        </div>
      `;
    }
  }
  
  // Hide loading state
  function hideLoadingState() {
    const loadingState = document.querySelector('.loading-state');
    if (loadingState) {
      loadingState.remove();
    }
  }
  
  // Show error state
  function showErrorState() {
    if (productGrid) {
      productGrid.innerHTML = `
        <div class="error-state">
          <p>Unable to load products. Please try again later.</p>
          <button class="btn btn-primary" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }
  
  // Update price range based on actual products
  function updatePriceRange() {
    if (products.length === 0) return;
    
    const prices = products.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Update filter range
    filters.price.min = 0;
    filters.price.max = Math.ceil(maxPrice * 1.1); // Add 10% buffer
    
    // Update UI elements
    if (minPriceInput) {
      minPriceInput.min = 0;
      minPriceInput.max = filters.price.max;
      minPriceInput.value = 0;
    }
    
    if (maxPriceInput) {
      maxPriceInput.min = 0;
      maxPriceInput.max = filters.price.max;
      maxPriceInput.value = filters.price.max;
    }
    
    if (priceRangeSlider) {
      priceRangeSlider.min = 0;
      priceRangeSlider.max = filters.price.max;
      priceRangeSlider.value = filters.price.max;
    }
  }
  
  


 function generateDynamicFilters() {
    if (!window.EnhancedProductCache || products.length === 0) return;
    
    // Generate category filters using the cache's utility methods
    const categories = getUniqueCategories(products);
    generateCategoryFilters(categories);
  }


 function getUniqueCategories(products) {
    const categories = [...new Set(products.map(product => product.category))];
    return categories.filter(category => category && category.trim() !== '');
  }
  
  
  // Generate category filter checkboxes
  function generateCategoryFilters(categories) {
    const filterGroup = document.querySelector('.filter-group');
    if (!filterGroup) return;
    
    // Check if category filter already exists
    let categoryFilterGroup = document.querySelector('.category-filter-group');
    if (!categoryFilterGroup) {
      categoryFilterGroup = document.createElement('div');
      categoryFilterGroup.className = 'filter-group category-filter-group';
      categoryFilterGroup.innerHTML = '<h3>Categories</h3>';
      filterGroup.parentNode.insertBefore(categoryFilterGroup, filterGroup);
    }
    
    const categoryContainer = document.createElement('div');
    categoryContainer.className = 'filter-options';
    
    // Add "All Categories" option
    categoryContainer.innerHTML = `
      <label class="filter-option">
        <input type="checkbox" name="category" value="all" checked>
        <span>All Categories</span>
      </label>
    `;
    
    // Add individual categories
    categories.forEach(category => {
      const label = document.createElement('label');
      label.className = 'filter-option';
      label.innerHTML = `
        <input type="checkbox" name="category" value="${category}">
        <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
      `;
      categoryContainer.appendChild(label);
    });
    
    categoryFilterGroup.appendChild(categoryContainer);
  }
  
  
  function applyURLFilters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Apply category filter from URL if present
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
      const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
      categoryCheckboxes.forEach(checkbox => {
        if (checkbox.value === 'all') {
          checkbox.checked = false;
        }
        if (checkbox.value === categoryParam) {
          checkbox.checked = true;
          filters.category.push(categoryParam);
        }
      });
    }
    
    // Apply search filter from URL if present
    const searchParam = urlParams.get('search');
    if (searchParam) {
      // Update search input if it exists
      const searchInput = document.querySelector('.search-input');
      if (searchInput) {
        searchInput.value = searchParam;
      }
    }
  }
  
  // Add event listeners
  function addEventListeners() {
    // Sort select
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        sortBy = sortSelect.value;
        currentPage = 1;
        renderProducts();
      });
    }
    
    // Price inputs
    if (minPriceInput) {
      minPriceInput.addEventListener('input', () => {
        const minValue = parseInt(minPriceInput.value);
        if (minValue >= 0 && minValue <= parseInt(maxPriceInput.value)) {
          filters.price.min = minValue;
        }
      });
    }
    
    if (maxPriceInput) {
      maxPriceInput.addEventListener('input', () => {
        const maxValue = parseInt(maxPriceInput.value);
        if (maxValue >= parseInt(minPriceInput.value)) {
          filters.price.max = maxValue;
          if (priceRangeSlider) {
            priceRangeSlider.value = maxValue;
          }
        }
      });
    }
    
    // Price slider
    if (priceRangeSlider) {
      priceRangeSlider.addEventListener('input', () => {
        const value = parseInt(priceRangeSlider.value);
        if (maxPriceInput) {
          maxPriceInput.value = value;
        }
        filters.price.max = value;
      });
    }
    
    // Dynamic category checkboxes
    document.addEventListener('change', (e) => {
      if (e.target.name === 'category') {
        handleCategoryFilter(e.target);
      } 
      // else if (e.target.name === 'brand') {
      //   handleBrandFilter(e.target);
      // }
    });
    
    // Apply filters button
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', () => {
        currentPage = 1;
        renderProducts();
      });
    }
    
    // Reset filters button
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    // Pagination
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderProducts();
        }
      });
    }
    
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        const filteredProducts = filterProducts();
        const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
        
        if (currentPage < totalPages) {
          currentPage++;
          renderProducts();
        }
      });
    }
  }
  
  // Handle category filter changes
  function handleCategoryFilter(checkbox) {
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
    
    if (checkbox.value === 'all' && checkbox.checked) {
      // Uncheck all other category checkboxes
      categoryCheckboxes.forEach(cb => {
        if (cb.value !== 'all') {
          cb.checked = false;
        }
      });
      filters.category = [];
    } else if (checkbox.value !== 'all') {
      // Uncheck "All Categories" checkbox
      const allCategoriesCheckbox = document.querySelector('input[name="category"][value="all"]');
      if (allCategoriesCheckbox) {
        allCategoriesCheckbox.checked = false;
      }
      
      // Update filters
      if (checkbox.checked) {
        filters.category.push(checkbox.value);
      } else {
        filters.category = filters.category.filter(cat => cat !== checkbox.value);
      }
      
      // If no categories are selected, check "All Categories"
      if (filters.category.length === 0 && allCategoriesCheckbox) {
        allCategoriesCheckbox.checked = true;
      }
    }
  }
  

  // Reset filters
  function resetFilters() {
    // Reset filters
    filters = {
      category: [],
      brand: [],
      price: {
        min: 0,
        max: 5000
      }
    };
    
    // Update price range based on products
    updatePriceRange();
    
    // Reset UI
    if (minPriceInput) minPriceInput.value = 0;
    if (maxPriceInput) maxPriceInput.value = filters.price.max;
    if (priceRangeSlider) priceRangeSlider.value = filters.price.max;
    
    // Reset checkboxes
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
    categoryCheckboxes.forEach(checkbox => {
      checkbox.checked = checkbox.value === 'all';
    });
    
   
    
    // Reset sort
    if (sortSelect) {
      sortSelect.value = 'featured';
      sortBy = 'featured';
    }
    
    // Reset page
    currentPage = 1;
    
    // Render products
    renderProducts();
  }
  
  // Filter products based on current filters
  function filterProducts() {
    // Start with all products
    let filteredProducts = [...products];
    
    // Apply search filter if present in URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    
    if (searchParam) {
      const searchTerm = searchParam.toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        product.title.toLowerCase().includes(searchTerm) || 
        product.description.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply category filter
    if (filters.category.length > 0) {
      filteredProducts = filteredProducts.filter(product => 
        filters.category.includes(product.category)
      );
    }
    
    
    
    // Apply price filter
    filteredProducts = filteredProducts.filter(product => 
      product.price >= filters.price.min && product.price <= filters.price.max
    );
    
    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        // For demo purposes, we'll just reverse the array
        filteredProducts.reverse();
        break;
      default:
        // 'featured' - no sorting needed
        break;
    }
    
    return filteredProducts;
  }
  
  


 function renderProducts() {
    // Filter and sort products
    const filteredProducts = filterProducts();
    
    // Update total count
    if (productsTotalElement) {
      productsTotalElement.textContent = filteredProducts.length;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    // Update pagination UI
    renderPagination(totalPages);
    
    // Update pagination buttons
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
    
    // Render products
    if (!productGrid) return;
    
    productGrid.innerHTML = '';
    
    if (paginatedProducts.length === 0) {
      productGrid.innerHTML = `
        <div class="no-products">
          <p>No products found matching your criteria.</p>
          <button class="btn btn-primary reset-filters-btn">Reset Filters</button>
        </div>
      `;
      
      // Add event listener to reset filters button
      const resetBtn = productGrid.querySelector('.reset-filters-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
      }
    } else {
      paginatedProducts.forEach(product => {
        const productCard = document.createElement('a');
        productCard.className = 'product-card';
        productCard.href = `/product-details?id=${product.id}`;
        productCard.setAttribute('data-id', product.id);
        
        // Format price using the built-in formatter or create our own
        const formattedPrice = formatPrice(product.price);
        
        productCard.innerHTML = `
          <div class="product-image">
            <img src="${product.image}" alt="${
          product.title
        }" loading="lazy" crossorigin="anonymous">
            ${
              product.hasVariations
                ? '<div class="variations-badge">Variants</div>'
                : ""
            }
          </div>
          <div class="product-info">
            <h3 class="product-title">${product.title}</h3>
            <p class="product-price">${formattedPrice}</p>
            <p class="product-stock">Stock: ${product.stocks}</p>
           
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
        
        productGrid.appendChild(productCard);
      });
      
      // Add event listeners to cart buttons
      addCartButtonListeners();
    }
  }
  
  
  function formatPrice(price) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }
  
  // Add cleanup function for when the page unloads
  function cleanup() {
    if (window.productUnsubscribe) {
      window.productUnsubscribe();
      window.productUnsubscribe = null;
    }
  }
  

  // Add event listeners to cart buttons
  function addCartButtonListeners() {
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
    const buyNowBtns = document.querySelectorAll('.buy-now-btn');
    
    addToCartBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const productId = btn.getAttribute('data-product-id');
        const product = products.find(p => p.id === productId);
        if (product) {
          // Add to cart logic (integrate with existing cart system)
          console.log('Add to cart:', product);
          // You can call your existing cart functions here
        }
      });
    });
    
    buyNowBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const productId = btn.getAttribute('data-product-id');
        const product = products.find(p => p.id === productId);
        if (product) {
          // Buy now logic
          console.log('Buy now:', product);
          // Redirect to checkout or open buy now modal
        }
      });
    });
  }
  
  // Render pagination
  function renderPagination(totalPages) {
    if (!paginationNumbers) return;
    
    paginationNumbers.innerHTML = '';
    
    // Determine which page numbers to show
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);
    
    // Adjust if we're at the end
    if (endPage - startPage < 2) {
      startPage = Math.max(1, endPage - 2);
    }
    
    // Create page number buttons
    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.className = `pagination-number${i === currentPage ? ' active' : ''}`;
      pageButton.textContent = i;
      
      pageButton.addEventListener('click', () => {
        currentPage = i;
        renderProducts();
      });
      
      paginationNumbers.appendChild(pageButton);
    }
  }
  
  // Initialize when DOM is ready
  init();
});