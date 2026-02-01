/* ============================================
   LaPista.ATX - Authentication Service
   ============================================
   Client-side authentication management for the website.
   
   ⚠️ SECURITY NOTE:
   This implementation uses localStorage for token storage.
   This is acceptable for this app given:
   - CSP headers mitigate XSS risks
   - Limited PII stored (names, emails)
   - Per security assessment risk acceptance
   
   See SECURITY_ASSESSMENT.md for full context.
   ============================================ */

const AuthService = {
  _user: null,
  _token: null,
  _listeners: [],
  _initialized: false,

  // ========================================
  // INITIALIZATION
  // ========================================

  /**
   * Initialize auth state from localStorage
   * Call this on page load
   */
  async init() {
    // Load from localStorage
    this._token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('authUser');
    
    if (userData) {
      try {
        this._user = JSON.parse(userData);
      } catch {
        this._user = null;
      }
    }

    // If we have a token, verify it with the server
    if (this._token) {
      try {
        const response = await fetch(`${LAPISTA_CONFIG.API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${this._token}`
          }
        });

        if (response.ok) {
          const serverUser = await response.json();
          this._user = serverUser;
          localStorage.setItem('authUser', JSON.stringify(serverUser));
        } else if (response.status === 401) {
          // Token invalid/expired - clear auth
          this._clearAuthData();
        }
      } catch (error) {
        // Network error - keep local data for offline support
        console.warn('[Auth] Session verification failed:', error.message);
      }
    }

    this._initialized = true;
    this._notifyListeners();
    this._updateUI();
    
    return this;
  },

  /**
   * Check if auth has been initialized
   */
  isReady() {
    return this._initialized;
  },

  // ========================================
  // STATE GETTERS
  // ========================================

  /**
   * Get current user
   */
  getUser() {
    return this._user;
  },

  /**
   * Get auth token
   */
  getToken() {
    return this._token;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this._token && !!this._user;
  },

  /**
   * Get user's display name
   */
  getDisplayName() {
    if (!this._user) return null;
    return this._user.firstName || this._user.email?.split('@')[0] || 'User';
  },

  /**
   * Get user's initials for avatar
   */
  getInitials() {
    if (!this._user) return '?';
    const first = this._user.firstName?.[0] || '';
    const last = this._user.lastName?.[0] || '';
    return (first + last).toUpperCase() || this._user.email?.[0]?.toUpperCase() || '?';
  },

  // ========================================
  // AUTH ACTIONS
  // ========================================

  /**
   * Sign up with email and password
   */
  async signUp({ email, password, firstName, lastName, phone }) {
    try {
      const response = await fetch(`${LAPISTA_CONFIG.API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, firstName, lastName, phone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store auth data
      this._setAuthData(data.user, data.token);
      
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    try {
      const response = await fetch(`${LAPISTA_CONFIG.API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid email or password');
      }

      // Store auth data
      this._setAuthData(data.user, data.token);
      
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Sign out
   */
  signOut() {
    this._clearAuthData();
    
    // Redirect to home if on a protected page
    // Check for auth-required meta tag or fallback to known pages
    const authRequired = document.querySelector('meta[name="auth-required"]');
    const protectedPages = ['profile-page.html', 'edit-profile-page.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (authRequired?.content === 'true' || protectedPages.includes(currentPage)) {
      window.location.href = 'index.html';
    }
  },

  // ========================================
  // PASSWORD MANAGEMENT
  // ========================================

  /**
   * Request password reset email
   */
  async forgotPassword(email) {
    try {
      const response = await fetch(`${LAPISTA_CONFIG.API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      // Always return success to prevent email enumeration
      return { success: true, message: data.message || 'If an account exists, a reset email has been sent.' };
    } catch (error) {
      return { success: true, message: 'If an account exists, a reset email has been sent.' };
    }
  },

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await fetch(`${LAPISTA_CONFIG.API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Change password (when logged in)
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await fetch(`${LAPISTA_CONFIG.API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ========================================
  // PROFILE MANAGEMENT
  // ========================================

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    try {
      const response = await fetch(`${LAPISTA_CONFIG.API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._token}`
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update local user data
      this._user = data;
      localStorage.setItem('authUser', JSON.stringify(data));
      this._notifyListeners();
      this._updateUI();

      return { success: true, user: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ========================================
  // INTERNAL METHODS
  // ========================================

  /**
   * Store auth data
   */
  _setAuthData(user, token) {
    this._user = user;
    this._token = token;
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUser', JSON.stringify(user));
    this._notifyListeners();
    this._updateUI();
  },

  /**
   * Clear auth data
   */
  _clearAuthData() {
    this._user = null;
    this._token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    this._notifyListeners();
    this._updateUI();
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback) {
    this._listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this._listeners = this._listeners.filter(l => l !== callback);
    };
  },

  /**
   * Notify listeners of auth state change
   */
  _notifyListeners() {
    this._listeners.forEach(callback => {
      try {
        callback(this._user, this.isAuthenticated());
      } catch (e) {
        console.error('[Auth] Listener error:', e);
      }
    });
  },

  /**
   * Update UI elements based on auth state
   */
  _updateUI() {
    // Update all auth-aware elements
    const authButtons = document.querySelectorAll('[data-auth-button]');
    const userMenus = document.querySelectorAll('[data-user-menu]');
    const userNames = document.querySelectorAll('[data-user-name]');
    const userInitials = document.querySelectorAll('[data-user-initials]');

    if (this.isAuthenticated()) {
      // Show user menu, hide login button
      authButtons.forEach(el => el.classList.add('hidden'));
      userMenus.forEach(el => el.classList.remove('hidden'));
      userNames.forEach(el => el.textContent = this.getDisplayName());
      userInitials.forEach(el => el.textContent = this.getInitials());
    } else {
      // Show login button, hide user menu
      authButtons.forEach(el => el.classList.remove('hidden'));
      userMenus.forEach(el => el.classList.add('hidden'));
    }
  },

  /**
   * Make authenticated API request
   */
  async fetch(url, options = {}) {
    const headers = {
      ...options.headers
    };

    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle token expiry
    if (response.status === 401) {
      this._clearAuthData();
      // Optionally redirect to login
    }

    return response;
  }
};

// ========================================
// AUTO-INITIALIZE ON DOM READY
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  AuthService.init();
});

// ========================================
// UTILITY: Require authentication
// ========================================
/**
 * Check authentication and redirect if not logged in
 * Returns the user object if authenticated, or null (and redirects)
 * 
 * Usage:
 *   const user = await requireAuth();
 *   if (!user) return;
 */
async function requireAuth(redirectTo = 'login-page.html') {
  // Wait for auth to be ready if not initialized yet
  if (!AuthService.isReady()) {
    await new Promise(resolve => {
      AuthService.onAuthStateChange(() => resolve());
    });
  }
  
  if (!AuthService.isAuthenticated()) {
    // Store current page for redirect after login
    localStorage.setItem('authRedirect', window.location.href);
    window.location.href = redirectTo;
    return null;
  }
  
  return AuthService.getUser();
}

// ========================================
// UTILITY: Show toast notification
// ========================================
function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-y-full opacity-0 ${
    type === 'success' ? 'bg-green-600 text-white' :
    type === 'error' ? 'bg-red-600 text-white' :
    'bg-zinc-900 text-white'
  }`;
  
  // Build toast content safely using textContent for message
  const wrapper = document.createElement('div');
  wrapper.className = 'flex items-center gap-3';
  
  const icon = document.createElement('span');
  icon.className = 'iconify';
  icon.setAttribute('data-icon', 
    type === 'success' ? 'lucide:check-circle' :
    type === 'error' ? 'lucide:alert-circle' : 'lucide:info'
  );
  icon.setAttribute('data-width', '20');
  
  const text = document.createElement('span');
  text.className = 'font-medium';
  text.textContent = message; // Safe: uses textContent, not innerHTML
  
  wrapper.appendChild(icon);
  wrapper.appendChild(text);
  toast.appendChild(wrapper);
  
  document.body.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-full', 'opacity-0');
  });
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('translate-y-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthService, requireAuth, showToast };
}
