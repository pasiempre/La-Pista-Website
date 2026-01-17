require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const Stripe = require('stripe');
const { Resend } = require('resend');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Game, RSVP, Venue, Waitlist, GameTemplate, Comment, Notification, User, Rating } = require('./models');
const rateLimit = require('express-rate-limit');

// Initialize
const app = express();

// Trust proxy - required for rate limiting behind DigitalOcean/load balancers
app.set('trust proxy', 1);

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (!stripe) console.warn('⚠️  Stripe not configured - payments disabled');
if (!resend) console.warn('⚠️  Resend not configured - emails disabled');

// ============================================
// SECURITY MIDDLEWARE
// ============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://code.iconify.design", "https://js.stripe.com", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://api.iconify.design", "https://cdn.tailwindcss.com", "https://code.iconify.design", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://images.unsplash.com", "https://www.transparenttextures.com"],
      frameSrc: ["https://js.stripe.com", "https://www.google.com", "https://maps.google.com"]
    }
  }
}));

// ============================================
// RATE LIMITING (Security)
// ============================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window per IP
  message: { error: 'Too many requests, please try again later.' }
});

const rsvpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 RSVPs per hour per IP
  message: { error: 'Too many RSVP attempts, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 login attempts per 15 min
  message: { error: 'Too many login attempts, please try again later.' }
});

// ============================================
// JWT CONFIG
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || 'lapista-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

// ============================================
// AUTH MIDDLEWARE
// ============================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded; // { userId, email }
    next();
  });
};

// Optional auth - doesn't fail if no token, just sets req.user if valid
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.user = decoded;
      }
    });
  }
  next();
};

// Middleware
// 🔒 CORS: Restrict to frontend domain in production, allow all in development
const corsOrigin = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL, 'https://lapista-atx-jd756.ondigitalocean.app'].filter(Boolean)
  : true;

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Parse JSON for all routes except webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Serve static files (HTML, CSS, images)
app.use(express.static('.'));

// ============================================
// DATABASE CONNECTION
// ============================================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ============================================
// HELPER FUNCTIONS
// ============================================
function generateConfirmationCode() {
  // 🔒 Cryptographically strong 12-char code (62^12 = 3.2 quintillion combinations)
  const crypto = require('crypto');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(12);
  let code = 'LP-';
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

async function sendConfirmationEmail(rsvp, game) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'LaPista.ATX <noreply@lapista.atx>',
      to: rsvp.player.email,
      subject: `🎉 You're In! ${game.title} - ${game.date.toLocaleDateString()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
            .header { background: #18181b; color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 800; text-transform: uppercase; }
            .header .green { color: #22c55e; }
            .content { padding: 30px; }
            .ticket { background: #f4f4f5; border: 2px dashed #d4d4d8; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .ticket-header { font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
            .ticket-value { font-size: 18px; font-weight: 700; color: #18181b; }
            .confirmation-code { font-size: 32px; font-weight: 800; color: #22c55e; letter-spacing: 2px; text-align: center; margin: 20px 0; }
            .details { margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e4e4e7; }
            .detail-label { color: #71717a; font-size: 14px; }
            .detail-value { font-weight: 600; color: #18181b; }
            .footer { background: #18181b; color: #71717a; padding: 20px; text-align: center; font-size: 12px; }
            .btn { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; text-transform: uppercase; margin: 10px 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>LaPista<span class="green">.ATX</span></h1>
              <p style="margin: 10px 0 0; opacity: 0.8;">RSVP Confirmation</p>
            </div>
            <div class="content">
              <p>Hey ${rsvp.player.firstName}! 👋</p>
              <p>You're confirmed for <strong>${game.title}</strong>. See you on the pitch!</p>
              
              <div class="confirmation-code">${rsvp.confirmationCode}</div>
              
              <div class="ticket">
                <div class="ticket-header">Game Details</div>
                <div class="ticket-value">${game.title}</div>
                <div style="margin-top: 15px;">
                  <div class="detail-row">
                    <span class="detail-label">📅 Date</span>
                    <span class="detail-value">${game.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">⏰ Time</span>
                    <span class="detail-value">${game.time}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">📍 Venue</span>
                    <span class="detail-value">${game.venue.name}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">👥 Players</span>
                    <span class="detail-value">${rsvp.totalPlayers}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">💰 Total</span>
                    <span class="detail-value">$${rsvp.totalAmount.toFixed(2)} ${rsvp.paymentMethod === 'cashapp' || rsvp.paymentMethod === 'cash' ? '(Pay via CashApp)' : '(Paid)'}</span>
                  </div>
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${game.venue.mapsUrl}" class="btn">📍 Get Directions</a>
                <a href="https://chat.whatsapp.com/Gqkat9jvT1cAVURDjR9DqA" class="btn" style="background: #25D366;">💬 Join WhatsApp</a>
              </div>
              
              ${rsvp.paymentMethod === 'cashapp' || rsvp.paymentMethod === 'cash' ? `
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <strong style="color: #b91c1c;">⚠️ PAYMENT REQUIRED:</strong>
                <p style="margin: 10px 0 0; color: #991b1b;">
                  You must pay <strong>$${rsvp.totalAmount.toFixed(2)}</strong> via CashApp to <strong>$LaPistaATX</strong> before the game.
                </p>
                <p style="margin: 5px 0 0; color: #991b1b; font-size: 12px;">
                  Include your confirmation code <strong>${rsvp.confirmationCode}</strong> in the note.
                </p>
                <p style="margin: 10px 0 0; color: #b91c1c; font-size: 13px; font-weight: bold;">
                  No payment = No play. Pay at least 1 hour before game time.
                </p>
              </div>
              ` : ''}

              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <strong>📝 Remember:</strong>
                <ul style="margin: 10px 0 0; padding-left: 20px; color: #92400e;">
                  <li>Bring shin guards</li>
                  <li>Arrive 10 minutes early</li>
                  <li>Turf shoes or cleats (no metal studs)</li>
                  <li>Bring water</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e7;">
                <p style="color: #71717a; font-size: 12px; margin-bottom: 10px;">Need to cancel?</p>
                <a href="${process.env.FRONTEND_URL}/cancel.html?code=${rsvp.confirmationCode}" 
                   style="color: #ef4444; font-size: 12px; text-decoration: underline;">Cancel Booking</a>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 LaPista.ATX • Austin's Pickup Soccer Community</p>
              <p>Questions? Reply to this email or DM us on <a href="https://instagram.com/lapista.atx" style="color: #22c55e;">Instagram</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Email error:', error);
      return false;
    }
    console.log('✅ Confirmation email sent:', data?.id);
    return true;
  } catch (err) {
    console.error('Failed to send email:', err);
    return false;
  }
}

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all games
app.get('/api/games', async (req, res) => {
  try {
    const games = await Game.find({ status: { $in: ['open', 'scheduled'] } })
      .sort({ date: 1 });
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Get single game
app.get('/api/games/:gameId', async (req, res) => {
  try {
    const game = await Game.findOne({ gameId: req.params.gameId });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// Get RSVPs for a user by email (for My Games page)
app.get('/api/user/rsvps', async (req, res) => {
  try {
    const email = req.query.email?.toLowerCase().trim();
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    // Find all RSVPs for this email
    const rsvps = await RSVP.find({ 
      'player.email': email,
      status: { $in: ['confirmed', 'pending'] }
    }).sort({ createdAt: -1 });
    
    // Enrich with game data
    const enrichedRsvps = await Promise.all(rsvps.map(async (rsvp) => {
      const game = await Game.findOne({ gameId: rsvp.gameId });
      return {
        ...rsvp.toObject(),
        game: game ? {
          gameId: game.gameId,
          title: game.title,
          date: game.date,
          time: game.time,
          venue: game.venue,
          format: game.format,
          skillLevel: game.skillLevel,
          price: game.price,
          spotsRemaining: game.spotsRemaining,
          capacity: game.capacity,
          status: game.status
        } : null
      };
    }));
    
    // Filter out RSVPs where game no longer exists
    const validRsvps = enrichedRsvps.filter(r => r.game !== null);
    
    res.json(validRsvps);
  } catch (err) {
    console.error('Error fetching user RSVPs:', err);
    res.status(500).json({ error: 'Failed to fetch RSVPs' });
  }
});

// Get RSVPs for a game (public squad list)
app.get('/api/games/:gameId/rsvps', async (req, res) => {
  try {
    const rsvps = await RSVP.find({ 
      gameId: req.params.gameId,
      status: { $in: ['confirmed', 'pending'] }
    }).select('player.firstName player.lastName totalPlayers createdAt');
    
    res.json(rsvps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch RSVPs' });
  }
});

// Create RSVP (CashApp payment)
app.post('/api/rsvp', rsvpLimiter, async (req, res) => {
  try {
    const { gameId, firstName, lastName, email, phone, guests, waiverAccepted, paymentMethod } = req.body;

    // Validate required fields (phone is optional)
    if (!gameId || !firstName || !lastName || !email || !waiverAccepted) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 🔒 Input sanitization
    const sanitize = (str) => str?.toString().trim().slice(0, 100);
    const sanitizedEmail = email.toLowerCase().trim().slice(0, 254);
    
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // 🔒 Server-side guest limit
    if (guests && guests.length > 4) {
      return res.status(400).json({ error: 'Maximum 4 guests allowed' });
    }

    // Find the game
    const game = await Game.findOne({ gameId: sanitize(gameId) });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // 🔒 Check for duplicate RSVP (same email + same game)
    const existingRSVP = await RSVP.findOne({ 
      gameId: sanitize(gameId), 
      'player.email': sanitizedEmail,
      status: { $ne: 'cancelled' }
    });
    if (existingRSVP) {
      return res.status(400).json({ 
        error: 'You have already RSVP\'d for this game',
        confirmationCode: existingRSVP.confirmationCode
      });
    }

    // Check availability
    const totalPlayers = 1 + (guests?.length || 0);
    if (game.spotsRemaining < totalPlayers) {
      return res.status(400).json({ error: 'Not enough spots available' });
    }

    // Create RSVP
    const rsvp = new RSVP({
      gameId,
      confirmationCode: generateConfirmationCode().toUpperCase(),
      player: {
        firstName: sanitize(firstName),
        lastName: sanitize(lastName),
        email: sanitizedEmail,
        phone: sanitize(phone)
      },
      // 🔒 Sanitize guest names to prevent stored XSS
      guests: (guests || []).map(g => ({
        firstName: sanitize(g.firstName),
        lastName: sanitize(g.lastName)
      })),
      totalPlayers,
      totalAmount: totalPlayers * game.price,
      paymentMethod: paymentMethod === 'cashapp' ? 'cashapp' : 'cashapp', // Default to CashApp
      paymentStatus: 'pending',
      waiverAccepted,
      // 🔒 Legal: capture waiver acceptance metadata
      waiverAcceptedAt: new Date(),
      waiverAcceptedIP: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress,
      status: 'confirmed'
    });

    await rsvp.save();

    // Update game spots
    game.spotsRemaining -= totalPlayers;
    if (game.spotsRemaining <= 0) {
      game.status = 'full';
    }
    await game.save();

    // Send confirmation email
    await sendConfirmationEmail(rsvp, game);

    res.json({
      success: true,
      confirmationCode: rsvp.confirmationCode,
      message: 'RSVP confirmed! Check your email.'
    });
  } catch (err) {
    console.error('RSVP error:', err);
    res.status(500).json({ error: 'Failed to create RSVP' });
  }
});

// Create Stripe Checkout Session (Pay Online)
app.post('/api/checkout', rsvpLimiter, async (req, res) => {
  try {
    const { gameId, firstName, lastName, email, phone, guests, waiverAccepted } = req.body;

    // Validate (phone is optional)
    if (!gameId || !firstName || !lastName || !email || !waiverAccepted) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 🔒 Input sanitization
    const sanitize = (str) => str?.toString().trim().slice(0, 100);
    const sanitizedEmail = email.toLowerCase().trim().slice(0, 254);
    
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // 🔒 Server-side guest limit
    if (guests && guests.length > 4) {
      return res.status(400).json({ error: 'Maximum 4 guests allowed' });
    }

    // Find game
    const game = await Game.findOne({ gameId: sanitize(gameId) });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // 🔒 Check for duplicate RSVP (same email + same game)
    const existingRSVP = await RSVP.findOne({ 
      gameId: sanitize(gameId), 
      'player.email': sanitizedEmail,
      status: { $ne: 'cancelled' }
    });
    if (existingRSVP) {
      return res.status(400).json({ 
        error: 'You have already RSVP\'d for this game',
        confirmationCode: existingRSVP.confirmationCode
      });
    }

    const totalPlayers = 1 + (guests?.length || 0);
    if (game.spotsRemaining < totalPlayers) {
      return res.status(400).json({ error: 'Not enough spots available' });
    }

    // Generate confirmation code early
    const confirmationCode = generateConfirmationCode().toUpperCase();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product: process.env.STRIPE_PRODUCT_ID,
          unit_amount: Math.round(game.price * 100), // Stripe uses cents
        },
        quantity: totalPlayers,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/confirmation-page.html?code=${confirmationCode}`,
      cancel_url: `${process.env.FRONTEND_URL}/game-details.html?gameId=${gameId}&cancelled=true`,
      customer_email: email,
      metadata: {
        gameId,
        confirmationCode,
        // 🔒 Sanitize data going to Stripe metadata
        firstName: sanitize(firstName),
        lastName: sanitize(lastName),
        email: sanitizedEmail,
        phone: sanitize(phone),
        guests: JSON.stringify((guests || []).map(g => ({
          firstName: sanitize(g.firstName),
          lastName: sanitize(g.lastName)
        }))),
        totalPlayers: totalPlayers.toString(),
        waiverAccepted: waiverAccepted.toString(),
        // 🔒 Capture IP for waiver legal compliance
        waiverAcceptedIP: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
      }
    });

    res.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe Webhook (handles successful payments)
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata;

    try {
      // Find game
      const game = await Game.findOne({ gameId: metadata.gameId });
      if (!game) {
        console.error('Game not found for webhook:', metadata.gameId);
        return res.status(400).json({ error: 'Game not found' });
      }

      // Create RSVP
      const rsvp = new RSVP({
        gameId: metadata.gameId,
        confirmationCode: metadata.confirmationCode?.toUpperCase(),
        player: {
          firstName: metadata.firstName,
          lastName: metadata.lastName,
          email: metadata.email,
          phone: metadata.phone
        },
        guests: JSON.parse(metadata.guests || '[]'),
        totalPlayers: parseInt(metadata.totalPlayers),
        totalAmount: session.amount_total / 100,
        paymentMethod: 'online',
        paymentStatus: 'paid',
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        waiverAccepted: metadata.waiverAccepted === 'true',
        // 🔒 Legal: store waiver acceptance metadata from checkout
        waiverAcceptedAt: new Date(),
        waiverAcceptedIP: metadata.waiverAcceptedIP || 'unknown',
        status: 'confirmed'
      });

      await rsvp.save();

      // Update game spots
      game.spotsRemaining -= parseInt(metadata.totalPlayers);
      if (game.spotsRemaining <= 0) {
        game.status = 'full';
      }
      await game.save();

      // Send confirmation email
      await sendConfirmationEmail(rsvp, game);

      console.log('✅ Payment processed:', metadata.confirmationCode);
    } catch (err) {
      console.error('Webhook processing error:', err);
    }
  }

  res.json({ received: true });
});

// Get RSVP by confirmation code
app.get('/api/rsvp/:code', async (req, res) => {
  try {
    // 🔒 Sanitize and normalize confirmation code (prevent ReDoS)
    const code = req.params.code?.toString().trim().toUpperCase();
    if (!code || code.length > 20) {
      return res.status(400).json({ error: 'Invalid confirmation code' });
    }

    // Try exact match first (codes are stored uppercase with LP- prefix)
    let rsvp = await RSVP.findOne({ confirmationCode: code });

    // Fallback: try with LP- prefix if not provided
    if (!rsvp && !code.startsWith('LP-')) {
      rsvp = await RSVP.findOne({ confirmationCode: `LP-${code}` });
    }

    if (!rsvp) {
      return res.status(404).json({ error: 'RSVP not found' });
    }

    const game = await Game.findOne({ gameId: rsvp.gameId });
    res.json({ rsvp, game });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch RSVP' });
  }
});

// ============================================
// CONTACT FORM API (using Resend)
// ============================================
app.post('/api/contact', apiLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // 🔒 Sanitize inputs
    const sanitize = (str) => str?.toString().trim().slice(0, 500);
    const sanitizedName = sanitize(name);
    const sanitizedSubject = sanitize(subject);
    const sanitizedMessage = message?.toString().trim().slice(0, 5000);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'LaPista.ATX <noreply@lapista.atx>',
      to: 'lapista.atx@gmail.com',
      replyTo: email,
      subject: `[Contact Form] ${sanitizedSubject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${sanitizedName} (${email})</p>
        <p><strong>Subject:</strong> ${sanitizedSubject}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${sanitizedMessage.replace(/\n/g, '<br>')}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Sent from LaPista.ATX Contact Form</p>
      `
    });

    if (error) {
      console.error('Contact email error:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ============================================
// CANCELLATION API
// ============================================
app.post('/api/rsvp/:code/cancel', apiLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required to confirm cancellation' });
    }

    // 🔒 Sanitize and normalize confirmation code (prevent ReDoS)
    const code = req.params.code?.toString().trim().toUpperCase();
    if (!code || code.length > 20) {
      return res.status(400).json({ error: 'Invalid confirmation code' });
    }

    // Find RSVP by exact match
    let rsvp = await RSVP.findOne({ confirmationCode: code });

    // Fallback: try with LP- prefix if not provided
    if (!rsvp && !code.startsWith('LP-')) {
      rsvp = await RSVP.findOne({ confirmationCode: `LP-${code}` });
    }
    
    if (!rsvp) {
      return res.status(404).json({ error: 'RSVP not found' });
    }

    // Verify email matches
    if (rsvp.player.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Email does not match booking' });
    }

    // Check if already cancelled
    if (rsvp.status === 'cancelled') {
      return res.status(400).json({ error: 'This booking has already been cancelled' });
    }

    // Find the game
    const game = await Game.findOne({ gameId: rsvp.gameId });
    
    // Check if game is in the past
    if (game && new Date(game.date) < new Date()) {
      return res.status(400).json({ error: 'Cannot cancel past games' });
    }

    // Process Stripe refund if paid online
    let refundId = null;
    if (rsvp.paymentMethod === 'online' && rsvp.stripePaymentIntentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: rsvp.stripePaymentIntentId,
          reason: 'requested_by_customer'
        });
        refundId = refund.id;
        console.log(`💰 Refund processed: ${refundId} for ${rsvp.confirmationCode}`);
      } catch (refundErr) {
        console.error('Stripe refund error:', refundErr);
        // Continue with cancellation even if refund fails - manual intervention needed
        // You may want to flag this for manual review
      }
    }

    // Update RSVP status
    rsvp.status = 'cancelled';
    rsvp.paymentStatus = rsvp.paymentMethod === 'online' ? 'refunded' : 'cancelled';
    if (refundId) rsvp.stripeRefundId = refundId;
    await rsvp.save();

    // Restore spots to game
    if (game) {
      game.spotsRemaining += rsvp.totalPlayers;
      if (game.status === 'full') {
        game.status = 'open';
      }
      await game.save();

      // Check waitlist and notify first person
      const waitlistEntry = await Waitlist.findOne({ 
        gameId: game.gameId, 
        notified: false 
      }).sort({ createdAt: 1 });

      if (waitlistEntry) {
        // Send notification email
        try {
          await resend.emails.send({
            from: process.env.EMAIL_FROM || 'LaPista.ATX <noreply@lapista.atx>',
            to: waitlistEntry.email,
            subject: `🎉 Spot Available! ${game.title}`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
                <h1 style="color: #22c55e;">Good News, ${waitlistEntry.name}!</h1>
                <p>A spot just opened up for <strong>${game.title}</strong>!</p>
                <p><strong>Date:</strong> ${game.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <p><strong>Time:</strong> ${game.time}</p>
                <p><strong>Venue:</strong> ${game.venue.name}</p>
                <a href="${process.env.FRONTEND_URL}/game-details.html?gameId=${game.gameId}" 
                   style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">
                  RSVP Now
                </a>
                <p style="color: #666; font-size: 12px;">This spot won't last long - book now before someone else does!</p>
              </div>
            `
          });
          waitlistEntry.notified = true;
          waitlistEntry.notifiedAt = new Date();
          await waitlistEntry.save();
        } catch (emailErr) {
          console.error('Waitlist notification error:', emailErr);
        }
      }
    }

    // Send cancellation confirmation email
    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'LaPista.ATX <noreply@lapista.atx>',
        to: rsvp.player.email,
        subject: `Booking Cancelled - ${rsvp.confirmationCode}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h1 style="color: #18181b;">Booking Cancelled</h1>
            <p>Hi ${rsvp.player.firstName},</p>
            <p>Your booking <strong>${rsvp.confirmationCode}</strong> has been cancelled.</p>
            ${rsvp.paymentMethod === 'online' ? '<p>Your refund will be processed within 5-10 business days.</p>' : ''}
            <p>We hope to see you at a future game!</p>
            <a href="${process.env.FRONTEND_URL}" style="color: #22c55e;">View Upcoming Games</a>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Cancellation email error:', emailErr);
    }

    res.json({ 
      success: true, 
      message: 'Booking cancelled successfully',
      refund: rsvp.paymentMethod === 'online'
    });
  } catch (err) {
    console.error('Cancellation error:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// ============================================
// WAITLIST API
// ============================================
app.post('/api/waitlist', apiLimiter, async (req, res) => {
  try {
    const { gameId, name, email, phone } = req.body;

    if (!gameId || !name || !email) {
      return res.status(400).json({ error: 'Game ID, name, and email are required' });
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if game exists
    const game = await Game.findOne({ gameId });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check if already on waitlist
    const existing = await Waitlist.findOne({ gameId, email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'You are already on the waitlist for this game' });
    }

    // Check if already has RSVP
    const existingRSVP = await RSVP.findOne({ 
      gameId, 
      'player.email': email.toLowerCase(),
      status: { $ne: 'cancelled' }
    });
    if (existingRSVP) {
      return res.status(400).json({ error: 'You already have an RSVP for this game' });
    }

    // Add to waitlist
    const waitlistEntry = new Waitlist({
      gameId,
      name: name.trim().slice(0, 100),
      email: email.toLowerCase().trim(),
      phone: phone?.trim().slice(0, 20)
    });

    await waitlistEntry.save();

    // Get position in waitlist
    const position = await Waitlist.countDocuments({ gameId, createdAt: { $lte: waitlistEntry.createdAt } });

    res.json({ 
      success: true, 
      message: 'Added to waitlist!',
      position
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'You are already on the waitlist' });
    }
    console.error('Waitlist error:', err);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

// Get waitlist count for a game
app.get('/api/waitlist/:gameId', async (req, res) => {
  try {
    const count = await Waitlist.countDocuments({ 
      gameId: req.params.gameId,
      notified: false
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get waitlist count' });
  }
});

// Get platform stats (total players who have used the platform)
app.get('/api/stats/platform', async (req, res) => {
  try {
    // Count unique emails from all RSVPs (confirmed or completed)
    const uniquePlayers = await RSVP.distinct('player.email', {
      status: { $in: ['confirmed', 'completed'] }
    });
    
    // Also count total guests
    const rsvpsWithGuests = await RSVP.find({ 
      status: { $in: ['confirmed', 'completed'] },
      'guests.0': { $exists: true }
    });
    const totalGuests = rsvpsWithGuests.reduce((sum, r) => sum + (r.guests?.length || 0), 0);
    
    // Total RSVPs
    const totalRsvps = await RSVP.countDocuments({ status: { $in: ['confirmed', 'completed'] } });
    
    // Total games hosted
    const totalGames = await Game.countDocuments();
    
    res.json({
      uniquePlayers: uniquePlayers.length,
      totalGuests,
      totalParticipants: uniquePlayers.length + totalGuests,
      totalRsvps,
      totalGames
    });
  } catch (err) {
    console.error('Platform stats error:', err);
    res.status(500).json({ error: 'Failed to get platform stats' });
  }
});

// ============================================
// GAME TEMPLATES & AUTO-GENERATION
// ============================================

// Get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await GameTemplate.find({ isActive: true });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create a template
app.post('/api/templates', async (req, res) => {
  const authKey = req.headers['x-admin-key'];
  if (authKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const template = new GameTemplate(req.body);
    await template.save();
    res.json({ success: true, template });
  } catch (err) {
    console.error('Template creation error:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Generate games for next week from templates
app.post('/api/games/generate-week', async (req, res) => {
  const authKey = req.headers['x-admin-key'];
  if (authKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const templates = await GameTemplate.find({ isActive: true });
    
    if (templates.length === 0) {
      return res.status(400).json({ error: 'No active templates found' });
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const createdGames = [];

    // Helper to get next occurrence of a day
    const getNextDay = (dayOfWeek) => {
      const targetDay = days.indexOf(dayOfWeek);
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7; // Next week
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysUntil);
      nextDate.setHours(0, 0, 0, 0);
      return nextDate;
    };

    // Generate game ID
    const generateGameId = () => {
      const count = Math.floor(Math.random() * 900) + 100;
      return `LP-${count}`;
    };

    for (const template of templates) {
      const gameDate = getNextDay(template.dayOfWeek);
      
      // Check if game already exists for this date/venue
      const existing = await Game.findOne({
        'venue.name': template.venue.name,
        date: {
          $gte: new Date(gameDate.setHours(0, 0, 0, 0)),
          $lt: new Date(gameDate.setHours(23, 59, 59, 999))
        }
      });

      if (!existing) {
        const game = new Game({
          gameId: generateGameId(),
          title: template.name,
          venue: template.venue,
          dayOfWeek: template.dayOfWeek,
          time: template.time,
          date: gameDate,
          price: template.price,
          capacity: template.capacity,
          spotsRemaining: template.capacity,
          status: 'open'
        });

        await game.save();
        createdGames.push(game);
      }
    }

    res.json({ 
      success: true, 
      message: `Created ${createdGames.length} games`,
      games: createdGames
    });
  } catch (err) {
    console.error('Game generation error:', err);
    res.status(500).json({ error: 'Failed to generate games' });
  }
});

// ============================================
// SEED DATA (Protected - requires secret key)
// ============================================
app.post('/api/seed', async (req, res) => {
  // 🔒 SECURITY: Require secret key to run seed
  const seedKey = req.headers['x-seed-key'] || req.query.key;
  if (seedKey !== process.env.SEED_SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized. Seed key required.' });
  }

  try {
    // Clear existing data
    await Game.deleteMany({});
    await Venue.deleteMany({});

    // Create venues
    const venues = await Venue.insertMany([
      {
        slug: 'shady-lane',
        name: 'Shady Lane Fields',
        address: '757 Shady Ln, Austin, TX 78702',
        mapsUrl: 'https://maps.google.com/?q=757+Shady+Ln+Austin+TX+78702',
        mapsEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3446.398337722129!2d-97.69742662445864!3d30.25438847481872!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8644b679b32662a9%3A0xc3c942971830209c!2s757%20Shady%20Ln%2C%20Austin%2C%20TX%2078702'
      },
      {
        slug: 'cesar-chavez',
        name: 'Cesar Chavez Fields',
        address: 'Cesar Chavez St, Austin, TX',
        mapsUrl: 'https://maps.google.com/?q=Cesar+Chavez+Fields+Austin+TX'
      },
      {
        slug: 'prairie-lane',
        name: 'Prairie Lane Fields',
        address: '4005 Prairie Ln, Austin, TX 78728',
        mapsUrl: 'https://maps.google.com/?q=4005+Prairie+Ln+Austin+TX+78728'
      }
    ]);

    // Create games for next week
    const today = new Date();
    const getNextDay = (dayOfWeek) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetDay = days.indexOf(dayOfWeek);
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysUntil);
      return nextDate;
    };

    const games = await Game.insertMany([
      {
        gameId: 'LP-001',
        title: 'Sunday Pickup',
        venue: { name: 'Shady Lane Fields', address: '757 Shady Ln, Austin, TX 78702', mapsUrl: venues[0].mapsUrl },
        dayOfWeek: 'Sunday',
        time: '8:00 PM',
        date: getNextDay('Sunday'),
        price: 5.99,
        capacity: 24,
        spotsRemaining: 24,
        status: 'open'
      },
      {
        gameId: 'LP-002',
        title: 'Tuesday Night',
        venue: { name: 'Shady Lane Fields', address: '757 Shady Ln, Austin, TX 78702', mapsUrl: venues[0].mapsUrl },
        dayOfWeek: 'Tuesday',
        time: '8:00 PM',
        date: getNextDay('Tuesday'),
        price: 5.99,
        capacity: 24,
        spotsRemaining: 24,
        status: 'open'
      },
      {
        gameId: 'LP-003',
        title: 'Thursday Night',
        venue: { name: 'Prairie Lane Fields', address: '4005 Prairie Ln, Austin, TX 78728', mapsUrl: venues[2].mapsUrl },
        dayOfWeek: 'Thursday',
        time: '8:30 PM',
        date: getNextDay('Thursday'),
        price: 5.99,
        capacity: 24,
        spotsRemaining: 24,
        status: 'open'
      },
      {
        gameId: 'LP-004',
        title: 'Friday Pickup',
        venue: { name: 'Cesar Chavez Fields', address: 'Cesar Chavez St, Austin, TX', mapsUrl: venues[1].mapsUrl },
        dayOfWeek: 'Friday',
        time: '8:00 PM',
        date: getNextDay('Friday'),
        price: 5.99,
        capacity: 24,
        spotsRemaining: 24,
        status: 'open'
      }
    ]);

    res.json({ 
      success: true, 
      message: 'Database seeded!',
      venues: venues.length,
      games: games.length 
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

// ============================================
// COMMENTS API
// ============================================

// Get comments for a game
app.get('/api/games/:gameId/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ 
      gameId: req.params.gameId,
      isDeleted: false 
    })
    .sort({ createdAt: -1 })
    .limit(50);
    
    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add a comment to a game
app.post('/api/games/:gameId/comments', async (req, res) => {
  try {
    const { name, email, text } = req.body;
    
    if (!name || !email || !text) {
      return res.status(400).json({ error: 'Name, email, and text are required' });
    }
    
    if (text.length > 500) {
      return res.status(400).json({ error: 'Comment too long (max 500 characters)' });
    }
    
    // Generate initials from name
    const nameParts = name.trim().split(' ');
    const initials = nameParts.length >= 2 
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
    
    const comment = await Comment.create({
      gameId: req.params.gameId,
      author: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        initials
      },
      text: text.trim()
    });
    
    // Create notification for game host/participants (optional - can expand later)
    // For now, just return the comment
    
    res.status(201).json(comment);
  } catch (err) {
    console.error('Error creating comment:', err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Delete a comment (soft delete)
app.delete('/api/comments/:commentId', async (req, res) => {
  try {
    const { email } = req.body;
    
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Only allow author to delete their own comment
    if (comment.author.email !== email?.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }
    
    comment.isDeleted = true;
    await comment.save();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ============================================
// NOTIFICATIONS API
// ============================================

// Get notifications for a user
app.get('/api/notifications', async (req, res) => {
  try {
    const email = req.query.email?.toLowerCase().trim();
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const notifications = await Notification.find({ 
      userEmail: email 
    })
    .sort({ createdAt: -1 })
    .limit(50);
    
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Create a notification (internal use - called by other parts of the system)
app.post('/api/notifications', async (req, res) => {
  try {
    const { userEmail, type, title, message, gameId, confirmationCode, promoCode, gameStartTime } = req.body;
    
    if (!userEmail || !type || !title || !message) {
      return res.status(400).json({ error: 'userEmail, type, title, and message are required' });
    }
    
    const notification = await Notification.create({
      userEmail: userEmail.toLowerCase().trim(),
      type,
      title,
      message,
      gameId,
      confirmationCode,
      promoCode,
      gameStartTime: gameStartTime ? new Date(gameStartTime) : undefined
    });
    
    res.status(201).json(notification);
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Mark notification as read
app.patch('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.notificationId,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Clear all notifications for a user
app.delete('/api/notifications/clear', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    await Notification.updateMany(
      { userEmail: email.toLowerCase().trim() },
      { isRead: true, readAt: new Date() }
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error clearing notifications:', err);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Get unread notification count
app.get('/api/notifications/count', async (req, res) => {
  try {
    const email = req.query.email?.toLowerCase().trim();
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const count = await Notification.countDocuments({ 
      userEmail: email,
      isRead: false 
    });
    
    res.json({ count });
  } catch (err) {
    console.error('Error counting notifications:', err);
    res.status(500).json({ error: 'Failed to count notifications' });
  }
});

// ============================================
// AUTH ROUTES
// ============================================

// Register new user
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    
    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['email', 'password', 'firstName', 'lastName']
      });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create user
    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim() || null,
      authProvider: 'email'
    });
    
    await user.save();
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Return user data (without password)
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      skillLevel: user.skillLevel,
      gamesPlayed: user.gamesPlayed,
      weekStreak: user.weekStreak,
      averageRating: user.averageRating,
      emailVerified: user.emailVerified,
      notificationsEnabled: user.notificationsEnabled,
      createdAt: user.createdAt
    };
    
    console.log(`✅ New user registered: ${user.email}`);
    res.status(201).json({ user: userData, token });
    
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if account uses password auth
    if (user.authProvider !== 'email' || !user.passwordHash) {
      return res.status(401).json({ 
        error: `This account uses ${user.authProvider} sign-in` 
      });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }
    
    // Update last login
    user.lastLoginAt = new Date();
    await user.save();
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Return user data
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      skillLevel: user.skillLevel,
      gamesPlayed: user.gamesPlayed,
      weekStreak: user.weekStreak,
      averageRating: user.averageRating,
      emailVerified: user.emailVerified,
      notificationsEnabled: user.notificationsEnabled,
      createdAt: user.createdAt
    };
    
    console.log(`✅ User logged in: ${user.email}`);
    res.json({ user: userData, token });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile (protected)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash -emailVerificationToken -passwordResetToken');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      skillLevel: user.skillLevel,
      gamesPlayed: user.gamesPlayed,
      noShows: user.noShows,
      weekStreak: user.weekStreak,
      averageRating: user.averageRating,
      totalRatings: user.totalRatings,
      emailVerified: user.emailVerified,
      notificationsEnabled: user.notificationsEnabled,
      createdAt: user.createdAt
    });
    
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update current user profile (protected)
app.put('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, skillLevel, avatar, notificationsEnabled } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update allowed fields
    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (phone !== undefined) user.phone = phone?.trim() || null;
    if (skillLevel && ['beginner', 'intermediate', 'advanced', 'pro'].includes(skillLevel)) {
      user.skillLevel = skillLevel;
    }
    if (avatar !== undefined) user.avatar = avatar;
    if (typeof notificationsEnabled === 'boolean') {
      user.notificationsEnabled = notificationsEnabled;
    }
    
    await user.save();
    
    console.log(`✅ Profile updated: ${user.email}`);
    res.json({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      skillLevel: user.skillLevel,
      gamesPlayed: user.gamesPlayed,
      noShows: user.noShows,
      weekStreak: user.weekStreak,
      averageRating: user.averageRating,
      emailVerified: user.emailVerified,
      notificationsEnabled: user.notificationsEnabled,
      createdAt: user.createdAt
    });
    
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password (protected)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user || user.authProvider !== 'email') {
      return res.status(400).json({ error: 'Password change not available for this account' });
    }
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    console.log(`✅ Password changed: ${user.email}`);
    res.json({ message: 'Password updated successfully' });
    
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================
// RATINGS ROUTES
// ============================================

// Submit a rating for a game
app.post('/api/ratings', authenticateToken, async (req, res) => {
  try {
    const { gameId, rating, comment } = req.body;
    
    if (!gameId || !rating) {
      return res.status(400).json({ error: 'gameId and rating required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check if game exists and is completed
    const game = await Game.findOne({ gameId });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Check if user attended this game
    const rsvp = await RSVP.findOne({ 
      gameId, 
      'player.email': req.user.email,
      status: 'confirmed'
    });
    
    if (!rsvp) {
      return res.status(403).json({ error: 'You can only rate games you attended' });
    }
    
    // Check for existing rating
    const existingRating = await Rating.findOne({ 
      gameId, 
      raterEmail: req.user.email 
    });
    
    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.comment = comment?.trim() || null;
      await existingRating.save();
      
      console.log(`✅ Rating updated: ${req.user.email} rated game ${gameId} = ${rating}`);
      return res.json({ message: 'Rating updated', rating: existingRating });
    }
    
    // Create new rating
    const newRating = new Rating({
      gameId,
      raterEmail: req.user.email,
      rating,
      comment: comment?.trim() || null
    });
    
    await newRating.save();
    
    console.log(`✅ New rating: ${req.user.email} rated game ${gameId} = ${rating}`);
    res.status(201).json({ message: 'Rating submitted', rating: newRating });
    
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You have already rated this game' });
    }
    console.error('Submit rating error:', err);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// Get ratings for a game
app.get('/api/games/:gameId/ratings', async (req, res) => {
  try {
    const ratings = await Rating.find({ gameId: req.params.gameId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Calculate average
    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
      : 0;
    
    res.json({
      ratings,
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings: ratings.length
    });
    
  } catch (err) {
    console.error('Get ratings error:', err);
    res.status(500).json({ error: 'Failed to get ratings' });
  }
});

// Get user stats (calculated from database)
app.get('/api/user/stats', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    // Get user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Count confirmed RSVPs for completed games
    const completedRsvps = await RSVP.countDocuments({
      'player.email': email.toLowerCase(),
      status: 'confirmed',
      checkedIn: true
    });
    
    // Count no-shows
    const noShows = await RSVP.countDocuments({
      'player.email': email.toLowerCase(),
      status: 'no-show'
    });
    
    // Get average rating received (if user is a host - future feature)
    // For now, return the stored value or calculate from games
    
    res.json({
      gamesPlayed: user?.gamesPlayed || completedRsvps,
      noShows: user?.noShows || noShows,
      weekStreak: user?.weekStreak || 0,
      averageRating: user?.averageRating || 0,
      totalRatings: user?.totalRatings || 0,
      attendanceRate: completedRsvps > 0 
        ? Math.round((completedRsvps / (completedRsvps + noShows)) * 100) 
        : 100
    });
    
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
🏟️  LaPista.ATX Backend Running!
📍 Server: http://localhost:${PORT}
📍 API: http://localhost:${PORT}/api
  
Auth Endpoints:
  POST /api/auth/register     - Create account
  POST /api/auth/login        - Login
  GET  /api/auth/me           - Get profile (auth required)
  PUT  /api/auth/me           - Update profile (auth required)
  POST /api/auth/change-password - Change password (auth required)

Game Endpoints:
  GET  /api/games             - List all games
  GET  /api/games/:id         - Get single game
  POST /api/rsvp              - Create RSVP (pay at game)
  POST /api/checkout          - Create Stripe checkout
  GET  /api/rsvp/:code        - Get RSVP by code
  
Rating Endpoints:
  POST /api/ratings           - Submit rating (auth required)
  GET  /api/games/:id/ratings - Get game ratings
  GET  /api/user/stats        - Get user stats
  `);
});
