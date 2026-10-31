/**
 * NOCTIS — Main Interactive Engine
 * Vanilla JavaScript, zero dependencies, precision motion.
 */

(function () {
  'use strict';

  // Grab global config
  const cfg = window.CONFIG || {};

  // Check reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    document.body.classList.add('reduce-motion');
  }

  /* ==========================================================================
     IMAGE CACHE & ASSET MANAGER
     ========================================================================== */
  class ImageSequenceLoader {
    constructor(prefixDesk, prefixMob, count, ext = '.webp', pad = 4, onFirstFrameLoaded = null) {
      this.prefixDesk = prefixDesk;
      this.prefixMob = prefixMob;
      this.count = count;
      this.ext = ext;
      this.pad = pad;
      this.onFirstFrameLoaded = onFirstFrameLoaded;
      this.images = new Array(count);
      this.loadedIndices = new Set();
      this.isMobile = window.innerWidth < 768;
    }

    getUrl(index) {
      const num = String(index + 1).padStart(this.pad, '0');
      const prefix = this.isMobile ? this.prefixMob : this.prefixDesk;
      return `${prefix}${num}${this.ext}`;
    }

    loadFrame(index) {
      if (index < 0 || index >= this.count) return Promise.resolve(null);
      if (this.images[index]) return Promise.resolve(this.images[index]);

      return new Promise((resolve) => {
        const img = new Image();
        img.src = this.getUrl(index);
        
        img.onload = () => {
          this.loadedIndices.add(index);
          this.images[index] = img;
          if (index === 0 && typeof this.onFirstFrameLoaded === 'function') {
            this.onFirstFrameLoaded(img);
          }
          // Non-blocking decode in background
          if ('decode' in img) {
            img.decode().catch(() => {});
          }
          resolve(img);
        };

        img.onerror = () => {
          // Fallback gracefully without breaking Promise.all
          resolve(null);
        };
      });
    }

    getNearestLoaded(targetIndex) {
      if (this.loadedIndices.has(targetIndex) && this.images[targetIndex]) {
        return this.images[targetIndex];
      }
      if (this.loadedIndices.size === 0) {
        return null;
      }
      let best = null;
      let minDiff = Infinity;
      for (const idx of this.loadedIndices) {
        const diff = Math.abs(idx - targetIndex);
        if (diff < minDiff && this.images[idx]) {
          minDiff = diff;
          best = this.images[idx];
        }
      }
      return best;
    }

    updateMobileState() {
      const mob = window.innerWidth < 768;
      if (mob !== this.isMobile) {
        this.isMobile = mob;
        this.images = new Array(this.count);
        this.loadedIndices.clear();
      }
    }
  }

  // Initialize Hero & Dismantle loaders
  const heroLoader = new ImageSequenceLoader(
    cfg.hero.pathDesktop,
    cfg.hero.pathMobile,
    cfg.hero.frameCount,
    cfg.hero.extension,
    cfg.hero.padLength,
    () => {
      // Immediate paint when first hero frame arrives
      renderHero(true);
    }
  );

  const dismantleLoader = new ImageSequenceLoader(
    cfg.dismantle.pathDesktop,
    cfg.dismantle.pathMobile,
    cfg.dismantle.frameCount,
    cfg.dismantle.extension,
    cfg.dismantle.padLength,
    () => {
      renderDismantle(true);
    }
  );

  /* ==========================================================================
     CANVAS DRAWING UTILITY
     Cover-fit on landscape, contain-fit on portrait (centred on #07080A)
     ========================================================================== */
  function drawImageOnCanvas(canvas, ctx, img) {
    if (!canvas || !ctx || !img) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round((rect.width || window.innerWidth) * dpr);
    const h = Math.round((rect.height || window.innerHeight) * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.fillStyle = '#07080A'; // --asphalt background
    ctx.fillRect(0, 0, w, h);

    const isLandscape = w >= h;
    const imgW = img.naturalWidth || img.width || 1600;
    const imgH = img.naturalHeight || img.height || 900;
    const imgRatio = imgW / imgH;
    const canvasRatio = w / h;

    let drawW, drawH, drawX, drawY;

    if (isLandscape) {
      // Cover fit
      if (canvasRatio > imgRatio) {
        drawW = w;
        drawH = w / imgRatio;
        drawX = 0;
        drawY = (h - drawH) / 2;
      } else {
        drawH = h;
        drawW = h * imgRatio;
        drawX = (w - drawW) / 2;
        drawY = 0;
      }
    } else {
      // Portrait contain-fit: vertically centred, car is never cropped
      if (canvasRatio > imgRatio) {
        drawH = h;
        drawW = h * imgRatio;
        drawX = (w - drawW) / 2;
        drawY = 0;
      } else {
        drawW = w;
        drawH = w / imgRatio;
        drawX = 0;
        drawY = (h - drawH) / 2;
      }
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  /* ==========================================================================
     SECTION 1: HERO SCROLLYTELLING
     ========================================================================== */
  const heroWrapper = document.getElementById('hero');
  const heroCanvas = document.getElementById('hero-canvas');
  const heroCtx = heroCanvas ? heroCanvas.getContext('2d') : null;
  const heroProgressLine = document.getElementById('hero-progress-line');
  const heroFadeOverlay = document.getElementById('hero-fade-overlay');

  const hudChapterText = document.getElementById('hud-chapter-text');
  const hudSpeed = document.getElementById('hud-speed');
  const hudDistance = document.getElementById('hud-distance');

  const chapterEls = {
    1: document.querySelector('.chapter-1'),
    2: document.querySelector('.chapter-2'),
    3: document.querySelector('.chapter-3'),
    4: document.querySelector('.chapter-4')
  };

  let heroProgress = 0;
  let heroCurrentFrame = 0;
  let heroTargetFrame = 0;
  let heroLastRenderedFrame = -1;

  function updateHeroProgress() {
    if (!heroWrapper) return;
    const rect = heroWrapper.getBoundingClientRect();
    const scrollDist = heroWrapper.offsetHeight - window.innerHeight;
    
    if (scrollDist > 0) {
      heroProgress = Math.max(0, Math.min(1, -rect.top / scrollDist));
    } else {
      heroProgress = 0;
    }
    heroTargetFrame = Math.round(heroProgress * (heroLoader.count - 1));

    // Bottom 1px xenon progress line
    if (heroProgressLine) {
      heroProgressLine.style.width = `${(heroProgress * 100).toFixed(2)}%`;
    }

    // Fade to solid black over last 5% of scroll (0.95 -> 1.00)
    if (heroFadeOverlay) {
      const fadeStart = (cfg.hero && cfg.hero.fadeToBlackStart) || 0.95;
      if (heroProgress >= fadeStart) {
        const fadePct = (heroProgress - fadeStart) / (1 - fadeStart);
        heroFadeOverlay.style.opacity = fadePct.toFixed(3);
      } else {
        heroFadeOverlay.style.opacity = '0';
      }
    }

    // Telemetry HUD updates
    if (hudSpeed) {
      const maxSpd = (cfg.hero && cfg.hero.hud && cfg.hero.hud.maxSpeed) || 118;
      const spd = Math.round(heroProgress * maxSpd);
      hudSpeed.textContent = `${String(spd).padStart(3, '0')} KM/H`;
    }
    if (hudDistance) {
      const maxDist = (cfg.hero && cfg.hero.hud && cfg.hero.hud.maxDistance) || 4.2;
      const dist = (heroProgress * maxDist).toFixed(1);
      hudDistance.textContent = `${dist} KM`;
    }

    updateHeroChapters(heroProgress);
  }

  function updateHeroChapters(p) {
    const chapters = (cfg.hero && cfg.hero.chapters) || [];
    let activeChapterNum = '01';

    chapters.forEach((ch, idx) => {
      const num = idx + 1;
      const el = chapterEls[num];
      if (!el) return;

      const isActive = p >= ch.start && p <= ch.end;
      if (isActive) {
        activeChapterNum = ch.number;
        if (!el.classList.contains('is-active')) {
          el.classList.add('is-active');
          el.querySelectorAll('.line-mask').forEach((m) => m.classList.add('is-revealed'));
        }
      } else {
        if (el.classList.contains('is-active')) {
          el.classList.remove('is-active');
          el.querySelectorAll('.line-mask').forEach((m) => m.classList.remove('is-revealed'));
        }
      }
    });

    if (hudChapterText) {
      hudChapterText.textContent = `${activeChapterNum} / 04`;
    }
  }

  function renderHero(force = false) {
    if (!heroCanvas || !heroCtx) return;
    const rounded = Math.round(heroCurrentFrame);
    if (force || rounded !== heroLastRenderedFrame) {
      const img = heroLoader.getNearestLoaded(rounded);
      if (img) {
        drawImageOnCanvas(heroCanvas, heroCtx, img);
        heroLastRenderedFrame = rounded;
      }
    }
  }

  /* ==========================================================================
     SECTION 2: STATEMENT (Word by word reveal)
     ========================================================================== */
  const statementSection = document.getElementById('statement');
  const statementQuote = document.getElementById('statement-text');

  if (statementQuote) {
    const text = statementQuote.textContent.trim();
    const words = text.split(/\s+/);
    statementQuote.innerHTML = words
      .map((w) => `<span class="word">${w}</span>`)
      .join(' ');
  }

  function updateStatementReveal() {
    if (!statementSection || !statementQuote) return;
    const rect = statementSection.getBoundingClientRect();
    const windowH = window.innerHeight;
    
    const startY = windowH * 0.85;
    const endY = windowH * 0.25;
    const p = Math.max(0, Math.min(1, (startY - rect.top) / (startY - endY)));

    const wordSpans = statementQuote.querySelectorAll('.word');
    const totalWords = wordSpans.length;

    wordSpans.forEach((span, i) => {
      const wordThreshold = i / totalWords;
      if (p >= wordThreshold) {
        const wordProgress = Math.min(1, (p - wordThreshold) * totalWords);
        span.style.opacity = (0.15 + 0.85 * wordProgress).toFixed(2);
      } else {
        span.style.opacity = '0.15';
      }
    });
  }

  /* ==========================================================================
     SECTION 3: DISMANTLE SCROLLYTELLING
     ========================================================================== */
  const dismantleWrapper = document.getElementById('dismantle');
  const dismantleCanvas = document.getElementById('dismantle-canvas');
  const dismantleCtx = dismantleCanvas ? dismantleCanvas.getContext('2d') : null;
  const dismantleProgressLine = document.getElementById('dismantle-progress-line');
  const dismantleCallouts = document.querySelectorAll('.dismantle-callout');

  let dismantleProgress = 0;
  let dismantleCurrentFrame = 0;
  let dismantleTargetFrame = 0;
  let dismantleLastRenderedFrame = -1;

  function updateDismantleProgress() {
    if (!dismantleWrapper) return;
    const rect = dismantleWrapper.getBoundingClientRect();
    const scrollDist = dismantleWrapper.offsetHeight - window.innerHeight;
    if (scrollDist > 0) {
      dismantleProgress = Math.max(0, Math.min(1, -rect.top / scrollDist));
    } else {
      dismantleProgress = 0;
    }
    dismantleTargetFrame = Math.round(dismantleProgress * (dismantleLoader.count - 1));

    if (dismantleProgressLine) {
      dismantleProgressLine.style.width = `${(dismantleProgress * 100).toFixed(2)}%`;
    }

    const cfgCallouts = (cfg.dismantle && cfg.dismantle.callouts) || [];
    dismantleCallouts.forEach((el) => {
      const id = el.getAttribute('data-id');
      const item = cfgCallouts.find((c) => c.id === id);
      if (item) {
        if (dismantleProgress >= item.triggerProgress) {
          el.classList.add('is-visible');
        } else {
          el.classList.remove('is-visible');
        }
      }
    });
  }

  function renderDismantle(force = false) {
    if (!dismantleCanvas || !dismantleCtx) return;
    const rounded = Math.round(dismantleCurrentFrame);
    if (force || rounded !== dismantleLastRenderedFrame) {
      const img = dismantleLoader.getNearestLoaded(rounded);
      if (img) {
        drawImageOnCanvas(dismantleCanvas, dismantleCtx, img);
        dismantleLastRenderedFrame = rounded;
      }
    }
  }

  /* ==========================================================================
     ANIMATION LOOP
     ========================================================================== */
  function onScroll() {
    updateHeroProgress();
    updateStatementReveal();
    updateDismantleProgress();
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  function tick() {
    if (!prefersReducedMotion) {
      const lerp = (cfg.preload && cfg.preload.lerpFactor) || 0.15;
      heroCurrentFrame += (heroTargetFrame - heroCurrentFrame) * lerp;
      renderHero();

      dismantleCurrentFrame += (dismantleTargetFrame - dismantleCurrentFrame) * lerp;
      renderDismantle();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Resize listener
  window.addEventListener('resize', () => {
    heroLoader.updateMobileState();
    dismantleLoader.updateMobileState();
    renderHero(true);
    renderDismantle(true);
  }, { passive: true });

  /* ==========================================================================
     SECTION 4: LINEUP ACCORDION (Hover & Focus)
     ========================================================================== */
  const lineupSection = document.getElementById('lineup');
  const slides = document.querySelectorAll('.lineup-slide');
  let activeSlideIndex = (cfg.lineup && cfg.lineup.defaultOpenIndex) || 0;
  let hoverTimeout = null;

  function setActiveSlide(index) {
    if (index === activeSlideIndex) return;
    activeSlideIndex = index;

    slides.forEach((slide, idx) => {
      const isOpen = idx === index;
      slide.classList.toggle('is-open', isOpen);
      slide.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

      const masks = slide.querySelectorAll('.line-mask');
      if (isOpen) {
        masks.forEach((m, mIdx) => {
          setTimeout(() => m.classList.add('is-revealed'), mIdx * 60);
        });
      } else {
        masks.forEach((m) => m.classList.remove('is-revealed'));
      }
    });

    if (cursor && cursor.classList.contains('is-hovering') && cursorLabel) {
      cursorLabel.textContent = 'CONFIGURE';
    }
  }

  slides.forEach((slide, idx) => {
    if (idx === activeSlideIndex) {
      slide.querySelectorAll('.line-mask').forEach((m, mIdx) => {
        setTimeout(() => m.classList.add('is-revealed'), mIdx * 60 + 200);
      });
    }

    slide.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        setActiveSlide(idx);
      }, (cfg.lineup && cfg.lineup.hoverDebounceMs) || 80);
    });

    slide.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
    });

    slide.addEventListener('click', () => {
      setActiveSlide(idx);
    });

    const swatches = slide.querySelectorAll('.swatch');
    swatches.forEach((sw) => {
      sw.addEventListener('click', (e) => {
        e.stopPropagation();
        swatches.forEach((s) => s.classList.remove('is-active'));
        sw.classList.add('is-active');
      });
    });
  });

  if (lineupSection) {
    lineupSection.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        const next = (activeSlideIndex - 1 + slides.length) % slides.length;
        setActiveSlide(next);
        slides[next].focus();
      } else if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const next = (activeSlideIndex + 1) % slides.length;
        setActiveSlide(next);
        slides[next].focus();
      }
    });

    const lineupObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            slides.forEach((s, sIdx) => {
              s.style.opacity = '0';
              s.style.transform = 'translateY(40px)';
              setTimeout(() => {
                s.style.transition = 'opacity 0.8s var(--easing), transform 0.8s var(--easing), flex-grow 0.7s var(--easing), height 0.6s var(--easing)';
                s.style.opacity = '1';
                s.style.transform = 'translateY(0)';
              }, sIdx * 80);
            });
            lineupObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    lineupObserver.observe(lineupSection);
  }

  /* ==========================================================================
     HEADER / NAV (Hide on scroll down, show on scroll up)
     ========================================================================== */
  const nav = document.getElementById('main-nav');
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const currY = window.scrollY;
    if (nav) {
      if (currY > lastScrollY && currY > 120) {
        nav.classList.add('is-hidden');
      } else {
        nav.classList.remove('is-hidden');
      }
    }
    lastScrollY = currY;
  }, { passive: true });

  /* ==========================================================================
     CUSTOM CURSOR ("THE HEADLIGHT")
     ========================================================================== */
  const cursor = document.getElementById('custom-cursor');
  const cursorLabel = cursor ? cursor.querySelector('.cursor-label') : null;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let cursorX = mouseX;
  let cursorY = mouseY;
  const isPointerFine = window.matchMedia('(pointer: fine)').matches;

  if (cursor && isPointerFine && !prefersReducedMotion) {
    let hasMoved = false;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!hasMoved) {
        hasMoved = true;
        cursor.style.display = 'flex';
      }
    }, { passive: true });

    window.addEventListener('mousedown', () => {
      cursor.classList.add('is-active');
      setTimeout(() => cursor.classList.remove('is-active'), 120);
    });

    function updateCursor() {
      const lerp = (cfg.preload && cfg.preload.cursorLerp) || 0.18;
      cursorX += (mouseX - cursorX) * lerp;
      cursorY += (mouseY - cursorY) * lerp;
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
      requestAnimationFrame(updateCursor);
    }
    requestAnimationFrame(updateCursor);

    function attachCursorHovers() {
      const interactives = document.querySelectorAll('a, button, [data-cursor], .lineup-slide');
      interactives.forEach((el) => {
        el.addEventListener('mouseenter', () => {
          cursor.classList.add('is-hovering');
          let label = el.getAttribute('data-cursor');
          if (!label) {
            if (el.classList.contains('lineup-slide')) {
              label = el.classList.contains('is-open') ? 'CONFIGURE' : 'OPEN';
            } else if (el.tagName === 'A' || el.tagName === 'BUTTON') {
              label = 'VIEW';
            }
          }
          if (cursorLabel) cursorLabel.textContent = label || '';
        });

        el.addEventListener('mouseleave', () => {
          cursor.classList.remove('is-hovering');
          if (cursorLabel) cursorLabel.textContent = '';
        });
      });
    }
    attachCursorHovers();
  }

  /* ==========================================================================
     FIXED FILM GRAIN OVERLAY
     ========================================================================== */
  const grainCanvas = document.getElementById('grain-canvas');
  if (grainCanvas) {
    const grainCtx = grainCanvas.getContext('2d');
    const tileSize = 128;
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = tileSize;
    tileCanvas.height = tileSize;
    const tileCtx = tileCanvas.getContext('2d');
    const imgData = tileCtx.createImageData(tileSize, tileSize);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const val = Math.floor(Math.random() * 255);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = Math.floor(Math.random() * 20); // 3% opacity
    }
    tileCtx.putImageData(imgData, 0, 0);

    function resizeGrain() {
      grainCanvas.width = window.innerWidth;
      grainCanvas.height = window.innerHeight;
    }
    resizeGrain();
    window.addEventListener('resize', resizeGrain, { passive: true });

    setInterval(() => {
      if (!grainCtx) return;
      grainCtx.clearRect(0, 0, grainCanvas.width, grainCanvas.height);
      const pat = grainCtx.createPattern(tileCanvas, 'repeat');
      if (pat) {
        grainCtx.save();
        grainCtx.fillStyle = pat;
        const offsetX = Math.floor(Math.random() * tileSize);
        const offsetY = Math.floor(Math.random() * tileSize);
        grainCtx.translate(offsetX, offsetY);
        grainCtx.fillRect(-tileSize, -tileSize, grainCanvas.width + tileSize, grainCanvas.height + tileSize);
        grainCtx.restore();
      }
    }, 125);
  }

  /* ==========================================================================
     PRELOADER & LIFECYCLE
     ========================================================================== */
  const preloaderEl = document.getElementById('preloader');
  const preloaderLine = document.getElementById('preloader-line');
  const preloaderCounter = document.getElementById('preloader-counter');

  function dismissPreloader() {
    if (!preloaderEl || preloaderEl.classList.contains('is-hidden')) return;
    
    preloaderEl.classList.add('is-finishing');
    setTimeout(() => {
      preloaderEl.classList.add('is-hidden');
      document.body.classList.add('is-ready');
      setTimeout(() => {
        preloaderEl.style.display = 'none';
      }, 800);

      // Force instant initialization of hero scene
      onScroll();
      renderHero(true);
      renderDismantle(true);
    }, 300);
  }

  async function startPreloader() {
    const initialCount = (cfg.preload && cfg.preload.initialHeroFrames) || 40;
    
    // Safety timeout: dismiss preloader after 1.5 seconds max regardless of network
    const safetyTimer = setTimeout(() => {
      dismissPreloader();
    }, 1500);

    // Smoothly animate progress bar and counter
    let displayPercent = 0;
    const progressInterval = setInterval(() => {
      if (displayPercent < 90) {
        displayPercent += 5;
        if (preloaderLine) preloaderLine.style.width = `${displayPercent}%`;
        if (preloaderCounter) preloaderCounter.textContent = String(displayPercent).padStart(3, '0');
      }
    }, 30);

    // Load first critical frames
    try {
      await heroLoader.loadFrame(0);
      await dismantleLoader.loadFrame(0);
      
      // Load next few frames
      const firstChunk = [];
      for (let i = 1; i < Math.min(10, initialCount); i++) {
        firstChunk.push(heroLoader.loadFrame(i));
      }
      await Promise.all(firstChunk);
    } catch (_) {
      // Ignore errors
    }

    clearInterval(progressInterval);
    clearTimeout(safetyTimer);

    if (preloaderLine) preloaderLine.style.width = '100%';
    if (preloaderCounter) preloaderCounter.textContent = '100';

    dismissPreloader();

    // Background load the remaining frames without blocking
    backgroundLoadRemainingFrames(10);
  }

  async function backgroundLoadRemainingFrames(startIndex) {
    // 1. Hero frames
    for (let i = startIndex; i < heroLoader.count; i++) {
      await heroLoader.loadFrame(i);
      if (i % 6 === 0) await new Promise((r) => setTimeout(r, 20));
    }

    // 2. Dismantle frames
    for (let i = 1; i < dismantleLoader.count; i++) {
      await dismantleLoader.loadFrame(i);
      if (i % 6 === 0) await new Promise((r) => setTimeout(r, 20));
    }
  }

  // Kickstart on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      onScroll();
      startPreloader();
    });
  } else {
    onScroll();
    startPreloader();
  }
})();
