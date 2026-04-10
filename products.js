/* ═══════════════════════════════════════════════════
   WORTHDAGIVE — products.js
   All products are Cloudinary-hosted images.
   The PRODUCTS array is the single source of truth
   for base products. Admin-added products are stored
   in localStorage key 'adminProducts' and merged in.
═══════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────
//  CATEGORY SYSTEM
//  Main categories + optional sub-categories.
//  Admin can add/remove these via admin.html.
//  Format stored in localStorage: 'wdg_categories'
//  [
//    { name: "Disposables", subs: ["Sativa","Indica","Hybrid"] },
//    { name: "Edibles",     subs: [] },
//    ...
//  ]
// ─────────────────────────────────────────────────
var DEFAULT_CATEGORIES = [
    { name: "Disposables",            subs: ["Vapes", "Refills", "Hybrid"] },
    { name: "Edibles",                subs: [] },
    { name: "Accessories",            subs: [] },
    { name: "WorthDaGive Merchandise",subs: [] },
    { name: "Beverages",              subs: [] },
    { name: "Hair & Beauty",          subs: [] }, 
    { name: "Pre-Rolls",              subs: ["Indica"] }
];

function getCategories() {
    try {
        var stored = localStorage.getItem('wdg_categories');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
}

function getCategoryNames() {
    return getCategories().map(function(c) { return c.name; });
}

// ─────────────────────────────────────────────────
//  BASE PRODUCT CATALOGUE
//  Only Cloudinary-hosted images.
//  To add more: copy a block, increment id, fill details.
// ─────────────────────────────────────────────────
var PRODUCTS = [
    {
        id: 1,
        name: "Jack The Ripper Sativa",
        price: 650.00,
        description: "Jack The Ripper Sativa disposable vape. A premium sativa-dominant experience in a sleek, ready-to-use device.",
        thc: "Available on request",
        cbd: "Available on request",
        category: "Disposables",
        subCategory: "Vapes",
        isCannabis: true,
        image: "https://res.cloudinary.com/dbcfzmxzt/image/upload/f_auto,q_auto,w_600/v1775678961/JACK_THE_RIPPER_SATIVA_disposable_vape_cfv9yc.png",
        images: [
            "https://res.cloudinary.com/dbcfzmxzt/image/upload/f_auto,q_auto,w_600/v1775678961/JACK_THE_RIPPER_SATIVA_disposable_vape_cfv9yc.png"
        ]
    }
    
    // ── ADD NEW PRODUCTS BELOW THIS LINE ─────────────────────────

    ,{
        id: 2,
        name: "THC Concentrated Sundae driver Disposable Vape",
        price: 650.00,
        description: "Liquid Gold THC Concentrated Sundae driver Disposable Vape",
        thc: "Available on request",
        cbd: "Available on request",
        category: "Disposables",
        subCategory: "Vapes",
        isCannabis: true,
        image: "https://res.cloudinary.com/dbcfzmxzt/image/upload/f_auto,q_auto,w_600/v1775680930/THC_Concentrated_Sundae_driver_Disposable_Vape_grtkfz.png",
        images: [
            "https://res.cloudinary.com/dbcfzmxzt/image/upload/f_auto,q_auto,w_600/v1775680930/THC_Concentrated_Sundae_driver_Disposable_Vape_grtkfz.png"
        ]
    }

    ,{
        id: 3,
        name: "Purple Skittles Indoor Pre-Roll",
        price: 100.00,
        description: "Premium indoor flower pre-roll Purple Skittles flavour",
        thc: "Available on request",
        cbd: "Available on request",
        category: "Pre-Rolls",
        subCategory: "Indica",
        isCannabis: true,
        image: "https://res.cloudinary.com/dbcfzmxzt/image/upload/f_auto,q_auto,w_600/v1775810915/New_pre-roll_j_s_mdhiq0.png",
        images: [
            "https://res.cloudinary.com/dbcfzmxzt/image/upload/f_auto,q_auto,w_600/v1775810915/New_pre-roll_j_s_mdhiq0.png"
        ]
    }
    // Copy the block above, paste it here, change id to 2, 3, 4 ...
    // Use Cloudinary URLs only — no media/ paths.
    // ─────────────────────────────────────────────────────────────
];

// ─────────────────────────────────────────────────
//  MERGE BASE + ADMIN PRODUCTS
// ─────────────────────────────────────────────────
function getAllProducts() {
    var adminList = [];
    try { adminList = JSON.parse(localStorage.getItem('adminProducts')) || []; } catch(e) {}
    var merged = JSON.parse(JSON.stringify(PRODUCTS));
    adminList.forEach(function(ap) {
        var idx = merged.findIndex(function(p) { return p.id === ap.id; });
        if (idx >= 0) { merged[idx] = ap; } else { merged.push(ap); }
    });
    return merged;
}

function getProductById(id) {
    return getAllProducts().find(function(p) { return p.id === id; });
}

function getPrimaryImage(product) {
    if (product.images && product.images.length > 0) return product.images[0];
    if (product.image) return product.image;
    return '';
}

// ─────────────────────────────────────────────────
//  CART
// ─────────────────────────────────────────────────
function getCart()   { try { return JSON.parse(localStorage.getItem('cart')) || []; } catch(e) { return []; } }
function saveCart(c) { localStorage.setItem('cart', JSON.stringify(c)); }

function updateCartCount() {
    var total = getCart().reduce(function(s, i) { return s + i.quantity; }, 0);
    var el = document.getElementById('cartCount');
    if (el) el.textContent = total;
}

window.addToCart = function(productId) {
    var cart = getCart();
    var existing = cart.find(function(i) { return i.id === productId; });
    if (existing) { existing.quantity += 1; }
    else           { cart.push({ id: productId, quantity: 1 }); }
    saveCart(cart);
    updateCartCount();
    updateStickyCartBar();
    showToast('Added to cart');
};

window.removeFromCart = function(productId) {
    saveCart(getCart().filter(function(i) { return i.id !== productId; }));
    updateCartCount();
    updateStickyCartBar();
    displayCart();
};

// ─────────────────────────────────────────────────
//  CART MODAL
// ─────────────────────────────────────────────────
function displayCart() {
    var cart = getCart();
    var itemsEl = document.getElementById('cartItems');
    var totalEl = document.getElementById('cartTotal');
    if (!itemsEl) return;
    if (!cart.length) {
        itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
        if (totalEl) totalEl.textContent = '0.00';
        return;
    }
    var total = 0, html = '';
    cart.forEach(function(item) {
        var p = getProductById(item.id);
        if (!p) return;
        var line = p.price * item.quantity;
        total += line;
        var thumb = getPrimaryImage(p);
        html += '<div class="cart-item">' +
            (thumb ? '<img src="' + thumb + '" style="width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;" loading="lazy" alt="' + p.name + '">' : '') +
            '<div class="cart-item-info"><p>' + p.name + '</p>' +
            '<span>Qty: ' + item.quantity + ' &times; R' + p.price.toFixed(2) + '</span></div>' +
            '<div class="cart-item-price">R' + line.toFixed(2) + '</div>' +
            '<button class="cart-item-remove" onclick="removeFromCart(' + p.id + ')" aria-label="Remove">&times;</button>' +
            '</div>';
    });
    itemsEl.innerHTML = html;
    if (totalEl) totalEl.textContent = total.toFixed(2);
}

// ─────────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────────
function showToast(msg) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function() { t.classList.add('toast-show'); });
    setTimeout(function() {
        t.classList.remove('toast-show');
        setTimeout(function() { t.remove(); }, 300);
    }, 2500);
}

// ─────────────────────────────────────────────────
//  SKELETON CARD
// ─────────────────────────────────────────────────
function buildSkeletonCard() {
    var el = document.createElement('div');
    el.className = 'product-skeleton';
    el.innerHTML = '<div class="skeleton-img"></div><div class="skeleton-body">' +
        '<div class="skeleton-line medium"></div>' +
        '<div class="skeleton-line price"></div>' +
        '<div class="skeleton-line long"></div>' +
        '<div class="skeleton-line short"></div>' +
        '<div class="skeleton-btn"></div></div>';
    return el;
}

// ─────────────────────────────────────────────────
//  PRODUCT CARD (with multi-image + isCannabis)
// ─────────────────────────────────────────────────
function createProductCard(product) {
    var card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product.id;

    var primaryImg = getPrimaryImage(product);
    var allImages  = (product.images && product.images.length) ? product.images : (primaryImg ? [primaryImg] : []);
    var showTag    = product.isCannabis !== false;
    var subLabel   = product.subCategory ? ' <span class="product-sub-cat">' + product.subCategory + '</span>' : '';

    // Thumbnail strip (only when >1 image)
    var thumbsHtml = '';
    if (allImages.length > 1) {
        thumbsHtml = '<div class="product-thumbs">';
        allImages.forEach(function(src, i) {
            thumbsHtml += '<div class="product-thumb' + (i === 0 ? ' active' : '') + '" data-src="' + src + '">' +
                '<img src="' + src + '" alt="View ' + (i + 1) + '" loading="lazy"></div>';
        });
        thumbsHtml += '</div>';
    }

    card.innerHTML =
        '<div class="product-image" role="button" tabindex="0" aria-label="Quick view ' + product.name + '">' +
            (primaryImg
                ? '<img src="' + primaryImg + '" alt="' + product.name + '" loading="lazy" class="card-main-img">'
                : '<span class="no-image">No image</span>') +
        '</div>' +
        thumbsHtml +
        '<div class="product-info">' +
            '<p class="product-category-label">' + product.category + subLabel + '</p>' +
            '<h3>' + product.name + '</h3>' +
            '<p class="product-price">R' + product.price.toFixed(2) + '</p>' +
            (product.description ? '<p class="product-desc-short">' + product.description + '</p>' : '') +
            (showTag ? '<p class="cannabis-product-tag">Cannabis-infused &mdash; 18+ only</p>' : '') +
            '<div class="product-card-actions">' +
                '<button class="add-to-cart" onclick="addToCart(' + product.id + ')">Add to Cart</button>' +
                '<button class="quick-view-btn" data-id="' + product.id + '">Quick View</button>' +
            '</div>' +
        '</div>';

    // Thumbnail switching
    card.querySelectorAll('.product-thumb').forEach(function(thumb) {
        thumb.addEventListener('click', function(e) {
            e.stopPropagation();
            var main = card.querySelector('.card-main-img');
            if (main) main.src = thumb.dataset.src;
            card.querySelectorAll('.product-thumb').forEach(function(t) { t.classList.remove('active'); });
            thumb.classList.add('active');
        });
    });

    card.querySelector('.product-image').addEventListener('click', function() { openQuickView(product.id); });
    card.querySelector('.product-image').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') openQuickView(product.id);
    });
    card.querySelector('.quick-view-btn').addEventListener('click', function() { openQuickView(product.id); });

    return card;
}

// ─────────────────────────────────────────────────
//  QUICK-VIEW MODAL
// ─────────────────────────────────────────────────
function initQuickViewModal() {
    if (document.getElementById('quickViewModal')) return;
    var modal = document.createElement('div');
    modal.id = 'quickViewModal';
    modal.className = 'modal hidden';
    modal.innerHTML = '<div class="modal-content" id="qvContent">' +
        '<button class="close" id="qvClose" aria-label="Close">&times;</button>' +
        '<div class="qv-inner" id="qvInner"></div></div>';
    document.body.appendChild(modal);
    document.getElementById('qvClose').addEventListener('click', closeQuickView);
    modal.addEventListener('click', function(e) { if (e.target === modal) closeQuickView(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeQuickView(); });
}

function openQuickView(productId) {
    var p = getProductById(productId);
    if (!p) return;
    var modal = document.getElementById('quickViewModal');
    var inner = document.getElementById('qvInner');
    if (!modal || !inner) return;

    var primaryImg = getPrimaryImage(p);
    var allImages  = (p.images && p.images.length) ? p.images : (primaryImg ? [primaryImg] : []);
    var showTag    = p.isCannabis !== false;

    var thumbStrip = '';
    if (allImages.length > 1) {
        thumbStrip = '<div class="qv-thumb-strip">';
        allImages.forEach(function(src, i) {
            thumbStrip += '<div class="qv-thumb' + (i === 0 ? ' active' : '') + '" data-src="' + src + '">' +
                '<img src="' + src + '" alt="View ' + (i+1) + '" loading="lazy"></div>';
        });
        thumbStrip += '</div>';
    }

    inner.innerHTML =
        '<div class="qv-gallery">' +
            '<div class="qv-main-img">' +
                (primaryImg
                    ? '<img src="' + primaryImg + '" alt="' + p.name + '" loading="lazy" id="qvMainImg">'
                    : '<span class="no-image">No image available</span>') +
            '</div>' + thumbStrip +
        '</div>' +
        '<div class="qv-details">' +
            '<p class="qv-category">' + p.category + (p.subCategory ? ' &rsaquo; ' + p.subCategory : '') + '</p>' +
            '<h2 class="qv-name">' + p.name + '</h2>' +
            '<p class="qv-price">R' + p.price.toFixed(2) + '</p>' +
            (p.description ? '<p class="qv-desc">' + p.description + '</p>' : '') +
            '<div class="qv-badges">' +
                (p.thc && p.thc !== 'N/A' ? '<span class="qv-badge">THC: ' + p.thc + '</span>' : '') +
                (p.cbd && p.cbd !== 'N/A' ? '<span class="qv-badge">CBD: ' + p.cbd + '</span>' : '') +
                (showTag ? '<span class="qv-badge cannabis-badge">Cannabis-infused &mdash; 18+ only</span>' : '') +
            '</div>' +
            '<button class="qv-add-btn" id="qvAddBtn">Add to Cart &mdash; R' + p.price.toFixed(2) + '</button>' +
        '</div>';

    inner.querySelectorAll('.qv-thumb').forEach(function(thumb) {
        thumb.addEventListener('click', function() {
            var main = inner.querySelector('#qvMainImg');
            if (main) main.src = thumb.dataset.src;
            inner.querySelectorAll('.qv-thumb').forEach(function(t) { t.classList.remove('active'); });
            thumb.classList.add('active');
        });
    });

    document.getElementById('qvAddBtn').addEventListener('click', function() {
        addToCart(p.id);
        closeQuickView();
    });

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeQuickView() {
    var modal = document.getElementById('quickViewModal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// ─────────────────────────────────────────────────
//  STICKY CART BAR
// ─────────────────────────────────────────────────
function initStickyCartBar() {
    if (document.getElementById('stickyCartBar')) return;
    var bar = document.createElement('div');
    bar.id = 'stickyCartBar';
    bar.className = 'sticky-cart-bar';
    bar.innerHTML =
        '<div class="sticky-cart-info">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' +
            '<div class="sticky-cart-text">' +
                '<span class="sticky-cart-count" id="stickyCartCount">0 items</span>' +
                '<span class="sticky-cart-total" id="stickyCartTotal">R0.00</span>' +
            '</div>' +
        '</div>' +
        '<button class="sticky-cart-btn" id="stickyCartBtn">View Cart &amp; Checkout</button>';
    document.body.appendChild(bar);
    document.getElementById('stickyCartBtn').addEventListener('click', function() {
        displayCart();
        var cm = document.getElementById('cartModal');
        if (cm) cm.classList.remove('hidden');
    });
    var sec = document.querySelector('.products-section');
    if (sec) sec.classList.add('has-sticky-bar');
    updateStickyCartBar();
}

function updateStickyCartBar() {
    var bar = document.getElementById('stickyCartBar');
    if (!bar) return;
    var cart  = getCart();
    var count = cart.reduce(function(s, i) { return s + i.quantity; }, 0);
    var total = cart.reduce(function(s, i) {
        var p = getProductById(i.id);
        return p ? s + p.price * i.quantity : s;
    }, 0);
    var ce = document.getElementById('stickyCartCount');
    var te = document.getElementById('stickyCartTotal');
    if (ce) ce.textContent = count + ' item' + (count !== 1 ? 's' : '') + ' in cart';
    if (te) te.textContent = 'R' + total.toFixed(2);
    bar.classList.toggle('visible', count > 0);
}

// ─────────────────────────────────────────────────
//  POPULATE CATEGORY FILTER DROPDOWN
//  Reads from getCategories() so admin additions
//  appear immediately without code changes.
// ─────────────────────────────────────────────────
function populateCategoryFilter() {
    var sel = document.getElementById('categoryFilter');
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = '<option value="all">All Categories</option>';
    getCategories().forEach(function(cat) {
        var opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = cat.name;
        if (cat.name === current) opt.selected = true;
        sel.appendChild(opt);
        // Add sub-categories as indented options
        if (cat.subs && cat.subs.length) {
            cat.subs.forEach(function(sub) {
                var sopt = document.createElement('option');
                sopt.value = cat.name + ' > ' + sub;
                sopt.textContent = '\u00a0\u00a0\u00a0\u00bb ' + sub;
                if (sopt.value === current) sopt.selected = true;
                sel.appendChild(sopt);
            });
        }
    });
}

// ─────────────────────────────────────────────────
//  RENDER PRODUCTS
// ─────────────────────────────────────────────────
function renderProducts() {
    populateCategoryFilter();
    var searchQuery    = (document.getElementById('searchInput').value || '').trim().toLowerCase();
    var categoryFilter = document.getElementById('categoryFilter').value;
    var sortOption     = document.getElementById('sortFilter').value;
    var grid           = document.getElementById('productGrid');
    var noResults      = document.getElementById('noResults');
    var resultsCount   = document.getElementById('resultsCount');
    var allProducts    = getAllProducts();

    grid.innerHTML = '';
    var skCount = Math.min(Math.max(allProducts.length, 1), 6);
    for (var s = 0; s < skCount; s++) grid.appendChild(buildSkeletonCard());

    var filtered = allProducts.filter(function(product) {
        var search = !searchQuery ||
            product.name.toLowerCase().includes(searchQuery) ||
            (product.description || '').toLowerCase().includes(searchQuery) ||
            product.category.toLowerCase().includes(searchQuery) ||
            (product.subCategory || '').toLowerCase().includes(searchQuery);
        var cat = categoryFilter === 'all' ||
            product.category === categoryFilter ||
            (product.category + ' > ' + (product.subCategory || '')) === categoryFilter;
        return search && cat;
    });

    if (sortOption === 'price-asc')  filtered.sort(function(a, b) { return a.price - b.price; });
    if (sortOption === 'price-desc') filtered.sort(function(a, b) { return b.price - a.price; });
    if (sortOption === 'name-asc')   filtered.sort(function(a, b) { return a.name.localeCompare(b.name); });

    setTimeout(function() {
        grid.innerHTML = '';
        if (!filtered.length) {
            noResults.classList.remove('hidden');
            if (resultsCount) resultsCount.textContent = '';
        } else {
            noResults.classList.add('hidden');
            if (resultsCount) resultsCount.textContent = 'Showing ' + filtered.length + ' of ' + allProducts.length + ' product' + (allProducts.length !== 1 ? 's' : '');
            filtered.forEach(function(product, idx) {
                var card = createProductCard(product);
                card.style.animationDelay = (idx * 80) + 'ms';
                grid.appendChild(card);
            });
        }
    }, 400);
}

// ─────────────────────────────────────────────────
//  SEARCH & FILTER
// ─────────────────────────────────────────────────
function setupSearchAndFilter() {
    var si = document.getElementById('searchInput');
    var cf = document.getElementById('categoryFilter');
    var sf = document.getElementById('sortFilter');
    if (si) si.addEventListener('input', renderProducts);
    if (cf) cf.addEventListener('change', renderProducts);
    if (sf) sf.addEventListener('change', renderProducts);
}

// ─────────────────────────────────────────────────
//  HAMBURGER
// ─────────────────────────────────────────────────
function setupHamburger() {
    var btn = document.getElementById('hamburgerBtn');
    var nav = document.getElementById('mainNav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function() {
        btn.classList.toggle('open');
        nav.classList.toggle('open');
    });
    nav.querySelectorAll('a').forEach(function(a) {
        a.addEventListener('click', function() {
            btn.classList.remove('open');
            nav.classList.remove('open');
        });
    });
}

// ─────────────────────────────────────────────────
//  MODALS
// ─────────────────────────────────────────────────
function setupModals() {
    var cartModal  = document.getElementById('cartModal');
    var loginBtn   = document.getElementById('loginBtn');
    var cartBtn    = document.getElementById('cartBtn');

    if (loginBtn) loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof openAuthModal === 'function') openAuthModal('login');
    });

    if (cartBtn) cartBtn.addEventListener('click', function(e) {
        e.preventDefault();
        displayCart();
        if (cartModal) cartModal.classList.remove('hidden');
    });

    document.querySelectorAll('.close[data-modal]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var t = document.getElementById(this.dataset.modal);
            if (t) t.classList.add('hidden');
        });
    });

    window.addEventListener('click', function(e) {
        if (e.target === cartModal) cartModal.classList.add('hidden');
    });

    var checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', function() {
        var cart = getCart();
        if (!cart.length) { showToast('Your cart is empty'); return; }
        if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
            if (cartModal) cartModal.classList.add('hidden');
            if (typeof openAuthModal === 'function') {
                openAuthModal('login', function() { window.location.href = 'checkout.html'; });
            }
            return;
        }
        window.location.href = 'checkout.html';
    });
}

// ─────────────────────────────────────────────────
//  PROMO BANNER
//  Reads active banner from localStorage (set by admin)
//  and applies it to the #promoBanner element.
// ─────────────────────────────────────────────────
function initPromoBanner() {
    var banner    = document.getElementById('promoBanner');
    var textEl    = document.getElementById('promoBannerText');
    var closeBtn  = document.getElementById('promoBannerClose');
    if (!banner) return;

    try {
        var stored = JSON.parse(localStorage.getItem('activeBanner'));
        if (stored && stored.text && textEl) {
            textEl.textContent = stored.text;
            var colorMap = {
                green:  '#2c5530',
                red:    '#c62828',
                orange: '#e65100',
                blue:   '#1565c0'
            };
            var bg = colorMap[stored.color] || '#2c5530';
            banner.style.background = bg;
        }
    } catch(e) {}

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            banner.style.display = 'none';
        });
    }
}

// ─────────────────────────────────────────────────
//  DOM READY
// ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('ageVerified') !== 'true') {
        window.location.replace('index.html');
        return;
    }
    updateCartCount();
    renderProducts();
    setupModals();
    setupSearchAndFilter();
    setupHamburger();
    initQuickViewModal();
    initStickyCartBar();
    if (typeof initAuth === 'function') initAuth().catch(function() {});
    if (typeof initPromoBanner === 'function') initPromoBanner();
});
