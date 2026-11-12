// Espace pro d'Angel Nails Studio : connexion, coque (navigation, barre de publication, aperçu) et choix de la vue.
import { $, h, icone, bouton, toast, modale, confirmer, champ, entree, interrupteur } from './ui.js';
import { api, ApiErreur, fixerJeton, configure, BASE } from './api.js';
import { S, charger, copie, modifie, surChangement, notifier, sauverBrouillon, lireBrouillon, effacerBrouillon, resumeModifs } from './etat.js';
import * as apercu from './apercu.js';
import * as accueil from './vues/accueil.js';
import * as prestations from './vues/prestations.js';
import * as promotions from './vues/promotions.js';
import * as photos from './vues/photos.js';
import * as infos from './vues/infos.js';
import * as historique from './vues/historique.js';
import * as compte from './vues/compte.js';

const R = window.ANSRendu;
const VUES = [
  { id: 'accueil', nom: 'Accueil', ic: 'accueil', m: accueil, section: '#accueil' },
  { id: 'prestations', nom: 'Prestations', ic: 'prestations', m: prestations, section: '#prestations' },
  { id: 'promotions', nom: 'Promotions', ic: 'promotions', m: promotions, section: '#prestations' },
  { id: 'photos', nom: 'Photos', ic: 'photos', m: photos, section: '#realisations' },
  { id: 'infos', nom: 'Horaires & infos', court: 'Infos', ic: 'infos', m: infos, section: '#infos' },
];
const PLUS = [
  { id: 'historique', nom: 'Historique', ic: 'historique', m: historique },
  { id: 'compte', nom: 'Mon compte', ic: 'compte', m: compte },
];
const TOUTES = [...VUES, ...PLUS];
const racine = $('#app');
let coque = null, principal = null, barre = null, vueCourante = 'accueil';

/* ---------- session ---------- */
const CLE = 'ans-session';
function lireSession() {
  for (const st of [sessionStorage, localStorage]) { try { const s = JSON.parse(st.getItem(CLE) || 'null'); if (s && s.jeton && s.expire > Date.now() + 60000) return { ...s, longue: st === localStorage }; } catch {} }
  return null;
}
function garderSession(jeton, expire, longue) {
  S.jeton = jeton; S.expire = expire; S.longue = longue; fixerJeton(jeton);
  try { sessionStorage.removeItem(CLE); localStorage.removeItem(CLE); (longue ? localStorage : sessionStorage).setItem(CLE, JSON.stringify({ jeton, expire })); } catch {}
}
function oublierSession() { S.jeton = null; fixerJeton(null); try { sessionStorage.removeItem(CLE); localStorage.removeItem(CLE); } catch {} }
export function deconnecter(message) {
  oublierSession(); apercu.fermer(document.body); coque = null;
  vueConnexion(message);
}
/* appel protégé : une session expirée ramène à la connexion sans perdre les modifications en cours */
export async function protege(fn) {
  try { return await fn(); } catch (e) {
    if (e instanceof ApiErreur && e.statut === 401 && e.data.code === 'connexion') { sauverBrouillon(); deconnecter('Votre session a expiré. Reconnectez-vous : vos modifications en cours sont conservées.'); throw new ApiErreur(401, 'session expirée', { silencieux: true }); }
    throw e;
  }
}

/* ---------- connexion ---------- */
function vueConnexion(message) {
  document.body.classList.remove('avec-apercu');
  racine.replaceChildren();
  const err = h('p', { class: 'connexion__erreur', role: 'alert', hidden: !message, text: message || '' });
  const id = entree({ name: 'identifiant', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', required: true, value: '' });
  const mdp = h('input', { type: 'password', name: 'motdepasse', id: 'mdp-connexion', autocomplete: 'current-password', required: true });
  const voir = bouton({ texte: 'Afficher', classe: 'btn--discret btn--petit', onclick: () => { const v = mdp.type === 'password'; mdp.type = v ? 'text' : 'password'; voir.firstChild.textContent = v ? 'Masquer' : 'Afficher'; voir.setAttribute('aria-pressed', String(v)); } });
  const rester = h('input', { type: 'checkbox', id: 'rester' });
  const envoi = bouton({ texte: 'Se connecter', classe: 'btn--or btn--plein', type: 'submit' });
  const formulaire = h('form', { class: 'connexion__form', novalidate: true, on: { submit: async (e) => {
    e.preventDefault(); err.hidden = true;
    if (!id.value.trim() || !mdp.value) { err.textContent = 'Saisissez votre identifiant et votre mot de passe.'; err.hidden = false; return; }
    envoi.disabled = true; envoi.querySelector('span').textContent = 'Connexion…';
    try {
      const r = await api.connexion(id.value, mdp.value, rester.checked);
      mdp.value = ''; garderSession(r.jeton, r.expire, rester.checked);
      if (S.doc) { demarrerCoque(); toast('Reconnectée. Vos modifications en cours sont toujours là.'); } else await demarrer();
    } catch (x) { err.textContent = x.message; err.hidden = false; envoi.disabled = false; envoi.querySelector('span').textContent = 'Se connecter'; mdp.select(); }
  } } },
    champ({ label: 'Identifiant' }, id), h('div', { class: 'champ' }, h('label', { for: 'mdp-connexion', text: 'Mot de passe' }), h('div', { class: 'champ__mdp' }, mdp, voir)),
    h('div', { class: 'connexion__rester' }, rester, h('label', { for: 'rester', text: 'Rester connectée sur cet appareil (30 jours)' })), err, envoi);
  racine.append(h('main', { class: 'connexion' }, h('div', { class: 'connexion__carte' },
    h('span', { class: 'logo-mot', role: 'img', 'aria-label': 'Angel Nails Studio' }), h('h1', { text: 'Espace professionnel' }),
    h('p', { class: 'connexion__intro', text: 'Modifiez vos prix, vos promotions, vos photos et vos horaires. Les changements apparaissent directement sur votre site.' }),
    formulaire, h('a', { class: 'connexion__retour', href: '../index.html' }, icone('gauche', 16), ' Retour au site'))));
  id.focus();
}

/* ---------- coque ---------- */
function navItem(v, mobile) {
  const a = h('a', { href: '#/' + v.id, class: 'nav__lien' + (v.id === vueCourante ? ' est-actif' : ''), 'aria-current': v.id === vueCourante ? 'page' : undefined, dataset: { vue: v.id } }, icone(v.ic, 22), h('span', { text: mobile && v.court ? v.court : v.nom }));
  return a;
}
function demarrerCoque() {
  racine.replaceChildren();
  const bascule = bouton({ texte: 'Aperçu', ic: 'ecran', classe: 'btn--clair btn--petit', onclick: () => { apercu.basculer(coque); majApercuBouton(); if (apercu.estOuvert()) apercu.synchroniser(); } });
  bascule.id = 'bouton-apercu';
  const haut = h('header', { class: 'haut' },
    h('a', { class: 'haut__marque', href: '#/accueil', 'aria-label': 'Espace pro, retour à l’accueil' }, h('span', { class: 'logo-mot', role: 'img', 'aria-label': 'Angel Nails Studio' }), h('span', { class: 'haut__pro', text: 'Espace pro' })),
    h('div', { class: 'haut__actions' }, bascule, h('a', { class: 'btn btn--clair btn--petit', href: '../index.html', target: '_blank', rel: 'noopener' }, icone('externe', 18), h('span', { text: 'Voir le site' }), h('span', { class: 'sr', text: ' (nouvel onglet)' }))));
  const lateral = h('nav', { class: 'nav', 'aria-label': 'Navigation de l’espace pro' }, h('div', { class: 'nav__liste' }, TOUTES.map((v) => navItem(v, false))),
    h('div', { class: 'nav__bas' }, bouton({ texte: 'Se déconnecter', ic: 'sortie', classe: 'btn--discret btn--plein', onclick: sortir })));
  const bas = h('nav', { class: 'nav-bas', 'aria-label': 'Navigation de l’espace pro' }, VUES.map((v) => navItem(v, true)),
    h('button', { type: 'button', class: 'nav__lien', id: 'nav-plus', 'aria-haspopup': 'dialog', on: { click: menuPlus } }, icone('menu', 22), h('span', { text: 'Plus' })));
  principal = h('main', { class: 'principal', id: 'principal', tabindex: '-1' });
  barre = h('div', { class: 'barre-pub', hidden: true, role: 'region', 'aria-label': 'Publication des modifications' });
  coque = h('div', { class: 'coque' }, haut, lateral, principal, barre, bas);
  racine.append(coque);
  majBarre(); montrer();
}
function menuPlus() {
  const m = modale({ titre: 'Plus', contenu: (c) => { c.append(h('div', { class: 'liste-menu' },
    PLUS.map((v) => h('a', { class: 'liste-menu__lien', href: '#/' + v.id, on: { click: () => m.fermer() } }, icone(v.ic, 22), h('span', { text: v.nom }))),
    h('button', { type: 'button', class: 'liste-menu__lien', on: { click: () => { m.fermer(); coque.querySelector('#bouton-apercu').click(); } } }, icone('ecran', 22), h('span', { text: 'Aperçu du site' })),
    h('a', { class: 'liste-menu__lien', href: '../index.html', target: '_blank', rel: 'noopener' }, icone('externe', 22), h('span', { text: 'Voir le site' })),
    h('button', { type: 'button', class: 'liste-menu__lien', on: { click: () => { m.fermer(); sortir(); } } }, icone('sortie', 22), h('span', { text: 'Se déconnecter' })))); } });
}
async function sortir() {
  if (modifie() && !(await confirmer({ titre: 'Se déconnecter ?', texte: 'Vous avez des modifications non publiées. Elles resteront enregistrées sur cet appareil pour la prochaine connexion.', ok: 'Me déconnecter' }))) return;
  sauverBrouillon(); S.doc = null; S.base = null; oublierSession(); apercu.fermer(document.body); coque = null; vueConnexion();
}
function majApercuBouton() { const b = $('#bouton-apercu'); if (b) b.setAttribute('aria-pressed', String(apercu.estOuvert())); }

/* ---------- vues ---------- */
export function rerendre() {
  if (!principal) return;
  const v = TOUTES.find((x) => x.id === vueCourante) || VUES[0];
  const y = window.scrollY;
  principal.replaceChildren(); v.m.rendre(principal, { rerendre, aller, bascule: () => $('#bouton-apercu').click() });
  window.scrollTo(0, y);
}
export function aller(id, action) { S.demande = action || null; if (location.hash === '#/' + id) rerendre(); else location.hash = '#/' + id; }
export const nouvelleSession = (jeton, expire) => garderSession(jeton, expire, S.longue);
function montrer() {
  const id = (location.hash.match(/^#\/([a-z]+)/) || [])[1];
  vueCourante = TOUTES.some((v) => v.id === id) ? id : 'accueil';
  if (!principal) return;
  $$nav().forEach((a) => { const on = a.dataset.vue === vueCourante; a.classList.toggle('est-actif', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  rerendre(); window.scrollTo(0, 0);
  const v = TOUTES.find((x) => x.id === vueCourante); if (v.section) apercu.aller(v.section);
  document.title = (v.nom + ' · Espace pro · Angel Nails Studio');
}
const $$nav = () => [...document.querySelectorAll('.nav__lien[data-vue]')];
addEventListener('hashchange', () => { if (coque) montrer(); });

/* ---------- barre de publication ---------- */
function majBarre() {
  if (!barre) return;
  const sale = modifie();
  barre.hidden = !sale; document.body.classList.toggle('a-barre', sale);
  if (!sale) { barre.replaceChildren(); document.title = document.title.replace(/^• /, ''); return; }
  if (!document.title.startsWith('• ')) document.title = '• ' + document.title;
  barre.replaceChildren(h('p', { class: 'barre-pub__texte' }, h('strong', { text: 'Modifications non publiées' }), h('span', { text: resumeModifs(S.base, S.doc) || ' ' })),
    h('div', { class: 'barre-pub__actions' }, bouton({ texte: 'Annuler', classe: 'btn--clair', onclick: annulerModifs }), bouton({ texte: 'Publier', ic: 'envoyer', classe: 'btn--or', onclick: publier })));
}
async function annulerModifs() {
  if (!(await confirmer({ titre: 'Annuler toutes les modifications ?', texte: 'Le site et votre espace pro reviennent à la dernière version publiée. Vos modifications non publiées seront perdues.', ok: 'Oui, annuler', danger: true }))) return;
  S.doc = copie(S.base); effacerBrouillon(); notifier(); rerendre(); toast('Modifications annulées.');
}
let publication = false;
async function publier() {
  if (publication || !modifie()) return;
  const resume = resumeModifs(S.base, S.doc);
  const ok = await confirmer({ titre: 'Publier sur votre site ?', texte: 'Ces changements seront visibles par vos clientes dans la minute qui suit.', ok: 'Publier maintenant',
    details: h('p', { class: 'resume-publication', text: resume || 'Modifications diverses.' }) });
  if (!ok) return;
  publication = true; const btnPub = barre.querySelector('.btn--or'); if (btnPub) btnPub.disabled = true;
  try {
    const r = await protege(() => api.publier(S.doc, S.rev, resume));
    S.base = copie(r.doc); S.doc = copie(r.doc); S.rev = r.rev; S.updated = r.updated; S.origine = false; effacerBrouillon(); notifier(); rerendre();
    toast('Publié : votre site est à jour. Il peut falloir une minute pour que tout le monde le voie.');
  } catch (e) {
    if (e.data && e.data.silencieux) return;
    let m;
    if (e.statut === 409) {
      m = modale({ titre: 'Le site a changé entre-temps', contenu: (c) => c.append(h('p', { text: e.message }), h('p', { text: 'Si vous rechargez, vos modifications non publiées seront remplacées par la dernière version publiée (une copie est gardée dans ce navigateur).' })),
        boutons: [bouton({ texte: 'Garder ma version', classe: 'btn--discret', onclick: () => m.fermer() }), bouton({ texte: 'Recharger la dernière version', classe: 'btn--or', onclick: async () => { sauverBrouillon(); m.fermer(); try { await recharger(); } catch (x) { if (!(x.data && x.data.silencieux)) toast(x.message, 'erreur'); } } })] });
    } else m = modale({ titre: 'Publication impossible', contenu: (c) => c.append(h('p', { class: 'erreur-texte', text: e.message })), boutons: [bouton({ texte: 'Compris', classe: 'btn--or', onclick: () => m.fermer() })] });
  } finally { publication = false; majBarre(); }
}
export async function recharger() {
  const d = await protege(() => api.site()); charger(d); rerendre(); apercu.estOuvert() && apercu.synchroniser();
}

/* ---------- démarrage ---------- */
async function demarrer() {
  racine.replaceChildren(h('p', { class: 'chargement', text: 'Chargement de votre espace…' }));
  try { charger(await protege(() => api.site())); } catch (e) { if (e.data && e.data.silencieux) return; vueConnexion(e.message); return; }
  demarrerCoque();
  const b = lireBrouillon();
  if (b) {
    const quand = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(b.t));
    let m = modale({ titre: 'Reprendre vos modifications ?', contenu: (c) => c.append(h('p', { text: `Vous aviez des modifications non publiées (${quand}). Voulez-vous les reprendre ?` })),
      boutons: [bouton({ texte: 'Les abandonner', classe: 'btn--discret', onclick: () => { effacerBrouillon(); m.fermer(); } }),
        bouton({ texte: 'Reprendre', classe: 'btn--or', onclick: () => { S.doc = copie(b.doc); notifier(); rerendre(); m.fermer(); } })] });
  }
}
surChangement(() => { majBarre(); apercu.estOuvert() && apercu.synchroniser(); sauverBrouillonDiffere(); });
let tBrouillon = null; const sauverBrouillonDiffere = () => { clearTimeout(tBrouillon); tBrouillon = setTimeout(sauverBrouillon, 800); };
addEventListener('beforeunload', (e) => { sauverBrouillon(); if (modifie()) { e.preventDefault(); e.returnValue = ''; } });
addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (modifie() && coque && !document.querySelector('.modale-fond')) publier(); } });

if (!configure()) racine.append(h('main', { class: 'connexion' }, h('div', { class: 'connexion__carte' }, h('h1', { text: 'Espace pro non branché' }), h('p', { text: 'Le service de l’espace pro n’est pas encore configuré pour ce site. Contactez la personne qui a réalisé votre site.' }))));
else { const s = lireSession(); if (s) { garderSession(s.jeton, s.expire, s.longue); demarrer(); } else vueConnexion(); }
