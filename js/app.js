/**
 * EF Movie — Core Application Architecture & TMDB Service
 * Optimized for Smart TVs, Desktops, Tablets, and Smartphones
 */

const CONFIG = {
  API_KEY: '05902896074695709d7763505bb88b4d',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMG_W185: 'https://image.tmdb.org/t/p/w185',
  IMG_W342: 'https://image.tmdb.org/t/p/w342',
  IMG_W500: 'https://image.tmdb.org/t/p/w500',
  IMG_W780: 'https://image.tmdb.org/t/p/w780',
  IMG_ORIG: 'https://image.tmdb.org/t/p/original',
  CACHE_TTL: 30 * 60 * 1000 // 30 minutes in ms
};

/* --- API SERVICE WITH SMART IN-MEMORY & LOCAL STORAGE CACHING --- */
const API = {
  cache: new Map(),
  IMG_W500: CONFIG.IMG_W500,
  IMG_ORIG: CONFIG.IMG_ORIG,

  async request(endpoint, params = {}) {
    params.api_key = CONFIG.API_KEY;
    const query = new URLSearchParams(params).toString();
    const url = `${CONFIG.BASE_URL}${endpoint}?${query}`;

    // Check memory cache
    const cached = this.cache.get(url);
    if (cached && (Date.now() - cached.time < CONFIG.CACHE_TTL)) {
      return cached.data;
    }

    try {
      Utils.startProgress();
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      this.cache.set(url, { data, time: Date.now() });
      return data;
    } catch (err) {
      console.error('API Error:', url, err);
      throw err;
    } finally {
      Utils.endProgress();
    }
  },

  getTrending(type = 'all', time = 'week', page = 1) {
    return this.request(`/trending/${type}/${time}`, { page });
  },

  getPopular(type = 'movie', page = 1) {
    return this.request(`/${type}/popular`, { page });
  },

  getTopRated(type = 'movie', page = 1) {
    return this.request(`/${type}/top_rated`, { page });
  },

  getUpcoming(page = 1) {
    return this.request('/movie/upcoming', { page });
  },

  getNowPlaying(page = 1) {
    return this.request('/movie/now_playing', { page });
  },

  getByGenre(type = 'movie', genreId, page = 1) {
    return this.request(`/discover/${type}`, {
      with_genres: genreId,
      sort_by: 'popularity.desc',
      page
    });
  },

  getTVByGenre(genreId, page = 1) {
    return this.request('/discover/tv', {
      with_genres: genreId,
      sort_by: 'popularity.desc',
      page
    });
  },

  getKDrama(page = 1) {
    return this.request('/discover/tv', {
      with_original_language: 'ko',
      sort_by: 'popularity.desc',
      page
    });
  },

  getAnime(page = 1) {
    return this.request('/discover/tv', {
      with_genres: 16,
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
      page
    });
  },

  getBengali(type = 'all', page = 1) {
    if (type === 'movie') {
      return this.request('/discover/movie', {
        with_original_language: 'bn',
        sort_by: 'popularity.desc',
        page
      });
    } else if (type === 'tv') {
      return this.request('/discover/tv', {
        with_original_language: 'bn',
        sort_by: 'popularity.desc',
        page
      });
    }

    // Interleave movies & TV series for rich mixed showcase
    return Promise.all([
      this.request('/discover/movie', { with_original_language: 'bn', sort_by: 'popularity.desc', page }).catch(() => ({ results: [] })),
      this.request('/discover/tv', { with_original_language: 'bn', sort_by: 'popularity.desc', page }).catch(() => ({ results: [] }))
    ]).then(([m, t]) => {
      const mList = (m.results || []).map(item => ({ ...item, media_type: 'movie' }));
      const tList = (t.results || []).map(item => ({ ...item, media_type: 'tv' }));
      const combined = [];
      const len = Math.max(mList.length, tList.length);
      for (let i = 0; i < len; i++) {
        if (i < tList.length) combined.push(tList[i]);
        if (i < mList.length) combined.push(mList[i]);
      }
      return { results: combined };
    });
  },

  getByProvider(providerId, type = 'movie', page = 1) {
    const params = {
      sort_by: 'popularity.desc',
      page
    };

    if (String(providerId) === '315') {
      // Hoichoi: premier Bengali OTT platform
      params.with_original_language = 'bn';
    } else if (String(providerId) === '232') {
      // ZEE5 (India region)
      params.with_watch_providers = providerId;
      params.watch_region = 'IN';
    } else {
      params.with_watch_providers = providerId;
      params.watch_region = 'US';
    }

    return this.request(`/discover/${type}`, params);
  },

  search(query, page = 1) {
    return this.request('/search/multi', {
      query,
      include_adult: false,
      page
    });
  },

  getDetails(id, type = 'movie') {
    return this.request(`/${type}/${id}`, {
      append_to_response: 'videos,credits,similar,recommendations'
    });
  },

  getSeasonDetails(tvId, seasonNum = 1) {
    return this.request(`/tv/${tvId}/season/${seasonNum}`);
  }
};

/* --- UTILITY HELPERS --- */
const Utils = {
  toastTimeout: null,

  toast(message, type = 'info') {
    const el = document.getElementById('toast');
    const msgEl = document.getElementById('toast-text');
    if (!el || !msgEl) return;

    msgEl.textContent = message;
    el.className = `toast show ${type}`;

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      el.classList.remove('show');
    }, 3200);
  },

  startProgress() {
    const bar = document.getElementById('top-progress');
    if (bar) {
      bar.style.width = '35%';
      bar.style.opacity = '1';
    }
  },

  endProgress() {
    const bar = document.getElementById('top-progress');
    if (bar) {
      bar.style.width = '100%';
      setTimeout(() => {
        bar.style.opacity = '0';
        setTimeout(() => { bar.style.width = '0%'; }, 250);
      }, 250);
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return dateStr.split('-')[0];
  },

  formatRating(num) {
    return num ? Number(num).toFixed(1) : 'NR';
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  },

  debounce(func, wait = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
};

/* --- GENRES & PLATFORMS DATA --- */
const CONSTANTS = {
  PLATFORMS: [
    { id: '8', name: 'Netflix', color: '#E50914', icon: 'fa-play' },
    { id: '337', name: 'Disney+', color: '#113CCF', icon: 'fa-wand-magic-sparkles' },
    { id: '119', name: 'Prime Video', color: '#00A8E1', icon: 'fa-bag-shopping' },
    { id: '350', name: 'Apple TV+', color: '#FFFFFF', icon: 'fa-apple' },
    { id: '531', name: 'Max (HBO)', color: '#9933FF', icon: 'fa-crown' },
    { id: '15', name: 'Hulu', color: '#1CE783', icon: 'fa-tv' },
    { id: '232', name: 'ZEE5', color: '#8E24AA', icon: 'fa-film' },
    { id: '315', name: 'Hoichoi', color: '#E91E63', icon: 'fa-video' }
  ],
  GENRES_MAP: {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
    10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
    10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
  }
};

/* --- MAIN APP CONTROLLER --- */
const App = {
  currentTab: 'home',
  spotlightItems: [],
  spotlightIndex: 0,
  spotlightTimer: null,
  watchlist: JSON.parse(localStorage.getItem('ef_watchlist') || '[]'),
  homeCatalogFilter: 'trending',
  homeCatalogPage: 1,
  homeCatalogLoading: false,
  gridState: {
    currentType: 'movie',
    currentPage: 1,
    loading: false,
    hasMore: true,
    fetcher: null,
    providerId: null
  },

  async init() {
    this.bindEvents();
    this.renderPlatforms();
    await this.loadHome();

    // Check URL parameters for direct tab navigation or search
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['movies', 'tv', 'livetv', 'watchlist', 'history'].includes(tabParam)) {
      this.switchTab(tabParam);
    }

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('SW registration note:', err);
      });
    }
  },

  bindEvents() {
    // Header navigation
    document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = el.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    // Instant Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        Search.handleInput(e.target.value.trim());
      }, 280));

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          Search.executeFullSearch(searchInput.value.trim());
        }
      });
    }

    // Voice Search
    const voiceBtn = document.getElementById('voice-search-btn');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => Search.startVoice());
    }

    // Spotlight buttons
    const playBtn = document.getElementById('spotlight-play-btn');
    const infoBtn = document.getElementById('spotlight-info-btn');
    const trailerBtn = document.getElementById('spotlight-trailer-btn');

    if (playBtn) playBtn.addEventListener('click', () => this.playCurrentSpotlight());
    if (infoBtn) infoBtn.addEventListener('click', () => this.openCurrentSpotlightDetails());
    if (trailerBtn) trailerBtn.addEventListener('click', () => this.playCurrentSpotlightTrailer());

    // Window scroll for sticky header blur and infinite scroll
    window.addEventListener('scroll', () => {
      const header = document.querySelector('.header');
      if (header) {
        header.classList.toggle('scrolled', window.scrollY > 40);
      }
    });

    window.addEventListener('scroll', Utils.debounce(() => this.handleInfiniteScroll(), 80), { passive: true });
  },

  renderPlatforms() {
    const container = document.getElementById('platforms-row');
    if (!container) return;

    container.innerHTML = CONSTANTS.PLATFORMS.map(p => `
      <div class="platform-pill tv-focusable" onclick="App.filterByPlatform('${p.id}', '${p.name}')" style="--brand-color: ${p.color}">
        <i class="fas ${p.icon}"></i>
        <span>${p.name}</span>
      </div>
    `).join('');

    if (window.TVNav) TVNav.updateFocusables();
  },

  async loadHome() {
    this.currentTab = 'home';
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('grid-view-section').style.display = 'none';

    try {
      // 1. Load Spotlight Trending Items
      const trendingData = await API.getTrending('all', 'day', 1);
      const results = (trendingData.results || []).filter(item => item.backdrop_path);
      this.spotlightItems = results.slice(0, 8);
      this.renderSpotlight();
      this.startSpotlightTimer();

      // 2. Render Continue Watching (if any)
      this.renderContinueWatching();

      // 3. Load Rich Shelves (2 pages = ~40 titles per shelf for massive variety)
      this.loadShelf('shelf-trending', (p) => API.getTrending('all', 'week', p), 'all', 2);
      this.loadShelf('shelf-now-playing', (p) => API.getNowPlaying(p), 'movie', 2);
      this.loadShelf('shelf-popular-tv', (p) => API.getPopular('tv', p), 'tv', 2);
      this.loadShelf('shelf-trending-tv', (p) => API.getTrending('tv', 'week', p), 'tv', 2);
      this.loadShelf('shelf-popular-movies', (p) => API.getPopular('movie', p), 'movie', 2);
      this.loadShelf('shelf-top-tv', (p) => API.getTopRated('tv', p), 'tv', 2);
      this.loadShelf('shelf-top-rated', (p) => API.getTopRated('movie', p), 'movie', 2);
      this.loadShelf('shelf-kdrama', (p) => API.getKDrama(p), 'tv', 2);
      this.loadShelf('shelf-hoichoi', (p) => API.getBengali('all', p), 'all', 2);
      this.loadShelf('shelf-action-tv', (p) => API.getTVByGenre(10759, p), 'tv', 2);
      this.loadShelf('shelf-action', (p) => API.getByGenre('movie', 28, p), 'movie', 2);
      this.loadShelf('shelf-scifi-tv', (p) => API.getTVByGenre(10765, p), 'tv', 2);
      this.loadShelf('shelf-scifi', (p) => API.getByGenre('movie', 878, p), 'movie', 2);
      this.loadShelf('shelf-crime-tv', (p) => API.getTVByGenre(80, p), 'tv', 2);
      this.loadShelf('shelf-anime', (p) => API.getAnime(p), 'tv', 2);
      this.loadShelf('shelf-horror', (p) => API.getByGenre('movie', 27, p), 'movie', 2);
      this.loadShelf('shelf-comedy', (p) => API.getByGenre('movie', 35, p), 'movie', 2);
      this.loadShelf('shelf-upcoming', (p) => API.getUpcoming(p), 'movie', 2);

      // 4. Initialize Homepage Infinite Catalog Feed
      this.initHomeCatalog();
    } catch (err) {
      console.error('Error loading home view:', err);
      Utils.toast('Network issue loading feeds. Checking fallback...', 'warning');
    }
  },

  renderSpotlight() {
    const item = this.spotlightItems[this.spotlightIndex];
    if (!item) return;

    const bg = document.getElementById('spotlight-bg');
    const titleEl = document.getElementById('spotlight-title');
    const descEl = document.getElementById('spotlight-desc');
    const metaEl = document.getElementById('spotlight-meta');

    if (bg) {
      bg.style.backgroundImage = `url(${CONFIG.IMG_ORIG}${item.backdrop_path})`;
    }

    const title = item.title || item.name || 'Featured Title';
    const year = Utils.formatDate(item.release_date || item.first_air_date);
    const rating = Utils.formatRating(item.vote_average);
    const mediaType = item.media_type === 'tv' ? 'TV SERIES' : 'MOVIE';

    const genres = (item.genre_ids || [])
      .slice(0, 3)
      .map(id => CONSTANTS.GENRES_MAP[id])
      .filter(Boolean)
      .join(' • ');

    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = item.overview ? item.overview.slice(0, 220) + '...' : 'Stream now on EF Movie.';

    if (metaEl) {
      metaEl.innerHTML = `
        <span class="spotlight-badge badge-type">${mediaType}</span>
        <span class="spotlight-badge badge-gold"><i class="fas fa-star"></i> ${rating}</span>
        <span class="spotlight-badge badge-dim">${year}</span>
        <span class="spotlight-badge badge-uhd">4K ULTRA HD</span>
        <span class="spotlight-genres">${genres}</span>
      `;
    }

    // Render Indicator Dots
    const dotsEl = document.getElementById('spotlight-dots');
    if (dotsEl) {
      dotsEl.innerHTML = this.spotlightItems.map((_, i) => `
        <div class="spotlight-dot ${i === this.spotlightIndex ? 'active' : ''} tv-focusable" 
             onclick="App.setSpotlightIndex(${i})"></div>
      `).join('');
    }

    if (window.TVNav) TVNav.updateFocusables();
  },

  startSpotlightTimer() {
    clearInterval(this.spotlightTimer);
    this.spotlightTimer = setInterval(() => {
      this.nextSpotlight();
    }, 7000);
  },

  nextSpotlight() {
    if (this.spotlightItems.length <= 1) return;
    this.spotlightIndex = (this.spotlightIndex + 1) % this.spotlightItems.length;
    this.renderSpotlight();
  },

  setSpotlightIndex(index) {
    this.spotlightIndex = index;
    this.renderSpotlight();
    this.startSpotlightTimer();
  },

  playCurrentSpotlight() {
    const item = this.spotlightItems[this.spotlightIndex];
    if (!item) return;
    const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    if (type === 'tv') {
      Player.playTV(item, 1, 1);
    } else {
      Player.playMovie(item);
    }
  },

  async playCurrentSpotlightTrailer() {
    const item = this.spotlightItems[this.spotlightIndex];
    if (!item) return;
    const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    try {
      const details = await API.getDetails(item.id, type);
      const videos = (details.videos && details.videos.results) || [];
      const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') || videos[0];
      if (trailer && trailer.key) {
        Player.playTrailer(trailer.key, details.title || details.name);
      } else {
        Utils.toast('Trailer not available for this title', 'warning');
      }
    } catch (e) {
      Utils.toast('Could not load trailer', 'error');
    }
  },

  openCurrentSpotlightDetails() {
    const item = this.spotlightItems[this.spotlightIndex];
    if (item) {
      Modals.openDetails(item.id, item.media_type || (item.first_air_date ? 'tv' : 'movie'));
    }
  },

  renderContinueWatching() {
    const container = document.getElementById('shelf-continue-watching');
    const wrapper = document.getElementById('shelf-continue-wrapper');
    if (!container || !wrapper) return;

    const history = JSON.parse(localStorage.getItem('ef_watch_history') || '[]');
    if (history.length === 0) {
      wrapper.style.display = 'none';
      return;
    }

    wrapper.style.display = 'block';
    container.innerHTML = history.slice(0, 15).map(item => {
      const img = item.backdrop_path ? `${CONFIG.IMG_W500}${item.backdrop_path}` : (item.poster_path ? `${CONFIG.IMG_W342}${item.poster_path}` : './assets/logo.svg');
      const isTv = item.type === 'tv';
      const badge = isTv ? `S${item.season} E${item.episode}` : 'MOVIE';

      return `
        <div class="media-card continue-card tv-focusable" 
             onclick="${isTv ? `Player.playTV({id:${item.id}, name:'${Utils.escapeHtml(item.title)}'}, ${item.season}, ${item.episode})` : `Player.playMovie({id:${item.id}, title:'${Utils.escapeHtml(item.title)}'})`}">
          <div class="card-thumb-wrap">
            <img class="card-thumb" src="${img}" alt="${Utils.escapeHtml(item.title)}" loading="lazy"/>
            <div class="continue-progress-bar"><div class="continue-fill"></div></div>
            <div class="card-play-overlay"><i class="fas fa-play"></i></div>
            <span class="card-badge">${badge}</span>
          </div>
          <div class="card-details">
            <h4 class="card-title">${Utils.escapeHtml(item.title)}</h4>
            <span class="card-resume-text"><i class="fas fa-rotate-left"></i> Resume</span>
          </div>
        </div>
      `;
    }).join('');

    if (window.TVNav) TVNav.updateFocusables();
  },

  async loadShelf(shelfId, fetcher, defaultType = 'movie', pages = 2) {
    const shelf = document.getElementById(shelfId);
    if (!shelf) return;

    // Show skeleton placeholders
    shelf.innerHTML = Array(10).fill(0).map(() => `
      <div class="media-card skeleton-card">
        <div class="card-thumb-wrap skeleton-box"></div>
      </div>
    `).join('');

    try {
      // Concurrently fetch multiple pages (40 titles per shelf)
      const pagePromises = [];
      for (let p = 1; p <= pages; p++) {
        pagePromises.push(fetcher(p).catch(() => ({ results: [] })));
      }
      const resultsArray = await Promise.all(pagePromises);
      const combined = resultsArray.flatMap(r => r.results || []);
      const seen = new Set();
      const items = combined.filter(item => {
        if (!item || !item.poster_path || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      if (items.length === 0) {
        shelf.innerHTML = '<div class="shelf-empty">No titles found.</div>';
        return;
      }

      shelf.innerHTML = items.map(item => {
        const type = item.media_type || defaultType;
        return this.createCardHtml(item, type);
      }).join('');

      if (window.TVNav) TVNav.updateFocusables();
    } catch (e) {
      shelf.innerHTML = '<div class="shelf-empty">Failed to load content.</div>';
    }
  },

  /* --- HOMEPAGE INFINITE 4K CATALOG FEED --- */
  homeCatalogFilter: 'trending',
  homeCatalogPage: 1,
  homeCatalogLoading: false,

  async initHomeCatalog() {
    this.homeCatalogPage = 1;
    const grid = document.getElementById('home-catalog-grid');
    if (!grid) return;
    grid.innerHTML = Array(12).fill(0).map(() => `
      <div class="media-card skeleton-card">
        <div class="card-thumb-wrap skeleton-box"></div>
      </div>
    `).join('');
    await this.fetchHomeCatalogBatch(false);
  },

  setHomeCatalogFilter(filter, btn) {
    this.homeCatalogFilter = filter;
    document.querySelectorAll('.catalog-filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.initHomeCatalog();
  },

  async fetchHomeCatalogBatch(append = true) {
    const grid = document.getElementById('home-catalog-grid');
    if (!grid || this.homeCatalogLoading) return;
    this.homeCatalogLoading = true;

    const btn = document.getElementById('home-catalog-load-btn');
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading More Titles...';
    const loader = document.getElementById('home-infinite-loader');
    if (loader) loader.style.display = 'flex';

    const p = this.homeCatalogPage;
    let fetchPromise;
    let defaultType = 'movie';

    switch (this.homeCatalogFilter) {
      case 'movies':
        fetchPromise = Promise.all([API.getPopular('movie', p * 2 - 1), API.getPopular('movie', p * 2)]);
        defaultType = 'movie';
        break;
      case 'tv':
        fetchPromise = Promise.all([API.getPopular('tv', p * 2 - 1), API.getPopular('tv', p * 2)]);
        defaultType = 'tv';
        break;
      case 'top_rated':
        fetchPromise = Promise.all([API.getTopRated('movie', p * 2 - 1), API.getTopRated('tv', p * 2 - 1)]);
        defaultType = 'all';
        break;
      case 'action':
        fetchPromise = Promise.all([API.getByGenre('movie', 28, p * 2 - 1), API.getTVByGenre(10759, p * 2 - 1)]);
        defaultType = 'all';
        break;
      case 'scifi':
        fetchPromise = Promise.all([API.getByGenre('movie', 878, p * 2 - 1), API.getTVByGenre(10765, p * 2 - 1)]);
        defaultType = 'all';
        break;
      case 'kdrama':
        fetchPromise = Promise.all([API.getKDrama(p * 2 - 1), API.getAnime(p * 2 - 1)]);
        defaultType = 'tv';
        break;
      default: // 'trending'
        fetchPromise = Promise.all([API.getTrending('all', 'week', p * 2 - 1), API.getTrending('all', 'week', p * 2)]);
        defaultType = 'all';
        break;
    }

    try {
      const results = await fetchPromise;
      const combined = results.flatMap(r => r.results || []);
      const existingIds = append 
        ? new Set(Array.from(grid.querySelectorAll('.media-card[data-id]')).map(el => el.dataset.id))
        : new Set();
      const seen = new Set();
      const items = combined.filter(item => {
        if (!item || !item.poster_path) return false;
        const idStr = String(item.id);
        if (existingIds.has(idStr) || seen.has(idStr)) return false;
        seen.add(idStr);
        return true;
      });

      const cardsHtml = items.map(item => this.createCardHtml(item, item.media_type || defaultType)).join('');

      if (append) {
        grid.insertAdjacentHTML('beforeend', cardsHtml);
      } else {
        grid.innerHTML = cardsHtml;
      }

      if (window.TVNav) TVNav.updateFocusables();
    } catch (e) {
      console.error('Error fetching home catalog:', e);
      if (!append) grid.innerHTML = '<div class="shelf-empty">Unable to load catalog feed.</div>';
    } finally {
      this.homeCatalogLoading = false;
      if (btn) btn.innerHTML = '<i class="fas fa-rotate"></i> Load More Titles';
      if (loader) loader.style.display = 'none';
    }
  },

  loadMoreHomeCatalog() {
    this.homeCatalogPage += 1;
    this.fetchHomeCatalogBatch(true);
  },

  createCardHtml(item, type = 'movie') {
    const title = item.title || item.name || 'Untitled';
    const poster = item.poster_path ? `${CONFIG.IMG_W342}${item.poster_path}` : './assets/logo.svg';
    const rating = Utils.formatRating(item.vote_average);
    const year = Utils.formatDate(item.release_date || item.first_air_date);
    const isTv = type === 'tv' || !!item.first_air_date;
    const lang = item.original_language || '';

    return `
      <div class="media-card tv-focusable" 
           data-id="${item.id}"
           data-type="${isTv ? 'tv' : 'movie'}"
           data-title="${Utils.escapeHtml(title)}"
           data-lang="${lang}"
           onclick="App.handleCardClick(this)"
           onmouseenter="App.previewCard(this, ${item.id})">
        <div class="card-thumb-wrap">
          <img class="card-thumb" src="${poster}" alt="${Utils.escapeHtml(title)}" loading="lazy"/>
          <div class="card-overlay-gradient"></div>
          <div class="card-play-overlay"><i class="fas fa-play"></i></div>
          <div class="card-quick-actions">
            <button class="card-action-btn" title="Play Now" 
                    onclick="event.stopPropagation(); ${isTv ? `Player.playTV({id:${item.id}, name:'${Utils.escapeHtml(title)}', original_language:'${lang}'}, 1, 1)` : `Player.playMovie({id:${item.id}, title:'${Utils.escapeHtml(title)}', original_language:'${lang}'})`}"><i class="fas fa-play"></i></button>
            <button class="card-action-btn" title="Quick View" 
                    onclick="event.stopPropagation(); Modals.openQuick(${item.id}, '${isTv ? 'tv' : 'movie'}')"><i class="fas fa-info"></i></button>
            <button class="card-action-btn" title="Add to Watchlist" 
                    onclick="event.stopPropagation(); App.toggleWatchlist(${item.id}, '${isTv ? 'tv' : 'movie'}', '${Utils.escapeHtml(title)}', '${item.poster_path}')"><i class="fas fa-heart"></i></button>
          </div>
          <span class="card-rating-badge"><i class="fas fa-star"></i> ${rating}</span>
          ${isTv ? '<span class="card-type-tag">SERIES</span>' : ''}
        </div>
        <div class="card-details">
          <h4 class="card-title">${Utils.escapeHtml(title)}</h4>
          <div class="card-sub-info">
            <span class="card-year">${year}</span>
            <span class="card-res">HD</span>
          </div>
        </div>
      </div>
    `;
  },

  handleCardClick(cardEl) {
    if (!cardEl) return;
    const id = parseInt(cardEl.dataset.id, 10);
    const type = cardEl.dataset.type || 'movie';
    const title = cardEl.dataset.title || 'Untitled';
    const lang = cardEl.dataset.lang || '';
    const isTV = (window.TVNav && window.TVNav.isTVMode) || document.body.classList.contains('tv-mode');

    if (isTV) {
      // In TV Mode: Auto-play immediately on best matched server
      if (type === 'tv') {
        Player.playTV({ id, name: title, original_language: lang }, 1, 1);
      } else {
        Player.playMovie({ id, title: title, original_language: lang });
      }
    } else {
      Modals.openDetails(id, type);
    }
  },

  scrollShelf(shelfId, direction) {
    const shelf = document.getElementById(shelfId);
    if (!shelf) return;
    const scrollAmount = shelf.clientWidth * 0.75;
    shelf.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update active nav indicators
    document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tabName);
    });

    const mainContent = document.getElementById('main-content');
    const gridSection = document.getElementById('grid-view-section');
    const gridTitle = document.getElementById('grid-view-title');
    const gridContainer = document.getElementById('grid-view-container');

    if (tabName === 'home') {
      mainContent.style.display = 'block';
      gridSection.style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    mainContent.style.display = 'none';
    gridSection.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabName === 'movies') {
      gridTitle.innerHTML = '<i class="fas fa-film"></i> Movies Catalog';
      this.loadGrid((p) => API.getPopular('movie', p), 'movie', 3);
    } else if (tabName === 'tv') {
      gridTitle.innerHTML = '<i class="fas fa-tv"></i> TV Series & Binge-Worthy Shows';
      this.loadGrid((p) => API.getPopular('tv', p), 'tv', 3);
    } else if (tabName === 'livetv') {
      gridTitle.innerHTML = '<i class="fas fa-broadcast-tower"></i> Live TV Channels';
      this.renderLiveTVGrid();
    } else if (tabName === 'watchlist') {
      gridTitle.innerHTML = '<i class="fas fa-heart"></i> My Watchlist';
      this.renderWatchlist();
    } else if (tabName === 'history') {
      gridTitle.innerHTML = '<i class="fas fa-clock-rotate-left"></i> Watch History';
      this.renderWatchHistory();
    }
  },

  async loadGrid(apiCall, defaultType = 'movie', pages = 3) {
    const container = document.getElementById('grid-view-container');
    if (!container) return;

    this.gridState = {
      currentType: defaultType,
      currentPage: pages,
      loading: false,
      hasMore: true,
      fetcher: apiCall,
      providerId: null
    };

    container.innerHTML = Array(18).fill(0).map(() => `
      <div class="media-card skeleton-card">
        <div class="card-thumb-wrap skeleton-box"></div>
      </div>
    `).join('');

    try {
      const pagePromises = [];
      for (let p = 1; p <= pages; p++) {
        pagePromises.push(apiCall(p).catch(() => ({ results: [] })));
      }
      const resultsArray = await Promise.all(pagePromises);
      const combined = resultsArray.flatMap(r => r.results || []);
      const seen = new Set();
      const items = combined.filter(item => {
        if (!item || !item.poster_path || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No titles found</h3></div>';
        return;
      }

      container.innerHTML = items.map(item => this.createCardHtml(item, item.media_type || defaultType)).join('');
      if (window.TVNav) TVNav.updateFocusables();
    } catch (e) {
      container.innerHTML = '<div class="shelf-empty">Failed to load content.</div>';
    }
  },

  async loadMoreGrid() {
    if (this.gridState.loading || !this.gridState.hasMore) return;
    this.gridState.loading = true;

    const loader = document.getElementById('grid-infinite-loader');
    if (loader) loader.style.display = 'flex';

    const container = document.getElementById('grid-view-container');
    if (!container) {
      this.gridState.loading = false;
      if (loader) loader.style.display = 'none';
      return;
    }

    try {
      const nextPage = this.gridState.currentPage + 1;
      let newItems = [];

      if (this.currentTab === 'platform' && this.gridState.providerId) {
        const pid = this.gridState.providerId;
        const [mRes, tvRes] = await Promise.all([
          API.getByProvider(pid, 'movie', nextPage).catch(() => ({ results: [] })),
          API.getByProvider(pid, 'tv', nextPage).catch(() => ({ results: [] }))
        ]);
        const movies = (mRes.results || []).map(m => ({ ...m, media_type: 'movie' }));
        const tvs = (tvRes.results || []).map(t => ({ ...t, media_type: 'tv' }));
        const maxLen = Math.max(movies.length, tvs.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < tvs.length) newItems.push(tvs[i]);
          if (i < movies.length) newItems.push(movies[i]);
        }
        this.gridState.currentPage = nextPage;
      } else if (this.gridState.fetcher) {
        // Fetch 2 pages in parallel for ultra-responsive streaming catalog feel
        const p1 = nextPage;
        const p2 = nextPage + 1;
        const [r1, r2] = await Promise.all([
          this.gridState.fetcher(p1).catch(() => ({ results: [] })),
          this.gridState.fetcher(p2).catch(() => ({ results: [] }))
        ]);
        newItems = [...(r1.results || []), ...(r2.results || [])];
        this.gridState.currentPage = p2;
      }

      const existingIds = new Set(Array.from(container.querySelectorAll('.media-card[data-id]')).map(el => el.dataset.id));
      const validItems = [];
      const seen = new Set();
      for (const item of newItems) {
        if (!item || !item.poster_path) continue;
        const idStr = String(item.id);
        if (existingIds.has(idStr) || seen.has(idStr)) continue;
        seen.add(idStr);
        validItems.push(item);
      }

      if (validItems.length > 0) {
        const cardsHtml = validItems.map(item =>
          this.createCardHtml(item, item.media_type || this.gridState.currentType)
        ).join('');
        container.insertAdjacentHTML('beforeend', cardsHtml);
        if (window.TVNav) TVNav.updateFocusables();
      } else if (newItems.length === 0) {
        this.gridState.hasMore = false;
      }
    } catch (err) {
      console.warn('loadMoreGrid error:', err);
    } finally {
      this.gridState.loading = false;
      if (loader) loader.style.display = 'none';
    }
  },

  handleInfiniteScroll() {
    const activeModal = document.querySelector('.modal-overlay.active, .player-modal-overlay.active');
    if (activeModal) return;

    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const totalHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

    if (scrollY + viewportHeight < totalHeight - 750) return;

    if (this.currentTab === 'home') {
      if (!this.homeCatalogLoading) {
        this.loadMoreHomeCatalog();
      }
    } else if (['movies', 'tv', 'search', 'platform'].includes(this.currentTab)) {
      this.loadMoreGrid();
    }
  },

  renderLiveTVGrid() {
    const container = document.getElementById('grid-view-container');
    if (!container) return;

    container.innerHTML = Player.LIVE_CHANNELS.map((ch, idx) => `
      <div class="media-card live-tv-card tv-focusable" onclick="Player.playLiveTV(${idx})">
        <div class="card-thumb-wrap live-thumb">
          <div class="live-tv-icon"><i class="fas fa-tv"></i></div>
          <span class="live-pill"><span class="pulse-dot"></span> LIVE</span>
          <div class="card-play-overlay"><i class="fas fa-play"></i></div>
        </div>
        <div class="card-details">
          <h4 class="card-title">${ch.name}</h4>
          <span class="card-genre">${ch.category}</span>
        </div>
      </div>
    `).join('');

    if (window.TVNav) TVNav.updateFocusables();
  },

  renderWatchlist() {
    const container = document.getElementById('grid-view-container');
    if (!container) return;

    this.watchlist = JSON.parse(localStorage.getItem('ef_watchlist') || '[]');

    if (this.watchlist.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-heart-crack empty-icon"></i>
          <h3>Your Watchlist is Empty</h3>
          <p>Add your favorite movies and shows to access them instantly anytime.</p>
          <button class="btn btn-primary tv-focusable" onclick="App.switchTab('home')"><i class="fas fa-compass"></i> Discover Titles</button>
        </div>
      `;
      if (window.TVNav) TVNav.updateFocusables();
      return;
    }

    container.innerHTML = this.watchlist.map(item => `
      <div class="media-card tv-focusable" 
           data-id="${item.id}"
           data-type="${item.type}"
           data-title="${Utils.escapeHtml(item.title)}"
           onclick="App.handleCardClick(this)">
        <div class="card-thumb-wrap">
          <img class="card-thumb" src="${item.poster_path ? CONFIG.IMG_W342 + item.poster_path : './assets/logo.svg'}" alt="${Utils.escapeHtml(item.title)}" loading="lazy"/>
          <button class="card-remove-btn" title="Remove" onclick="event.stopPropagation(); App.toggleWatchlist(${item.id}, '${item.type}'); App.renderWatchlist();">
            <i class="fas fa-trash"></i>
          </button>
          <div class="card-play-overlay"><i class="fas fa-play"></i></div>
        </div>
        <div class="card-details">
          <h4 class="card-title">${Utils.escapeHtml(item.title)}</h4>
          <span class="card-type-tag">${item.type.toUpperCase()}</span>
        </div>
      </div>
    `).join('');

    if (window.TVNav) TVNav.updateFocusables();
  },

  renderWatchHistory() {
    const container = document.getElementById('grid-view-container');
    if (!container) return;

    const history = JSON.parse(localStorage.getItem('ef_watch_history') || '[]');

    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-history empty-icon"></i>
          <h3>No Watch History</h3>
          <p>Titles you stream will automatically appear here so you can continue where you left off.</p>
          <button class="btn btn-primary tv-focusable" onclick="App.switchTab('home')"><i class="fas fa-play"></i> Start Watching</button>
        </div>
      `;
      if (window.TVNav) TVNav.updateFocusables();
      return;
    }

    container.innerHTML = `
      <div class="history-actions-bar">
        <button class="btn btn-secondary btn-sm tv-focusable" onclick="App.clearHistory()"><i class="fas fa-trash-can"></i> Clear All History</button>
      </div>
      <div class="history-grid">
        ${history.map(item => `
          <div class="media-card continue-card tv-focusable" 
               onclick="${item.type === 'tv' ? `Player.playTV({id:${item.id}, name:'${Utils.escapeHtml(item.title)}'}, ${item.season}, ${item.episode})` : `Player.playMovie({id:${item.id}, title:'${Utils.escapeHtml(item.title)}'})`}">
            <div class="card-thumb-wrap">
              <img class="card-thumb" src="${item.backdrop_path ? CONFIG.IMG_W500 + item.backdrop_path : (item.poster_path ? CONFIG.IMG_W342 + item.poster_path : './assets/logo.svg')}" alt="${Utils.escapeHtml(item.title)}" loading="lazy"/>
              <div class="card-play-overlay"><i class="fas fa-play"></i></div>
              <span class="card-badge">${item.type === 'tv' ? `S${item.season} E${item.episode}` : 'MOVIE'}</span>
            </div>
            <div class="card-details">
              <h4 class="card-title">${Utils.escapeHtml(item.title)}</h4>
              <span class="card-time">${new Date(item.timestamp).toLocaleDateString()}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    if (window.TVNav) TVNav.updateFocusables();
  },

  clearHistory() {
    if (confirm('Clear entire watch history?')) {
      localStorage.removeItem('ef_watch_history');
      this.renderWatchHistory();
      Utils.toast('Watch history cleared');
    }
  },

  toggleWatchlist(id, type, title, poster_path) {
    this.watchlist = JSON.parse(localStorage.getItem('ef_watchlist') || '[]');
    const idx = this.watchlist.findIndex(w => w.id === id);

    if (idx >= 0) {
      this.watchlist.splice(idx, 1);
      Utils.toast('Removed from Watchlist');
    } else {
      this.watchlist.unshift({ id, type, title, poster_path, addedAt: Date.now() });
      Utils.toast('Added to Watchlist ❤️');
    }

    localStorage.setItem('ef_watchlist', JSON.stringify(this.watchlist));

    // Update modal button if currently open
    const wlBtn = document.getElementById('details-watchlist-btn');
    if (wlBtn) {
      const inWl = this.watchlist.some(w => w.id === id);
      wlBtn.innerHTML = inWl ? '<i class="fas fa-check"></i> In Watchlist' : '<i class="fas fa-heart"></i> Add to Watchlist';
      wlBtn.classList.toggle('active', inWl);
    }
  },

  async filterByPlatform(providerId, platformName) {
    const gridTitle = document.getElementById('grid-view-title');
    const container = document.getElementById('grid-view-container');
    this.currentTab = 'platform';
    this.gridState = {
      currentType: 'movie',
      currentPage: 2,
      loading: false,
      hasMore: true,
      fetcher: null,
      providerId: providerId
    };
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('grid-view-section').style.display = 'block';

    if (gridTitle) {
      gridTitle.innerHTML = `<i class="fas fa-tv"></i> Streaming on ${platformName} (Movies & Series)`;
    }

    if (container) {
      container.innerHTML = Array(18).fill(0).map(() => `
        <div class="media-card skeleton-card">
          <div class="card-thumb-wrap skeleton-box"></div>
        </div>
      `).join('');
    }

    try {
      const [moviesP1, moviesP2, tvP1, tvP2] = await Promise.all([
        API.getByProvider(providerId, 'movie', 1).catch(() => ({ results: [] })),
        API.getByProvider(providerId, 'movie', 2).catch(() => ({ results: [] })),
        API.getByProvider(providerId, 'tv', 1).catch(() => ({ results: [] })),
        API.getByProvider(providerId, 'tv', 2).catch(() => ({ results: [] }))
      ]);

      const movies = [...(moviesP1.results || []), ...(moviesP2.results || [])].map(m => ({ ...m, media_type: 'movie' }));
      const tvs = [...(tvP1.results || []), ...(tvP2.results || [])].map(t => ({ ...t, media_type: 'tv' }));

      // Interleave movies & TV series for rich variety
      const interleaved = [];
      const maxLen = Math.max(movies.length, tvs.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < tvs.length) interleaved.push(tvs[i]);
        if (i < movies.length) interleaved.push(movies[i]);
      }

      const seen = new Set();
      const items = interleaved.filter(item => {
        if (!item || !item.poster_path || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      if (container) {
        if (items.length === 0) {
          container.innerHTML = '<div class="empty-state"><h3>No titles found for this provider</h3></div>';
        } else {
          container.innerHTML = items.map(item => this.createCardHtml(item, item.media_type)).join('');
        }
      }
      if (window.TVNav) TVNav.updateFocusables();
    } catch (e) {
      console.error('Error filtering by platform:', e);
      if (container) container.innerHTML = '<div class="empty-state"><h3>Failed to load provider titles</h3></div>';
    }
  },

  previewCard(cardEl, id) {
    // Micro-interaction sound or subtle pre-warming can occur here
  }
};

/* --- SEARCH & VOICE RECOGNITION MODULE --- */
const Search = {
  async handleInput(query) {
    const dropdown = document.getElementById('search-dropdown');
    if (!dropdown) return;

    if (!query || query.length < 2) {
      dropdown.style.display = 'none';
      return;
    }

    try {
      const res = await API.search(query, 1);
      const results = (res.results || []).filter(r => r.poster_path || r.backdrop_path).slice(0, 7);

      if (results.length === 0) {
        dropdown.innerHTML = '<div class="search-empty">No titles matching your query.</div>';
        dropdown.style.display = 'block';
        return;
      }

      dropdown.innerHTML = results.map(item => {
        const title = item.title || item.name || 'Untitled';
        const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        const img = item.poster_path ? `${CONFIG.IMG_W185}${item.poster_path}` : './assets/logo.svg';
        const year = Utils.formatDate(item.release_date || item.first_air_date);
        const rating = Utils.formatRating(item.vote_average);

        return `
          <div class="search-result-item tv-focusable" onclick="Modals.openDetails(${item.id}, '${type}'); Search.closeDropdown();">
            <img class="search-thumb" src="${img}" alt="${Utils.escapeHtml(title)}" loading="lazy"/>
            <div class="search-info">
              <span class="search-title">${Utils.escapeHtml(title)}</span>
              <div class="search-meta">
                <span class="search-type">${type.toUpperCase()}</span>
                <span>${year}</span>
                <span class="search-rating"><i class="fas fa-star"></i> ${rating}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      dropdown.style.display = 'block';
      if (window.TVNav) TVNav.updateFocusables();
    } catch (err) {
      console.error('Search error:', err);
    }
  },

  closeDropdown() {
    const dropdown = document.getElementById('search-dropdown');
    if (dropdown) dropdown.style.display = 'none';
  },

  executeFullSearch(query) {
    if (!query) return;
    this.closeDropdown();

    const gridTitle = document.getElementById('grid-view-title');
    App.currentTab = 'search';
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('grid-view-section').style.display = 'block';

    if (gridTitle) {
      gridTitle.innerHTML = `<i class="fas fa-search"></i> Search Results for "${Utils.escapeHtml(query)}"`;
    }

    App.loadGrid((p) => API.search(query, p), 'movie', 2);
  },

  startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Utils.toast('Voice Search is not supported on this browser.', 'warning');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const micBtn = document.getElementById('voice-search-btn');
    if (micBtn) micBtn.classList.add('listening');
    Utils.toast('Listening... Speak movie or series title', 'info');

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const input = document.getElementById('search-input');
      if (input) {
        input.value = transcript;
        this.executeFullSearch(transcript);
      }
      Utils.toast(`Searching for "${transcript}"`);
    };

    recognition.onerror = () => {
      Utils.toast('Could not detect voice. Please try typing.', 'warning');
    };

    recognition.onend = () => {
      if (micBtn) micBtn.classList.remove('listening');
    };

    recognition.start();
  }
};

/* --- MODALS ENGINE (DETAILS & QUICK VIEW) --- */
const Modals = {
  currentDetailsItem: null,
  currentType: 'movie',

  async openDetails(id, type = 'movie') {
    const modal = document.getElementById('details-modal');
    if (!modal) return;

    this.currentType = type;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Strict Scroll Reset to prevent sideways shift or displacement
    modal.scrollTop = 0;
    modal.scrollLeft = 0;
    const inner = modal.querySelector('.details-modal');
    if (inner) {
      inner.scrollTop = 0;
      inner.scrollLeft = 0;
    }

    // Reset view
    document.getElementById('details-backdrop').style.backgroundImage = 'none';
    document.getElementById('details-title').textContent = 'Loading title details...';
    document.getElementById('details-overview').textContent = '';
    document.getElementById('details-genres').innerHTML = '';
    document.getElementById('details-cast').innerHTML = '';
    document.getElementById('details-similar').innerHTML = '';

    try {
      const data = await API.getDetails(id, type);
      this.currentDetailsItem = data;

      const title = data.title || data.name || 'Untitled';
      const year = Utils.formatDate(data.release_date || data.first_air_date);
      const rating = Utils.formatRating(data.vote_average);
      const runtime = data.runtime ? `${data.runtime} min` : (data.episode_run_time?.[0] ? `${data.episode_run_time[0]} min` : 'HD');
      const isTv = type === 'tv' || !!data.first_air_date;

      // Backdrop & Poster
      const bg = data.backdrop_path ? `${CONFIG.IMG_ORIG}${data.backdrop_path}` : '';
      document.getElementById('details-backdrop').style.backgroundImage = `url(${bg})`;
      document.getElementById('details-poster').src = data.poster_path ? `${CONFIG.IMG_W500}${data.poster_path}` : './assets/logo.svg';

      document.getElementById('details-title').textContent = title;
      document.getElementById('details-tagline').textContent = data.tagline ? `"${data.tagline}"` : '';
      document.getElementById('details-overview').textContent = data.overview || 'No synopsis provided.';

      // Meta Badges
      document.getElementById('details-meta').innerHTML = `
        <span class="badge-type">${isTv ? 'TV SERIES' : 'FEATURE FILM'}</span>
        <span class="badge-gold"><i class="fas fa-star"></i> ${rating} IMDb</span>
        <span class="badge-dim">${year}</span>
        <span class="badge-dim">${runtime}</span>
        <span class="badge-uhd">4K ULTRA HD</span>
      `;

      // Genres
      document.getElementById('details-genres').innerHTML = (data.genres || []).map(g => `
        <span class="genre-tag">${g.name}</span>
      `).join('');

      // Watchlist Button
      const inWl = App.watchlist.some(w => w.id === id);
      const wlBtn = document.getElementById('details-watchlist-btn');
      if (wlBtn) {
        wlBtn.innerHTML = inWl ? '<i class="fas fa-check"></i> In Watchlist' : '<i class="fas fa-heart"></i> Add to Watchlist';
        wlBtn.classList.toggle('active', inWl);
        wlBtn.onclick = () => App.toggleWatchlist(id, type, title, data.poster_path);
      }

      // Play & Trailer Buttons
      const playBtn = document.getElementById('details-play-btn');
      if (playBtn) {
        playBtn.onclick = () => {
          this.closeDetails();
          if (isTv) {
            Player.playTV(data, 1, 1);
          } else {
            Player.playMovie(data);
          }
        };
      }

      const trailerBtn = document.getElementById('details-trailer-btn');
      if (trailerBtn) {
        const videos = (data.videos && data.videos.results) || [];
        const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') || videos[0];
        if (trailer && trailer.key) {
          trailerBtn.style.display = 'inline-flex';
          trailerBtn.onclick = () => Player.playTrailer(trailer.key, title);
        } else {
          trailerBtn.style.display = 'none';
        }
      }

      // Cast
      const cast = (data.credits && data.credits.cast) || [];
      document.getElementById('details-cast').innerHTML = cast.slice(0, 10).map(c => `
        <div class="cast-card">
          <img class="cast-img" src="${c.profile_path ? CONFIG.IMG_W185 + c.profile_path : './assets/logo.svg'}" alt="${c.name}" loading="lazy"/>
          <span class="cast-name">${c.name}</span>
          <span class="cast-character">${c.character || 'Actor'}</span>
        </div>
      `).join('');

      // Similar / Recommendations
      const similar = (data.recommendations && data.recommendations.results) || (data.similar && data.similar.results) || [];
      document.getElementById('details-similar').innerHTML = similar.slice(0, 12).map(item => `
        <div class="media-card tv-focusable" 
             data-id="${item.id}"
             data-type="${type}"
             data-title="${Utils.escapeHtml(item.title || item.name)}"
             onclick="App.handleCardClick(this)">
          <div class="card-thumb-wrap">
            <img class="card-thumb" src="${item.poster_path ? CONFIG.IMG_W342 + item.poster_path : './assets/logo.svg'}" alt="${Utils.escapeHtml(item.title || item.name)}" loading="lazy"/>
            <div class="card-play-overlay"><i class="fas fa-play"></i></div>
          </div>
          <div class="card-details">
            <h4 class="card-title">${Utils.escapeHtml(item.title || item.name)}</h4>
          </div>
        </div>
      `).join('');

      if (window.TVNav) TVNav.setModalContext(modal);
    } catch (err) {
      console.error('Error fetching details:', err);
      Utils.toast('Failed to load title details', 'error');
    }
  },

  closeDetails() {
    const modal = document.getElementById('details-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    if (window.TVNav) TVNav.clearModalContext();
  },

  async openQuick(id, type = 'movie') {
    const modal = document.getElementById('quick-modal');
    if (!modal) return;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Strict Scroll Reset
    modal.scrollTop = 0;
    modal.scrollLeft = 0;
    const inner = modal.querySelector('.details-modal');
    if (inner) {
      inner.scrollTop = 0;
      inner.scrollLeft = 0;
    }

    try {
      const data = await API.getDetails(id, type);
      const title = data.title || data.name || 'Untitled';
      const year = Utils.formatDate(data.release_date || data.first_air_date);
      const rating = Utils.formatRating(data.vote_average);

      document.getElementById('quick-backdrop').src = data.backdrop_path ? `${CONFIG.IMG_W780}${data.backdrop_path}` : './assets/logo.svg';
      document.getElementById('quick-title').textContent = title;
      document.getElementById('quick-meta').innerHTML = `
        <span class="badge-gold"><i class="fas fa-star"></i> ${rating}</span>
        <span class="badge-dim">${year}</span>
        <span class="badge-type">${type.toUpperCase()}</span>
      `;
      document.getElementById('quick-desc').textContent = data.overview ? data.overview.slice(0, 180) + '...' : '';

      document.getElementById('quick-play-btn').onclick = () => {
        this.closeQuick();
        if (type === 'tv') Player.playTV(data, 1, 1);
        else Player.playMovie(data);
      };

      document.getElementById('quick-more-btn').onclick = () => {
        this.closeQuick();
        this.openDetails(id, type);
      };

      if (window.TVNav) TVNav.setModalContext(modal);
    } catch (e) {
      this.closeQuick();
    }
  },

  closeQuick() {
    const modal = document.getElementById('quick-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    if (window.TVNav) TVNav.clearModalContext();
  }
};

window.API = API;
window.Utils = Utils;
window.App = App;
window.Search = Search;
window.Modals = Modals;

// Boot up once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
  Player.init();
  TVNav.init();
});
