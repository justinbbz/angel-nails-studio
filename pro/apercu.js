// Aperçu en direct : le vrai site dans un cadre (même origine), qui reçoit le brouillon par postMessage et se met à jour sans rien publier.
import { h, icone, bouton, $, deborde } from './ui.js';
import { BASE } from './api.js';
import { S } from './etat.js';

let cadre = null, pret = false, ouvert = false, cible = null;
const suffixe = () => '?apercu=1' + (new URLSearchParams(location.search).get('api') ? '&api=' + encodeURIComponent(new URLSearchParams(location.search).get('api')) : '');
const envoyer = () => { if (cadre && pret && S.doc) cadre.contentWindow.postMessage({ type: 'ans-apercu', doc: S.doc }, location.origin); };
export const synchroniser = deborde(envoyer, 300);
export const estOuvert = () => ouvert;

addEventListener('message', (e) => {
  if (e.origin !== location.origin || !cadre || e.source !== cadre.contentWindow) return;
  if (e.data && e.data.type === 'ans-apercu-pret') { pret = true; envoyer(); if (cible) aller(cible); }
});

/* fait défiler l'aperçu jusqu'à une section du site (#prestations, #realisations, #infos…) */
export function aller(section) {
  cible = section;
  if (cadre && pret && /^#[a-z-]{2,20}$/.test(section)) cadre.contentWindow.postMessage({ type: 'ans-aller', cible: section }, location.origin);
}

export function basculer(conteneur) {
  if (ouvert) return fermer(conteneur);
  ouvert = true; pret = false;
  cadre = h('iframe', { class: 'apercu__cadre', title: 'Aperçu de votre site avec les modifications non publiées', src: '../index.html' + suffixe() });
  const boite = h('aside', { class: 'apercu', 'aria-label': 'Aperçu du site' },
    h('div', { class: 'apercu__tete' }, h('p', { class: 'apercu__titre' }, icone('ecran', 18), h('span', { text: 'Aperçu en direct' })), bouton({ ic: 'croix', classe: 'btn--rond btn--discret', aria: 'Fermer l’aperçu', onclick: () => fermer(conteneur) })),
    h('p', { class: 'apercu__note', text: 'Ce que vous voyez ici n’est pas encore publié.' }),
    h('div', { class: 'apercu__telephone' }, cadre));
  conteneur.append(boite); document.body.classList.add('avec-apercu');
  return true;
}
export function fermer(conteneur) {
  ouvert = false; pret = false; cadre = null; $('.apercu', conteneur) && $('.apercu', conteneur).remove(); document.body.classList.remove('avec-apercu'); return false;
}
