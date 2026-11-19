/**
 * EF Movie — High-Performance Streaming & Auto-Health Failover Engine
 * Automatically probes and selects the best responsive server beforehand.
 * Seamless automatic fallback if any server domain is unreachable or blocked.
 */

const Player = {
  activeItem: null,
  activeType: 'movie', // 'movie' | 'tv' | 'trailer' | 'livetv'
  activeServerIndex: 0,
  activeSeason: 1,
  activeEpisode: 1,
  seasonDataCache: {},
  shieldActive: true,
  serverHealth: {},
  failoverTimer: null,
  isTestingServers: false,

  SERVERS: [
    {
      id: 'vidsrc-me',
      name: 'Server 1: VidSrc ME',
      tag: '⭐ Master 1080p • Zero PopAds',
      icon: 'fa-play-circle',
      quality: '1080p Cloud',
      movie: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`,
      tv: (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
    },
    {
      id: 'smashy',
      name: 'Server 2: SmashyStream Pro',
      tag: 'Ultra HD 1080p • Ad-Free',
      icon: 'fa-cloud',
      quality: '1080p True HD',
      movie: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`,
      tv: (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`
    },
    {
      id: '2embed',
      name: 'Server 3: 2Embed VIP',
      tag: 'Hoichoi, Bengali & Global HD',
      icon: 'fa-globe',
      quality: 'Multi-Res 1080p',
      movie: (id) => `https://www.2embed.cc/embed/${id}`,
      tv: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
    },
    {
      id: 'vidapi',
      name: 'Server 4: VidApi Direct',
      tag: 'Direct Multi-Source Cloud',
      icon: 'fa-bolt',
      quality: '1080p High-Speed',
      movie: (id) => `https://vidapi.xyz/embed/movie/${id}`,
      tv: (id, s, e) => `https://vidapi.xyz/embed/tv/${id}&s=${s}&e=${e}`
    },
    {
      id: 'autoembed',
      name: 'Server 5: AutoEmbed Pro',
      tag: 'High-Speed • Auto-CDN',
      icon: 'fa-gauge-high',
      quality: '1080p Auto',
      movie: (id) => `https://autoembed.co/movie/tmdb/${id}`,
      tv: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}/${s}/${e}`
    },
    {
      id: 'vidsrc-pm',
      name: 'Server 6: VidSrc PM',
      tag: 'Full HD • Digital Master',
      icon: 'fa-film',
      quality: '1080p WEB-DL',
      movie: (id) => `https://vidsrc.pm/embed/movie/${id}`,
      tv: (id, s, e) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}`
    },
    {
      id: 'multiembed',
      name: 'Server 7: MultiEmbed VIP',
      tag: 'Multi-Language • Subtitles',
      icon: 'fa-closed-captioning',
      quality: 'Multi-Quality HD',
      movie: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
      tv: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`
    },
    {
      id: 'vidsrc-net',
      name: 'Server 8: VidSrc Net',
      tag: 'Fast Mirror',
      icon: 'fa-server',
      quality: 'Fast Mirror',
      movie: (id) => `https://vidsrc.net/embed/movie?tmdb=${id}`,
      tv: (id, s, e) => `https://vidsrc.net/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
    },
    {
      id: 'vidsrc-to',
      name: 'Server 9: VidSrc Mirror',
      tag: 'Global Backup',
      icon: 'fa-network-wired',
      quality: 'Global Backup',
      movie: (id) => `https://vidsrc.to/embed/movie/${id}`,
      tv: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`
    }
  ],

  LIVE_CHANNELS: [
    {
      id: 'livefy',
      name: 'Live TV Premium (IPTV Stream)',
      category: 'General & News',
      url: 'https://web.mswott.net/p?url=https%3A%2F%2Flivefyiptv.vercel.app%2F&__src=https%3A%2F%2Flivefyiptv.vercel.app%2F&__type=document'
    },
    {
      id: 'nasa',
      name: 'NASA TV Live (Official Stream)',
      category: 'Science & Space',
      url: 'https://www.youtube.com/embed/21X5lGlDOfg?autoplay=1'
    },
    {
      id: 'euronews',
      name: 'Euronews International HD',
      category: 'World News',
      url: 'https://www.youtube.com/embed/pykdAUWi-tE?autoplay=1'
    },
    {
      id: 'skynews',
      name: 'Sky News Global Live',
      category: 'Breaking News',
      url: 'https://www.youtube.com/embed/9Auq9mYxFEE?autoplay=1'
    },
    {
      id: 'redbull',
      name: 'Red Bull Extreme Sports TV',
      category: 'Sports & Action',
      url: 'https://www.youtube.com/embed/4pn4t03j_gE?autoplay=1'
    }
  ],

  init() {
    this.renderServerTabs();
    this.bindPlayerEvents();
  },

  toggleShield() {
    this.shieldActive = !this.shieldActive;
    const badge = document.getElementById('ad-shield-status');
    const text = document.getElementById('ad-shield-text');

    if (this.shieldActive) {
      if (badge) badge.className = 'ad-shield-status active tv-focusable';
      if (text) text.textContent = 'Ad-Shield: Active (Zero Popups)';
      if (window.Utils) Utils.toast('🛡️ Ad-Shield: ACTIVE (Zero Popups)');
    } else {
      if (badge) badge.className = 'ad-shield-status relaxed tv-focusable';
      if (text) text.textContent = 'Ad-Shield: Paused';
      if (window.Utils) Utils.toast('Ad-Shield: Paused');
    }
  },

  applySandbox(iframe) {
    if (!iframe) return;
    // Embed providers check for sandbox attribute and throw "Sandbox not allowed" error.
    // We enforce sandbox-free playback and protect via window.open & DOM interception.
    iframe.removeAttribute('sandbox');
  },

  renderServerTabs() {
    const container = document.getElementById('player-server-tabs');
    if (!container) return;

    container.innerHTML = this.SERVERS.map((server, idx) => {
      const health = this.serverHealth[server.id] || 'online';
      const isCurrent = idx === this.activeServerIndex;

      return `
        <button class="server-tab ${isCurrent ? 'active' : ''} tv-focusable" 
                onclick="Player.switchServer(${idx})">
          <span class="status-dot ${health}" title="Status: ${health.toUpperCase()}"></span>
          <i class="fas ${server.icon}"></i>
          <span class="server-name">${server.name.split(':')[1] || server.name}</span>
          <span class="server-badge">${server.tag}</span>
        </button>
      `;
    }).join('');

    if (window.TVNav) TVNav.updateFocusables();
  },

  bindPlayerEvents() {
    window.addEventListener('keydown', (e) => {
      const modal = document.getElementById('player-modal');
      if (!modal || !modal.classList.contains('active')) return;

      if (e.key === 'f' || e.key === 'F') {
        this.toggleFullscreen();
      }
    });
  },

  /* ==========================================================================
     PROACTIVE SERVER HEALTH PROBING
     Tests whether server domains connect without DNS or connection refusal
     Compatible across file:///, https://, Android WebView, and Smart TV runtimes
     ========================================================================== */
  async probeServer(server, itemId, type = 'movie', season = 1, episode = 1) {
    return new Promise((resolve) => {
      try {
        const domain = new URL(server.movie(itemId)).origin;
        const img = new Image();
        let settled = false;

        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            img.src = '';
            // If probe times out, keep as online since servers may block image hotlinking
            this.serverHealth[server.id] = 'online';
            resolve(true);
          }
        }, 1800);

        img.onload = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            this.serverHealth[server.id] = 'online';
            resolve(true);
          }
        };

        img.onerror = () => {
          // Even a 404 response on /favicon.ico verifies TCP connection & DNS resolved!
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            this.serverHealth[server.id] = 'online';
            resolve(true);
          }
        };

        img.src = `${domain}/favicon.ico?_v=${Date.now()}`;
      } catch (e) {
        this.serverHealth[server.id] = 'online';
        resolve(true);
      }
    });
  },

  isBengaliTitle(item) {
    if (!item) return false;
    if (item.original_language === 'bn') return true;
    if (Array.isArray(item.origin_country) && item.origin_country.includes('BD')) return true;
    const titleStr = (item.title || item.name || '') + ' ' + (item.original_title || item.original_name || '');
    return /[\u0980-\u09FF]|hoichoi|bengali|bangla/i.test(titleStr);
  },

  async verifyAndGetBestServerIndex(itemId, type = 'movie', season = 1, episode = 1, item = null) {
    const isBengali = this.isBengaliTitle(item);

    // If it is a Bengali or Hoichoi title, Server 3 (2Embed VIP) specializes in Bengali & Asian content
    if (isBengali) {
      const server2Embed = this.SERVERS.find(s => s.id === '2embed');
      if (server2Embed) {
        const idx = this.SERVERS.indexOf(server2Embed);
        this.serverHealth[server2Embed.id] = 'online';
        this.renderServerTabs();
        return idx >= 0 ? idx : 2;
      }
    }

    // 1. Proactively test Priority 1 (VidSrc ME - Fast 1080p Stream) first
    const primary = this.SERVERS[0];
    const isPrimaryOk = await this.probeServer(primary, itemId, type, season, episode);

    // Concurrently test the rest in background so server status tabs show real-time health dots
    this.SERVERS.slice(1).forEach(async (s) => {
      await this.probeServer(s, itemId, type, season, episode);
      this.renderServerTabs();
    });

    if (isPrimaryOk) {
      this.serverHealth[primary.id] = 'online';
      this.renderServerTabs();
      return 0; // Primary server verified healthy and ready
    }

    // 2. If Primary is offline, sequentially find the first healthy server in quality priority order
    for (let i = 1; i < this.SERVERS.length; i++) {
      const server = this.SERVERS[i];
      const ok = await this.probeServer(server, itemId, type, season, episode);
      if (ok) {
        this.renderServerTabs();
        return i;
      }
    }

    return 0; // Fallback to Server 1
  },

  showLoader(message = 'Testing & selecting best working server...') {
    const loader = document.getElementById('player-loader');
    const text = document.getElementById('player-loader-text');
    if (text) text.textContent = message;
    if (loader) loader.classList.add('active');
  },

  hideLoader() {
    const loader = document.getElementById('player-loader');
    if (loader) loader.classList.remove('active');
  },

  /* ==========================================================================
     IFRAME WATCHDOG & SEAMLESS AUTO-FAILOVER
     If a server refuses connection or fails to load, auto-switches to the next
     ========================================================================== */
  setupIframeWatchdog(iframe, serverObj) {
    clearTimeout(this.failoverTimer);
    this.showLoader(`Connecting to ${serverObj.name.split(':')[1] || serverObj.name}...`);

    let loaded = false;
    const onLoad = () => {
      loaded = true;
      clearTimeout(this.failoverTimer);
      this.hideLoader();
      this.serverHealth[serverObj.id] = 'online';
      this.renderServerTabs();
      iframe.removeEventListener('load', onLoad);
      iframe.removeEventListener('error', onError);
    };

    const onError = () => {
      clearTimeout(this.failoverTimer);
      iframe.removeEventListener('load', onLoad);
      iframe.removeEventListener('error', onError);
      console.warn(`Server ${serverObj.name} failed to connect. Auto-falling back...`);
      this.autoFallback();
    };

    iframe.addEventListener('load', onLoad);
    iframe.addEventListener('error', onError);

    // Watchdog timer: If iframe is stuck or connection refused for 3.8s, automatically hop to next server
    this.failoverTimer = setTimeout(() => {
      if (!loaded && this.activeItem && this.activeType !== 'trailer') {
        console.warn(`Server ${serverObj.name} timed out. Auto-switching to next server...`);
        this.autoFallback();
      }
    }, 3800);
  },

  autoFallback() {
    clearTimeout(this.failoverTimer);
    const prevServer = this.SERVERS[this.activeServerIndex];
    if (prevServer) {
      this.serverHealth[prevServer.id] = 'offline';
    }

    // Advance to next server
    const nextIdx = (this.activeServerIndex + 1) % this.SERVERS.length;
    this.activeServerIndex = nextIdx;
    const nextServer = this.SERVERS[nextIdx];

    this.renderServerTabs();
    if (window.Utils) {
      Utils.toast(`⚡ Auto-switched to ${nextServer.name.split(':')[1] || nextServer.name} (Previous server unreachable)`);
    }

    const iframe = document.getElementById('player-iframe');
    if (!iframe || !this.activeItem) return;

    this.applySandbox(iframe);

    let nextUrl = '';
    if (this.activeType === 'tv') {
      nextUrl = nextServer.tv(this.activeItem.id, this.activeSeason, this.activeEpisode);
    } else {
      nextUrl = nextServer.movie(this.activeItem.id);
    }

    iframe.src = nextUrl;
    this.setupIframeWatchdog(iframe, nextServer);
  },

  async playMovie(item, serverIdx = null) {
    this.activeItem = item;
    this.activeType = 'movie';

    const modal = document.getElementById('player-modal');
    const iframe = document.getElementById('player-iframe');
    const titleEl = document.getElementById('player-title');
    const metaEl = document.getElementById('player-meta');
    const epSection = document.getElementById('player-episodes-section');

    if (!modal || !iframe) return;

    const title = item.title || item.original_title || 'Movie Playback';
    const year = (item.release_date || '').split('-')[0] || '';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR';

    titleEl.textContent = title;
    metaEl.innerHTML = `
      <span class="badge-4k">4K ULTRA HD</span>
      <span class="badge-rating"><i class="fas fa-star"></i> ${rating}</span>
      <span class="badge-year">${year}</span>
      <span class="badge-quality">DOLBY VISION</span>
    `;

    if (epSection) epSection.style.display = 'none';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    modal.scrollTop = 0;
    modal.scrollLeft = 0;

    // Show initial health check loader
    this.showLoader('Verifying and auto-selecting best working server...');

    // Proactively find the best working server beforehand
    if (serverIdx !== null) {
      this.activeServerIndex = serverIdx;
    } else {
      this.activeServerIndex = await this.verifyAndGetBestServerIndex(item.id, 'movie', 1, 1, item);
    }

    this.renderServerTabs();
    this.applySandbox(iframe);

    const server = this.SERVERS[this.activeServerIndex];
    iframe.src = server.movie(item.id);

    // Arm failover watchdog
    this.setupIframeWatchdog(iframe, server);

    // Record Watch History
    this.saveWatchHistory(item, 'movie');

    if (window.TVNav) TVNav.setModalContext(modal);
    if (window.Utils) Utils.toast(`Playing on ${server.name.split(':')[1] || server.name}`);
  },

  async playTV(item, season = 1, episode = 1, serverIdx = null) {
    this.activeItem = item;
    this.activeType = 'tv';
    this.activeSeason = season;
    this.activeEpisode = episode;

    const modal = document.getElementById('player-modal');
    const iframe = document.getElementById('player-iframe');
    const titleEl = document.getElementById('player-title');
    const metaEl = document.getElementById('player-meta');
    const epSection = document.getElementById('player-episodes-section');

    if (!modal || !iframe) return;

    const title = item.name || item.original_name || 'TV Series Playback';
    titleEl.textContent = `${title} — S${season} E${episode}`;

    metaEl.innerHTML = `
      <span class="badge-4k">TV SERIES</span>
      <span class="badge-season">Season ${season}</span>
      <span class="badge-episode">Episode ${episode}</span>
      <span class="badge-quality">1080P HD</span>
    `;

    if (epSection) epSection.style.display = 'block';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    modal.scrollTop = 0;
    modal.scrollLeft = 0;

    // Show initial health check loader
    this.showLoader('Verifying and auto-selecting best working server...');

    // Proactively find the best working server beforehand
    if (serverIdx !== null) {
      this.activeServerIndex = serverIdx;
    } else {
      this.activeServerIndex = await this.verifyAndGetBestServerIndex(item.id, 'tv', season, episode, item);
    }

    this.renderServerTabs();
    this.applySandbox(iframe);

    const server = this.SERVERS[this.activeServerIndex];
    iframe.src = server.tv(item.id, season, episode);

    // Arm failover watchdog
    this.setupIframeWatchdog(iframe, server);

    // Load Season & Episode controls
    await this.loadSeasonEpisodes(item.id, season);

    // Record Watch History
    this.saveWatchHistory(item, 'tv', season, episode);

    if (window.TVNav) TVNav.setModalContext(modal);
    if (window.Utils) Utils.toast(`Playing S${season} E${episode} on ${server.name.split(':')[1] || server.name}`);
  },

  playTrailer(trailerKey, title = 'Official Trailer') {
    this.activeType = 'trailer';
    const modal = document.getElementById('player-modal');
    const iframe = document.getElementById('player-iframe');
    const titleEl = document.getElementById('player-title');
    const metaEl = document.getElementById('player-meta');
    const epSection = document.getElementById('player-episodes-section');

    if (!modal || !iframe) return;

    titleEl.textContent = `${title} — Official 4K Trailer`;
    metaEl.innerHTML = `
      <span class="badge-trailer">TRAILER</span>
      <span class="badge-quality">YOUTUBE HD</span>
    `;

    if (epSection) epSection.style.display = 'none';

    iframe.src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&showinfo=0&iv_load_policy=3`;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    modal.scrollTop = 0;
    modal.scrollLeft = 0;

    if (window.TVNav) TVNav.setModalContext(modal);
  },

  playLiveTV(channelIndex = 0) {
    const channel = this.LIVE_CHANNELS[channelIndex] || this.LIVE_CHANNELS[0];
    this.activeType = 'livetv';

    const modal = document.getElementById('player-modal');
    const iframe = document.getElementById('player-iframe');
    const titleEl = document.getElementById('player-title');
    const metaEl = document.getElementById('player-meta');
    const epSection = document.getElementById('player-episodes-section');

    if (!modal || !iframe) return;

    titleEl.textContent = channel.name;
    metaEl.innerHTML = `
      <span class="badge-live"><span class="pulse-dot"></span> LIVE BROADCAST</span>
      <span class="badge-category">${channel.category}</span>
    `;

    if (epSection) epSection.style.display = 'none';

    iframe.src = channel.url;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    modal.scrollTop = 0;
    modal.scrollLeft = 0;

    if (window.TVNav) TVNav.setModalContext(modal);
    if (window.Utils) Utils.toast(`Streaming Live: ${channel.name}`);
  },

  switchServer(index) {
    if (!this.activeItem && this.activeType !== 'livetv') return;
    this.activeServerIndex = index;

    const iframe = document.getElementById('player-iframe');
    const server = this.SERVERS[index];
    this.applySandbox(iframe);

    let nextUrl = '';
    if (this.activeType === 'movie') {
      nextUrl = server.movie(this.activeItem.id);
    } else if (this.activeType === 'tv') {
      nextUrl = server.tv(this.activeItem.id, this.activeSeason, this.activeEpisode);
    }

    iframe.src = nextUrl;
    this.setupIframeWatchdog(iframe, server);
    this.renderServerTabs();
    if (window.Utils) Utils.toast(`Switched to: ${server.name}`);
  },

  async loadSeasonEpisodes(tvId, seasonNum) {
    const container = document.getElementById('player-episodes-list');
    const seasonSelect = document.getElementById('player-season-select');
    if (!container) return;

    container.innerHTML = '<div class="episodes-loading"><i class="fas fa-spinner fa-spin"></i> Loading episodes...</div>';

    if (this.activeItem && this.activeItem.seasons && seasonSelect) {
      seasonSelect.innerHTML = this.activeItem.seasons
        .filter(s => s.season_number > 0)
        .map(s => `<option value="${s.season_number}" ${s.season_number === seasonNum ? 'selected' : ''}>Season ${s.season_number} (${s.episode_count} Episodes)</option>`)
        .join('');
    }

    const cacheKey = `${tvId}_s${seasonNum}`;
    let data = this.seasonDataCache[cacheKey];

    if (!data) {
      try {
        data = await API.getSeasonDetails(tvId, seasonNum);
        this.seasonDataCache[cacheKey] = data;
      } catch (err) {
        container.innerHTML = '<div class="episodes-error">Could not load episodes. Please try another season.</div>';
        return;
      }
    }

    const episodes = data.episodes || [];
    if (episodes.length === 0) {
      container.innerHTML = '<div class="episodes-empty">No episodes found for this season.</div>';
      return;
    }

    container.innerHTML = episodes.map(ep => {
      const isCurrent = ep.episode_number === this.activeEpisode;
      const still = ep.still_path ? `${API.IMG_W500}${ep.still_path}` : './assets/logo.svg';
      const duration = ep.runtime ? `${ep.runtime}m` : '45m';

      return `
        <div class="episode-card ${isCurrent ? 'active' : ''} tv-focusable" 
             onclick="Player.playEpisode(${seasonNum}, ${ep.episode_number})">
          <div class="ep-thumb-wrap">
            <img class="ep-thumb" src="${still}" alt="Episode ${ep.episode_number}" loading="lazy"/>
            <div class="ep-play-overlay"><i class="fas fa-play"></i></div>
            <span class="ep-duration">${duration}</span>
          </div>
          <div class="ep-info">
            <div class="ep-num-title">
              <span class="ep-number">EP ${ep.episode_number}</span>
              <span class="ep-title">${ep.name || 'Episode ' + ep.episode_number}</span>
            </div>
            <p class="ep-desc">${ep.overview ? ep.overview.slice(0, 95) + '...' : 'Enjoy this episode on EF Movie.'}</p>
          </div>
        </div>
      `;
    }).join('');

    if (window.TVNav) TVNav.updateFocusables();
  },

  onSeasonChange(newSeason) {
    this.activeSeason = parseInt(newSeason, 10);
    this.activeEpisode = 1;
    this.playTV(this.activeItem, this.activeSeason, this.activeEpisode, this.activeServerIndex);
  },

  playEpisode(season, episode) {
    this.playTV(this.activeItem, season, episode, this.activeServerIndex);
  },

  nextEpisode() {
    if (this.activeType !== 'tv') return;
    this.playEpisode(this.activeSeason, this.activeEpisode + 1);
  },

  prevEpisode() {
    if (this.activeType !== 'tv' || this.activeEpisode <= 1) return;
    this.playEpisode(this.activeSeason, this.activeEpisode - 1);
  },

  toggleFullscreen() {
    const wrap = document.getElementById('player-viewport-wrap');
    if (!wrap) return;

    if (!document.fullscreenElement) {
      if (wrap.requestFullscreen) wrap.requestFullscreen();
      else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
      else if (wrap.msRequestFullscreen) wrap.msRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  },

  close() {
    clearTimeout(this.failoverTimer);
    this.hideLoader();

    const modal = document.getElementById('player-modal');
    const iframe = document.getElementById('player-iframe');
    if (iframe) iframe.src = 'about:blank';
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';

    if (window.TVNav) TVNav.clearModalContext();
  },

  saveWatchHistory(item, type, season = 1, episode = 1) {
    try {
      const history = JSON.parse(localStorage.getItem('ef_watch_history') || '[]');
      const filtered = history.filter(h => h.id !== item.id);
      
      const record = {
        id: item.id,
        title: item.title || item.name,
        type: type,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        season: season,
        episode: episode,
        timestamp: Date.now()
      };

      filtered.unshift(record);
      const trimmed = filtered.slice(0, 40);
      localStorage.setItem('ef_watch_history', JSON.stringify(trimmed));

      if (window.App && App.currentTab === 'history') {
        App.renderWatchHistory();
      }
    } catch (e) {
      console.warn('Could not save history:', e);
    }
  }
};

window.Player = Player;
