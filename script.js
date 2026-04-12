/* ════════════════════════════════════════
   THE BUD SHOP — script.js (Homepage)
   Features:
   1. Swipe support on reviews carousel
   2. Product quick-view modal (homepage featured)
   3. Skeleton loading screens
   4. Sticky cart bar (on products page)
   5. WhatsApp label (handled in HTML/CSS)
════════════════════════════════════════ */

// ─────────────────────────────────────────
//  PRODUCT DATA  — MUST match products.js
//  Hardcoded so all visitors see the same products.
//  When you add a product via admin.html, also add it
//  here and in products.js, then re-deploy to Netlify.
// ─────────────────────────────────────────
var PRODUCTS = [
    {
        id: 1,
        name: 'Jack The Ripper Sativa',
        price: 650.00,
        description: 'Jack The Ripper Sativa disposable vape. A premium sativa-dominant experience in a sleek, ready-to-use device.',
        thc: 'Available on request',
        cbd: 'Available on request',
        category: 'Disposables',
        subCategory: 'Vapes',
        isCannabis: true,
        image: 'https://res.cloudinary.com/dbcfzmxzt/image/upload/f_auto,q_auto,w_600/v1775678961/JACK_THE_RIPPER_SATIVA_disposable_vape_cfv9yc.png',
        images: ['https://res.cloudinary.com/dbcfzmxzt/image/upload/f_auto,q_auto,w_600/v1775678961/JACK_THE_RIPPER_SATIVA_disposable_vape_cfv9yc.png']
    },
    {
        id: 2,
        name: 'THC Concentrated Sundae Driver Disposable Vape',
        price: 650.00,
        description: 'Liquid Gold THC Concentrated Sundae Driver Disposable Vape.',
        thc: 'Available on request',
        cbd: 'Available on request',
        category: 'Disposables',
        subCategory: 'Vapes',
        isCannabis: true,
        image: 'https://res.cloudinary.com/dbcfzmxzt/image/upload/f_auto,q_auto,w_600/v1775680930/THC_Concentrated_Sundae_driver_Disposable_Vape_grtkfz.png',
        images: ['https://res.cloudinary.com/dbcfzmxzt/image/upload/f_auto,q_auto,w_600/v1775680930/THC_Concentrated_Sundae_driver_Disposable_Vape_grtkfz.png']
    },
    {
        id: 3,
        name: 'Purple Skittles Indoor Pre-Roll',
        price: 100.00,
        description: 'Premium indoor flower pre-roll, Purple Skittles flavour.',
        thc: 'Available on request',
        cbd: 'Available on request',
        category: 'Pre-Rolls',
        subCategory: 'Indica',
        isCannabis: true,
        image: 'https://res.cloudinary.com/dbcfzmxzt/image/upload/f_auto,q_auto,dpr_auto,c_fit,w_400,h_400/v1775810915/New_pre-roll_j_s_mdhiq0.png',
        images: ['https://res.cloudinary.com/dbcfzmxzt/image/upload/f_auto,q_auto,dpr_auto,c_fit,w_400,h_400/v1775810915/New_pre-roll_j_s_mdhiq0.png']
    }
    /* Add new products here AND in products.js */
];

// ─────────────────────────────────────────
//  DEFAULT REVIEWS
// ─────────────────────────────────────────
const DEFAULT_REVIEWS = [
    {
        id: 'default-1',
        name: 'Thabo K.',
        rating: 5,
        text: 'Absolutely love the Premium Indica Strain! Great quality, fast delivery and very well packaged. Will definitely be ordering again.',
        date: '2026-01-15',
        response: 'Thank you so much Thabo! We appreciate your support and look forward to serving you again. — The Bud Shop Team'
    },
    {
        id: 'default-2',
        name: 'Lerato M.',
        rating: 5,
        text: 'The CBD Oil Tincture has been a game changer for me. Excellent product and the team is always helpful when I have questions.',
        date: '2026-01-28',
        response: 'We are so glad the tincture is working well for you Lerato! Do not hesitate to reach out anytime. — The Bud Shop Team'
    },
    {
        id: 'default-3',
        name: 'Ryan P.',
        rating: 4,
        text: 'Really impressed with the Sativa Blend. Smooth and great quality. I would love to see more accessories in stock though!',
        date: '2026-02-03',
        response: 'Thanks for the feedback Ryan! Great news — we are expanding our accessories range very soon. Watch this space! — The Bud Shop Team'
    },
    {
        id: 'default-4',
        name: 'Nomsa D.',
        rating: 5,
        text: 'Best cannabis shop around! The Hybrid Edibles are delicious and the dosage is perfect. Highly recommend to anyone looking for quality.',
        date: '2026-02-10',
        response: 'Wow, thank you Nomsa! Reviews like yours mean the world to us. See you next time! — The Bud Shop Team'
    }
];

const AUTO_RESPONSE = 'Thank you for taking the time to leave a review! We truly appreciate your feedback and support. See you again soon! — The Bud Shop Team';

// ─────────────────────────────────────────
//  CART HELPERS
// ─────────────────────────────────────────
function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}
function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}
function getProductById(id) {
    var adminList = [];
    try { adminList = JSON.parse(localStorage.getItem('adminProducts')) || []; } catch(e) {}
    var found = adminList.find(function(p){ return p.id === id; });
    return found || PRODUCTS.find(function(p){ return p.id === id; });
}

function getAllProducts() {
    var adminList = [];
    try { adminList = JSON.parse(localStorage.getItem('adminProducts')) || []; } catch(e) {}
    var merged = JSON.parse(JSON.stringify(PRODUCTS));
    adminList.forEach(function(ap) {
        var idx = merged.findIndex(function(p){ return p.id === ap.id; });
        if (idx >= 0) { merged[idx] = ap; } else { merged.push(ap); }
    });
    return merged;
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
//  ADD / REMOVE CART
// ─────────────────────────────────────────
window.addToCart = function (productId) {
    const cart = getCart();
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ id: productId, quantity: 1 });
    }
    saveCart(cart);
    updateCartCount();
    updateStickyCartBar();   // Feature 3
    showToast('Item added to cart! 🛒');
};

window.removeFromCart = function (productId) {
    const cart = getCart().filter(item => item.id !== productId);
    saveCart(cart);
    updateCartCount();
    updateStickyCartBar();   // Feature 3
    renderCartModal();
};

// ─────────────────────────────────────────
//  CART MODAL RENDER
// ─────────────────────────────────────────
function renderCartModal() {
    const cart    = getCart();
    const itemsEl = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    if (!itemsEl) return;

    if (cart.length === 0) {
        itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
        if (totalEl) totalEl.textContent = '0.00';
        return;
    }

    let total = 0;
    let html  = '';
    cart.forEach(item => {
        const p = getProductById(item.id);
        if (!p) return;
        const line = p.price * item.quantity;
        total += line;
        html += `
        <div class="cart-item">
            <div class="cart-item-info">
                <p>${p.name}</p>
                <span>Qty: ${item.quantity} &times; R${p.price.toFixed(2)}</span>
            </div>
            <div class="cart-item-price">R${line.toFixed(2)}</div>
            <button class="cart-item-remove" onclick="removeFromCart(${p.id})" aria-label="Remove">&times;</button>
        </div>`;
    });

    itemsEl.innerHTML = html;
    if (totalEl) totalEl.textContent = total.toFixed(2);
}

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
//  INLINE FORM MESSAGES
// ─────────────────────────────────────────
function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'form-message ' + type;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}

// ─────────────────────────────────────────
//  DOM READY
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    const ageModal    = document.getElementById('ageModal');
    const mainContent = document.getElementById('mainContent');

    function revealSite() {
        ageModal.style.display = 'none';
        mainContent.classList.remove('hidden');
        initPage();
    }

    if (localStorage.getItem('ageVerified') === 'true') {
        revealSite();
    }

    document.getElementById('ageYes').addEventListener('click', function () {
        localStorage.setItem('ageVerified', 'true');
        revealSite();
    });

    document.getElementById('ageNo').addEventListener('click', function () {
        window.location.href = 'https://www.google.com';
    });
});

// ─────────────────────────────────────────
//  PROMO BANNER
// ─────────────────────────────────────────
function initPromoBanner() {
    var banner   = document.getElementById('promoBanner');
    var textEl   = document.getElementById('promoBannerText');
    var closeBtn = document.getElementById('promoBannerClose');
    if (!banner) return;
    try {
        var stored = JSON.parse(localStorage.getItem('activeBanner'));
        if (stored && stored.text && textEl) {
            textEl.textContent = stored.text;
            var colorMap = { green:'#2c5530', red:'#c62828', orange:'#e65100', blue:'#1565c0' };
            banner.style.background = colorMap[stored.color] || '#2c5530';
        }
    } catch(e) {}
    if (closeBtn) {
        closeBtn.addEventListener('click', function() { banner.style.display = 'none'; });
    }
}


// ─────────────────────────────────────────
//  PAGE INIT
// ─────────────────────────────────────────
function initPage() {
    updateCartCount();
    initPromoBanner();
    renderFeaturedProductsWithSkeleton();
    initModals();
    initHamburger();
    initSmoothScroll();
    initNewsletter();
    initReviews();
    initQuickViewModal();
}

// ═══════════════════════════════════════════
//  FEATURE 4: SKELETON → REAL PRODUCTS
// ═══════════════════════════════════════════
function renderFeaturedProductsWithSkeleton() {
    const grid = document.getElementById('featuredGrid');
    if (!grid) return;

    // 1. Show 3 skeleton cards instantly
    for (let i = 0; i < 3; i++) {
        grid.appendChild(buildSkeletonCard());
    }

    // 2. After a short simulated load delay, swap in real cards
    setTimeout(function() {
        grid.innerHTML = '';
        getAllProducts().slice(0, 3).forEach(function(p, idx) {
            var card = buildProductCard(p);
            card.style.animationDelay = (idx * 100) + 'ms';
            grid.appendChild(card);
        });
    }, 800);
}

function buildSkeletonCard() {
    const el = document.createElement('div');
    el.className = 'product-skeleton';
    el.innerHTML = `
        <div class="skeleton-img"></div>
        <div class="skeleton-body">
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line price"></div>
            <div class="skeleton-line long"></div>
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line short"></div>
            <div class="skeleton-btn"></div>
        </div>`;
    return el;
}

function buildProductCard(p) {
    var card = document.createElement('div');
    card.className = 'product-card';

    var primaryImg = getPrimaryImage(p);
    var allImages  = (p.images && p.images.length > 0) ? p.images : (primaryImg ? [primaryImg] : []);
    var showCannabisTag = p.isCannabis !== false;

    // Build thumbnail strip for multi-image products
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
        '<div class="product-image" role="button" tabindex="0" aria-label="Quick view ' + p.name + '">' +
            (primaryImg
                ? '<img src="' + primaryImg + '" alt="' + p.name + '" loading="lazy" class="card-main-img">'
                : '<span class="no-image">No image</span>') +
        '</div>' +
        thumbsHtml +
        '<div class="product-info">' +
            '<h3>' + p.name + '</h3>' +
            '<p class="product-price">R' + p.price.toFixed(2) + '</p>' +
            '<div class="product-details">' +
                '<p><strong>Description:</strong> ' + p.description + '</p>' +
                '<p><strong>THC:</strong> ' + p.thc + ' | <strong>CBD:</strong> ' + p.cbd + '</p>' +
                '<p><strong>Category:</strong> ' + p.category + '</p>' +
                (showCannabisTag ? '<p class="cannabis-product-tag">Cannabis-infused product — 18+ only</p>' : '') +
                '<p><small><em>Lab-tested for quality and compliance</em></small></p>' +
            '</div>' +
            '<div class="product-card-actions">' +
                '<button class="add-to-cart" onclick="addToCart(' + p.id + ')">Add to Cart</button>' +
                '<button class="quick-view-btn" data-id="' + p.id + '">Quick View</button>' +
            '</div>' +
        '</div>';

    // Thumbnail switching
    card.querySelectorAll('.product-thumb').forEach(function(thumb) {
        thumb.addEventListener('click', function(e) {
            e.stopPropagation();
            var mainImg = card.querySelector('.card-main-img');
            if (mainImg) mainImg.src = thumb.dataset.src;
            card.querySelectorAll('.product-thumb').forEach(function(t) { t.classList.remove('active'); });
            thumb.classList.add('active');
        });
    });

    card.querySelector('.product-image').addEventListener('click', function() { openQuickView(p.id); });
    card.querySelector('.product-image').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') openQuickView(p.id);
    });
    card.querySelector('.quick-view-btn').addEventListener('click', function() { openQuickView(p.id); });

    return card;
}

// ═══════════════════════════════════════════
//  FEATURE 2: QUICK-VIEW MODAL
// ═══════════════════════════════════════════
function initQuickViewModal() {
    // Create the modal and inject into body if it doesn't exist yet
    if (document.getElementById('quickViewModal')) return;

    const modal = document.createElement('div');
    modal.id = 'quickViewModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
        <div class="modal-content" id="qvContent">
            <span class="close" id="qvClose">&times;</span>
            <div class="qv-inner" id="qvInner">
                <!-- Populated by openQuickView() -->
            </div>
        </div>`;
    document.body.appendChild(modal);

    // Close on X
    document.getElementById('qvClose').addEventListener('click', closeQuickView);
    // Close on backdrop click
    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeQuickView();
    });
    // Close on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeQuickView();
    });
}

function openQuickView(productId) {
    const p = getProductById(productId);
    if (!p) return;

    const modal = document.getElementById('quickViewModal');
    const inner = document.getElementById('qvInner');
    if (!modal || !inner) return;

    var qvPrimaryImg = getPrimaryImage(p);
    var qvImages = (p.images && p.images.length > 0) ? p.images : (qvPrimaryImg ? [qvPrimaryImg] : []);
    var qvThumbStrip = '';
    if (qvImages.length > 1) {
        qvThumbStrip = '<div class="qv-thumb-strip">';
        qvImages.forEach(function(src, i) {
            qvThumbStrip += '<div class="qv-thumb' + (i === 0 ? ' active' : '') + '" data-src="' + src + '">' +
                '<img src="' + src + '" alt="View ' + (i+1) + '" loading="lazy"></div>';
        });
        qvThumbStrip += '</div>';
    }
    var showCannabisQV = p.isCannabis !== false;
    inner.innerHTML =
        '<div class="qv-gallery">' +
            '<div class="qv-main-img">' +
                (qvPrimaryImg
                    ? '<img src="' + qvPrimaryImg + '" alt="' + p.name + '" loading="lazy" id="qvMainImg">'
                    : '<span class="no-image">No image available</span>') +
            '</div>' +
            qvThumbStrip +
        '</div>' +
        '<div class="qv-details">' +
            '<p class="qv-category">' + p.category + '</p>' +
            '<h2 class="qv-name">' + p.name + '</h2>' +
            '<p class="qv-price">R' + p.price.toFixed(2) + '</p>' +
            '<p class="qv-desc">' + p.description + '</p>' +
            '<div class="qv-badges">' +
                '<span class="qv-badge">THC: ' + p.thc + '</span>' +
                '<span class="qv-badge">CBD: ' + p.cbd + '</span>' +
                (showCannabisQV ? '<span class="qv-badge cannabis-badge">Cannabis-infused — 18+ only</span>' : '') +
            '</div>' +
            '<p class="qv-lab-note">Lab-tested for quality and compliance</p>' +
            '<button class="qv-add-btn" id="qvAddBtn">Add to Cart — R' + p.price.toFixed(2) + '</button>' +
        '</div>';

    // Thumbnail switching in quick-view
    inner.querySelectorAll('.qv-thumb').forEach(function(thumb) {
        thumb.addEventListener('click', function() {
            var mainImg = inner.querySelector('#qvMainImg');
            if (mainImg) mainImg.src = thumb.dataset.src;
            inner.querySelectorAll('.qv-thumb').forEach(function(t) { t.classList.remove('active'); });
            thumb.classList.add('active');
        });
    });

    document.getElementById('qvAddBtn').addEventListener('click', function () {
        addToCart(p.id);
        closeQuickView();
    });

    modal.classList.remove('hidden');
    // Prevent body scroll while modal open
    document.body.style.overflow = 'hidden';
}

function closeQuickView() {
    const modal = document.getElementById('quickViewModal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// ─────────────────────────────────────────
//  MODALS (login + cart)
// ─────────────────────────────────────────
function initModals() {
    var cartModal = document.getElementById('cartModal');
    var loginBtn  = document.getElementById('loginBtn');
    var cartBtn   = document.getElementById('cartBtn');

    // Login — delegated to auth.js
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof openAuthModal === 'function') openAuthModal('login');
        });
    }

    // Cart open
    if (cartBtn) {
        cartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            renderCartModal();
            if (cartModal) cartModal.classList.remove('hidden');
        });
    }

    // Close buttons (× with data-modal)
    document.querySelectorAll('.close[data-modal]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var t = document.getElementById(this.dataset.modal);
            if (t) t.classList.add('hidden');
        });
    });

    // Click outside modal to close
    window.addEventListener('click', function(e) {
        if (e.target === cartModal) cartModal.classList.add('hidden');
    });

    // Checkout button
    var checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
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

    nav.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            btn.classList.remove('open');
            nav.classList.remove('open');
        });
    });
}

// ─────────────────────────────────────────
//  SMOOTH SCROLL
// ─────────────────────────────────────────
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ─────────────────────────────────────────
//  NEWSLETTER
// ─────────────────────────────────────────
function initNewsletter() {
    const form  = document.getElementById('newsletterForm');
    const msgEl = document.getElementById('newsletterMessage');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const email = document.getElementById('newsletterEmail').value.trim();
        if (!email) { showMessage(msgEl, 'Please enter your email.', 'error'); return; }

        const list = JSON.parse(localStorage.getItem('newsletter')) || [];
        if (list.includes(email)) {
            showMessage(msgEl, 'You are already subscribed!', 'error');
        } else {
            list.push(email);
            localStorage.setItem('newsletter', JSON.stringify(list));
            showMessage(msgEl, 'Thank you for subscribing!', 'success');
            form.reset();
        }
    });
}

// ═══════════════════════════════════════════
//  REVIEWS  +  FEATURE 1: SWIPE SUPPORT
// ═══════════════════════════════════════════

let currentSlide = 0;
let allReviews   = [];

function initReviews() {
    buildReviewList();
    renderCarousel();
    initCarouselArrows();
    initCarouselSwipe();   // Feature 1
    initReviewForm();
}

function buildReviewList() {
    const stored = JSON.parse(localStorage.getItem('customerReviews')) || [];
    allReviews   = [...DEFAULT_REVIEWS, ...stored];
}

function renderCarousel() {
    const track = document.getElementById('carouselTrack');
    const dots  = document.getElementById('carouselDots');
    if (!track || !dots) return;

    track.innerHTML = '';
    allReviews.forEach(review => {
        const filled = '★'.repeat(review.rating);
        const empty  = '☆'.repeat(5 - review.rating);
        const date   = formatDate(review.date);
        const resp   = review.response || AUTO_RESPONSE;

        const card = document.createElement('div');
        card.className = 'review-card';
        card.innerHTML = `
            <div class="review-card-header">
                <span class="review-author"></span>
                <span class="review-date">${date}</span>
            </div>
            <div class="review-stars">${filled}${empty}</div>
            <p class="review-text"></p>
            <div class="review-response">
                <div class="review-response-label">The Bud Shop Response</div>
                <p class="response-text"></p>
            </div>`;

        card.querySelector('.review-author').textContent = review.name;
        card.querySelector('.review-text').textContent   = review.text;
        card.querySelector('.response-text').textContent = resp;
        track.appendChild(card);
    });

    dots.innerHTML = '';
    allReviews.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Review ' + (i + 1));
        dot.addEventListener('click', () => goToSlide(i));
        dots.appendChild(dot);
    });

    goToSlide(currentSlide < allReviews.length ? currentSlide : 0);
}

function goToSlide(index) {
    currentSlide = index;
    const track = document.getElementById('carouselTrack');
    if (track) track.style.transform = `translateX(-${index * 100}%)`;

    document.querySelectorAll('.carousel-dot').forEach((d, i) => {
        d.classList.toggle('active', i === index);
    });

    const prev = document.getElementById('carouselPrev');
    const next = document.getElementById('carouselNext');
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === allReviews.length - 1;
}

function initCarouselArrows() {
    document.getElementById('carouselPrev').addEventListener('click', function () {
        if (currentSlide > 0) goToSlide(currentSlide - 1);
    });
    document.getElementById('carouselNext').addEventListener('click', function () {
        if (currentSlide < allReviews.length - 1) goToSlide(currentSlide + 1);
    });
}

// ── Feature 1: Touch swipe ──
function initCarouselSwipe() {
    const wrapper = document.querySelector('.carousel-track-wrapper');
    const track   = document.getElementById('carouselTrack');
    const hint    = document.querySelector('.swipe-hint');
    if (!wrapper || !track) return;

    let startX     = 0;
    let currentX   = 0;
    let isDragging = false;
    let startOffset = 0;
    const SWIPE_THRESHOLD = 50; // px needed to trigger slide change

    function getClientX(e) {
        return e.touches ? e.touches[0].clientX : e.clientX;
    }

    function onStart(e) {
        // Only handle horizontal intent — don't block vertical scroll
        startX      = getClientX(e);
        startOffset = currentSlide * wrapper.offsetWidth;
        isDragging  = true;
        track.classList.add('no-transition');
        wrapper.classList.add('dragging');
    }

    function onMove(e) {
        if (!isDragging) return;
        currentX = getClientX(e);
        const diff    = startX - currentX;
        const newPos  = startOffset + diff;
        const maxPos  = (allReviews.length - 1) * wrapper.offsetWidth;
        // Clamp with rubber-band feel at edges
        const clamped = Math.max(-40, Math.min(maxPos + 40, newPos));
        track.style.transform = `translateX(-${clamped}px)`;
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('no-transition');
        wrapper.classList.remove('dragging');

        const diff = startX - currentX;

        if (diff > SWIPE_THRESHOLD && currentSlide < allReviews.length - 1) {
            goToSlide(currentSlide + 1);
        } else if (diff < -SWIPE_THRESHOLD && currentSlide > 0) {
            goToSlide(currentSlide - 1);
        } else {
            // Snap back to current
            goToSlide(currentSlide);
        }

        // Hide the swipe hint after first successful swipe
        if (hint && Math.abs(diff) > SWIPE_THRESHOLD) {
            hint.classList.add('hidden');
            localStorage.setItem('swipeHintSeen', '1');
        }
    }

    // Touch events
    wrapper.addEventListener('touchstart', onStart, { passive: true });
    wrapper.addEventListener('touchmove',  onMove,  { passive: true });
    wrapper.addEventListener('touchend',   onEnd);

    // Mouse drag (for desktop testing)
    wrapper.addEventListener('mousedown',  onStart);
    window.addEventListener('mousemove',   onMove);
    window.addEventListener('mouseup',     onEnd);

    // Hide hint if already seen
    if (hint && localStorage.getItem('swipeHintSeen')) {
        hint.classList.add('hidden');
    }
}

// ─────────────────────────────────────────
//  REVIEW FORM
// ─────────────────────────────────────────
function initReviewForm() {
    const form      = document.getElementById('reviewForm');
    const starEls   = document.querySelectorAll('.star-input .star');
    const ratingIn  = document.getElementById('reviewRating');
    const textarea  = document.getElementById('reviewText');
    const charCount = document.getElementById('charCount');
    const msgEl     = document.getElementById('reviewMessage');
    if (!form) return;

    starEls.forEach(star => {
        star.addEventListener('mouseover', function () {
            const val = +this.dataset.value;
            starEls.forEach(s => s.classList.toggle('hovered', +s.dataset.value <= val));
        });
        star.addEventListener('mouseout', function () {
            starEls.forEach(s => s.classList.remove('hovered'));
        });
        star.addEventListener('click', function () {
            const val = +this.dataset.value;
            ratingIn.value = val;
            starEls.forEach(s => s.classList.toggle('selected', +s.dataset.value <= val));
        });
    });

    textarea.addEventListener('input', function () {
        charCount.textContent = this.value.length;
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const name   = document.getElementById('reviewName').value.trim();
        const rating = parseInt(ratingIn.value, 10);
        const text   = textarea.value.trim();

        if (!name)                   { showMessage(msgEl, 'Please enter your name.', 'error'); return; }
        if (rating < 1 || rating > 5){ showMessage(msgEl, 'Please select a star rating.', 'error'); return; }
        if (!text)                   { showMessage(msgEl, 'Please write your review.', 'error'); return; }

        const newReview = {
            id:       'cust-' + Date.now(),
            name, rating, text,
            date:     new Date().toISOString().split('T')[0],
            response: AUTO_RESPONSE
        };

        const stored = JSON.parse(localStorage.getItem('customerReviews')) || [];
        stored.push(newReview);
        localStorage.setItem('customerReviews', JSON.stringify(stored));

        form.reset();
        ratingIn.value = 0;
        starEls.forEach(s => s.classList.remove('selected', 'hovered'));
        charCount.textContent = '0';

        showMessage(msgEl, 'Thank you for your review!', 'success');

        buildReviewList();
        renderCarousel();
        setTimeout(() => goToSlide(allReviews.length - 1), 50);
    });
}

// ═══════════════════════════════════════════
//  FEATURE 3: STICKY CART BAR  (homepage)
//  Note: also used in products.js — defined
//  here so it works on both pages.
// ═══════════════════════════════════════════
function updateStickyCartBar() {
    const bar = document.getElementById('stickyCartBar');
    if (!bar) return;

    const cart  = getCart();
    const total = cart.reduce((sum, item) => {
        const p = getProductById(item.id);
        return p ? sum + p.price * item.quantity : sum;
    }, 0);
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);

    const countEl = document.getElementById('stickyCartCount');
    const totalEl = document.getElementById('stickyCartTotal');
    if (countEl) countEl.textContent = `${count} item${count !== 1 ? 's' : ''} in cart`;
    if (totalEl) totalEl.textContent = `R${total.toFixed(2)}`;

    if (count > 0) {
        bar.classList.add('visible');
    } else {
        bar.classList.remove('visible');
    }
}

// ─────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
}
