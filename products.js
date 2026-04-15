/* ═══════════════════════════════════════════════════
   WORTHDAGIVE — products.js (CLEAN FINAL VERSION)
═══════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────
//  CATEGORIES
// ─────────────────────────────────────────────────
var DEFAULT_CATEGORIES = [
    { name: "Disposables", subs: ["Vapes", "Refills", "Hybrid"] },
    { name: "Edibles", subs: [] },
    { name: "Accessories", subs: [] },
    { name: "WorthDaGive Merchandise", subs: [] },
    { name: "Beverages", subs: [] },
    { name: "Hair & Beauty", subs: [] },
    { name: "Pre-Rolls", subs: ["Indica"] }
];

function getCategories() {
    try {
        var stored = localStorage.getItem('wdg_categories');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
}

// ─────────────────────────────────────────────────
//  SUPABASE PRODUCTS
// ─────────────────────────────────────────────────
async function getAllProducts() {
    return await WDG.getProducts();
}

// ⚠️ TEMP (we fix later properly)
function getProductById(id) {
    return null;
}

function getPrimaryImage(product) {
    if (product.images && product.images.length > 0) return product.images[0];
    if (product.image) return product.image;
    return '';
}

// ─────────────────────────────────────────────────
//  CART
// ─────────────────────────────────────────────────
function getCart() { 
    try { return JSON.parse(localStorage.getItem('cart')) || []; } 
    catch(e) { return []; } 
}

function saveCart(c) { 
    localStorage.setItem('cart', JSON.stringify(c)); 
}

function updateCartCount() {
    var total = getCart().reduce((s, i) => s + i.quantity, 0);
    var el = document.getElementById('cartCount');
    if (el) el.textContent = total;
}

window.addToCart = function(productId) {
    var cart = getCart();
    var existing = cart.find(i => i.id === productId);

    if (existing) existing.quantity += 1;
    else cart.push({ id: productId, quantity: 1 });

    saveCart(cart);
    updateCartCount();
    updateStickyCartBar();
    showToast('Added to cart');
};

// ─────────────────────────────────────────────────
//  SKELETON
// ─────────────────────────────────────────────────
function buildSkeletonCard() {
    var el = document.createElement('div');
    el.className = 'product-skeleton';
    el.innerHTML = `
        <div class="skeleton-img"></div>
        <div class="skeleton-body">
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line price"></div>
            <div class="skeleton-line long"></div>
            <div class="skeleton-line short"></div>
            <div class="skeleton-btn"></div>
        </div>`;
    return el;
}

// ─────────────────────────────────────────────────
//  PRODUCT CARD
// ─────────────────────────────────────────────────
function createProductCard(product) {
    var card = document.createElement('div');
    card.className = 'product-card';

    var img = product.image_url || product.image || '';

    card.innerHTML = `
        <div class="product-image">
            <img src="${img}" alt="${product.name}">
        </div>

        <div class="product-info">
            <p class="product-category-label">${product.category || ''}</p>
            <h3>${product.name}</h3>
            <p class="product-price">R${Number(product.price).toFixed(2)}</p>

            <div class="product-card-actions">
                <button onclick="addToCart('${product.id}')">Add to Cart</button>
            </div>
        </div>
    `;

    return card;
}

// ─────────────────────────────────────────────────
//  RENDER PRODUCTS (SUPABASE)
// ─────────────────────────────────────────────────
async function renderProducts() {
    populateCategoryFilter();

    var searchQuery = (document.getElementById('searchInput')?.value || '').toLowerCase();
    var categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
    var sortOption = document.getElementById('sortFilter')?.value || 'default';

    var grid = document.getElementById('productGrid');
    var noResults = document.getElementById('noResults');
    var resultsCount = document.getElementById('resultsCount');

    if (!grid) return;

    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) grid.appendChild(buildSkeletonCard());

    // 🔥 FETCH FROM SUPABASE
    const allP = await getAllProducts();

    let filtered = allP.filter(p => {
        const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery);
        const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
        return matchSearch && matchCat;
    });

    // Sorting
    if (sortOption === 'price-asc') filtered.sort((a,b)=>a.price-b.price);
    if (sortOption === 'price-desc') filtered.sort((a,b)=>b.price-a.price);

    setTimeout(() => {
        grid.innerHTML = '';

        if (!filtered.length) {
            if (noResults) noResults.classList.remove('hidden');
        } else {
            if (noResults) noResults.classList.add('hidden');

            if (resultsCount)
                resultsCount.textContent = `Showing ${filtered.length} products`;

            filtered.forEach((p, i) => {
                const card = createProductCard(p);
                card.style.animationDelay = (i * 80) + 'ms';
                grid.appendChild(card);
            });
        }
    }, 300);
}

// ─────────────────────────────────────────────────
//  FILTERS
// ─────────────────────────────────────────────────
function setupSearchAndFilter() {
    document.getElementById('searchInput')?.addEventListener('input', renderProducts);
    document.getElementById('categoryFilter')?.addEventListener('change', renderProducts);
    document.getElementById('sortFilter')?.addEventListener('change', renderProducts);
}

// ─────────────────────────────────────────────────
//  CATEGORY DROPDOWN
// ─────────────────────────────────────────────────
function populateCategoryFilter() {
    var sel = document.getElementById('categoryFilter');
    if (!sel) return;

    sel.innerHTML = '<option value="all">All Categories</option>';

    getCategories().forEach(cat => {
        var opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = cat.name;
        sel.appendChild(opt);
    });
}

// ─────────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────────
function showToast(msg) {
    alert(msg);
}

// ─────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {

    if (localStorage.getItem('ageVerified') !== 'true') {
        window.location.replace('index.html');
        return;
    }

    updateCartCount();
    renderProducts();

    setupSearchAndFilter();
});
