// Variables
let recipesContainer = document.getElementById('recipes');
let favoritesList = [];
let cartItems = [];
let apiKey = 'c2d1544978b140ddaf69fbd965048dc7';
let apiUrl = 'https://api.spoonacular.com/recipes';
let currentOffset = 0;
let activeFilter = 'all';
let currentSlide = 0;
let slidesData = [];
let cuisineList = [];

// DOM Elements
let loadingElement = document.getElementById('loading-modal');
let favoritesModal = document.getElementById('favorites-modal');
let cartModal = document.getElementById('cart-modal');
let filterButtons = document.getElementById('filter-buttons-container');
let slideshow = document.getElementById('recipe-slideshow');
let favoritesElement = document.getElementById('favorites-list');
let cartElement = document.getElementById('cart-list');
let cartTotal = document.getElementById('cart-total');
let moreButton = document.getElementById('more');

// Search elements
let searchInput = document.getElementById('search-input');
let searchButton = document.getElementById('search-button');
let recipeModal = document.getElementById('recipe-modal');
let modalRecipeTitle = document.getElementById('modal-recipe-title');
let modalRecipeImage = document.getElementById('modal-recipe-image');
let modalRecipePrice = document.getElementById('modal-recipe-price');
let modalRecipeSummary = document.getElementById('modal-recipe-summary');
let modalRecipeIngredients = document.getElementById('modal-recipe-ingredients');
let modalAddCart = document.getElementById('modal-add-cart');
let modalAddFavorite = document.getElementById('modal-add-favorite');
let closeRecipe = document.getElementById('close-recipe');
let currentRecipe = null;

// Button elements
let favoritesButton = document.getElementById('favorites-button');
let cartButton = document.getElementById('cart-button');
let closeFavorites = document.getElementById('close-favorites');
let closeCart = document.getElementById('close-cart');
let prevSlideButton = document.getElementById('prev-slide');
let nextSlideButton = document.getElementById('next-slide');

// Start the website
function startWebsite() {
  setupEvents();
  getCuisines(true);
  getRecipes(`${apiUrl}/complexSearch?apiKey=${apiKey}&number=20&offset=${currentOffset}`);
  getSlideshow();
}

// Setup all event listeners
function setupEvents() {
  favoritesButton.addEventListener('click', showFavorites);
  cartButton.addEventListener('click', showCart);
  moreButton.addEventListener('click', loadMore);
  closeFavorites.addEventListener('click', function() {
    favoritesModal.classList.add('hidden');
  });
  closeCart.addEventListener('click', function() {
    cartModal.classList.add('hidden');
  });
  prevSlideButton.addEventListener('click', prevSlide);
  nextSlideButton.addEventListener('click', nextSlide);
  
  searchButton.addEventListener('click', searchRecipe);
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchRecipe();
  });
  closeRecipe.addEventListener('click', function() {
    recipeModal.classList.add('hidden');
  });
}

// Show loading spinner
function showLoader() {
  loadingElement.classList.remove('hidden');
}

// Hide loading spinner
function hideLoader() {
  loadingElement.classList.add('hidden');
}

// Make API calls
async function callApi(url) {
  try {
    showLoader();
    let response = await fetch(url);
    if (!response.ok) {
      throw new Error('API error');
    }
    return await response.json();
  } catch (error) {
    console.log('API error:', error);
    throw error;
  } finally {
    hideLoader();
  }
}

// Get available cuisines
async function getCuisines(forceLoad = false) {
  if (cuisineList.length > 0 && !forceLoad) {
    updateFilters();
    return;
  }

  let url = `${apiUrl}/complexSearch?apiKey=${apiKey}&number=100&addRecipeInformation=true`;

  try {
    showLoader();
    let data = await callApi(url);
    let foundCuisines = new Set();
    
    data.results.forEach(recipe => {
      if (recipe.cuisines && recipe.cuisines.length) {
        recipe.cuisines.forEach(c => {
          if (c && typeof c === 'string') {
            foundCuisines.add(c.trim());
          }
        });
      }
      
      if (recipe.dishTypes && recipe.dishTypes.length) {
        recipe.dishTypes.forEach(dish => {
          let possible = ['Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean'];
          possible.forEach(cuisine => {
            if (dish.toLowerCase().includes(cuisine.toLowerCase())) {
              foundCuisines.add(cuisine);
            }
          });
        });
      }
    });

    if (foundCuisines.size > 0) {
      cuisineList = Array.from(foundCuisines).filter(c => c.length > 0).sort();
    } else {
      throw new Error("No cuisines found");
    }
    
    updateFilters();
  } catch (error) {
    console.log("Error getting cuisines:", error);
    if (cuisineList.length === 0) {
      filterButtons.innerHTML = `
        <p class="text-red-500">
          Could not load cuisines. 
          <button onclick="getCuisines(true)" class="text-blue-500 underline">
            Try Again
          </button>
        </p>
      `;
    }
  } finally {
    hideLoader();
  }
}

// Update filter buttons
function updateFilters() {
  filterButtons.innerHTML = '';

  if (cuisineList.length === 0) {
    filterButtons.innerHTML = '<p class="text-gray-500">No cuisines</p>';
    return;
  }

  let allButton = document.createElement("button");
  allButton.textContent = "All";
  allButton.className = `px-4 py-2 rounded mr-2 mb-2 ${
    activeFilter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
  }`;
  allButton.onclick = function() { filterByCuisine('all'); };
  filterButtons.appendChild(allButton);

  cuisineList.forEach(cuisine => {
    let button = document.createElement("button");
    button.textContent = cuisine;
    button.className = `px-4 py-2 rounded mr-2 mb-2 ${
      activeFilter === cuisine ? 'bg-green-600 text-white' : 'bg-green-200 text-green-800 hover:bg-green-300'
    }`;
    button.onclick = function() { filterByCuisine(cuisine); };
    filterButtons.appendChild(button);
  });
}

// Filter recipes by cuisine
function filterByCuisine(cuisine) {
  currentOffset = 0;
  activeFilter = cuisine;
  
  let url;
  if (cuisine === 'all') {
    url = `${apiUrl}/complexSearch?apiKey=${apiKey}&number=20&offset=${currentOffset}`;
  } else {
    url = `${apiUrl}/complexSearch?apiKey=${apiKey}&cuisine=${encodeURIComponent(cuisine)}&number=20&offset=${currentOffset}`;
  }
  
  getRecipes(url);
}

// Get recipes from API
async function getRecipes(url, addMore = false) {
  try {
    let data = await callApi(url);
    let recipes = data.results || [];
    if (!addMore) recipesContainer.innerHTML = '';
    if (recipes.length === 0) {
      recipesContainer.innerHTML = '<p class="text-gray-500">No recipes</p>';
      return;
    }
    recipes.forEach(recipe => {
      let card = makeRecipeCard(recipe);
      recipesContainer.appendChild(card);
    });
    setupRecipeEvents();
  } catch (error) {
    recipesContainer.innerHTML = '<p class="text-red-500">Error loading recipes</p>';
  }
}

// Create recipe card HTML
function makeRecipeCard(recipe) {
  let card = document.createElement('div');
  card.className = "bg-white rounded-lg shadow-md overflow-hidden relative group";
  card.innerHTML = `
    <div class="h-48 overflow-hidden relative">
      <img src="${recipe.image}" alt="${recipe.title}" class="w-full h-full object-cover cursor-pointer" />
      <div class="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-70 text-white opacity-0 group-hover:opacity-100 transition p-4">
        <h3 class="text-xl font-bold mb-2">${recipe.title}</h3>
        <p class="text-sm mb-3">${recipe.summary || 'No description'}</p>
        <p class="text-green-300 font-bold">$${(Math.random() * 20 + 5).toFixed(2)}</p>
      </div>
    </div>
    <div class="p-4">
      <h3 class="text-lg font-bold mb-2">${recipe.title}</h3>
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center">
          <span class="text-yellow-400">★★★★☆</span>
          <span class="text-gray-500 ml-1">(4.0)</span>
        </div>
        <p class="text-green-600 font-bold">$${(Math.random() * 20 + 5).toFixed(2)}</p>
      </div>
      <div class="flex justify-between">
        <button class="add-cart bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">Add to Cart</button>
        <button class="favorite text-red-500 hover:text-red-700">♥</button>
      </div>
    </div>
  `;
  return card;
}

// Setup event listeners for recipe cards
function setupRecipeEvents() {
  document.querySelectorAll('.add-cart').forEach(btn => {
    btn.addEventListener('click', function(e) {
      let card = e.target.closest('.bg-white');
      let title = card.querySelector('h3').textContent;
      let price = parseFloat(card.querySelector('.text-green-600').textContent.replace('$', ''));
      let image = card.querySelector('img').src;
      cartItems.push({ title, price, image });
      alert(`${title} added to cart!`);
    });
  });

  document.querySelectorAll('.favorite').forEach(btn => {
    btn.addEventListener('click', function(e) {
      let card = e.target.closest('.bg-white');
      let title = card.querySelector('h3').textContent;
      let price = parseFloat(card.querySelector('.text-green-600').textContent.replace('$', ''));
      let image = card.querySelector('img').src;
      let exists = favoritesList.findIndex(item => item.title === title);
      if (exists >= 0) {
        favoritesList.splice(exists, 1);
        e.target.classList.remove('text-red-700');
        e.target.classList.add('text-red-500');
        alert(`${title} removed from favorites!`);
      } else {
        favoritesList.push({ title, price, image });
        e.target.classList.remove('text-red-500');
        e.target.classList.add('text-red-700');
        alert(`${title} added to favorites!`);
      }
    });
  });
}

// Show favorites modal
function showFavorites() {
  showLoader();
  setTimeout(() => {
    favoritesElement.innerHTML = favoritesList.length === 0 
      ? '<p class="text-gray-500">No favorites</p>'
      : favoritesList.map((item, index) => `
          <li class="flex items-center justify-between p-2 border-b">
            <div class="flex items-center space-x-4">
              <img src="${item.image}" class="w-16 h-16 object-cover rounded">
              <div>
                <h3 class="font-bold">${item.title}</h3>
                <p class="text-gray-500">$${item.price.toFixed(2)}</p>
              </div>
            </div>
            <button onclick="removeFavorite(${index})" class="text-red-500 hover:text-red-700">Remove</button>
          </li>
        `).join('');
    favoritesModal.classList.remove('hidden');
    hideLoader();
  }, 300);
}

// Show cart modal
function showCart() {
  showLoader();
  setTimeout(() => {
    cartElement.innerHTML = cartItems.length === 0 
      ? '<p class="text-gray-500">Cart is empty</p>'
      : cartItems.map((item, index) => `
          <li class="flex items-center justify-between p-2 border-b">
            <div class="flex items-center space-x-4">
              <img src="${item.image}" class="w-16 h-16 object-cover rounded">
              <div>
                <h3 class="font-bold">${item.title}</h3>
                <p class="text-gray-500">$${item.price.toFixed(2)}</p>
              </div>
            </div>
            <button onclick="removeCartItem(${index})" class="text-red-500 hover:text-red-700">Remove</button>
          </li>
        `).join('');
    let total = cartItems.reduce((sum, item) => sum + item.price, 0);
    cartTotal.textContent = `Total: $${total.toFixed(2)}`;
    cartModal.classList.remove('hidden');
    hideLoader();
  }, 300);
}

// Remove favorite
function removeFavorite(index) {
  favoritesList.splice(index, 1);
  showFavorites();
}

// Remove cart item
function removeCartItem(index) {
  cartItems.splice(index, 1);
  showCart();
}

// Load more recipes
function loadMore() {
  currentOffset += 20;
  let url = activeFilter === 'all'
    ? `${apiUrl}/complexSearch?apiKey=${apiKey}&number=20&offset=${currentOffset}`
    : `${apiUrl}/complexSearch?apiKey=${apiKey}&cuisine=${encodeURIComponent(activeFilter)}&number=20&offset=${currentOffset}`;
  getRecipes(url, true);
}

// Get slideshow data
async function getSlideshow() {
  try {
    let data = await callApi(`${apiUrl}/complexSearch?apiKey=${apiKey}&number=5`);
    slidesData = data.results || [];
    if (slidesData.length > 0) {
      changeSlide();
      autoSlide();
    }
  } catch (error) {
    console.log('Slideshow error:', error);
  }
}

// Change slideshow slide
function changeSlide() {
  if (slidesData.length === 0) return;
  let slide = slidesData[currentSlide];
  slideshow.innerHTML = `
    <div class="flex w-full h-full">
      <div class="w-1/2 h-full">
        <img src="${slide.image}" class="w-full h-full object-cover" />
      </div>
      <div class="w-1/2 h-full p-8 flex flex-col justify-center">
        <h2 class="text-2xl font-bold mb-4">${slide.title}</h2>
        <p class="text-gray-600 mb-6">Try this delicious recipe!</p>
      </div>
    </div>
  `;
}

// Auto slide change
function autoSlide() {
  if (slidesData.length > 1) {
    setInterval(nextSlide, 5000);
  }
}

// Next slide
function nextSlide() {
  currentSlide = (currentSlide + 1) % slidesData.length;
  changeSlide();
}

// Previous slide
function prevSlide() {
  currentSlide = (currentSlide - 1 + slidesData.length) % slidesData.length;
  changeSlide();
}

// Search for recipes
async function searchRecipe() {
  let query = searchInput.value.trim();
  if (!query) return;

  try {
    showLoader();
    let url = `${apiUrl}/complexSearch?apiKey=${apiKey}&query=${encodeURIComponent(query)}&number=1`;
    let data = await callApi(url);
    
    if (data.results && data.results.length > 0) {
      let recipe = data.results[0];
      currentRecipe = recipe;
      showRecipeDetails(recipe);
    } else {
      alert('No recipes found with that name');
    }
  } catch (error) {
    console.log('Search error:', error);
    alert('Error searching for recipe');
  } finally {
    hideLoader();
  }
}

// Show recipe details in modal
async function showRecipeDetails(recipe) {
  try {
    showLoader();
    let detailsUrl = `${apiUrl}/${recipe.id}/information?apiKey=${apiKey}`;
    let details = await callApi(detailsUrl);
    
    modalRecipeTitle.textContent = details.title;
    modalRecipeImage.src = details.image;
    modalRecipePrice.textContent = `$${(Math.random() * 20 + 5).toFixed(2)}`;
    modalRecipeSummary.innerHTML = details.summary || 'No description available';
    
    modalRecipeIngredients.innerHTML = '';
    if (details.extendedIngredients) {
      details.extendedIngredients.slice(0, 5).forEach(ing => {
        let li = document.createElement('li');
        li.textContent = ing.original;
        modalRecipeIngredients.appendChild(li);
      });
    }
    
    modalAddCart.onclick = function() {
      cartItems.push({
        title: details.title,
        price: parseFloat(modalRecipePrice.textContent.replace('$', '')),
        image: details.image
      });
      alert(`${details.title} added to cart!`);
    };
    
    modalAddFavorite.onclick = function() {
      let exists = favoritesList.findIndex(item => item.title === details.title);
      if (exists >= 0) {
        favoritesList.splice(exists, 1);
        modalAddFavorite.classList.remove('text-red-700');
        modalAddFavorite.classList.add('text-red-500');
        modalAddFavorite.textContent = '♥ Favorite';
        alert(`${details.title} removed from favorites!`);
      } else {
        favoritesList.push({
          title: details.title,
          price: parseFloat(modalRecipePrice.textContent.replace('$', '')),
          image: details.image
        });
        modalAddFavorite.classList.remove('text-red-500');
        modalAddFavorite.classList.add('text-red-700');
        modalAddFavorite.textContent = '♥ Favorited';
        alert(`${details.title} added to favorites!`);
      }
    };
    
    recipeModal.classList.remove('hidden');
  } catch (error) {
    console.log('Details error:', error);
    alert('Error loading recipe details');
  } finally {
    hideLoader();
  }
}

// Start the website when DOM is loaded
document.addEventListener('DOMContentLoaded', startWebsite);

// Make functions available globally
window.removeFavorite = removeFavorite;
window.removeCartItem = removeCartItem;
window.getCuisines = getCuisines;