// ─────────────────────────────────────────
//  WORTHDAGIVE — HOMEPAGE SCRIPT (CLEAN)
// ─────────────────────────────────────────

// ─────────────────────────────────────────
//  CART
// ─────────────────────────────────────────
function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
    const total = getCart().reduce((sum, item) => sum + item.quantity, 0);
    const el = document.getElementById('cartCount');
    if (el) el.textContent = total;
}

window.addToCart = function (productId) {
    const cart = getCart();
    const existing = cart.find(i => i.id === productId);

    if (existing) existing.quantity++;
    else cart.push({ id: productId, quantity: 1 });

    saveCart(cart);
    updateCartCount();
};

// ─────────────────────────────────────────
//  FETCH PRODUCTS FROM SUPABASE
// ─────────────────────────────────────────
async function getAllProducts() {
    const { data, error } = await supabase.from('products').select('*');

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
}

// ─────────────────────────────────────────
//  FEATURED PRODUCTS (HOMEPAGE)
// ─────────────────────────────────────────
async function renderFeaturedProducts() {
    const grid = document.getElementById('featuredGrid');
    if (!grid) return;

    grid.innerHTML = "<p>Loading...</p>";

    const products = await getAllProducts();

    if (!products.length) {
        grid.innerHTML = "<p>No products found</p>";
        return;
    }

    grid.innerHTML = products.slice(0, 3).map(p => `
        <div class="product-card">
            <img src="${p.image_url}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p>R${Number(p.price).toFixed(2)}</p>
            <button onclick="addToCart('${p.id}')">Add to Cart</button>
        </div>
    `).join("");
}

// ─────────────────────────────────────────
//  PROMO BANNER
// ─────────────────────────────────────────
function initBanner() {
    const closeBtn = document.getElementById("promoBannerClose");
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById("promoBanner").style.display = "none";
        };
    }
}

// ─────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
    updateCartCount();
    renderFeaturedProducts();
    initBanner();
});
