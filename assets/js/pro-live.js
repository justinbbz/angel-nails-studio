/* Contenu en direct : va chercher ce que le studio a publié depuis son espace pro (prix, promotions, photos, horaires, annonce) et remet la page à jour.
   - Le HTML livré contient déjà une version complète (visible sans JavaScript et si le service est indisponible) ; ce script ne touche une zone que si
     son contenu publié diffère de celui qui est déjà dans la page (empreintes ANS_BAKED, écrites par scripts/generer-pages.mjs).
   - Tout le HTML est fabriqué par assets/js/rendu.js, qui échappe chaque texte ; aucune adresse libre n'atteint la page.
   - Dans le volet d'aperçu de l'espace pro (?apercu=1 dans un cadre de la même origine), la page n'appelle rien : elle reçoit le brouillon par postMessage. */
(() => {
  'use strict';
  const R = window.ANSRendu;
  if (!R) return;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const apercu = params.get('apercu') === '1' && window.parent !== window;
  let API = String(window.ANS_API || '').replace(/\/+$/, '');
  if (local && params.get('api')) API = params.get('api').replace(/\/+$/, '');          // essais en local uniquement : jamais depuis le site public
  if (!API && !apercu) return;                                                           // service non branché : le site reste statique
  const BAKED = window.ANS_BAKED || {};
  const etat = { ...BAKED };
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const urlImg = (src) => (/^img:[a-f0-9]{16}$/.test(src) ? `${API}/img/${src.slice(4)}` : src);

  function zone(nom, html, remplir) {
    const cle = R.hash(html);
    if (etat[nom] === cle) return false;
    remplir(html); etat[nom] = cle; return true;
  }

  function bandeau(v) {
    const ancien = $('#annonce'); if (ancien) ancien.remove();
    document.body.classList.remove('has-annonce'); document.documentElement.style.removeProperty('--annonce-h');
    if (apercu && window.__annonceTimer) { clearInterval(window.__annonceTimer); window.__annonceTimer = null; }
    const html = R.html.bandeau(v); if (!html) return;
    const cle = R.hash(html);
    try { if (!apercu && sessionStorage.getItem('ans-annonce-fermee') === cle) return; } catch {}
    const ancre = $('.skip'); (ancre ? ancre : document.body).insertAdjacentHTML(ancre ? 'afterend' : 'afterbegin', html);
    const el = $('#annonce'); if (!el) return;
    document.body.classList.add('has-annonce');
    const mesurer = () => document.documentElement.style.setProperty('--annonce-h', el.offsetHeight + 'px');
    mesurer(); if ('ResizeObserver' in window) new ResizeObserver(mesurer).observe(el); addEventListener('resize', mesurer);
    $('.annonce__x', el).addEventListener('click', () => {
      el.remove(); document.body.classList.remove('has-annonce'); document.documentElement.style.removeProperty('--annonce-h');
      try { sessionStorage.setItem('ans-annonce-fermee', cle); } catch {}
    });
    const msgs = $$('.annonce__msg', el);
    if (msgs.length > 1) {
      if (reduit) { msgs.forEach((m) => { m.hidden = false; }); mesurer(); return; }           // mouvement réduit : tous les messages, sans défilement
      let i = 0, pause = false;
      el.addEventListener('mouseenter', () => { pause = true; }); el.addEventListener('mouseleave', () => { pause = false; });
      el.addEventListener('focusin', () => { pause = true; }); el.addEventListener('focusout', () => { pause = false; });
      window.__annonceTimer = setInterval(() => { if (pause || !el.isConnected) return; msgs[i].hidden = true; i = (i + 1) % msgs.length; msgs[i].hidden = false; mesurer(); }, 6500);
    }
  }

  function contact(doc, v) {
    const tel = doc.contact && doc.contact.tel;
    if (tel && R.telSur(tel.lien) && /^[0-9+ ]{8,20}$/.test(tel.affiche || '')) {
      const premier = $('[data-tel]'), ancien = premier ? premier.textContent : '';
      $$('[data-tel]').forEach((e) => { e.textContent = tel.affiche; });
      $$('a[href^="tel:"]').forEach((a) => {
        a.setAttribute('href', tel.lien);
        const al = a.getAttribute('aria-label');
        if (al && ancien && al.includes(ancien)) a.setAttribute('aria-label', al.split(ancien).join(tel.affiche));
      });
    }
    $$('li[data-reseau]').forEach((li) => li.remove());
    const html = R.html.reseaux(v), ancre = $('#li-mentions');
    if (html && ancre) ancre.insertAdjacentHTML('beforebegin', html);
  }

  function jsonLd(doc, v) {
    const ld = $('#ld'); if (!ld) return;
    try {
      const o = JSON.parse(ld.textContent);
      o.openingHoursSpecification = R.horairesLd(v);
      const tel = doc.contact && doc.contact.tel; if (tel && R.telSur(tel.lien)) o.telephone = tel.lien.replace('tel:', '');
      ld.textContent = JSON.stringify(o);
    } catch {}
  }

  function appliquer(doc) {
    if (!doc || !Array.isArray(doc.univers)) return;
    let v;
    try { v = R.vue(doc); } catch (e) { return; }                                          // contenu illisible : on garde la page telle quelle
    const ctx = { contact: doc.contact || {}, img: urlImg };
    const H = R.html;
    let carte = false;
    const tabs = H.onglets(v), panels = H.panneaux(v, ctx);
    carte = zone('carte', tabs + '\n' + panels, () => {
      const ong = $('#tabs'), pan = $('#panels'), vide = $('#qempty');
      if (!ong || !pan || !vide) return;
      $$('.tab', ong).forEach((e) => e.remove()); ong.insertAdjacentHTML('beforeend', tabs);
      $$('.panel', pan).forEach((e) => e.remove()); vide.insertAdjacentHTML('beforebegin', panels);
    });
    zone('envies', H.envies(v), (h) => { const g = $('.envies__grid'); if (g) g.innerHTML = h; });
    zone('notes', H.asavoir(v), (h) => { const u = $('.notes ul'); if (u) u.innerHTML = h; });
    zone('galerie', H.galerie(v, ctx), (h) => { const l = $('.rail__list'); if (l) l.innerHTML = h; });
    zone('studio', H.studio(v, ctx), (h) => { const s = $('.studio__visual'), sceau = $('.studio__seal'); if (!s || !sceau) return; $$('.ph', s).forEach((e) => e.remove()); sceau.insertAdjacentHTML('beforebegin', h); });
    /* horaires, état ouvert/fermé, pied de page */
    const donnees = R.donneesHoraires(v), tab = $('#hours');
    if (tab) tab.innerHTML = '<caption class="sr">Horaires d’ouverture</caption>' + H.horaires(v);
    const fine = $('#hfine'); if (fine) fine.textContent = H.horairesNote(v);
    const pied = $('#hpied'); if (pied) pied.innerHTML = H.horairesPied(v);
    const dh = $('#hours-data'); if (dh) dh.textContent = JSON.stringify(donnees);
    contact(doc, v); jsonLd(doc, v); bandeau(v);
    $$('[data-nbpresta]').forEach((e) => { e.dataset.count = v.nbPrestations; e.textContent = v.nbPrestations; });
    if (window.ANS) { window.ANS.heures(donnees); if (carte) window.ANS.carteRefaite(); window.ANS.refresh(); }
  }

  /* ---------- aperçu dans l'espace pro : le brouillon arrive par postMessage (même origine, depuis le parent uniquement) ---------- */
  if (apercu) {
    addEventListener('message', (e) => {
      if (e.origin !== location.origin || e.source !== window.parent) return;
      const m = e.data;
      if (m && m.type === 'ans-apercu' && m.doc) appliquer(m.doc);
      if (m && m.type === 'ans-aller' && /^#[a-z-]{2,20}$/.test(m.cible)) { const s = document.querySelector(m.cible); if (s) s.scrollIntoView({ block: 'start' }); }
    });
    window.parent.postMessage({ type: 'ans-apercu-pret' }, location.origin);
    return;
  }

  /* ---------- site public : dernière version publiée ---------- */
  (async () => {
    const ctl = new AbortController(), delai = setTimeout(() => ctl.abort(), 6000);
    try {
      const r = await fetch(`${API}/api/site`, { signal: ctl.signal, cache: 'no-cache', credentials: 'omit' });
      if (!r.ok) return;
      const j = await r.json();
      if (j && j.doc) appliquer(j.doc);
    } catch { /* service indisponible : la version déjà dans la page reste affichée */ } finally { clearTimeout(delai); }
  })();
})();
