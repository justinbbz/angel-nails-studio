// Prestations : onglets (univers), catégories, prestations (prix en direct, durée, ordre, masquer), ajout, suppression, ajustement groupé des prix.
import { h, icone, bouton, toast, modale, confirmer, champ, entree, interrupteur, lireNombre, afficherNombre } from '../ui.js';
import { S, notifier, idNeuf, services, chercher, copie } from '../etat.js';
import { urlImage } from '../api.js';
import { choisirPhoto } from './photos.js';
const R = window.ANSRendu;
let courant = null, recherche = '';

const duree = (m) => (m ? R.duree(m) : '');
const universDe = (id) => S.doc.univers.find((u) => u.id === id);
const bouger = (liste, i, d) => { const j = i + d; if (j < 0 || j >= liste.length) return false; [liste[i], liste[j]] = [liste[j], liste[i]]; return true; };
const ids = (u) => u.categories.flatMap((c) => c.services.map((s) => s.id));

export function rendre(el, ctx) {
  const doc = S.doc;
  if (!courant || !universDe(courant)) courant = doc.univers[0].id;
  const v = R.vue(doc, R.parisJour());
  const effectif = new Map(); v.univers.forEach((u) => u.categories.forEach((c) => c.services.forEach((s) => effectif.set(s.id, s))));
  const refaire = () => { notifier(); ctx.rerendre(); };

  el.append(h('header', { class: 'page-tete page-tete--actions' }, h('div', null, h('h1', { text: 'Prestations' }), h('p', { class: 'page-tete__sous', text: 'Modifiez un prix directement dans la liste, ou ouvrez une prestation pour tout changer.' })),
    h('div', { class: 'page-tete__boutons' }, bouton({ texte: 'Ajuster les prix', ic: 'prestations', classe: 'btn--clair', onclick: () => ajusterPrix(refaire) }), bouton({ texte: 'Nouvel onglet', ic: 'plus', classe: 'btn--clair', onclick: () => modifierUnivers(null, ctx, refaire) }))));

  const champRecherche = h('input', { type: 'search', class: 'recherche__champ', placeholder: 'Rechercher une prestation…', value: recherche, autocomplete: 'off', 'aria-label': 'Rechercher une prestation', on: { input: (e) => { recherche = e.target.value; const pos = e.target.selectionStart; rerenduRecherche(); } } });
  el.append(h('div', { class: 'recherche' }, icone('prestations', 18), champRecherche));
  const zone = h('div', { class: 'zone-prestations' });
  el.append(zone);

  function rerenduRecherche() { zone.replaceChildren(); remplir(); }
  function remplir() {
    const q = R.norm(recherche).split(' ').filter(Boolean);
    if (q.length) {
      const trouves = [...services(doc)].filter((x) => q.every((t) => R.norm(x.s.nom + ' ' + x.s.detail).includes(t)));
      zone.append(h('p', { class: 'resultats', role: 'status', text: trouves.length ? `${trouves.length} prestation${trouves.length > 1 ? 's' : ''} trouvée${trouves.length > 1 ? 's' : ''}` : 'Aucune prestation ne correspond.' }),
        trouves.length ? h('div', { class: 'carte-ui carte-ui--liste' }, h('ul', { class: 'lignes' }, trouves.map((x) => ligne(x, effectif, refaire, true)))) : null);
      return;
    }
    zone.append(h('div', { class: 'onglets', role: 'tablist', 'aria-label': 'Univers de prestations' }, doc.univers.map((u) => {
      const n = ids(u).length;
      return h('button', { type: 'button', role: 'tab', class: 'onglet' + (u.id === courant ? ' est-actif' : ''), 'aria-selected': String(u.id === courant), on: { click: () => { courant = u.id; ctx.rerendre(); } } },
        h('span', { text: u.court }), h('small', { text: String(n) }), u.visible === false ? icone('oeil-barre', 14) : null);
    })));
    zone.append(panneau(universDe(courant)));
  }

  function panneau(u) {
    const p = u.photo;
    const nbVis = u.categories.reduce((a, c) => a + c.services.filter((s) => s.visible !== false).length, 0);
    const bloc = h('section', { class: 'univers' },
      h('div', { class: 'carte-ui univers__tete' },
        p && urlImage(p.src) ? h('img', { class: 'univers__photo', src: urlImage(p.src), alt: '', width: 96, height: 96 }) : h('span', { class: 'univers__photo univers__photo--vide', 'aria-hidden': 'true' }, icone('photos', 28)),
        h('div', { class: 'univers__texte' }, h('h2', { text: u.titre }), h('p', { text: u.intro || 'Pas de texte d’introduction.' }),
          u.visible === false ? h('p', { class: 'pastille pastille--alerte' }, icone('oeil-barre', 14), ' Cet onglet est masqué sur le site') : (!nbVis ? h('p', { class: 'pastille pastille--alerte' }, icone('alerte', 14), ' Cet onglet n’apparaît pas encore : ajoutez une prestation visible.') : null)),
        h('div', { class: 'univers__actions' }, bouton({ texte: 'Modifier l’onglet', ic: 'crayon', classe: 'btn--clair btn--petit', onclick: () => modifierUnivers(u, ctx, refaire) }))));
    u.categories.forEach((c, i) => bloc.append(categorie(u, c, i)));
    bloc.append(bouton({ texte: 'Ajouter une catégorie', ic: 'plus', classe: 'btn--clair', onclick: () => modifierCategorie(u, null, refaire) }));
    return bloc;
  }

  function categorie(u, c, i) {
    return h('article', { class: 'carte-ui categorie' + (c.visible === false ? ' est-masquee' : '') },
      h('header', { class: 'categorie__tete' },
        h('div', { class: 'categorie__titre' }, h('h3', { text: c.titre }), h('span', { class: 'categorie__n', text: `${c.services.length} prestation${c.services.length > 1 ? 's' : ''}` + (c.visible === false ? ' · catégorie masquée' : '') })),
        h('div', { class: 'actions-ligne' },
          bouton({ ic: 'haut', classe: 'btn--rond btn--discret', aria: `Monter la catégorie ${c.titre}`, disabled: i === 0, onclick: () => { bouger(u.categories, i, -1); refaire(); } }),
          bouton({ ic: 'bas', classe: 'btn--rond btn--discret', aria: `Descendre la catégorie ${c.titre}`, disabled: i === u.categories.length - 1, onclick: () => { bouger(u.categories, i, 1); refaire(); } }),
          bouton({ ic: 'crayon', classe: 'btn--rond btn--discret', aria: `Modifier la catégorie ${c.titre}`, onclick: () => modifierCategorie(u, c, refaire) }))),
      c.note ? h('p', { class: 'categorie__note', text: c.note }) : null,
      h('ul', { class: 'lignes' }, c.services.map((s) => ligne({ u, c, s }, effectif, refaire, false))),
      bouton({ texte: 'Ajouter une prestation ici', ic: 'plus', classe: 'btn--discret btn--petit', onclick: () => modifierService({ u, c, s: null }, refaire) }));
  }

  function ligne({ u, c, s }, effectif, refaire, avecChemin) {
    const e = effectif.get(s.id), liste = c.services, i = liste.indexOf(s);
    const prix = h('input', { class: 'ligne__prix', inputmode: 'decimal', value: afficherNombre(s.prix), 'aria-label': `Prix de ${s.nom} en euros`, autocomplete: 'off',
      on: { change: (ev) => { const n = lireNombre(ev.target.value); if (n === null || n < 0 || n > 9999) { ev.target.classList.add('est-invalide'); toast('Saisissez un prix entre 0 et 9 999 €.', 'erreur'); ev.target.value = afficherNombre(s.prix); setTimeout(() => ev.target.classList.remove('est-invalide'), 1500); return; } s.prix = Math.round(n * 100) / 100; ev.target.value = afficherNombre(s.prix); notifier(); }, focus: (ev) => ev.target.select() } });
    return h('li', { class: 'ligne' + (s.visible === false ? ' est-masquee' : '') },
      h('div', { class: 'ligne__nom' }, h('strong', { text: s.nom }), s.etiquette ? h('span', { class: 'pastille pastille--or', text: s.etiquette }) : null, s.visible === false ? h('span', { class: 'pastille', text: 'Masquée' }) : null, !s.enLigne ? h('span', { class: 'pastille', text: 'Sur appel' }) : null,
        s.detail ? h('small', { text: s.detail }) : null, avecChemin ? h('small', { class: 'ligne__chemin', text: `${u.court} › ${c.titre}` }) : null,
        e && e.badge && e.prixBarre != null ? h('small', { class: 'ligne__promo' }, icone('promotions', 14), ` Promotion en cours : ${R.euro(e.prixAff)} (${e.badge})`) : null),
      h('div', { class: 'ligne__duree', text: duree(s.duree) }),
      h('label', { class: 'ligne__prixbloc' }, prix, h('span', { text: '€', 'aria-hidden': 'true' })),
      h('div', { class: 'actions-ligne' },
        avecChemin ? null : [bouton({ ic: 'haut', classe: 'btn--rond btn--discret', aria: `Monter ${s.nom}`, disabled: i === 0, onclick: () => { bouger(liste, i, -1); refaire(); } }), bouton({ ic: 'bas', classe: 'btn--rond btn--discret', aria: `Descendre ${s.nom}`, disabled: i === liste.length - 1, onclick: () => { bouger(liste, i, 1); refaire(); } })],
        bouton({ ic: s.visible === false ? 'oeil-barre' : 'oeil', classe: 'btn--rond btn--discret', aria: s.visible === false ? `Afficher ${s.nom} sur le site` : `Masquer ${s.nom} du site`, titre: s.visible === false ? 'Masquée : cliquer pour afficher' : 'Affichée : cliquer pour masquer', onclick: () => { if (s.visible === false) delete s.visible; else s.visible = false; refaire(); } }),
        bouton({ ic: 'crayon', classe: 'btn--rond btn--discret', aria: `Modifier ${s.nom}`, onclick: () => modifierService({ u, c, s }, refaire) })));
  }

  remplir();
}

/* ---------- fenêtre d'une prestation (ajout ou modification) ---------- */
function modifierService({ u, c, s }, refaire) {
  const neuf = !s;
  const brouillon = s ? copie(s) : { id: idNeuf('s'), nom: '', detail: '', duree: 60, prix: 0, enLigne: true };
  let cibleCategorie = c.id;
  const nom = entree({ value: brouillon.nom, maxlength: 100, required: true });
  const detail = entree({ value: brouillon.detail, maxlength: 240 });
  const prix = h('input', { inputmode: 'decimal', value: neuf ? '' : afficherNombre(brouillon.prix), autocomplete: 'off', placeholder: '0' });
  const heures = h('input', { type: 'number', min: 0, max: 12, step: 1, value: Math.floor((brouillon.duree || 0) / 60), inputmode: 'numeric', 'aria-label': 'Durée : heures' });
  const minutes = h('input', { type: 'number', min: 0, max: 59, step: 5, value: (brouillon.duree || 0) % 60, inputmode: 'numeric', 'aria-label': 'Durée : minutes' });
  const aPartirDe = interrupteur({ label: 'Prix « à partir de » (le prix affiché devient « dès X € »)', coche: !!brouillon.aPartirDe, onchange: (v) => { if (v) brouillon.aPartirDe = true; else delete brouillon.aPartirDe; } });
  const reservation = h('select', { 'aria-label': 'Réservation' }, h('option', { value: 'ligne', text: 'Bouton « Réserver » (page Planity du studio)', selected: brouillon.enLigne }), h('option', { value: 'appel', text: 'Bouton « Sur appel » (téléphone)', selected: !brouillon.enLigne }));
  const etiquette = entree({ value: brouillon.etiquette || '', maxlength: 20, placeholder: 'Ex. Nouveau, Coup de cœur…', list: 'etiquettes' });
  const datalist = h('datalist', { id: 'etiquettes' }, ['Nouveau', 'Promotion', 'Coup de cœur', 'Populaire'].map((t) => h('option', { value: t })));
  const categories = h('select', { 'aria-label': 'Catégorie' }, S.doc.univers.map((un) => h('optgroup', { label: un.court }, un.categories.map((ca) => h('option', { value: ca.id, text: ca.titre, selected: ca.id === c.id })))));
  categories.addEventListener('change', () => { cibleCategorie = categories.value; });
  const visible = interrupteur({ label: 'Afficher cette prestation sur le site', coche: brouillon.visible !== false, onchange: (v) => { if (v) delete brouillon.visible; else brouillon.visible = false; } });
  const erreur = h('p', { class: 'champ__erreur', role: 'alert', hidden: true });
  let m;
  const enregistrer = () => {
    const p = lireNombre(prix.value), d = (Number(heures.value) || 0) * 60 + (Number(minutes.value) || 0);
    const echec = (t, champ) => { erreur.textContent = t; erreur.hidden = false; champ && champ.focus(); };
    if (!nom.value.trim()) return echec('Donnez un nom à la prestation.', nom);
    if (p === null || p < 0 || p > 9999) return echec('Saisissez un prix entre 0 et 9 999 €.', prix);
    if (d < 0 || d > 720) return echec('La durée doit être comprise entre 0 et 12 h.', heures);
    Object.assign(brouillon, { nom: nom.value.trim(), detail: detail.value.trim(), prix: Math.round(p * 100) / 100, duree: d, enLigne: reservation.value === 'ligne' });
    const et = etiquette.value.trim(); if (et) brouillon.etiquette = et; else delete brouillon.etiquette;
    const cible = S.doc.univers.flatMap((un) => un.categories).find((ca) => ca.id === cibleCategorie);
    if (neuf) cible.services.push(brouillon);
    else if (cibleCategorie === c.id) c.services[c.services.indexOf(s)] = brouillon;
    else { c.services.splice(c.services.indexOf(s), 1); cible.services.push(brouillon); }
    m.fermer(); refaire(); toast(neuf ? 'Prestation ajoutée (pensez à publier).' : 'Prestation modifiée (pensez à publier).');
  };
  m = modale({ titre: neuf ? `Nouvelle prestation · ${c.titre}` : 'Modifier la prestation', large: true,
    contenu: (corps) => corps.append(h('form', { class: 'formulaire', novalidate: true, on: { submit: (e) => { e.preventDefault(); enregistrer(); } } },
      champ({ label: 'Nom de la prestation' }, nom), champ({ label: 'Description courte (facultative)', aide: 'Une ligne sous le nom : ce qui est compris, le matériel…' }, detail),
      h('div', { class: 'champs-ligne' }, champ({ label: 'Prix (€)' }, prix), h('div', { class: 'champ' }, h('span', { class: 'champ__etiquette', text: 'Durée' }), h('div', { class: 'duree' }, heures, h('span', { text: 'h' }), minutes, h('span', { text: 'min' })))),
      aPartirDe, champ({ label: 'Réservation' }, reservation), champ({ label: 'Étiquette (facultative)', aide: 'Un petit badge à côté du nom.' }, etiquette), datalist, champ({ label: 'Catégorie' }, categories), visible, erreur, h('button', { type: 'submit', hidden: true }))),
    boutons: [
      neuf ? null : bouton({ texte: 'Supprimer', ic: 'corbeille', classe: 'btn--danger-clair', onclick: async () => { if (!(await confirmer({ titre: 'Supprimer cette prestation ?', texte: `« ${s.nom} » sera retirée du site. Vous pourrez toujours la retrouver dans une ancienne version (menu Historique).`, ok: 'Supprimer', danger: true }))) return; c.services.splice(c.services.indexOf(s), 1); S.doc.envies.forEach((e) => { e.l = e.l.filter((x) => x !== s.id); }); S.doc.promotions.forEach((p) => { p.cible.services = p.cible.services.filter((x) => x !== s.id); }); m.fermer(); refaire(); toast('Prestation supprimée (pensez à publier).'); } }),
      neuf ? null : bouton({ texte: 'Dupliquer', ic: 'copier', classe: 'btn--clair', onclick: () => { const d = { ...copie(s), id: idNeuf('s'), nom: s.nom + ' (copie)' }; c.services.splice(c.services.indexOf(s) + 1, 0, d); m.fermer(); refaire(); toast('Prestation dupliquée : modifiez la copie.'); } }),
      bouton({ texte: 'Annuler', classe: 'btn--discret', onclick: () => m.fermer() }), bouton({ texte: neuf ? 'Ajouter' : 'Enregistrer', classe: 'btn--or', onclick: enregistrer })].filter(Boolean) });
}

/* ---------- catégorie ---------- */
function modifierCategorie(u, c, refaire) {
  const neuf = !c;
  const brouillon = c ? { titre: c.titre, note: c.note, visible: c.visible !== false } : { titre: '', note: '', visible: true };
  const titre = entree({ value: brouillon.titre, maxlength: 80 }), note = entree({ value: brouillon.note, maxlength: 360 });
  const visible = interrupteur({ label: 'Afficher cette catégorie sur le site', coche: brouillon.visible, onchange: (v) => { brouillon.visible = v; } });
  const erreur = h('p', { class: 'champ__erreur', role: 'alert', hidden: true });
  let m;
  const ok = () => {
    if (!titre.value.trim()) { erreur.textContent = 'Donnez un titre à la catégorie.'; erreur.hidden = false; titre.focus(); return; }
    if (neuf) u.categories.push({ id: idNeuf('c'), titre: titre.value.trim(), note: note.value.trim(), services: [] });
    else { c.titre = titre.value.trim(); c.note = note.value.trim(); if (brouillon.visible) delete c.visible; else c.visible = false; }
    m.fermer(); refaire();
  };
  m = modale({ titre: neuf ? `Nouvelle catégorie · ${u.court}` : 'Modifier la catégorie',
    contenu: (corps) => corps.append(h('form', { class: 'formulaire', novalidate: true, on: { submit: (e) => { e.preventDefault(); ok(); } } }, champ({ label: 'Titre' }, titre), champ({ label: 'Note (facultative)', aide: 'Affichée sous le titre, par exemple une précision sur les soins.' }, note), neuf ? null : visible, erreur, h('button', { type: 'submit', hidden: true }))),
    boutons: [neuf ? null : bouton({ texte: 'Supprimer', ic: 'corbeille', classe: 'btn--danger-clair', onclick: async () => {
      const n = c.services.length;
      if (!(await confirmer({ titre: 'Supprimer cette catégorie ?', texte: n ? `La catégorie « ${c.titre} » et ses ${n} prestation${n > 1 ? 's' : ''} seront retirées du site.` : `La catégorie « ${c.titre} » sera supprimée.`, ok: 'Supprimer', danger: true }))) return;
      const sup = new Set(c.services.map((s) => s.id)); u.categories.splice(u.categories.indexOf(c), 1);
      S.doc.envies.forEach((e) => { e.l = e.l.filter((x) => !sup.has(x)); }); S.doc.promotions.forEach((p) => { p.cible.services = p.cible.services.filter((x) => !sup.has(x)); p.cible.categories = p.cible.categories.filter((x) => x !== c.id); });
      m.fermer(); refaire();
    } }), bouton({ texte: 'Annuler', classe: 'btn--discret', onclick: () => m.fermer() }), bouton({ texte: neuf ? 'Ajouter' : 'Enregistrer', classe: 'btn--or', onclick: ok })].filter(Boolean) });
}

/* ---------- onglet (univers) ---------- */
function modifierUnivers(u, ctx, refaire) {
  const neuf = !u;
  const b = u ? { court: u.court, titre: u.titre, intro: u.intro, photo: u.photo ? copie(u.photo) : null, visible: u.visible !== false } : { court: '', titre: '', intro: '', photo: null, visible: true };
  const court = entree({ value: b.court, maxlength: 30 }), titre = entree({ value: b.titre, maxlength: 80 }), intro = h('textarea', { rows: 3, maxlength: 400, text: b.intro });
  const visible = interrupteur({ label: 'Afficher cet onglet sur le site', coche: b.visible, onchange: (v) => { b.visible = v; } });
  const aperçu = h('div', { class: 'photo-champ' });
  const majPhoto = () => { aperçu.replaceChildren(b.photo && urlImage(b.photo.src) ? h('img', { src: urlImage(b.photo.src), alt: '', width: 120, height: 120 }) : h('span', { class: 'photo-champ__vide', text: 'Aucune photo' }), bouton({ texte: b.photo ? 'Changer la photo' : 'Choisir une photo', ic: 'photos', classe: 'btn--clair btn--petit', onclick: async () => { const p = await choisirPhoto({ titre: 'Photo de l’onglet', alt: b.photo ? b.photo.alt : '' }); if (p) { b.photo = { ...p, forme: p.h > p.w * 1.1 ? 'v' : 'h' }; majPhoto(); } } })); };
  majPhoto();
  const erreur = h('p', { class: 'champ__erreur', role: 'alert', hidden: true });
  let m;
  const ok = () => {
    if (!court.value.trim() || !titre.value.trim()) { erreur.textContent = 'Renseignez le nom court (sur l’onglet) et le titre.'; erreur.hidden = false; (court.value.trim() ? titre : court).focus(); return; }
    if (neuf) { const nu = { id: idNeuf('u'), court: court.value.trim(), titre: titre.value.trim(), intro: intro.value.trim(), photo: b.photo, categories: [{ id: idNeuf('c'), titre: 'Prestations', note: '', services: [] }] }; if (!b.visible) nu.visible = false; S.doc.univers.push(nu); courant = nu.id; }
    else { Object.assign(u, { court: court.value.trim(), titre: titre.value.trim(), intro: intro.value.trim(), photo: b.photo }); if (b.visible) delete u.visible; else u.visible = false; }
    m.fermer(); refaire();
  };
  m = modale({ titre: neuf ? 'Nouvel onglet de prestations' : `Modifier l’onglet « ${u.court} »`, large: true,
    contenu: (corps) => corps.append(h('form', { class: 'formulaire', novalidate: true, on: { submit: (e) => { e.preventDefault(); ok(); } } },
      champ({ label: 'Nom court (affiché sur l’onglet)' }, court), champ({ label: 'Titre de la section' }, titre), champ({ label: 'Texte d’introduction' }, intro), h('div', { class: 'champ' }, h('span', { class: 'champ__etiquette', text: 'Photo' }), aperçu), visible, erreur, h('button', { type: 'submit', hidden: true }))),
    boutons: [neuf ? null : bouton({ texte: 'Supprimer l’onglet', ic: 'corbeille', classe: 'btn--danger-clair', onclick: async () => {
      if (S.doc.univers.length < 2) { toast('Il faut garder au moins un onglet.', 'erreur'); return; }
      const n = ids(u).length;
      if (!(await confirmer({ titre: 'Supprimer cet onglet ?', texte: `L’onglet « ${u.court} » et ses ${n} prestation${n > 1 ? 's' : ''} seront retirés du site.`, ok: 'Supprimer', danger: true }))) return;
      const sup = new Set(ids(u)); const cats = new Set(u.categories.map((c) => c.id)); S.doc.univers.splice(S.doc.univers.indexOf(u), 1);
      S.doc.envies = S.doc.envies.filter((e) => e.u !== u.id).map((e) => ({ ...e, l: e.l.filter((x) => !sup.has(x)) }));
      S.doc.promotions.forEach((p) => { p.cible.services = p.cible.services.filter((x) => !sup.has(x)); p.cible.categories = p.cible.categories.filter((x) => !cats.has(x)); p.cible.univers = p.cible.univers.filter((x) => x !== u.id); });
      courant = null; m.fermer(); refaire();
    } }),
    neuf ? null : bouton({ texte: 'Monter', ic: 'gauche', classe: 'btn--clair', disabled: S.doc.univers.indexOf(u) === 0, onclick: () => { bouger(S.doc.univers, S.doc.univers.indexOf(u), -1); m.fermer(); refaire(); } }),
    neuf ? null : bouton({ texte: 'Descendre', ic: 'droite', classe: 'btn--clair', disabled: S.doc.univers.indexOf(u) === S.doc.univers.length - 1, onclick: () => { bouger(S.doc.univers, S.doc.univers.indexOf(u), 1); m.fermer(); refaire(); } }),
    bouton({ texte: 'Annuler', classe: 'btn--discret', onclick: () => m.fermer() }), bouton({ texte: neuf ? 'Créer' : 'Enregistrer', classe: 'btn--or', onclick: ok })].filter(Boolean) });
}

/* ---------- ajustement groupé des prix ---------- */
function ajusterPrix(refaire) {
  const portee = h('select', { 'aria-label': 'Prestations concernées' }, h('option', { value: 'tout', text: 'Tout le site' }),
    S.doc.univers.map((u) => h('optgroup', { label: u.court }, h('option', { value: 'u:' + u.id, text: `Tout l’onglet « ${u.court} »` }), u.categories.map((c) => h('option', { value: 'c:' + c.id, text: c.titre })))));
  const mode = h('select', { 'aria-label': 'Type de changement' }, h('option', { value: 'plus%', text: 'Augmenter de (%)' }), h('option', { value: 'moins%', text: 'Baisser de (%)' }), h('option', { value: 'plus€', text: 'Augmenter de (€)' }), h('option', { value: 'moins€', text: 'Baisser de (€)' }), h('option', { value: 'arrondi', text: 'Arrondir à l’euro le plus proche' }));
  const valeur = h('input', { inputmode: 'decimal', value: '5', autocomplete: 'off' });
  const apercu = h('div', { class: 'ajust__apercu', 'aria-live': 'polite' });
  const concernees = () => { const p = portee.value; return [...services(S.doc)].filter((x) => p === 'tout' || (p.startsWith('u:') && x.u.id === p.slice(2)) || (p.startsWith('c:') && x.c.id === p.slice(2))); };
  const calc = (prix) => { const v = lireNombre(valeur.value); const m = mode.value; if (m === 'arrondi') return Math.round(prix); if (v === null || v < 0) return null; const n = m === 'plus%' ? prix * (1 + v / 100) : m === 'moins%' ? prix * (1 - v / 100) : m === 'plus€' ? prix + v : prix - v; return Math.max(0, Math.round(n * 100) / 100); };
  const maj = () => {
    mode.value === 'arrondi' ? valeur.setAttribute('disabled', '') : valeur.removeAttribute('disabled');
    const l = concernees(), chg = l.map((x) => ({ x, n: calc(x.s.prix) })).filter((y) => y.n !== null && y.n !== y.x.s.prix);
    apercu.replaceChildren(h('p', { class: 'ajust__n', text: chg.length ? `${chg.length} prix sur ${l.length} seront modifiés.` : 'Aucun prix ne change avec ces réglages.' }),
      chg.length ? h('ul', { class: 'liste-simple' }, chg.slice(0, 8).map(({ x, n }) => h('li', null, h('span', { text: x.s.nom }), h('strong', { text: `${R.euro(x.s.prix)} → ${R.euro(n)}` }))), chg.length > 8 ? h('li', { class: 'vide', text: `… et ${chg.length - 8} autre${chg.length - 8 > 1 ? 's' : ''}` }) : null) : null);
    return chg;
  };
  [portee, mode, valeur].forEach((e) => e.addEventListener('input', maj));
  let m;
  m = modale({ titre: 'Ajuster les prix', large: true,
    contenu: (corps) => { corps.append(h('p', { class: 'champ__aide', text: 'Appliquez un changement à plusieurs prix d’un coup. Vous voyez le résultat avant de valider, puis vous pouvez encore ajuster chaque prix à la main.' }), champ({ label: 'Prestations concernées' }, portee), h('div', { class: 'champs-ligne' }, champ({ label: 'Changement' }, mode), champ({ label: 'Valeur' }, valeur)), apercu); maj(); },
    boutons: [bouton({ texte: 'Annuler', classe: 'btn--discret', onclick: () => m.fermer() }), bouton({ texte: 'Appliquer', classe: 'btn--or', onclick: () => { const chg = maj(); if (!chg.length) return; chg.forEach(({ x, n }) => { x.s.prix = n; }); m.fermer(); refaire(); toast(`${chg.length} prix modifié${chg.length > 1 ? 's' : ''} (pensez à publier).`); } })] });
}
