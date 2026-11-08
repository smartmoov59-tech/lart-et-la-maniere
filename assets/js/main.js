/* ==========================================================================
   L'ART ET LA MANIÈRE — motion design (GSAP + ScrollTrigger + Lenis)
   Courbes douces (expo / power3), transform & opacity en priorité,
   version allégée si prefers-reduced-motion, simplifié sur mobile.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  /* ?nomotion force la version sans animation (utile pour les tests et l'impression) */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]nomotion\b/.test(location.search);
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const loader = $('#loader');
  const nav = $('#nav');
  const menu = $('#menu');
  const burger = $('#burger');
  const wait = ms => new Promise(r => setTimeout(r, ms));

  root.classList.remove('no-js');
  root.classList.add('js');

  /* ======================================================================
     Fonctions indépendantes de GSAP
     ====================================================================== */
  function initYear() { const y = $('#year'); if (y) y.textContent = new Date().getFullYear(); }

  function initHours() {
    const rows = $$('#hoursTable tr');
    const state = $('#hoursState');
    if (!rows.length || !state) return;
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const get = t => (parts.find(p => p.type === t) || {}).value;
    const dayIdx = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[get('weekday')];
    const mins = (+get('hour') % 24) * 60 + +get('minute');
    rows.forEach(r => r.classList.toggle('is-today', +r.dataset.d === dayIdx));
    const open = dayIdx !== 0 && mins >= 540 && mins < 1080;
    state.classList.toggle('is-open', open);
    if (open) state.textContent = "Ouvert · jusqu'à 18h";
    else if (dayIdx >= 1 && mins < 540) state.textContent = 'Fermé · ouvre à 9h';
    else if (dayIdx === 6 || dayIdx === 0) state.textContent = 'Fermé · ouvre lundi à 9h';
    else state.textContent = 'Fermé · ouvre demain à 9h';
  }

  function fitGiant() {
    const g = $('#giant');
    const span = g && $('span', g);
    if (!span) return;
    g.style.fontSize = '100px';
    const w = span.getBoundingClientRect().width;
    const target = g.clientWidth;
    if (w > 0 && target > 0) g.style.fontSize = Math.floor((100 * target) / w) + 'px';
  }

  function heroVideo() {
    const v = $('#heroVideo');
    const btn = $('#heroPause');
    if (!v || !btn) return;
    const sync = () => {
      btn.classList.toggle('is-paused', v.paused);
      btn.setAttribute('aria-label', v.paused ? 'Lire la vidéo' : 'Mettre la vidéo en pause');
    };
    if (reduce) v.pause(); else v.play().catch(() => {});
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    btn.addEventListener('click', () => { v.paused ? v.play().catch(() => {}) : v.pause(); });
    sync();
    // Vidéos secondaires : on les met en pause hors écran pour économiser la batterie
    $$('.cta__video, .phone__video').forEach(vid => {
      if (reduce) { vid.pause(); return; }
      if (!('IntersectionObserver' in window)) return;
      new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? vid.play().catch(() => {}) : vid.pause())), { threshold: 0.05 }).observe(vid);
    });
  }

  function buildDisco() {
    const sheet = $('#discoSheet');
    if (!sheet) return;
    const pal = ['#ffffff', '#ffffff', '#f3f3fa', '#dfe1ea', '#c9cbd3', '#c9cbd3', '#a9acb8', '#8a8d9b', '#6b6e7d', '#ffd3e4', '#ffb3d3', '#bfe6ff', '#fff0b8', '#4a4b57'];
    const N = 12, S = 20;
    let svg = `<svg viewBox="0 0 ${N * S} ${N * S}" preserveAspectRatio="none" aria-hidden="true" shape-rendering="crispEdges">`;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      svg += `<rect x="${x * S}" y="${y * S}" width="${S}" height="${S}" fill="${pal[(Math.random() * pal.length) | 0]}" stroke="#14121a" stroke-width="1.3"/>`;
    }
    svg += '</svg>';
    sheet.innerHTML = svg + svg;
  }

  initYear();
  initHours();
  heroVideo();
  buildDisco();
  fitGiant();
  addEventListener('resize', fitGiant);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitGiant);

  /* Texte coupé en lettres (accessible : aria-label sur le parent) */
  function split(el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/([ \t\r\n]+)/).forEach(tok => {
            if (!tok) return;
            if (/^[ \t\r\n]+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'word';
            w.setAttribute('aria-hidden', 'true');
            Array.from(tok).forEach(ch => { const c = document.createElement('span'); c.className = 'char'; c.textContent = ch; w.appendChild(c); });
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return $$('.char', el);
  }

  /* Menu mobile : fonctionne même sans GSAP */
  let menuOpen = false;
  let lenis = null;
  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('is-locked', open);
    if (open) nav.classList.remove('is-hidden');
    if (lenis) open ? lenis.stop() : lenis.start();
    if (!hasGSAP || reduce) { menu.style.visibility = open ? 'visible' : 'hidden'; menu.style.clipPath = open ? 'none' : ''; return; }
    gsap.killTweensOf(menu);
    if (open) {
      menu.style.visibility = 'visible';
      gsap.to(menu, { clipPath: 'circle(150% at calc(100% - 3rem) 2.6rem)', duration: 1, ease: 'expo.inOut' });
      gsap.fromTo('.menu__links a', { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.07, delay: 0.35 });
      gsap.fromTo('.menu__foot', { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 0.8 });
    } else {
      gsap.to(menu, { clipPath: 'circle(0% at calc(100% - 3rem) 2.6rem)', duration: 0.8, ease: 'expo.inOut', onComplete: () => { menu.style.visibility = 'hidden'; } });
    }
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });

  /* Ancres */
  function scrollToHash(hash) {
    if (hash === '#top') { lenis ? lenis.scrollTo(0, { duration: 1.6 }) : window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const t = $(hash);
    if (!t) return;
    lenis ? lenis.scrollTo(t, { duration: 1.7 }) : t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const hash = a.getAttribute('href');
    if (!$(hash) && hash !== '#top') return;
    e.preventDefault();
    if (menuOpen) { setMenu(false); setTimeout(() => scrollToHash(hash), 450); } else scrollToHash(hash);
    history.replaceState(null, '', hash);
  });

  /* Sans GSAP : on s'arrête ici, le site reste entièrement utilisable */
  if (!hasGSAP) {
    if (loader) loader.remove();
    nav.classList.add('is-scrolled');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ======================================================================
     Smooth scroll (Lenis) branché sur GSAP
     ====================================================================== */
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), wheelMultiplier: 1, touchMultiplier: 1.4 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* Éléments qui s'animent à l'intro : états initiaux */
  const heroChars = split($('#heroTitle'));
  $$('.float').forEach(f => gsap.set(f, { rotation: +f.dataset.rot || 0 }));

  /* ======================================================================
     LOADER — damier qui se pixellise puis s'ouvre depuis le centre
     ====================================================================== */
  function buildTiles() {
    const wrap = $('#loaderTiles');
    const vw = innerWidth, vh = innerHeight;
    const cols = vw < 700 ? 6 : 12;
    const size = Math.ceil(vw / cols);
    const rows = Math.ceil(vh / size);
    const tiles = [];
    const frag = document.createDocumentFragment();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const t = document.createElement('i');
      t.className = 'loader__tile';
      t.style.cssText = `left:${c * size}px;top:${r * size}px;width:${size + 1}px;height:${size + 1}px;background:${(r + c) % 2 ? '#0E0B0D' : '#FFF6F1'}`;
      frag.appendChild(t);
      tiles.push(t);
    }
    wrap.appendChild(frag);
    return { tiles, rows, cols };
  }

  async function runLoader(onRevealRaw) {
    let revealed = false;
    const onReveal = () => { if (!revealed) { revealed = true; onRevealRaw(); } };
    if (!loader) { onReveal(); return; }
    /* Garde-fou : le loader ne doit jamais bloquer le site (onglet en arrière-plan, erreur…) */
    setTimeout(() => { if (loader.isConnected) { loader.remove(); onReveal(); if (lenis) lenis.start(); } }, 9000);
    if (reduce) { loader.remove(); onReveal(); return; }
    const { tiles, rows, cols } = buildTiles();
    const num = $('#loaderNum');
    const obj = { v: 0 };
    const setNum = () => { num.textContent = Math.round(obj.v); };

    gsap.from('.loader__card', { scale: 0.7, opacity: 0, duration: 0.9, ease: 'expo.out' });
    gsap.from(tiles, { scale: 0, duration: 0.7, ease: 'power3.out', stagger: { grid: [rows, cols], from: 'random', amount: 0.9 } });
    const flick = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
    flick.to('.loader__heart use', { opacity: 0.3, duration: 0.05 }).to('.loader__heart use', { opacity: 1, duration: 0.05 }).to('.loader__heart use', { opacity: 0.5, duration: 0.04 }).to('.loader__heart use', { opacity: 1, duration: 0.1 });

    const climb = gsap.to(obj, { v: 90, duration: 1.6, ease: 'power2.out', onUpdate: setNum });
    const ready = Promise.race([
      Promise.all([
        document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
        new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })))
      ]),
      wait(5500)
    ]);
    await Promise.all([climb.then(), ready]);
    await gsap.to(obj, { v: 100, duration: 0.45, ease: 'power2.out', onUpdate: setNum }).then();
    await wait(120);

    await new Promise(res => {
      const tl = gsap.timeline({ onComplete: () => { flick.kill(); loader.remove(); res(); } });
      tl.to('.loader__card', { scale: 0.6, opacity: 0, rotate: -4, duration: 0.55, ease: 'power3.in' })
        .add(onReveal, '-=0.05')
        .to(tiles, { scale: 0, duration: 0.95, ease: 'expo.inOut', stagger: { grid: [rows, cols], from: 'center', amount: 0.95 } }, '<');
    });
  }

  /* ======================================================================
     HERO
     ====================================================================== */
  function heroIntro() {
    if (reduce) { gsap.set('.hero__eyebrow, .hero__lead, .hero__cta .btn', { clearProps: 'all' }); return; }
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo(heroChars, { yPercent: 118, rotate: 7 }, { yPercent: 0, rotate: 0, duration: 1.5, stagger: 0.032 }, 0)
      .fromTo('.hero__eyebrow, .hero__lead', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.14 }, 0.35)
      .fromTo('.hero__cta .btn', { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.1 }, 0.65)
      .fromTo('.disco', { yPercent: -120 }, { yPercent: 0, duration: 2.2, ease: 'elastic.out(1,.5)' }, 0.1)
      .fromTo('.float', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, stagger: 0.14 }, 0.4)
      .fromTo('.hero__heart', { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.9 }, 0.7)
      .fromTo('.sticker', { scale: 0, rotate: -140 }, { scale: 1, rotate: 0, duration: 1.2, ease: 'back.out(1.6)' }, 0.8)
      .fromTo(nav, { opacity: 0 }, { opacity: 1, duration: 1, clearProps: 'opacity' }, 0.5);
  }

  function heroLoops() {
    if (reduce) return;
    gsap.fromTo('.disco', { rotation: -5 }, { rotation: 5, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to('#discoSheet', { xPercent: -50, duration: 18, ease: 'none', repeat: -1 });
    gsap.to('.hero__sheet', { y: 180, duration: 3.4, ease: 'none', repeat: -1 });
    gsap.to('.sticker__ring', { rotation: 360, duration: 22, ease: 'none', repeat: -1 });
    gsap.to('[data-hero-media]', { scale: 1.1, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    $$('.spark').forEach(s => gsap.fromTo(s, { scale: 0, opacity: 0, rotate: 0 }, { scale: 1, opacity: 1, rotate: 90, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1, repeatDelay: gsap.utils.random(0.6, 2.2), delay: gsap.utils.random(0, 2) }));
    const fl = gsap.timeline({ repeat: -1, repeatDelay: 2.4, delay: 2.5 });
    fl.to('.hero__heart use', { opacity: 0.3, duration: 0.05 }).to('.hero__heart use', { opacity: 1, duration: 0.05 }).to('.hero__heart use', { opacity: 0.5, duration: 0.04 }).to('.hero__heart use', { opacity: 1, duration: 0.12 });
  }

  /* ======================================================================
     Animations liées au scroll (desktop / mobile / reduced-motion)
     ====================================================================== */
  function initScroll() {
    /* Barre de lecture */
    gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

    /* Navigation : se cache en descendant, revient en remontant */
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: self => {
        const y = self.scroll();
        nav.classList.toggle('is-scrolled', y > 60);
        if (menuOpen) return;
        if (y > 420 && self.direction === 1) nav.classList.add('is-hidden');
        else if (self.direction === -1 || y <= 420) nav.classList.remove('is-hidden');
      }
    });

    /* Bouton flottant mobile : visible après le hero, masqué sur la réservation */
    const fab = $('#fab'), booking = $('#reserver'), hero = $('.hero');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: () => {
        const y = scrollY, r = booking.getBoundingClientRect();
        const inBooking = r.top < innerHeight * 0.75 && r.bottom > innerHeight * 0.25;
        fab.classList.toggle('is-on', y > hero.offsetHeight * 0.7 && !inBooking);
      }
    });

    if (reduce) return;

    /* Parallax multicouche du hero */
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('[data-hero-media]', { yPercent: 12, ease: 'none' }, 0)
      .to('.hero__content', { yPercent: -22, ease: 'none' }, 0)
      .to('.hero__tint', { opacity: 0.7, ease: 'none' }, 0)
      .to('.disco', { y: -140, ease: 'none' }, 0)
      .to('.float--a', { y: -170, ease: 'none' }, 0)
      .to('.float--b', { y: -90, ease: 'none' }, 0)
      .to('.float--c', { y: -260, ease: 'none' }, 0)
      .to('.hero__floor', { yPercent: 35, ease: 'none' }, 0)
      .to('.sticker', { y: -80, ease: 'none' }, 0);

    /* Parallax à la souris (desktop) */
    if (finePointer) {
      const floats = $$('.float');
      const qs = floats.map(f => ({ x: gsap.quickTo($('.float__in', f), 'x', { duration: 1.3, ease: 'power3' }), y: gsap.quickTo($('.float__in', f), 'y', { duration: 1.3, ease: 'power3' }), d: +f.dataset.depth || 1 }));
      const heroEl = $('.hero');
      heroEl.addEventListener('pointermove', e => {
        const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
        qs.forEach(q => { q.x(-nx * 34 * q.d); q.y(-ny * 26 * q.d); });
      });
    }

    /* Titres lettre par lettre */
    $$('[data-split]').forEach(el => {
      const chars = split(el);
      gsap.from(chars, { yPercent: 118, rotate: 6, duration: 1.2, ease: 'expo.out', stagger: 0.022, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    /* Fondu montant générique */
    $$('[data-reveal]').forEach(el => {
      gsap.from(el, { y: 46, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });

    /* Rideau sur la carte */
    $$('[data-mask]').forEach(el => {
      gsap.fromTo(el, { clipPath: 'circle(0% at 50% 100%)' }, { clipPath: 'circle(150% at 50% 100%)', duration: 1.8, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });

    /* Marquees : vitesse et sens pilotés par le scroll */
    const bands = $$('[data-marquee]').map(m => {
      const track = $('.marquee__track', m);
      const seq = track.innerHTML;
      let guard = 0;
      while (track.scrollWidth < innerWidth * 1.4 && guard++ < 6) track.insertAdjacentHTML('beforeend', seq);
      const one = track.scrollWidth;
      track.insertAdjacentHTML('beforeend', track.innerHTML);
      return { track, w: one, x: 0, dir: +m.dataset.dir || -1 };
    });
    let lastY = scrollY, vel = 0, flip = 1;
    gsap.ticker.add(() => {
      const dr = gsap.ticker.deltaRatio(60);
      const y = scrollY, dy = y - lastY;
      lastY = y;
      vel += (dy - vel) * 0.12;
      if (Math.abs(dy) > 0.5) flip = dy > 0 ? 1 : -1;
      bands.forEach(b => {
        b.x += b.dir * flip * (1.1 + Math.abs(vel) * 0.45) * dr;
        if (b.x <= -b.w) b.x += b.w;
        if (b.x >= 0) b.x -= b.w;
        b.track.style.transform = `translate3d(${b.x}px,0,0)`;
      });
    });

    /* Vidéo d'appel à l'action : léger parallax */
    gsap.fromTo('.cta__video', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.cta__tel', { scale: 0.8, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.cta__tel', start: 'top 90%', once: true } });

    /* Photos flottantes Instagram */
    $$('.feed, .phone').forEach(el => {
      const d = +el.dataset.depth || 1;
      gsap.fromTo(el, { y: 60 * d }, { y: -60 * d, ease: 'none', scrollTrigger: { trigger: '.insta', start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* Footer : le grand nom se lève */
    const giantChars = split($('#giant span'));
    fitGiant();
    gsap.from(giantChars, { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.04, scrollTrigger: { trigger: '#giant', start: 'top 95%', once: true } });
    $('#giant').style.overflow = 'hidden';
  }

  /* Pin & défilement horizontal — desktop uniquement, sans reduced-motion */
  function initPinned() {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      /* --- Histoire épinglée --- */
      const steps = $$('#storySteps .step');
      const imgs = $$('.story__img');
      const n = steps.length;
      const numEl = $('#storyNum');
      const dots = $$('.story__dots i');
      gsap.set(steps, { autoAlpha: 0, y: 40 });
      gsap.set(steps[0], { autoAlpha: 1, y: 0 });
      imgs.forEach((im, i) => gsap.set(im, { clipPath: i === 0 ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)' }));
      const hold = 0.5;
      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: '.story', start: 'top top', end: '+=320%', pin: true, scrub: 0.7, anticipatePin: 1,
          onUpdate: self => {
            const idx = Math.max(0, Math.min(n - 1, Math.round(self.progress * (n - 1))));
            numEl.textContent = '0' + (idx + 1);
            dots.forEach((d, k) => d.classList.toggle('is-on', k === idx));
          }
        }
      });
      for (let i = 1; i < n; i++) {
        tl.to(steps[i - 1], { autoAlpha: 0, y: -50, duration: 0.45 }, i - 0.55)
          .fromTo(imgs[i], { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(150% at 50% 50%)', duration: 0.9 }, i - 0.7)
          .fromTo(steps[i], { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.55 }, i - 0.25);
      }
      tl.fromTo(imgs.map(i => $('img', i)), { yPercent: -5, scale: 1.12 }, { yPercent: 5, scale: 1.02, duration: n - 1 + hold, ease: 'none' }, 0);
      tl.to({}, { duration: hold });
      gsap.fromTo('.story__spark', { rotate: -20, scale: 0.6 }, { rotate: 20, scale: 1, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });

      /* --- Prestations : défilement horizontal piloté par le scroll vertical --- */
      const track = $('#svcTrack');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tw = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '.svc', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: self => { $('#svcBar').style.transform = `scaleX(${self.progress})`; }
        }
      });
      $$('.svc-card, .svc-end').forEach((c, i) => {
        gsap.from(c, { y: 90, opacity: 0, rotate: i % 2 ? -4 : 4, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: c, containerAnimation: tw, start: 'left 94%', toggleActions: 'play none none reverse' } });
      });
    });

    mm.add('(max-width: 899px), (prefers-reduced-motion: reduce)', () => {
      if (reduce) return;
      /* Mobile : étapes qui se révèlent une à une, images qui glissent dans leur cadre */
      $$('#storySteps .step').forEach(s => {
        gsap.from(s, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 88%', once: true } });
        const im = $('.step__img img', s);
        gsap.fromTo(im, { scale: 1.18, yPercent: -7 }, { scale: 1.18, yPercent: 7, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });
  }

  /* ======================================================================
     Micro-interactions
     ====================================================================== */
  function initMagnetic() {
    if (reduce || !finePointer) return;
    $$('[data-magnetic]').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'elastic.out(1,.55)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'elastic.out(1,.55)' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.32);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.4);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  function initTilt() {
    if (reduce || !finePointer) return;
    $$('[data-tilt]').forEach(el => {
      gsap.set(el, { transformPerspective: 900 });
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
      const glare = $('.glare', el);
      const gx = glare && gsap.quickTo(glare, 'x', { duration: 0.5, ease: 'power3' });
      const gy = glare && gsap.quickTo(glare, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * 14);
        rx((0.5 - py) * 14);
        if (glare) { gx((px - 0.5) * r.width); gy((py - 0.5) * r.height); gsap.to(glare, { opacity: 0.9, duration: 0.3, overwrite: 'auto' }); }
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); if (glare) gsap.to(glare, { opacity: 0, duration: 0.5 }); });
    });
  }

  function burst(el) {
    const r = el.getBoundingClientRect();
    const host = el.closest('.stat');
    const hr = host.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('i');
      s.className = 'burst';
      s.style.left = r.left - hr.left + r.width / 2 + 'px';
      s.style.top = r.top - hr.top + r.height / 2 + 'px';
      host.appendChild(s);
      gsap.fromTo(s, { scale: 0, opacity: 1 }, {
        x: gsap.utils.random(-90, 90), y: gsap.utils.random(-80, 60), scale: gsap.utils.random(0.6, 1.5), rotate: gsap.utils.random(-120, 120),
        opacity: 0, duration: gsap.utils.random(0.9, 1.5), ease: 'power3.out', onComplete: () => s.remove()
      });
    }
  }

  function initCounters() {
    $$('[data-count]').forEach(el => {
      const target = el.dataset.since ? new Date().getFullYear() - +el.dataset.since : +el.dataset.count;
      const dec = +el.dataset.dec || 0;
      const fmt = v => v.toFixed(dec).replace('.', ',');
      el.textContent = fmt(target);
      if (reduce) return;
      const obj = { v: 0 };
      el.textContent = fmt(0);
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(obj, { v: target, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(obj.v); }, onComplete: () => burst(el) })
      });
    });
  }

  function initReviews() {
    const rail = $('#revRail');
    if (!rail) return;
    const bar = $('#revBar');
    const step = () => { const c = $('.review', rail); return c.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || 24); };
    const prog = () => { const max = rail.scrollWidth - rail.clientWidth; bar.style.transform = `scaleX(${Math.max(0.12, max ? rail.scrollLeft / max : 1)})`; };
    rail.addEventListener('scroll', prog, { passive: true });
    prog();
    $('#revNext').addEventListener('click', () => { const max = rail.scrollWidth - rail.clientWidth; rail.scrollTo({ left: rail.scrollLeft >= max - 8 ? 0 : rail.scrollLeft + step(), behavior: reduce ? 'auto' : 'smooth' }); });
    $('#revPrev').addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }));

    /* Glisser à la souris */
    let down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('is-drag'); });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; rail.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = false; rail.classList.remove('is-drag'); });
    rail.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

    /* Défilement automatique, en pause au survol / au focus / hors écran */
    if (!reduce) {
      let hover = false, visible = false;
      rail.addEventListener('pointerenter', () => { hover = true; });
      rail.addEventListener('pointerleave', () => { hover = false; });
      rail.addEventListener('focusin', () => { hover = true; });
      rail.addEventListener('focusout', () => { hover = false; });
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.4 }).observe(rail);
      setInterval(() => { if (hover || !visible || document.hidden) return; $('#revNext').click(); }, 6500);
      gsap.from('.review', { y: 70, opacity: 0, rotate: 2.5, duration: 1.1, ease: 'power3.out', stagger: 0.14, scrollTrigger: { trigger: rail, start: 'top 85%', once: true } });
    }
  }

  function initGallery() {
    const items = $$('.gal');
    if (!items.length) return;
    if (!reduce) {
      const from = ['inset(100% 0 0 0)', 'circle(0% at 50% 50%)', 'inset(0 100% 0 0)', 'polygon(0 0,0 0,0 100%,0 100%)'];
      const to = ['inset(0% 0 0 0)', 'circle(100% at 50% 50%)', 'inset(0 0% 0 0)', 'polygon(0 0,100% 0,100% 100%,0 100%)'];
      items.forEach((el, i) => {
        gsap.fromTo(el, { clipPath: from[i % 4], y: 50 }, {
          clipPath: to[i % 4], y: 0, duration: 1.4, ease: 'expo.out',
          onComplete: () => gsap.set(el, { clearProps: 'clipPath' }),
          scrollTrigger: { trigger: el, start: 'top 93%', once: true }
        });
      });
    }

    /* Lightbox */
    const lb = $('#lb'), img = $('#lbImg'), cap = $('#lbCap');
    let cur = 0, opener = null;
    const open = i => {
      cur = (i + items.length) % items.length;
      const it = items[cur];
      img.src = it.dataset.src;
      img.alt = $('img', it).alt;
      cap.textContent = it.dataset.caption;
      if (lb.hidden) {
        opener = it; lb.hidden = false;
        if (lenis) lenis.stop();
        document.body.classList.add('is-locked');
        if (!reduce) gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: 0.4 }); else lb.style.opacity = 1;
        $('#lbClose').focus();
      }
      if (!reduce) gsap.fromTo(img, { scale: 0.92, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'expo.out' });
    };
    const close = () => {
      const done = () => { lb.hidden = true; lb.style.opacity = ''; document.body.classList.remove('is-locked'); if (lenis) lenis.start(); if (opener) opener.focus(); };
      reduce ? done() : gsap.to(lb, { opacity: 0, duration: 0.3, onComplete: done });
    };
    items.forEach((it, i) => it.addEventListener('click', () => open(i)));
    $('#lbClose').addEventListener('click', close);
    $('#lbNext').addEventListener('click', () => open(cur + 1));
    $('#lbPrev').addEventListener('click', () => open(cur - 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') open(cur + 1);
      else if (e.key === 'ArrowLeft') open(cur - 1);
      else if (e.key === 'Tab') {
        const f = $$('button', lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ======================================================================
     Démarrage
     ====================================================================== */
  initPinned();   // les sections épinglées d'abord, dans l'ordre de la page
  initScroll();
  initMagnetic();
  initTilt();
  initCounters();
  initReviews();
  initGallery();
  heroLoops();

  runLoader(() => { heroIntro(); }).then(() => {
    if (lenis) lenis.start();
    ScrollTrigger.refresh();
  });

  /* Les polices et images changent les hauteurs : on recalcule les positions */
  const refresh = () => ScrollTrigger.refresh();
  addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
})();
