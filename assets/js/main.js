/* Angel Nails Studio : interactions. GSAP + ScrollTrigger + Lenis (copies locales). Tout est facultatif : sans JS la page reste complète. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const root = document.documentElement;
  root.classList.add('js');
  const G = window.gsap, ST = window.ScrollTrigger;
  const useG = !!(G && ST) && !reduce;
  if (G && ST) G.registerPlugin(ST);
  const norm = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  /* ---------- défilement doux ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    window.CSX = { lenis };
    if (G && ST) { lenis.on('scroll', ST.update); G.ticker.add((t) => lenis.raf(t * 1000)); G.ticker.lagSmoothing(0); }
    else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }
  const scrollToEl = (target, offset = -70) => {
    const el = typeof target === 'string' ? $(target) : target; if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href'); if (id.length < 2 || !$(id)) return;
    e.preventDefault(); closeMenu(); scrollToEl(id, id === '#accueil' ? 0 : -64);
  });

  /* ---------- menu mobile ---------- */
  const burger = $('#burger'), menu = $('#menu');
  function openMenu() { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Fermer le menu'); lenis && lenis.stop(); root.style.overflow = 'hidden'; }
  function closeMenu() { if (!menu || menu.hidden) return; menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Ouvrir le menu'); lenis && lenis.start(); root.style.overflow = ''; setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 800); }
  burger && burger.addEventListener('click', () => (burger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); closeLb(); } });

  /* ---------- en-tête, barre mobile, progression ---------- */
  const hdr = $('#hdr'), dock = $('#dock'), prog = $('#progress i');
  const onScroll = () => {
    const y = window.scrollY;
    hdr.classList.toggle('is-solid', y > 40);
    dock && dock.classList.toggle('is-on', y > 480);
    const h = document.documentElement.scrollHeight - innerHeight;
    prog && (prog.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const links = $$('.hdr__nav a');
  const secs = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach((s) => io.observe(s));
  }

  /* ---------- film du héros ---------- */
  const film = $('#film'), pauseBtn = $('#pause');
  let userPaused = false, heroVisible = true;
  const mqMobile = matchMedia('(max-width:760px), (max-aspect-ratio:4/5)');
  const wantPlay = () => !userPaused && heroVisible && !document.hidden;
  const syncFilm = () => { if (!film || reduce) return; wantPlay() ? film.play().catch(() => {}) : film.pause(); };
  function loadFilm() {
    if (!film || reduce) return;
    const m = mqMobile.matches, src = m ? film.dataset.srcM : film.dataset.srcD;
    if (film.dataset.cur === src) return;
    film.dataset.cur = src; film.classList.remove('is-ready');
    film.poster = m ? film.dataset.posterM : 'assets/img/hero-poster.webp';
    film.src = src; film.load();
  }
  if (film && !reduce) {
    film.addEventListener('canplay', () => { film.classList.add('is-ready'); syncFilm(); });
    mqMobile.addEventListener('change', loadFilm);
    document.addEventListener('visibilitychange', syncFilm);
    new IntersectionObserver((es) => { heroVisible = es[0].isIntersecting; syncFilm(); }, { threshold: 0.05 }).observe($('#accueil'));
    loadFilm();
  }
  pauseBtn && pauseBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.setAttribute('aria-label', userPaused ? 'Relancer la vidéo' : 'Mettre la vidéo en pause');
    syncFilm();
  });
  if (reduce && pauseBtn) pauseBtn.hidden = true;

  /* ---------- horaires : ouvert / fermé (heure de Paris) ---------- */
  const hoursData = JSON.parse($('#hours-data').textContent);
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const hm = (t) => { const [h, m] = t.split(':').map(Number); return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''); };
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const paris = (d = new Date()) => new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function openStatus() {
    const now = paris(), cur = now.getHours() * 60 + now.getMinutes();
    const plages = hoursData.closed.includes(iso(now)) ? [] : (hoursData.h[now.getDay()] || []);
    for (const [a, b] of plages) if (cur >= toMin(a) && cur < toMin(b)) return { open: true, text: `Ouvert · jusqu’à ${hm(b)}` };
    const later = plages.find(([a]) => toMin(a) > cur);
    if (later) return { open: false, text: `Fermé · rouvre à ${hm(later[0])}` };
    for (let i = 1; i <= 8; i++) {
      const d = new Date(now); d.setDate(d.getDate() + i);
      const p = hoursData.closed.includes(iso(d)) ? [] : (hoursData.h[d.getDay()] || []);
      if (p.length) return { open: false, text: `Fermé · rouvre ${i === 1 ? 'demain' : JOURS[d.getDay()]} à ${hm(p[0][0])}` };
    }
    return { open: false, text: 'Fermé' };
  }
  function paintStatus() {
    const s = openStatus();
    const chip = $('#openchip'), txt = $('#opentext'), hs = $('#hstatus');
    if (txt) txt.textContent = s.text; if (chip) chip.classList.toggle('is-closed', !s.open);
    if (hs) { hs.textContent = s.text; hs.classList.toggle('is-closed', !s.open); }
    const today = paris().getDay(); $$('#hours tr').forEach((tr) => tr.classList.toggle('is-today', +tr.dataset.d === today));
  }
  paintStatus(); setInterval(paintStatus, 60000);

  /* ---------- carte : onglets + recherche ---------- */
  const tablist = $('#tabs'), tabs = $$('.tab'), ind = $('.tabs__ind'), panels = $$('.panel');
  let current = (tabs[0] || {}).dataset ? tabs[0].dataset.u : null;
  const moveInd = (t) => { if (!ind || !t) return; ind.style.width = t.offsetWidth + 'px'; ind.style.transform = `translateX(${t.offsetLeft}px)`; };
  function selectTab(id, { anim = true } = {}) {
    current = id;
    tabs.forEach((t) => { const on = t.dataset.u === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on) { moveInd(t); tablist.scrollTo({ left: Math.max(0, t.offsetLeft - 24), behavior: reduce ? 'auto' : 'smooth' }); } });
    panels.forEach((p) => { p.hidden = p.dataset.u !== id; });
    const p = panels.find((x) => x.dataset.u === id);
    if (useG && anim && p) G.fromTo(p.querySelectorAll('.panel__head, .cat'), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: 'power3.out', stagger: .07, overwrite: true, clearProps: 'transform,opacity' });
    ST && setTimeout(() => ST.refresh(), 60);
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { if ($('#q').value) { $('#q').value = ''; runSearch(); } selectTab(t.dataset.u); });
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; let n = null;
      if (k) n = (i + k + tabs.length) % tabs.length; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1;
      if (n != null) { e.preventDefault(); tabs[n].focus(); tabs[n].click(); }
    });
  });
  $$('[data-open]').forEach((b) => b.addEventListener('click', () => { if ($('#q').value) { $('#q').value = ''; runSearch(); } selectTab(b.dataset.open, { anim: false }); scrollToEl('#prestations', -10); setTimeout(() => selectTab(b.dataset.open), 700); }));
  const rows = $$('.svc'), q = $('#q'), qstatus = $('#qstatus'), qempty = $('#qempty');
  function runSearch() {
    const tokens = norm(q.value).split(' ').filter(Boolean);
    const on = tokens.length > 0;
    $('#prestations').classList.toggle('is-search', on);
    if (!on) { rows.forEach((r) => (r.hidden = false)); $$('.cat').forEach((c) => (c.hidden = false)); $$('.panel__head').forEach((h) => (h.hidden = false)); qempty.hidden = true; qstatus.textContent = ''; selectTab(current, { anim: false }); return; }
    let n = 0;
    rows.forEach((r) => { const ok = tokens.every((t) => r.dataset.q.includes(t)); r.hidden = !ok; if (ok) n++; });
    $$('.cat').forEach((c) => { c.hidden = !c.querySelector('.svc:not([hidden])'); });
    panels.forEach((p) => { p.hidden = !p.querySelector('.svc:not([hidden])'); const h = p.querySelector('.panel__head'); if (h) h.hidden = true; });
    qempty.hidden = n > 0;
    qstatus.textContent = n ? `${n} prestation${n > 1 ? 's' : ''} trouvée${n > 1 ? 's' : ''}` : 'Aucune prestation trouvée';
    ST && ST.refresh();
  }
  q && q.addEventListener('input', runSearch);
  if (tabs[0]) { moveInd(tabs[0]); addEventListener('resize', () => moveInd(tabs.find((t) => t.getAttribute('aria-selected') === 'true'))); document.fonts && document.fonts.ready.then(() => moveInd(tabs.find((t) => t.getAttribute('aria-selected') === 'true'))); }

  /* ---------- galerie : défilement à la souris, flèches, visionneuse ---------- */
  const rail = $('#rail');
  if (rail) {
    let down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft; });
    addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); if (moved > 5) rail.classList.add('is-drag'); rail.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { down = false; setTimeout(() => rail.classList.remove('is-drag'), 30); });
    rail.addEventListener('click', (e) => { if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    const step = () => Math.max(260, rail.clientWidth * .72);
    $('#rprev').addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }));
    $('#rnext').addEventListener('click', () => rail.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }));
    rail.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); $('#rnext').click(); } if (e.key === 'ArrowLeft') { e.preventDefault(); $('#rprev').click(); } });
  }
  const lb = $('#lb'), lbimg = $('#lbimg'), lbcap = $('#lbcap'), shots = $$('.shot');
  let lbi = 0, lbFrom = null;
  function showShot(i) { lbi = (i + shots.length) % shots.length; const s = shots[lbi], im = s.querySelector('img'); lbimg.src = im.currentSrc || im.src; lbimg.alt = im.alt; lbcap.textContent = s.dataset.cap || ''; }
  function openLb(i) { lbFrom = document.activeElement; showShot(i); lb.hidden = false; lenis && lenis.stop(); $('#lbclose').focus(); }
  function closeLb() { if (!lb || lb.hidden) return; lb.hidden = true; lenis && lenis.start(); lbFrom && lbFrom.focus && lbFrom.focus(); }
  shots.forEach((s, i) => s.addEventListener('click', () => openLb(i)));
  if (lb) {
    $('#lbclose').addEventListener('click', closeLb);
    $('#lbprev').addEventListener('click', () => showShot(lbi - 1));
    $('#lbnext').addEventListener('click', () => showShot(lbi + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', (e) => { if (lb.hidden) return; if (e.key === 'ArrowLeft') showShot(lbi - 1); if (e.key === 'ArrowRight') showShot(lbi + 1); if (e.key === 'Tab') { const f = $$('button', lb); const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } });
  }

  /* ---------- carte OpenStreetMap à la demande ---------- */
  const mapbtn = $('#mapbtn');
  mapbtn && mapbtn.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = 'https://www.openstreetmap.org/export/embed.html?bbox=5.7832%2C43.8262%2C5.7912%2C43.8318&layer=mapnik&marker=43.8290066%2C5.7871819';
    f.title = 'Carte : Angel Nails Studio, Rue des Heures Claires, Manosque'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer';
    mapbtn.replaceWith(f);
  });

  /* ---------- bandeau et avis : boucles sans couture ---------- */
  $$('.band__track, .marq__track').forEach((tr) => {
    const clone = tr.cloneNode(true); [...clone.children].forEach((c) => c.setAttribute('aria-hidden', 'true'));
    [...clone.children].forEach((c) => { tr.appendChild(c); });
    $$('a,button', tr).forEach((x) => { if (x.closest('[aria-hidden="true"]')) x.tabIndex = -1; });
  });

  /* ---------- poussière d'or (appel final) ---------- */
  const cv = $('#dust');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d'); let w = 0, h = 0, run = false, dots = [];
    const size = () => { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); w = cv.width = Math.round(r.width * d); h = cv.height = Math.round(r.height * d); dots = Array.from({ length: Math.round(r.width / 16) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: (.6 + Math.random() * 2.2) * d, v: (.15 + Math.random() * .5) * d, p: Math.random() * 6.28, a: .25 + Math.random() * .6 })); };
    const tick = (t) => { if (!run) return; ctx.clearRect(0, 0, w, h); for (const o of dots) { o.y -= o.v; o.x += Math.sin(t / 1700 + o.p) * .25; if (o.y < -10) { o.y = h + 10; o.x = Math.random() * w; } const tw = .5 + .5 * Math.sin(t / 600 + o.p * 3); ctx.beginPath(); ctx.fillStyle = `rgba(247,229,166,${o.a * tw})`; ctx.arc(o.x, o.y, o.r, 0, 6.2832); ctx.fill(); } requestAnimationFrame(tick); };
    size(); addEventListener('resize', size);
    new IntersectionObserver((es) => { const on = es[0].isIntersecting; if (on && !run) { run = true; requestAnimationFrame(tick); } else if (!on) run = false; }).observe(cv);
  }

  /* ---------- curseur et boutons magnétiques (souris uniquement) ---------- */
  if (fine && !reduce && useG) {
    const ring = Object.assign(document.createElement('div'), { className: 'cur' }), dot = Object.assign(document.createElement('div'), { className: 'cur-dot' });
    document.body.append(ring, dot);
    const rx = G.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), ry = G.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
    const dx = G.quickTo(dot, 'x', { duration: .1 }), dy = G.quickTo(dot, 'y', { duration: .1 });
    addEventListener('pointermove', (e) => { ring.classList.add('is-on'); dot.classList.add('is-on'); rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY); }, { passive: true });
    document.addEventListener('pointerleave', () => { ring.classList.remove('is-on'); dot.classList.remove('is-on'); });
    document.addEventListener('pointerover', (e) => ring.classList.toggle('is-link', !!e.target.closest('a,button,input,.shot,[data-magnetic]')));
    $$('[data-magnetic]').forEach((b) => {
      const qx = G.quickTo(b, 'x', { duration: .5, ease: 'power3' }), qy = G.quickTo(b, 'y', { duration: .5, ease: 'power3' });
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * .28); qy((e.clientY - r.top - r.height / 2) * .38); });
      b.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });
  }

  /* ---------- mots coupés pour les titres ---------- */
  function splitWords(el) {
    const wrap = (node) => { const w = document.createElement('span'); w.className = 'w'; const i = document.createElement('span'); i.className = 'wi'; node.replaceWith(w); w.appendChild(i); i.appendChild(node); return w; };
    const walk = (parent) => {
      [...parent.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
            const w = document.createElement('span'); w.className = 'w'; const i = document.createElement('span'); i.className = 'wi'; i.textContent = tok; w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          if (n.classList.contains('foil') || n.classList.contains('script')) wrap(n); else walk(n);
        }
      });
    };
    walk(el); return $$('.wi', el).filter((x) => x.closest('[data-split]') === el);
  }
  const style = document.createElement('style');
  style.textContent = '.w{display:inline-block;overflow:hidden;vertical-align:top;padding:.04em .02em .14em;margin:-.04em -.02em -.14em}.wi{display:inline-block;will-change:transform}';
  document.head.appendChild(style);

  /* ---------- animations d'apparition ---------- */
  function initReveals() {
    if (!useG) { $$('[data-count]').forEach(setCount); $('.bars') && $('.bars').classList.add('is-in'); return; }
    $$('[data-split]').forEach((h) => {
      const words = splitWords(h); G.set(words, { yPercent: 118 });
      ST.create({ trigger: h, start: 'top 88%', once: true, onEnter: () => G.to(words, { yPercent: 0, duration: 1.05, ease: 'power4.out', stagger: .055 }) });
    });
    const plain = $$('[data-rv]:not([data-rv="img"])');
    G.set(plain, { opacity: 0, y: 32 });
    ST.batch(plain, { start: 'top 90%', once: true, onEnter: (b) => G.to(b, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: .1, overwrite: true }) });
    $$('[data-rv="img"]').forEach((f) => {
      const im = $('img', f); G.set(f, { clipPath: 'inset(0 0 100% 0)' }); G.set(im, { scale: 1.25 });
      ST.create({ trigger: f, start: 'top 88%', once: true, onEnter: () => { G.to(f, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'power4.inOut' }); G.to(im, { scale: 1, duration: 1.8, ease: 'power3.out' }); } });
    });
    $$('[data-parallax-img]').forEach((im) => G.fromTo(im, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: im.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
    $$('[data-parallax]').forEach((el) => G.fromTo(el, { y: 0 }, { y: +el.dataset.parallax * 2.2, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
    $$('[data-count]').forEach((el) => ST.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => countUp(el) }));
    const bars = $('.bars'); bars && ST.create({ trigger: bars, start: 'top 90%', once: true, onEnter: () => bars.classList.add('is-in') });
    G.to('.hero__inner', { y: -70, opacity: .15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 20%', scrub: true } });
    G.to('.hero__media', { scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    $$('.rev, .cat').forEach((c) => { c.addEventListener('pointermove', tilt); c.addEventListener('pointerleave', untilt); });
  }
  const fmt = (n, dec) => (dec ? n.toFixed(dec).replace('.', ',') : String(Math.round(n)));
  function setCount(el) { el.textContent = fmt(+el.dataset.count, +el.dataset.dec || 0); }
  function countUp(el) { const end = +el.dataset.count, dec = +el.dataset.dec || 0, o = { v: 0 }; G.to(o, { v: end, duration: 2, ease: 'power2.out', onUpdate: () => (el.textContent = fmt(o.v, dec)), onComplete: () => setCount(el) }); }
  function tilt(e) { if (!fine || e.pointerType === 'touch') return; const c = e.currentTarget, r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; G.to(c, { rotateY: x * 5, rotateX: -y * 4, transformPerspective: 900, duration: .6, ease: 'power3.out' }); }
  function untilt(e) { G.to(e.currentTarget, { rotateX: 0, rotateY: 0, duration: .8, ease: 'power3.out' }); }

  /* ---------- entrée en scène ---------- */
  const heroParts = $$('[data-hero]');
  if (useG) { G.set($$('.hero__title [data-hero]'), { yPercent: 112 }); G.set(heroParts.filter((x) => !x.closest('.hero__title')), { opacity: 0, y: 26 }); }
  function heroIntro() {
    if (!useG) return;
    const tl = G.timeline({ defaults: { ease: 'power4.out' } });
    tl.to('[data-hero="1"]', { opacity: 1, y: 0, duration: .9 }, 0)
      .to('.hero__title [data-hero]', { yPercent: 0, duration: 1.3, stagger: .12 }, .1)
      .to('[data-hero="5"]', { opacity: 1, y: 0, duration: 1 }, .6)
      .to('[data-hero="6"]', { opacity: 1, y: 0, duration: 1 }, .75)
      .to('[data-hero="7"]', { opacity: 1, y: 0, duration: 1 }, .9);
  }
  const pre = $('#pre');
  function finish() { initReveals(); if (ST) ST.refresh(); }
  if (pre && useG) {
    const logo = $('.pre__logo'), bar = $('.pre__bar i');
    G.to(logo, { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out', delay: .1 });
    G.to(bar, { scaleX: 1, duration: 1.5, ease: 'power2.inOut', delay: .2 });
    const minTime = new Promise((r) => setTimeout(r, 1700));
    const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([Promise.all([minTime, loaded, fonts]), new Promise((r) => setTimeout(r, 6000))]).then(() => {
      finish();
      G.to(pre, { yPercent: -100, duration: 1.15, ease: 'power4.inOut', onComplete: () => pre.remove() });
      setTimeout(heroIntro, 650);
    });
  } else {
    if (pre) pre.remove();
    finish();
  }
})();
