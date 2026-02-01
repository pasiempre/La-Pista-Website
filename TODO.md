# LaPista.ATX Website - Feature Roadmap & TODO

**Last Updated:** January 20, 2026
**Status:** Production (Live at lapista-atx.com)

---

## Table of Contents
1. [Priority 1: Quick Wins](#priority-1-quick-wins-1-2-days-each)
2. [Priority 2: Revenue & Growth](#priority-2-revenue--growth-features)
3. [Priority 3: User Experience](#priority-3-user-experience-enhancements)
4. [Priority 4: Analytics & Marketing](#priority-4-analytics--marketing)
5. [Priority 5: Future Expansion](#priority-5-future-expansion)
6. [Additional Recommendations](#additional-recommendations-from-code-review)

---

## Priority 1: Quick Wins (1-2 days each)

### 1.1 Add Facebook & TikTok Social Links
**Status:** 🔴 Not Started
**Effort:** 2-4 hours
**Files to modify:**
- `index.html` (mobile menu + footer)
- `game-details.html` (mobile menu)
- `about-page.html`, `faq-page.html`, `contact-page.html` (all have social sections)
- `js/shared-constants.js` (add URLs to config)

**Implementation:**
```javascript
// In js/shared-constants.js, add to social object:
social: {
  instagram: 'https://www.instagram.com/lapista.atx',
  whatsapp: 'https://chat.whatsapp.com/Gqkat9jvT1cAVURDjR9DqA',
  facebook: 'https://www.facebook.com/groups/YOUR_GROUP_ID',  // ADD
  tiktok: 'https://www.tiktok.com/@lapista.atx',              // ADD
  email: 'lapista.atx@gmail.com',
  cashApp: '$bhrizzo'
}
```

```html
<!-- Add these buttons next to existing Instagram/WhatsApp -->
<a href="https://www.facebook.com/groups/YOUR_GROUP_ID" target="_blank"
   class="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-green-600 hover:text-white transition-all">
  <span class="iconify text-xl" data-icon="mdi:facebook" data-width="20"></span>
</a>
<a href="https://www.tiktok.com/@lapista.atx" target="_blank"
   class="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-green-600 hover:text-white transition-all">
  <span class="iconify text-xl" data-icon="ic:baseline-tiktok" data-width="20"></span>
</a>
```

**Also update:** JSON-LD structured data in `index.html` to include new social URLs for SEO.

---

### 1.2 "Partnered with Sphere" Section on Homepage
**Status:** 🔴 Not Started
**Effort:** 1-2 hours
**Location:** Below the About section in `index.html`

**Implementation:**
```html
<!-- Add after the About section, before the footer -->
<section class="py-12 border-t border-zinc-200">
  <div class="max-w-4xl mx-auto px-4 text-center">
    <p class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
      Partnered With
    </p>
    <a href="https://sphere-website.com" target="_blank" rel="noopener" class="inline-block opacity-60 hover:opacity-100 transition-opacity">
      <img src="/partners/sphere-logo.png" alt="Sphere" class="h-12 md:h-16 object-contain mx-auto">
    </a>
  </div>
</section>
```

**Notes:**
- Create `/partners/` folder for partner logos
- Keep it minimal - just logo, no heavy descriptions
- Can expand to multiple partners later with a grid layout

---

### 1.3 Show Full Games with Waitlist Option
**Status:** 🔴 Not Started
**Effort:** 2-4 hours
**Current behavior:** Games at capacity may be hidden or show as unavailable
**Desired behavior:** Show all games, display "Join Waitlist" for full games

**Files to modify:**
- `index.html` (game card rendering)
- `game-details.html` (waitlist form - already exists!)
- `api/server.js` (ensure full games returned in API)

**Implementation - index.html:**
```javascript
// In the game card rendering function, instead of hiding full games:
const isFull = game.spotsRemaining <= 0;

// Update the card button:
if (isFull) {
  buttonHTML = `
    <a href="game-details.html?gameId=${game.gameId}"
       class="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-xs rounded transition-all flex items-center justify-center gap-2">
      <span class="iconify" data-icon="lucide:bell"></span>
      Join Waitlist
    </a>
  `;
  // Add "FULL" badge to card
  badgeHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-red-50 text-red-600 border border-red-200 uppercase">Game Full</span>`;
}
```

**Backend check (`api/server.js`):**
```javascript
// In GET /api/games, ensure we're NOT filtering out full games:
const games = await Game.find({
  status: { $in: ['scheduled', 'open', 'full'] },  // Include 'full' status
  date: { $gte: new Date() }
}).sort({ date: 1 });
```

**Note:** The waitlist form already exists in `game-details.html` and the `/api/waitlist` endpoint is functional!

---

## Priority 2: Revenue & Growth Features

### 2.1 Promo Code System at Checkout
**Status:** 🔴 Not Started
**Effort:** 1-2 days
**Stripe Integration:** Yes - uses Stripe Coupons/Promotion Codes

**How Stripe Promo Codes Work:**
1. You create coupons in Stripe Dashboard (Dashboard → Products → Coupons)
2. Coupons can be: percentage off, fixed amount, or free trial
3. You create "Promotion Codes" from coupons (the actual code users enter)
4. When creating checkout session, pass the `allow_promotion_codes: true` option

**Files to modify:**
- `game-details.html` (add promo code input UI)
- `api/server.js` (update checkout endpoint)

**Frontend Implementation (game-details.html):**
```html
<!-- Add before the payment method selection -->
<div class="mb-6">
  <label class="block text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">
    Promo Code (Optional)
  </label>
  <div class="flex gap-2">
    <input type="text" id="promo-code"
           class="flex-1 bg-zinc-50 border border-zinc-200 rounded-md px-4 py-3 text-sm font-medium uppercase tracking-wide focus:bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
           placeholder="Enter code">
    <button type="button" id="apply-promo-btn" onclick="validatePromoCode()"
            class="px-4 py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold text-sm uppercase rounded-md transition-all">
      Apply
    </button>
  </div>
  <div id="promo-status" class="mt-2 text-sm hidden"></div>
</div>
```

**Backend Implementation (api/server.js):**
```javascript
// Option A: Let Stripe handle promo codes automatically (RECOMMENDED)
// Just add this to your checkout session creation:
const session = await stripe.checkout.sessions.create({
  // ... existing options ...
  allow_promotion_codes: true,  // ADD THIS LINE
});

// Option B: Validate promo code before checkout (more control)
// Add new endpoint:
app.post('/api/validate-promo', apiLimiter, async (req, res) => {
  try {
    const { code } = req.body;

    // List promotion codes and find matching one
    const promoCodes = await stripe.promotionCodes.list({
      code: code.toUpperCase(),
      active: true,
      limit: 1
    });

    if (promoCodes.data.length === 0) {
      return res.status(400).json({ error: 'Invalid promo code' });
    }

    const promo = promoCodes.data[0];
    const coupon = promo.coupon;

    res.json({
      valid: true,
      code: promo.code,
      discount: coupon.percent_off
        ? `${coupon.percent_off}% off`
        : `$${(coupon.amount_off / 100).toFixed(2)} off`,
      couponId: coupon.id
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate code' });
  }
});
```

**Creating Promo Codes in Stripe:**
1. Go to Stripe Dashboard → Products → Coupons
2. Click "Create coupon"
3. Set discount type (% or fixed amount)
4. Set duration (once, repeating, forever)
5. After creating coupon, click it → "Create promotion code"
6. Enter the code customers will use (e.g., "FIRSTGAME", "SUMMER10")

**Recommendation:** Use `allow_promotion_codes: true` for simplicity. Stripe shows a promo code field automatically in their checkout UI.

---

### 2.2 Admin Dashboard
**Status:** 🔴 Not Started
**Effort:** 3-5 days
**Purpose:** Manage games, view RSVPs, handle operations

**Suggested Features:**

**Core (Must Have):**
- [ ] View all games (upcoming, past, cancelled)
- [ ] Create new game manually
- [ ] Edit game details (time, venue, capacity)
- [ ] Cancel game (with auto-refund option)
- [ ] View RSVPs for each game
- [ ] Mark players as checked-in
- [ ] View waitlist and notify manually

**Nice to Have (Easy to Add):**
- [ ] Generate games from templates (endpoint exists!)
- [ ] View total revenue by date range
- [ ] Export RSVPs to CSV
- [ ] Send bulk email to game attendees
- [ ] View no-show history by player
- [ ] Quick player lookup by email
- [ ] Dashboard stats (games this week, total RSVPs, revenue)

**Implementation Approach:**

**Option A: Simple Admin Page (Recommended for now)**
Create `admin.html` protected by URL with admin key parameter:
```
https://lapista-atx.com/admin.html?key=YOUR_ADMIN_SECRET
```

```html
<!-- admin.html structure -->
<body>
  <!-- Tabs: Games | RSVPs | Waitlist | Stats -->

  <!-- Games Tab -->
  <div id="games-tab">
    <button onclick="createGame()">+ New Game</button>
    <button onclick="generateWeekGames()">Generate This Week</button>
    <table id="games-table">
      <!-- Populated by JS -->
    </table>
  </div>

  <!-- Game Detail Modal -->
  <div id="game-modal" class="hidden">
    <!-- Edit form, RSVP list, actions -->
  </div>
</body>

<script>
const ADMIN_KEY = new URLSearchParams(window.location.search).get('key');

async function loadGames() {
  const res = await fetch(`${API_URL}/api/admin/games`, {
    headers: { 'x-admin-key': ADMIN_KEY }
  });
  // ... render table
}
</script>
```

**Backend - Add admin endpoints (api/server.js):**
```javascript
// Admin middleware
const adminAuth = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (key !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Admin routes
app.get('/api/admin/games', adminAuth, async (req, res) => {
  const games = await Game.find().sort({ date: -1 });
  res.json(games);
});

app.get('/api/admin/games/:gameId/rsvps', adminAuth, async (req, res) => {
  const rsvps = await RSVP.find({ gameId: req.params.gameId });
  res.json(rsvps);
});

app.put('/api/admin/games/:gameId', adminAuth, async (req, res) => {
  const game = await Game.findOneAndUpdate(
    { gameId: req.params.gameId },
    req.body,
    { new: true }
  );
  res.json(game);
});

app.post('/api/admin/games/:gameId/cancel', adminAuth, async (req, res) => {
  // Cancel game + process refunds
});

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  const totalGames = await Game.countDocuments();
  const totalRSVPs = await RSVP.countDocuments({ status: 'confirmed' });
  const revenue = await RSVP.aggregate([
    { $match: { paymentStatus: 'paid' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  res.json({ totalGames, totalRSVPs, revenue: revenue[0]?.total || 0 });
});
```

**Option B: Use Existing Tools**
- **Retool** or **Appsmith** - Connect to your MongoDB + Stripe
- **Forest Admin** - Auto-generates admin panel from database
- These are faster to set up but add external dependency

---

### 2.3 User Accounts & Memberships (Deferred)
**Status:** 🟡 Planned for Later
**Effort:** 1-2 weeks
**Dependencies:** Needed before memberships, loyalty programs

**Why User Accounts Matter:**
- Memberships require knowing who paid
- Loyalty points need account tracking
- Faster checkout (saved info)
- Game history / stats
- Referral programs

**Current State:**
- User schema exists in `api/models.js`
- Auth endpoints exist (`/api/auth/register`, `/api/auth/login`)
- JWT authentication implemented
- Just needs frontend UI!

**Implementation for Later:**
1. Create `login.html` and `register.html` pages
2. Create `my-account.html` for profile/history
3. Add login state to navbar (show name or "Login" button)
4. Pre-fill checkout form if logged in
5. Show booking history on account page

**Membership Ideas:**
- **Monthly Pass:** $39/month for unlimited games
- **10-Game Pack:** $49.99 (save ~$10)
- **Season Pass:** $149/season

---

### 2.4 Merch Store (Deferred)
**Status:** 🟡 Planned for Later
**Effort:** 1-2 weeks (or use Shopify embed)

**Options:**

**Option A: Shopify / BigCommerce (Easiest)**
- Set up separate Shopify store
- Embed "Buy" buttons on your site
- They handle inventory, shipping, taxes
- Link from navbar: "Shop" → shop.lapista-atx.com

**Option B: Stripe Products (Medium)**
- Create products in Stripe Dashboard
- Build simple `store.html` page
- Use Stripe Checkout for purchases
- You handle fulfillment manually

**Option C: Full E-commerce (Complex)**
- Build product catalog in MongoDB
- Shopping cart functionality
- Inventory tracking
- Shipping integrations
- Not recommended unless you have specific needs

**Product Ideas:**
- [ ] Sticker packs ($5)
- [ ] T-shirts ($25)
- [ ] Jerseys ($45)
- [ ] Beanies ($20)
- [ ] Hats ($25)
- [ ] Scarves ($30)
- [ ] Water bottles ($15)

---

## Priority 3: User Experience Enhancements

### 3.1 Venue Photo/Video Carousel on Game Details
**Status:** 🔴 Not Started
**Effort:** 4-8 hours
**Location:** `game-details.html`, above or replacing the map section

**Implementation:**
```html
<!-- Add venue media carousel -->
<div class="mb-6">
  <h3 class="text-xs font-black text-zinc-400 uppercase tracking-widest font-display mb-3">
    Venue Photos
  </h3>
  <div class="relative overflow-hidden rounded-lg">
    <div id="venue-carousel" class="flex transition-transform duration-300 ease-out">
      <!-- Images injected by JS based on venue -->
    </div>
    <!-- Navigation dots -->
    <div id="carousel-dots" class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2"></div>
    <!-- Arrows -->
    <button onclick="prevSlide()" class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow">
      <span class="iconify" data-icon="lucide:chevron-left"></span>
    </button>
    <button onclick="nextSlide()" class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow">
      <span class="iconify" data-icon="lucide:chevron-right"></span>
    </button>
  </div>
</div>
```

**Venue Media Config (add to shared-constants.js):**
```javascript
venues: {
  shadyLane: {
    name: 'Shady Lane Soccer Fields',
    address: '3000 Shady Lane, Austin TX',
    mapsUrl: '...',
    media: [
      { type: 'image', src: '/venues/shady-lane-1.jpg', alt: 'Field view' },
      { type: 'image', src: '/venues/shady-lane-2.jpg', alt: 'Night lights' },
      { type: 'video', src: '/venues/shady-lane-clip.mp4', poster: '/venues/shady-lane-poster.jpg' }
    ]
  },
  // ... other venues
}
```

**Notes:**
- Create `/venues/` folder for media
- Optimize images (compress, use WebP)
- Videos should be short clips (10-15 sec max)
- Consider lazy loading for performance

---

### 3.2 Game Comments Section
**Status:** 🔴 Not Started (API exists!)
**Effort:** 4-6 hours
**Location:** `game-details.html`

**Current State:**
- Comment schema exists in `api/models.js`
- Endpoints exist: `GET/POST /api/games/:gameId/comments`
- Just needs frontend!

**Implementation:**
```html
<!-- Add comments section after game details -->
<section class="mt-12 pt-8 border-t border-zinc-200">
  <h3 class="text-xs font-black text-zinc-400 uppercase tracking-widest font-display mb-4">
    Discussion
    <span id="comment-count" class="text-zinc-300">(0)</span>
  </h3>

  <!-- Comment Form -->
  <form id="comment-form" class="mb-6">
    <div class="flex gap-3">
      <input type="text" id="comment-name" placeholder="Your name" required
             class="w-32 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2 text-sm">
      <input type="text" id="comment-text" placeholder="Say something..." required
             class="flex-1 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2 text-sm">
      <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-bold">
        Post
      </button>
    </div>
  </form>

  <!-- Comments List -->
  <div id="comments-list" class="space-y-4">
    <!-- Populated by JS -->
  </div>
</section>
```

```javascript
// Auto-refresh comments every 30 seconds
let commentInterval;

async function loadComments() {
  const res = await fetch(`${API_URL}/api/games/${gameId}/comments`);
  const comments = await res.json();
  renderComments(comments);
}

function startCommentRefresh() {
  loadComments();
  commentInterval = setInterval(loadComments, 30000); // 30 sec
}

// Clean up on page leave
window.addEventListener('beforeunload', () => clearInterval(commentInterval));
```

---

## Priority 4: Analytics & Marketing

### 4.1 Google Analytics + Meta Pixel with Cookie Consent
**Status:** 🔴 Not Started
**Effort:** 4-6 hours
**Files to modify:** All HTML pages (or create shared header)

**Implementation - Cookie Consent Banner:**
```html
<!-- Add before closing </body> tag on all pages -->
<div id="cookie-banner" class="fixed bottom-0 left-0 right-0 bg-zinc-900 text-white p-4 z-50 hidden">
  <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
    <p class="text-sm text-zinc-300">
      We use cookies to improve your experience and analyze site traffic.
    </p>
    <div class="flex gap-3">
      <button onclick="acceptCookies()" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded transition-all">
        Accept
      </button>
      <button onclick="declineCookies()" class="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-bold rounded transition-all">
        Decline
      </button>
    </div>
  </div>
</div>

<script>
// Cookie consent logic
function getCookieConsent() {
  return localStorage.getItem('cookieConsent');
}

function acceptCookies() {
  localStorage.setItem('cookieConsent', 'accepted');
  document.getElementById('cookie-banner').classList.add('hidden');
  loadAnalytics();
}

function declineCookies() {
  localStorage.setItem('cookieConsent', 'declined');
  document.getElementById('cookie-banner').classList.add('hidden');
}

function loadAnalytics() {
  // Google Analytics
  const gaScript = document.createElement('script');
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
  gaScript.async = true;
  document.head.appendChild(gaScript);

  gaScript.onload = () => {
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  };

  // Meta Pixel
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
}

// On page load
document.addEventListener('DOMContentLoaded', () => {
  const consent = getCookieConsent();
  if (consent === 'accepted') {
    loadAnalytics();
  } else if (consent === null) {
    document.getElementById('cookie-banner').classList.remove('hidden');
  }
});
</script>
```

**Track Key Events:**
```javascript
// Track RSVP completion (in game-details.html after successful booking)
if (typeof fbq !== 'undefined') {
  fbq('track', 'Purchase', {
    value: totalAmount,
    currency: 'USD',
    content_name: gameTitle
  });
}
if (typeof gtag !== 'undefined') {
  gtag('event', 'purchase', {
    transaction_id: confirmationCode,
    value: totalAmount,
    currency: 'USD'
  });
}
```

**Setup Required:**
1. Create Google Analytics 4 property → Get Measurement ID (G-XXXXXXXXXX)
2. Create Meta Business account → Create Pixel → Get Pixel ID
3. Replace placeholder IDs in code

---

## Priority 5: Future Expansion

### 5.1 SMS Reminders (Twilio)
**Status:** 🟡 Future
**Effort:** 1 day
**Use case:** Send reminder 2 hours before game

### 5.2 Referral Program
**Status:** 🟡 Future
**Effort:** 3-5 days
**Use case:** "Refer a friend, both get $2 off"

### 5.3 Mobile App (React Native)
**Status:** 🟡 Future
**Note:** The LaPista App project is a PWA that could be wrapped or rebuilt as native

### 5.4 Multi-City Expansion
**Status:** 🟡 Future
**Use case:** LaPista.DAL (Dallas), LaPista.HOU (Houston)

### 5.5 League/Tournament Mode
**Status:** 🟡 Future
**Use case:** Organized leagues with standings, playoffs

---

## Additional Recommendations (From Code Review)


### Operational Improvements

#### Error Tracking (Sentry)
**Status:** 🔴 Not Started
**Effort:** 2-3 hours
**Why:** Know when errors happen before users report them

```javascript
// Add to server.js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
app.use(Sentry.Handlers.requestHandler());
// ... routes ...
app.use(Sentry.Handlers.errorHandler());
```

#### Uptime Monitoring
**Status:** 🔴 Not Started
**Options:** UptimeRobot (free), Pingdom, Better Uptime
**Setup:** Monitor `https://lapista-atx.com/api/health`

#### Request Logging
**Status:** 🟡 Basic (console only)
**Improvement:** Add structured logging with Morgan + Winston

---

### UX Improvements

#### Loading States
- [ ] Add skeleton loaders instead of spinners
- [ ] Optimistic UI updates for better perceived performance

#### Form Improvements
- [ ] Save form progress to localStorage (recover on refresh)
- [ ] Better phone number formatting (auto-format as user types)
- [ ] Email validation with suggestions ("Did you mean gmail.com?")

#### Accessibility
- [ ] Add ARIA labels to interactive elements
- [ ] Ensure keyboard navigation works
- [ ] Test with screen reader
- [ ] Add skip-to-content link

---

## Implementation Order Recommendation

**Phase 1: Quick Wins (This Week)**
1. ✅ Add Facebook + TikTok social links
2. ✅ Add "Partnered with Sphere" section
3. ✅ Show full games even when full with waitlist option


**Phase 2: Revenue Features (Next 2 Weeks)**
1. Promo code system (Stripe integration)
2. Basic admin dashboard
3. Cookie consent + Analytics

**Phase 3: Engagement (Following Month)**
1. Venue photo carousel
2. Comments section
3. Error tracking (Sentry)

**Phase 4: Growth (Q2 2026)**
1. User accounts
2. Merch store
3. SMS reminders
4. Referral program
5. League / tournament mode
6. Adding more venues
7. Mobile app launch

---

## Security-Focused Implementation Plan

**Last Updated:** January 29, 2026

### Build vs Buy Decision

| Component | Decision | Service | Cost |
|-----------|----------|---------|------|
| User Authentication | **Build** (already exists) | - | $0 |
| Admin Authentication | **Build** | - | $0 |
| Session Storage | **Buy when scaling** | DO Managed Redis | $15/mo |
| Transactional Email | **Keep** | Resend | Pay-per-use |
| Payments | **Keep** | Stripe | 2.9% + $0.30 |
| SMS Reminders | **Buy when needed** | Twilio | Pay-per-use |
| Error Tracking | **Buy** | Sentry | Free tier |
| Analytics | **Buy** | GA4 + Meta Pixel | Free |

**Decision: No Supabase migration needed.** Current stack handles all requirements.

---

### Phase 1: Admin Dashboard (PRIORITY - Security Critical)

**Goal:** Secure admin interface for game management

#### 1.1 Backend: Session-Based Admin Auth
```
Location: api/server.js
```

**Requirements:**
- [ ] Create `/api/admin/login` endpoint with rate limiting (5 req/15 min)
- [ ] Generate cryptographically random session tokens (32+ bytes)
- [ ] Store sessions in memory with explicit expiration (4 hours)
- [ ] Bind sessions to IP address (log warning if IP changes)
- [ ] Create `/api/admin/logout` endpoint
- [ ] Add session cleanup on interval (every 15 min)
- [ ] Log all admin actions: timestamp, IP, endpoint, success/failure
- [ ] Never log tokens or secrets

**Session Storage Migration Path:**
```
Phase 1: In-memory Map (current scale)
Phase 2: DigitalOcean Managed Redis ($15/mo) when:
  - Multiple app instances needed
  - Deploys causing session loss becomes annoying
```

#### 1.2 Frontend: Admin Login Page
```
Location: admin.html (new file)
```

**Requirements:**
- [ ] Password input field (NOT URL query param)
- [ ] Store session token in `sessionStorage` (cleared on tab close)
- [ ] Auto-logout on token expiration
- [ ] Show login screen if no valid session

#### 1.3 Admin Dashboard Features
- [ ] View all games (upcoming, past, cancelled)
- [ ] Create/edit/cancel games
- [ ] View RSVPs per game with player details
- [ ] Quick stats: games this week, total RSVPs, revenue

**Security Checklist:**
- [ ] All admin endpoints use `adminAuth` middleware
- [ ] All admin endpoints use `adminLimiter` rate limiting
- [ ] Admin audit log captures all mutations
- [ ] No PII in logs (use user IDs, not emails)

---

### Phase 2: Promo Code System

**Goal:** Allow discount codes at checkout

#### 2.1 Simple Approach (Recommended)
```
Location: api/server.js (checkout endpoint)
```

**Implementation:**
- [ ] Add `allow_promotion_codes: true` to Stripe checkout session
- [ ] Done - Stripe handles validation, UI, and abuse prevention

**Do NOT build:**
- Custom `/api/validate-promo` endpoint (re-introduces enumeration risk)
- Custom promo code UI (Stripe's is better)

#### 2.2 If Custom Validation Needed Later
**Requirements (only if business requires):**
- [ ] Rate limit: 5 requests/minute per IP
- [ ] Generic error messages: "Invalid or expired code"
- [ ] Consistent response timing (200ms + random jitter)
- [ ] Never reveal if code exists but is expired vs doesn't exist

---

### Phase 3: Game Comments

**Goal:** Allow discussion on game pages

#### 3.1 Backend Security
```
Location: api/server.js
```

**Requirements:**
- [ ] Rate limit: 5 comments/minute per IP
- [ ] Input validation: name (50 chars), text (500 chars)
- [ ] Use sanitization library (DOMPurify or sanitize-html), NOT regex
- [ ] Validate gameId format before database query
- [ ] Don't store or display email unless user is authenticated

#### 3.2 Frontend Security
```
Location: game-details.html
```

**Requirements:**
- [ ] Render comments with `textContent`, NEVER `innerHTML`
- [ ] Add honeypot field for basic bot prevention
- [ ] Client-side length validation before submit

#### 3.3 Anti-Spam (Lightweight)
- [ ] Honeypot hidden field (bots fill it, humans don't)
- [ ] Minimum time between page load and submit (3 seconds)
- [ ] Consider requiring RSVP to comment (prevents drive-by spam)

---

### Phase 4: User Accounts & Login UI

**Goal:** Frontend for existing auth system

#### 4.1 Auth System Status
```
✅ Already implemented in api/server.js:
- POST /api/auth/register (bcrypt hashing)
- POST /api/auth/login (JWT tokens)
- User model with email, passwordHash
- authenticateToken middleware

❌ Missing:
- Frontend login/register pages
- Password reset flow
- Account settings page
```

#### 4.2 Implementation Tasks

**Frontend Pages:**
- [ ] Create `login.html` with email/password form
- [ ] Create `register.html` with registration form
- [ ] Create `my-account.html` for profile and RSVP history
- [ ] Add login state to navbar (show name or "Login" button)
- [ ] Store JWT in `localStorage` (or HttpOnly cookie if preferred)

**Password Reset Flow:**
- [ ] Create `/api/auth/forgot-password` endpoint
- [ ] Generate one-time token (expires in 1 hour)
- [ ] Send reset email via Resend
- [ ] Create `/api/auth/reset-password` endpoint
- [ ] Generic responses: "If email exists, reset link sent"
- [ ] Rate limit: 3 requests/hour per email

**Security Checklist:**
- [ ] bcrypt with 12+ rounds (already done)
- [ ] JWT secret rotation plan documented
- [ ] Session invalidation on password change
- [ ] Rate limit login attempts (already done: 10/15 min)

---

### Phase 5: SMS Reminders (Twilio)

**Goal:** Send game reminders 2 hours before

#### 5.1 Prerequisites
- [ ] Twilio account with verified phone number
- [ ] Environment variables: TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE

#### 5.2 Security Requirements

**Phone Number Storage:**
- [ ] Store phone numbers encrypted (AES-256), NOT hashed
- [ ] Hashing doesn't work if you need to display/confirm the number
- [ ] Encrypt with key from environment variable
- [ ] Decrypt only when sending SMS

**Anti-Abuse:**
- [ ] Only send to users with completed paid RSVPs
- [ ] Restrict to US phone numbers only (+1)
- [ ] Rate limit: 1 SMS per RSVP, 3 SMS requests/hour per IP
- [ ] Log SMS sends for abuse detection (without full phone number)

**Implementation:**
- [ ] Add phone field to RSVP form (optional)
- [ ] Create `/api/reminders/opt-in` endpoint
- [ ] Create cron job or scheduled task for reminders
- [ ] Include opt-out link in every SMS

---

### Phase 6: Referral Program

**Goal:** "Refer a friend, both get $2 off"

#### 6.1 Security Requirements

**Referral Code Generation:**
- [ ] Use cryptographically random codes (12+ chars)
- [ ] NOT sequential (REF001, REF002 = guessable)
- [ ] Format: `REF-` + 12 random alphanumeric chars

**Claim Validation:**
- [ ] Require referee to complete a paid RSVP first
- [ ] Verify referee identity via confirmation code, NOT free-form email
- [ ] Prevent self-referrals (compare normalized emails)
- [ ] One referral claim per referee (unique constraint)
- [ ] Rate limit claims: 10/hour per IP

**Fraud Prevention:**
- [ ] Both parties must have completed paid RSVPs
- [ ] Consider: same IP can't be both referrer and referee
- [ ] Consider: require different payment methods
- [ ] Log all referral claims for audit

---

### Infrastructure Additions (When Needed)

#### Redis for Session Storage
**When to add:** Multiple app instances OR deploy-caused session loss is problematic
**Service:** DigitalOcean Managed Redis ($15/mo)
**Implementation:**
```javascript
// Replace in-memory Map with Redis
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Store session
await redis.setex(`admin:${token}`, 14400, JSON.stringify(sessionData));

// Get session
const session = JSON.parse(await redis.get(`admin:${token}`));
```

#### Sentry for Error Tracking
**When to add:** Now (free tier is sufficient)
**Service:** Sentry (free tier: 5K errors/month)
**Implementation:**
```javascript
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
app.use(Sentry.Handlers.requestHandler());
// ... routes ...
app.use(Sentry.Handlers.errorHandler());
```

---

### Security Principles (Cross-Cutting)

1. **Consistent Error Messages**
   - Never reveal whether a resource exists
   - "Invalid credentials" not "User not found" vs "Wrong password"

2. **Rate Limiting on All Abuse-Prone Endpoints**
   - Auth: 10 req/15 min
   - Admin: 5 req/15 min
   - Comments: 5 req/min
   - SMS: 3 req/hour
   - Referral claims: 10 req/hour

3. **Input Validation**
   - Validate type (string, not object)
   - Validate length (max limits)
   - Sanitize before storage and display

4. **Logging**
   - Log security events: failed logins, rate limits, admin actions
   - Never log: passwords, tokens, full credit cards, full phone numbers
   - Use user IDs instead of emails where possible

5. **Secrets Management**
   - All secrets in environment variables
   - Document rotation schedule
   - Fail fast if required secrets missing in production

---

## Notes

- All time estimates assume single developer
- Backend changes require deployment to production server
- Test all payment-related changes in Stripe test mode first
- Keep mobile-first approach for all new UI
- Security assessment should be reviewed after each major feature

---

*Last reviewed: January 29, 2026*
