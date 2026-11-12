// Historique : versions publiées, retour en arrière, sauvegarde de sécurité.
import { h, icone, bouton, toast, confirmer } from '../ui.js';
import { api } from '../api.js';
import { S, charger, modifie, copie } from '../etat.js';
import { protege, rerendre } from '../app.js';

export async function rendre(el) {
  const liste = h('ul', { class: 'historique', 'aria-busy': 'true' }, h('li', { class: 'vide', text: 'Chargement…' }));
  const quand = (ts) => ts ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(ts)) : 'Au départ';
  el.append(h('header', { class: 'page-tete' }, h('h1', { text: 'Historique' }), h('p', { class: 'page-tete__sous', text: 'Chaque publication est conservée (les 30 dernières). Vous pouvez revenir à n’importe laquelle : la version actuelle reste dans l’historique.' })),
    h('section', { class: 'carte-ui' }, liste),
    h('section', { class: 'carte-ui' }, h('h2', { text: 'Sauvegarde de sécurité' }), h('p', { text: 'Téléchargez une copie de tout votre contenu (prestations, promotions, horaires…). Les photos restent stockées sur le site.' }),
      bouton({ texte: 'Télécharger une copie', ic: 'envoyer', classe: 'btn--bleu', onclick: () => {
        const blob = new Blob([JSON.stringify(S.base, null, 1)], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `angel-nails-studio-sauvegarde-${window.ANSRendu.parisJour()}.json` }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } })));
  try {
    const d = await protege(() => api.historique());
    liste.removeAttribute('aria-busy'); liste.replaceChildren();
    d.entrees.forEach((e, i) => liste.append(h('li', { class: 'historique__ligne' },
      h('div', { class: 'historique__texte' }, h('strong', { text: e.resume || 'Modification du site' }), h('span', { text: quand(e.ts) + (i === 0 && S.rev === e.rev ? ' · version actuelle' : '') })),
      i === 0 && S.rev === e.rev ? h('span', { class: 'pastille pastille--ok', text: 'En ligne' }) : bouton({ texte: 'Revenir à cette version', classe: 'btn--clair btn--petit', onclick: async () => {
        const ok = await confirmer({ titre: 'Revenir à cette version ?', texte: (e.ts ? `Le site reviendra à l’état du ${quand(e.ts).toLowerCase()}.` : 'Le site reviendra à sa version d’origine, avant toute modification depuis l’espace pro.') + (modifie() ? ' Vos modifications non publiées seront perdues.' : ''), ok: 'Revenir à cette version' });
        if (!ok) return;
        try { const r = await protege(() => api.restaurer(e.id, S.rev)); charger({ ...r, jour: S.jour }); toast('Version restaurée et publiée.'); rerendre(); } catch (x) { if (!(x.data && x.data.silencieux)) toast(x.message, 'erreur'); }
      } }))));
    if (!d.entrees.length) liste.append(h('li', { class: 'vide', text: 'Aucune publication pour l’instant : la première apparaîtra ici.' }));
  } catch (x) { liste.replaceChildren(h('li', { class: 'vide', text: x.message })); }
}
