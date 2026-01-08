# LaPista Production TODO

> **Live Site**: https://lapista-atx-jd756.ondigitalocean.app/
> **Status**: 🟡 Near Production Ready

---

## 🔴 CRITICAL - External Integrations

### Stripe Webhook (Required for online payments)
- [ ] Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
- [ ] Click "Add endpoint"
- [ ] URL: `https://lapista-atx-jd756.ondigitalocean.app/api/webhook`
- [ ] Select event: `checkout.session.completed`
- [ ] Copy the **Signing secret** (starts with `whsec_`)
- [ ] Update in DigitalOcean → App Settings → Environment Variables → `STRIPE_WEBHOOK_SECRET`

### Resend Email Domain (Required for reliable email delivery)
- [ ] Go to [resend.com/domains](https://resend.com/domains)
- [ ] Add domain (e.g., `lapista.atx` or your actual domain)
- [ ] Add DNS records they provide
- [ ] Once verified, update `EMAIL_FROM` in DO environment variables

---

## 🟡 Database Content Updates

### Game Information
**Can be edited directly in MongoDB Atlas** → Collections → `games`

| Current Title | New Title (Example) | Fields to Update |
|---------------|---------------------|------------------|
| Sunday Pickup | Sunday Pickup | venue, time, description |
| Tuesday Night | Tuesday Night | venue, time, description |
| Thursday Night | North Austin 4v4 | title, venue, time, description |
| Friday Pickup | Friday Pickup | venue, time, description |

**How to edit in MongoDB Atlas:**
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Click your cluster → **Browse Collections**
3. Select `lapista` database → `games` collection
4. Click on a game document → **Edit Document**
5. Modify fields and click **Update**

### Game Schema Reference
```javascript
{
  gameId: "LP-001",
  title: "Sunday Pickup",           // ← Change this
  venue: {
    name: "Shady Lane Fields",      // ← Change this
    address: "757 Shady Ln...",     // ← Change this
    mapsUrl: "https://maps..."      // ← Change this
  },
  dayOfWeek: "Sunday",
  time: "8:00 PM",                  // ← Change this
  date: ISODate("2026-01-12"),
  price: 5.99,                      // ← Change this (affects new RSVPs)
  capacity: 24,                     // ← Change this
  spotsRemaining: 24,
  status: "open",
  // Optional fields to add:
  description: "Weekly pickup...",   // ← Add for "What to Expect"
  skillLevel: "all",                 // ← Add if needed (currently hardcoded in UI)
  format: "7v7"                      // ← Add if needed
}
```

### Price Changes
- **Easy**: Edit `price` field in MongoDB for each game
- **Note**: Price in `js/config.js` (`PRICE_PER_PERSON: 5.99`) is for display only
- **Server uses**: Database price for actual calculations

### Skill Level
- **Currently**: Hardcoded as "Open to All" in HTML
- **To make dynamic**: Would need to add `skillLevel` field to games and update HTML to read from API
- **Recommendation**: Keep hardcoded for now if all games are open to all

---

## 🟡 UI/Visual Updates

### Navbar
- [ ] **User count badge** - Shows "+84" currently
  - Option A: Make dynamic (query total RSVPs from database)
  - Option B: Remove if too complex
  - *Decision needed*

### Homepage Hero Section
- [ ] Add game photos to the image grid below "LaPista"
  - Edit `index.html` - look for the hero image section
  - Replace placeholder images with actual game photos

### "On the Pitch" Section
- [ ] Add videos
  - Edit `index.html` - find the "On the Pitch" section
  - Add video embeds or video files

### About Section (`about-page.html`)
- [ ] Add icons for Inclusivity, Access, Quality sections
  - Use Iconify icons: `<span class="iconify" data-icon="lucide:icon-name"></span>`
- [ ] Add photo of you and your brother to "Our Story"
  - Add image file to root folder
  - Reference in HTML: `<img src="/your-photo.jpg">`

### "What to Expect" Section
- [ ] Currently hardcoded in `game-details.html`
- [ ] To make per-game: Add `description` or `expectations` array to each game in MongoDB
- [ ] Update `game-details.html` to read from API response

### Ready to Play Background PNG
- **What it is**: A decorative noise/texture pattern applied via CSS
- **Location**: `css/styles.css` - look for `bg-noise` class
- **To reuse**: Add `bg-noise` class to any element
- **Or**: The green circle gradient - this is inline CSS, can be copied to other sections

---

## 🟢 HTML-Only Edits (No code changes needed)

### FAQ Page (`faq-page.html`)
- [ ] Edit question/answer content directly in HTML
- [ ] Find `<details>` or accordion elements
- [ ] Update text content

### Terms Page (`terms.html`)
- [ ] Review and update legal content

### Waiver Page (`waiver.html`)
- [ ] Review and update waiver content

---

## 🧪 Testing Checklist

### User Registration & Login
- [ ] Register new account
- [ ] Login with credentials
- [ ] Logout
- [ ] Password reset (if implemented)

### Game RSVP - Pay at Game
- [ ] Select a game
- [ ] Fill in player details
- [ ] Add 1 guest
- [ ] Add max guests (4)
- [ ] Select "Pay at Game"
- [ ] Submit RSVP
- [ ] Verify confirmation page shows
- [ ] Verify confirmation email received
- [ ] Verify QR code generates

### Game RSVP - Pay Online (Stripe)
- [ ] Select a game
- [ ] Fill in player details
- [ ] Select "Pay Online"
- [ ] Complete Stripe checkout (use test card: 4242 4242 4242 4242)
- [ ] Verify redirect to confirmation page
- [ ] Verify confirmation email received
- [ ] Verify payment appears in Stripe dashboard

### Cancellation Flow
- [ ] Go to confirmation page
- [ ] Click "Cancel Booking"
- [ ] Enter email to confirm
- [ ] Verify cancellation succeeds
- [ ] Verify spots returned to game
- [ ] Verify cancellation email received
- [ ] (For paid bookings) Verify refund initiated in Stripe

### Contact Form
- [ ] Fill out contact form on `contact-page.html`
- [ ] Submit
- [ ] Verify email received at lapista.atx@gmail.com

### Waitlist (when game is full)
- [ ] Manually set a game to 0 spots in MongoDB
- [ ] Try to RSVP
- [ ] Join waitlist
- [ ] Verify waitlist confirmation

### Mobile Responsiveness
- [ ] Test on iPhone
- [ ] Test on Android
- [ ] Test hamburger menu
- [ ] Test RSVP flow on mobile

---

## 📋 Environment Variables Checklist

| Variable | Status | Notes |
|----------|--------|-------|
| `MONGODB_URI` | ✅ Set | Connected |
| `STRIPE_SECRET_KEY` | ✅ Set | Live key |
| `STRIPE_PRODUCT_ID` | ✅ Set | |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Placeholder | **NEEDS REAL VALUE** |
| `RESEND_API_KEY` | ✅ Set | |
| `EMAIL_FROM` | ✅ Set | Needs domain verification |
| `JWT_SECRET` | ✅ Set | |
| `SEED_SECRET_KEY` | ✅ Set | |
| `ADMIN_SECRET_KEY` | ✅ Set | |
| `NODE_ENV` | ✅ Set | production |
| `PORT` | ✅ Set | 8080 |
| `FRONTEND_URL` | ⚠️ Check | Update to actual DO URL |

---

## 🚀 Pre-Launch Final Checklist

- [ ] All critical integrations working (Stripe webhook, Resend)
- [ ] Test complete RSVP → Payment → Confirmation → Cancel flow
- [ ] All game information updated in MongoDB
- [ ] All visual/content updates complete
- [ ] Mobile tested
- [ ] Contact form tested
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (auto with DO)
- [ ] Remove this TODO file before public launch

---

## 📝 Quick Reference Commands

**Seed fresh games (clears existing):**
```bash
curl -X POST "https://lapista-atx-jd756.ondigitalocean.app/api/seed" \
  -H "x-seed-key: 92a3b70aaf2fcfb38000677843e3b5fc4422b9be526ccb031d3f74483fee549e"
```

**Generate next week's games from templates:**
```bash
curl -X POST "https://lapista-atx-jd756.ondigitalocean.app/api/games/generate-week" \
  -H "x-admin-key: 2cdd575476ab36112c36f22180df1c788333de2497500ea164ea41c8ecad8012"
```

**Check API health:**
```bash
curl "https://lapista-atx-jd756.ondigitalocean.app/api/health"
```

---

*Last updated: January 8, 2026*
