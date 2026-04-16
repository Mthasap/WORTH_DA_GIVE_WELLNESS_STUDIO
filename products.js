// ═══════════════════════════════════════════════════════
//  WORTHDAGIVE — products.js  (products page)
//  Reads products from Supabase — same for ALL visitors
// ═══════════════════════════════════════════════════════

// ─── CART (same as script.js) ─────────────────────────
function getCart()   { try { return JSON.parse(localStorage.getItem('cart')) || []; } catch(e) { return []; } }
function saveCart(c) { localStorage.setItem('cart', JSON.stringify(c)); }

function updateCartCount() {
    var n = getCart().reduce(function(s, i) { return s + i.quantity; }, 0);
    var el = document.getElementById('cartCount');
    if (el) el.textContent = n;
}

var PRODUCTS_CACHE = null;

async function fetchProducts() {
    if (PRODUCTS_CACHE) return PRODUCTS_CACHE;
    try { PRODUCTS_CACHE = await dbGetProducts(); } catch(e) { PRODUCTS_CACHE = []; }
    return PRODUCTS_CACHE;
}

function getProductById(id) {
    if (!PRODUCTS_CACHE) return null;
    return PRODUCTS_CACHE.find(function(p) { return String(p.id) === String(id); });
}

function getPrimaryImage(p) {
    var url = '';
    if (p.images && p.images.length) url = p.images[0];
    else if (p.image_url) url = p.image_url;
    
    // Auto-compress and resize Cloudinary images for instant mobile loading
    if (url && url.includes('cloudinary.com') && url.includes('/upload/v')) {
        return url.replace('/upload/', '/upload/w_600,q_auto,f_auto/');
    }
    return url;
}

window.addToCart = function(productId) {
    var cart = getCart();
    var item = cart.find(function(i) { return String(i.id) === String(productId); });
    if (item) item.quantity++;
    else cart.push({ id: productId, quantity: 1 });
    saveCart(cart);
    updateCartCount();
    showToast('Added to cart');
    updateStickyBar();
};

window.removeFromCart = function(productId) {
    saveCart(getCart().filter(function(i) { return String(i.id) !== String(productId); }));
    updateCartCount();
    updateStickyBar();
    renderCartModal();
};

function renderCartModal() {
    var cart = getCart();
    var el  = document.getElementById('cartItems');
    var tot = document.getElementById('cartTotal');
    if (!el) return;
    if (!cart.length) {
        el.innerHTML = '<p style="text-align:center;color:#aaa;padding:1.5rem 0">Your cart is empty</p>';
        if (tot) tot.textContent = '0.00';
        return;
    }
    var total = 0, html = '';
    cart.forEach(function(item) {
        var p = getProductById(item.id);
        if (!p) return;
        var line = Number(p.price) * item.quantity;
        total += line;
        var img = getPrimaryImage(p);
        html += '<div class="cart-item">' +
            (img ? '<img src="' + img + '" style="width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0">' : '') +
            '<div class="cart-item-info"><p>' + p.name + '</p><span>Qty: ' + item.quantity + ' &times; R' + Number(p.price).toFixed(2) + '</span></div>' +
            '<div class="cart-item-price">R' + line.toFixed(2) + '</div>' +
            '<button class="cart-item-remove" onclick="removeFromCart(\'' + p.id + '\')" aria-label="Remove">&times;</button>' +
            '</div>';
    });
    el.innerHTML = html;
    if (tot) tot.textContent = total.toFixed(2);
}

function showToast(msg) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function() { t.classList.add('toast-show'); });
    setTimeout(function() { t.classList.remove('toast-show'); setTimeout(function() { t.remove(); }, 300); }, 2500);
}

// ─── BANNER ───────────────────────────────────────────
async function initPromoBanner() {
    var banner   = document.getElementById('promoBanner');
    var textEl   = document.getElementById('promoBannerText');
    var closeBtn = document.getElementById('promoBannerClose');
    if (!banner) return;
    if (closeBtn) {
        var closeBanner = function(e) {
            e.preventDefault();
            e.stopPropagation();
            banner.style.display = 'none';
        };
        closeBtn.addEventListener('click',    closeBanner, { passive: false });
        closeBtn.addEventListener('touchend', closeBanner, { passive: false });
    }
    try {
        var data = await dbGetActiveBanner();
        if (data && data.text) {
            if (textEl) textEl.textContent = data.text;
            var colorMap = { green:'#2c5530', red:'#c62828', orange:'#e65100', blue:'#1565c0' };
            banner.style.background = colorMap[data.color] || '#2c5530';
            banner.style.display = '';
        } else {
            banner.style.display = 'none';
        }
    } catch(e) {
        banner.style.display = 'none';
    }
}

// ─── PRODUCT CARD ─────────────────────────────────────
function buildSkeletonCard() {
    var el = document.createElement('div');
    el.className = 'product-skeleton';
    el.innerHTML = '<div class="skeleton-img"></div><div class="skeleton-body">' +
        '<div class="skeleton-line medium"></div><div class="skeleton-line price"></div>' +
        '<div class="skeleton-line long"></div><div class="skeleton-btn"></div></div>';
    return el;
}

function buildProductCard(p) {
    var card = document.createElement('div');
    card.className = 'product-card';
    var img = getPrimaryImage(p);
    var tag = (p.is_cannabis !== false) ? '<p class="cannabis-product-tag">Cannabis-infused &mdash; 18+ only</p>' : '';
    var sub = p.subcategory ? '<span class="product-sub-cat">' + p.subcategory + '</span>' : '';
    card.innerHTML =
        '<div class="product-image" role="button" tabindex="0" aria-label="Quick view ' + p.name + '">' +
            (img ? '<img src="' + img + '" alt="' + p.name + '" loading="lazy" class="card-main-img">' : '<span class="no-image">No image</span>') +
        '</div>' +
        '<div class="product-info">' +
            '<p class="product-category-label">' + (p.category || '') + sub + '</p>' +
            '<h3>' + p.name + '</h3>' +
            '<p class="product-price">R' + Number(p.price).toFixed(2) + '</p>' +
            (p.description ? '<p class="product-desc-short">' + p.description + '</p>' : '') +
            tag +
            '<div class="product-card-actions">' +
                '<button class="add-to-cart" onclick="addToCart(\'' + p.id + '\')">Add to Cart</button>' +
                '<button class="quick-view-btn" onclick="openQuickView(\'' + p.id + '\')">Quick View</button>' +
            '</div>' +
        '</div>';
    card.querySelector('.product-image').addEventListener('click', function() { openQuickView(p.id); });
    return card;
}

function openQuickView(productId) {
    var p = getProductById(productId);
    if (!p) return;
    var existing = document.getElementById('quickViewModal');
    if (existing) existing.remove();
    var img = getPrimaryImage(p);
    var tag = (p.is_cannabis !== false) ? '<span class="qv-badge cannabis-badge">Cannabis-infused &mdash; 18+ only</span>' : '';
    var modal = document.createElement('div');
    modal.id = 'quickViewModal';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.8);align-items:center;justify-content:center;padding:16px';
    modal.innerHTML =
        '<div class="qv-box" style="background:#fff;border-radius:14px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;position:relative">' +
        '<button onclick="document.getElementById(\'quickViewModal\').remove();document.body.style.overflow=\'\'" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:1.6rem;cursor:pointer;color:#555;z-index:1;width:36px;height:36px;display:flex;align-items:center;justify-content:flex-end">&times;</button>' +
        '<div style="background:#f0f0f0;display:flex;align-items:center;justify-content:center;min-height:260px;border-radius:14px 0 0 14px;overflow:hidden">' +
            (img ? '<img src="' + img + '" alt="' + p.name + '" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy">' : '<span style="color:#aaa;font-size:0.9rem">No image</span>') +
        '</div>' +
        '<div style="padding:2rem;display:flex;flex-direction:column;gap:0.5rem">' +
            '<p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#4CAF50">' + (p.category || '') + (p.subcategory ? ' &rsaquo; ' + p.subcategory : '') + '</p>' +
            '<h2 style="color:#2c5530;font-size:1.3rem;line-height:1.3">' + p.name + '</h2>' +
            '<p style="font-size:1.4rem;font-weight:700;color:#4CAF50">R' + Number(p.price).toFixed(2) + '</p>' +
            (p.description ? '<p style="font-size:0.9rem;color:#555;line-height:1.7">' + p.description + '</p>' : '') +
            '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0">' +
                (p.thc && p.thc !== 'N/A' ? '<span class="qv-badge">THC: ' + p.thc + '</span>' : '') +
                (p.cbd && p.cbd !== 'N/A' ? '<span class="qv-badge">CBD: ' + p.cbd + '</span>' : '') +
                tag +
            '</div>' +
            '<button onclick="addToCart(\'' + p.id + '\');document.getElementById(\'quickViewModal\').remove();document.body.style.overflow=\'\'" style="margin-top:auto;padding:14px;background:#4CAF50;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer;width:100%">Add to Cart &mdash; R' + Number(p.price).toFixed(2) + '</button>' +
        '</div>' +
        '</div>';
    modal.addEventListener('click', function(e) {
        if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; }
    });
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

// ─── CATEGORY FILTER ─────────────────────────────────
async function populateCategoryFilter() {
    var sel = document.getElementById('categoryFilter');
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = '<option value="all">All Categories</option>';
    try {
        var cats = await dbGetCategories();
        cats.forEach(function(cat) {
            var opt = document.createElement('option');
            opt.value = cat.name; opt.textContent = cat.name;
            if (cat.name === current) opt.selected = true;
            sel.appendChild(opt);
            if (cat.subcategories && cat.subcategories.length) {
                cat.subcategories.forEach(function(sub) {
                    var sopt = document.createElement('option');
                    sopt.value = cat.name + ' > ' + sub;
                    sopt.textContent = '\u00a0\u00a0\u00a0\u00bb ' + sub;
                    sel.appendChild(sopt);
                });
            }
        });
    } catch(e) {}
}

// ─── RENDER PRODUCTS ──────────────────────────────────
async function renderProducts() {
    await populateCategoryFilter();

    var searchQ = (document.getElementById('searchInput') ? document.getElementById('searchInput').value : '').trim().toLowerCase();
    var catF    = document.getElementById('categoryFilter') ? document.getElementById('categoryFilter').value : 'all';
    var sortF   = document.getElementById('sortFilter') ? document.getElementById('sortFilter').value : 'default';
    var grid    = document.getElementById('productGrid');
    var noRes   = document.getElementById('noResults');
    var resCount = document.getElementById('resultsCount');

    if (!grid) return;
    grid.innerHTML = '';
    for (var s = 0; s < 4; s++) grid.appendChild(buildSkeletonCard());

    var all = await fetchProducts();

    var filtered = all.filter(function(p) {
        var search = !searchQ ||
            p.name.toLowerCase().indexOf(searchQ) >= 0 ||
            (p.description || '').toLowerCase().indexOf(searchQ) >= 0 ||
            (p.category || '').toLowerCase().indexOf(searchQ) >= 0;
        var cat = catF === 'all' ||
            p.category === catF ||
            (p.category + ' > ' + (p.subcategory || '')) === catF;
        return search && cat;
    });

    if (sortF === 'price-asc')  filtered.sort(function(a,b) { return Number(a.price) - Number(b.price); });
    if (sortF === 'price-desc') filtered.sort(function(a,b) { return Number(b.price) - Number(a.price); });
    if (sortF === 'name-asc')   filtered.sort(function(a,b) { return a.name.localeCompare(b.name); });

    setTimeout(function() {
        grid.innerHTML = '';
        if (!filtered.length) {
            if (noRes) noRes.classList.remove('hidden');
            if (resCount) resCount.textContent = '';
        } else {
            if (noRes) noRes.classList.add('hidden');
            if (resCount) resCount.textContent = 'Showing ' + filtered.length + ' of ' + all.length + ' product' + (all.length !== 1 ? 's' : '');
            filtered.forEach(function(p, idx) {
                var card = buildProductCard(p);
                card.style.animationDelay = (idx * 80) + 'ms';
                grid.appendChild(card);
            });
        }
    }, 300);
}

// ─── STICKY BAR ───────────────────────────────────────
function updateStickyBar() {
    var bar = document.getElementById('stickyBar');
    if (!bar) return;
    var cart  = getCart();
    var count = cart.reduce(function(s,i) { return s + i.quantity; }, 0);
    var total = cart.reduce(function(s,i) {
        var p = getProductById(i.id);
        return p ? s + Number(p.price) * i.quantity : s;
    }, 0);
    var ce = document.getElementById('stickyCount');
    var te = document.getElementById('stickyTotal');
    if (ce) ce.textContent = count + ' item' + (count !== 1 ? 's' : '');
    if (te) te.textContent = 'R' + total.toFixed(2);
    bar.classList.toggle('visible', count > 0);
}

function initStickyBar() {
    if (document.getElementById('stickyBar')) return;
    var bar = document.createElement('div');
    bar.id = 'stickyBar';
    bar.className = 'sticky-cart-bar';
    bar.innerHTML = '<div class="sticky-cart-info">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' +
        '<div><span class="sticky-cart-count" id="stickyCount">0 items</span><span class="sticky-cart-total" id="stickyTotal">R0.00</span></div>' +
        '</div><button class="sticky-cart-btn" id="stickyBtn">View Cart</button>';
    document.body.appendChild(bar);
    document.getElementById('stickyBtn').addEventListener('click', function() {
        renderCartModal();
        var cm = document.getElementById('cartModal');
        if (cm) cm.classList.remove('hidden');
    });
    updateStickyBar();
}

// ─── HAMBURGER ────────────────────────────────────────
function initHamburger() {
    var btn = document.getElementById('hamburgerBtn');
    var nav = document.getElementById('mainNav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        btn.classList.toggle('open');
        nav.classList.toggle('open');
    });
    nav.querySelectorAll('a').forEach(function(a) {
        a.addEventListener('click', function() {
            btn.classList.remove('open');
            nav.classList.remove('open');
        });
    });
    document.addEventListener('click', function(e) {
        if (!nav.contains(e.target) && !btn.contains(e.target)) {
            btn.classList.remove('open');
            nav.classList.remove('open');
        }
    });
}

// ─── MODALS ───────────────────────────────────────────
function initModals() {
    var loginBtn  = document.getElementById('loginBtn');
    var cartBtn   = document.getElementById('cartBtn');
    var cartModal = document.getElementById('cartModal');

    if (loginBtn) loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof openAuthModal === 'function') openAuthModal('login');
    });
    if (cartBtn) cartBtn.addEventListener('click', function(e) {
        e.preventDefault();
        renderCartModal();
        if (cartModal) cartModal.classList.remove('hidden');
    });
    document.querySelectorAll('.close[data-modal]').forEach(function(b) {
        b.addEventListener('click', function() {
            var t = document.getElementById(b.dataset.modal);
            if (t) t.classList.add('hidden');
        });
    });
    window.addEventListener('click', function(e) {
        if (e.target === cartModal) cartModal.classList.add('hidden');
    });

    var checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            if (!getCart().length) { showToast('Your cart is empty'); return; }
            if (typeof authGetSession === 'function') {
                authGetSession().then(function(sess) {
                    if (!sess) {
                        if (cartModal) cartModal.classList.add('hidden');
                        if (typeof openAuthModal === 'function') openAuthModal('login', function() { window.location.href = 'checkout.html'; });
                    } else { window.location.href = 'checkout.html'; }
                }).catch(function() { window.location.href = 'checkout.html'; });
            } else { window.location.href = 'checkout.html'; }
        });
    }
}

// ─── SEARCH & FILTER ──────────────────────────────────
function setupSearchFilter() {
    var si = document.getElementById('searchInput');
    var cf = document.getElementById('categoryFilter');
    var sf = document.getElementById('sortFilter');
    if (si) si.addEventListener('input', renderProducts);
    if (cf) cf.addEventListener('change', renderProducts);
    if (sf) sf.addEventListener('change', renderProducts);
}

// ─── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function() {
    if (localStorage.getItem('ageVerified') !== 'true') {
        window.location.replace('index.html');
        return;
    }
    updateCartCount();
    initPromoBanner();
    initHamburger();
    initModals();
    setupSearchFilter();
    initStickyBar();
    renderProducts();
    if (typeof initAuth === 'function') initAuth().catch(function() {});
});
