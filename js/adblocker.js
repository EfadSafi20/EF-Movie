/**
 * EF Movie — Anti-Popup & Ad Shield Engine (Sandbox-Free Protection)
 * Prevents popups, redirects, hidden clickjack overlays, and ad network scripts
 * Fully compatible with all video streaming servers (No "Sandbox not allowed" error)
 */

(function () {
  'use strict';

  const LOG_PREFIX = '[EF Shield]';
  const log = (msg) => console.warn(`${LOG_PREFIX} ${msg}`);

  // Known Ad, Popunder, and Clickjack Domains
  const AD_DOMAINS = [
    'popads', 'popcash', 'adnxs', 'doubleclick', 'googlesyndication',
    'adservice', 'pagead2', 'propellerads', 'adsterra', 'hilltopads',
    'trafficjunky', 'exoclick', 'juicyads', 'adcash', 'revcontent',
    'mgid', 'taboola', 'outbrain', 'popunder', 'clickadu', 'adfly',
    'adf.ly', 'shorte.st', 'ouo.io', 'bc.vc', 'linkvertise', 'admaven',
    'admavenads', 'popcornads', 'popnads', 'monetag', 'galaksion',
    'onclick', '1xbet', 'bet365', 'dafabet', 'vidsrc.stream', 'syndication',
    'whomever', 'alwingulla', 'deloton', 'serving-sys', 'adclick', 'adroll',
    'trafficvenue', 'adxpansion', 'popmyads', 'zeroredirect', 'admaven',
    'wakemenoutlip', 'tagivi', 'profiton', 'exdynsrv', 'trafficfactory',
    'traffichunt', 'adxcore', 'fastclick', 'coinhive', 'deloton', 'ad-maven'
  ];

  // Whitelisted Safe Core Domains
  const SAFE_DOMAINS = [
    'themoviedb.org', 'tmdb.org', 'youtube.com', 'youtu.be',
    'google.com', 'gstatic.com', 'googleapis.com', 'cloudflare.com',
    'smashystream.com', 'vidsrc.pm', 'multiembed.mov', 'vidsrc.me',
    'vidsrc.net', 'vidsrc.to', 'vercel.app', 'mswott.net'
  ];

  // EF Movie Internal Element Signatures
  const OWN_ELEMENTS = [
    'player', 'modal', 'details', 'spotlight', 'shelf', 'card', 'header',
    'footer', 'toast', 'progress', 'search', 'grid', 'nav', 'platform',
    'tv', 'episode', 'server', 'quick', 'cast', 'genre', 'ad-shield'
  ];

  function isOwnElement(node) {
    if (!node || node.nodeType !== 1) return true;
    const id = (node.id || '').toLowerCase();
    const cls = typeof node.className === 'string' ? node.className.toLowerCase() : '';
    return OWN_ELEMENTS.some(k => id.includes(k) || cls.includes(k));
  }

  function isAdUrl(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    return AD_DOMAINS.some(d => lower.includes(d));
  }

  function isSafeUrl(url) {
    if (!url) return true;
    const lower = url.toLowerCase();
    if (url.startsWith('#') || url.startsWith('/') || url.startsWith('./')) return true;
    return SAFE_DOMAINS.some(d => lower.includes(d));
  }

  /* ==========================================================================
     LAYER 1: NATIVE WINDOW.OPEN BLOCKER
     Completely intercepts window.open calls across desktop, mobile & Smart TVs
     ========================================================================== */
  const originalWindowOpen = window.open;

  window.open = function (url, target, features) {
    // If no URL or points to external ad/blank page, block it
    if (!url || !isSafeUrl(url) || isAdUrl(url) || target === '_blank') {
      log(`Blocked unauthorized popup attempt: ${url || 'blank/new-tab'}`);
      return null;
    }
    return originalWindowOpen.call(window, url, target, features);
  };

  /* ==========================================================================
     LAYER 2: TOP-LEVEL NAVIGATION LOCK
     Prevents embed players from hijacking the current page URL
     ========================================================================== */
  window.addEventListener('beforeunload', function (e) {
    const playerModal = document.getElementById('player-modal');
    if (playerModal && playerModal.classList.contains('active')) {
      log('Intercepted rogue redirect attempt while video player is open.');
    }
  });

  /* ==========================================================================
     LAYER 3: CLICK & TOUCH INTERCEPTOR (CAPTURE PHASE)
     Stops rogue ad anchor tags before any click event bubbles
     ========================================================================== */
  function interceptRogueClick(e) {
    let target = e.target;
    while (target && target !== document.body) {
      if (target.tagName === 'A') {
        const href = target.getAttribute('href') || '';
        const isBlank = target.getAttribute('target') === '_blank';

        if (isAdUrl(href) || (isBlank && !isSafeUrl(href))) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          log(`Neutralized ad link: ${href}`);
          return false;
        }
      }
      target = target.parentElement;
    }
  }

  document.addEventListener('click', interceptRogueClick, true);
  document.addEventListener('auxclick', interceptRogueClick, true);
  document.addEventListener('touchend', interceptRogueClick, true);

  /* ==========================================================================
     LAYER 4: BLUR & TAB-SWITCH POPUNDER TRAP
     Prevents stealth popunders that spawn when switching tabs or clicking frames
     ========================================================================== */
  window.addEventListener('blur', function () {
    // Temporarily nullify window.open to trap popunder scripts
    window.open = function () {
      log('Blocked popunder on window blur');
      return null;
    };
    const playerModal = document.getElementById('player-modal');
    if (playerModal && playerModal.classList.contains('active')) {
      setTimeout(() => {
        window.focus();
      }, 50);
    }
    setTimeout(() => {
      window.open = function (url, target, features) {
        if (!url || !isSafeUrl(url) || isAdUrl(url)) {
          log(`Blocked delayed popup: ${url}`);
          return null;
        }
        return originalWindowOpen.call(window, url, target, features);
      };
    }, 2500);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      window.open = function () {
        log('Blocked background popup on visibility change');
        return null;
      };
      setTimeout(() => {
        window.open = function (url, target, features) {
          if (!url || !isSafeUrl(url) || isAdUrl(url)) return null;
          return originalWindowOpen.call(window, url, target, features);
        };
      }, 2500);
    }
  });

  /* ==========================================================================
     LAYER 5: MUTATION OBSERVER — REMOVE INVISIBLE FULLSCREEN OVERLAYS
     Strips rogue overlay <div> elements inserted to hijack play clicks
     ========================================================================== */
  const observer = new MutationObserver(function (mutations) {
    for (let m of mutations) {
      for (let node of m.addedNodes) {
        if (!node || node.nodeType !== 1) continue;
        const tag = node.tagName.toLowerCase();

        // 1. Block rogue ad scripts or unauthorized iframes
        if (tag === 'script' || tag === 'iframe') {
          const src = (node.src || node.getAttribute('src') || '').toLowerCase();
          if (isAdUrl(src) && node.id !== 'player-iframe') {
            node.remove();
            log(`Removed injected ad script/iframe: ${src}`);
            continue;
          }
        }

        // 2. Block full-screen invisible clickjack overlays
        if (tag === 'div' || tag === 'a' || tag === 'span' || tag === 'ins') {
          if (!isOwnElement(node)) {
            try {
              const style = window.getComputedStyle(node);
              const zIndex = parseInt(style.zIndex, 10);
              const isFixed = style.position === 'fixed' || style.position === 'absolute';
              const isFull = node.offsetWidth >= window.innerWidth * 0.7 && node.offsetHeight >= window.innerHeight * 0.7;

              if (isFixed && (zIndex > 9000 || isFull)) {
                node.remove();
                log(`Removed clickjack overlay: zIndex=${zIndex}, tag=${tag}`);
              }
            } catch (err) {}
          }
        }
      }
    }
  });

  /* ==========================================================================
     LAYER 6: ENSURE SANDBOX-FREE PLAYER IFRAME
     Explicitly ensures no sandbox attribute is set so video plays without error
     ========================================================================== */
  function ensureNoSandbox() {
    const playerIframe = document.getElementById('player-iframe');
    if (playerIframe && playerIframe.hasAttribute('sandbox')) {
      playerIframe.removeAttribute('sandbox');
      log('Ensured sandbox attribute is removed for uninterrupted playback.');
    }
  }

  function periodicCleanSweep() {
    ensureNoSandbox();

    // Clean rogue fixed overlays
    const allDivs = document.querySelectorAll('div, a, ins');
    allDivs.forEach(el => {
      if (!isOwnElement(el)) {
        try {
          const st = window.getComputedStyle(el);
          const zi = parseInt(st.zIndex, 10);
          if (st.position === 'fixed' && zi > 9999) {
            el.remove();
            log('Clean-sweep eliminated rogue overlay');
          }
        } catch (e) {}
      }
    });
  }

  // Initialize Shield
  function initShield() {
    observer.observe(document.body, { childList: true, subtree: true });
    ensureNoSandbox();

    setTimeout(periodicCleanSweep, 800);
    setTimeout(periodicCleanSweep, 2500);
    setTimeout(periodicCleanSweep, 5000);

    document.addEventListener('click', () => setTimeout(periodicCleanSweep, 200), { passive: true });
    document.addEventListener('touchstart', () => setTimeout(periodicCleanSweep, 200), { passive: true });

    console.log('%c [EF Movie] 🛡️ Sandbox-Free Anti-Popup Shield Active ', 'background:#00E5FF; color:#000; font-weight:bold; border-radius:4px; padding:2px 6px;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShield);
  } else {
    initShield();
  }

  window.EFShield = {
    ensureNoSandbox: ensureNoSandbox,
    sweep: periodicCleanSweep
  };
})();
