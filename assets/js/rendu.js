/* Angel Nails Studio : rendu du contenu du site à partir du document de contenu (data/site.json, modifié par l'espace pro).
   Un SEUL code pour trois usages, afin que le HTML soit toujours identique :
   - Node : scripts/generer-pages.mjs fabrique le HTML « de secours » (visible sans JavaScript et si le service de l'espace pro est indisponible) ;
   - navigateur public : assets/js/pro-live.js remplace ces zones par la dernière version publiée ;
   - espace pro : pro/ réutilise les calculs (prix avec promotion, dates).
   Toutes les chaînes du document sont ÉCHAPPÉES ici ; les adresses d'images et de liens sont filtrées (aucune adresse libre n'atteint la page). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ANSRendu = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- petits outils ---------- */
  const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const fr1 = (n) => n.toFixed(1).replace('.', ',');
  const arrondi = (n) => Math.round(n * 100) / 100;
  const euro = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')) + '\u00a0€';   // espace insécable avant « € »
  const duree = (m) => (m >= 60 ? `${Math.floor(m / 60)}\u00a0h${m % 60 ? '\u00a0' + String(m % 60).padStart(2, '0') : ''}` : `${m}\u00a0min`);
  const hm = (t) => { const [h, m] = String(t).split(':').map(Number); return `${h}\u00a0h${m ? '\u00a0' + String(m).padStart(2, '0') : ''}`; };
  const visible = (x) => x && x.visible !== false;
  /* empreinte courte d'un texte (FNV-1a) : sert à ne refaire une zone de la page que si son HTML a vraiment changé */
  const hash = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };

  /* ---------- dates (jours « AAAA-MM-JJ », heure de Paris) ---------- */
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const parisJour = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d || new Date());
  const utc = (iso) => new Date(iso + 'T00:00:00Z');
  const plusJours = (iso, n) => { const d = utc(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const joursEntre = (debut, fin, max = 400) => { const out = []; if (!ISO.test(debut) || !ISO.test(fin) || fin < debut) return out; for (let j = debut; j <= fin && out.length < max; j = plusJours(j, 1)) out.push(j); return out; };
  const dateFr = (iso) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(utc(iso)).replace(/^1 /, '1er ');
  const jourFr = (iso) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(utc(iso)).replace(/ 1 /, ' 1er ');

  /* ---------- filtres de sécurité ---------- */
  const SRC_STATIQUE = /^assets\/img\/[A-Za-z0-9_.-]{1,80}\.(webp|jpe?g|png)$/;
  const SRC_ENVOYEE = /^img:[a-f0-9]{16}$/;
  const srcSure = (s) => typeof s === 'string' && (SRC_STATIQUE.test(s) || SRC_ENVOYEE.test(s));
  const urlSure = (u) => (typeof u === 'string' && /^https:\/\/[^\s"'<>]{3,300}$/.test(u) ? u : '');
  const telSur = (u) => (typeof u === 'string' && /^tel:\+?[0-9]{8,15}$/.test(u) ? u : '');
  const urlImage = (ctx, src) => (srcSure(src) ? ((ctx && ctx.img) ? ctx.img(src) : src) : '');

  /* ---------- numéros français ---------- */
  function telDepuisAffiche(texte) {
    const brut = String(texte || '').replace(/[\s.\-()]/g, '');
    let n = null;
    if (/^0[1-9]\d{8}$/.test(brut)) n = brut.slice(1);
    else if (/^(\+33|0033)[1-9]\d{8}$/.test(brut)) n = brut.replace(/^(\+33|0033)/, '');
    if (!n) return null;
    const paires = ('0' + n).match(/\d{2}/g).join(' ');
    return { affiche: paires, lien: 'tel:+33' + n };
  }

  /* ---------- promotions ---------- */
  const promoActive = (p, jour) => !!p && p.actif !== false && (!p.debut || jour >= p.debut) && (!p.fin || jour <= p.fin);
  const promoCible = (p, u, c, s) => { const t = p.cible || {}; return !!(t.tous || (t.univers || []).includes(u.id) || (t.categories || []).includes(c.id) || (t.services || []).includes(s.id)); };
  function prixPromo(p, prix) {
    const v = Number(p.valeur);
    if (!isFinite(v)) return null;
    if (p.type === 'pourcent') return arrondi(prix * (1 - v / 100));
    if (p.type === 'montant') return Math.max(0, arrondi(prix - v));
    if (p.type === 'prix') return arrondi(v);
    return null;
  }
  function badgePromo(p) {
    if (p.badge) return p.badge;
    if (p.type === 'pourcent') return `−${Number(p.valeur)} %`;
    if (p.type === 'montant') return `−${euro(Number(p.valeur))}`;
    if (p.type === 'prix') return 'Prix promo';
    return String(p.titre || 'Offre').slice(0, 24);
  }
  /* la meilleure promotion pour une prestation : celle qui donne le prix le plus bas ; à défaut une offre sans prix */
  function decorer(s, u, c, promos) {
    const o = { ...s, prixAff: s.prix, prixBarre: null, badge: null, promoId: null };
    let meilleure = null, offre = null;
    for (const p of promos) {
      if (!promoCible(p, u, c, s)) continue;
      const np = prixPromo(p, s.prix);
      if (np != null && np < s.prix) { if (!meilleure || np < meilleure.np) meilleure = { p, np }; }
      else if (p.type === 'offre' && !offre) offre = p;
    }
    if (meilleure) { o.prixAff = meilleure.np; o.prixBarre = s.prix; o.badge = badgePromo(meilleure.p); o.promoId = meilleure.p.id; }
    else if (offre) { o.badge = badgePromo(offre); o.promoId = offre.id; }
    return o;
  }

  /* ---------- la « vue » : ce qui doit s'afficher aujourd'hui ---------- */
  function vue(doc, jour) {
    jour = jour || parisJour();
    const promos = (doc.promotions || []).filter((p) => promoActive(p, jour));
    const univers = [];
    for (const u of doc.univers || []) {
      if (u.visible === false) continue;
      const categories = [];
      for (const c of u.categories || []) {
        if (c.visible === false) continue;
        const services = (c.services || []).filter(visible).map((s) => decorer(s, u, c, promos));
        if (services.length) categories.push({ ...c, services });
      }
      if (!categories.length) continue;
      const tous = categories.flatMap((c) => c.services);
      univers.push({ ...u, categories, nb: tous.length, aPartirDe: Math.min(...tous.map((s) => s.prixAff)) });
    }
    const parId = new Map(); univers.forEach((u) => u.categories.forEach((c) => c.services.forEach((s) => parId.set(s.id, s))));
    const envies = (doc.envies || []).map((e) => ({ ...e, services: (e.l || []).map((id) => parId.get(id)).filter(Boolean) })).filter((e) => e.services.length);
    const conges = (doc.conges || []).filter((c) => ISO.test(c.debut) && ISO.test(c.fin) && c.fin >= c.debut);
    const fermes = new Set([...(doc.fermetures || []).filter((d) => ISO.test(d))]);
    conges.forEach((c) => joursEntre(c.debut, c.fin).forEach((d) => fermes.add(d)));
    /* messages du bandeau du haut : annonce libre, promotions « bandeau », congés en cours ou à venir (14 jours) */
    const bannieres = [];
    const an = doc.annonce || {};
    if (an.actif && an.texte && (!an.debut || jour >= an.debut) && (!an.fin || jour <= an.fin)) bannieres.push({ id: 'annonce', texte: String(an.texte) });
    promos.filter((p) => p.banniere).forEach((p) => bannieres.push({ id: p.id, titre: p.titre, texte: [p.texte, p.fin ? `Jusqu’au ${dateFr(p.fin)}.` : ''].filter(Boolean).join(' ') }));
    conges.filter((c) => c.fin >= jour && c.debut <= plusJours(jour, 14)).sort((a, b) => (a.debut < b.debut ? -1 : 1)).forEach((c) => {
      const periode = c.debut === c.fin ? `le ${dateFr(c.debut)}` : `du ${dateFr(c.debut)} au ${dateFr(c.fin)}`;
      bannieres.push({ id: c.id, titre: 'Fermeture', texte: `Le studio est fermé ${periode}${c.message ? ' : ' + c.message : ''}.` });
    });
    return {
      jour, univers, envies, promos, bannieres, nbPrestations: parId.size,
      asavoir: doc.asavoir || [], galerie: (doc.galerie || []).filter(visible), studio: doc.studio || { photos: {} },
      horaires: doc.horaires || [], fermes: [...fermes].sort(), conges, contact: doc.contact || {},
    };
  }

  /* ---------- HTML ---------- */
  const prixHtml = (s) => {
    const dès = s.aPartirDe ? '<small class="svc__from">dès</small> ' : '';
    return s.prixBarre != null ? `<s class="svc__old"><span class="sr">Prix habituel </span>${euro(s.prixBarre)}</s> <span class="sr">Prix actuel </span>${dès}${euro(s.prixAff)}` : `${dès}${euro(s.prixAff)}`;
  };
  const badgesHtml = (s) => [s.etiquette ? `<span class="badge">${esc(s.etiquette)}</span>` : '', s.badge ? `<span class="badge badge--promo">${esc(s.badge)}</span>` : ''].filter(Boolean).map((b) => ' ' + b).join('');

  function ligne(s, ctx) {
    const c = ctx.contact || {};
    const action = s.enLigne
      ? `<a class="svc__go" href="${esc(urlSure(c.planity))}" target="_blank" rel="noopener" aria-label="Réserver « ${esc(s.nom)} » sur Planity (nouvel onglet)">Réserver</a>`
      : `<a class="svc__go svc__go--tel" href="${esc(telSur(c.tel && c.tel.lien))}" aria-label="Sur appel : appeler le studio pour « ${esc(s.nom)} »">Sur appel</a>`;
    const q = norm(s.nom + ' ' + (s.detail || '') + ' ' + (s.nomPlanity || ''));
    return `          <li class="svc${s.etiquette || s.badge ? ' svc--promo' : ''}" data-pid="${esc(s.id)}" data-q="${esc(q)}">
            <div class="svc__main"><span class="svc__n">${esc(s.nom)}${badgesHtml(s)}</span>${s.detail ? `<small class="svc__d">${esc(s.detail)}</small>` : ''}</div>
            <div class="svc__meta">${s.duree ? `<span class="svc__dur">${duree(s.duree)}</span>` : '<span class="svc__dur"></span>'}<span class="svc__p">${prixHtml(s)}</span></div>
            ${action}
          </li>`;
  }

  const onglets = (v) => v.univers.map((u, i) => `        <button class="tab" role="tab" type="button" id="tab-${esc(u.id)}" aria-controls="panel-${esc(u.id)}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-u="${esc(u.id)}"><span>${esc(u.court)}</span><small>${u.nb}</small></button>`).join('\n');

  function panneaux(v, ctx) {
    return v.univers.map((u, i) => {
      const p = u.photo || {};
      const forme = p.forme || (p.h > p.w ? 'v' : 'h');
      const src = urlImage(ctx, p.src);
      const cats = u.categories.map((c) => `        <article class="cat" data-cat="${esc(c.id)}">
          <h4 class="cat__t">${esc(c.titre)}</h4>${c.note ? `\n          <p class="cat__note">${esc(c.note)}</p>` : ''}
          <ul class="svcs">
${c.services.map((s) => ligne(s, ctx)).join('\n')}
          </ul>
        </article>`).join('\n');
      return `      <section class="panel" role="tabpanel" id="panel-${esc(u.id)}" aria-labelledby="tab-${esc(u.id)}" data-u="${esc(u.id)}"${i ? ' hidden' : ''}>
        <header class="panel__head">
          <div class="panel__text">
            <h3 class="panel__t">${esc(u.titre)}</h3>
            <p>${esc(u.intro)}</p>
            <p class="panel__meta"><strong>${u.nb}</strong> prestations · dès <strong>${euro(u.aPartirDe)}</strong></p>
          </div>${src ? `\n          <figure class="panel__ph panel__ph--${forme === 'v' ? 'v' : 'h'}"><img src="${esc(src)}" width="${+p.w || 1200}" height="${+p.h || 800}" alt="${esc(p.alt)}" loading="lazy"><span class="flora flora--tr" aria-hidden="true"></span></figure>` : ''}
        </header>
        <div class="panel__cats">
${cats}
        </div>
      </section>`;
    }).join('\n');
  }

  const asavoir = (v) => v.asavoir.map((n) => `        <li>${esc(String(n.texte).replace('{p}', n.prix != null ? euro(n.prix) : ''))}</li>`).join('\n');

  const ICONES = {
    lui: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="16" r="7"/><path d="M10 40c1-8 7-13 14-13s13 5 14 13"/></svg>',
    filles: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 8 3.6 8.4 9.1.8-6.9 6 2.1 8.9L24 27.4 16.1 32l2.1-8.9-6.9-6 9.1-.8Z"/><path d="M10 40h28"/></svg>',
    duo: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="20" r="8"/><circle cx="30" cy="20" r="8"/><path d="M8 40c1-6 5-9 10-9m22 9c-1-6-5-9-10-9"/></svg>',
    amies: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 10h20l-3 14a7 7 0 0 1-14 0Z"/><path d="M24 31v9m-6 0h12"/></svg>',
  };
  const envies = (v) => v.envies.map((e) => `      <article class="env" data-rv>
        <span class="env__ic">${ICONES[e.ic] || ICONES.filles}</span>
        <h3 class="env__t">${esc(e.t)}</h3>
        <p>${esc(e.p)}</p>
        <ul class="env__l">
${e.services.map((s) => `          <li><span>${esc(s.nom)}${badgesHtml(s)}${s.detail && s.detail.length <= 40 ? ` <small>${esc(s.detail)}</small>` : ''}</span><b>${prixHtml(s)}</b></li>`).join('\n')}
        </ul>
        <button type="button" class="env__go" data-open="${esc(e.u)}">Voir les tarifs<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button>
      </article>`).join('\n');

  const RATIO = { sq: ' rail__item--sq', t: ' rail__item--t', w: ' rail__item--w', v: '' };
  const galerie = (v, ctx) => v.galerie.filter((g) => srcSure(g.src)).map((g) => `      <li class="rail__item${RATIO[g.ratio] || ''}"><button type="button" class="shot" data-cap="${esc(g.legende || g.court)}"><img src="${esc(urlImage(ctx, g.src))}" width="${+g.w || 1000}" height="${+g.h || 1000}" alt="${esc(g.alt)}" loading="lazy" draggable="false"><span>${esc(g.court)}</span></button></li>`).join('\n');

  const JOURS_FR = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' };
  const horaires = (v) => v.horaires.map((j, i) => `          <tr data-d="${(i + 1) % 7}"><th scope="row">${JOURS_FR[j.jour] || esc(j.jour)}</th><td>${j.plages.length ? j.plages.map(([a, b]) => `${hm(a)}\u00a0–\u00a0${hm(b)}`).join(' · ') : 'Fermé'}</td></tr>`).join('\n');
  const horairesPied = (v) => {
    const t = (i) => (v.horaires[i] || { plages: [] }).plages.map(([a, b]) => `${hm(a)}–${hm(b)}`).join(', ');
    const sem = [0, 1, 2, 3, 4].map((i) => JSON.stringify(v.horaires[i] && v.horaires[i].plages));
    const identiques = sem.every((x) => x === sem[0]);
    const lignes = identiques ? [`Lundi–vendredi :<br>${t(0) || 'fermé'}`] : [0, 1, 2, 3, 4].map((i) => `${JOURS_FR[(v.horaires[i] || {}).jour] || ''} : ${t(i) || 'fermé'}`);
    lignes.push(`Samedi : ${t(5) || 'fermé'}`, `Dimanche : ${t(6) || 'fermé'}`);
    return lignes.join('<br>');
  };
  const horairesNote = (v) => {
    const fermes = v.horaires.filter((j) => !j.plages.length).map((j) => 'le ' + (JOURS_FR[j.jour] || j.jour).toLowerCase());
    const liste = fermes.length > 1 ? fermes.slice(0, -1).join(', ') + ' et ' + fermes[fermes.length - 1] : (fermes[0] || '');
    return liste ? `Fermé ${liste} et les jours fériés.` : 'Fermé les jours fériés.';
  };
  const donneesHoraires = (v) => ({ h: Object.fromEntries(v.horaires.map((j, i) => [(i + 1) % 7, j.plages])), closed: v.fermes });

  const studio = (v, ctx) => {
    const p = (v.studio && v.studio.photos) || {};
    const fig = (cle, cls, d) => { const s = urlImage(ctx, d && d.src); return s ? `      <figure class="ph ph--${cls}" data-rv="img" data-photo="${cle}"><img src="${esc(s)}" width="${+d.w || 1500}" height="${+d.h || 1000}" alt="${esc(d.alt)}" loading="lazy" data-parallax-img></figure>` : ''; };
    return [fig('salon', 'salon', p.salon), fig('coin', 'coin', p.coin), fig('pedicure', 'pedi', p.pedicure)].filter(Boolean).join('\n');
  };

  const reseaux = (v) => {
    const c = v.contact || {}, out = [];
    if (urlSure(c.instagram)) out.push(`        <li data-reseau="instagram"><a href="${esc(c.instagram)}" target="_blank" rel="noopener">Instagram<span class="sr"> (nouvel onglet)</span></a></li>`);
    if (urlSure(c.facebook)) out.push(`        <li data-reseau="facebook"><a href="${esc(c.facebook)}" target="_blank" rel="noopener">Facebook<span class="sr"> (nouvel onglet)</span></a></li>`);
    return out.join('\n');
  };

  /* bandeau du haut : un message à la fois (le script du site les fait défiler s'il y en a plusieurs) */
  const bandeau = (v) => (v.bannieres.length ? `<div class="annonce" id="annonce" role="region" aria-label="Information du studio"><div class="annonce__in">${v.bannieres.map((b, i) => `<p class="annonce__msg"${i ? ' hidden' : ''} data-i="${i}">${b.titre ? `<strong>${esc(b.titre)}</strong> ` : ''}${esc(b.texte)}</p>`).join('')}</div><button type="button" class="annonce__x" aria-label="Fermer l’information"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>` : '');

  /* données structurées (horaires) pour Google */
  const JOUR_EN = { lundi: 'Monday', mardi: 'Tuesday', mercredi: 'Wednesday', jeudi: 'Thursday', vendredi: 'Friday', samedi: 'Saturday', dimanche: 'Sunday' };
  const horairesLd = (v) => v.horaires.filter((h) => h.plages.length).flatMap((h) => h.plages.map(([a, b]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: JOUR_EN[h.jour], opens: a, closes: b })));

  return {
    esc, norm, fr1, euro, duree, hm, arrondi, visible, hash, ISO,
    parisJour, plusJours, joursEntre, dateFr, jourFr,
    srcSure, urlSure, telSur, telDepuisAffiche,
    promoActive, promoCible, prixPromo, badgePromo, vue,
    html: { onglets, panneaux, ligne, asavoir, envies, galerie, horaires, horairesPied, horairesNote, studio, reseaux, bandeau },
    donneesHoraires, horairesLd,
  };
});
