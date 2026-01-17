# LaPista Production Setup Guide

## Overview

This document provides instructions for deploying the LaPista Website and App to production.

---

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   LaPista Website   │     │    LaPista App      │
│   (Production)      │     │    (Mobile PWA)     │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           └─────────────┬─────────────┘
                         │
              ┌──────────▼──────────┐
              │   Express.js API    │
              │   (api/server.js)   │
              └──────────┬──────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐    ┌─────▼─────┐    ┌─────▼─────┐
   │ MongoDB │    │  Stripe   │    │  Resend   │
   │   DB    │    │ Payments  │    │  Emails   │
   └─────────┘    └───────────┘    └───────────┘
```

---

## Environment Variables

Create a `.env` file in the `LaPista Website - Production` folder:

```bash
# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/lapista

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx

# Email (Resend)
RESEND_API_KEY=re_xxxx

# Application
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://lapista-atx.com
```

---

## Shared Constants

Both the Website and App use `js/shared-constants.js` for unified configuration:

### Key Values
| Setting | Value | Location |
|---------|-------|----------|
| Price per person | $5.99 | `LAPISTA.pricing.pricePerPerson` |
| Max guests | 4 | `LAPISTA.booking.maxGuests` |
| Game capacity | 24 | `LAPISTA.booking.capacity` |
| Brand email | support@lapista.atx | `LAPISTA.brand.email` |

### API Endpoints
The `LAPISTA.api.getBaseUrl()` function automatically detects the environment:
- **Development**: `http://localhost:3001`
- **Production**: `https://api.lapista-atx.com`

To update the production URL, edit `js/shared-constants.js`:
```javascript
getBaseUrl: function() {
    if (window.location.hostname === 'localhost') {
        return 'http://localhost:3001';
    }
    return 'https://api.lapista-atx.com'; // ← Update this
}
```

---

## API Endpoints Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games` | List all open/scheduled games |
| GET | `/api/games/:gameId` | Get single game details |
| POST | `/api/rsvp` | Create RSVP (cash payment) |
| POST | `/api/checkout` | Create Stripe checkout session |
| POST | `/api/contact` | Submit contact form |
| POST | `/api/waitlist` | Join game waitlist |

### Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhook` | Stripe webhook handler |

---

## Deployment Steps

### 1. Backend (Express API)

```bash
cd "LaPista Website - Production"

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with production values

# Start server (development)
npm run dev

# Start server (production)
npm start
```

### 2. Frontend (Static Files)

The frontend can be served:
- **From Express**: Static files are served automatically from the root
- **From CDN**: Deploy HTML/CSS/JS to Vercel, Netlify, or Cloudflare Pages

### 3. Mobile App (PWA)

The App is a Progressive Web App and can be:
- **Hosted separately**: Deploy to Vercel/Netlify with API URL configured
- **Added to home screen**: Users can install as a mobile app

---

## Database Setup (MongoDB)

### Collections

| Collection | Purpose |
|------------|---------|
| `games` | Game schedules and capacity |
| `rsvps` | Player reservations |
| `venues` | Field locations |
| `waitlists` | Waitlist entries |
| `gametemplates` | Recurring game templates |

### Initial Data

```javascript
// Create a test game
db.games.insertOne({
  gameId: 'game-001',
  title: 'Sunday Pickup',
  venue: {
    name: 'Shady Lane Fields',
    address: '1000 Shady Lane, Austin TX 78704',
    mapsUrl: 'https://maps.google.com/?q=...'
  },
  dayOfWeek: 'Sunday',
  time: '6:00 PM',
  date: new Date('2025-01-05'),
  price: 5.99,
  capacity: 24,
  spotsRemaining: 24,
  status: 'open'
});
```

---

## Stripe Setup

### 1. Configure Products

Create a product in Stripe Dashboard:
- **Name**: LaPista Game Entry
- **Price**: $5.99
- **Type**: One-time

### 2. Webhook Configuration

Add webhook endpoint in Stripe Dashboard:
- **URL**: `https://api.lapista-atx.com/api/webhook`
- **Events**: 
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

---

## Security Checklist

- [ ] Enable HTTPS on all domains
- [ ] Set secure CORS origins in production
- [ ] Configure rate limiting (already implemented)
- [ ] Enable Helmet.js security headers (already implemented)
- [ ] Validate all user inputs server-side (already implemented)
- [ ] Sanitize email inputs (already implemented)
- [ ] Use environment variables for secrets
- [ ] Enable MongoDB authentication
- [ ] Set up Stripe webhook signature verification

---

## Testing

### Local Testing

```bash
# Start backend
cd "LaPista Website - Production"
npm run dev

# In browser
open http://localhost:3001        # Website
open http://localhost:3001/api/games  # API check

# Test App (serve separately)
cd "LaPista App"
npx serve .
open http://localhost:3000        # App
```

### API Testing

```bash
# Get games
curl http://localhost:3001/api/games

# Create RSVP
curl -X POST http://localhost:3001/api/rsvp \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "game-001",
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phone": "512-555-1234",
    "guests": [],
    "waiverAccepted": true
  }'

# Submit contact form
curl -X POST http://localhost:3001/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Question",
    "message": "Test message"
  }'
```

---

## Monitoring

### Recommended Services

- **Error Tracking**: Sentry
- **Uptime Monitoring**: UptimeRobot or Pingdom
- **Log Management**: LogDNA or Papertrail
- **Performance**: New Relic or Datadog

### Health Check Endpoint

```bash
curl http://localhost:3001/api/health
# Returns: { "status": "ok", "timestamp": "..." }
```

---

## Support

- **Email**: support@lapista.atx
- **WhatsApp**: https://chat.whatsapp.com/Gqkat9jvT1cAVURDjR9DqA
- **Instagram**: https://instagram.com/lapista.atx
