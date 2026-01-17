/**
 * LaPista.ATX - Shared Constants
 * ===============================
 * Single source of truth for business logic, pricing, and links
 * Used by both the App and Website for consistency
 * 
 * IMPORTANT: Keep this in sync with the Website's config.js
 */

const LAPISTA = {
  // ============================================
  // BRAND
  // ============================================
  brand: {
    name: 'LaPista.ATX',
    tagline: "Austin's Pickup Soccer Community",
    founded: 2025,
    city: 'Austin',
    state: 'TX',
  },

  // ============================================
  // PRICING
  // ============================================
  pricing: {
    pricePerPerson: 5.99,
    currency: 'USD',
    currencySymbol: '$',
    
    // Helper to format price
    format(amount) {
      return `${this.currencySymbol}${amount.toFixed(2)}`;
    },
    
    // Calculate total for players
    calculateTotal(playerCount) {
      return playerCount * this.pricePerPerson;
    },
  },

  // ============================================
  // BOOKING RULES
  // ============================================
  booking: {
    maxGuests: 4,           // Max guests per booking
    maxCapacity: 24,        // Max players per game
    minPlayers: 4,          // Min for game to happen
    cancellationHours: 24,  // Hours before for full refund
    holdTimeMinutes: 5,     // Checkout hold time
  },

  // ============================================
  // SOCIAL & CONTACT
  // ============================================
  social: {
    instagram: {
      handle: '@lapista.atx',
      url: 'https://www.instagram.com/lapista.atx',
    },
    whatsapp: {
      url: 'https://chat.whatsapp.com/Gqkat9jvT1cAVURDjR9DqA',
      displayName: 'LaPista WhatsApp Group',
    },
    email: 'lapista.atx@gmail.com',
    cashApp: '$bhrizzo',
  },

  // ============================================
  // API ENDPOINTS
  // ============================================
  api: {
    // Auto-detect environment
    getBaseUrl() {
      // Check if we're in the app (could be served from different origin)
      const hostname = window.location.hostname;
      
      // Local development
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3001';
      }
      
      // File protocol (local development without server)
      // For production mobile app, update this to your deployed API URL
      if (window.location.protocol === 'file:') {
        return 'http://localhost:3001';
      }
      
      // Production - same origin
      return window.location.origin;
    },
    
    // Common endpoints
    endpoints: {
      games: '/api/games',
      game: (id) => `/api/games/${id}`,
      rsvp: '/api/rsvp',
      checkout: '/api/checkout',
      contact: '/api/contact',
      waitlist: '/api/waitlist',
      health: '/api/health',
    },
  },

  // ============================================
  // VENUES (Reference data)
  // ============================================
  venues: {
    shadyLane: {
      slug: 'shady-lane',
      name: 'Shady Lane Fields',
      address: '757 Shady Ln, Austin, TX 78702',
      mapsUrl: 'https://maps.google.com/?q=757+Shady+Ln+Austin+TX+78702',
    },
    cesarChavez: {
      slug: 'cesar-chavez',
      name: 'Cesar Chavez Fields',
      address: 'Cesar Chavez St, Austin, TX',
      mapsUrl: 'https://maps.google.com/?q=Cesar+Chavez+Fields+Austin+TX',
    },
    prairieLane: {
      slug: 'prairie-lane',
      name: 'Prairie Lane Fields',
      address: '4005 Prairie Ln, Austin, TX 78728',
      mapsUrl: 'https://maps.google.com/?q=4005+Prairie+Ln+Austin+TX+78728',
    },
  },

  // ============================================
  // UI CONSTANTS
  // ============================================
  ui: {
    colors: {
      primary: '#22c55e',    // green-500
      primaryDark: '#16a34a', // green-600
      dark: '#18181b',       // zinc-900
      light: '#fafafa',      // zinc-50
      border: '#e4e4e7',     // zinc-200
    },
    fonts: {
      heading: "'Oswald', sans-serif",
      body: "'Space Grotesk', sans-serif",
    },
  },

  // ============================================
  // GAME RULES (displayed to users)
  // ============================================
  rules: {
    whatToBring: [
      'Turf shoes or cleats (no metal studs)',
      'Bring a white and dark shirt',
      'Water bottle',
      'White and dark shirt (for teams)',
    ],
    arriveEarly: 10, // minutes
    gameDuration: 60, // minutes
  },

  // ============================================
  // LEGAL
  // ============================================
  legal: {
    waiverRequired: true,
    minAge: 18,
    refundPolicy: 'Full refund if cancelled 24+ hours before game',
  },
};

// Freeze to prevent modifications
Object.freeze(LAPISTA);
Object.freeze(LAPISTA.brand);
Object.freeze(LAPISTA.pricing);
Object.freeze(LAPISTA.booking);
Object.freeze(LAPISTA.social);
Object.freeze(LAPISTA.api);
Object.freeze(LAPISTA.venues);
Object.freeze(LAPISTA.ui);
Object.freeze(LAPISTA.rules);
Object.freeze(LAPISTA.legal);

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LAPISTA;
}
