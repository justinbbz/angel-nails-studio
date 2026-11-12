// Mon compte : changer le mot de passe, déconnecter les autres appareils.
import { h, icone, bouton, champ, entree, toast, confirmer } from '../ui.js';
import { api } from '../api.js';
import { S } from '../etat.js';
import { protege, deconnecter, nouvelleSession } from '../app.js';

export function rendre(el) {
  const actuel = h('input', { type: 'password', autocomplete: 'current-password' });
  const nouveau = h('input', { type: 'password', autocomplete: 'new-password' });
  const repete = h('input', { type: 'password', autocomplete: 'new-password' });
  const msg = h('p', { class: 'champ__erreur', role: 'alert', hidden: true });
  const regles = h('p', { class: 'champ__aide', text: 'Au moins 10 caractères. Mélangez lettres, chiffres et un signe pour qu’il soit difficile à deviner.' });
  const enregistrer = bouton({ texte: 'Changer mon mot de passe', classe: 'btn--bleu', type: 'submit' });
  const form = h('form', { class: 'carte-ui formulaire', novalidate: true, on: { submit: async (e) => {
    e.preventDefault(); msg.hidden = true;
    const erreur = (t) => { msg.textContent = t; msg.hidden = false; };
    if (!actuel.value) return erreur('Saisissez votre mot de passe actuel.');
    if (nouveau.value.length < 10) return erreur('Le nouveau mot de passe doit contenir au moins 10 caractères.');
    if (nouveau.value !== repete.value) return erreur('Les deux nouveaux mots de passe ne sont pas identiques.');
    enregistrer.disabled = true;
    try {
      const r = await protege(() => api.motdepasse(actuel.value, nouveau.value));
      nouvelleSession(r.jeton, r.expire);
      actuel.value = nouveau.value = repete.value = ''; toast('Mot de passe changé. Les autres appareils ont été déconnectés.');
    } catch (x) { if (!(x.data && x.data.silencieux)) erreur(x.message); } finally { enregistrer.disabled = false; }
  } } },
    h('h2', { text: 'Changer mon mot de passe' }),
    champ({ label: 'Mot de passe actuel' }, actuel), champ({ label: 'Nouveau mot de passe' }, nouveau), regles, champ({ label: 'Répétez le nouveau mot de passe' }, repete), msg, enregistrer);
  el.append(
    h('header', { class: 'page-tete' }, h('h1', { text: 'Mon compte' }), h('p', { class: 'page-tete__sous' }, 'Identifiant : ', h('strong', { text: 'angelnailsstudio' }))),
    form,
    h('section', { class: 'carte-ui' }, h('h2', { text: 'Sécurité' }), h('p', { text: 'Si vous avez ouvert votre espace pro sur un ordinateur qui n’est pas le vôtre, ou si vous pensez que quelqu’un d’autre connaît votre mot de passe, déconnectez tous les appareils (le vôtre aussi) puis changez le mot de passe.' }),
      bouton({ texte: 'Déconnecter tous les appareils', ic: 'sortie', classe: 'btn--danger-clair', onclick: async () => {
        if (!(await confirmer({ titre: 'Déconnecter tous les appareils ?', texte: 'Vous serez déconnectée ici aussi et devrez saisir à nouveau votre mot de passe.', ok: 'Déconnecter partout', danger: true }))) return;
        try { await protege(() => api.deconnexionTotale()); S.doc = null; deconnecter('Tous les appareils ont été déconnectés.'); } catch (x) { if (!(x.data && x.data.silencieux)) toast(x.message, 'erreur'); }
      } })),
    h('section', { class: 'carte-ui' }, h('h2', { text: 'Aide' }),
      h('details', null, h('summary', { text: 'Mes modifications ne sont pas visibles sur le site' }), h('p', { text: 'Vérifiez que vous avez bien cliqué sur « Publier » (le bandeau doré en bas disparaît ensuite). Les visiteuses voient le changement en moins d’une minute ; un rechargement de la page peut être nécessaire.' })),
      h('details', null, h('summary', { text: 'J’ai fait une erreur après avoir publié' }), h('p', { text: 'Ouvrez « Historique » : toutes les versions publiées y sont conservées. Choisissez la bonne et cliquez sur « Revenir à cette version ».' })),
      h('details', null, h('summary', { text: 'J’ai oublié mon mot de passe' }), h('p', { text: 'Contactez la personne qui a réalisé votre site : elle peut remettre un nouveau mot de passe.' }))));
}
