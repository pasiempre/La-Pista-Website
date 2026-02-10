/* ============================================
   LaPista.ATX - Shared Configuration
   ============================================ */

const LAPISTA_CONFIG = {
  // API URL: auto-detect localhost vs production
  // For production, the API runs on the same domain so empty string works
  // If using a separate API domain, update the production URL here
  API_URL: window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : window.location.origin,

  // Pricing
  PRICE_PER_PERSON: 5.99,

  // Guest limits
  MAX_GUESTS: 4,

  // WhatsApp group link
  WHATSAPP_URL: 'https://chat.whatsapp.com/Gqkat9jvT1cAVURDjR9DqA',

  // Social links
  INSTAGRAM_URL: 'https://www.instagram.com/lapista.atx',

  // Contact
  EMAIL: 'lapista.atx@gmail.com',

  // Current year (for copyright)
  CURRENT_YEAR: new Date().getFullYear(),

  // Stripe publishable key (public - safe to expose in frontend)
  // These are placeholders - replace with your actual keys from Stripe Dashboard
  // For local dev without Stripe, payment features will be disabled
  STRIPE_PUBLISHABLE_KEY: window.location.hostname === 'localhost'
    ? 'pk_test_YOUR_TEST_KEY'  // Get from https://dashboard.stripe.com/test/apikeys
    : 'pk_live_51SkX8V5JxIIzfhAALpG95UvVJ5HGRN105wyP2IupwRivAVijXY7tp4FmPVQIYlotTsw53FBjPSHzwX9rNgzpzoiR001WlxMTtb'  // REPLACE with your real key from Stripe
};

// Freeze config to prevent accidental modification
Object.freeze(LAPISTA_CONFIG);

/**
 * Convert a UTC midnight date string to a local Date with the correct calendar date.
 * Game dates are stored as midnight UTC (e.g. 2026-02-10T00:00:00Z).
 * In US timezones this shifts to the previous evening (Feb 9 6pm CST),
 * causing wrong dates to display. This helper extracts the UTC date
 * components and creates a local Date so Feb 10 UTC = Feb 10 local.
 */
function gameLocalDate(dateStr) {
  const d = new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Get "today" as midnight local time for date comparisons.
 */
function todayLocal() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

// Auto-update copyright year in footers
document.addEventListener('DOMContentLoaded', function() {
  const yearElements = document.querySelectorAll('[data-year]');
  yearElements.forEach(el => {
    el.textContent = LAPISTA_CONFIG.CURRENT_YEAR;
  });
});
