import {
  ErreurMetier, DB_NOM, DB_VERSION, ouvrirBase,
  ajouterProjet, listerProjets, supprimerProjet,
  ajouterTache, modifierTache, supprimerTache, listerTaches,
} from './db.js';
import { pluriel, couleur, resumer } from './statistiques.js';

const $ = (selecteur) => document.querySelector(selecteur);

const statutDb = $('#statut-db');
const formProjet = $('#form-projet');
const nomProjet = $('#nom-projet');
const erreurProjet = $('#erreur-projet');
const listeProjets = $('#liste-projets');
const videProjets = $('#vide-projets');
const toutVoir = $('#tout-voir');
const totalGlobal = $('#total-global');

const carteFormulaire = $('#carte-formulaire');
const titreFormulaire = $('#titre-formulaire');
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
const videTaches = $('#vide-taches');
const toast = $('#toast');

let enEdition = null;                       // tâche en cours de modification (ou null)
let minuteurToast = null;

const ICONE_CRAYON = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';
const ICONE_CORBEILLE = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';

function element(balise, { texte, classe, testid, attrs } = {}) {
  const el = document.createElement(balise);
  if (texte !== undefined) el.textContent = texte;
  if (classe) el.className = classe;
  if (testid) el.dataset.testid = testid;
  for (const [cle, valeur] of Object.entries(attrs || {})) el.setAttribute(cle, valeur);
  return el;
}

function boutonIcone(icone, libelle, classe, auClic) {
  const bouton = element('button', { classe: `bouton-icone ${classe}`.trim(), attrs: { type: 'button', 'aria-label': libelle, title: libelle } });
  bouton.innerHTML = icone;                                  // icônes SVG statiques, aucune donnée utilisateur
  bouton.addEventListener('click', auClic);
  return bouton;
}

function notifier(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => { toast.hidden = true; }, 3000);
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

  // --- tableau de bord
  const resume = resumer(toutes);
  $('#stat-total').textContent = String(resume.total);
  $('#stat-afaire').textContent = String(resume.aFaire);
  $('#stat-terminees').textContent = String(resume.terminees);
  $('#progression-remplie').style.width = `${resume.pourcentage}%`;
  $('#progression').setAttribute('aria-valuenow', String(resume.pourcentage));

  // --- barre latérale : projets
  totalGlobal.textContent = String(toutes.length);
  toutVoir.classList.toggle('actif', filtreProjet.value === '');
  videProjets.hidden = projets.length > 0;
  listeProjets.replaceChildren(...projets.map((p) => carteProjet(p, toutes)));

  // --- liste des tâches (avec filtres)
  const filtrees = await listerTaches({
    projectId: filtreProjet.value || undefined,
    statut: filtreStatut.value || undefined,
  });
  const nomDuProjet = new Map(projets.map((p) => [p.id, p.nom]));
  compteur.textContent = pluriel(filtrees.length);
  listeTaches.replaceChildren(...filtrees.map((t) => carteTache(t, nomDuProjet)));
  videTaches.hidden = filtrees.length > 0;
  videTaches.textContent = toutes.length === 0
    ? 'Aucune tâche pour l’instant. Ajoutez votre première tâche ci-dessus.'
    : 'Aucune tâche ne correspond aux filtres choisis.';
}

function carteProjet(p, toutes) {
  const nb = toutes.filter((t) => t.projectId === p.id).length;
  const actif = String(p.id) === filtreProjet.value;
  const li = element('li', { classe: `projet${actif ? ' actif' : ''}`, testid: 'projet', attrs: { 'data-id': String(p.id) } });
  li.style.setProperty('--c', couleur(p.id));

  const choisir = element('button', { classe: 'projet-choisir', attrs: { type: 'button', 'aria-pressed': String(actif) } });
  choisir.append(
    element('span', { classe: 'point' }),
    element('span', { texte: p.nom, classe: 'projet-nom', testid: 'projet-nom' }),
    element('span', { texte: pluriel(nb), classe: 'projet-nb', testid: 'projet-compteur' }),
  );
  // Un clic sur un projet filtre la liste sur ses tâches ; un second clic enlève le filtre.
  choisir.addEventListener('click', () => {
    filtreProjet.value = actif ? '' : String(p.id);
    rafraichir();
  });

  li.append(
    choisir,
    boutonIcone(ICONE_CORBEILLE, `Supprimer le projet ${p.nom}`, 'danger',
      () => actionProjet(() => supprimerProjet(p.id), `Projet « ${p.nom} » supprimé`)),
  );
  return li;
}

function carteTache(t, nomDuProjet) {
  const li = element('li', { classe: 'tache', testid: 'tache', attrs: { 'data-id': String(t.id), 'data-statut': t.statut } });
  li.style.setProperty('--c', couleur(t.projectId));

  const case_ = element('input', { classe: 'case', attrs: { type: 'checkbox', 'aria-label': `Terminer ${t.titre}` } });
  case_.checked = t.statut === 'terminee';
  case_.addEventListener('change', () =>
    actionTache(() => modifierTache(t.id, { statut: case_.checked ? 'terminee' : 'a-faire' })));

  const corps = element('div', { classe: 'tache-corps' });
  const meta = element('div', { classe: 'tache-meta' });
  meta.append(
    element('span', { texte: nomDuProjet.get(t.projectId) ?? '?', classe: 'badge badge-projet', testid: 'tache-projet' }),
    element('span', { texte: t.priorite, classe: `badge priorite ${t.priorite}`, testid: 'tache-priorite' }),
  );
  corps.append(element('span', { texte: t.titre, classe: 'titre', testid: 'tache-titre' }), meta);
  if (t.description) {
    corps.append(element('p', { texte: t.description, classe: 'description', testid: 'tache-description' }));
  }

  const actions = element('div', { classe: 'tache-actions' });
  actions.append(
    boutonIcone(ICONE_CRAYON, `Modifier ${t.titre}`, '', () => demarrerEdition(t)),
    boutonIcone(ICONE_CORBEILLE, `Supprimer ${t.titre}`, 'danger',
      () => actionTache(() => supprimerTache(t.id), 'Tâche supprimée')),
  );

  li.append(case_, corps, actions);
  return li;
}

// ---------------------------------------------------------------- actions
async function actionProjet(travail, message) {
  erreurProjet.textContent = '';
  try {
    await travail();
    if (enEdition && !(await listerProjets()).some((p) => p.id === enEdition.projectId)) quitterEdition();
    await rafraichir();
    if (message) notifier(message);
  } catch (erreur) {
    afficherErreur(erreurProjet, erreur);
  }
}

async function actionTache(travail, message) {
  erreurTache.textContent = '';
  try {
    await travail();
    await rafraichir();
    if (message) notifier(message);
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
  titreFormulaire.textContent = 'Modifier la tâche';
  boutonTache.textContent = 'Enregistrer la tâche';
  annulerEdition.hidden = false;
  carteFormulaire.classList.add('en-edition');
  carteFormulaire.scrollIntoView({ block: 'nearest' });
  titreTache.focus();
}

function quitterEdition() {
  enEdition = null;
  formTache.reset();
  projetTache.value = '';
  titreFormulaire.textContent = 'Nouvelle tâche';
  boutonTache.textContent = 'Ajouter la tâche';
  annulerEdition.hidden = true;
  carteFormulaire.classList.remove('en-edition');
}

formProjet.addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  erreurProjet.textContent = '';
  occuper(formProjet, true);
  try {
    const projet = await ajouterProjet(nomProjet.value);
    nomProjet.value = '';
    await rafraichir();
    notifier(`Projet « ${projet.nom} » enregistré`);
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
    const modification = Boolean(enEdition);
    if (modification) {
      await modifierTache(enEdition.id, champs);
    } else {
      await ajouterTache(champs);
    }
    quitterEdition();
    await rafraichir();
    notifier(modification ? 'Tâche modifiée' : 'Tâche ajoutée');
  } catch (erreur) {
    afficherErreur(erreurTache, erreur);
  } finally {
    occuper(formTache, false);
  }
});

annulerEdition.addEventListener('click', quitterEdition);
filtreProjet.addEventListener('change', rafraichir);
filtreStatut.addEventListener('change', rafraichir);
toutVoir.addEventListener('click', () => { filtreProjet.value = ''; rafraichir(); });

// ---------------------------------------------------------------- démarrage
(async () => {
  try {
    await ouvrirBase();
    await rafraichir();
    statutDb.dataset.etat = 'prete';
    statutDb.textContent = `Base locale prête : ${DB_NOM} (version ${DB_VERSION})`;
  } catch (erreur) {
    statutDb.dataset.etat = 'erreur';
    statutDb.textContent = `Base locale indisponible : ${erreur.message}`;
  }
})();
