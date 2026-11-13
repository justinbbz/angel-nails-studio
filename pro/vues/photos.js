// Photos : galerie « Réalisations » (ajout depuis le téléphone ou l'ordinateur, ordre, description, masquer, supprimer) et photos des pages.
// Chaque photo est réduite et compressée dans le navigateur (1600 px, JPEG) avant envoi : une photo de téléphone de 5 Mo devient ~300 Ko.
import { h, icone, bouton, toast, modale, confirmer, champ, entree, interrupteur } from '../ui.js';
import { S, notifier, idNeuf, copie } from '../etat.js';
import { api, urlImage } from '../api.js';

const MAX = 1600, LIMITE = 2300 * 1024;
let organiser = false;   // téléphone : les flèches de déplacement ne s'affichent que dans ce mode
const R = window.ANSRendu;

/* lit un fichier image, le réduit, le compresse en JPEG ; renvoie un Blob et ses dimensions */
export async function preparer(fichier) {
  if (!/^image\//.test(fichier.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(fichier.name)) throw new Error('Ce fichier n’est pas une image.');
  let source, w, h2;
  try { source = await createImageBitmap(fichier, { imageOrientation: 'from-image' }); w = source.width; h2 = source.height; }
  catch {
    source = await new Promise((ok, ko) => { const url = URL.createObjectURL(fichier), im = new Image(); im.onload = () => { URL.revokeObjectURL(url); ok(im); }; im.onerror = () => { URL.revokeObjectURL(url); ko(new Error('Photo illisible : essayez une photo JPEG ou PNG.')); }; im.src = url; });
    w = source.naturalWidth; h2 = source.naturalHeight;
  }
  if (w < 200 || h2 < 200) throw new Error('Photo trop petite (200 pixels au minimum de chaque côté).');
  let echelle = Math.min(1, MAX / Math.max(w, h2)), qualite = 0.86;
  for (let essai = 0; essai < 6; essai++) {
    const cw = Math.round(w * echelle), ch = Math.round(h2 * echelle);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(source, 0, 0, cw, ch);
    const blob = await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', qualite));
    if (blob && blob.size <= LIMITE) { source.close && source.close(); return { blob, w: cw, h: ch }; }
    qualite -= 0.08; echelle *= 0.85;
  }
  throw new Error('Photo trop lourde, même réduite : choisissez-en une autre.');
}
export async function envoyer(fichier) {
  const { blob, w, h: hh } = await preparer(fichier);
  const r = await api.image(blob);
  return { src: r.ref, w: r.w || w, h: r.h || hh };
}

/* choisir une photo + la décrire ; renvoie { src, w, h, alt } ou null */
export function choisirPhoto({ titre = 'Choisir une photo', alt = '' } = {}) {
  return new Promise((resolve) => {
    let resultat = null, fini = false;
    const fin = (v) => { if (!fini) { fini = true; resolve(v); } };
    const fichier = h('input', { type: 'file', accept: 'image/*', class: 'sr', id: 'choix-photo' });
    const apercu = h('div', { class: 'photo-choix__apercu', 'aria-live': 'polite' }, h('p', { class: 'vide', text: 'Aucune photo choisie' }));
    const description = entree({ value: alt, maxlength: 220, placeholder: 'Ex. Ongles amande nude avec french pointillée' });
    const erreur = h('p', { class: 'champ__erreur', role: 'alert', hidden: true });
    const ok = bouton({ texte: 'Utiliser cette photo', classe: 'btn--or', disabled: true, onclick: () => { resultat.alt = description.value.trim(); m.fermer(); fin(resultat); } });
    fichier.addEventListener('change', async () => {
      const f = fichier.files && fichier.files[0]; if (!f) return;
      erreur.hidden = true; ok.disabled = true; apercu.replaceChildren(h('p', { class: 'vide', text: 'Préparation et envoi de la photo…' }));
      try {
        resultat = await envoyer(f);
        apercu.replaceChildren(h('img', { src: urlImage(resultat.src), alt: 'Aperçu de la photo choisie', width: 240, height: Math.round(240 * resultat.h / resultat.w) }), h('p', { class: 'champ__aide', text: `${resultat.w} × ${resultat.h} pixels, envoyée.` }));
        ok.disabled = false; description.focus();
      } catch (x) { resultat = null; apercu.replaceChildren(h('p', { class: 'vide', text: 'Aucune photo choisie' })); erreur.textContent = x.message; erreur.hidden = false; }
    });
    const m = modale({ titre, onfermer: () => fin(null),
      contenu: (c) => c.append(h('div', { class: 'formulaire' }, h('div', { class: 'champ' }, h('label', { class: 'btn btn--clair', for: 'choix-photo' }, icone('envoyer', 18), h('span', { text: 'Choisir une photo' })), fichier, h('p', { class: 'champ__aide', text: 'Depuis votre téléphone vous pouvez aussi prendre une photo. Elle est réduite automatiquement.' })), apercu, erreur,
        champ({ label: 'Description de la photo', aide: 'Lue par les lecteurs d’écran et utile pour Google. Décrivez simplement ce que l’on voit.' }, description))),
      boutons: [bouton({ texte: 'Annuler', classe: 'btn--discret', onclick: () => m.fermer() }), ok] });
    setTimeout(() => fichier.focus(), 50);
  });
}

const RATIOS = { sq: 'Carré', t: 'Portrait (4/5)', w: 'Paysage (3/2)', v: 'Très haut (9/16)' };
const choisirRatio = (w, hh) => { const r = w / hh; return r > 1.25 ? 'w' : r < 0.62 ? 'v' : r < 0.9 ? 't' : r <= 1.1 ? 'sq' : 'w'; };
const PAGES = [['salon', 'Le studio · grande photo', '#studio'], ['coin', 'Le studio · coin détente', '#studio'], ['pedicure', 'Le studio · pédicure', '#studio']];

export function rendre(el, ctx) {
  const g = S.doc.galerie;
  const refaire = () => { notifier(); ctx.rerendre(); };
  const champFichier = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr', id: 'ajout-photos', on: { change: async () => {
    const fichiers = [...champFichier.files]; champFichier.value = ''; if (!fichiers.length) return;
    let ajoutees = 0; toast(`Envoi de ${fichiers.length} photo${fichiers.length > 1 ? 's' : ''}…`, 'ok', 2500);
    for (const f of fichiers) {
      try { const p = await envoyer(f); g.unshift({ id: idNeuf('g'), src: p.src, w: p.w, h: p.h, ratio: choisirRatio(p.w, p.h), court: 'Réalisation', legende: '', alt: '' }); ajoutees++; notifier(); }
      catch (x) { if (x.data && x.data.silencieux) return; toast(`${f.name} : ${x.message}`, 'erreur', 7000); }
    }
    if (ajoutees) { ctx.rerendre(); toast(`${ajoutees} photo${ajoutees > 1 ? 's ajoutées' : ' ajoutée'} au début de la galerie. Ajoutez une description à chacune.`); }
  } } });
  el.append(h('header', { class: 'page-tete page-tete--actions' }, h('div', null, h('h1', { text: 'Photos' }), h('p', { class: 'page-tete__sous', text: 'Vos réalisations s’affichent dans l’ordre ci-dessous : la première photo est la première que voient vos clientes.' })),
    h('div', { class: 'page-tete__boutons' }, h('label', { class: 'btn btn--or', for: 'ajout-photos' }, icone('plus', 18), h('span', { class: 'btn__t', text: 'Ajouter des photos' })), champFichier,
      h('button', { type: 'button', class: 'btn btn-organiser ' + (organiser ? 'btn--bleu' : 'btn--clair'), 'aria-pressed': String(organiser), on: { click: () => { organiser = !organiser; ctx.rerendre(); } } }, icone(organiser ? 'ok' : 'gauche', 18), h('span', { class: 'btn__t', text: organiser ? 'Terminé' : 'Changer l’ordre' })))));
  const manquantes = g.filter((p) => !p.alt).length;
  el.append(h('section', { class: 'carte-ui', 'aria-labelledby': 'h-galerie' }, h('h2', { id: 'h-galerie', text: `Galerie « Réalisations » (${g.length})` }),
    manquantes ? h('p', { class: 'pastille pastille--alerte' }, icone('alerte', 14), ` ${manquantes} photo${manquantes > 1 ? 's' : ''} sans description : ouvrez-les pour en ajouter une (accessibilité et référencement).`) : null,
    g.length ? h('ul', { class: 'grille-photos' + (organiser ? ' est-organiser' : '') }, g.map((p, i) => tuile(p, i, g, refaire))) : h('p', { class: 'vide', text: 'La galerie est vide. Ajoutez vos premières photos.' })));
  el.append(h('section', { class: 'carte-ui', 'aria-labelledby': 'h-pages' }, h('h2', { id: 'h-pages', text: 'Photos des pages' }), h('p', { class: 'champ__aide', text: 'Les grandes photos du site : la présentation du studio et le haut de chaque onglet de prestations.' }),
    h('ul', { class: 'grille-pages' },
      PAGES.map(([cle, nom]) => emplacement(nom, S.doc.studio.photos[cle], (p) => { S.doc.studio.photos[cle] = p; refaire(); })),
      S.doc.univers.map((u) => emplacement(`Onglet « ${u.court} »`, u.photo, (p) => { u.photo = { ...p, forme: p.h > p.w * 1.1 ? 'v' : 'h' }; refaire(); })))));
  if (S.demande === 'ajouter') { S.demande = null; setTimeout(() => champFichier.click(), 200); }
}

function emplacement(nom, photo, appliquer) {
  return h('li', { class: 'emplacement' },
    photo && urlImage(photo.src) ? h('img', { src: urlImage(photo.src), alt: photo.alt || nom, width: 160, height: 110, loading: 'lazy' }) : h('span', { class: 'emplacement__vide', 'aria-hidden': 'true' }, icone('photos', 28)),
    h('div', { class: 'emplacement__texte' }, h('strong', { text: nom }), h('small', { text: photo && photo.alt ? photo.alt : 'Pas de description' }),
      bouton({ texte: 'Changer la photo', ic: 'photos', classe: 'btn--clair btn--petit', onclick: async () => { const p = await choisirPhoto({ titre: nom, alt: photo ? photo.alt : '' }); if (p) appliquer(p); } })));
}

function tuile(p, i, liste, refaire) {
  const bouger = (d) => { const j = i + d; if (j < 0 || j >= liste.length) return; [liste[i], liste[j]] = [liste[j], liste[i]]; refaire(); };
  return h('li', { class: 'tuile' + (p.visible === false ? ' est-masquee' : '') },
    h('button', { type: 'button', class: 'tuile__img', 'aria-label': `Modifier la photo « ${p.court} »`, on: { click: () => modifierPhoto(p, liste, refaire) } }, h('img', { src: urlImage(p.src), alt: p.alt || '', width: 200, height: 200, loading: 'lazy' }), p.visible === false ? h('span', { class: 'tuile__masque' }, icone('oeil-barre', 22)) : null, !p.alt ? h('span', { class: 'tuile__alerte', title: 'Description manquante' }, icone('alerte', 16)) : null),
    h('div', { class: 'tuile__pied' }, h('span', { class: 'tuile__nom', text: p.court }),
      h('span', { class: 'actions-ligne' },
        bouton({ ic: 'gauche', classe: 'btn--rond btn--discret btn--petit btn--org', aria: `Déplacer ${p.court} vers le début`, disabled: i === 0, onclick: () => bouger(-1) }),
        bouton({ ic: 'droite', classe: 'btn--rond btn--discret btn--petit btn--org', aria: `Déplacer ${p.court} vers la fin`, disabled: i === liste.length - 1, onclick: () => bouger(1) }))));
}

function modifierPhoto(p, liste, refaire) {
  const b = { court: p.court, legende: p.legende, alt: p.alt, ratio: p.ratio, visible: p.visible !== false };
  const court = entree({ value: b.court, maxlength: 40 }), legende = entree({ value: b.legende, maxlength: 200 }), alt = entree({ value: b.alt, maxlength: 220 });
  const ratio = h('select', { 'aria-label': 'Format' }, Object.entries(RATIOS).map(([k, t]) => h('option', { value: k, text: t, selected: k === b.ratio })));
  const visible = interrupteur({ label: 'Afficher cette photo dans la galerie', coche: b.visible, onchange: (v) => { b.visible = v; } });
  const erreur = h('p', { class: 'champ__erreur', role: 'alert', hidden: true });
  let m;
  const ok = () => {
    if (!court.value.trim()) { erreur.textContent = 'Donnez un titre court à la photo.'; erreur.hidden = false; court.focus(); return; }
    Object.assign(p, { court: court.value.trim(), legende: legende.value.trim(), alt: alt.value.trim(), ratio: ratio.value }); if (visible) { if (b.visible) delete p.visible; else p.visible = false; }
    m.fermer(); refaire();
  };
  m = modale({ titre: 'Modifier la photo', large: true,
    contenu: (c) => c.append(h('img', { class: 'photo-modale', src: urlImage(p.src), alt: p.alt || '', width: 300, height: Math.round(300 * p.h / p.w) }),
      h('form', { class: 'formulaire', novalidate: true, on: { submit: (e) => { e.preventDefault(); ok(); } } },
        champ({ label: 'Titre court (écrit sur la photo)' }, court), champ({ label: 'Légende (affichée en grand)' }, legende), champ({ label: 'Description de la photo', aide: 'Pour les personnes malvoyantes et pour Google : décrivez ce que l’on voit.' }, alt), champ({ label: 'Format dans la galerie', aide: 'La photo est recadrée au centre pour s’adapter au format choisi.' }, ratio), visible, erreur, h('button', { type: 'submit', hidden: true }))),
    boutons: [bouton({ texte: 'Supprimer', ic: 'corbeille', classe: 'btn--danger-clair', onclick: async () => { if (!(await confirmer({ titre: 'Retirer cette photo ?', texte: 'Elle ne sera plus dans la galerie. Vous pourrez la retrouver dans une ancienne version (menu Historique).', ok: 'Retirer', danger: true }))) return; liste.splice(liste.indexOf(p), 1); m.fermer(); refaire(); toast('Photo retirée (pensez à publier).'); } }),
      bouton({ texte: 'Annuler', classe: 'btn--discret', onclick: () => m.fermer() }), bouton({ texte: 'Enregistrer', classe: 'btn--or', onclick: ok })] });
}
