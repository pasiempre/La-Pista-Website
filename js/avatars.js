/* ============================================
   LaPista.ATX - Avatar Gallery System
   ============================================
   Pre-selected photos of legendary footballers
   User selects a photo, but their OWN name is displayed
   ============================================ */

const AVATAR_GALLERY = {
  // Avatar categories
  categories: [
    { id: 'legends', name: 'Legends', icon: 'lucide:trophy' },
    { id: 'current', name: 'Current Stars', icon: 'lucide:star' },
    { id: 'women', name: "Women's Stars", icon: 'lucide:stars' }
  ],

  // Base path for avatar images
  // Photos should be placed in /images/avatars/ folder
  imagePath: '/images/avatars/',

  // Avatar definitions - photos of legendary players
  // Each photo file should be named: {id}.jpg (e.g., messi.jpg, ronaldo.jpg)
  avatars: [
    // Legends
    { id: 'messi', category: 'legends', fallbackColor: '#75aadb' },
    { id: 'ronaldo', category: 'legends', fallbackColor: '#dc2626' },
    { id: 'pele', category: 'legends', fallbackColor: '#fbbf24' },
    { id: 'maradona', category: 'legends', fallbackColor: '#60a5fa' },
    { id: 'zidane', category: 'legends', fallbackColor: '#1e3a8a' },
    { id: 'ronaldinho', category: 'legends', fallbackColor: '#fcd34d' },
    
    // Current Stars (Men)
    { id: 'mbappe', category: 'current', fallbackColor: '#1e3a8a' },
    { id: 'haaland', category: 'current', fallbackColor: '#6ee7b7' },
    { id: 'vinicius', category: 'current', fallbackColor: '#fef3c7' },
    { id: 'bellingham', category: 'current', fallbackColor: '#fef3c7' },
    { id: 'salah', category: 'current', fallbackColor: '#dc2626' },
    { id: 'debruyne', category: 'current', fallbackColor: '#6ee7b7' },
    { id: 'kane', category: 'current', fallbackColor: '#dc2626' },
    { id: 'lamine', category: 'current', fallbackColor: '#a50044' },
    { id: 'olise', category: 'current', fallbackColor: '#0053a0' },
    { id: 'raphinha', category: 'current', fallbackColor: '#a50044' },
    
    // Women's Stars
    { id: 'marta', category: 'women', fallbackColor: '#fbbf24' },      // Brazil - Yellow
    { id: 'alexis', category: 'women', fallbackColor: '#1e3a8a' },     // USWNT - Navy
    { id: 'aitana', category: 'women', fallbackColor: '#a50044' },     // Barcelona - Maroon
    { id: 'kerr', category: 'women', fallbackColor: '#fbbf24' }        // Australia - Gold
  ],

  // Get avatar by ID
  getById(avatarId) {
    return this.avatars.find(a => a.id === avatarId) || null;
  },

  // Get avatars by category
  getByCategory(categoryId) {
    return this.avatars.filter(a => a.category === categoryId);
  },

  // Get all avatars
  getAll() {
    return this.avatars;
  },

  // Get image URL for an avatar
  getImageUrl(avatarId) {
    return `${this.imagePath}${avatarId}.jpg`;
  },

  // Render avatar HTML (for display) - just the photo, no names
  renderAvatar(avatarId, size = 'md') {
    const avatar = this.getById(avatarId);
    if (!avatar) {
      // Default avatar placeholder
      return `<div class="avatar-default avatar-${size}">?</div>`;
    }

    const sizes = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-16 h-16',
      xl: 'w-24 h-24'
    };

    const sizeClass = sizes[size] || sizes.md;
    const imageUrl = this.getImageUrl(avatarId);

    // Photo with fallback to colored circle if image fails to load
    return `
      <div class="avatar-photo ${sizeClass}" style="--fallback-color: ${avatar.fallbackColor}">
        <img src="${imageUrl}" alt="" class="avatar-img" onerror="this.style.display='none'; this.parentElement.classList.add('avatar-fallback');">
      </div>
    `;
  },

  // Render avatar picker (for selection) - photos only, no names
  renderPicker(selectedId = null) {
    let html = '<div class="avatar-picker">';
    
    this.categories.forEach(category => {
      const avatarsInCategory = this.getByCategory(category.id);
      
      html += `
        <div class="avatar-category mb-6">
          <h4 class="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
            <span class="iconify" data-icon="${category.icon}" data-width="16"></span>
            ${category.name}
          </h4>
          <div class="grid grid-cols-6 gap-3">
      `;
      
      avatarsInCategory.forEach(avatar => {
        const isSelected = avatar.id === selectedId;
        const imageUrl = this.getImageUrl(avatar.id);
        html += `
          <button type="button" 
                  class="avatar-option ${isSelected ? 'selected' : ''}" 
                  data-avatar-id="${avatar.id}">
            <div class="avatar-photo w-12 h-12" style="--fallback-color: ${avatar.fallbackColor}">
              <img src="${imageUrl}" alt="" class="avatar-img" onerror="this.style.display='none'; this.parentElement.classList.add('avatar-fallback');">
            </div>
          </button>
        `;
      });
      
      html += '</div></div>';
    });
    
    html += '</div>';
    return html;
  }
};

// CSS for avatars (injected once)
(function injectAvatarStyles() {
  if (document.getElementById('avatar-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'avatar-styles';
  style.textContent = `
    /* Photo avatar */
    .avatar-photo {
      position: relative;
      border-radius: 50%;
      overflow: hidden;
      background: var(--fallback-color, #22c55e);
    }
    
    .avatar-photo .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    /* Fallback when image fails to load */
    .avatar-photo.avatar-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .avatar-photo.avatar-fallback::after {
      content: '';
      width: 40%;
      height: 40%;
      background: rgba(255,255,255,0.3);
      border-radius: 50%;
    }
    
    /* Avatar picker */
    .avatar-picker {
      max-height: 400px;
      overflow-y: auto;
    }
    
    .avatar-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.5rem;
      border-radius: 0.75rem;
      border: 2px solid transparent;
      background: #f4f4f5;
      transition: all 0.15s ease;
      cursor: pointer;
    }
    
    .avatar-option:hover {
      background: #e4e4e7;
      transform: scale(1.05);
    }
    
    .avatar-option.selected {
      border-color: #22c55e;
      background: #f0fdf4;
    }
    
    .avatar-option.selected .avatar-photo {
      box-shadow: 0 0 0 3px #22c55e;
    }
    
    /* Default avatar (initials only) */
    .avatar-default {
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
    }
    
    .avatar-sm { width: 2rem; height: 2rem; font-size: 0.75rem; }
    .avatar-md { width: 2.5rem; height: 2.5rem; font-size: 0.875rem; }
    .avatar-lg { width: 4rem; height: 4rem; font-size: 1.25rem; }
    .avatar-xl { width: 6rem; height: 6rem; font-size: 1.875rem; }
  `;
  document.head.appendChild(style);
})();

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AVATAR_GALLERY };
}
