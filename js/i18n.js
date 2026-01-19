/**
 * LaPista.ATX - Internationalization (i18n)
 * Handles language switching between English and Spanish
 */

const I18N = {
  // Current language (default: English)
  currentLang: 'en',

  // Storage key
  STORAGE_KEY: 'lapista_language',

  /**
   * Initialize i18n system
   */
  init() {
    // Load saved language preference or detect from browser
    const savedLang = localStorage.getItem(this.STORAGE_KEY);
    if (savedLang && (savedLang === 'en' || savedLang === 'es')) {
      this.currentLang = savedLang;
    } else {
      // Detect from browser language
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang && browserLang.startsWith('es')) {
        this.currentLang = 'es';
      }
    }

    // Apply translations
    this.applyTranslations();

    // Setup toggle buttons
    this.setupToggles();

    console.log('🌐 Language initialized:', this.currentLang);
  },

  /**
   * Get translation for a key
   * @param {string} key - Translation key (e.g., 'nav.games')
   * @param {string} fallback - Fallback text if key not found
   * @returns {string} Translated text
   */
  t(key, fallback = '') {
    const translations = window.TRANSLATIONS?.[this.currentLang];
    if (!translations) return fallback || key;
    return translations[key] || fallback || key;
  },

  /**
   * Switch language
   * @param {string} lang - Language code ('en' or 'es')
   */
  setLanguage(lang) {
    if (lang !== 'en' && lang !== 'es') return;

    this.currentLang = lang;
    localStorage.setItem(this.STORAGE_KEY, lang);

    // Apply translations
    this.applyTranslations();

    // Update toggle buttons
    this.updateToggles();

    console.log('🌐 Language changed to:', lang);
  },

  /**
   * Toggle between languages
   */
  toggle() {
    const newLang = this.currentLang === 'en' ? 'es' : 'en';
    this.setLanguage(newLang);
  },

  /**
   * Apply translations to all elements with data-i18n attribute
   */
  applyTranslations() {
    // Translate text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = this.t(key, el.textContent);
      el.textContent = translation;
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translation = this.t(key, el.placeholder);
      el.placeholder = translation;
    });

    // Translate aria-labels
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      const translation = this.t(key, el.getAttribute('aria-label'));
      el.setAttribute('aria-label', translation);
    });

    // Translate titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const translation = this.t(key, el.title);
      el.title = translation;
    });

    // Update HTML lang attribute
    document.documentElement.lang = this.currentLang;
  },

  /**
   * Setup toggle button click handlers
   */
  setupToggles() {
    document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });
    });
    this.updateToggles();
  },

  /**
   * Update toggle button text
   */
  updateToggles() {
    document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
      // Show the opposite language as the toggle option
      btn.textContent = this.currentLang === 'en' ? 'ES' : 'EN';
      btn.setAttribute('aria-label', this.currentLang === 'en' ? 'Cambiar a Español' : 'Switch to English');
    });

    // Update any current language indicators
    document.querySelectorAll('[data-lang-current]').forEach(el => {
      el.textContent = this.currentLang.toUpperCase();
    });
  },

  /**
   * Get current language code
   * @returns {string} 'en' or 'es'
   */
  getLanguage() {
    return this.currentLang;
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => I18N.init());
} else {
  I18N.init();
}

// Make available globally
window.I18N = I18N;
window.t = (key, fallback) => I18N.t(key, fallback);
