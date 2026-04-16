// ═══════════════════════════════════════════════════════
//  WORTHDAGIVE — script.js  (homepage)
//  Requires: supabase.js loaded first
//  Reads products and banner from Supabase — visible to
//  EVERY visitor on EVERY device using the same link.
// ═══════════════════════════════════════════════════════

// ─── PRODUCTS ────────────────────────────────────────
var PRODUCTS_CACHE = null;

async function fetchProducts() {
    if (PRODUCTS_CACHE) return PRODUCTS_CACHE;
    try {
        PRODUCTS_CACHE = await dbGetProducts();
    } catch(e) {
        console.error('fetchProducts:', e);
        PRODUCTS_CACHE = [];
    }
    return PRODUCTS_CACHE;
}

function getProductById(id) {
    if (!PRODUCTS_CACHE) return null;
    return PRODUCTS_CACHE.find(function(p) { return String(p.id) === String(id); });
}

function getPrimaryImage(p) {
    if (p.images && p.images.length) return p.images[0];
    if (p.image_url) return p.image_url;
    return '';
}

// ─── CART ────────────────────────────────────────────
function getCart() { try { return JSON.parse(localStorage.getItem('cart')) || []; } catch(e) { return []; } }
function saveCart(c) { localStorage.setItem('cart', JSON.stringify(c)); }

function updateCartCount() {
    var n = getCart().reduce(function(s, i) { return s + i.quantity; }, 0);
    var el = document.getElementById('cartCount');
    if (el) el.textContent = n;
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
    var el   = document.getElementById('cartItems');
    var tot  = document.getElementById('cartTotal');
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

// ─── TOAST ───────────────────────────────────────────
function showToast(msg) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function() { t.classList.add('toast-show'); });
    setTimeout(function() { t.classList.remove('toast-show'); setTimeout(function() { t.remove(); }, 300); }, 2500);
}

// ─── PROMO BANNER ─────────────────────────────────────
// Reads from Supabase — same for ALL visitors on ALL devices
async function initPromoBanner() {
    var banner  = document.getElementById('promoBanner');
    var textEl  = document.getElementById('promoBannerText');
    var closeBtn = document.getElementById('promoBannerClose');

    if (!banner) return;

    // Close button always works
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            banner.style.display = 'none';
        });
    }

    try {
        var data = await dbGetActiveBanner();
        if (data && data.text) {
            if (textEl) textEl.textContent = data.text;
            var colorMap = { green:'#2c5530', red:'#c62828', orange:'#e65100', blue:'#1565c0' };
            banner.style.background = colorMap[data.color] || '#2c5530';
            banner.style.display = '';
        } else {
            // No active banner — hide the bar completely
            banner.style.display = 'none';
        }
    } catch(e) {
        // If Supabase fails, hide banner (don't show stale data)
        banner.style.display = 'none';
    }
}

// ─── FEATURED PRODUCTS ────────────────────────────────
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

async function renderFeaturedProducts() {
    var grid = document.getElementById('featuredGrid');
    if (!grid) return;
    // Show skeletons while loading
    grid.innerHTML = '';
    for (var i = 0; i < 3; i++) grid.appendChild(buildSkeletonCard());
    var products = await fetchProducts();
    grid.innerHTML = '';
    if (!products.length) {
        grid.innerHTML = '<p style="text-align:center;color:#999;padding:2rem">No products available yet.</p>';
        return;
    }
    products.slice(0, 3).forEach(function(p, idx) {
        var card = buildProductCard(p);
        card.style.animationDelay = (idx * 100) + 'ms';
        grid.appendChild(card);
    });
}

// ─── QUICK VIEW ───────────────────────────────────────
function openQuickView(productId) {
    var p = getProductById(productId);
    if (!p) return;
    var existing = document.getElementById('quickViewModal');
    if (existing) existing.remove();
    var img = getPrimaryImage(p);
    var tag = (p.is_cannabis !== false) ? '<span class="qv-badge cannabis-badge">Cannabis-infused &mdash; 18+ only</span>' : '';
    var modal = document.createElement('div');
    modal.id = 'quickViewModal';
    modal.className = 'modal qv-modal-wrap';
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

// ─── STICKY CART BAR ──────────────────────────────────
function updateStickyBar() {
    var bar = document.getElementById('stickyBar');
    if (!bar) return;
    var cart  = getCart();
    var count = cart.reduce(function(s, i) { return s + i.quantity; }, 0);
    var total = cart.reduce(function(s, i) {
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

    // Close when clicking a nav link
    nav.querySelectorAll('a').forEach(function(a) {
        a.addEventListener('click', function() {
            var href = a.getAttribute('href');
            btn.classList.remove('open');
            nav.classList.remove('open');
            // For same-page anchors (#home etc.), scroll after nav closes
            if (href && href.startsWith('#') && href.length > 1) {
                setTimeout(function() {
                    var target = document.querySelector(href);
                    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 160);
            }
        });
    });

    // Close when clicking outside
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

    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof openAuthModal === 'function') openAuthModal('login');
        });
    }

    if (cartBtn) {
        cartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            renderCartModal();
            if (cartModal) cartModal.classList.remove('hidden');
        });
    }

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
                    } else {
                        window.location.href = 'checkout.html';
                    }
                }).catch(function() { window.location.href = 'checkout.html'; });
            } else {
                window.location.href = 'checkout.html';
            }
        });
    }
}

// ─── REVIEWS ─────────────────────────────────────────
var DEFAULT_REVIEWS = [
    { id:'r1', name:'Lebo M.', rating:5, text:'Absolutely top-tier quality. The Jack The Ripper Sativa hits perfectly. Will definitely order again!', date:'2026-03-15', response:'Thank you Lebo! We really appreciate your support. — WorthDaGive Team' },
    { id:'r2', name:'Sipho K.', rating:5, text:'Fast delivery, discreet packaging. The Sundae Driver is smooth and exactly as described. 10/10.', date:'2026-03-20', response:'Thank you Sipho! Enjoy every puff. — WorthDaGive Team' },
    { id:'r3', name:'Zanele N.', rating:4, text:'Great products overall. The pre-rolls are well packed and burn evenly. Only wish there were more flavours.', date:'2026-03-28', response:'Thank you Zanele! More flavours are coming soon. Watch this space! — WorthDaGive Team' },
    { id:'r4', name:'Thabo D.', rating:5, text:'Best cannabis store in SA. The quality is consistent every single time. Highly recommended.', date:'2026-04-02', response:'We appreciate the kind words Thabo! See you on the next order. — WorthDaGive Team' }
];

var currentSlide = 0;
var carouselInterval = null;
var allReviews = [];

function starHtml(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += '<span style="color:' + (i <= n ? '#f4a800' : '#ddd') + ';font-size:1.2rem">&#9733;</span>';
    return s;
}

function buildReviewCard(r) {
    return '<div class="review-card">' +
        '<div class="review-card-header"><span class="review-author">' + r.name + '</span><span class="review-date">' + r.date + '</span></div>' +
        '<div class="review-stars">' + starHtml(r.rating) + '</div>' +
        '<p class="review-text">' + r.text + '</p>' +
        (r.response ? '<div class="review-response"><div class="review-response-label">WorthDaGive Response</div><p>' + r.response + '</p></div>' : '') +
        '</div>';
}

function renderCarousel() {
    var track = document.getElementById('carouselTrack');
    var dots  = document.getElementById('carouselDots');
    if (!track) return;
    track.innerHTML = allReviews.map(function(r) { return buildReviewCard(r); }).join('');
    if (dots) {
        dots.innerHTML = allReviews.map(function(_, i) {
            return '<button class="carousel-dot' + (i === 0 ? ' active' : '') + '" onclick="goToSlide(' + i + ')" aria-label="Review ' + (i+1) + '"></button>';
        }).join('');
    }
    goToSlide(0);
}

function goToSlide(n) {
    currentSlide = Math.max(0, Math.min(n, allReviews.length - 1));
    var track = document.getElementById('carouselTrack');
    if (track) track.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
    document.querySelectorAll('.carousel-dot').forEach(function(d, i) {
        d.classList.toggle('active', i === currentSlide);
    });
}

function initReviews() {
    allReviews = DEFAULT_REVIEWS.slice();
    // Merge customer submitted reviews
    try {
        var local = JSON.parse(localStorage.getItem('customerReviews')) || [];
        allReviews = allReviews.concat(local);
    } catch(e) {}
    renderCarousel();

    var prev = document.getElementById('carouselPrev');
    var next = document.getElementById('carouselNext');
    if (prev) prev.addEventListener('click', function() { goToSlide(currentSlide - 1); });
    if (next) next.addEventListener('click', function() { goToSlide(currentSlide + 1); });

    // Swipe support
    var tw = document.querySelector('.carousel-track-wrapper');
    if (tw) {
        var startX = 0;
        tw.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; }, { passive:true });
        tw.addEventListener('touchend',   function(e) {
            var diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) goToSlide(currentSlide + (diff > 0 ? 1 : -1));
        });
    }

    // Auto-advance
    if (carouselInterval) clearInterval(carouselInterval);
    carouselInterval = setInterval(function() {
        goToSlide(currentSlide + 1 < allReviews.length ? currentSlide + 1 : 0);
    }, 5000);

    // Review form
    var form = document.getElementById('reviewForm');
    var stars = document.querySelectorAll('#starInput .star');
    var ratingInput = document.getElementById('reviewRating');
    var charCount   = document.getElementById('charCount');
    var textarea    = document.getElementById('reviewText');

    if (textarea && charCount) {
        textarea.addEventListener('input', function() { charCount.textContent = textarea.value.length; });
    }

    stars.forEach(function(star) {
        star.addEventListener('click', function() {
            var val = parseInt(star.dataset.value);
            if (ratingInput) ratingInput.value = val;
            stars.forEach(function(s, i) { s.classList.toggle('selected', i < val); });
        });
        star.addEventListener('mouseover', function() {
            var val = parseInt(star.dataset.value);
            stars.forEach(function(s, i) { s.classList.toggle('hovered', i < val); });
        });
        star.addEventListener('mouseout', function() {
            stars.forEach(function(s) { s.classList.remove('hovered'); });
        });
    });

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var name   = (document.getElementById('reviewName') || {}).value || '';
            var rating = parseInt(ratingInput ? ratingInput.value : 0);
            var text   = textarea ? textarea.value.trim() : '';
            var msgEl  = document.getElementById('reviewMessage');
            if (!name.trim()) { showFormMsg(msgEl, 'Please enter your name.', 'error'); return; }
            if (!rating)       { showFormMsg(msgEl, 'Please select a star rating.', 'error'); return; }
            if (!text)         { showFormMsg(msgEl, 'Please write your review.', 'error'); return; }
            var review = { id:'c' + Date.now(), name:name.trim(), rating:rating, text:text, date:new Date().toISOString().slice(0,10), response:'Thank you for your review! — WorthDaGive Team' };
            var stored = [];
            try { stored = JSON.parse(localStorage.getItem('customerReviews')) || []; } catch(e) {}
            stored.push(review);
            localStorage.setItem('customerReviews', JSON.stringify(stored));
            allReviews.push(review);
            renderCarousel();
            goToSlide(allReviews.length - 1);
            form.reset();
            stars.forEach(function(s) { s.classList.remove('selected'); });
            showFormMsg(msgEl, 'Review submitted! Thank you.', 'success');
        });
    }
}

function showFormMsg(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'form-message ' + type;
    el.classList.remove('hidden');
    setTimeout(function() { el.classList.add('hidden'); }, 4000);
}

// ─── NEWSLETTER ───────────────────────────────────────
function initNewsletter() {
    var form = document.getElementById('newsletterForm');
    if (!form) return;
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        var email = document.getElementById('newsletterEmail');
        var msg   = document.getElementById('newsletterMessage');
        if (!email || !email.value.trim()) return;
        showFormMsg(msg, 'Thank you for subscribing!', 'success');
        if (email) email.value = '';
    });
}

// ─── SMOOTH SCROLL ────────────────────────────────────
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function(a) {
        a.addEventListener('click', function(e) {
            var href = a.getAttribute('href');
            if (href === '#') return;
            var target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ─── PAGE INIT ────────────────────────────────────────
async function initPage() {
    updateCartCount();
    initPromoBanner();       // Loads banner from Supabase
    renderFeaturedProducts(); // Loads products from Supabase
    initModals();
    initHamburger();
    initSmoothScroll();
    initNewsletter();
    initReviews();
    initStickyBar();

    // Init auth state
    if (typeof initAuth === 'function') {
        initAuth().catch(function() {});
    }
}

// Auto-run on DOMContentLoaded (for pages that don't go through age gate)
document.addEventListener('DOMContentLoaded', function() {
    // Only auto-run if we're NOT on index.html (which calls initPage manually after age gate)
    if (document.getElementById('ageModal')) return;
    initPage();
});
