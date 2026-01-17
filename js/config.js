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
  CURRENT_YEAR: new Date().getFullYear()
};

// Freeze config to prevent accidental modification
Object.freeze(LAPISTA_CONFIG);

// Auto-update copyright year in footers
document.addEventListener('DOMContentLoaded', function() {
  const yearElements = document.querySelectorAll('[data-year]');
  yearElements.forEach(el => {
    el.textContent = LAPISTA_CONFIG.CURRENT_YEAR;
  });
});
