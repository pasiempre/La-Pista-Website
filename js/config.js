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

/**
 * Parse a game's date + time string into a Date representing Austin local time.
 * Uses CST (UTC-6) / CDT (UTC-5) so the result is correct regardless of the
 * user's browser timezone.
 * e.g. date="2026-02-15T00:00:00Z", time="7:00 PM" → Date at 7PM Austin time
 */
function parseGameStartTime(dateStr, timeStr) {
  const d = new Date(dateStr);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  
  let hours = 0, minutes = 0;
  if (timeStr) {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
    }
  }
  
  // Determine DST for Austin (US Central)
  // DST: second Sunday of March → first Sunday of November
  const marchFirst = new Date(Date.UTC(year, 2, 1));
  const dstStart = new Date(Date.UTC(year, 2, 8 + (7 - marchFirst.getUTCDay()) % 7, 8)); // 2AM CST = 8AM UTC
  const novFirst = new Date(Date.UTC(year, 10, 1));
  const dstEnd = new Date(Date.UTC(year, 10, 1 + (7 - novFirst.getUTCDay()) % 7, 7));   // 2AM CDT = 7AM UTC
  
  // Approximate check — use a rough UTC date to determine if DST applies
  const approxUTC = new Date(Date.UTC(year, month, day, hours + 6));
  const isDST = approxUTC >= dstStart && approxUTC < dstEnd;
  const offset = isDST ? 5 : 6; // CDT = UTC-5, CST = UTC-6
  
  // Return a Date in true UTC that represents Austin local time + offset
  return new Date(Date.UTC(year, month, day, hours + offset, minutes));
}

/**
 * Get the live status of a game based on current time (Austin timezone).
 * Both parseGameStartTime() and new Date() produce UTC-based timestamps,
 * so comparison works correctly regardless of the user's local timezone.
 *
 * Returns the game's DB status OR a computed time-based status:
 *   'completed'      → game ended (start + 2hrs passed) or DB says completed
 *   'in-progress'    → game has started but not ended
 *   'starting-soon'  → within 60 minutes of start
 *   'open'/'full'/etc → DB status (game hasn't started yet)
 */
function getGameLiveStatus(game) {
  // Already terminal in DB
  if (game.status === 'completed' || game.status === 'cancelled') return game.status;
  
  const now = new Date(); // UTC millis — same basis as parseGameStartTime
  const startTime = parseGameStartTime(game.date, game.time);
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours
  const soonTime = new Date(startTime.getTime() - 60 * 60 * 1000);    // -1 hour
  
  if (now >= endTime) return 'completed';
  if (now >= startTime) return 'in-progress';
  if (now >= soonTime) return 'starting-soon';
  
  return game.status; // 'open', 'full', 'scheduled'
}

/**
 * Check if a game is still active (not started, not completed, not cancelled).
 * Note: returns true for 'full' games (they show a waitlist, not a booking block).
 * Use isGameBookable() when you need to check actual booking eligibility.
 */
function isGameActive(game) {
  const status = getGameLiveStatus(game);
  return status === 'open' || status === 'scheduled' || status === 'full' || status === 'starting-soon';
}

/**
 * Check if a game can accept new bookings (has spots AND hasn't started).
 */
function isGameBookable(game) {
  const status = getGameLiveStatus(game);
  return (status === 'open' || status === 'scheduled' || status === 'starting-soon') && game.spotsRemaining > 0;
}

/**
 * Escape HTML special characters to prevent XSS when injecting dynamic text
 * into innerHTML / template literals. Safe for use inside attributes and text nodes.
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Auto-update copyright year in footers
document.addEventListener('DOMContentLoaded', function() {
  const yearElements = document.querySelectorAll('[data-year]');
  yearElements.forEach(el => {
    el.textContent = LAPISTA_CONFIG.CURRENT_YEAR;
  });
});
