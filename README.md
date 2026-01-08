# LaPista.ATX - Pickup Soccer Platform

> Austin's premier pickup soccer scheduling platform. Weekly games at quality fields, all skill levels welcome.

![Version](https://img.shields.io/badge/version-1.0.0-green)
![Node](https://img.shields.io/badge/node-18+-blue)
![MongoDB](https://img.shields.io/badge/mongodb-atlas-green)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schemas](#database-schemas)
- [API Endpoints](#api-endpoints)
- [Frontend Pages](#frontend-pages)
- [Security Features](#security-features)
- [Features Overview](#features-overview)
- [Admin Operations](#admin-operations)
- [Deployment](#deployment)

---

## Overview

LaPista.ATX is a full-stack web application for managing pickup soccer games in Austin, TX. Players can:
- Browse upcoming games
- RSVP with guests
- Pay online (Stripe) or at the game
- Receive email confirmations
- Cancel bookings with automatic refunds
- Join waitlists for full games

---

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Express.js 5.x** | Web server framework |
| **MongoDB Atlas** | Cloud database |
| **Mongoose 8.x** | ODM for MongoDB |
| **Stripe** | Payment processing |
| **Resend** | Transactional emails |
| **Helmet.js** | Security headers & CSP |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Tailwind CSS** | Utility-first styling (CDN) |
| **Iconify** | Icon library |
| **QRCode.js** | QR code generation |
| **Vanilla JS** | No framework dependencies |

---

## Project Structure

```
LaPista Website - Production/
├── api/
│   ├── server.js          # Express server & all API routes
│   └── models.js          # Mongoose schemas
├── css/
│   └── styles.css         # Custom CSS (fonts, animations)
├── js/
│   └── config.js          # Shared frontend configuration
├── index.html             # Homepage with game listings
├── game-details.html      # RSVP form & game details
├── confirmation-page.html # Booking confirmation with QR
├── cancel.html            # Self-service cancellation
├── about-page.html        # About LaPista
├── faq-page.html          # Frequently asked questions
├── contact-page.html      # Contact form
├── terms.html             # Terms of service
├── waiver.html            # Liability waiver
├── package.json           # Node.js dependencies
├── .env                   # Environment variables (not in git)
├── README.md              # This file
└── TESTING.md             # Testing documentation
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Stripe account
- Resend account

### Installation

```bash
# Clone or navigate to project
cd "LaPista Website - Production"

# Install dependencies
npm install

# Create .env file (see Environment Variables section)
cp .env.example .env

# Seed database with sample games
curl -X POST http://localhost:3001/api/seed

# Start server
node api/server.js
```

Server runs at `http://localhost:3001`

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lapista

# Server
PORT=3001
FRONTEND_URL=http://localhost:3001

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_...

# Admin
ADMIN_SECRET_KEY=your-secure-admin-key-here
```

---

## Database Schemas

### Game
```javascript
{
  gameId: String,           // Unique ID (e.g., "LP-2025-001")
  title: String,            // "Sunday Pickup"
  venue: {
    name: String,           // "Shady Lane Fields"
    address: String,        // "1234 Shady Lane, Austin TX"
    mapsUrl: String         // Google Maps link
  },
  dayOfWeek: String,        // "Sunday"
  time: String,             // "6:00 PM"
  date: Date,               // ISO date
  price: Number,            // 5.99
  capacity: Number,         // 24
  spotsRemaining: Number,   // Dynamic: decrements on RSVP
  status: String            // "open" | "full" | "completed" | "cancelled"
}
```

### RSVP
```javascript
{
  gameId: String,           // References Game
  confirmationCode: String, // "LP-ABC123XYZ789" (cryptographic)
  player: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },
  guests: [{                // Up to 4 guests
    firstName: String,
    lastName: String
  }],
  totalPlayers: Number,     // 1-5
  totalAmount: Number,      // price × players
  paymentMethod: String,    // "online" | "cash"
  paymentStatus: String,    // "pending" | "paid" | "refunded"
  stripeSessionId: String,  // For online payments
  waiverAccepted: Boolean,
  waiverAcceptedAt: Date,   // Legal compliance
  waiverAcceptedIP: String, // Legal compliance
  status: String,           // "confirmed" | "cancelled"
  checkedIn: Boolean
}
```

### Waitlist
```javascript
{
  gameId: String,
  email: String,
  name: String,
  phone: String,
  notified: Boolean,        // True when spot opens
  notifiedAt: Date
}
```

### GameTemplate
```javascript
{
  name: String,             // "Sunday Evening Pickup"
  dayOfWeek: String,        // "Sunday"
  time: String,             // "6:00 PM"
  venue: { name, address, mapsUrl },
  price: Number,
  capacity: Number,
  isActive: Boolean
}
```

---

## API Endpoints

### Games

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/games` | List all open/scheduled games |
| `GET` | `/api/games/:gameId` | Get single game details |
| `POST` | `/api/seed` | Seed database with sample games |

### RSVPs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/rsvp` | Create RSVP (pay at game) |
| `GET` | `/api/rsvp/:code` | Get RSVP by confirmation code |
| `POST` | `/api/rsvp/:code/cancel` | Cancel booking (requires email verification) |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/checkout` | Create Stripe checkout session |
| `POST` | `/api/webhook` | Stripe webhook handler |

### Waitlist

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/waitlist` | Join waitlist for full game |
| `GET` | `/api/waitlist/:gameId` | Get waitlist count |

### Admin (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/templates` | List game templates |
| `POST` | `/api/templates` | Create game template |
| `POST` | `/api/games/generate-week` | Auto-generate games from templates |

> **Note:** Admin endpoints require `x-admin-key` header matching `ADMIN_SECRET_KEY` env var.

### Contact

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/contact` | Submit contact form |

---

## Frontend Pages

### Homepage (`index.html`)
- **Dynamic game listings** - Fetches from `/api/games`
- **Hot game indicators** - Shows games filling up fast
- **Spots counter** - Real-time availability
- **Loading states** - Spinner while fetching
- **Error handling** - Retry button on failure

### Game Details (`game-details.html`)
- **RSVP form** - Name, email, phone, guests
- **Guest management** - Add up to 4 guests dynamically
- **Payment selection** - Online (Stripe) or cash
- **Waiver acceptance** - Required checkbox
- **Waitlist form** - Shows when game is full
- **Real-time availability** - Progress bar

### Confirmation Page (`confirmation-page.html`)
- **Booking summary** - All reservation details
- **QR code** - Scannable confirmation URL
- **Add to calendar** - Button for calendar apps
- **Cancel link** - Self-service cancellation

### Cancellation Page (`cancel.html`)
- **Email verification** - Must confirm booking email
- **Booking preview** - Shows what will be cancelled
- **Refund notice** - Shows if eligible for refund
- **Success state** - Confirms cancellation

### Static Pages
| Page | Purpose |
|------|---------|
| `about-page.html` | About LaPista, mission, team |
| `faq-page.html` | Frequently asked questions |
| `contact-page.html` | Contact form |
| `terms.html` | Terms of service, privacy policy |
| `waiver.html` | Liability waiver text |

---

## Security Features

### 1. Input Sanitization
```javascript
const sanitize = (str) => str?.toString().trim().slice(0, 100);
```
All user inputs are trimmed and length-limited.

### 2. Rate Limiting
- **API routes**: 100 requests per 15 minutes per IP
- **RSVP endpoint**: 10 requests per hour per IP

### 3. Helmet.js Security Headers
- Content Security Policy (CSP)
- XSS Protection
- No Sniff
- Frame Options

### 4. CORS Configuration
```javascript
cors({ origin: process.env.FRONTEND_URL, credentials: true })
```

### 5. Cryptographic Confirmation Codes
```javascript
// 12-char code from 62-char alphabet = 3.2 quintillion combinations
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
```

### 6. Email Verification for Cancellations
- Must provide email used for original booking
- Case-insensitive comparison
- Prevents unauthorized cancellations

### 7. Waiver Compliance
- Tracks acceptance timestamp
- Records IP address
- Stores with RSVP record

### 8. Database Indexes
```javascript
rsvpSchema.index({ gameId: 1, 'player.email': 1 }); // Duplicate prevention
waitlistSchema.index({ gameId: 1, email: 1 }, { unique: true });
```

---

## Features Overview

### ✅ Core Features
- [x] Game listings with real-time availability
- [x] Online payment via Stripe
- [x] Pay-at-game option
- [x] Email confirmations (Resend)
- [x] Guest management (up to 4)
- [x] Waiver acceptance tracking

### ✅ Recently Added
- [x] **QR Code** on confirmation page
- [x] **Self-service cancellation** with email verification
- [x] **Waitlist** for full games with auto-notification
- [x] **Recurring game templates** for auto-generation
- [x] **Dynamic spot tracking** (database-driven)

### 🔮 Future Enhancements
- [ ] SMS reminders (Twilio)
- [ ] Check-in system with QR scanning
- [ ] Player profiles & game history
- [ ] Leaderboards & stats
- [ ] Multi-language support (Spanish)

---

## Admin Operations

### Create a Game Template
```bash
curl -X POST http://localhost:3001/api/templates \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d '{
    "name": "Sunday Evening Pickup",
    "dayOfWeek": "Sunday",
    "time": "6:00 PM",
    "venue": {
      "name": "Shady Lane Fields",
      "address": "1234 Shady Lane, Austin TX 78702",
      "mapsUrl": "https://maps.google.com/..."
    },
    "price": 5.99,
    "capacity": 24
  }'
```

### Generate Next Week's Games
```bash
curl -X POST http://localhost:3001/api/games/generate-week \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```

### Seed Sample Data
```bash
curl -X POST http://localhost:3001/api/seed
```

---

## Deployment

### Recommended: Railway / Render / Fly.io

1. **Connect GitHub repo** to hosting platform
2. **Set environment variables** in dashboard
3. **Configure build command**: `npm install`
4. **Configure start command**: `node api/server.js`
5. **Set up Stripe webhook** pointing to `/api/webhook`

### Production Checklist
- [ ] Switch to Stripe live keys
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Configure Resend domain verification
- [ ] Enable MongoDB Atlas IP whitelist (or allow all)
- [ ] Set up monitoring (e.g., Sentry, LogRocket)
- [ ] Configure SSL certificate
- [ ] Set up database backups

---

## Support

- **Email**: lapista.atx@gmail.com
- **Instagram**: [@lapista.atx](https://instagram.com/lapista.atx)
- **WhatsApp**: [Game Chat Group](https://chat.whatsapp.com/Gqkat9jvT1cAVURDjR9DqA)

---

## License

© 2025 LaPista.ATX. All rights reserved.
