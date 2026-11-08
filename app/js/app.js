import {
  ErreurMetier, DB_NOM, DB_VERSION, ouvrirBase,
  ajouterProjet, listerProjets, supprimerProjet,
  ajouterTache, modifierTache, supprimerTache, listerTaches,
} from './db.js';

const $ = (selecteur) => document.querySelector(selecteur);

const formProjet = $('#form-projet');
const nomProjet = $('#nom-projet');
const erreurProjet = $('#erreur-projet');
const listeProjets = $('#liste-projets');

const formTache = $('#form-tache');
const titreTache = $('#titre-tache');
const descriptionTache = $('#description-tache');
const projetTache = $('#projet-tache');
const prioriteTache = $('#priorite-tache');
const boutonTache = $('#bouton-tache');
const annulerEdition = $('#annuler-edition');
const erreurTache = $('#erreur-tache');
const filtreProjet = $('#filtre-projet');
const filtreStatut = $('#filtre-statut');
const compteur = $('#compteur');
const listeTaches = $('#liste-taches');

let enEdition = null;                       // tâche en cours de modification (ou null)

const pluriel = (n) => `${n} tâche${n > 1 ? 's' : ''}`;

function element(balise, { texte, classe, testid, attrs } = {}) {
  const el = document.createElement(balise);
  if (texte !== undefined) el.textContent = texte;
  if (classe) el.className = classe;
  if (testid) el.dataset.testid = testid;
  for (const [cle, valeur] of Object.entries(attrs || {})) el.setAttribute(cle, valeur);
  return el;
}

// Pendant l'écriture dans IndexedDB (asynchrone), le formulaire est bloqué : pas de double envoi,
// et pas de saisie perdue si l'utilisateur (ou un test) enchaîne trop vite.
function occuper(formulaire, actif) {
  for (const champ of formulaire.querySelectorAll('input, select, textarea, button')) champ.disabled = actif;
}

function afficherErreur(zone, erreur) {
  zone.textContent = erreur instanceof ErreurMetier ? erreur.message : `Erreur inattendue : ${erreur.message}`;
}

// ---------------------------------------------------------------- affichage
function remplirListeProjets(select, projets, premiereOption, valeur) {
  select.replaceChildren(new Option(premiereOption, ''));
  for (const p of projets) select.append(new Option(p.nom, String(p.id)));
  select.value = projets.some((p) => String(p.id) === valeur) ? valeur : '';
}

async function rafraichir() {
  const projets = await listerProjets();
  const toutes = await listerTaches();

  remplirListeProjets(projetTache, projets, '— Choisir un projet —', projetTache.value);
  remplirListeProjets(filtreProjet, projets, 'Tous les projets', filtreProjet.value);

  listeProjets.replaceChildren(...projets.map((p) => {
    const nb = toutes.filter((t) => t.projectId === p.id).length;
    const li = element('li', { testid: 'projet', attrs: { 'data-id': String(p.id) } });
    const supprimer = element('button', {
      texte: 'Supprimer', classe: 'danger', attrs: { type: 'button', 'aria-label': `Supprimer le projet ${p.nom}` },
    });
    supprimer.addEventListener('click', () => actionProjet(() => supprimerProjet(p.id)));
    li.append(
      element('span', { texte: p.nom, classe: 'titre', testid: 'projet-nom' }),
      element('span', { texte: pluriel(nb), classe: 'badge', testid: 'projet-compteur' }),
      element('span', { classe: 'espace' }),
      supprimer,
    );
    return li;
  }));

  const filtrees = await listerTaches({
    projectId: filtreProjet.value || undefined,
    statut: filtreStatut.value || undefined,
  });
  const nomDuProjet = new Map(projets.map((p) => [p.id, p.nom]));
  compteur.textContent = pluriel(filtrees.length);
  listeTaches.replaceChildren(...filtrees.map((t) => carteTache(t, nomDuProjet)));
}

function carteTache(t, nomDuProjet) {
  const li = element('li', { testid: 'tache', attrs: { 'data-id': String(t.id), 'data-statut': t.statut } });

  const case_ = element('input', { attrs: { type: 'checkbox', 'aria-label': `Terminer ${t.titre}` } });
  case_.checked = t.statut === 'terminee';
  case_.addEventListener('change', () =>
    actionTache(() => modifierTache(t.id, { statut: case_.checked ? 'terminee' : 'a-faire' })));

  const modifier = element('button', {
    texte: 'Modifier', classe: 'secondaire', attrs: { type: 'button', 'aria-label': `Modifier ${t.titre}` },
  });
  modifier.addEventListener('click', () => demarrerEdition(t));

  const supprimer = element('button', {
    texte: 'Supprimer', classe: 'danger', attrs: { type: 'button', 'aria-label': `Supprimer ${t.titre}` },
  });
  supprimer.addEventListener('click', () => actionTache(() => supprimerTache(t.id)));

  li.append(
    case_,
    element('span', { texte: t.titre, classe: 'titre', testid: 'tache-titre' }),
    element('span', { texte: nomDuProjet.get(t.projectId) ?? '?', classe: 'badge', testid: 'tache-projet' }),
    element('span', { texte: t.priorite, classe: `badge ${t.priorite}`, testid: 'tache-priorite' }),
    element('span', { classe: 'espace' }),
    modifier,
    supprimer,
  );
  if (t.description) {
    li.append(element('p', { texte: t.description, classe: 'description', testid: 'tache-description' }));
  }
  return li;
}

// ---------------------------------------------------------------- actions
async function actionProjet(travail) {
  erreurProjet.textContent = '';
  try {
    await travail();
    if (enEdition && !(await listerProjets()).some((p) => p.id === enEdition.projectId)) quitterEdition();
    await rafraichir();
  } catch (erreur) {
    afficherErreur(erreurProjet, erreur);
  }
}

async function actionTache(travail) {
  erreurTache.textContent = '';
  try {
    await travail();
    await rafraichir();
  } catch (erreur) {
    afficherErreur(erreurTache, erreur);
  }
}

function demarrerEdition(t) {
  enEdition = t;
  erreurTache.textContent = '';
  titreTache.value = t.titre;
  descriptionTache.value = t.description;
  projetTache.value = String(t.projectId);
  prioriteTache.value = t.priorite;
  boutonTache.textContent = 'Enregistrer la tâche';
  annulerEdition.hidden = false;
  titreTache.focus();
}

function quitterEdition() {
  enEdition = null;
  formTache.reset();
  projetTache.value = '';
  boutonTache.textContent = 'Ajouter la tâche';
  annulerEdition.hidden = true;
}

formProjet.addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  erreurProjet.textContent = '';
  occuper(formProjet, true);
  try {
    await ajouterProjet(nomProjet.value);
    nomProjet.value = '';
    await rafraichir();
  } catch (erreur) {
    afficherErreur(erreurProjet, erreur);
  } finally {
    occuper(formProjet, false);
  }
});

formTache.addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  erreurTache.textContent = '';
  const champs = {
    titre: titreTache.value,
    description: descriptionTache.value,
    projectId: projetTache.value,
    priorite: prioriteTache.value,
  };
  occuper(formTache, true);
  try {
    if (enEdition) {
      await modifierTache(enEdition.id, champs);
    } else {
      await ajouterTache(champs);
    }
    quitterEdition();
    await rafraichir();
  } catch (erreur) {
    afficherErreur(erreurTache, erreur);
  } finally {
    occuper(formTache, false);
  }
});

annulerEdition.addEventListener('click', quitterEdition);
filtreProjet.addEventListener('change', rafraichir);
filtreStatut.addEventListener('change', rafraichir);

// ---------------------------------------------------------------- démarrage
(async () => {
  try {
    await ouvrirBase();
    await rafraichir();
    $('#statut-db').textContent = `Base locale prête : ${DB_NOM} (version ${DB_VERSION})`;
  } catch (erreur) {
    $('#statut-db').textContent = `Base locale indisponible : ${erreur.message}`;
  }
})();
