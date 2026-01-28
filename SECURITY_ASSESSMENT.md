# LaPista.ATX Security Assessment & Testing Checklist

**Assessment Date:** January 26, 2026
**Last Updated:** January 28, 2026
**Codebase Version:** Production (main branch)
**Assessed By:** Security Review
**Approach:** Zero-cost hardening (no paid add-ons required)

---

## Executive Summary

This document provides a comprehensive security assessment of the LaPista.ATX website. It focuses on **practical, zero-cost security measures** appropriate for a small pickup soccer app with limited PII.

**Overall Risk Level:** LOW (all critical/high issues resolved)
**Critical Issues:** 0 ✅ (all fixed)
**High Priority Issues:** 0 ✅ (all fixed)
**Medium Priority Issues:** 2 (manual verification needed)

### Security Philosophy for This App

You do NOT need enterprise-grade infrastructure ($25/mo egress IPs) to be secure. For a small app with limited PII (names, emails, phone numbers), the following priorities matter most:

1. **Atlas auth + TLS** - Already enabled by default
2. **Least-privilege DB user** - Manual verification needed
3. **Disable/lock admin & seed routes in prod** - Code fix needed
4. **Rate-limit RSVP lookup + cancel endpoints** - Code fix needed
5. **Verify Stripe webhooks correctly** - Already implemented
6. **Avoid logging PII** - Review needed

This posture is **defensible and appropriate** for your scale.

### Risk Acceptance Statement

The absence of dedicated egress IPs ($25/month) is a **conscious risk acceptance** based on:
- Limited sensitivity of stored data (names, emails, phone numbers only)
- Compensating application-layer controls (TLS, auth, rate limiting)
- Current scale and revenue of the service
- Payment data handled entirely by Stripe (never touches our servers)

This decision will be revisited when revenue, data sensitivity, or compliance requirements change.

---

### Current Security Controls (Enforced)

The following controls **ARE** implemented and active:

| Control | Implementation | Status |
|---------|----------------|--------|
| TLS encryption | Atlas enforces TLS on all connections | ✅ ENFORCED |
| Database authentication | Username/password required for all queries | ✅ ENFORCED |
| Secrets encryption | All API keys stored in DigitalOcean encrypted env vars | ✅ ENFORCED |
| Password hashing | bcrypt with 12 rounds for user passwords | ✅ ENFORCED |
| Stripe webhook verification | `constructEvent()` validates all webhook signatures | ✅ ENFORCED |
| CORS restrictions | Production allows only `lapista-atx.com` origin | ✅ ENFORCED |
| Security headers | Helmet.js with custom CSP directives | ✅ ENFORCED |
| General rate limiting | 100 requests per 15 minutes per IP on all API routes | ✅ ENFORCED |
| RSVP rate limiting | 10 RSVPs per hour per IP | ✅ ENFORCED |
| Auth rate limiting | 10 login attempts per 15 minutes per IP | ✅ ENFORCED |
| Input sanitization | All user inputs trimmed and length-limited | ✅ ENFORCED |
| Duplicate RSVP prevention | Database checks prevent double-booking | ✅ ENFORCED |

### Controls Implemented (Previously Pending)

The following controls have been **IMPLEMENTED** as of January 26, 2026:

| Control | Implementation | Status |
|---------|----------------|--------|
| Seed route production gate | Returns 404 in production regardless of key | ✅ ENFORCED |
| Code lookup rate limiting | 10 requests per minute per IP | ✅ ENFORCED |
| Uniform error responses | Generic "Booking not found or email does not match" | ✅ ENFORCED |
| Admin route rate limiting | 5 requests per 15 minutes per IP | ✅ ENFORCED |
| JWT secret production guard | Server fails to start if JWT_SECRET missing | ✅ ENFORCED |
| Static file security | Blocks access to api/, node_modules/, .env, .git/ | ✅ ENFORCED |
| User RSVP endpoint auth | Requires JWT, uses authenticated email | ✅ ENFORCED |
| Notification endpoints auth | All endpoints require JWT or admin key | ✅ ENFORCED |
| PII logging removed | User IDs logged instead of emails | ✅ ENFORCED |

---

## Table of Contents

1. [Infrastructure Security (Atlas + DigitalOcean)](#1-infrastructure-security)
2. [Application Security Assessment](#2-application-security-assessment)
3. [Security Test Batches](#3-security-test-batches)
4. [TODO.md Security Review](#4-todomd-security-review)
5. [Monitoring & Logging Gaps](#5-monitoring--logging-gaps)
6. [Remediation Checklist](#6-remediation-checklist)
7. [Incident Response Procedure](#7-incident-response-procedure)

---

## 1. Infrastructure Security

### 1A. Atlas IP Access List

**Decision: Skip Dedicated Egress IPs for Now**

Dedicated egress IPs cost $25/month and provide IP-based allowlisting to Atlas. For a small app with limited PII, this is **optional** as long as you compensate with other controls.

| Approach | Cost | Security Level | When to Use |
|----------|------|----------------|-------------|
| 0.0.0.0/0 + strong auth | $0 | Acceptable | Small apps, limited PII, student/indie projects |
| Dedicated Egress IPs | $25/mo | Strongest | Higher revenue, admin dashboards, more data |

**Your Current Approach (Recommended):**

Since dedicated egress costs $25/mo out of pocket, keep Atlas open (0.0.0.0/0) but ensure:

1. ✅ **Strong database password** - Already using env var
2. ✅ **TLS required** - Atlas enforces this by default
3. ⚠️ **Least-privilege DB user** - Verify this (see 1B below)
4. ⚠️ **Lock admin/seed routes** - Code fix needed

**Why this is acceptable:**
- Atlas still requires username/password authentication
- All connections use TLS encryption
- Attackers would need to guess/steal your credentials
- Your credentials are stored in DigitalOcean's encrypted env vars

**When to upgrade:**
- When revenue justifies $25/mo
- When you add an admin dashboard
- When you store more sensitive data
- When you want "belt and suspenders" security

---

### 1B. Database User Least Privilege

| Requirement | Current State | Status |
|-------------|---------------|--------|
| Dedicated runtime user with minimal roles | **MANUAL CHECK REQUIRED** | ⚠️ VERIFY |
| No admin/root privileges for app user | **MANUAL CHECK REQUIRED** | ⚠️ VERIFY |
| Separate migration/admin user | **MANUAL CHECK REQUIRED** | ⚠️ VERIFY |

**Action Required:**
1. Log into MongoDB Atlas → Database Access
2. Verify the user in MONGODB_URI has ONLY these roles:
   - `readWrite` on `lapista` database (or your specific DB name)
3. Create separate admin user for migrations if needed
4. Document which user is which

**Recommended Atlas Custom Role:**
```json
{
  "roleName": "lapistaAppRole",
  "privileges": [
    {
      "resource": { "db": "lapista", "collection": "" },
      "actions": ["find", "insert", "update", "remove"]
    }
  ],
  "roles": []
}
```

---

### 1C. Atlas Auditing/Logging

| Requirement | Current State | Status |
|-------------|---------------|--------|
| Database auditing enabled (M10+) | **TIER DEPENDENT** | ⚠️ CHECK TIER |
| Activity tracking available | Atlas Activity Feed (all tiers) | ✅ AVAILABLE |

**Action Required:**
1. Check your Atlas tier (M10+ required for full auditing)
2. If M10+: Enable Database Auditing in Atlas → Advanced → Auditing
3. If M0-M5: Rely on Atlas Activity Feed + app-side logging

---

## 2. Application Security Assessment

### 2A. Admin Route Protection

**Current State Analysis (UPDATED January 26, 2026):**

| Route | Auth Required | Rate Limited | Env Gate | Status |
|-------|---------------|--------------|----------|--------|
| `POST /api/templates` | ✅ x-admin-key | ✅ adminLimiter | N/A | ✅ SECURED |
| `POST /api/games/generate-week` | ✅ x-admin-key | ✅ adminLimiter | N/A | ✅ SECURED |
| `POST /api/seed` | ✅ x-seed-key | ✅ apiLimiter | ✅ Disabled in prod | ✅ SECURED |
| `POST /api/notifications` | ✅ x-admin-key | ✅ adminLimiter | N/A | ✅ SECURED |
| `GET /api/templates` | ❌ PUBLIC | ✅ apiLimiter | N/A | ✅ ACCEPTABLE |

**RESOLVED - /api/seed:**
- Location: `api/server.js:1332-1337`
- Returns 404 in production regardless of valid key
- Only functions in development/staging environments

**Code Reference:**
```javascript
// api/server.js:1332-1337
app.post('/api/seed', async (req, res) => {
  // 🔒 SECURITY: Seed endpoint is DISABLED in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  // ... rest only runs in non-production
```

**All Fixes Applied:**
1. ✅ Production environment gate for seed endpoint
2. ✅ Dedicated rate limiter for admin routes (5 req/15 min)
3. ⏭️ IP allowlist for admin routes (optional - not implemented)
4. ⏭️ Structured admin access logging (optional - not implemented)

### Seed Route Hard Rule

> **POLICY:** Seed and data-initialization routes are disabled in production environments via environment gating and cannot be executed without explicit operator action.

After implementing the fix, the seed endpoint will:
- Return `404 Not Found` in production (regardless of valid key)
- Only function in development/staging environments
- Require both correct environment AND valid `x-seed-key` header

This eliminates the risk of accidental or malicious data deletion in production.

---

### 2B. RSVP Code Security

**Current State Analysis:**

| Protection | Implemented | Location | Status |
|------------|-------------|----------|--------|
| Cryptographic codes | ✅ crypto.randomBytes(12) | server.js:162-172 | ✅ GOOD |
| Code format | LP- + 12 chars (62^12 combinations) | server.js:162-172 | ✅ GOOD |
| General API rate limit | ✅ 100 req/15 min | server.js:67-71 | ⚠️ TOO LOOSE |
| Code lookup rate limit | ❌ Uses general limiter only | server.js:826 | 🔴 MISSING |
| Cancel endpoint rate limit | ❌ Uses general limiter only | server.js:909 | 🔴 MISSING |
| Uniform error responses | ⚠️ Different messages for exists vs not | - | ⚠️ PARTIAL |

**Information Leakage Found:**

1. **Duplicate RSVP reveals confirmation code:**
   ```javascript
   // server.js:557-562
   if (existingRSVP) {
     return res.status(400).json({
       error: 'You have already RSVP\'d for this game',
       confirmationCode: existingRSVP.confirmationCode  // LEAKS CODE
     });
   }
   ```

2. **Cancel endpoint reveals email mismatch:**
   ```javascript
   // server.js:936-938
   if (rsvp.player.email.toLowerCase() !== email.toLowerCase()) {
     return res.status(403).json({ error: 'Email does not match booking' });
   }
   ```
   This confirms the code exists but email is wrong - enables enumeration.

**Required Fixes:**
1. Add dedicated rate limiter for code lookup (10 req/min per IP)
2. Add dedicated rate limiter for cancel (5 req/min per IP)
3. Implement failed attempts throttle (ban after 10 failures)
4. Standardize error responses to not reveal whether code exists

### Enumeration Mitigation Policy

> **POLICY:** After implementing the fixes above, RSVP lookup and cancellation endpoints will return uniform error responses regardless of whether a confirmation code exists, preventing enumeration through response inspection or timing analysis.

Target behavior:
- Invalid code → `404: "Booking not found or email does not match"`
- Valid code, wrong email → `404: "Booking not found or email does not match"`
- Both responses have identical structure, status code, and similar timing

This prevents attackers from determining whether a confirmation code exists in the system.

---

### 2C. Input Validation & NoSQL Injection

**Current State Analysis:**

| Protection | Implemented | Status |
|------------|-------------|--------|
| Input sanitization function | ✅ `sanitize()` trims/slices | ✅ GOOD |
| Email validation regex | ✅ Basic format check | ✅ GOOD |
| Guest limit enforcement | ✅ Server-side (max 4) | ✅ GOOD |
| Mongoose schema validation | ✅ Enums, required fields | ✅ GOOD |
| Mongoose strict mode | ✅ Default (true) | ✅ GOOD |
| NoSQL operator rejection | ❌ NOT IMPLEMENTED | 🔴 MISSING |
| Unknown field rejection | ⚠️ Mongoose ignores by default | ⚠️ PARTIAL |

**Vulnerability - NoSQL Injection:**

The current sanitization does NOT prevent NoSQL injection via object payloads:

```javascript
// server.js:546 - gameId passed directly to query
const game = await Game.findOne({ gameId: sanitize(gameId) });

// If gameId = { "$ne": "" }, sanitize() won't help because:
// sanitize() expects a string and calls .toString() which produces "[object Object]"
// However, if body parsing occurs before sanitize, the object could reach the query
```

**Better but still vulnerable pattern found:**
```javascript
// server.js:552-556
const existingRSVP = await RSVP.findOne({
  gameId: sanitize(gameId),  // OK - sanitized
  'player.email': sanitizedEmail,  // OK - sanitized
  status: { $ne: 'cancelled' }  // OK - hardcoded operator
});
```

**Risk Assessment:** LOW-MEDIUM
- The `sanitize()` function's `.toString()` call would convert objects to strings
- However, this is not a robust defense pattern

**Required Fixes:**
1. Add explicit type checking before database queries
2. Use a validation library (Joi, Zod, or express-validator)
3. Add middleware to reject requests with object/array values where strings expected

---

### 2D. Stripe Webhook Security

**Current State Analysis:**

| Protection | Implemented | Location | Status |
|------------|-------------|----------|--------|
| Signature verification | ✅ constructEvent() | server.js:740-744 | ✅ GOOD |
| Raw body parsing | ✅ express.raw() | server.js:735 | ✅ GOOD |
| Skip JSON parsing for webhook | ✅ Conditional middleware | server.js:141-147 | ✅ GOOD |
| Duplicate RSVP prevention | ✅ Check confirmationCode + sessionId | server.js:764-773 | ✅ GOOD |
| Event ID deduplication | ❌ NOT IMPLEMENTED | - | ⚠️ MISSING |

**Gap - Event ID Storage:**
The current implementation checks for duplicate RSVPs but doesn't store processed Stripe event IDs. While the confirmationCode/sessionId check provides good protection, storing event IDs is a defense-in-depth measure.

**Code Reference:**
```javascript
// server.js:764-773 - Current duplicate check (GOOD)
const existingRSVP = await RSVP.findOne({
  $or: [
    { confirmationCode: metadata.confirmationCode },
    { stripeSessionId: session.id }
  ]
});
if (existingRSVP) {
  console.log('⚠️ Duplicate webhook detected...');
  return res.json({ received: true, duplicate: true });
}
```

**Status:** ✅ ACCEPTABLE (current implementation prevents duplicate RSVPs effectively)

---

### 2E. User Data Endpoints

**Current State Analysis (UPDATED January 26, 2026):**

| Endpoint | Auth Required | PII Exposed | Status |
|----------|---------------|-------------|--------|
| `GET /api/user/rsvps` | ✅ JWT Required | Own RSVPs only | ✅ SECURED |
| `GET /api/notifications` | ✅ JWT Required | Own notifications only | ✅ SECURED |
| `POST /api/notifications` | ✅ Admin Key | N/A (admin only) | ✅ SECURED |
| `PATCH /api/notifications/:id/read` | ✅ JWT + Ownership | Own notifications only | ✅ SECURED |
| `DELETE /api/notifications/clear` | ✅ JWT Required | Own notifications only | ✅ SECURED |
| `GET /api/notifications/count` | ✅ JWT Required | Own count only | ✅ SECURED |
| `GET /api/user/stats?email=` | ❌ NO | User statistics | ⚠️ MEDIUM |
| `GET /api/games/:gameId/rsvps` | ❌ NO | First/Last names only | ✅ ACCEPTABLE |

**RESOLVED - Email-based PII Access:**

All user data endpoints now require JWT authentication and use `req.user.email` instead of query parameters, preventing users from accessing others' data.

---

## 3. Security Test Batches

### Batch 1: Database Security (Monthly)

> **Note:** Since you're not using dedicated egress IPs ($25/mo), focus on these compensating controls instead.

#### Test 1.1: Atlas Authentication Strength
```bash
# MANUAL CHECK IN ATLAS CONSOLE
# Navigate to: Atlas → Database Access → Your App User

# VERIFY:
# - Password is 20+ characters (auto-generated is fine)
# - Password is stored ONLY in DigitalOcean env vars
# - Password is NOT in any code files or git history

# To check git history for leaks:
git log -p --all | grep -i "mongodb" | head -20
# Should return nothing or only MONGODB_URI variable name
```

#### Test 1.2: DB User Privilege Audit (CRITICAL)
```bash
# MANUAL TEST IN ATLAS CONSOLE
# Navigate to: Atlas → Database Access → Your App User

# PASS CONDITIONS:
# - User has ONLY "readWrite" on your specific database
# - No atlasAdmin, dbAdmin, userAdmin, or clusterAdmin roles
# - "Authentication Database" shows your DB name (not "admin")

# FAIL CONDITIONS:
# - User has any admin role
# - User can access databases other than lapista
```

#### Test 1.3: TLS Enforcement (Default - Just Verify)
```bash
# Atlas enforces TLS by default, but verify your connection string:
# Your MONGODB_URI should contain: mongodb+srv:// (not mongodb://)
# The +srv protocol enforces TLS automatically

# PASS: Connection string uses mongodb+srv://
# FAIL: Connection string uses mongodb:// without TLS options
```

---

### Batch 2: Endpoint Authorization (Every Release)

#### Test 2.1: Admin Endpoints Require Key
```bash
# Test without admin key - all should return 403
curl -X POST https://lapista-atx.com/api/templates \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}'
# EXPECTED: {"error":"Unauthorized"} with status 403

curl -X POST https://lapista-atx.com/api/games/generate-week
# EXPECTED: {"error":"Unauthorized"} with status 403

curl -X POST https://lapista-atx.com/api/seed
# EXPECTED: {"error":"Unauthorized. Seed key required."} with status 403

# Test with wrong key
curl -X POST https://lapista-atx.com/api/templates \
  -H "x-admin-key: wrongkey" \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}'
# EXPECTED: {"error":"Unauthorized"} with status 403

# PASS: All return 403 without valid key
# FAIL: Any returns 200 or modifies data
```

#### Test 2.2: Seed Endpoint Disabled in Production
```bash
# THIS IS CRITICAL - seed can delete all data
# After implementing env gate, test:

curl -X POST https://lapista-atx.com/api/seed \
  -H "x-seed-key: YOUR_SEED_KEY"
# EXPECTED: 404 or {"error":"Seed disabled in production"}

# PASS: Returns 404 or "disabled" message
# FAIL: Returns {"success": true} or modifies database
```

---

### Batch 3: RSVP Brute-Force Resistance (Every Release)

#### Test 3.1: Code Lookup Doesn't Leak Info
```bash
# Test with random code
curl https://lapista-atx.com/api/rsvp/RANDOMCODE123

# EXPECTED: {"error":"RSVP not found"} with status 404
# Should NOT reveal if code format is valid/invalid

# Test with valid format but non-existent
curl https://lapista-atx.com/api/rsvp/LP-AAAAAAAAAA

# EXPECTED: Same generic error as above
# PASS: Identical response for all invalid codes
# FAIL: Different messages based on code validity
```

#### Test 3.2: Rate Limiting on Lookup
```bash
# Run 50 rapid requests
for i in {1..50}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://lapista-atx.com/api/rsvp/LP-TEST$i
done | sort | uniq -c

# EXPECTED: Some 429 responses after hitting limit
# PASS: Starts returning 429 after threshold
# FAIL: All 50 return 404 (no rate limiting)
```

#### Test 3.3: Cancel Endpoint Rate Limit
```bash
# Assuming you have a valid code LP-VALIDCODE
for i in {1..20}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://lapista-atx.com/api/rsvp/LP-VALIDCODE/cancel \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@email.com"}'
done | sort | uniq -c

# EXPECTED: 429 responses after threshold
# PASS: Rate limited after N attempts
# FAIL: Unlimited 403 responses allowed
```

#### Test 3.4: Email Enumeration Prevention
```bash
# Test cancel with wrong email
curl -X POST https://lapista-atx.com/api/rsvp/LP-VALIDCODE/cancel \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@email.com"}'

# Test cancel with non-existent code
curl -X POST https://lapista-atx.com/api/rsvp/LP-DOESNTEXIST/cancel \
  -H "Content-Type: application/json" \
  -d '{"email":"any@email.com"}'

# PASS: Both return same generic error, same timing
# FAIL: Different messages reveal code existence
```

---

### Batch 4: Injection & Mass Assignment (Every Release)

#### Test 4.1: NoSQL Injection Probes
```bash
# Test object injection in email field
curl -X POST https://lapista-atx.com/api/rsvp \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "LP-001",
    "firstName": "Test",
    "lastName": "User",
    "email": {"$ne": ""},
    "waiverAccepted": true
  }'
# EXPECTED: Validation error or "Invalid email format"

# Test operator injection in gameId
curl -X POST https://lapista-atx.com/api/rsvp \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": {"$gt": ""},
    "firstName": "Test",
    "lastName": "User",
    "email": "test@test.com",
    "waiverAccepted": true
  }'
# EXPECTED: Validation error or "Game not found"

# PASS: All return validation errors
# FAIL: Query succeeds or behaves unexpectedly
```

#### Test 4.2: Mass Assignment
```bash
# Try to inject admin fields
curl -X POST https://lapista-atx.com/api/rsvp \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "LP-001",
    "firstName": "Test",
    "lastName": "User",
    "email": "test@test.com",
    "waiverAccepted": true,
    "paymentStatus": "paid",
    "status": "confirmed",
    "totalAmount": 0,
    "isAdmin": true
  }'

# Then verify the RSVP doesn't have injected values
curl https://lapista-atx.com/api/rsvp/RETURNED_CODE

# PASS: paymentStatus="pending", totalAmount=correct price
# FAIL: Injected values persisted
```

---

### Batch 5: Stripe Webhook Integrity (Every Release)

#### Test 5.1: Fake Webhook Rejected
```bash
# Send webhook without signature
curl -X POST https://lapista-atx.com/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed","data":{"object":{}}}'
# EXPECTED: 400 with "Webhook Error" message

# Send with fake signature
curl -X POST https://lapista-atx.com/api/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: fake_signature" \
  -d '{"type":"checkout.session.completed","data":{"object":{}}}'
# EXPECTED: 400 with signature verification failed

# PASS: All return 400, no data modified
# FAIL: Returns 200 or creates RSVP
```

#### Test 5.2: Replay Protection
```bash
# Use Stripe CLI to replay a real event
stripe events resend evt_XXXXX --webhook-endpoint=whep_XXXXX

# Check database for duplicate RSVPs
# PASS: Only one RSVP exists, second replay ignored
# FAIL: Duplicate RSVPs created
```

---

### Batch 6: Secrets & Logs (Monthly)

#### Test 6.1: Secret Leak Scan
```bash
# Scan repository for secrets
cd "/Users/hc/Documents/projects/LaPista Website - Production"

# Check for API keys in code
grep -r "sk_live\|sk_test\|whsec_\|re_\|mongodb\+srv" --include="*.js" --include="*.html" .

# Check git history for secrets
git log -p | grep -i "secret\|password\|api.key" | head -50

# Check if .env is tracked
git ls-files | grep -E "^\.env"

# PASS: No matches (secrets only in .env, .env not tracked)
# FAIL: Any secret patterns found in code or git history
```

**Current Status:**
- `.env` is in `.gitignore` ✅
- No secrets found in tracked files ✅

#### Test 6.2: PII Logging Check
```bash
# Review console.log statements for PII
grep -n "console.log\|console.error" api/server.js | head -30

# Check what gets logged on errors
# Search for patterns that might log request body
grep -n "req.body\|email\|phone" api/server.js | grep -i "log\|error"
```

**Current Findings:**
- `server.js:614`: Logs "RSVP error" but not the request body ✅
- `server.js:813`: Logs email address in confirmation ⚠️
- `server.js:1001-1002`: Logs confirmation code ✅

**Recommendation:** Review log statements to ensure PII is not logged verbatim.

---

## 4. TODO.md Security Review

### Features with Security Implications

| Feature | Section | Security Concern | Risk | Recommendation |
|---------|---------|------------------|------|----------------|
| Admin Dashboard | 2.2 | Admin key in URL query param | HIGH | Use session-based auth or header-based auth only |
| Promo Code System | 2.1 | Promo code enumeration | MEDIUM | Rate limit validation endpoint |
| User Accounts | 2.3 | Password reset, session management | MEDIUM | Implement proper email verification, secure reset tokens |
| Google Analytics | 4.1 | Cookie consent compliance | LOW | Ensure GDPR/CCPA compliant consent flow |
| Comments Section | 3.2 | XSS via comment text | MEDIUM | Already limited to 500 chars, ensure HTML encoding on display |
| SMS Reminders (Twilio) | 5.1 | Phone number storage/transmission | MEDIUM | Ensure TLS, don't log phone numbers |
| Referral Program | 5.2 | Referral code abuse | LOW | Rate limit referral claims |

### Admin Dashboard Security Warning (TODO.md Section 2.2)

The proposed implementation has a critical security flaw:

```javascript
// INSECURE - From TODO.md
const ADMIN_KEY = new URLSearchParams(window.location.search).get('key');
// URL: https://lapista-atx.com/admin.html?key=YOUR_ADMIN_SECRET
```

**Problems:**
1. Key exposed in browser history
2. Key exposed in server access logs
3. Key may be shared accidentally via copy/paste
4. No session expiry

**Recommended Implementation:**
```javascript
// SECURE - Use localStorage after initial auth
// 1. Admin enters key in password field (not URL)
// 2. Validate key against backend
// 3. Store session token (not the key) in localStorage
// 4. Session expires after inactivity

// admin-auth.js
async function authenticate(key) {
  const res = await fetch('/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key })
  });
  if (res.ok) {
    const { token } = await res.json();
    sessionStorage.setItem('adminToken', token);
    return true;
  }
  return false;
}
```

---

## 5. Monitoring & Logging Gaps

### Logging Scope Definition

> **POLICY:** Logs capture operational data necessary for debugging and security monitoring, but explicitly exclude personally identifiable information.

**What IS Logged:**
- Request timestamps and HTTP methods
- Endpoint paths (e.g., `/api/rsvp`, `/api/checkout`)
- Response status codes (200, 400, 404, 500, etc.)
- Error classifications (e.g., "validation error", "not found")
- Rate limit triggers (IP address only for abuse detection)
- Stripe event types and processing status
- Confirmation codes (non-PII identifiers)

**What IS NOT Logged:**
- Email addresses
- Phone numbers
- Full names
- Request bodies containing user-submitted data
- Payment details (handled by Stripe)
- IP addresses in routine operations (only for security events)

This policy ensures compliance with data minimization principles while maintaining operational visibility.

### Required Logging (Not Currently Implemented)

| Event | Current State | Required Action |
|-------|---------------|-----------------|
| Admin endpoint access | ❌ Not logged | Add logging with IP, timestamp, success/fail |
| Rate limit triggers | ❌ Not logged | Configure rate-limit logger |
| Webhook verification failures | ✅ console.error | Enhance with structured logging |
| RSVP lookup failures | ❌ Not logged | Add counter/logging for abuse detection |
| Auth failures | ❌ Not logged | Add logging with IP for brute-force detection |

### Recommended Logging Implementation

```javascript
// Add to server.js - structured logging
const securityLog = (event, details) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
    ip: details.ip || 'unknown'
  };
  console.log('SECURITY:', JSON.stringify(logEntry));
  // Future: Send to log aggregation service
};

// Usage examples:
// securityLog('ADMIN_ACCESS', { endpoint: '/api/seed', ip: req.ip, success: false });
// securityLog('RATE_LIMIT', { endpoint: '/api/rsvp', ip: req.ip });
// securityLog('WEBHOOK_FAIL', { reason: 'invalid signature', ip: req.ip });
```

### Recommended Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| Invalid RSVP code lookups | >50/hour from single IP | Temporary IP ban |
| Webhook failures | >5/hour | Page on-call |
| Admin auth failures | >3/hour | Alert admin |
| Rate limit hits | >100/hour from single IP | Review for abuse |

---

## 6. Remediation Checklist (Zero-Cost Focus)

All items below are **code changes only** - no paid services required.

### Critical (COMPLETED ✅)

- [x] **1. Add environment gate for seed endpoint** ✅ DONE
  - Server returns 404 in production regardless of valid key
  - Location: `api/server.js:1335-1337`

- [x] **2. Stop leaking confirmation codes in duplicate error** ✅ DONE
  - Returns generic message directing user to check email
  - Locations: `api/server.js:571-575` and `api/server.js:671-675`

- [x] **3. JWT secret production guard** ✅ DONE (Added Jan 26, 2026)
  - Server fails fast if JWT_SECRET is missing in production
  - Location: `api/server.js:104-107`

- [x] **4. Static file security** ✅ DONE (Added Jan 26, 2026, Updated Jan 28, 2026)
  - Allowlist approach: only serves files with permitted extensions (.html, .css, .js, .pdf, images, videos, fonts, manifest.json)
  - Explicitly blocks: package.json, README.md, TODO.md, SECURITY_ASSESSMENT.md, PRODUCTION_SETUP.md, TESTING.md
  - Blocks directories: /api/, /node_modules/, /scripts/, /.git/, /.claude/
  - Blocks ALL files with extensions in /api/ directory (not just specific types)
  - Uses `dotfiles: 'deny'` as additional protection
  - Location: `api/server.js:168-251`

- [x] **5. User RSVP endpoint authentication** ✅ DONE (Added Jan 26, 2026)
  - Requires JWT, uses `req.user.email` not query param
  - Location: `api/server.js:517-520`

- [x] **6. Notification endpoints authentication** ✅ DONE (Added Jan 26, 2026)
  - All endpoints require JWT or admin key
  - Ownership verification on mutations
  - Location: `api/server.js:1580-1700`

### High Priority (COMPLETED ✅)

- [x] **7. Add rate limiter for RSVP code lookup/cancel** ✅ DONE
  - 10 requests per minute per IP
  - Location: `api/server.js:86-90`

- [x] **8. Standardize error responses (prevent enumeration)** ✅ DONE
  - Generic "Booking not found or email does not match"
  - Location: `api/server.js:949-950`

- [x] **9. Add rate limiter for admin endpoints** ✅ DONE
  - 5 requests per 15 minutes per IP
  - Location: `api/server.js:93-97`

- [x] **10. Remove PII from logs** ✅ DONE (Added Jan 26, 2026)
  - User IDs logged instead of emails
  - Locations: Various auth/rating endpoints

### Medium Priority (Manual Verification Needed)

- [ ] **11. Verify Atlas DB user has least-privilege (Manual - 5 min)**
  - Log into Atlas → Database Access
  - Check your app's user only has `readWrite` on your database
  - NOT `atlasAdmin`, `dbAdmin`, or `userAdmin`

- [ ] **12. Add input type validation (Code)** - Optional enhancement
  ```javascript
  const validateStringFields = (fields) => (req, res, next) => {
    for (const field of fields) {
      const value = req.body[field];
      if (value !== undefined && typeof value !== 'string') {
        return res.status(400).json({ error: `Invalid ${field}` });
      }
    }
    next();
  };
  ```

### Low Priority / Future - When You Have Time

- [x] Review console.log statements for PII exposure ✅ DONE
- [ ] Add structured security logging
- [ ] Implement admin session-based auth (when you build dashboard)
- [ ] Consider dedicated egress IPs (when revenue supports $25/mo)

---

### Quick Win Summary

**✅ ALL QUICK WINS COMPLETED (January 26, 2026)**

| Fix | Status | Impact |
|-----|--------|--------|
| Disable seed in prod | ✅ DONE | Prevents data deletion |
| Remove code from duplicate error | ✅ DONE | Prevents info leak |
| Add codeLookupLimiter | ✅ DONE | Prevents brute-force |
| Standardize cancel errors | ✅ DONE | Prevents enumeration |
| JWT secret production guard | ✅ DONE | Prevents token forgery |
| Static file security | ✅ DONE | Prevents info disclosure |
| User RSVP auth | ✅ DONE | Prevents PII access |
| Notification auth | ✅ DONE | Prevents PII access |
| PII logging removed | ✅ DONE | Privacy compliance |

**Remaining:** Verify Atlas user permissions (manual, 5 min)

---

## 7. Incident Response Procedure

In the event of a suspected security incident (credential leak, unauthorized access, data breach), follow this sequence:

### Immediate Response (First 30 Minutes)

1. **Revoke and rotate credentials**
   - Rotate MongoDB Atlas password immediately
   - Rotate Stripe API keys if payment-related
   - Rotate JWT_SECRET (invalidates all sessions)
   - Rotate ADMIN_SECRET_KEY and SEED_SECRET_KEY
   - Update all rotated values in DigitalOcean env vars
   - Redeploy application

2. **Restrict network access**
   - If Atlas is compromised: temporarily set IP access list to deny all
   - If app is compromised: pause DigitalOcean app deployment
   - Enable maintenance mode if available

3. **Preserve logs**
   - Export DigitalOcean app logs before they rotate
   - Export Atlas activity feed
   - Screenshot any relevant Stripe dashboard activity
   - Document timeline of events

4. **Assess scope**
   - Identify what data may have been accessed
   - Determine time window of exposure
   - Check for unauthorized RSVPs or payments
   - Review Stripe dashboard for suspicious activity

5. **Notify affected users if required**
   - If PII was exposed: prepare notification email
   - Texas has no specific breach notification law, but follow best practices
   - Document notification sent and when

### Post-Incident (Within 48 Hours)

- [ ] Root cause analysis documented
- [ ] Security controls reviewed and strengthened
- [ ] This assessment document updated with lessons learned
- [ ] Consider whether dedicated egress IPs are now justified

---

## Appendix: Quick Reference

### Environment Variables Security

| Variable | Purpose | Rotation Recommended |
|----------|---------|---------------------|
| `MONGODB_URI` | Database connection | Every 6 months |
| `STRIPE_SECRET_KEY` | Payment processing | If compromised |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | If compromised |
| `JWT_SECRET` | Token signing | Every 6 months |
| `ADMIN_SECRET_KEY` | Admin access | Every 3 months |
| `SEED_SECRET_KEY` | Seed access | After each use in dev |
| `RESEND_API_KEY` | Email sending | If compromised |

### Security Headers (Current via Helmet.js)

| Header | Status | Value |
|--------|--------|-------|
| Content-Security-Policy | ✅ Configured | Custom directives |
| X-Content-Type-Options | ✅ Default | nosniff |
| X-Frame-Options | ✅ Default | DENY |
| X-XSS-Protection | ✅ Default | 0 (disabled, CSP used instead) |
| Strict-Transport-Security | ⚠️ Verify | Should be set by DigitalOcean |

---

## Appendix B: Why This Approach is Defensible

### What You're NOT Doing (And Why It's OK)

| Enterprise Feature | Cost | Your Alternative | Risk Level |
|--------------------|------|------------------|------------|
| Dedicated Egress IPs | $25/mo | Strong auth + TLS (Atlas default) | LOW |
| WAF (Web App Firewall) | $20+/mo | Helmet.js + rate limiting | LOW |
| Paid logging service | $10+/mo | Console logs + Atlas Activity Feed | ACCEPTABLE |
| Dedicated security audit | $$$$ | This document + manual testing | ACCEPTABLE |

### What You ARE Doing (The Important Stuff)

1. **Encrypted secrets** - All API keys in DigitalOcean encrypted env vars
2. **TLS everywhere** - Atlas enforces TLS, DigitalOcean provides HTTPS
3. **Rate limiting** - Prevents brute-force attacks
4. **Input validation** - Prevents injection attacks
5. **Stripe signature verification** - Prevents payment fraud
6. **Password hashing** - bcrypt with 12 rounds

### When to Upgrade

Consider adding dedicated egress IPs when:
- Monthly revenue exceeds $100
- You add an admin dashboard with more privileged operations
- You store more sensitive data (SSN, financial info, health data)
- A customer/partner requires it for compliance

---

*Document Version: 2.1*
*Approach: Zero-cost hardening for student/indie project*
*Last Updated: January 28, 2026*
*Next Review: February 28, 2026*

---

## Changelog

### v2.1 (January 28, 2026)
- ✅ Fixed: /api prefix bypass - paths like /apiary no longer skip allowlist
- ✅ Fixed: /api/ directory now blocks ALL files with extensions (not just .js/.ts/.json/.md)
- ✅ Fixed: Documentation accuracy - reflects .pdf and manifest.json as allowed

### v2.0 (January 26, 2026)
- ✅ Fixed: JWT secret production guard (fail-fast)
- ✅ Fixed: Static file security (blocks sensitive paths)
- ✅ Fixed: /api/user/rsvps requires authentication
- ✅ Fixed: All notification endpoints require authentication
- ✅ Fixed: PII removed from console logs
- Updated all sections to reflect current security posture
- Changed overall risk level from MEDIUM to LOW


Findings (All Resolved - January 28, 2026)

✅ RESOLVED - MEDIUM: Static allowlist is bypassed for any path starting with /api (including /apiary, /api-docs, etc.). Those paths skip the allowlist entirely and rely on express.static('.'), which can unintentionally expose files if such paths exist.
**FIX:** Changed check to `req.path === '/api' || req.path.startsWith('/api/')` so paths like `/apiary` no longer bypass the allowlist.

✅ RESOLVED - MEDIUM: /api/* file blocking only covers .js|.ts|.json|.md. Any other file types that land in /api (e.g., .txt, .yml) would still be publicly served because the allowlist is skipped for /api/*.
**FIX:** Now blocks ALL files with any extension in /api/ directory using regex `/\.[a-zA-Z0-9]+$/` check.

✅ RESOLVED - LOW: The doc claims /api/ is blocked and only extensions (html/css/js/images/videos/fonts) are served, but the code also allows .pdf and .json (manifest only) and does not fully block /api/ due to the early bypass.
**FIX:** Documentation updated to accurately list .pdf and manifest.json as allowed, and reflects the comprehensive /api/ blocking.