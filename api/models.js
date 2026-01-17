const mongoose = require('mongoose');

// Game Schema
const gameSchema = new mongoose.Schema({
  gameId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  venue: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    mapsUrl: { type: String }
  },
  dayOfWeek: { 
    type: String, 
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true 
  },
  time: { 
    type: String, 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  price: { 
    type: Number, 
    default: 5.99 
  },
  capacity: { 
    type: Number, 
    default: 24 
  },
  spotsRemaining: { 
    type: Number, 
    default: 24 
  },
  status: { 
    type: String, 
    enum: ['scheduled', 'open', 'full', 'in-progress', 'completed', 'cancelled'],
    default: 'open' 
  }
}, { timestamps: true });

// RSVP Schema
const rsvpSchema = new mongoose.Schema({
  gameId: { 
    type: String, 
    required: true,
    ref: 'Game'
  },
  confirmationCode: {
    type: String,
    required: true,
    unique: true
  },
  player: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String }
  },
  guests: [{
    firstName: String,
    lastName: String
  }],
  totalPlayers: { 
    type: Number, 
    default: 1 
  },
  totalAmount: { 
    type: Number, 
    required: true 
  },
  paymentMethod: { 
    type: String, 
    enum: ['online', 'cash', 'cashapp'],
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'refunded', 'cancelled'],
    default: 'pending' 
  },
  stripePaymentIntentId: String,
  stripeSessionId: String,
  stripeRefundId: String,
  waiverAccepted: { 
    type: Boolean, 
    required: true,
    default: false 
  },
  // 🔒 Legal compliance: track when and from where waiver was accepted
  waiverAcceptedAt: {
    type: Date
  },
  waiverAcceptedIP: {
    type: String
  },
  status: { 
    type: String, 
    enum: ['confirmed', 'pending', 'cancelled', 'no-show'],
    default: 'pending' 
  },
  checkedIn: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// 🔒 Index for fast duplicate RSVP lookups
rsvpSchema.index({ gameId: 1, 'player.email': 1 });

// Venue Schema (for reference)
const venueSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, default: 'Austin' },
  state: { type: String, default: 'TX' },
  zip: { type: String },
  mapsUrl: { type: String },
  mapsEmbed: { type: String },
  photo: { type: String }
}, { timestamps: true });

const Game = mongoose.model('Game', gameSchema);
const RSVP = mongoose.model('RSVP', rsvpSchema);
const Venue = mongoose.model('Venue', venueSchema);

// ============================================
// WAITLIST SCHEMA
// ============================================
const waitlistSchema = new mongoose.Schema({
  gameId: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  phone: String,
  notified: {
    type: Boolean,
    default: false
  },
  notifiedAt: Date
}, { timestamps: true });

// Prevent duplicate waitlist entries
waitlistSchema.index({ gameId: 1, email: 1 }, { unique: true });

const Waitlist = mongoose.model('Waitlist', waitlistSchema);

// ============================================
// GAME TEMPLATE SCHEMA (for recurring games)
// ============================================
const gameTemplateSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  dayOfWeek: { 
    type: String, 
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true 
  },
  time: { 
    type: String, 
    required: true 
  },
  venue: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    mapsUrl: { type: String }
  },
  price: { 
    type: Number, 
    default: 5.99 
  },
  capacity: { 
    type: Number, 
    default: 24 
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const GameTemplate = mongoose.model('GameTemplate', gameTemplateSchema);

// ============================================
// COMMENT SCHEMA (for game discussions)
// ============================================
const commentSchema = new mongoose.Schema({
  gameId: { 
    type: String, 
    required: true,
    index: true
  },
  author: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    initials: { type: String } // e.g., "CM" for Carlos M.
  },
  text: { 
    type: String, 
    required: true,
    maxLength: 500
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const Comment = mongoose.model('Comment', commentSchema);

// ============================================
// NOTIFICATION SCHEMA (for user notifications)
// ============================================
const notificationSchema = new mongoose.Schema({
  userEmail: { 
    type: String, 
    required: true,
    index: true
  },
  type: { 
    type: String, 
    enum: ['game_reminder', 'payment_confirmed', 'game_complete', 'achievement', 'promo', 'new_comment'],
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  // Reference data for linking
  gameId: String,
  confirmationCode: String,
  promoCode: String,
  // Metadata
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  // For game reminders - the game's start time
  gameStartTime: Date
}, { timestamps: true });

// Index for efficient queries
notificationSchema.index({ userEmail: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

// ============================================
// USER SCHEMA (for authentication & profiles)
// ============================================
const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: { 
    type: String,
    required: function() { return this.authProvider === 'email'; }
  },
  firstName: { 
    type: String, 
    required: true,
    trim: true
  },
  lastName: { 
    type: String, 
    required: true,
    trim: true
  },
  phone: { 
    type: String,
    trim: true
  },
  avatar: String, // URL to profile photo
  skillLevel: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced', 'pro'],
    default: 'intermediate'
  },
  authProvider: { 
    type: String, 
    enum: ['email', 'google', 'apple'],
    default: 'email'
  },
  googleId: String,
  appleId: String,
  emailVerified: { 
    type: Boolean, 
    default: false 
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  // Stats - calculated from RSVPs and ratings
  gamesPlayed: { 
    type: Number, 
    default: 0 
  },
  noShows: { 
    type: Number, 
    default: 0 
  },
  weekStreak: { 
    type: Number, 
    default: 0 
  },
  lastPlayedWeek: String, // ISO week string for streak calculation, e.g., "2026-W01"
  averageRating: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  // User preferences
  notificationsEnabled: { 
    type: Boolean, 
    default: true 
  },
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: Date
}, { timestamps: true });

// Index for fast email lookups
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);

// ============================================
// RATING SCHEMA (for game/player ratings)
// ============================================
const ratingSchema = new mongoose.Schema({
  gameId: { 
    type: String, 
    required: true 
  },
  raterEmail: { 
    type: String, 
    required: true,
    lowercase: true
  },
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxLength: 500
  }
}, { timestamps: true });

// Prevent duplicate ratings (one rating per user per game)
ratingSchema.index({ gameId: 1, raterEmail: 1 }, { unique: true });

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = { Game, RSVP, Venue, Waitlist, GameTemplate, Comment, Notification, User, Rating };
