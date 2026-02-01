# LaPista.ATX - Pickup Soccer Platform

> Austin's premier pickup soccer scheduling platform. Weekly games at quality fields, all skill levels welcome.

![Version](https://img.shields.io/badge/version-2.0.0-green)
![Node](https://img.shields.io/badge/node-18+-blue)
![MongoDB](https://img.shields.io/badge/mongodb-atlas-green)

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Design](#database-design)
- [API Endpoints](#api-endpoints)
- [Admin Dashboard](#admin-dashboard)
- [Frontend Pages](#frontend-pages)
- [Security Features](#security-features)
- [Features Overview](#features-overview)
- [Deployment](#deployment)

---

## Overview

LaPista.ATX is a full-stack web application for managing pickup soccer games in Austin, TX. Players can:
- Browse upcoming games
- RSVP with guests
- Pay online (Stripe) or via CashApp
- Use promo codes at checkout
- See who's already signed up
- Join game discussions
- Cancel bookings with automatic refunds
- Join waitlists for full games

Admins can:
- Create, edit, and cancel games
- Check-in players on game day
- Export rosters to CSV
- View stats and revenue

---

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Express.js 5.x** | Web server framework |
| **MongoDB Atlas** | Cloud database |
| **Mongoose 8.x** | ODM for MongoDB |
| **Stripe** | Payment processing + promo codes |
| **Resend** | Transactional emails |
| **Helmet.js** | Security headers & CSP |
| **express-rate-limit** | API rate limiting |
| **jsonwebtoken** | JWT authentication |
| **bcryptjs** | Password hashing |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Tailwind CSS** | Utility-first styling (CDN) |
| **Iconify** | Icon library |
| **QRCode.js** | QR code generation |
| **Vanilla JS** | No framework dependencies |

---

## Architecture

### MongoDB with Mongoose

We use **MongoDB Atlas** (cloud-hosted) with **Mongoose** as the ODM (Object Document Mapper).

**Connection:**
```javascript
mongoose.connect(process.env.MONGODB_URI)
```
The connection string is stored in environment variables. Mongoose handles connection pooling automatically.

**Schema Design Decisions:**

1. **Embedded Documents** - Venue data is embedded within Game documents (denormalized). Since venue info is always fetched with the game, this avoids extra lookups:
```javascript
const gameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  venue: {
    name: String,
    address: String,
    mapsUrl: String
  }
});
```

2. **String References** - RSVPs link to games via `gameId` string rather than ObjectId. This makes URLs cleaner (`LP-2030` vs `507f1f77bcf86cd799439011`) and simplifies frontend code.

3. **Indexes** - Added on frequently queried fields for performance:
```javascript
rsvpSchema.index({ gameId: 1, 'player.email': 1 }); // Fast duplicate checks
waitlistSchema.index({ gameId: 1, email: 1 }, { unique: true });
commentSchema.index({ gameId: 1 }); // Fast comment lookups
```

**Why MongoDB over SQL:**
- Flexible schema - easy to add fields without migrations
- JSON-native - matches API responses directly
- Great for this use case where relationships are simple
- Excellent cloud hosting with Atlas

---

## Project Structure

```
LaPista Website - Production/
├── api/
│   ├── server.js          # Express server & all API routes (~2400 lines)
│   └── models.js          # Mongoose schemas (Game, RSVP, User, Comment, etc.)
├── css/
│   └── styles.css         # Custom CSS (fonts, animations)
├── js/
│   ├── config.js          # Shared frontend configuration
│   ├── i18n.js            # Internationalization helper
│   └── translations.js    # EN/ES translations
├── scripts/
│   └── manage-games.js    # CLI tool for game management
├── index.html             # Homepage with game listings
├── game-details.html      # RSVP form, who's playing, comments
├── admin.html             # Admin dashboard (protected)
├── confirmation-page.html # Booking confirmation with QR
├── cancel.html            # Self-service cancellation
├── about-page.html        # About LaPista
├── faq-page.html          # Frequently asked questions
├── contact-page.html      # Contact form
├── terms.html             # Terms of service
├── waiver.html            # Liability waiver
├── package.json           # Node.js dependencies
├── .env                   # Environment variables (not in git)
└── README.md              # This file
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Stripe account
- Resend account (for emails)

### Installation

```bash
# Navigate to project
cd "LaPista Website - Production"

# Install dependencies
npm install

# Create .env file (see Environment Variables section)

# Start server
node -r dotenv/config api/server.js
```

Server runs at `http://localhost:3001`

### Quick Start URLs
- Homepage: http://localhost:3001
- Admin Dashboard: http://localhost:3001/admin.html
- Game Details: http://localhost:3001/game-details.html?id=LP-2030

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lapista

# Server
PORT=3001
FRONTEND_URL=http://localhost:3001
NODE_ENV=development

# Authentication
JWT_SECRET=your-jwt-secret-change-in-production

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_...

# Admin Dashboard
ADMIN_SECRET_KEY=your-secure-admin-password
```

**For Digital Ocean / Production:**
Add all these as environment variables in your app settings.

---

## Database Design

### Game Schema
```javascript
{
  gameId: String,           // "LP-2026-001" (human-readable)
  title: String,            // "Sunday Pickup"
  venue: {
    name: String,           // "Shady Lane Fields"
    address: String,        // "757 Shady Ln, Austin, TX 78702"
    mapsUrl: String         // Google Maps link
  },
  dayOfWeek: String,        // "Sunday"
  time: String,             // "8:00 PM"
  date: Date,               // ISO date
  price: Number,            // 5.99
  capacity: Number,         // 24
  spotsRemaining: Number,   // Decrements on RSVP
  status: String            // "open" | "full" | "completed" | "cancelled"
}
```

### RSVP Schema
```javascript
{
  gameId: String,           // References Game.gameId
  confirmationCode: String, // "LP-ABC123XYZ789" (cryptographic)
  player: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },
  guests: [{
    firstName: String,
    lastName: String
  }],
  totalPlayers: Number,     // 1-5
  totalAmount: Number,      // price × players
  paymentMethod: String,    // "online" | "cash" | "cashapp"
  paymentStatus: String,    // "pending" | "paid" | "refunded"
  stripeSessionId: String,
  waiverAccepted: Boolean,
  waiverAcceptedAt: Date,
  waiverAcceptedIP: String,
  status: String,           // "confirmed" | "cancelled"
  checkedIn: Boolean        // For game-day check-in
}
```

### Comment Schema
```javascript
{
  gameId: String,
  author: {
    name: String,
    email: String,          // Not exposed in API responses
    initials: String        // "JD" for John Doe
  },
  text: String,             // Max 500 chars
  createdAt: Date
}
```

### Other Schemas
- **User** - Full authentication with profiles, stats, skill levels
- **Waitlist** - Email notifications when spots open
- **GameTemplate** - Recurring game configurations
- **Rating** - Post-game ratings
- **Notification** - User notification system

---

## API Endpoints

### Public Game Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/games` | List all upcoming games |
| `GET` | `/api/games/:gameId` | Get single game details |
| `GET` | `/api/games/:gameId/players` | Get who's playing (names only) |
| `GET` | `/api/games/:gameId/comments` | Get game comments |
| `POST` | `/api/games/:gameId/comments` | Add a comment |

### RSVP Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/rsvp` | Create RSVP (pay at game / CashApp) |
| `POST` | `/api/checkout` | Create Stripe checkout (supports promo codes) |
| `GET` | `/api/rsvp/:code` | Get RSVP by confirmation code |
| `POST` | `/api/rsvp/:code/cancel` | Cancel booking (requires email) |

### Waitlist Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/waitlist` | Join waitlist for full game |
| `GET` | `/api/waitlist/:gameId` | Get waitlist count |

### Admin Session Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/login` | Login with ADMIN_SECRET_KEY |
| `POST` | `/api/admin/logout` | End admin session |
| `GET` | `/api/admin/verify` | Verify session is valid |

### Admin Dashboard Endpoints (Requires Session)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/stats` | Dashboard statistics |
| `GET` | `/api/admin/games` | All games (including past) |
| `POST` | `/api/admin/games` | Create new game |
| `PUT` | `/api/admin/games/:gameId` | Edit game |
| `PUT` | `/api/admin/games/:gameId/cancel` | Cancel game |
| `GET` | `/api/admin/games/:gameId/rsvps` | Get RSVPs for game |
| `GET` | `/api/admin/games/:gameId/waitlist` | Get waitlist for game |
| `PUT` | `/api/admin/rsvps/:rsvpId/checkin` | Toggle player check-in |

### Webhook

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webhook` | Stripe webhook handler |

---

## Admin Dashboard

Access at `/admin.html` with your `ADMIN_SECRET_KEY`.

### Features

**Games Tab:**
- View all games with status indicators
- Create new games with full form
- Edit existing games (title, date, time, venue, capacity)
- Cancel games with confirmation

**RSVPs Tab:**
- Select a game to view all RSVPs
- Check-in players with checkboxes
- See check-in progress counter
- Export roster to CSV for offline use
- View payment status and player details

### Session Security
- Token-based authentication (4-hour sessions)
- IP binding - session invalidates if IP changes
- Rate limited to 20 requests per 15 minutes
- Sessions stored in memory (not persistent across restarts)

---

## Frontend Pages

### Homepage (`index.html`)
- Dynamic game listings from API
- "X Games This Week" counter
- Hot game indicators (filling fast)
- Partner section with sponsor logos
- Spots remaining with progress bars

### Game Details (`game-details.html`)
- Full game information
- "What to Expect" section
- **RSVP Form** - moved up for better UX
- Guest management (up to 4)
- Payment options (Stripe / CashApp)
- **Who's Playing** - see other players signed up
- **Discussion** - game-specific comments
- Waitlist form (when full)

### Admin Dashboard (`admin.html`)
- Protected login screen
- Stats overview (games, RSVPs, revenue)
- Game management (CRUD)
- Player check-in system
- CSV export

### Other Pages
| Page | Purpose |
|------|---------|
| `confirmation-page.html` | QR code, booking details, calendar add |
| `cancel.html` | Self-service cancellation with email verification |
| `about-page.html` | About LaPista |
| `faq-page.html` | Frequently asked questions |
| `contact-page.html` | Contact form |

---

## Security Features

### 1. Rate Limiting
```javascript
apiLimiter: 100 requests / 15 min (general API)
rsvpLimiter: 10 requests / hour (RSVP creation)
adminLimiter: 20 requests / 15 min (admin endpoints)
commentLimiter: 5 requests / minute (spam prevention)
codeLookupLimiter: 10 requests / minute (confirmation lookups)
```

### 2. Input Validation & Sanitization
- All inputs trimmed and length-limited
- HTML entities escaped in comments
- Email normalization (lowercase, trimmed)
- Type validation on all fields

### 3. XSS Prevention
- DOM-based rendering with `textContent` (not innerHTML)
- `escapeHtml()` helper for any dynamic content
- Content Security Policy via Helmet.js

### 4. Authentication
- JWT for user accounts (7-day expiry)
- Session tokens for admin (4-hour expiry)
- IP binding on admin sessions
- Bcrypt password hashing

### 5. Static File Security
- Allowlist approach for file extensions
- Blocks access to `/api/*.js`, `.env`, `package.json`
- Denies dotfiles and sensitive directories

### 6. Database Security
- Indexes prevent duplicate RSVPs
- Confirmation codes are cryptographically random
- Email verified for cancellations

### 7. Payment Security
- Stripe handles all card data (PCI compliant)
- Webhook signature verification
- Refund eligibility checks

---

## Features Overview

### Core Features
- [x] Game listings with real-time availability
- [x] Online payment via Stripe
- [x] Promo codes at checkout
- [x] CashApp payment option
- [x] Email confirmations
- [x] Guest management (up to 4)
- [x] Waiver acceptance tracking
- [x] QR code confirmations
- [x] Self-service cancellation
- [x] Waitlist with notifications

### Social Features
- [x] "Who's Playing" section
- [x] Game discussion/comments
- [x] WhatsApp group integration

### Admin Features
- [x] Secure admin dashboard
- [x] Create/edit/cancel games
- [x] Player check-in system
- [x] CSV roster export
- [x] Revenue statistics

### Future Enhancements
- [ ] SMS reminders (Twilio)
- [ ] Email notifications to players
- [ ] Stripe refund integration
- [ ] Player profiles & history
- [ ] Multi-language support (Spanish)

---

## Deployment

### Digital Ocean App Platform

1. **Connect GitHub repo**
2. **Set environment variables** in App Settings
3. **Build command**: `npm install`
4. **Run command**: `node api/server.js`
5. **Configure Stripe webhook** to `https://yourdomain.com/api/webhook`

### Production Checklist
- [ ] Switch to Stripe live keys
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Set secure `ADMIN_SECRET_KEY`
- [ ] Set secure `JWT_SECRET`
- [ ] Configure Resend domain verification
- [ ] Enable MongoDB Atlas IP whitelist
- [ ] Set up monitoring

---

## Support

- **Email**: lapista.atx@gmail.com
- **Instagram**: [@lapista.atx](https://instagram.com/lapista.atx)
- **WhatsApp**: [Game Chat Group](https://chat.whatsapp.com/Gqkat9jvT1cAVURDjR9DqA)

---

## License

© 2026 LaPista.ATX. All rights reserved.
