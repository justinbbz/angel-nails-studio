// Accueil : où en est le site, ce qui est en cours, raccourcis.
import { h, icone, bouton } from '../ui.js';
import { S, nbServices } from '../etat.js';
const R = window.ANSRendu;

export function rendre(el, ctx) {
  const v = R.vue(S.doc, R.parisJour());
  const quand = S.updated ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(S.updated)) : null;
  const total = nbServices(S.doc);
  const masquees = total - v.nbPrestations;
  const stat = (valeur, texte, aide) => h('li', { class: 'stat' }, h('strong', { class: 'stat__n', text: String(valeur) }), h('span', { class: 'stat__t', text: texte }), aide ? h('span', { class: 'stat__aide', text: aide }) : null);
  const raccourci = (ic, titre, texte, vue, action) => h('button', { type: 'button', class: 'raccourci', on: { click: () => ctx.aller(vue, action) } }, h('span', { class: 'raccourci__ic' }, icone(ic, 24)), h('span', { class: 'raccourci__t' }, h('strong', { text: titre }), h('span', { text: texte })));
  const congesProches = v.conges.filter((c) => c.fin >= v.jour).sort((a, b) => (a.debut < b.debut ? -1 : 1)).slice(0, 3);
  el.append(
    h('header', { class: 'page-tete' }, h('h1', { text: 'Bonjour Alexandra' }), h('p', { class: 'page-tete__sous', text: 'Voici l’état de votre site. Ce que vous publiez ici apparaît directement sur angelnailsstudio.fr.' })),
    h('section', { class: 'carte-ui', 'aria-labelledby': 'h-etat' }, h('h2', { id: 'h-etat', text: 'Votre site en ce moment' }),
      h('ul', { class: 'stats' }, stat(v.nbPrestations, 'prestations affichées', masquees ? `${masquees} masquée${masquees > 1 ? 's' : ''}` : ''), stat(v.promos.length, v.promos.length > 1 ? 'promotions en cours' : 'promotion en cours'), stat(v.galerie.length, 'photos dans la galerie'),
        stat(S.rev, 'version publiée', quand ? 'le ' + quand : 'version d’origine'))),
    h('section', { 'aria-labelledby': 'h-actions' }, h('h2', { id: 'h-actions', class: 'titre-section', text: 'Que voulez-vous faire ?' }),
      h('div', { class: 'raccourcis' },
        raccourci('prestations', 'Modifier un prix', 'Changez un tarif en quelques secondes.', 'prestations'),
        raccourci('promotions', 'Créer une promotion', 'Une remise sur une ou plusieurs prestations.', 'promotions', 'nouvelle'),
        raccourci('photos', 'Ajouter des photos', 'Montrez vos dernières réalisations.', 'photos', 'ajouter'),
        raccourci('infos', 'Annoncer une fermeture', 'Congés, jour férié, horaires exceptionnels.', 'infos', 'conge'))),
    h('section', { class: 'carte-ui', 'aria-labelledby': 'h-cours' }, h('h2', { id: 'h-cours', text: 'En ce moment sur le site' }),
      h('ul', { class: 'liste-simple' },
        v.promos.length ? v.promos.map((p) => h('li', null, icone('promotions', 18), h('span', null, h('strong', { text: p.titre }), p.fin ? ` · jusqu’au ${R.dateFr(p.fin)}` : ' · sans date de fin'))) : h('li', { class: 'vide' }, icone('promotions', 18), h('span', { text: 'Aucune promotion en cours.' })),
        congesProches.map((c) => h('li', null, icone('infos', 18), h('span', null, h('strong', { text: 'Fermeture' }), c.debut === c.fin ? ` le ${R.dateFr(c.debut)}` : ` du ${R.dateFr(c.debut)} au ${R.dateFr(c.fin)}`, c.message ? ' · ' + c.message : ''))),
        v.bannieres.some((b) => b.id === 'annonce') ? h('li', null, icone('alerte', 18), h('span', null, h('strong', { text: 'Annonce affichée : ' }), S.doc.annonce.texte)) : null)),
    h('aside', { class: 'note-planity' }, icone('alerte', 22), h('div', null, h('strong', { text: 'Bon à savoir : Planity' }),
      h('p', { text: 'Vos clientes réservent sur Planity. Les prix et promotions modifiés ici s’affichent sur votre site, mais ne changent pas vos tarifs dans Planity : pensez à les mettre aussi à jour là-bas.' }))),
    h('section', { class: 'carte-ui', 'aria-labelledby': 'h-aide' }, h('h2', { id: 'h-aide', text: 'Comment ça marche ?' }),
      h('ol', { class: 'etapes' }, h('li', null, h('strong', { text: 'Modifiez' }), ' ce que vous voulez : rien n’est visible par vos clientes tant que vous n’avez pas publié.'),
        h('li', null, h('strong', { text: 'Regardez' }), ' le résultat avec le bouton « Aperçu » en haut de l’écran.'),
        h('li', null, h('strong', { text: 'Publiez' }), ' avec le bouton doré qui apparaît en bas. Vous pouvez toujours revenir à une version précédente (menu « Historique »).')),
      bouton({ texte: 'Voir l’aperçu du site', ic: 'ecran', classe: 'btn--bleu', onclick: ctx.bascule })));
}
