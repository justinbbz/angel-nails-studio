// Promotions : remises en pourcentage, en euros, prix fixe ou offre sans prix, sur tout le site, des onglets, des catégories ou des prestations choisies ;
// dates de début et de fin (la promotion s'allume et s'éteint toute seule), bandeau en haut du site, étiquette et prix barré sur les prestations.
import { h, icone, bouton, toast, modale, confirmer, champ, entree, interrupteur, lireNombre, afficherNombre } from '../ui.js';
import { S, notifier, idNeuf, services, copie } from '../etat.js';
const R = window.ANSRendu;

const TYPES = [
  ['pourcent', 'Pourcentage', 'Ex. −20 %'], ['montant', 'Montant en euros', 'Ex. −5 €'],
  ['prix', 'Prix fixe', 'Un prix promotionnel pour des prestations choisies'], ['offre', 'Offre sans prix', 'Ex. « Un nail art offert » : étiquette et bandeau seulement'],
];
const nbConcernees = (p) => { let n = 0; for (const x of services(S.doc)) if (R.promoCible(p, x.u, x.c, x.s)) n++; return n; };
const etat = (p, jour) => (p.actif === false ? ['En pause', 'pause'] : p.debut && p.debut > jour ? ['À venir', 'avenir'] : p.fin && p.fin < jour ? ['Terminée', 'finie'] : ['En cours', 'cours']);
const libelleType = (p) => (p.type === 'pourcent' ? `−${afficherNombre(p.valeur)} %` : p.type === 'montant' ? `−${R.euro(p.valeur)}` : p.type === 'prix' ? `Prix fixe ${R.euro(p.valeur)}` : 'Offre');
const libelleCible = (p) => {
  const c = p.cible, n = nbConcernees(p);
  if (c.tous) return 'Toutes les prestations';
  const morceaux = []; const u = S.doc.univers.filter((x) => c.univers.includes(x.id)).map((x) => x.court);
  if (u.length) morceaux.push(`Onglet${u.length > 1 ? 's' : ''} ${u.join(', ')}`);
  if (c.categories.length) morceaux.push(`${c.categories.length} catégorie${c.categories.length > 1 ? 's' : ''}`);
  if (c.services.length) morceaux.push(`${c.services.length} prestation${c.services.length > 1 ? 's' : ''}`);
  return `${morceaux.join(' + ')} (${n} concernée${n > 1 ? 's' : ''})`;
};
const periode = (p) => (p.debut && p.fin ? `du ${R.dateFr(p.debut)} au ${R.dateFr(p.fin)}` : p.fin ? `jusqu’au ${R.dateFr(p.fin)}` : p.debut ? `à partir du ${R.dateFr(p.debut)}` : 'sans limite de dates');

export function rendre(el, ctx) {
  const jour = R.parisJour(), liste = S.doc.promotions;
  const refaire = () => { notifier(); ctx.rerendre(); };
  el.append(h('header', { class: 'page-tete page-tete--actions' }, h('div', null, h('h1', { text: 'Promotions' }), h('p', { class: 'page-tete__sous', text: 'Une promotion se règle une fois : elle s’affiche et s’arrête toute seule aux dates choisies, avec le prix barré sur le site.' })),
    h('div', { class: 'page-tete__boutons' }, bouton({ texte: 'Nouvelle promotion', ic: 'plus', classe: 'btn--or', onclick: () => modifier(null, refaire) }))));
  el.append(h('aside', { class: 'note-planity' }, icone('alerte', 22), h('div', null, h('strong', { text: 'Pensez à Planity' }), h('p', { text: 'La remise s’affiche sur votre site mais n’est pas appliquée automatiquement dans Planity. Créez la même promotion dans Planity, ou prévenez vos clientes qu’elle s’applique en salon.' }))));
  if (!liste.length) {
    el.append(h('section', { class: 'carte-ui vide-grand' }, icone('promotions', 40), h('h2', { text: 'Aucune promotion pour l’instant' }), h('p', { text: 'Idées : « −10 % sur les poses gel en novembre », « Un nail art offert pour toute pose complète », « Massage duo à 90 € jusqu’à Noël ».' }), bouton({ texte: 'Créer ma première promotion', ic: 'plus', classe: 'btn--or', onclick: () => modifier(null, refaire) })));
  } else {
    el.append(h('ul', { class: 'promos' }, liste.map((p) => {
      const [txt, cle] = etat(p, jour);
      return h('li', { class: 'carte-ui promo promo--' + cle },
        h('div', { class: 'promo__tete' }, h('h2', { text: p.titre }), h('span', { class: 'pastille pastille--' + cle, text: txt })),
        h('p', { class: 'promo__resume' }, h('strong', { text: libelleType(p) }), ' · ', libelleCible(p), ' · ', periode(p)),
        p.texte ? h('p', { class: 'promo__texte', text: p.texte }) : null,
        h('p', { class: 'promo__options' }, p.banniere ? [icone('ok', 14), ' Bandeau en haut du site '] : 'Pas de bandeau'),
        h('div', { class: 'promo__actions' },
          interrupteur({ label: p.actif === false ? 'En pause' : 'Active', coche: p.actif !== false, onchange: (v) => { if (v) delete p.actif; else p.actif = false; refaire(); } }),
          h('span', { class: 'actions-ligne' }, bouton({ texte: 'Modifier', ic: 'crayon', classe: 'btn--clair btn--petit', onclick: () => modifier(p, refaire) }),
            bouton({ ic: 'copier', classe: 'btn--rond btn--discret', aria: `Dupliquer la promotion ${p.titre}`, onclick: () => { const d = { ...copie(p), id: idNeuf('p'), titre: p.titre + ' (copie)', actif: false }; liste.splice(liste.indexOf(p) + 1, 0, d); refaire(); toast('Promotion dupliquée, en pause : modifiez-la puis activez-la.'); } }),
            bouton({ ic: 'corbeille', classe: 'btn--rond btn--discret', aria: `Supprimer la promotion ${p.titre}`, onclick: async () => { if (!(await confirmer({ titre: 'Supprimer cette promotion ?', texte: `« ${p.titre} » ne s’affichera plus sur le site.`, ok: 'Supprimer', danger: true }))) return; liste.splice(liste.indexOf(p), 1); refaire(); } }))));
    })));
  }
  if (S.demande === 'nouvelle') { S.demande = null; setTimeout(() => modifier(null, refaire), 200); }
}

function modifier(p, refaire) {
  const neuf = !p, jour = R.parisJour();
  const b = p ? copie(p) : { id: idNeuf('p'), titre: '', texte: '', type: 'pourcent', valeur: 10, badge: '', cible: { tous: true, univers: [], categories: [], services: [] }, debut: jour, fin: R.plusJours(jour, 14), banniere: true, actif: true };
  let portee = b.cible.tous ? 'tous' : b.cible.services.length ? 'prestations' : b.cible.categories.length ? 'categories' : b.cible.univers.length ? 'univers' : 'tous';
  const titre = entree({ value: b.titre, maxlength: 60, placeholder: 'Ex. Offre de Noël' });
  const texte = entree({ value: b.texte, maxlength: 200, placeholder: 'Ex. −20 % sur toutes les poses gel' });
  const valeur = h('input', { inputmode: 'decimal', value: afficherNombre(b.valeur || 0), autocomplete: 'off' });
  const unite = h('span', { class: 'unite' });
  const badge = entree({ value: b.badge, maxlength: 24, placeholder: 'Automatique (ex. −20 %)' });
  const debut = h('input', { type: 'date', value: b.debut }), fin = h('input', { type: 'date', value: b.fin });
  const exemple = h('p', { class: 'promo-exemple', 'aria-live': 'polite' });
  const erreur = h('p', { class: 'champ__erreur', role: 'alert', hidden: true });
  const types = h('div', { class: 'choix-cartes', role: 'radiogroup', 'aria-label': 'Type de promotion' });
  const portees = h('div', { class: 'choix-cartes choix-cartes--petit', role: 'radiogroup', 'aria-label': 'Prestations concernées' });
  const detailPortee = h('div', { class: 'portee-detail' });

  const majExemple = () => {
    const v = lireNombre(valeur.value); const t = { ...b, valeur: v === null ? 0 : v };
    unite.textContent = b.type === 'pourcent' ? '%' : '€';
    const bloc = valeur.closest('.champ'); if (bloc) { bloc.hidden = b.type === 'offre'; const lib = bloc.querySelector('.champ__etiquette'); if (lib) lib.textContent = b.type === 'prix' ? 'Prix promotionnel' : 'Valeur de la remise'; }
    const cible = [...services(S.doc)].find((x) => R.promoCible({ ...b, cible: b.cible }, x.u, x.c, x.s));
    if (!cible) { exemple.textContent = 'Choisissez les prestations concernées pour voir un exemple.'; return; }
    const n = R.prixPromo(t, cible.s.prix);
    exemple.textContent = b.type === 'offre' ? `Exemple : « ${cible.s.nom} » aura l’étiquette « ${b.badge || R.badgePromo(t)} ».` : n === null ? '' : `Exemple : « ${cible.s.nom} » passe de ${R.euro(cible.s.prix)} à ${R.euro(n)}.`;
  };
  const dessinerTypes = () => types.replaceChildren(...TYPES.map(([k, nom, aide]) => {
    const dispo = true;
    return h('button', { type: 'button', role: 'radio', 'aria-checked': String(b.type === k), class: 'choix-carte' + (b.type === k ? ' est-actif' : ''), on: { click: () => { b.type = k; if (k === 'prix') { portee = 'prestations'; b.cible.tous = false; b.cible.univers = []; b.cible.categories = []; } dessinerTypes(); dessinerPortees(); majExemple(); } } }, h('strong', { text: nom }), h('small', { text: aide }));
  }));
  const PORTEES = [['tous', 'Tout le site'], ['univers', 'Des onglets'], ['categories', 'Des catégories'], ['prestations', 'Des prestations choisies']];
  const dessinerPortees = () => {
    portees.replaceChildren(...PORTEES.map(([k, nom]) => {
      const interdit = b.type === 'prix' && k !== 'prestations';
      return h('button', { type: 'button', role: 'radio', 'aria-checked': String(portee === k), disabled: interdit, class: 'choix-carte' + (portee === k ? ' est-actif' : ''), title: interdit ? 'Un prix fixe se règle prestation par prestation' : undefined, on: { click: () => { portee = k; b.cible.tous = k === 'tous'; if (k !== 'univers') b.cible.univers = []; if (k !== 'categories') b.cible.categories = []; if (k !== 'prestations') b.cible.services = []; dessinerPortees(); majExemple(); } } }, h('strong', { text: nom }));
    }));
    detailPortee.replaceChildren();
    const bascule = (liste, id, v) => { const i = liste.indexOf(id); if (v && i < 0) liste.push(id); if (!v && i >= 0) liste.splice(i, 1); majExemple(); };
    const case_ = (liste, id, nom, aide) => { const c = h('input', { type: 'checkbox', checked: liste.includes(id), on: { change: (e) => bascule(liste, id, e.target.checked) } }); return h('label', { class: 'case' }, c, h('span', { text: nom }), aide ? h('small', { text: aide }) : null); };
    if (portee === 'univers') detailPortee.append(h('div', { class: 'cases' }, S.doc.univers.map((u) => case_(b.cible.univers, u.id, u.court, `${u.categories.reduce((a, c) => a + c.services.length, 0)} prestations`))));
    if (portee === 'categories') detailPortee.append(h('div', { class: 'cases cases--grouper' }, S.doc.univers.map((u) => h('fieldset', null, h('legend', { text: u.court }), u.categories.map((c) => case_(b.cible.categories, c.id, c.titre, `${c.services.length}`))))));
    if (portee === 'prestations') {
      const rech = h('input', { type: 'search', class: 'recherche__champ', placeholder: 'Filtrer les prestations…', 'aria-label': 'Filtrer les prestations', autocomplete: 'off' });
      const zone = h('div', { class: 'cases cases--grouper cases--haut' });
      const remplir = () => {
        const q = R.norm(rech.value).split(' ').filter(Boolean); zone.replaceChildren();
        S.doc.univers.forEach((u) => u.categories.forEach((c) => {
          const vus = c.services.filter((s) => q.every((t) => R.norm(s.nom).includes(t))); if (!vus.length) return;
          zone.append(h('fieldset', null, h('legend', null, h('span', { text: `${u.court} › ${c.titre}` }), bouton({ texte: 'Tout cocher', classe: 'btn--discret btn--petit', onclick: () => { vus.forEach((s) => bascule(b.cible.services, s.id, true)); remplir(); } })),
            vus.map((s) => case_(b.cible.services, s.id, s.nom, R.euro(s.prix)))));
        }));
        if (!zone.children.length) zone.append(h('p', { class: 'vide', text: 'Aucune prestation ne correspond.' }));
      };
      rech.addEventListener('input', remplir); remplir(); detailPortee.append(rech, zone);
    }
  };
  dessinerTypes(); dessinerPortees();
  [valeur, badge].forEach((e) => e.addEventListener('input', () => { b.badge = badge.value; majExemple(); }));
  const banniere = interrupteur({ label: 'Afficher un bandeau en haut du site', coche: b.banniere, aide: 'Le bandeau reprend le titre et le message ci-dessus.', onchange: (v) => { b.banniere = v; } });
  const actif = interrupteur({ label: 'Promotion active', coche: b.actif !== false, onchange: (v) => { b.actif = v; } });
  let m;
  const ok = () => {
    const echec = (t, c) => { erreur.textContent = t; erreur.hidden = false; c && c.focus(); };
    if (!titre.value.trim()) return echec('Donnez un titre à la promotion.', titre);
    const v = b.type === 'offre' ? 0 : lireNombre(valeur.value);
    if (b.type !== 'offre' && v === null) return echec('Saisissez la valeur de la remise.', valeur);
    if (b.type === 'pourcent' && (v < 1 || v > 90)) return echec('Le pourcentage doit être compris entre 1 et 90.', valeur);
    if (b.type === 'montant' && (v < 0.5 || v > 500)) return echec('Le montant doit être compris entre 0,50 € et 500 €.', valeur);
    if (b.type === 'prix' && (v < 0 || v > 9999)) return echec('Saisissez un prix entre 0 et 9 999 €.', valeur);
    if (b.type === 'offre' && !texte.value.trim() && !badge.value.trim()) return echec('Pour une offre sans prix, écrivez le message ou l’étiquette à afficher.', texte);
    const c = b.cible; if (!c.tous && !c.univers.length && !c.categories.length && !c.services.length) return echec('Choisissez les prestations concernées.');
    if (debut.value && fin.value && fin.value < debut.value) return echec('La date de fin doit suivre la date de début.', fin);
    const r = { id: b.id, titre: titre.value.trim(), texte: texte.value.trim(), type: b.type, valeur: v, badge: badge.value.trim(), cible: copie(c), debut: debut.value || '', fin: fin.value || '', banniere: !!b.banniere, actif: b.actif !== false };
    if (neuf) S.doc.promotions.unshift(r); else S.doc.promotions[S.doc.promotions.indexOf(p)] = r;
    m.fermer(); refaire(); toast(neuf ? 'Promotion créée (pensez à publier).' : 'Promotion modifiée (pensez à publier).');
  };
  m = modale({ titre: neuf ? 'Nouvelle promotion' : 'Modifier la promotion', large: true,
    contenu: (corps) => { corps.append(h('form', { class: 'formulaire', novalidate: true, on: { submit: (e) => { e.preventDefault(); ok(); } } },
      champ({ label: 'Titre de la promotion' }, titre), champ({ label: 'Message (facultatif)', aide: 'Affiché dans le bandeau du site, après le titre.' }, texte),
      h('div', { class: 'champ' }, h('span', { class: 'champ__etiquette', text: 'Type de remise' }), types),
      h('div', { class: 'champ' }, h('label', null, h('span', { class: 'champ__etiquette', text: b.type === 'prix' ? 'Prix promotionnel' : 'Valeur de la remise' }), h('span', { class: 'champ__entree-unite' }, valeur, unite))),
      h('div', { class: 'champ' }, h('span', { class: 'champ__etiquette', text: 'Prestations concernées' }), portees, detailPortee),
      exemple, champ({ label: 'Étiquette sur les prestations (facultative)' }, badge),
      h('div', { class: 'champs-ligne' }, champ({ label: 'Début' }, debut), champ({ label: 'Fin (incluse)', aide: 'Laissez vide pour une promotion sans date de fin.' }, fin)),
      banniere, actif, erreur, h('button', { type: 'submit', hidden: true }))); majExemple(); },
    boutons: [bouton({ texte: 'Annuler', classe: 'btn--discret', onclick: () => m.fermer() }), bouton({ texte: neuf ? 'Créer la promotion' : 'Enregistrer', classe: 'btn--or', onclick: ok })] });
}
