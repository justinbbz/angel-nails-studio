// État de travail de l'espace pro : version publiée (base) et copie de travail (doc), brouillon de secours, résumé des modifications.
import { alea } from './ui.js';
const R = window.ANSRendu;

export const S = { jeton: null, expire: 0, longue: false, base: null, doc: null, rev: 0, updated: 0, origine: false, jour: '' };
const copie = (o) => JSON.parse(JSON.stringify(o));
export { copie };
export const idNeuf = (pref) => `${pref}-${alea()}`;

const abonnes = new Set();
export const surChangement = (fn) => { abonnes.add(fn); return () => abonnes.delete(fn); };
export const notifier = () => abonnes.forEach((f) => f());
export const modifie = () => !!S.doc && JSON.stringify(S.doc) !== JSON.stringify(S.base);

export function charger(donnees) {
  S.doc = copie(donnees.doc); S.base = copie(donnees.doc); S.rev = donnees.rev; S.updated = donnees.updated; S.origine = !!donnees.origine; S.jour = donnees.jour || R.parisJour();
  notifier();
}
/* parcours pratiques */
export const universV = () => S.doc.univers;
export function* services(doc = S.doc) { for (const u of doc.univers) for (const c of u.categories) for (const s of c.services) yield { u, c, s }; }
export const chercher = (id, doc = S.doc) => { for (const x of services(doc)) if (x.s.id === id) return x; return null; };
export const nbServices = (doc = S.doc) => { let n = 0; for (const _ of services(doc)) n++; return n; };

/* brouillon de secours (si l'onglet se ferme ou si la session expire pendant la saisie) */
const CLE = 'ans-brouillon';
export function sauverBrouillon() {
  try { if (modifie()) localStorage.setItem(CLE, JSON.stringify({ doc: S.doc, baseRev: S.rev, t: Date.now() })); else localStorage.removeItem(CLE); } catch {}
}
export function lireBrouillon() { try { const b = JSON.parse(localStorage.getItem(CLE) || 'null'); return b && b.doc && b.baseRev === S.rev && JSON.stringify(b.doc) !== JSON.stringify(S.base) ? b : null; } catch { return null; } }
export function effacerBrouillon() { try { localStorage.removeItem(CLE); } catch {} }

/* résumé des modifications, en français (affiché avant de publier et gardé dans l'historique) */
export function resumeModifs(base, doc) {
  const A = new Map(), B = new Map();
  for (const x of services(base)) A.set(x.s.id, x); for (const x of services(doc)) B.set(x.s.id, x);
  let prix = 0, ajoutees = 0, supprimees = 0, masquees = 0, affichees = 0, modifiees = 0;
  for (const [id, y] of B) {
    const x = A.get(id);
    if (!x) { ajoutees++; continue; }
    if (x.s.prix !== y.s.prix) prix++;
    if ((x.s.visible === false) !== (y.s.visible === false)) (y.s.visible === false ? masquees++ : affichees++);
    const sans = (s) => JSON.stringify({ ...s, prix: 0, visible: true });
    if (sans(x.s) !== sans(y.s) || x.c.id !== y.c.id) modifiees++;
  }
  for (const id of A.keys()) if (!B.has(id)) supprimees++;
  const phrases = [];
  const n = (k, un, plusieurs) => { if (k) phrases.push(`${k} ${k > 1 ? plusieurs : un}`); };
  n(prix, 'prix modifié', 'prix modifiés'); n(ajoutees, 'prestation ajoutée', 'prestations ajoutées'); n(supprimees, 'prestation supprimée', 'prestations supprimées');
  n(masquees, 'prestation masquée', 'prestations masquées'); n(affichees, 'prestation réaffichée', 'prestations réaffichées'); n(modifiees, 'prestation modifiée', 'prestations modifiées');
  const cats = (d) => new Map(d.univers.flatMap((u) => u.categories.map((c) => [c.id, c.titre + '|' + (c.visible === false) + '|' + c.note + '|' + u.id])));
  const ca = cats(base), cb = cats(doc);
  n([...cb.keys()].filter((k) => !ca.has(k)).length, 'catégorie ajoutée', 'catégories ajoutées'); n([...ca.keys()].filter((k) => !cb.has(k)).length, 'catégorie supprimée', 'catégories supprimées');
  n([...cb].filter(([k, v]) => ca.has(k) && ca.get(k) !== v).length, 'catégorie modifiée', 'catégories modifiées');
  const ids = (l) => new Map((l || []).map((p) => [p.id, JSON.stringify(p)]));
  const pa = ids(base.promotions), pb = ids(doc.promotions);
  n([...pb.keys()].filter((k) => !pa.has(k)).length, 'promotion créée', 'promotions créées'); n([...pa.keys()].filter((k) => !pb.has(k)).length, 'promotion supprimée', 'promotions supprimées');
  n([...pb].filter(([k, v]) => pa.has(k) && pa.get(k) !== v).length, 'promotion modifiée', 'promotions modifiées');
  const ga = ids(base.galerie), gb = ids(doc.galerie);
  n([...gb.keys()].filter((k) => !ga.has(k)).length, 'photo ajoutée à la galerie', 'photos ajoutées à la galerie'); n([...ga.keys()].filter((k) => !gb.has(k)).length, 'photo retirée de la galerie', 'photos retirées de la galerie');
  n([...gb].filter(([k, v]) => ga.has(k) && ga.get(k) !== v).length, 'photo de la galerie modifiée', 'photos de la galerie modifiées');
  if (JSON.stringify(galOrdre(base)) !== JSON.stringify(galOrdre(doc)) && gb.size === ga.size && [...gb.keys()].every((k) => ga.has(k))) phrases.push('galerie réordonnée');
  const photosFixes = (d) => JSON.stringify([d.studio, d.univers.map((u) => u.photo)]);
  if (photosFixes(base) !== photosFixes(doc)) phrases.push('photos des pages modifiées');
  if (JSON.stringify(base.horaires) !== JSON.stringify(doc.horaires)) phrases.push('horaires modifiés');
  if (JSON.stringify(base.fermetures) !== JSON.stringify(doc.fermetures) || JSON.stringify(base.conges) !== JSON.stringify(doc.conges)) phrases.push('fermetures modifiées');
  if (JSON.stringify(base.annonce) !== JSON.stringify(doc.annonce)) phrases.push('annonce modifiée');
  if (JSON.stringify(base.contact) !== JSON.stringify(doc.contact)) phrases.push('coordonnées modifiées');
  const textes = (d) => JSON.stringify([d.univers.map((u) => [u.court, u.titre, u.intro, u.visible]), d.envies, d.asavoir]);
  if (textes(base) !== textes(doc)) phrases.push('textes modifiés');
  const res = phrases.join(', ');
  return res ? res.charAt(0).toUpperCase() + res.slice(1) : '';
}
const galOrdre = (d) => (d.galerie || []).map((g) => g.id);
