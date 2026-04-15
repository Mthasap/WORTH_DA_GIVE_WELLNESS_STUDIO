/* ═══════════════════════════════════════════════════
   WORTHDAGIVE — products.js (SUPABASE FINAL CLEAN)
═══════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────
//  PRODUCTS (SUPABASE)
// ─────────────────────────────────────────────────
async function getAllProducts() {
    return await WDG.getProducts();
}

async function getProductById(id) {
    const products = await getAllProducts();
    return products.find(p => String(p.id) === String(id));
}

// ─────────────────────────────────────────────────
//  CART
// ─────────────────────────────────────────────────
function getCart() {
    try { return JSON.parse(localStorage.getItem('cart')) || []; }
    catch(e) { return []; }
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
    const total = getCart().reduce((sum, i) => sum + i.quantity, 0);
    const el = document.getElementById('cartCount');
    if (el) el.textContent = total;
}

window.addToCart = function(productId) {
    let cart = getCart();
    let item = cart.find(i => i.id === productId);

    if (item) item.quantity++;
    else cart.push({ id: productId, quantity: 1 });

    saveCart(cart);
    updateCartCount();
    alert("Added to cart");
};

// ─────────────────────────────────────────────────
//  PRODUCT CARD
// ─────────────────────────────────────────────────
function createProductCard(product) {
    const img = product.image_url || '';

    return `
        <div class="product-card">
            <img src="${img}" alt="${product.name}">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p>R${product.price}</p>
                <button onclick="addToCart('${product.id}')">Add to Cart</button>
            </div>
        </div>
    `;
}

// ─────────────────────────────────────────────────
//  RENDER PRODUCTS
// ─────────────────────────────────────────────────
async function renderProducts() {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    grid.innerHTML = "<p>Loading...</p>";

    const products = await getAllProducts();

    if (!products.length) {
        grid.innerHTML = "<p>No products found</p>";
        return;
    }

    grid.innerHTML = products.map(createProductCard).join("");
}

// ─────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
    updateCartCount();
    renderProducts();
});
