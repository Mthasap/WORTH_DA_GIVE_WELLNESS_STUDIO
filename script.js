/* ════════════════════════════════════════
   FIXED — script.js (Homepage)
════════════════════════════════════════ */

// ─────────────────────────────────────────
//  SUPABASE PRODUCTS (REPLACES localStorage)
// ─────────────────────────────────────────
async function getAllProducts() {
    return await WDG.getProducts();
}

// ─────────────────────────────────────────
//  CART HELPERS
// ─────────────────────────────────────────
function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}
function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

async function getProductById(id) {
    const products = await getAllProducts();
    return products.find(p => p.id === id);
}

function getPrimaryImage(product) {
    if (product.images && product.images.length > 0) return product.images[0];
    if (product.image) return product.image;
    return '';
}

function updateCartCount() {
    const total = getCart().reduce((sum, item) => sum + item.quantity, 0);
    const el = document.getElementById('cartCount');
    if (el) el.textContent = total;
}

// ─────────────────────────────────────────
//  ADD TO CART
// ─────────────────────────────────────────
window.addToCart = function (productId) {
    const cart = getCart();
    const existing = cart.find(item => item.id === productId);

    if (existing) existing.quantity += 1;
    else cart.push({ id: productId, quantity: 1 });

    saveCart(cart);
    updateCartCount();
    updateStickyCartBar();
    showToast('Item added to cart 🛒');
};

// ─────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────
function showToast(msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();

    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;

    document.body.appendChild(t);

    requestAnimationFrame(() => t.classList.add('toast-show'));

    setTimeout(() => {
        t.classList.remove('toast-show');
        setTimeout(() => t.remove(), 300);
    }, 2500);
}

// ─────────────────────────────────────────
//  SAFE EVENT LISTENER HELPER (NO MORE CRASH)
// ─────────────────────────────────────────
function safeClick(id, callback) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', callback);
}

// ─────────────────────────────────────────
//  DOM READY
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    const ageModal = document.getElementById('ageModal');
    const mainContent = document.getElementById('mainContent');

    function revealSite() {
        if (ageModal) ageModal.style.display = 'none';
        if (mainContent) mainContent.classList.remove('hidden');
        initPage();
    }

    if (localStorage.getItem('ageVerified') === 'true') {
        revealSite();
    }

    safeClick('ageYes', function () {
        localStorage.setItem('ageVerified', 'true');
        revealSite();
    });

    safeClick('ageNo', function () {
        window.location.href = 'https://www.google.com';
    });
});

// ─────────────────────────────────────────
//  PAGE INIT
// ─────────────────────────────────────────
function initPage() {
    updateCartCount();
    loadFeaturedProducts();
    initModals();
    initHamburger();
}

// ─────────────────────────────────────────
//  FEATURED PRODUCTS (FROM SUPABASE)
// ─────────────────────────────────────────
async function loadFeaturedProducts() {
    const grid = document.getElementById('featuredGrid');
    if (!grid) return;

    grid.innerHTML = '<p>Loading products...</p>';

    const products = await getAllProducts();

    grid.innerHTML = '';

    products.slice(0, 4).forEach(p => {
        const img = p.images?.[0] || p.image;

        grid.innerHTML += `
            <div class="product-card">
                <img src="${img}" alt="${p.name}">
                <h3>${p.name}</h3>
                <p>R${p.price}</p>
                <button onclick="addToCart(${p.id})">Add to Cart</button>
            </div>
        `;
    });
}

// ─────────────────────────────────────────
//  MODALS (SAFE FIXED)
// ─────────────────────────────────────────
function initModals() {

    safeClick('loginBtn', function (e) {
        e.preventDefault();
        if (typeof openAuthModal === 'function') {
            openAuthModal('login');
        }
    });

    safeClick('cartBtn', function (e) {
        e.preventDefault();
        showToast('Cart coming soon');
    });

    const closeButtons = document.querySelectorAll('.close[data-modal]');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const modal = document.getElementById(this.dataset.modal);
            if (modal) modal.classList.add('hidden');
        });
    });
}

// ─────────────────────────────────────────
//  HAMBURGER
// ─────────────────────────────────────────
function initHamburger() {
    const btn = document.getElementById('hamburgerBtn');
    const nav = document.getElementById('mainNav');

    if (!btn || !nav) return;

    btn.addEventListener('click', function () {
        btn.classList.toggle('open');
        nav.classList.toggle('open');
    });
}

// ─────────────────────────────────────────
//  STICKY CART BAR
// ─────────────────────────────────────────
function updateStickyCartBar() {
    const bar = document.getElementById('stickyCartBar');
    if (!bar) return;

    const cart = getCart();
    const count = cart.reduce((sum, i) => sum + i.quantity, 0);

    if (count > 0) bar.classList.add('visible');
    else bar.classList.remove('visible');
}
