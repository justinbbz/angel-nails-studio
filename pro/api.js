// Appels au service de l'espace pro. Le jeton de session est ajouté à chaque appel ; les erreurs deviennent des ApiErreur avec un message prêt à afficher.
const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const surcharge = local ? new URLSearchParams(location.search).get('api') : null;      // essais en local uniquement : jamais depuis le site public (sinon un lien piégé enverrait le mot de passe ailleurs)
export const BASE = String(surcharge || window.ANS_API || '').replace(/\/+$/, '');
export const configure = () => !!BASE;

export class ApiErreur extends Error { constructor(statut, message, data = {}) { super(message); this.statut = statut; this.data = data; } }
let jeton = null;
export const fixerJeton = (j) => { jeton = j; };

async function appel(chemin, { methode = 'GET', corps, brut, type, signal } = {}) {
  const h = {};
  if (jeton) h.Authorization = 'Bearer ' + jeton;
  let body;
  if (brut !== undefined) { body = brut; h['Content-Type'] = type; } else if (corps !== undefined) { body = JSON.stringify(corps); h['Content-Type'] = 'application/json'; }
  let rep;
  try { rep = await fetch(BASE + chemin, { method: methode, headers: h, body, signal, cache: 'no-store', credentials: 'omit' }); }
  catch { throw new ApiErreur(0, 'Impossible de joindre le service. Vérifiez votre connexion Internet, puis réessayez.'); }
  let data = null; try { data = await rep.json(); } catch {}
  if (!rep.ok) throw new ApiErreur(rep.status, (data && data.erreur) || 'Une erreur est survenue. Réessayez dans un instant.', data || {});
  return data;
}

export const api = {
  connexion: (identifiant, motdepasse, longue) => appel('/api/login', { methode: 'POST', corps: { identifiant, motdepasse, duree: longue ? 'longue' : 'courte' } }),
  site: () => appel('/api/admin/site'),
  publier: (doc, baseRev, resume) => appel('/api/admin/site', { methode: 'PUT', corps: { doc, baseRev, resume } }),
  image: (blob) => appel('/api/admin/image', { methode: 'POST', brut: blob, type: blob.type || 'image/jpeg' }),
  historique: () => appel('/api/admin/history'),
  restaurer: (id, baseRev) => appel('/api/admin/restore', { methode: 'POST', corps: { id, baseRev } }),
  motdepasse: (actuel, nouveau) => appel('/api/admin/password', { methode: 'POST', corps: { actuel, nouveau } }),
  deconnexionTotale: () => appel('/api/admin/logout-all', { methode: 'POST', corps: {} }),
};
/* adresse d'une photo du site (fichier du site ou photo envoyée) */
export const urlImage = (src) => (/^img:[a-f0-9]{16}$/.test(src) ? `${BASE}/img/${src.slice(4)}` : /^assets\/img\//.test(src) ? '../' + src : '');
