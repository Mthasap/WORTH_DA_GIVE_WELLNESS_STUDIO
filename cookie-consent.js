/* ═══════════════════════════════════════════════════════════
   WORTHDAGIVE — cookie-consent.js
   Cookie Consent Banner + Terms & Conditions Modal
   Include this script on every page, AFTER styles.css
   ═══════════════════════════════════════════════════════════ */

(function() {
'use strict';

var CONSENT_KEY = 'wdg_cookie_consent';
var CONSENT_VERSION = '2'; // bump to re-ask users

/* ═══════════════════════
   LEGAL CONTENT
═══════════════════════ */
var LEGAL_TABS = [
  {
    id: 'terms', label: 'Terms & Conditions',
    html: `
      <h3>1. Acceptance of Terms</h3>
      <p>By accessing or using WorthDaGive Wellness Studio ("<strong>WorthDaGive</strong>", "<strong>we</strong>", "<strong>us</strong>") website and purchasing our products, you confirm that you have read, understood, and agree to be bound by these Terms &amp; Conditions and all applicable South African law.</p>
      <h3>2. Age Restriction — 18+ Only</h3>
      <div class="legal-warning">⚠️ You must be 18 years of age or older to purchase from WorthDaGive. It is a criminal offence under South African law to sell cannabis or cannabis-related products to a person under the age of 18.</div>
      <p>By completing a purchase, you warrant that you are 18 years of age or older. WorthDaGive reserves the right to request proof of age at any time and to cancel any order where age cannot be verified.</p>
      <h3>3. Legal Compliance</h3>
      <p>WorthDaGive operates in compliance with the <em>Cannabis for Private Purposes Act 7 of 2024</em> and all applicable South African legislation including the <em>Drugs and Drug Trafficking Act 140 of 1992</em> and the <em>Medicines and Related Substances Act 101 of 1965</em>. Products are intended for adult personal use only within the Republic of South Africa.</p>
      <h3>4. Products & Lab Testing</h3>
      <p>All cannabis products sold by WorthDaGive are sourced from compliant suppliers and are lab-tested for quality. THC and CBD percentages displayed are indicative and may vary slightly between batches. WorthDaGive makes no medical claims regarding its products.</p>
      <h3>5. Orders & Payment</h3>
      <p>All prices are listed in South African Rand (ZAR) and include VAT where applicable. Orders are confirmed upon successful payment via our payment processor (PayFast). WorthDaGive reserves the right to refuse or cancel any order at its discretion.</p>
      <h3>6. Delivery</h3>
      <p>Delivery is available within South Africa subject to our delivery zones and fees. Estimated delivery times are indicative only. WorthDaGive is not liable for delays caused by couriers, weather, or circumstances beyond our control. A signature may be required upon delivery. Products will not be delivered to a person who appears to be under 18.</p>
      <h3>7. Returns & Refunds</h3>
      <p>Due to the nature of cannabis products, we do not accept returns once a package has been opened. Damaged or incorrect items must be reported within 24 hours of delivery with photographic evidence. Approved refunds will be processed within 5–7 business days.</p>
      <h3>8. Health Disclaimer</h3>
      <p>Cannabis products affect individuals differently. Do not operate heavy machinery or drive under the influence. Consult a medical professional before use if you have any health conditions or are taking medication. WorthDaGive is not responsible for any adverse reactions.</p>
      <h3>9. Intellectual Property</h3>
      <p>All content on this website including logos, images, product descriptions, and text is the intellectual property of WorthDaGive Wellness Studio. Reproduction without written permission is prohibited.</p>
      <h3>10. Limitation of Liability</h3>
      <p>To the maximum extent permitted by South African law, WorthDaGive shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or website. Our total liability shall not exceed the amount paid for the relevant order.</p>
      <h3>11. Governing Law</h3>
      <p>These Terms are governed by the laws of the Republic of South Africa. Any disputes shall be subject to the jurisdiction of the South African courts.</p>
      <h3>12. Changes to Terms</h3>
      <p>WorthDaGive reserves the right to update these Terms at any time. Continued use of the website after changes constitutes acceptance of the new Terms.</p>
      <p style="color:#aaa;font-size:0.78rem;margin-top:2rem">Last updated: January 2026 | Version 2.0</p>
    `
  },
  {
    id: 'privacy', label: 'Privacy Policy',
    html: `
      <h3>1. Information We Collect</h3>
      <p>We collect information you provide directly: name, email address, date of birth, delivery address, phone number, and order history. We also collect technical data such as IP address, browser type, and pages visited via cookies and analytics tools.</p>
      <h3>2. How We Use Your Information</h3>
      <ul>
        <li>To process and deliver your orders</li>
        <li>To verify your age (18+ requirement)</li>
        <li>To communicate with you about orders, promotions, and updates (only if consented)</li>
        <li>To comply with legal obligations under South African law</li>
        <li>To improve our website and services</li>
      </ul>
      <h3>3. Date of Birth</h3>
      <p>Your date of birth is collected solely for age verification purposes as required by South African cannabis legislation. It is stored securely and is not shared with third parties except where legally required.</p>
      <h3>4. Data Sharing</h3>
      <p>We share your data only with: our payment processor (PayFast), our delivery partners (where necessary for fulfillment), and where required by law or a court order. We do not sell your personal data.</p>
      <h3>5. Data Security</h3>
      <p>We use industry-standard security measures including SSL encryption and secure cloud storage (Supabase). However, no method of transmission over the internet is 100% secure.</p>
      <h3>6. Your POPIA Rights</h3>
      <p>Under the Protection of Personal Information Act 4 of 2013 (POPIA), you have the right to: access your personal data, correct inaccurate data, request deletion of your data (subject to legal retention requirements), and opt out of direct marketing communications.</p>
      <p>To exercise these rights, contact us at <strong>privacy@worthdagive.co.za</strong>.</p>
      <h3>7. Retention</h3>
      <p>We retain your data for as long as necessary to fulfil the purposes outlined above or as required by law (e.g. financial records for 5 years).</p>
      <h3>8. Contact</h3>
      <p>For privacy enquiries: <strong>privacy@worthdagive.co.za</strong></p>
      <p style="color:#aaa;font-size:0.78rem;margin-top:2rem">Last updated: January 2026</p>
    `
  },
  {
    id: 'cookies', label: 'Cookie Policy',
    html: `
      <h3>What Are Cookies?</h3>
      <p>Cookies are small text files stored on your device when you visit our website. They help us provide a better experience and remember your preferences.</p>
      <h3>Cookies We Use</h3>
      <ul>
        <li><strong>Essential cookies</strong> — Required for the site to function. These include your shopping cart, age verification status, and login session. You cannot opt out of these.</li>
        <li><strong>Functional cookies</strong> — Remember your preferences such as language and region settings.</li>
        <li><strong>Analytics cookies</strong> — Help us understand how visitors use our site so we can improve it (e.g. Google Analytics). These are only set with your consent.</li>
        <li><strong>LocalStorage</strong> — We use your browser's local storage to save your shopping cart and session state. This is not a traditional cookie but serves a similar purpose.</li>
      </ul>
      <h3>Managing Cookies</h3>
      <p>You can control and delete cookies via your browser settings. Note that disabling essential cookies may prevent parts of the site from functioning correctly. You can withdraw your consent to analytics cookies at any time by clicking "Cookie Preferences" in the website footer.</p>
      <h3>Third-Party Cookies</h3>
      <p>Our payment provider (PayFast) and analytics services may set their own cookies. Please refer to their respective privacy policies for details.</p>
      <p style="color:#aaa;font-size:0.78rem;margin-top:2rem">Last updated: January 2026</p>
    `
  },
  {
    id: 'cannabis', label: 'Cannabis Disclaimer',
    html: `
      <div class="legal-warning" style="margin-bottom:1.2rem">
        ⚠️ <strong>IMPORTANT LEGAL NOTICE — READ CAREFULLY</strong>
      </div>
      <h3>Cannabis Law in South Africa</h3>
      <p>WorthDaGive Wellness Studio operates under the <em>Cannabis for Private Purposes Act 7 of 2024</em> ("the Act"), which governs the private use, possession, and purchase of cannabis by adults in South Africa.</p>
      <h3>18+ Age Requirement</h3>
      <p>It is a <strong>criminal offence</strong> to sell, supply, or offer cannabis or cannabis products to a person under the age of 18. All customers must be 18 or older. By purchasing, you warrant your age.</p>
      <h3>No Medical Claims</h3>
      <p>Nothing on this website constitutes medical advice. WorthDaGive makes no claims that its products diagnose, treat, cure, or prevent any disease or medical condition. Always consult a qualified medical practitioner before using cannabis, especially if pregnant, breastfeeding, or taking prescription medication.</p>
      <h3>Do Not Drive</h3>
      <p>It is illegal to drive under the influence of cannabis in South Africa under the <em>National Road Traffic Act 93 of 1996</em>. Do not operate any vehicle or heavy machinery after consuming cannabis products.</p>
      <h3>Private Use Only</h3>
      <p>Products sold by WorthDaGive are for private adult use only within lawful jurisdictions. Resale or supply to minors is strictly prohibited and constitutes a criminal offence.</p>
      <h3>Lab Testing</h3>
      <p>Our cannabis products are sourced from suppliers who conduct third-party lab testing. THC, CBD, and cannabinoid profiles are provided for informational purposes. Actual values may vary between batches within regulatory tolerances.</p>
      <h3>Jurisdiction</h3>
      <p>These products may only be legally purchased and used in the Republic of South Africa. WorthDaGive does not ship internationally. It is your responsibility to comply with the laws of your jurisdiction.</p>
      <p style="color:#aaa;font-size:0.78rem;margin-top:2rem">Last updated: January 2026</p>
    `
  }
];

/* ═══════════════════════
   COOKIE BANNER
═══════════════════════ */
function getConsent() {
  try {
    var c = JSON.parse(localStorage.getItem(CONSENT_KEY));
    return c && c.version === CONSENT_VERSION ? c : null;
  } catch(e) { return null; }
}

function setConsent(accepted) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({
    version: CONSENT_VERSION,
    accepted: accepted,
    date: new Date().toISOString()
  }));
}

function buildCookieBanner() {
  var banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.id = 'cookieBanner';
  banner.innerHTML =
    '<div class="cookie-banner-inner">' +
      '<div class="cookie-banner-text">' +
        '<strong>🍪 Cookie &amp; Privacy Notice</strong><br>' +
        'We use essential cookies to power your shopping cart and session. With your consent, we also use analytics cookies to improve our site. ' +
        'By clicking <em>Accept</em> you agree to our ' +
        '<a href="#" onclick="openLegalModal(\'cookies\');return false;">Cookie Policy</a>, ' +
        '<a href="#" onclick="openLegalModal(\'privacy\');return false;">Privacy Policy</a> and ' +
        '<a href="#" onclick="openLegalModal(\'terms\');return false;">Terms &amp; Conditions</a>.' +
      '</div>' +
      '<div class="cookie-banner-btns">' +
        '<button class="cookie-decline" onclick="cookieDecline()">Essential Only</button>' +
        '<button class="cookie-accept" onclick="cookieAccept()">Accept All</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(banner);
  setTimeout(function() { banner.classList.add('visible'); }, 400);
}

window.cookieAccept = function() {
  setConsent(true);
  hideCookieBanner();
};
window.cookieDecline = function() {
  setConsent(false);
  hideCookieBanner();
};
function hideCookieBanner() {
  var b = document.getElementById('cookieBanner');
  if (b) { b.classList.remove('visible'); setTimeout(function() { b.remove(); }, 500); }
}

/* ═══════════════════════
   LEGAL MODAL
═══════════════════════ */
function buildLegalModal() {
  if (document.getElementById('legalModal')) return;
  var modal = document.createElement('div');
  modal.id = 'legalModal';
  modal.className = 'legal-modal-overlay hidden';
  modal.innerHTML =
    '<div class="legal-modal-box">' +
      '<div class="legal-modal-head">' +
        '<h2>Legal Information — WorthDaGive</h2>' +
        '<button class="legal-modal-close" onclick="closeLegalModal()" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="legal-modal-tabs" id="legalModalTabs">' +
        LEGAL_TABS.map(function(t) {
          return '<button class="legal-tab" data-id="' + t.id + '" onclick="switchLegalTab(\'' + t.id + '\')">' + t.label + '</button>';
        }).join('') +
      '</div>' +
      '<div class="legal-modal-body" id="legalModalBody"></div>' +
      '<div class="legal-modal-footer">' +
        '<button class="btn-secondary" onclick="closeLegalModal()">Close</button>' +
        '<button class="btn-primary" onclick="cookieAccept();closeLegalModal()">Accept &amp; Continue</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) { if (e.target === modal) closeLegalModal(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeLegalModal(); });
}

window.openLegalModal = function(tabId) {
  buildLegalModal();
  var modal = document.getElementById('legalModal');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  switchLegalTab(tabId || LEGAL_TABS[0].id);
};
window.closeLegalModal = function() {
  var modal = document.getElementById('legalModal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
};
window.switchLegalTab = function(id) {
  var tab = LEGAL_TABS.find(function(t) { return t.id === id; });
  if (!tab) return;
  document.getElementById('legalModalBody').innerHTML = tab.html;
  document.querySelectorAll('#legalModalTabs .legal-tab').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.id === id);
  });
};

/* ═══════════════════════
   INIT
═══════════════════════ */
function init() {
  if (!getConsent()) {
    buildCookieBanner();
  }
  // Add footer "Cookie Preferences" link dynamically
  var footerLegal = document.querySelector('.footer-legal');
  if (footerLegal && !document.getElementById('cookiePrefLink')) {
    var p = document.createElement('p');
    p.innerHTML = '<a href="#" id="cookiePrefLink" onclick="openLegalModal(\'cookies\');return false;" style="color:inherit;opacity:0.7;font-size:0.82rem">Cookie Preferences</a> | ' +
      '<a href="#" onclick="openLegalModal(\'terms\');return false;" style="color:inherit;opacity:0.7;font-size:0.82rem">Terms &amp; Conditions</a> | ' +
      '<a href="#" onclick="openLegalModal(\'privacy\');return false;" style="color:inherit;opacity:0.7;font-size:0.82rem">Privacy Policy</a> | ' +
      '<a href="#" onclick="openLegalModal(\'cannabis\');return false;" style="color:inherit;opacity:0.7;font-size:0.82rem">Cannabis Disclaimer</a>';
    footerLegal.appendChild(p);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
