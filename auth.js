/* ═══════════════════════════════════════════════════════════
   WORTHDAGIVE — auth.js
   Shared authentication state + modal UI used by
   index.html, products.html, checkout.html
   Requires: supabase.js loaded first
   ═══════════════════════════════════════════════════════════ */

/* ── SVG Icons (professional, no emoji) ── */
const ICONS = {
    user:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    logout:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    orders:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    check:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    eye:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeOff:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
    mail:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    lock:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    warn:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
};

/* ── Current session state ── */
let _currentSession  = null;
let _currentProfile  = null;
let _authReady       = false;
let _authCallbacks   = [];

async function initAuth() {
    try {
        _currentSession = await WDG.authGetSession();
        if (_currentSession) {
            _currentProfile = await WDG.authGetProfile();
        }
    } catch (e) { /* offline / not configured */ }
    _authReady = true;
    _authCallbacks.forEach(cb => cb(_currentSession, _currentProfile));

    try {
        WDG.authOnChange(async (session) => {
            _currentSession = session;
            _currentProfile = session ? await WDG.authGetProfile() : null;
            updateNavAuth();
            _authCallbacks.forEach(cb => cb(session, _currentProfile));
        });
    } catch(e) {}

    updateNavAuth();
    injectAuthModal();
}

/** Register a callback that fires when auth state changes */
function onAuthReady(cb) {
    if (_authReady) cb(_currentSession, _currentProfile);
    else _authCallbacks.push(cb);
}

function isLoggedIn()   { return !!_currentSession; }
function currentUser()  { return _currentProfile; }
function currentSession() { return _currentSession; }

/* ── Update nav Login/Account link with dropdown ── */
function updateNavAuth() {
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return;

    // Remove existing dropdown if present
    const existingDropdown = document.getElementById('accountDropdown');
    if (existingDropdown) existingDropdown.remove();

    if (_currentSession && _currentProfile) {
        const firstName = (_currentProfile.full_name || '').split(' ')[0] || 'Account';
        loginBtn.innerHTML = ICONS.user + ' ' + firstName + ' <span style="font-size:0.7rem;opacity:0.7">▾</span>';
        loginBtn.href = '#';
        loginBtn.onclick = (e) => { e.preventDefault(); toggleAccountDropdown(loginBtn); };

        // Inject dropdown menu
        const dropdown = document.createElement('div');
        dropdown.id = 'accountDropdown';
        dropdown.className = 'account-dropdown hidden';
        dropdown.innerHTML = `
            <div class="account-dropdown-header">
                <div class="account-dropdown-name">${_currentProfile.full_name || 'My Account'}</div>
                <div class="account-dropdown-email">${_currentProfile.email || ''}</div>
            </div>
            <a href="orders.html" class="account-dropdown-item">
                ${ICONS.orders} My Orders
            </a>
            <a href="orders.html#wishlist" class="account-dropdown-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                Wishlist
            </a>
            <a href="orders.html#helpline" class="account-dropdown-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Helpline
            </a>
            <a href="orders.html#profile" class="account-dropdown-item">
                ${ICONS.user} My Profile
            </a>
            <div class="account-dropdown-divider"></div>
            <a href="#" class="account-dropdown-item account-dropdown-logout" onclick="window.authLogout();return false;">
                ${ICONS.logout} Sign Out
            </a>`;
        // Insert after the loginBtn's parent <li>
        const li = loginBtn.closest('li') || loginBtn.parentNode;
        li.style.position = 'relative';
        li.appendChild(dropdown);

        // Close when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOutside);
        }, 10);
    } else {
        loginBtn.innerHTML = ICONS.user + ' Login';
        loginBtn.href = '#';
        loginBtn.onclick = (e) => { e.preventDefault(); openAuthModal('login'); };
    }
}

function toggleAccountDropdown(btn) {
    const d = document.getElementById('accountDropdown');
    if (!d) return;
    d.classList.toggle('hidden');
}

function closeDropdownOutside(e) {
    const d = document.getElementById('accountDropdown');
    const btn = document.getElementById('loginBtn');
    if (d && !d.contains(e.target) && btn && !btn.contains(e.target)) {
        d.classList.add('hidden');
        document.removeEventListener('click', closeDropdownOutside);
    }
}
window.closeDropdownOutside = closeDropdownOutside;

/* ════════════════════════════════════════
   AUTH MODAL  (Login + Register)
════════════════════════════════════════ */
function injectAuthModal() {
    if (document.getElementById('authModal')) return;

    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
        <div class="modal-content auth-modal-content">
            <button class="auth-modal-close" id="authModalClose" aria-label="Close">&times;</button>

            <div class="auth-tab-bar" id="authTabBar">
                <button class="auth-tab active" data-tab="login" onclick="switchAuthTab('login')">Sign In</button>
                <button class="auth-tab" data-tab="register" onclick="switchAuthTab('register')">Register</button>
            </div>

            <!-- ── LOGIN ── -->
            <div id="authLoginPanel" class="auth-panel">
                <p class="auth-panel-subtitle">Welcome back. Sign in to continue.</p>
                <form id="authLoginForm" novalidate>
                    <div class="auth-field">
                        <label for="authEmail">${ICONS.mail} Email Address</label>
                        <input type="email" id="authEmail" placeholder="you@example.com" autocomplete="email" required>
                    </div>
                    <div class="auth-field">
                        <label for="authPassword">${ICONS.lock} Password</label>
                        <div class="auth-pw-wrap">
                            <input type="password" id="authPassword" placeholder="Your password" autocomplete="current-password" required>
                            <button type="button" class="auth-pw-toggle" onclick="togglePw('authPassword',this)" tabindex="-1">${ICONS.eye}</button>
                        </div>
                    </div>
                    <div id="authLoginMsg" class="auth-msg hidden"></div>
                    <button type="submit" class="btn-primary auth-submit" id="authLoginBtn">
                        <span class="auth-btn-text">Sign In</span>
                        <span class="auth-btn-spinner hidden"></span>
                    </button>
                </form>
                <p class="auth-switch-link"><a href="#" onclick="switchAuthTab('forgot');return false;">Forgot your password?</a></p>
                <p class="auth-switch-link"><a href="#" onclick="switchAuthTab('register');return false;">Don't have an account? Register here</a></p>
            </div>

            <!-- ── FORGOT PASSWORD ── -->
            <div id="authForgotPanel" class="auth-panel hidden">
                <p class="auth-panel-subtitle">Enter your email to receive a password reset link.</p>
                <form id="authForgotForm" novalidate>
                    <div class="auth-field">
                        <label for="forgotEmail">${ICONS.mail} Email Address</label>
                        <input type="email" id="forgotEmail" placeholder="you@example.com" autocomplete="email" required>
                    </div>
                    <div id="authForgotMsg" class="auth-msg hidden"></div>
                    <button type="submit" class="btn-primary auth-submit" id="authForgotBtn">
                        <span class="auth-btn-text">Send Reset Link</span>
                        <span class="auth-btn-spinner hidden"></span>
                    </button>
                </form>
                <p class="auth-switch-link"><a href="#" onclick="switchAuthTab('login');return false;">Back to Sign In</a></p>
            </div>

            <!-- ── REGISTER ── -->
            <div id="authRegisterPanel" class="auth-panel hidden">
                <p class="auth-panel-subtitle">Create your account. Takes less than a minute.</p>
                <form id="authRegisterForm" novalidate>
                    <div class="auth-field">
                        <label>${ICONS.user} Full Name</label>
                        <input type="text" id="regFullName" placeholder="e.g. Thabo Khumalo" maxlength="80" autocomplete="name" required>
                    </div>
                    <div class="auth-field">
                        <label>${ICONS.mail} Email Address</label>
                        <input type="email" id="regEmail" placeholder="you@example.com" autocomplete="email" required>
                    </div>
                    <div class="auth-field">
                        <label>${ICONS.lock} Password</label>
                        <div class="auth-pw-wrap">
                            <input type="password" id="regPassword" placeholder="Minimum 8 characters" autocomplete="new-password" required>
                            <button type="button" class="auth-pw-toggle" onclick="togglePw('regPassword',this)" tabindex="-1">${ICONS.eye}</button>
                        </div>
                    </div>
                    <div class="auth-field">
                        <label>${ICONS.lock} Confirm Password</label>
                        <div class="auth-pw-wrap">
                            <input type="password" id="regPassword2" placeholder="Repeat password" autocomplete="new-password" required>
                            <button type="button" class="auth-pw-toggle" onclick="togglePw('regPassword2',this)" tabindex="-1">${ICONS.eye}</button>
                        </div>
                    </div>

                    <!-- Phone (optional, for SMS OTP) -->
                    <div class="auth-field">
                        <label>📱 Mobile Number <span style="font-size:0.75rem;color:#888;font-weight:400">(optional — for SMS updates)</span></label>
                        <input type="tel" id="regPhone" placeholder="+27 81 234 5678" autocomplete="tel">
                    </div>

                    <!-- Date of birth -->
                    <div class="auth-field reg-age-block">
                        <label class="reg-age-label">Date of Birth <span class="reg-required">*</span></label>
                        <input type="date" id="regDob" class="reg-dob-input" required>
                        <p class="reg-age-hint">You must be 18 or older. Required by South African law.</p>
                    </div>

                    <!-- Age confirm -->
                    <div class="reg-checkbox-group">
                        <input type="checkbox" id="regAge18">
                        <label for="regAge18">I confirm I am <strong>18 years of age or older</strong> and my date of birth above is accurate and truthful.</label>
                    </div>

                    <!-- Legal warning -->
                    <div class="reg-consequences-box">
                        <div class="reg-warn-head">${ICONS.warn} Warning — False Information</div>
                        <p>Providing false or misleading information about your age when registering may constitute a criminal offence under the <em>Electronic Communications and Transactions Act 25 of 2002</em>, the <em>Drugs and Drug Trafficking Act 140 of 1992</em>, and the <em>Cannabis for Private Purposes Act 7 of 2024</em>. WorthDaGive reserves the right to verify your age and report fraudulent registrations to the SAPS.</p>
                    </div>

                    <!-- Terms -->
                    <div class="reg-checkbox-group">
                        <input type="checkbox" id="regTerms">
                        <label for="regTerms">I accept the <a href="index.html#legal-full" target="_blank">Legal Notice</a> and confirm I am purchasing for private use in a lawful jurisdiction.</label>
                    </div>

                    <div id="authRegMsg" class="auth-msg hidden"></div>
                    <button type="submit" class="btn-primary auth-submit" id="authRegBtn">
                        <span class="auth-btn-text">Create Account</span>
                        <span class="auth-btn-spinner hidden"></span>
                    </button>
                </form>
                <p class="auth-switch-link"><a href="#" onclick="switchAuthTab('login');return false;">Already have an account? Sign in</a></p>
            </div>

            <!-- ── VERIFY EMAIL ── -->
            <div id="authVerifyPanel" class="auth-panel hidden">
                <div class="auth-verify-icon">${ICONS.mail}</div>
                <h3>Check your email</h3>
                <p>We've sent a verification link to <strong id="authVerifyEmail"></strong>. Click the link in the email to activate your account, then return here and sign in.</p>
                <div id="authOtpBlock" class="hidden" style="margin-top:1.2rem;padding:1rem;background:#f0f9ff;border-radius:10px;border:1px solid #bae6fd">
                    <p style="font-size:0.85rem;color:#0369a1;margin-bottom:0.8rem">📱 Enter the SMS code sent to your phone:</p>
                    <div style="display:flex;gap:8px">
                        <input type="text" id="otpInput" maxlength="6" placeholder="6-digit code" style="flex:1;padding:10px 12px;border:2px solid #ddd;border-radius:8px;font-size:1rem;letter-spacing:4px;text-align:center">
                        <button onclick="verifyPhoneOtp()" style="padding:10px 16px;background:#4CAF50;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">Verify</button>
                    </div>
                    <div id="otpMsg" class="auth-msg hidden" style="margin-top:8px"></div>
                </div>
                <button class="btn-primary" style="width:100%;margin-top:1rem;" onclick="switchAuthTab('login')">Go to Sign In</button>
            </div>
        </div>`;

    document.body.appendChild(modal);

    document.getElementById('authModalClose').addEventListener('click', closeAuthModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeAuthModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAuthModal(); });

    document.getElementById('authLoginForm').addEventListener('submit', handleLogin);
    document.getElementById('authRegisterForm').addEventListener('submit', handleRegister);
    document.getElementById('authForgotForm').addEventListener('submit', handleForgotPassword);
}

function openAuthModal(tab, onSuccess) {
    _authSuccessCallback = onSuccess || null;
    const modal = document.getElementById('authModal');
    if (!modal) { injectAuthModal(); }
    switchAuthTab(tab || 'login');
    document.getElementById('authModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
    _authSuccessCallback = null;
}

let _authSuccessCallback = null;

function switchAuthTab(tab) {
    const panels = ['login','register','verify','forgot','reset'];
    panels.forEach(t => {
        const el = document.getElementById('auth' + t.charAt(0).toUpperCase() + t.slice(1) + 'Panel');
        if (el) el.classList.toggle('hidden', t !== tab);
    });
    document.querySelectorAll('#authTabBar .auth-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
}

function togglePw(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.innerHTML = show ? ICONS.eyeOff : ICONS.eye;
}

function setSubmitting(btnId, submitting) {
    const btn     = document.getElementById(btnId);
    if (!btn) return;
    const text    = btn.querySelector('.auth-btn-text');
    const spinner = btn.querySelector('.auth-btn-spinner');
    btn.disabled  = submitting;
    if (text)    text.classList.toggle('hidden', submitting);
    if (spinner) spinner.classList.toggle('hidden', !submitting);
}

function showAuthMsg(elId, text, type) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = text;
    el.className   = 'auth-msg ' + type;
    el.classList.remove('hidden');
}

/* ── Login handler ── */
async function handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const msgEl    = 'authLoginMsg';

    if (!email || !password) { showAuthMsg(msgEl, 'Please enter your email and password.', 'error'); return; }

    setSubmitting('authLoginBtn', true);
    try {
        await WDG.authLogin(email, password);
        _currentSession = await WDG.authGetSession();
        _currentProfile = await WDG.authGetProfile();
        updateNavAuth();
        closeAuthModal();
        if (_authSuccessCallback) _authSuccessCallback();
        else showToastGlobal('Welcome back, ' + (_currentProfile?.full_name?.split(' ')[0] || 'there') + '!', 'success');
    } catch (err) {
        const msg = err.message || 'Login failed.';
        showAuthMsg(msgEl, msg.includes('Invalid') ? 'Incorrect email or password.' : msg, 'error');
    } finally {
        setSubmitting('authLoginBtn', false);
    }
}

/* ── Register handler ── */
async function handleRegister(e) {
    e.preventDefault();
    const fullName  = document.getElementById('regFullName').value.trim();
    const email     = document.getElementById('regEmail').value.trim();
    const password  = document.getElementById('regPassword').value;
    const password2 = document.getElementById('regPassword2').value;
    const dob       = document.getElementById('regDob').value;
    const age18     = document.getElementById('regAge18').checked;
    const terms     = document.getElementById('regTerms').checked;
    const msgEl     = 'authRegMsg';

    if (!fullName)  { showAuthMsg(msgEl, 'Full name is required.', 'error'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthMsg(msgEl, 'Please enter a valid email address.', 'error'); return; }
    if (!password || password.length < 8) { showAuthMsg(msgEl, 'Password must be at least 8 characters.', 'error'); return; }
    if (password !== password2) { showAuthMsg(msgEl, 'Passwords do not match.', 'error'); return; }
    if (!dob) { showAuthMsg(msgEl, 'Please enter your date of birth.', 'error'); return; }

    /* Age check */
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 18) { showAuthMsg(msgEl, 'You must be 18 or older to register. This is required by South African law.', 'error'); return; }

    if (!age18) { showAuthMsg(msgEl, 'Please confirm you are 18 years of age or older.', 'error'); return; }
    if (!terms)  { showAuthMsg(msgEl, 'You must accept the legal notice to register.', 'error'); return; }

    setSubmitting('authRegBtn', true);
    try {
        await WDG.authRegister(email, password, fullName, dob);
        const phone = (document.getElementById('regPhone') || {}).value || '';
        document.getElementById('authVerifyEmail').textContent = email;

        // If phone number provided, send SMS OTP
        const phoneBlock = document.getElementById('authOtpBlock');
        if (phone && phone.trim().length >= 10) {
            const cleaned = phone.trim().replace(/\s/g, '');
            _pendingPhone = cleaned;
            try {
                await WDG.authSendPhoneOtp(cleaned);
                if (phoneBlock) phoneBlock.classList.remove('hidden');
            } catch(phoneErr) {
                // Phone OTP failed silently — don't block registration
                console.warn('SMS OTP failed:', phoneErr.message);
                if (phoneBlock) phoneBlock.classList.add('hidden');
            }
        } else {
            if (phoneBlock) phoneBlock.classList.add('hidden');
        }
        switchAuthTab('verify');
    } catch (err) {
        const msg = err.message || 'Registration failed.';
        showAuthMsg(msgEl, msg.includes('already registered') ? 'This email is already registered. Please sign in.' : msg, 'error');
    } finally {
        setSubmitting('authRegBtn', false);
    }
}

/* ── Forgot Password handler ── */
async function handleForgotPassword(e) {
    e.preventDefault();
    const email  = document.getElementById('forgotEmail').value.trim();
    const msgEl  = 'authForgotMsg';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showAuthMsg(msgEl, 'Please enter a valid email address.', 'error'); return;
    }
    setSubmitting('authForgotBtn', true);
    try {
        await WDG.authResetPassword(email);
        showAuthMsg(msgEl, '✅ Reset link sent! Check your email inbox (and spam folder).', 'success');
        document.getElementById('forgotEmail').value = '';
    } catch(err) {
        showAuthMsg(msgEl, err.message || 'Could not send reset email. Please try again.', 'error');
    } finally {
        setSubmitting('authForgotBtn', false);
    }
}

/* ── Phone OTP verification (called from verify panel) ── */
let _pendingPhone = '';
async function verifyPhoneOtp() {
    const token  = (document.getElementById('otpInput') || {}).value || '';
    const msgEl  = document.getElementById('otpMsg');
    if (!token || token.length < 4) {
        if (msgEl) { msgEl.textContent = 'Enter the 6-digit code from your SMS.'; msgEl.className = 'auth-msg error'; msgEl.classList.remove('hidden'); }
        return;
    }
    try {
        await WDG.authVerifyPhoneOtp(_pendingPhone, token);
        if (msgEl) { msgEl.textContent = '✅ Phone verified!'; msgEl.className = 'auth-msg success'; msgEl.classList.remove('hidden'); }
        // Update profile with verified phone
        const db = await WDG.getDB();
        const sess = await WDG.authGetSession();
        if (sess) {
            await db.from('profiles').update({ phone: _pendingPhone }).eq('id', sess.user.id);
        }
        setTimeout(() => switchAuthTab('login'), 1500);
    } catch(err) {
        if (msgEl) { msgEl.textContent = 'Invalid code. Please try again.'; msgEl.className = 'auth-msg error'; msgEl.classList.remove('hidden'); }
    }
}
window.verifyPhoneOtp = verifyPhoneOtp;

/* ── Global toast (used across pages) ── */
function showToastGlobal(msg, type) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'success' ? ' toast-success' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast-show'));
    setTimeout(() => {
        t.classList.remove('toast-show');
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

/* Expose globally */
window.openAuthModal   = openAuthModal;
window.closeAuthModal  = closeAuthModal;
window.switchAuthTab   = switchAuthTab;
window.togglePw        = togglePw;
window.isLoggedIn      = isLoggedIn;
window.currentUser     = currentUser;
window.currentSession  = currentSession;
window.onAuthReady     = onAuthReady;
window.authLogout      = async function() {
    await WDG.authLogout();
    _currentSession = null;
    _currentProfile = null;
    updateNavAuth();
    window.location.href = 'index.html';
};
window.showToastGlobal = showToastGlobal;
