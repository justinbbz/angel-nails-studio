// Petits composants de l'espace pro : création d'éléments sans innerHTML (tout texte est inséré comme texte), icônes, fenêtres, messages.
export const $ = (s, c = document) => c.querySelector(s);
export const $$ = (s, c = document) => [...c.querySelectorAll(s)];

export function h(tag, attrs, ...enfants) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (['value', 'checked', 'disabled', 'selected', 'hidden', 'readOnly', 'multiple', 'required'].includes(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const ajouter = (e) => { if (e === null || e === undefined || e === false) return; if (Array.isArray(e)) e.forEach(ajouter); else el.append(e instanceof Node ? e : document.createTextNode(String(e))); };
  enfants.forEach(ajouter);
  return el;
}

/* icônes : tracés fixes (constantes du code), jamais de texte venu de l'extérieur */
const TRACES = {
  accueil: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  prestations: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  promotions: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01',
  photos: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM21 16l-5-5L5 19',
  infos: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  historique: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  compte: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c1-4 4-6 8-6s7 2 8 6',
  plus: 'M12 5v14M5 12h14',
  corbeille: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  haut: 'M12 19V5M6 11l6-6 6 6',
  bas: 'M12 5v14M6 13l6 6 6-6',
  gauche: 'M19 12H5M11 6l-6 6 6 6',
  droite: 'M5 12h14M13 6l6 6-6 6',
  oeil: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'oeil-barre': 'M3 3l18 18M10.6 6.2A9.6 9.6 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.8M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 4.4-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  crayon: 'M4 20l4-1 11-11a2.1 2.1 0 0 0-3-3L5 16l-1 4ZM14 7l3 3',
  externe: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  ok: 'M5 13l4 4L19 7',
  croix: 'M6 6l12 12M18 6 6 18',
  copier: 'M9 9h11v11H9ZM5 15H4V4h11v1',
  envoyer: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  telephone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  ecran: 'M4 5h16v11H4ZM9 20h6M12 16v4',
  alerte: 'M12 9v4M12 17h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z',
  sortie: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
};
export function icone(nom, taille = 20) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', taille); s.setAttribute('height', taille); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); s.setAttribute('class', 'ico');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', TRACES[nom] || TRACES.ok);
  p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '1.9'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
  s.append(p); return s;
}

/* bouton : bouton({ texte, icone, classe, onclick, titre }) */
export function bouton({ texte, ic, classe = '', onclick, titre, type = 'button', disabled = false, aria } = {}) {
  return h('button', { type, class: 'btn ' + classe, title: titre, disabled, 'aria-label': aria, on: onclick ? { click: onclick } : undefined }, ic ? icone(ic, 18) : null, texte ? h('span', { text: texte }) : null);
}

/* messages brefs (annoncés aux lecteurs d'écran) */
export function toast(message, type = 'ok', duree = 4500) {
  const zone = $('#toasts'); if (!zone) return;
  const t = h('p', { class: 'toast toast--' + type }, icone(type === 'ok' ? 'ok' : 'alerte', 18), h('span', { text: message }));
  zone.append(t); setTimeout(() => t.remove(), duree);
}

/* fenêtre modale accessible (focus piégé, Échap, retour du focus) */
let pileModales = 0;
export function modale({ titre, contenu, boutons = [], large = false, onfermer, id }) {
  const ancien = document.activeElement;
  const fond = h('div', { class: 'modale-fond' });
  const idTitre = 'mt' + Math.random().toString(36).slice(2, 8);
  const boite = h('div', { class: 'modale' + (large ? ' modale--large' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': idTitre, tabindex: '-1', id });
  const fermer = (valeur) => { if (!fond.isConnected) return; fond.remove(); pileModales--; if (!pileModales) document.body.classList.remove('modale-ouverte'); document.removeEventListener('keydown', clavier, true); ancien && ancien.focus && ancien.focus(); onfermer && onfermer(valeur); };
  const entete = h('div', { class: 'modale__tete' }, h('h2', { id: idTitre, text: titre }), h('button', { type: 'button', class: 'btn btn--rond btn--discret', 'aria-label': 'Fermer', on: { click: () => fermer(undefined) } }, icone('croix', 18)));
  const corps = h('div', { class: 'modale__corps' });
  const pied = boutons.length ? h('div', { class: 'modale__pied' }, boutons) : null;
  boite.append(entete, corps, pied); fond.append(boite);
  const clavier = (e) => {
    if (!fond.isConnected || fond !== [...document.querySelectorAll('.modale-fond')].pop()) return;
    if (e.key === 'Escape') { e.stopPropagation(); fermer(undefined); return; }
    if (e.key === 'Tab') {
      const f = [...boite.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
      if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || document.activeElement === boite)) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  };
  fond.addEventListener('mousedown', (e) => { if (e.target === fond) fermer(undefined); });
  document.addEventListener('keydown', clavier, true);
  document.body.append(fond); pileModales++; document.body.classList.add('modale-ouverte');
  contenu && contenu(corps, fermer);
  const premier = corps.querySelector('input:not([type=hidden]),select,textarea') || boite; setTimeout(() => premier.focus(), 30);
  return { fermer, corps, boite };
}
export function confirmer({ titre, texte, ok = 'Confirmer', annuler = 'Annuler', danger = false, details }) {
  return new Promise((resolve) => {
    let fait = false; const fin = (v) => { if (!fait) { fait = true; resolve(v); } };
    const m = modale({
      titre, onfermer: () => fin(false),
      contenu: (c) => { c.append(h('p', { text: texte })); if (details) c.append(details); },
      boutons: [bouton({ texte: annuler, classe: 'btn--discret', onclick: () => m.fermer(false) }), bouton({ texte: ok, classe: danger ? 'btn--danger' : 'btn--or', onclick: () => { fin(true); m.fermer(true); } })],
    });
  });
}

/* champs de formulaire étiquetés */
let compteur = 0;
export function champ({ label, aide, erreur }, controle) {
  const id = 'c' + (++compteur); controle.id = id;
  if (aide) controle.setAttribute('aria-describedby', id + 'a');
  return h('div', { class: 'champ' }, h('label', { for: id, text: label }), controle, aide ? h('p', { class: 'champ__aide', id: id + 'a', text: aide }) : null, erreur ? h('p', { class: 'champ__erreur', role: 'alert', text: erreur }) : null);
}
export const entree = (props) => h('input', { type: 'text', autocomplete: 'off', ...props });
export function interrupteur({ label, coche, onchange, aide }) {
  const id = 'i' + (++compteur);
  const cb = h('input', { type: 'checkbox', id, checked: !!coche, role: 'switch', 'aria-describedby': aide ? id + 'a' : undefined, on: { change: (e) => onchange(e.target.checked) } });
  return h('div', { class: 'inter' }, cb, h('label', { for: id }, h('span', { class: 'inter__piste', 'aria-hidden': 'true' }), h('span', { class: 'inter__texte', text: label })), aide ? h('p', { class: 'champ__aide', id: id + 'a', text: aide }) : null);
}

/* nombres saisis à la française (virgule) */
export const lireNombre = (t) => { const n = Number(String(t).trim().replace(/\s/g, '').replace(',', '.')); return t !== '' && Number.isFinite(n) ? n : null; };
export const afficherNombre = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',').replace(/0$/, ''));
export const aujourdhui = () => window.ANSRendu.parisJour();
export const deborde = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const alea = () => Math.random().toString(36).slice(2, 10);
