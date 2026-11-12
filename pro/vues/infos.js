// Horaires et infos : horaires de la semaine, jours fériés fermés, congés et fermetures exceptionnelles, annonce en haut du site, « à savoir », coordonnées.
import { h, icone, bouton, toast, modale, confirmer, champ, entree, interrupteur, lireNombre, afficherNombre } from '../ui.js';
import { S, notifier, idNeuf } from '../etat.js';
const R = window.ANSRendu;
const DEFAUT = [['09:00', '12:00'], ['13:00', '17:45']];

export function rendre(el, ctx) {
  const doc = S.doc, refaire = () => { notifier(); ctx.rerendre(); };
  el.append(h('header', { class: 'page-tete' }, h('h1', { text: 'Horaires & infos' }), h('p', { class: 'page-tete__sous', text: 'Les horaires, les fermetures et les coordonnées affichées sur votre site.' })));
  el.append(horaires(doc, refaire), conges(doc, refaire), feries(doc, refaire), annonce(doc), notes(doc, refaire), coordonnees(doc));
  if (S.demande === 'conge') { S.demande = null; setTimeout(() => modifierConge(null, refaire), 200); }
}

/* ---------- horaires de la semaine ---------- */
function horaires(doc, refaire) {
  const sec = h('section', { class: 'carte-ui', 'aria-labelledby': 'h-hor' }, h('h2', { id: 'h-hor', text: 'Horaires d’ouverture' }));
  const jours = h('ul', { class: 'jours' });
  doc.horaires.forEach((j, i) => {
    const err = h('p', { class: 'champ__erreur', role: 'alert', hidden: true });
    const nom = j.jour.charAt(0).toUpperCase() + j.jour.slice(1);
    const ouvert = interrupteur({ label: nom, coche: j.plages.length > 0, onchange: (v) => { j.plages = v ? DEFAUT.map((p) => [...p]) : []; refaire(); } });
    const plages = h('div', { class: 'plages' });
    j.plages.forEach((pl, k) => {
      const a = h('input', { type: 'time', value: pl[0], 'aria-label': `${nom}, ouverture ${k + 1}`, required: true }), z = h('input', { type: 'time', value: pl[1], 'aria-label': `${nom}, fermeture ${k + 1}`, required: true });
      const valider = () => {
        if (!a.value || !z.value) return;
        if (a.value >= z.value) { err.textContent = `${nom} : la fermeture doit être après l’ouverture.`; err.hidden = false; a.classList.add('est-invalide'); z.classList.add('est-invalide'); return; }
        const autres = j.plages.filter((_, n) => n !== k); const chevauche = autres.some(([x, y]) => a.value < y && z.value > x);
        if (chevauche) { err.textContent = `${nom} : deux plages d’ouverture se chevauchent.`; err.hidden = false; return; }
        err.hidden = true; a.classList.remove('est-invalide'); z.classList.remove('est-invalide');
        pl[0] = a.value; pl[1] = z.value; j.plages.sort((p, q) => (p[0] < q[0] ? -1 : 1)); notifier();
      };
      a.addEventListener('change', valider); z.addEventListener('change', valider);
      plages.append(h('div', { class: 'plage' }, a, h('span', { text: 'à' }), z, bouton({ ic: 'croix', classe: 'btn--rond btn--discret btn--petit', aria: `Retirer la plage ${k + 1} du ${j.jour}`, onclick: () => { j.plages.splice(k, 1); refaire(); } })));
    });
    if (j.plages.length && j.plages.length < 3) plages.append(bouton({ texte: 'Ajouter une plage', ic: 'plus', classe: 'btn--discret btn--petit', onclick: () => { const der = j.plages[j.plages.length - 1][1]; j.plages.push([der < '18:00' ? '18:00' : '19:00', der < '18:00' ? '19:00' : '20:00']); refaire(); } }));
    if (!j.plages.length) plages.append(h('span', { class: 'plages__ferme', text: 'Fermé' }));
    jours.append(h('li', { class: 'jour' }, ouvert, plages, err));
  });
  sec.append(jours, bouton({ texte: 'Copier les horaires du lundi sur du mardi au vendredi', ic: 'copier', classe: 'btn--clair btn--petit', onclick: () => { for (let i = 1; i <= 4; i++) doc.horaires[i].plages = doc.horaires[0].plages.map((p) => [...p]); refaire(); toast('Horaires du lundi copiés du mardi au vendredi.'); } }));
  return sec;
}

/* ---------- congés ---------- */
function modifierConge(c, refaire) {
  const neuf = !c, jour = R.parisJour();
  const b = c ? { ...c } : { id: idNeuf('cg'), debut: jour, fin: jour, message: '' };
  const debut = h('input', { type: 'date', value: b.debut }), fin = h('input', { type: 'date', value: b.fin }), message = entree({ value: b.message, maxlength: 120, placeholder: 'Ex. Congés d’hiver, formation…' });
  const erreur = h('p', { class: 'champ__erreur', role: 'alert', hidden: true });
  let m;
  const ok = () => {
    const echec = (t, x) => { erreur.textContent = t; erreur.hidden = false; x && x.focus(); };
    if (!debut.value) return echec('Choisissez le premier jour de fermeture.', debut);
    const f = fin.value || debut.value; if (f < debut.value) return echec('Le dernier jour doit suivre le premier.', fin);
    if ((new Date(f) - new Date(debut.value)) / 86400000 > 120) return echec('Une fermeture ne peut pas dépasser 120 jours.', fin);
    const r = { id: b.id, debut: debut.value, fin: f, message: message.value.trim() };
    if (neuf) S.doc.conges.push(r); else S.doc.conges[S.doc.conges.indexOf(c)] = r;
    S.doc.conges.sort((p, q) => (p.debut < q.debut ? -1 : 1)); m.fermer(); refaire(); toast('Fermeture enregistrée (pensez à publier).');
  };
  m = modale({ titre: neuf ? 'Nouvelle fermeture' : 'Modifier la fermeture',
    contenu: (corps) => corps.append(h('form', { class: 'formulaire', novalidate: true, on: { submit: (e) => { e.preventDefault(); ok(); } } }, h('p', { class: 'champ__aide', text: 'Pendant ces dates, le site indique « Fermé » et affiche un bandeau d’information 14 jours avant.' }), h('div', { class: 'champs-ligne' }, champ({ label: 'Premier jour fermé' }, debut), champ({ label: 'Dernier jour fermé', aide: 'Identique pour un seul jour.' }, fin)), champ({ label: 'Message (facultatif)' }, message), erreur, h('button', { type: 'submit', hidden: true }))),
    boutons: [neuf ? null : bouton({ texte: 'Supprimer', ic: 'corbeille', classe: 'btn--danger-clair', onclick: () => { S.doc.conges.splice(S.doc.conges.indexOf(c), 1); m.fermer(); refaire(); } }), bouton({ texte: 'Annuler', classe: 'btn--discret', onclick: () => m.fermer() }), bouton({ texte: neuf ? 'Ajouter' : 'Enregistrer', classe: 'btn--or', onclick: ok })].filter(Boolean) });
}
function conges(doc, refaire) {
  const jour = R.parisJour();
  const passes = doc.conges.filter((c) => c.fin < jour).length;
  return h('section', { class: 'carte-ui', 'aria-labelledby': 'h-cg' }, h('h2', { id: 'h-cg', text: 'Congés et fermetures exceptionnelles' }),
    doc.conges.length ? h('ul', { class: 'liste-simple' }, doc.conges.map((c) => h('li', { class: c.fin < jour ? 'est-passe' : '' },
      icone('infos', 18), h('span', null, h('strong', { text: c.debut === c.fin ? R.dateFr(c.debut) : `${R.dateFr(c.debut)} → ${R.dateFr(c.fin)}` }), c.message ? ' · ' + c.message : '', c.fin < jour ? ' · terminée' : ''),
      h('span', { class: 'actions-ligne' }, bouton({ ic: 'crayon', classe: 'btn--rond btn--discret', aria: 'Modifier cette fermeture', onclick: () => modifierConge(c, refaire) }), bouton({ ic: 'corbeille', classe: 'btn--rond btn--discret', aria: 'Supprimer cette fermeture', onclick: () => { doc.conges.splice(doc.conges.indexOf(c), 1); refaire(); } }))))) : h('p', { class: 'vide', text: 'Aucune fermeture prévue.' }),
    h('div', { class: 'carte-ui__actions' }, bouton({ texte: 'Ajouter une fermeture', ic: 'plus', classe: 'btn--bleu', onclick: () => modifierConge(null, refaire) }),
      passes ? bouton({ texte: `Effacer les ${passes} fermeture${passes > 1 ? 's' : ''} passée${passes > 1 ? 's' : ''}`, classe: 'btn--discret btn--petit', onclick: () => { doc.conges = doc.conges.filter((c) => c.fin >= jour); refaire(); } }) : null));
}

/* ---------- jours fériés fermés ---------- */
function feries(doc, refaire) {
  const jour = R.parisJour();
  const date = h('input', { type: 'date', 'aria-label': 'Ajouter un jour férié' });
  const futurs = doc.fermetures.filter((d) => d >= jour);
  return h('section', { class: 'carte-ui', 'aria-labelledby': 'h-fe' }, h('h2', { id: 'h-fe', text: 'Jours fériés fermés' }), h('p', { class: 'champ__aide', text: 'Le studio est fermé ces jours-là (le site affiche « Fermé » et la prochaine ouverture).' }),
    futurs.length ? h('ul', { class: 'puces' }, futurs.map((d) => h('li', { class: 'puce' }, h('span', { text: R.jourFr(d) }), bouton({ ic: 'croix', classe: 'btn--rond btn--discret btn--petit', aria: `Retirer le ${R.jourFr(d)}`, onclick: () => { doc.fermetures = doc.fermetures.filter((x) => x !== d); refaire(); } })))) : h('p', { class: 'vide', text: 'Aucun jour férié à venir dans la liste.' }),
    h('div', { class: 'ajout-date' }, date, bouton({ texte: 'Ajouter ce jour', ic: 'plus', classe: 'btn--clair', onclick: () => { if (!date.value) return; if (!doc.fermetures.includes(date.value)) { doc.fermetures.push(date.value); doc.fermetures.sort(); } refaire(); } })));
}

/* ---------- annonce ---------- */
function annonce(doc) {
  const a = doc.annonce;
  const texte = h('textarea', { rows: 2, maxlength: 200, 'aria-label': 'Message de l’annonce', placeholder: 'Ex. Le studio ferme exceptionnellement à 16 h ce vendredi.', text: a.texte, on: { input: (e) => { a.texte = e.target.value; notifier(); } } });
  const debut = h('input', { type: 'date', value: a.debut, 'aria-label': 'Début de l’annonce', on: { change: (e) => { a.debut = e.target.value; notifier(); } } }), fin = h('input', { type: 'date', value: a.fin, 'aria-label': 'Fin de l’annonce', on: { change: (e) => { a.fin = e.target.value; notifier(); } } });
  return h('section', { class: 'carte-ui', 'aria-labelledby': 'h-an' }, h('h2', { id: 'h-an', text: 'Annonce en haut du site' }), h('p', { class: 'champ__aide', text: 'Un bandeau doré au-dessus de toutes les pages, pour une information importante.' }),
    interrupteur({ label: 'Afficher l’annonce', coche: a.actif, onchange: (v) => { a.actif = v; notifier(); } }), texte,
    h('div', { class: 'champs-ligne' }, champ({ label: 'À partir du (facultatif)' }, debut), champ({ label: 'Jusqu’au (facultatif)' }, fin)));
}

/* ---------- « À savoir avant de réserver » ---------- */
function notes(doc, refaire) {
  const liste = doc.asavoir;
  const bouger = (i, d) => { const j = i + d; if (j < 0 || j >= liste.length) return; [liste[i], liste[j]] = [liste[j], liste[i]]; refaire(); };
  return h('section', { class: 'carte-ui', 'aria-labelledby': 'h-no' }, h('h2', { id: 'h-no', text: 'À savoir avant de réserver' }),
    h('p', { class: 'champ__aide', text: 'Les règles du studio affichées sous la carte des soins (retards, bon cadeau, suppléments…). Pour faire apparaître un prix dans une phrase, écrivez {p} à l’endroit voulu et renseignez le prix à droite.' }),
    liste.length ? h('ul', { class: 'notes-liste' }, liste.map((n, i) => {
      const texte = h('textarea', { rows: 2, maxlength: 300, 'aria-label': `Règle ${i + 1}`, text: n.texte, on: { input: (e) => { n.texte = e.target.value; notifier(); } } });
      const prix = h('input', { inputmode: 'decimal', 'aria-label': `Prix de la règle ${i + 1} (facultatif)`, placeholder: 'Prix', value: n.prix != null ? afficherNombre(n.prix) : '', autocomplete: 'off',
        on: { change: (e) => { const v = e.target.value.trim(); if (!v) { delete n.prix; notifier(); return; } const x = lireNombre(v); if (x === null || x < 0 || x > 9999) { e.target.classList.add('est-invalide'); toast('Saisissez un prix entre 0 et 9 999 €, ou laissez vide.', 'erreur'); return; } e.target.classList.remove('est-invalide'); n.prix = Math.round(x * 100) / 100; notifier(); } } });
      return h('li', { class: 'note-ligne' }, texte, h('div', { class: 'note-ligne__droite' }, h('label', { class: 'note-ligne__prix' }, prix, h('span', { text: '€', 'aria-hidden': 'true' })),
        h('span', { class: 'actions-ligne' }, bouton({ ic: 'haut', classe: 'btn--rond btn--discret btn--petit', aria: `Monter la règle ${i + 1}`, disabled: i === 0, onclick: () => bouger(i, -1) }), bouton({ ic: 'bas', classe: 'btn--rond btn--discret btn--petit', aria: `Descendre la règle ${i + 1}`, disabled: i === liste.length - 1, onclick: () => bouger(i, 1) }),
          bouton({ ic: 'corbeille', classe: 'btn--rond btn--discret btn--petit', aria: `Supprimer la règle ${i + 1}`, onclick: () => { liste.splice(i, 1); refaire(); } }))));
    })) : h('p', { class: 'vide', text: 'Aucune règle affichée.' }),
    liste.length < 20 ? h('div', { class: 'carte-ui__actions' }, bouton({ texte: 'Ajouter une règle', ic: 'plus', classe: 'btn--bleu', onclick: () => { liste.push({ id: idNeuf('n'), texte: 'Nouvelle règle : écrivez-la ici.' }); refaire(); } })) : null);
}

/* ---------- coordonnées ---------- */
function coordonnees(doc) {
  const c = doc.contact;
  const err = (id) => h('p', { class: 'champ__erreur', role: 'alert', hidden: true, id });
  const tel = entree({ value: c.tel.affiche, inputmode: 'tel', autocomplete: 'off' }), telErr = h('p', { class: 'champ__erreur', role: 'alert', hidden: true });
  tel.addEventListener('change', () => { const r = R.telDepuisAffiche(tel.value); if (!r) { telErr.textContent = 'Numéro non reconnu : saisissez un numéro français, par exemple 06 12 34 56 78.'; telErr.hidden = false; tel.classList.add('est-invalide'); return; } telErr.hidden = true; tel.classList.remove('est-invalide'); tel.value = r.affiche; c.tel = r; notifier(); });
  const lien = (cle, hotes, exemple) => { const e = entree({ value: c[cle], placeholder: exemple, inputmode: 'url', autocomplete: 'off', maxlength: 200 }), er = h('p', { class: 'champ__erreur', role: 'alert', hidden: true });
    e.addEventListener('change', () => { let v = e.value.trim(); if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v; v = v.replace(/^http:\/\//i, 'https://'); let ok = !v; try { if (v) { const u = new URL(v); ok = u.protocol === 'https:' && hotes.some((x) => u.hostname === x || u.hostname.endsWith('.' + x)); } } catch { ok = false; }
      if (!ok) { er.textContent = `Adresse non reconnue : elle doit commencer par ${exemple.replace(/\/.*/, '')}.`; er.hidden = false; e.classList.add('est-invalide'); return; } er.hidden = true; e.classList.remove('est-invalide'); e.value = v; c[cle] = v; notifier(); });
    return [e, er]; };
  const [insta, instaErr] = lien('instagram', ['instagram.com'], 'https://www.instagram.com/votre-compte/'), [fb, fbErr] = lien('facebook', ['facebook.com', 'fb.com'], 'https://www.facebook.com/votre-page');
  return h('section', { class: 'carte-ui', 'aria-labelledby': 'h-co' }, h('h2', { id: 'h-co', text: 'Coordonnées' }),
    champ({ label: 'Téléphone', aide: 'Affiché partout sur le site (boutons « Appeler »).' }, tel), telErr,
    champ({ label: 'Instagram', aide: 'Un lien « Instagram » apparaît en bas du site. Laissez vide pour le retirer.' }, insta), instaErr,
    champ({ label: 'Facebook', aide: 'Facultatif.' }, fb), fbErr);
}
