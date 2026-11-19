/**
 * EF Movie — 10-Foot UI Spatial Navigation Engine for Smart TVs & Remotes
 * Compatible with Android TV, LG webOS, Samsung Tizen, Apple TV, Fire TV, and Keyboard Remotes
 */

const TVNav = {
  activeElement: null,
  isTVMode: false,
  modalContext: null,
  historyStack: [],
  enabled: true,

  init() {
    this.detectTVDevice();
    this.bindEvents();
    this.updateFocusables();
    
    // Set initial focus after DOM render
    setTimeout(() => {
      if (this.isTVMode) {
        this.focusFirstAvailable();
      }
    }, 600);
  },

  detectTVDevice() {
    const ua = navigator.userAgent.toLowerCase();
    const isTV = /smart-tv|smarttv|googletv|appletv|android tv|tizen|web0s|webos|viera|bravia|netcast|crkey|aftb|aftt|firetv|roku|hbbtv/i.test(ua);
    const savedPref = localStorage.getItem('ef_tv_mode');

    if (savedPref !== null) {
      this.isTVMode = savedPref === 'true';
    } else if (isTV || window.innerWidth >= 1920 && !('ontouchstart' in window)) {
      // High-resolution leanback screen without touch defaults to TV-ready mode
      this.isTVMode = isTV;
    }

    this.applyTVModeClass();
  },

  toggleTVMode(forceState) {
    this.isTVMode = forceState !== undefined ? forceState : !this.isTVMode;
    localStorage.setItem('ef_tv_mode', this.isTVMode);
    this.applyTVModeClass();
    
    if (this.isTVMode) {
      this.focusFirstAvailable();
      if (window.Utils) Utils.toast('Smart TV 10-Foot Mode: ON (Use Arrow Keys & OK)');
    } else {
      this.clearFocus();
      if (window.Utils) Utils.toast('Standard Desktop / Touch Mode: ON');
    }
  },

  applyTVModeClass() {
    document.body.classList.toggle('tv-mode', this.isTVMode);
    const btn = document.getElementById('tv-mode-toggle-btn');
    if (btn) {
      btn.classList.toggle('active', this.isTVMode);
      btn.setAttribute('aria-pressed', this.isTVMode);
    }
    const hint = document.getElementById('tv-remote-hint');
    if (hint) {
      hint.style.display = this.isTVMode ? 'flex' : 'none';
    }
  },

  bindEvents() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Clicking any focusable item updates active TV element
    document.addEventListener('click', (e) => {
      const focusable = e.target.closest('.tv-focusable');
      if (focusable) {
        this.setActive(focusable, false);
      }
    });

    // Auto-enable TV mode when user starts navigating with D-pad / arrow keys
    window.addEventListener('keydown', (e) => {
      if (!this.isTVMode && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        this.toggleTVMode(true);
      }
    }, { once: true });
  },

  handleKeyDown(e) {
    if (!this.enabled) return;

    // Smart TV remote key mappings
    const key = e.key;
    const keyCode = e.keyCode;

    // Directional Navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      this.navigateDirection(key.replace('Arrow', '').toLowerCase());
      return;
    }

    // Select / Enter / OK
    if (key === 'Enter' || key === 'Ok' || keyCode === 13 || keyCode === 65385) {
      if (this.activeElement) {
        e.preventDefault();
        this.triggerClick(this.activeElement);
      }
      return;
    }

    // Back / Return / Escape (Android TV back button keyCode 4 or 27)
    if (key === 'Escape' || key === 'Back' || keyCode === 27 || keyCode === 4 || keyCode === 10009) {
      if (this.handleBackAction()) {
        e.preventDefault();
      }
      return;
    }

    // Play / Pause Media Keys on TV Remote
    if (key === 'MediaPlayPause' || keyCode === 179) {
      e.preventDefault();
      const playBtn = document.querySelector('.fv-play-btn, .modal-play-btn, #spotlight-play-btn');
      if (playBtn) playBtn.click();
      return;
    }

    // Quick Search Hotkey '/'
    if (key === '/' && document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.focus();
        this.setActive(searchInput, true);
      }
    }
  },

  navigateDirection(direction) {
    const candidates = this.getFocusables();
    if (candidates.length === 0) return;

    if (!this.activeElement || !document.contains(this.activeElement)) {
      this.focusFirstAvailable();
      return;
    }

    const currentRect = this.activeElement.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2
    };

    let bestCandidate = null;
    let minScore = Infinity;

    for (let el of candidates) {
      if (el === this.activeElement) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      // Check if visible inside viewport
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      let isValidDirection = false;
      let primaryDistance = 0;
      let secondaryDistance = 0;

      switch (direction) {
        case 'up':
          if (dy < -8) {
            isValidDirection = true;
            primaryDistance = Math.abs(dy);
            secondaryDistance = Math.abs(dx);
          }
          break;
        case 'down':
          if (dy > 8) {
            isValidDirection = true;
            primaryDistance = Math.abs(dy);
            secondaryDistance = Math.abs(dx);
          }
          break;
        case 'left':
          if (dx < -8) {
            isValidDirection = true;
            primaryDistance = Math.abs(dx);
            secondaryDistance = Math.abs(dy);
          }
          break;
        case 'right':
          if (dx > 8) {
            isValidDirection = true;
            primaryDistance = Math.abs(dx);
            secondaryDistance = Math.abs(dy);
          }
          break;
      }

      if (isValidDirection) {
        // Weighted Manhattan & Euclidean distance scoring for natural 2D navigation
        const score = primaryDistance + (secondaryDistance * 2.2);
        if (score < minScore) {
          minScore = score;
          bestCandidate = el;
        }
      }
    }

    if (bestCandidate) {
      this.setActive(bestCandidate, true);
      // If moving down and reaching near the bottom, preload next batch of content
      if (direction === 'down' && window.App && typeof App.handleInfiniteScroll === 'function') {
        const rect = bestCandidate.getBoundingClientRect();
        if (rect.bottom >= window.innerHeight - 350) {
          App.handleInfiniteScroll();
        }
      }
    } else if (direction === 'down' && window.App && typeof App.handleInfiniteScroll === 'function') {
      // User pressed Down on the bottom-most row: trigger infinite scroll to load more
      App.handleInfiniteScroll();
    }
  },

  setActive(element, shouldScroll = true) {
    if (!element) return;

    if (this.activeElement) {
      this.activeElement.classList.remove('tv-focused');
      this.activeElement.blur();
    }

    this.activeElement = element;
    this.activeElement.classList.add('tv-focused');

    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
      element.focus();
    }

    if (shouldScroll) {
      const isHorizontalShelf = element.closest('.media-shelf, .details-cast, .details-similar, .platform-grid');
      const insideModal = element.closest('.modal-overlay, .details-modal, .player-modal');

      if (insideModal) {
        // If navigating inside a horizontal list inside the modal (e.g. cast or recommendations row)
        const modalHorizontalRow = element.closest('.details-cast, .details-similar');
        if (modalHorizontalRow) {
          const rowRect = modalHorizontalRow.getBoundingClientRect();
          const elRect = element.getBoundingClientRect();
          const delta = elRect.left - rowRect.left - (rowRect.width / 2) + (elRect.width / 2);
          modalHorizontalRow.scrollBy({ left: delta, behavior: 'smooth' });
        }
        // Strictly guarantee modal and overlay horizontal scroll position is locked to 0
        const overlay = element.closest('.modal-overlay, .player-modal');
        if (overlay && overlay.scrollLeft !== 0) overlay.scrollLeft = 0;
        const inner = element.closest('.details-modal');
        if (inner && inner.scrollLeft !== 0) inner.scrollLeft = 0;
      } else {
        // Standard page navigation
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: isHorizontalShelf ? 'center' : 'nearest'
        });
      }
    }
  },

  clearFocus() {
    if (this.activeElement) {
      this.activeElement.classList.remove('tv-focused');
      this.activeElement = null;
    }
  },

  focusFirstAvailable() {
    const list = this.getFocusables();
    if (list.length > 0) {
      this.setActive(list[0], false);
    }
  },

  getFocusables() {
    const root = this.modalContext || document;
    const items = Array.from(root.querySelectorAll('.tv-focusable:not([disabled]):not([style*="display: none"])'));
    return items.filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return style.visibility !== 'hidden' && style.display !== 'none' && (rect.width > 0 || rect.height > 0);
    });
  },

  updateFocusables() {
    // Prevent internal card action buttons and modal close buttons from stealing TV focus
    document.querySelectorAll('.media-card .card-action-btn, .media-card .card-quick-actions, .media-card button, .modal-close-btn').forEach(el => {
      el.classList.remove('tv-focusable');
      el.removeAttribute('tabindex');
    });

    // Automatically flag interactive cards, buttons, tabs, links as tv-focusable (never modal-close-btn)
    const elements = document.querySelectorAll(
      '.media-card, .shelf-btn, .nav-link, .nav-btn, .btn, .server-tab, .episode-card, .filter-chip, .platform-pill, .spotlight-btn, .quick-tab, .season-select, .catalog-filter-btn'
    );
    elements.forEach(el => {
      if (el.closest('.media-card') && el !== el.closest('.media-card')) return;
      if (el.classList.contains('modal-close-btn')) return;
      if (!el.classList.contains('tv-focusable')) {
        el.classList.add('tv-focusable');
        el.setAttribute('tabindex', '0');
      }
    });
  },

  setModalContext(modalElement) {
    if (!modalElement) return;
    this.historyStack.push(this.activeElement);
    this.modalContext = modalElement;

    // Strict Scroll Reset to guarantee modal is centered and never scrolled sideways
    modalElement.scrollTop = 0;
    modalElement.scrollLeft = 0;
    const innerModal = modalElement.querySelector('.details-modal, .player-modal');
    if (innerModal) {
      innerModal.scrollTop = 0;
      innerModal.scrollLeft = 0;
      innerModal.addEventListener('scroll', () => {
        if (innerModal.scrollLeft !== 0) innerModal.scrollLeft = 0;
      }, { passive: true });
    }
    modalElement.addEventListener('scroll', () => {
      if (modalElement.scrollLeft !== 0) modalElement.scrollLeft = 0;
    }, { passive: true });
    if (window.scrollX > 0) {
      window.scrollTo(0, window.scrollY);
    }

    this.updateFocusables();

    // Auto-focus the primary action button (Stream / Play button), NEVER the close button on the right edge!
    setTimeout(() => {
      const focusables = this.getFocusables();
      if (focusables.length === 0) return;

      const primaryBtn = modalElement.querySelector('.btn-primary, #details-play-btn, #quick-play-btn, .fv-play-btn') ||
                         focusables.find(el => !el.classList.contains('modal-close-btn') && !el.classList.contains('modal-close')) ||
                         focusables[0];

      if (primaryBtn) {
        // shouldScroll = false prevents any unwanted scroll shifts on modal open
        this.setActive(primaryBtn, false);
      }
    }, 100);
  },

  clearModalContext() {
    this.modalContext = null;
    const previous = this.historyStack.pop();
    if (previous && document.contains(previous)) {
      this.setActive(previous, false);
    } else {
      this.focusFirstAvailable();
    }
  },

  handleBackAction() {
    // 1. If video player modal is open, close it
    const playerModal = document.getElementById('player-modal');
    if (playerModal && playerModal.classList.contains('active')) {
      if (window.Player) window.Player.close();
      return true;
    }

    // 2. If details modal is open, close it
    const detailsModal = document.getElementById('details-modal');
    if (detailsModal && detailsModal.classList.contains('active')) {
      if (window.Modals) window.Modals.closeDetails();
      return true;
    }

    // 3. If quick view modal is open, close it
    const qvModal = document.getElementById('quick-modal');
    if (qvModal && qvModal.classList.contains('active')) {
      if (window.Modals) window.Modals.closeQuick();
      return true;
    }

    // 4. If search bar is active or has text, clear it
    const searchInput = document.getElementById('search-input');
    if (searchInput && document.activeElement === searchInput) {
      searchInput.blur();
      this.focusFirstAvailable();
      return true;
    }

    return false;
  },

  triggerClick(element) {
    if (!element) return;
    element.classList.add('tv-pressed');
    setTimeout(() => element.classList.remove('tv-pressed'), 200);

    element.click();
  }
};

window.TVNav = TVNav;
