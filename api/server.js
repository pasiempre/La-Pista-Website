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

// FRONTEND_URL is required for Stripe redirect URLs
// Remove ALL whitespace (spaces, tabs, newlines) from the URL
let FRONTEND_URL = (process.env.FRONTEND_URL || 'https://lapista-atx.com').replace(/\s+/g, '');

// Ensure URL has protocol
if (FRONTEND_URL && !FRONTEND_URL.startsWith('http://') && !FRONTEND_URL.startsWith('https://')) {
  FRONTEND_URL = 'https://' + FRONTEND_URL;
  console.warn('⚠️  FRONTEND_URL was missing protocol, added https://');
}

// Remove trailing slash if present
if (FRONTEND_URL.endsWith('/')) {
  FRONTEND_URL = FRONTEND_URL.slice(0, -1);
}

console.log('📍 FRONTEND_URL configured as:', JSON.stringify(FRONTEND_URL));
console.log('📍 Raw env value was:', JSON.stringify(process.env.FRONTEND_URL));
if (!process.env.FRONTEND_URL) {
  console.warn('⚠️  FRONTEND_URL not set - using default: https://lapista-atx.com');
}

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

// 🔒 SECURITY: Rate limiter for confirmation code lookups (prevents brute-force)
const codeLookupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 lookups per minute per IP
  message: { error: 'Too many attempts, please try again later.' }
});

// 🔒 SECURITY: Rate limiter for admin endpoints (prevents abuse)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 admin requests per 15 min per IP
  message: { error: 'Too many admin requests, please try again later.' }
});

// ============================================
// JWT CONFIG
// ============================================
// 🔒 SECURITY: Fail fast if JWT_SECRET is missing in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is required in production');
  process.exit(1);
}
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
  ? [FRONTEND_URL, 'https://lapista-atx.com'].filter(Boolean)
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

// 🔒 SECURITY: Allowlist approach for static files
// Only serve files with explicitly allowed extensions from allowed directories
app.use((req, res, next) => {
  // Handle API routes - must match exactly '/api' or start with '/api/'
  // This prevents paths like '/apiary' or '/api-docs' from bypassing the allowlist
  if (req.path === '/api' || req.path.startsWith('/api/')) {
    // Block ALL file access in /api directory (source code protection)
    // API routes don't have extensions (e.g., /api/games, /api/rsvp)
    // Files have extensions (e.g., /api/server.js, /api/config.yml)
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(req.path);
    if (hasExtension) {
      return res.status(404).send('Not found');
    }
    // Let API route handlers process the request
    return next();
  }

  // Allowed static file extensions (whitelist approach)
  const allowedExtensions = [
    '.html', '.css', '.js',           // Web files
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',  // Images
    '.mp4', '.webm', '.mov',          // Videos
    '.woff', '.woff2', '.ttf', '.eot', // Fonts
    '.pdf',                            // Documents
    '.json',                           // Config (manifest.json for PWA)
  ];

  // Allowed directories (for paths without extensions)
  const allowedPaths = [
    '/',              // Root index
    '/js/',           // JavaScript
    '/css/',          // Stylesheets
    '/images/',       // Images
    '/fonts/',        // Fonts
  ];

  // Block dotfiles and hidden directories
  if (req.path.includes('/.') || req.path.startsWith('.')) {
    return res.status(404).send('Not found');
  }

  // Block known sensitive files explicitly
  const blockedFiles = [
    '/package.json', '/package-lock.json',
    '/SECURITY_ASSESSMENT.md', '/TODO.md', '/README.md',
    '/PRODUCTION_SETUP.md', '/TESTING.md',
    '/server.js', '/models.js',
  ];
  if (blockedFiles.some(f => req.path.toLowerCase() === f.toLowerCase())) {
    return res.status(404).send('Not found');
  }

  // Block directories that shouldn't be browsed
  const blockedDirs = ['/node_modules', '/api', '/scripts', '/.git', '/.claude'];
  if (blockedDirs.some(d => req.path.toLowerCase().startsWith(d.toLowerCase()))) {
    return res.status(404).send('Not found');
  }

  // Allow root path and HTML files
  if (req.path === '/' || req.path.endsWith('.html')) {
    return next();
  }

  // Allow files with permitted extensions
  const ext = req.path.substring(req.path.lastIndexOf('.')).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    // Special case: block .json except manifest.json
    if (ext === '.json' && !req.path.endsWith('manifest.json')) {
      return res.status(404).send('Not found');
    }
    return next();
  }

  // Allow paths in allowed directories (for directory index)
  if (allowedPaths.some(p => req.path.startsWith(p))) {
    return next();
  }

  // Block everything else
  return res.status(404).send('Not found');
});

// Serve static files (HTML, CSS, images)
// 🔒 SECURITY: dotfiles set to 'deny' as additional protection
app.use(express.static('.', {
  dotfiles: 'deny',
  index: ['index.html']
}));

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

async function sendConfirmationEmail(rsvp, game, lang = 'en') {
  try {
    // Email translations
    const t = {
      en: {
        subject: `🎉 You're In! ${game.title} - ${game.date.toLocaleDateString('en-US')}`,
        youreIn: "YOU'RE",
        in: "IN!",
        spotConfirmed: "Your spot is confirmed.",
        players: "Players",
        you: "(You)",
        guest: "(Guest)",
        bookingRef: "Booking Ref",
        confirmed: "Confirmed",
        person: "Person",
        people: "People",
        reservedBy: "Reserved by",
        total: "Total",
        status: "Status",
        payViaCashApp: "PAY VIA CASHAPP",
        paidViaCard: "PAID VIA CARD",
        paymentRequired: "⚠️ PAYMENT REQUIRED",
        payAmount: (amount) => `Pay <strong>$${amount}</strong> via CashApp to <strong>$bhrizzo</strong> before the game.`,
        includeCode: (code) => `Include your code <strong>${code}</strong> in the note.`,
        noPayment: "No payment = No play. Pay at least 1 hour before game time.",
        getDirections: "📍 Get Directions",
        whatsApp: "💬 WhatsApp",
        remember: "📝 Remember",
        arriveEarly: "Arrive 10 minutes early",
        turfShoes: "Turf shoes or cleats (no metal studs)",
        bringShirts: "Bring a white and dark shirt",
        bringWater: "Bring water",
        needToCancel: "Need to cancel?",
        cancelBooking: "Cancel Booking",
        copyright: "© 2026 LaPista.ATX • Austin's Pickup Soccer Community",
        questions: 'Questions? DM us on',
        dateLocale: 'en-US'
      },
      es: {
        subject: `🎉 ¡Estás Dentro! ${game.title} - ${game.date.toLocaleDateString('es-ES')}`,
        youreIn: "¡ESTÁS",
        in: "DENTRO!",
        spotConfirmed: "Tu lugar está confirmado.",
        players: "Jugadores",
        you: "(Tú)",
        guest: "(Invitado)",
        bookingRef: "Ref. de Reserva",
        confirmed: "Confirmado",
        person: "Persona",
        people: "Personas",
        reservedBy: "Reservado por",
        total: "Total",
        status: "Estado",
        payViaCashApp: "PAGAR VIA CASHAPP",
        paidViaCard: "PAGADO CON TARJETA",
        paymentRequired: "⚠️ PAGO REQUERIDO",
        payAmount: (amount) => `Paga <strong>$${amount}</strong> via CashApp a <strong>$bhrizzo</strong> antes del partido.`,
        includeCode: (code) => `Incluye tu código <strong>${code}</strong> en la nota.`,
        noPayment: "Sin pago = Sin jugar. Paga al menos 1 hora antes del partido.",
        getDirections: "📍 Cómo Llegar",
        whatsApp: "💬 WhatsApp",
        remember: "📝 Recuerda",
        arriveEarly: "Llega 10 minutos antes",
        turfShoes: "Zapatos de césped o tacos (sin tacos de metal)",
        bringShirts: "Trae una camiseta blanca y una oscura",
        bringWater: "Trae agua",
        needToCancel: "¿Necesitas cancelar?",
        cancelBooking: "Cancelar Reserva",
        copyright: "© 2026 LaPista.ATX • Comunidad de Fútbol de Austin",
        questions: 'Preguntas? Envíanos un DM en',
        dateLocale: 'es-ES'
      }
    };

    const txt = t[lang] || t.en;

    // Build guest list HTML
    let guestListHtml = '';
    if (rsvp.totalPlayers > 1) {
      guestListHtml = `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e4e4e7;">
          <div style="font-size: 10px; color: #71717a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">${txt.players}</div>
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="width: 20px; height: 20px; border-radius: 50%; background: #dcfce7; color: #16a34a; font-size: 10px; font-weight: bold; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px;">1</span>
            <span style="font-size: 13px; color: #18181b;">${rsvp.player.firstName} ${rsvp.player.lastName}</span>
            <span style="font-size: 11px; color: #a1a1aa; margin-left: 6px;">${txt.you}</span>
          </div>
          ${(rsvp.guests || []).map((guest, i) => `
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="width: 20px; height: 20px; border-radius: 50%; background: #f4f4f5; color: #71717a; font-size: 10px; font-weight: bold; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px;">${i + 2}</span>
            <span style="font-size: 13px; color: #18181b;">${guest.firstName} ${guest.lastName}</span>
            <span style="font-size: 11px; color: #a1a1aa; margin-left: 6px;">${txt.guest}</span>
          </div>
          `).join('')}
        </div>
      `;
    }

    const paymentStatus = rsvp.paymentMethod === 'cashapp' || rsvp.paymentMethod === 'cash'
      ? txt.payViaCashApp
      : txt.paidViaCard;
    const paymentStatusColor = rsvp.paymentMethod === 'cashapp' || rsvp.paymentMethod === 'cash'
      ? '#dc2626'
      : '#16a34a';
    const paymentStatusBg = rsvp.paymentMethod === 'cashapp' || rsvp.paymentMethod === 'cash'
      ? '#fef2f2'
      : '#f0fdf4';

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'LaPista.ATX <noreply@lapista.atx>',
      to: rsvp.player.email,
      subject: txt.subject,
      html: `
        <!DOCTYPE html>
        <html lang="${lang}">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto;">

            <!-- Header -->
            <div style="text-align: center; padding: 30px 20px;">
              <div style="width: 70px; height: 70px; border-radius: 50%; background: #dcfce7; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">✓</span>
              </div>
              <h1 style="margin: 0; font-size: 36px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -1px;">
                ${txt.youreIn} <span style="color: #16a34a;">${txt.in}</span>
              </h1>
              <p style="margin: 8px 0 0; color: #71717a; font-size: 16px;">${txt.spotConfirmed}</p>
            </div>

            <!-- Ticket Card -->
            <div style="background: white; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <!-- Decorative Top -->
              <div style="height: 6px; background: #18181b;"></div>
              <div style="height: 3px; background: #22c55e;"></div>

              <div style="padding: 24px;">
                <!-- Booking Ref -->
                <div style="margin-bottom: 20px;">
                  <div style="font-size: 10px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">${txt.bookingRef}</div>
                  <div style="font-size: 20px; font-weight: 700; font-family: monospace; color: #18181b; letter-spacing: 1px;">#${rsvp.confirmationCode}</div>
                </div>

                <!-- Game Title -->
                <h2 style="margin: 0 0 4px; font-size: 28px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -1px; color: #18181b;">
                  ${game.title}
                </h2>
                <div style="display: inline-flex; align-items: center; margin-bottom: 20px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-right: 8px;"></span>
                  <span style="font-size: 12px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">${txt.confirmed}</span>
                </div>

                <!-- Details -->
                <div style="margin-bottom: 10px;">
                  <div style="font-size: 14px; font-weight: 600; color: #18181b;">${game.date.toLocaleDateString(txt.dateLocale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  <div style="font-size: 12px; color: #71717a; text-transform: uppercase;">${game.time}</div>
                </div>
                <div style="margin-bottom: 10px;">
                  <div style="font-size: 14px; font-weight: 600; color: #18181b;">${game.venue.name}</div>
                  <div style="font-size: 12px; color: #71717a;">${game.venue.address}</div>
                </div>
                <div>
                  <div style="font-size: 14px; font-weight: 600; color: #18181b;">${rsvp.totalPlayers} ${rsvp.totalPlayers === 1 ? txt.person : txt.people}</div>
                  <div style="font-size: 12px; color: #71717a;">${txt.reservedBy} ${rsvp.player.firstName} ${rsvp.player.lastName}</div>
                </div>

                ${guestListHtml}
              </div>

              <!-- Perforated Line -->
              <div style="border-top: 2px dashed #e4e4e7; margin: 0 24px;"></div>

              <!-- Total & Status -->
              <div style="padding: 20px 24px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 10px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">${txt.total}</div>
                  <div style="font-size: 20px; font-weight: 700; color: #18181b;">$${rsvp.totalAmount.toFixed(2)}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 10px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">${txt.status}</div>
                  <span style="display: inline-block; padding: 4px 10px; border-radius: 4px; background: ${paymentStatusBg}; color: ${paymentStatusColor}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid ${paymentStatusColor}20;">
                    ${paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            <!-- CashApp Warning -->
            ${rsvp.paymentMethod === 'cashapp' || rsvp.paymentMethod === 'cash' ? `
            <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin-top: 20px;">
              <div style="font-size: 14px; font-weight: 700; color: #991b1b; margin-bottom: 10px;">${txt.paymentRequired}</div>
              <p style="margin: 0 0 10px; color: #991b1b; font-size: 14px;">
                ${txt.payAmount(rsvp.totalAmount.toFixed(2))}
              </p>
              <p style="margin: 0 0 10px; color: #7f1d1d; font-size: 12px;">
                ${txt.includeCode(rsvp.confirmationCode)}
              </p>
              <p style="margin: 0; color: #991b1b; font-size: 13px; font-weight: 700;">
                ${txt.noPayment}
              </p>
            </div>
            ` : ''}

            <!-- Action Buttons -->
            <div style="text-align: center; margin-top: 20px;">
              <a href="${game.venue.mapsUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; text-transform: uppercase; margin: 5px;">${txt.getDirections}</a>
              <a href="https://chat.whatsapp.com/Gqkat9jvT1cAVURDjR9DqA" style="display: inline-block; background: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; text-transform: uppercase; margin: 5px;">${txt.whatsApp}</a>
            </div>

            <!-- Remember Section -->
            <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 16px; margin-top: 20px;">
              <div style="font-size: 13px; font-weight: 700; color: #854d0e; margin-bottom: 8px;">${txt.remember}</div>
              <ul style="margin: 0; padding-left: 20px; color: #a16207; font-size: 13px; line-height: 1.6;">
                <li>${txt.arriveEarly}</li>
                <li>${txt.turfShoes}</li>
                <li>${txt.bringShirts}</li>
                <li>${txt.bringWater}</li>
              </ul>
            </div>

            <!-- Cancel Link -->
            <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px dashed #e4e4e7;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0 0 8px;">${txt.needToCancel}</p>
              <a href="${FRONTEND_URL}/cancel.html?code=${rsvp.confirmationCode}" style="color: #ef4444; font-size: 12px;">${txt.cancelBooking}</a>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding: 20px; color: #a1a1aa; font-size: 11px;">
              <p style="margin: 0 0 5px;">${txt.copyright}</p>
              <p style="margin: 0;">${txt.questions} <a href="https://instagram.com/lapista.atx" style="color: #16a34a;">Instagram</a></p>
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

// Get RSVPs for a user (for My Games page)
// 🔒 SECURITY: Requires authentication - users can only see their own RSVPs
app.get('/api/user/rsvps', authenticateToken, async (req, res) => {
  try {
    // Use authenticated user's email, not query param (prevents accessing others' RSVPs)
    const email = req.user.email.toLowerCase();

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
    const { gameId, firstName, lastName, email, phone, guests, waiverAccepted, paymentMethod, lang } = req.body;
    // Language preference: 'en' or 'es', default to 'en'
    const userLang = (lang === 'es') ? 'es' : 'en';

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
      // 🔒 SECURITY: Don't leak confirmation code - user should check their email
      return res.status(400).json({
        error: 'An RSVP already exists for this email. Check your email for the confirmation code.'
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

    // Update game spots (with safeguard to prevent negative values)
    game.spotsRemaining = Math.max(0, game.spotsRemaining - totalPlayers);
    if (game.spotsRemaining <= 0) {
      game.status = 'full';
    }
    await game.save();

    // Send confirmation email (with language preference)
    await sendConfirmationEmail(rsvp, game, userLang);

    res.json({
      success: true,
      confirmationCode: rsvp.confirmationCode,
      message: userLang === 'es' ? '¡RSVP confirmado! Revisa tu email.' : 'RSVP confirmed! Check your email.'
    });
  } catch (err) {
    console.error('RSVP error:', err);
    res.status(500).json({ error: 'Failed to create RSVP' });
  }
});

// Create Stripe Checkout Session (Pay Online)
app.post('/api/checkout', rsvpLimiter, async (req, res) => {
  try {
    const { gameId, firstName, lastName, email, phone, guests, waiverAccepted, lang } = req.body;
    // Language preference: 'en' or 'es', default to 'en'
    const userLang = (lang === 'es') ? 'es' : 'en';

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
      // 🔒 SECURITY: Don't leak confirmation code - user should check their email
      return res.status(400).json({
        error: 'An RSVP already exists for this email. Check your email for the confirmation code.'
      });
    }

    const totalPlayers = 1 + (guests?.length || 0);
    if (game.spotsRemaining < totalPlayers) {
      return res.status(400).json({ error: 'Not enough spots available' });
    }

    // Generate confirmation code early
    const confirmationCode = generateConfirmationCode().toUpperCase();

    // Debug: Log the URLs being sent to Stripe
    const successUrl = `${FRONTEND_URL}/confirmation-page.html?code=${confirmationCode}`;
    const cancelUrl = `${FRONTEND_URL}/game-details.html?gameId=${gameId}&cancelled=true`;
    console.log('🔗 Stripe URLs:', { FRONTEND_URL, successUrl, cancelUrl });

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
      success_url: successUrl,
      cancel_url: cancelUrl,
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
        waiverAcceptedIP: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress,
        // Language preference for email
        lang: userLang
      }
    });

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (err) {
    console.error('Checkout error:', err);
    // Provide more helpful error messages for common Stripe issues
    let errorMessage = 'Failed to create checkout session';
    if (err.type === 'StripeInvalidRequestError') {
      if (err.message.includes('product')) {
        errorMessage = 'Payment configuration error. Please contact support.';
        console.error('STRIPE_PRODUCT_ID may be invalid or mismatched with API key mode (live/test)');
      } else if (err.message.includes('api_key')) {
        errorMessage = 'Payment service temporarily unavailable.';
        console.error('STRIPE_SECRET_KEY may be invalid');
      }
    }
    res.status(500).json({ error: errorMessage, details: process.env.NODE_ENV === 'development' ? err.message : undefined });
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

      // 🔒 Check for duplicate RSVP to prevent webhook replay issues
      const existingRSVP = await RSVP.findOne({
        $or: [
          { confirmationCode: metadata.confirmationCode },
          { stripeSessionId: session.id }
        ]
      });
      if (existingRSVP) {
        console.log('⚠️ Duplicate webhook detected, RSVP already exists:', metadata.confirmationCode);
        return res.json({ received: true, duplicate: true });
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

      // Update game spots (with safeguard to prevent negative values)
      const playersToDeduct = parseInt(metadata.totalPlayers);
      game.spotsRemaining = Math.max(0, game.spotsRemaining - playersToDeduct);
      if (game.spotsRemaining <= 0) {
        game.status = 'full';
      }
      await game.save();

      // Send confirmation email (with language preference from metadata)
      const userLang = metadata.lang === 'es' ? 'es' : 'en';
      const emailSent = await sendConfirmationEmail(rsvp, game, userLang);
      if (!emailSent) {
        // 🔒 SECURITY: Don't log email (PII) - use confirmation code as identifier
        console.error('⚠️ Failed to send confirmation email for:', metadata.confirmationCode);
      }

      console.log('✅ Payment processed:', metadata.confirmationCode, '| Email sent:', emailSent, '| Lang:', userLang);
    } catch (err) {
      console.error('Webhook processing error:', err);
    }
  }

  res.json({ received: true });
});

// Get RSVP by confirmation code
// 🔒 SECURITY: Rate limited to prevent brute-force code guessing
app.get('/api/rsvp/:code', codeLookupLimiter, async (req, res) => {
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
// 🔒 SECURITY: Rate limited to prevent brute-force attacks
app.post('/api/rsvp/:code/cancel', codeLookupLimiter, async (req, res) => {
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

    // 🔒 SECURITY: Uniform error response prevents enumeration
    // Don't reveal whether code exists vs email mismatch
    if (!rsvp || rsvp.player.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(404).json({ error: 'Booking not found or email does not match' });
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

    // Calculate if eligible for refund (cancelled 24+ hours before game)
    let refundEligible = false;
    if (game && rsvp.paymentMethod === 'online') {
      const gameDate = new Date(game.date);
      const now = new Date();
      const hoursUntilGame = (gameDate - now) / (1000 * 60 * 60);
      refundEligible = hoursUntilGame >= 24;
    }

    // Update RSVP status (NO automatic refund - admin will review manually)
    rsvp.status = 'cancelled';
    rsvp.cancelledAt = new Date();
    rsvp.refundEligible = refundEligible;
    // Keep paymentStatus as 'paid' until admin manually processes refund
    if (rsvp.paymentMethod !== 'online') {
      rsvp.paymentStatus = 'cancelled';
    }
    await rsvp.save();

    // Send admin notification for cancellation (so you can manually review refunds)
    if (rsvp.paymentMethod === 'online' && resend) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'LaPista.ATX <noreply@lapista.atx>',
          to: 'lapista.atx@gmail.com',
          subject: `🚨 Cancellation Request - ${rsvp.confirmationCode} ${refundEligible ? '(REFUND ELIGIBLE)' : '(No Refund)'}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #ef4444;">Cancellation Request</h1>
              <p><strong>Confirmation Code:</strong> ${rsvp.confirmationCode}</p>
              <p><strong>Player:</strong> ${rsvp.player.firstName} ${rsvp.player.lastName}</p>
              <p><strong>Email:</strong> ${rsvp.player.email}</p>
              <p><strong>Phone:</strong> ${rsvp.player.phone || 'N/A'}</p>
              <p><strong>Game:</strong> ${game?.title || rsvp.gameId}</p>
              <p><strong>Game Date:</strong> ${game?.date ? new Date(game.date).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Total Players:</strong> ${rsvp.totalPlayers}</p>
              <p><strong>Amount Paid:</strong> $${rsvp.totalAmount?.toFixed(2)}</p>
              <p><strong>Payment Intent:</strong> ${rsvp.stripePaymentIntentId || 'N/A'}</p>
              <hr style="margin: 20px 0;">
              <p style="font-size: 18px; font-weight: bold; color: ${refundEligible ? '#22c55e' : '#ef4444'};">
                ${refundEligible ? '✅ ELIGIBLE FOR REFUND (24+ hours before game)' : '❌ NOT ELIGIBLE (Less than 24 hours before game)'}
              </p>
              <p style="color: #666;">
                To process refund, go to <a href="https://dashboard.stripe.com/payments">Stripe Dashboard</a> and search for the payment intent above.
              </p>
            </div>
          `
        });
        console.log('📧 Admin notification sent for cancellation:', rsvp.confirmationCode);
      } catch (emailErr) {
        console.error('Failed to send admin cancellation notification:', emailErr);
      }
    }

    // Restore spots to game (cap at capacity to avoid overcount, floor at 0)
    if (game) {
      const restoredSpots = game.spotsRemaining + rsvp.totalPlayers;
      const capacity = Number.isFinite(game.capacity) ? game.capacity : 24; // Default to 24 if capacity undefined
      game.spotsRemaining = Math.max(0, Math.min(restoredSpots, capacity));
      if (game.status === 'full' && game.spotsRemaining > 0) {
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
                <a href="${FRONTEND_URL}/game-details.html?gameId=${game.gameId}" 
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
      const refundMessage = rsvp.paymentMethod === 'online'
        ? (refundEligible
            ? '<p>Since you cancelled more than 24 hours before the game, you are eligible for a full refund. Your refund will be processed within 5-10 business days.</p>'
            : '<p>Since you cancelled less than 24 hours before the game, unfortunately you are not eligible for a refund per our cancellation policy.</p>')
        : '';

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'LaPista.ATX <noreply@lapista.atx>',
        to: rsvp.player.email,
        subject: `Booking Cancelled - ${rsvp.confirmationCode}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h1 style="color: #18181b;">Booking Cancelled</h1>
            <p>Hi ${rsvp.player.firstName},</p>
            <p>Your booking <strong>${rsvp.confirmationCode}</strong> has been cancelled.</p>
            ${refundMessage}
            <p>We hope to see you at a future game!</p>
            <a href="${FRONTEND_URL}" style="color: #22c55e;">View Upcoming Games</a>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Cancellation email error:', emailErr);
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      refundEligible: refundEligible,
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
// 🔒 SECURITY: Rate limited to prevent abuse
app.post('/api/templates', adminLimiter, async (req, res) => {
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
// 🔒 SECURITY: Rate limited to prevent abuse
app.post('/api/games/generate-week', adminLimiter, async (req, res) => {
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
  // 🔒 SECURITY: Seed endpoint is DISABLED in production
  // This prevents accidental or malicious data deletion
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  // 🔒 SECURITY: Require secret key to run seed (even in non-production)
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
// 🔒 SECURITY: All endpoints require authentication
// ============================================

// Get notifications for authenticated user
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    // Use authenticated user's email (prevents accessing others' notifications)
    const email = req.user.email.toLowerCase();

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

// Create a notification (internal/admin use only)
// 🔒 SECURITY: Requires admin key to prevent spam-creation
app.post('/api/notifications', adminLimiter, async (req, res) => {
  const authKey = req.headers['x-admin-key'];
  if (authKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

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
// 🔒 SECURITY: Requires auth and verifies ownership
app.patch('/api/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    // First find the notification to verify ownership
    const notification = await Notification.findById(req.params.notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Verify the notification belongs to the authenticated user
    if (notification.userEmail.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to modify this notification' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json(notification);
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Clear all notifications for authenticated user
app.delete('/api/notifications/clear', authenticateToken, async (req, res) => {
  try {
    // Use authenticated user's email (prevents clearing others' notifications)
    const email = req.user.email.toLowerCase();

    await Notification.updateMany(
      { userEmail: email },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error clearing notifications:', err);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Get unread notification count for authenticated user
app.get('/api/notifications/count', authenticateToken, async (req, res) => {
  try {
    // Use authenticated user's email
    const email = req.user.email.toLowerCase();

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
    
    // 🔒 SECURITY: Log user ID instead of email (PII)
    console.log(`✅ New user registered: ${user._id}`);
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
    
    // 🔒 SECURITY: Log user ID instead of email (PII)
    console.log(`✅ User logged in: ${user._id}`);
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
    
    // 🔒 SECURITY: Log user ID instead of email (PII)
    console.log(`✅ Profile updated: ${user._id}`);
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
    
    // 🔒 SECURITY: Log user ID instead of email (PII)
    console.log(`✅ Password changed: ${user._id}`);
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
      
      // 🔒 SECURITY: Log user ID instead of email (PII)
      console.log(`✅ Rating updated: user ${req.user.userId} rated game ${gameId} = ${rating}`);
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
    
    // 🔒 SECURITY: Log user ID instead of email (PII)
    console.log(`✅ New rating: user ${req.user.userId} rated game ${gameId} = ${rating}`);
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
