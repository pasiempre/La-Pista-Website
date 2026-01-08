# LaPista.ATX - Testing Documentation

> Comprehensive testing strategy for the LaPista pickup soccer platform.

---

## 📋 Table of Contents

- [Testing Overview](#testing-overview)
- [Manual Testing Checklist](#manual-testing-checklist)
- [API Testing with cURL](#api-testing-with-curl)
- [Load & Stress Testing](#load--stress-testing)
- [Security Testing](#security-testing)
- [Integration Testing](#integration-testing)
- [Automated Test Setup](#automated-test-setup)
- [Monitoring & Alerts](#monitoring--alerts)

---

## Testing Overview

### Testing Levels

| Level | Purpose | Tools |
|-------|---------|-------|
| **Unit Testing** | Test individual functions | Jest |
| **Integration Testing** | Test API endpoints | Supertest, cURL |
| **Load Testing** | Test concurrent users | Artillery, k6 |
| **Stress Testing** | Find breaking points | Artillery |
| **Security Testing** | Find vulnerabilities | OWASP ZAP, manual |
| **E2E Testing** | Full user flows | Playwright |

---

## Manual Testing Checklist

### 🎮 Game Listings (Homepage)

- [ ] Games load on page load
- [ ] Loading spinner shows while fetching
- [ ] Error state shows if API fails
- [ ] "Try Again" button works
- [ ] Games sorted by date
- [ ] Hot game badge shows correctly
- [ ] Spots counter is accurate
- [ ] Full games show "FULL" badge
- [ ] Click game → navigates to details

### 📝 RSVP Flow (game-details.html)

- [ ] Game details load from API
- [ ] Form validates required fields
- [ ] Email format validation
- [ ] Phone format accepts various inputs
- [ ] Add guest button works
- [ ] Remove guest button works
- [ ] Guest limit (4) enforced
- [ ] No more guests when game nearly full
- [ ] Total price updates correctly
- [ ] Waiver checkbox required
- [ ] Pay Now → redirects to Stripe
- [ ] Pay at Game → creates RSVP directly
- [ ] Error messages display correctly

### ✅ Confirmation Page

- [ ] Loads booking from URL code
- [ ] Invalid code shows error
- [ ] QR code generates
- [ ] All details display correctly
- [ ] Guest list shows if applicable
- [ ] Add to Calendar works
- [ ] Share button works
- [ ] Cancel link goes to cancel page
- [ ] Maps link opens in new tab

### ❌ Cancellation Flow

- [ ] Loads booking from URL code
- [ ] Email verification required
- [ ] Wrong email shows error
- [ ] Correct email proceeds
- [ ] Confirmation message shows
- [ ] Refund message shows (if applicable)
- [ ] Cancelled booking can't be cancelled again
- [ ] Spots restored to game

### ⏳ Waitlist (Full Games)

- [ ] Waitlist form shows when game full
- [ ] RSVP form hidden when game full
- [ ] Waitlist submission works
- [ ] Duplicate email prevented
- [ ] Waitlist count displays
- [ ] Email notification on spot open (check logs)

### 📱 Mobile Responsiveness

- [ ] Homepage renders correctly
- [ ] Mobile menu opens/closes
- [ ] Game cards stack properly
- [ ] RSVP form usable on mobile
- [ ] Confirmation page readable
- [ ] Cancel page works on mobile

---

## API Testing with cURL

### Prerequisites
```bash
# Start the server
cd "LaPista Website - Production"
node api/server.js
```

### 1. Get All Games
```bash
curl http://localhost:3001/api/games | jq
```

**Expected:** Array of game objects with `spotsRemaining`

### 2. Get Single Game
```bash
curl http://localhost:3001/api/games/LP-2025-001 | jq
```

**Expected:** Single game object or 404

### 3. Create RSVP (Pay at Game)
```bash
curl -X POST http://localhost:3001/api/rsvp \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "LP-2025-001",
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phone": "512-555-1234",
    "waiverAccepted": true,
    "guests": []
  }' | jq
```

**Expected:** `{ confirmationCode: "LP-...", ... }`

### 4. Get RSVP by Code
```bash
curl http://localhost:3001/api/rsvp/LP-ABC123XYZ789 | jq
```

**Expected:** RSVP and game details

### 5. Cancel RSVP
```bash
curl -X POST http://localhost:3001/api/rsvp/LP-ABC123XYZ789/cancel \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}' | jq
```

**Expected:** `{ message: "Booking cancelled", ... }`

### 6. Join Waitlist
```bash
curl -X POST http://localhost:3001/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "LP-2025-001",
    "name": "Waitlist User",
    "email": "waitlist@example.com"
  }' | jq
```

**Expected:** `{ message: "Added to waitlist", ... }`

### 7. Get Waitlist Count
```bash
curl http://localhost:3001/api/waitlist/LP-2025-001 | jq
```

**Expected:** `{ count: 1 }`

### 8. Seed Database
```bash
curl -X POST http://localhost:3001/api/seed | jq
```

**Expected:** `{ message: "Database seeded", games: [...] }`

---

## Load & Stress Testing

### Install Artillery
```bash
npm install -g artillery
```

### Basic Load Test Config
Create `tests/load-test.yml`:

```yaml
config:
  target: "http://localhost:3001"
  phases:
    # Warm up
    - duration: 30
      arrivalRate: 5
      name: "Warm up"
    # Ramp up
    - duration: 60
      arrivalRate: 5
      rampTo: 50
      name: "Ramp up"
    # Sustained load
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    # Spike
    - duration: 30
      arrivalRate: 100
      name: "Spike"
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "Browse games"
    weight: 60
    flow:
      - get:
          url: "/api/games"
      - think: 2
      - get:
          url: "/api/games/LP-2025-001"
  
  - name: "Create RSVP"
    weight: 30
    flow:
      - post:
          url: "/api/rsvp"
          json:
            gameId: "LP-2025-001"
            firstName: "Load"
            lastName: "Test"
            email: "load{{ $randomNumber(1, 10000) }}@test.com"
            phone: "512-555-{{ $randomNumber(1000, 9999) }}"
            waiverAccepted: true
            guests: []
  
  - name: "Check waitlist"
    weight: 10
    flow:
      - get:
          url: "/api/waitlist/LP-2025-001"
```

### Run Load Test
```bash
artillery run tests/load-test.yml --output report.json
artillery report report.json
```

### Stress Test Config
Create `tests/stress-test.yml`:

```yaml
config:
  target: "http://localhost:3001"
  phases:
    # Extreme load - find breaking point
    - duration: 60
      arrivalRate: 100
      name: "Heavy load"
    - duration: 60
      arrivalRate: 200
      name: "Very heavy load"
    - duration: 60
      arrivalRate: 500
      name: "Extreme load"

scenarios:
  - name: "API stress"
    flow:
      - get:
          url: "/api/games"
      - post:
          url: "/api/rsvp"
          json:
            gameId: "LP-2025-001"
            firstName: "Stress"
            lastName: "Test"
            email: "stress{{ $randomNumber(1, 100000) }}@test.com"
            phone: "512-555-0000"
            waiverAccepted: true
            guests: []
```

### Run Stress Test
```bash
artillery run tests/stress-test.yml
```

### Expected Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Response Time (p95) | < 200ms | 200-500ms | > 500ms |
| Error Rate | < 0.1% | 0.1-1% | > 1% |
| Throughput | > 100 req/s | 50-100 req/s | < 50 req/s |

---

## Security Testing

### 1. Rate Limiting Test
```bash
# Should hit rate limit after ~100 requests
for i in {1..150}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/games
done | grep -c 429
```

**Expected:** Some 429 responses after 100 requests

### 2. SQL/NoSQL Injection
```bash
# These should be safely handled
curl -X POST http://localhost:3001/api/rsvp \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "LP-2025-001",
    "firstName": "{\"$gt\": \"\"}",
    "lastName": "Test",
    "email": "test@test.com",
    "phone": "512-555-1234",
    "waiverAccepted": true
  }'
```

**Expected:** 400 error or sanitized input

### 3. XSS Prevention
```bash
curl -X POST http://localhost:3001/api/rsvp \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "LP-2025-001",
    "firstName": "<script>alert(1)</script>",
    "lastName": "Test",
    "email": "test@test.com",
    "phone": "512-555-1234",
    "waiverAccepted": true
  }'
```

**Expected:** Input sanitized, no script execution

### 4. IDOR Test (Insecure Direct Object Reference)
```bash
# Try to access someone else's booking with wrong email
curl -X POST http://localhost:3001/api/rsvp/SOMEONE_ELSES_CODE/cancel \
  -H "Content-Type: application/json" \
  -d '{"email": "attacker@evil.com"}'
```

**Expected:** Error "Email does not match booking"

### 5. Admin Endpoint Protection
```bash
# Without admin key
curl -X POST http://localhost:3001/api/templates \
  -H "Content-Type: application/json" \
  -d '{"name": "Hack", "dayOfWeek": "Monday", "time": "6:00 PM"}'
```

**Expected:** 401 Unauthorized

### 6. CORS Test
```bash
curl -H "Origin: https://evil-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  http://localhost:3001/api/rsvp
```

**Expected:** No `Access-Control-Allow-Origin: https://evil-site.com`

---

## Integration Testing

### Test File Setup
Create `tests/integration.test.js`:

```javascript
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../api/server'); // Export app from server.js

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/games', () => {
    it('should return array of games', async () => {
      const res = await request(app).get('/api/games');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/rsvp', () => {
    it('should create RSVP with valid data', async () => {
      const res = await request(app)
        .post('/api/rsvp')
        .send({
          gameId: 'LP-2025-001',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '512-555-1234',
          waiverAccepted: true,
          guests: []
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.confirmationCode).toMatch(/^LP-/);
    });

    it('should reject RSVP without waiver', async () => {
      const res = await request(app)
        .post('/api/rsvp')
        .send({
          gameId: 'LP-2025-001',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '512-555-1234',
          waiverAccepted: false,
          guests: []
        });
      
      expect(res.statusCode).toBe(400);
    });

    it('should prevent duplicate RSVPs', async () => {
      // First RSVP
      await request(app)
        .post('/api/rsvp')
        .send({
          gameId: 'LP-2025-001',
          firstName: 'Dupe',
          lastName: 'Test',
          email: 'dupe@example.com',
          phone: '512-555-1234',
          waiverAccepted: true
        });

      // Second RSVP same email
      const res = await request(app)
        .post('/api/rsvp')
        .send({
          gameId: 'LP-2025-001',
          firstName: 'Dupe',
          lastName: 'Test',
          email: 'dupe@example.com',
          phone: '512-555-1234',
          waiverAccepted: true
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('already have');
    });
  });

  describe('Spots Tracking', () => {
    it('should decrement spots on RSVP', async () => {
      const beforeRes = await request(app).get('/api/games/LP-2025-001');
      const spotsBefore = beforeRes.body.spotsRemaining;

      await request(app)
        .post('/api/rsvp')
        .send({
          gameId: 'LP-2025-001',
          firstName: 'Spots',
          lastName: 'Test',
          email: `spots${Date.now()}@example.com`,
          phone: '512-555-1234',
          waiverAccepted: true
        });

      const afterRes = await request(app).get('/api/games/LP-2025-001');
      expect(afterRes.body.spotsRemaining).toBe(spotsBefore - 1);
    });
  });
});
```

### Run Integration Tests
```bash
npm install --save-dev jest supertest
npx jest tests/integration.test.js
```

---

## Automated Test Setup

### package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:load": "artillery run tests/load-test.yml",
    "test:stress": "artillery run tests/stress-test.yml",
    "test:security": "npx audit-ci --moderate"
  }
}
```

### Install Test Dependencies
```bash
npm install --save-dev jest supertest @types/jest
```

### Jest Config
Create `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['api/**/*.js'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

---

## Monitoring & Alerts

### Recommended Tools

| Tool | Purpose | Cost |
|------|---------|------|
| **UptimeRobot** | Uptime monitoring | Free tier |
| **Sentry** | Error tracking | Free tier |
| **LogRocket** | Session replay | Free tier |
| **MongoDB Atlas** | Database metrics | Included |
| **Stripe Dashboard** | Payment monitoring | Included |

### Health Check Endpoint
Add to `server.js`:

```javascript
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected'
  };
  
  try {
    await mongoose.connection.db.admin().ping();
  } catch {
    health.database = 'disconnected';
    health.status = 'unhealthy';
  }
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

### Monitoring Checklist

- [ ] Set up UptimeRobot to ping `/api/health` every 5 min
- [ ] Configure Sentry for error tracking
- [ ] Enable MongoDB Atlas alerts for:
  - High CPU usage (> 80%)
  - Low disk space (< 20%)
  - Connection count spike
- [ ] Set up Stripe webhook failure alerts
- [ ] Configure Resend bounce/complaint alerts

---

## Test Data Cleanup

### Reset Test Database
```bash
# Create reset script
cat > tests/reset-db.js << 'EOF'
const mongoose = require('mongoose');
require('dotenv').config();

async function reset() {
  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.db.dropDatabase();
  console.log('Database reset!');
  process.exit(0);
}

reset();
EOF

node tests/reset-db.js
```

### Re-seed After Tests
```bash
curl -X POST http://localhost:3001/api/seed
```

---

## CI/CD Integration

### GitHub Actions Example
Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
        env:
          MONGODB_URI: mongodb://localhost:27017/lapista-test
          STRIPE_SECRET_KEY: sk_test_xxx
          RESEND_API_KEY: re_test_xxx
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Summary

| Test Type | Frequency | Owner |
|-----------|-----------|-------|
| Manual QA | Before each release | QA |
| Unit Tests | On every commit | CI |
| Integration Tests | On every PR | CI |
| Load Tests | Weekly | DevOps |
| Security Audit | Monthly | Security |
| Penetration Test | Quarterly | External |

---

## Questions?

Contact: lapista.atx@gmail.com
