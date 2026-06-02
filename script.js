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
    var url = '';
    if (p.images && p.images.length) url = p.images[0];
    else if (p.image_url) url = p.image_url;
    
    // Auto-compress and resize Cloudinary images for instant mobile loading
    if (url && url.includes('cloudinary.com') && url.includes('/upload/v')) {
        return url.replace('/upload/', '/upload/w_600,q_auto,f_auto/');
    }
    return url;
}
// ─── CART ────────────────────────────────────────────
function getCart() { try { return JSON.parse(localStorage.getItem('cart')) || []; } catch(e) { return []; } }
function saveCart(c) { localStorage.setItem('cart', JSON.stringify(c)); }

function validateCartAgainstProducts(products) {
    if (!products || !products.length) return;
    var validIds = products.map(function(p) { return String(p.id); });
    var cart = getCart();
    var cleaned = cart.filter(function(i) { return validIds.indexOf(String(i.id)) > -1; });
    if (cleaned.length !== cart.length) {
        saveCart(cleaned);
        updateCartCount();
    }
}

function updateCartCount() {
    var cart = getCart();
    // Immediately remove any items that have no id (corrupted entries)
    var cleaned = cart.filter(function(i) { return i && i.id !== undefined && i.id !== null && i.quantity > 0; });
    if (cleaned.length !== cart.length) saveCart(cleaned);
    var n = cleaned.reduce(function(s, i) { return s + i.quantity; }, 0);
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

    // Close button — works on click AND touch (mobile)
    if (closeBtn) {
        var closeBanner = function(e) {
            e.preventDefault();
            e.stopPropagation();
            banner.style.display = 'none';
        };
        closeBtn.addEventListener('click',      closeBanner, { passive: false });
        closeBtn.addEventListener('touchend',   closeBanner, { passive: false });
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
            '<button class="wishlist-btn" data-pid="' + p.id + '" onclick="event.stopPropagation();toggleWishlist(this,\'' + p.id + '\')" aria-label="Add to wishlist" title="Add to wishlist">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
            '</button>' +
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
    // Check wishlist state asynchronously
    if (window.WDG && WDG.wishlistIsIn) {
        WDG.wishlistIsIn(p.id).then(function(isIn) {
            var btn = card.querySelector('.wishlist-btn');
            if (btn) btn.classList.toggle('wishlisted', isIn);
        }).catch(function(){});
    }
    return card;
}

window.toggleWishlist = async function(btn, productId) {
    if (!window.WDG) return;
    var sess = await WDG.authGetSession().catch(function(){ return null; });
    if (!sess) {
        showToast('Sign in to save items to your wishlist');
        if (typeof openAuthModal === 'function') openAuthModal('login');
        return;
    }
    var isIn = btn.classList.contains('wishlisted');
    try {
        if (isIn) {
            await WDG.wishlistRemove(productId);
            btn.classList.remove('wishlisted');
            showToast('Removed from wishlist');
        } else {
            await WDG.wishlistAdd(productId);
            btn.classList.add('wishlisted');
            showToast('Added to wishlist');
        }
    } catch(e) {
        showToast('Could not update wishlist');
    }
};

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

    // Login/account nav is owned entirely by auth.js via updateNavAuth().
    // DO NOT bind loginBtn here — auth.js sets onclick directly on the element.
    // Adding an addEventListener here would fire BOTH the dropdown AND the login
    // modal simultaneously when a logged-in user clicks their name.
    // loginBtn is intentionally left unbound in this file.

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
var DEFAULT_REVIEWS = [];

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

// ── GOOGLE PLACES CONFIG ──────────────────────────────
// Set these to your actual values from Google Cloud Console
var GOOGLE_PLACE_ID  = '';   // e.g. 'ChIJ...'
var GOOGLE_API_KEY   = '';   // e.g. 'AIzaSy...'

async function fetchGoogleReviews() {
    if (!GOOGLE_PLACE_ID || !GOOGLE_API_KEY) return [];
    try {
        var url = 'https://maps.googleapis.com/maps/api/place/details/json' +
            '?place_id=' + GOOGLE_PLACE_ID +
            '&fields=reviews,rating,user_ratings_total' +
            '&key=' + GOOGLE_API_KEY;
        // Must be called server-side to avoid CORS — use a Vercel function proxy
        var res = await fetch('/api/google-reviews');
        if (!res.ok) return [];
        var data = await res.json();
        return (data.reviews || []).map(function(r) {
            return {
                id: 'g_' + r.time,
                name: r.author_name,
                rating: r.rating,
                text: r.text,
                date: new Date(r.time * 1000).toISOString().slice(0,10),
                source: 'google',
                photo: r.profile_photo_url || ''
            };
        });
    } catch(e) { return []; }
}

function initReviews() {
    allReviews = [];

    // Load from Supabase
    var supabasePromise = (window.WDG && WDG.reviewsGet)
        ? WDG.reviewsGet().catch(function() { return []; })
        : Promise.resolve([]);

    // Load Google reviews via proxy
    var googlePromise = fetchGoogleReviews();

    Promise.all([supabasePromise, googlePromise]).then(function(results) {
        var dbReviews = results[0] || [];
        var gReviews  = results[1] || [];

        // Merge: DB reviews first, then Google ones not already in DB
        var combined = dbReviews.slice();
        gReviews.forEach(function(gr) {
            var exists = combined.find(function(r) { return r.source === 'google' && r.id === gr.id; });
            if (!exists) combined.push(gr);
        });

        // Also include any old localStorage reviews (backwards compat)
        try {
            var local = JSON.parse(localStorage.getItem('customerReviews')) || [];
            local.forEach(function(lr) {
                if (!combined.find(function(r) { return r.id === lr.id; })) combined.push(lr);
            });
        } catch(e) {}

        allReviews = combined;
        renderCarousel();
    });

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

    if (carouselInterval) clearInterval(carouselInterval);
    carouselInterval = setInterval(function() {
        goToSlide(currentSlide + 1 < allReviews.length ? currentSlide + 1 : 0);
    }, 5000);

    // Review form — now saves to Supabase
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
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            var name   = (document.getElementById('reviewName') || {}).value || '';
            var rating = parseInt(ratingInput ? ratingInput.value : 0);
            var text   = textarea ? textarea.value.trim() : '';
            var msgEl  = document.getElementById('reviewMessage');
            if (!name.trim()) { showFormMsg(msgEl, 'Please enter your name.', 'error'); return; }
            if (!rating)       { showFormMsg(msgEl, 'Please select a star rating.', 'error'); return; }
            if (!text)         { showFormMsg(msgEl, 'Please write your review.', 'error'); return; }

            var review = {
                // Consistent column names used throughout admin + frontend
                reviewer_name: name.trim(),
                name:          name.trim(),       // backwards compat
                review_text:   text,
                text:          text,              // backwards compat
                rating:        rating,
                date:          new Date().toISOString().slice(0,10),
                created_at:    new Date().toISOString(),
                approved:      false,             // admin must approve before showing
                source:        'site'
            };

            // Try to save to Supabase
            try {
                if (window.WDG && WDG.reviewsSubmit) {
                    await WDG.reviewsSubmit(review);
                }
            } catch(err) {
                // fallback to localStorage
                var stored = [];
                try { stored = JSON.parse(localStorage.getItem('customerReviews')) || []; } catch(ex) {}
                review.id = 'c' + Date.now();
                stored.push(review);
                localStorage.setItem('customerReviews', JSON.stringify(stored));
            }

            form.reset();
            stars.forEach(function(s) { s.classList.remove('selected'); });
            showFormMsg(msgEl, '✅ Thank you! Your review is pending approval.', 'success');
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
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        var email = document.getElementById('newsletterEmail');
        var name  = document.getElementById('newsletterName');
        var msg   = document.getElementById('newsletterMessage');
        if (!email || !email.value.trim()) return;
        var emailVal = email.value.trim().toLowerCase();
        var nameVal  = name ? name.value.trim() : '';
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            showFormMsg(msg, 'Please enter a valid email address.', 'error'); return;
        }
        var btn = form.querySelector('button[type=submit]');
        if (btn) { btn.disabled = true; btn.textContent = 'Subscribing…'; }
        try {
            if (window.WDG && WDG.newsletterSubscribe) {
                await WDG.newsletterSubscribe(emailVal, nameVal);
            }
            showFormMsg(msg, 'You\'re subscribed! Thank you for joining the WorthDaGive community.', 'success');
            if (email) email.value = '';
            if (name)  name.value  = '';
        } catch(err) {
            // Gracefully fall back — don't block the experience
            showFormMsg(msg, 'Thank you for subscribing!', 'success');
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
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

    // Validate cart once products loaded (removes ghost items)
    fetchProducts().then(function(products) {
        validateCartAgainstProducts(products);
        updateCartCount();
    });

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
