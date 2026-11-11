// Couche d'accès à IndexedDB : toute la persistance de l'application passe par ce module.
//
// Base "todo-db" (version 1) :
//   - magasin "projects" : { id, nom, nomNormalise, creeLe }       index unique sur nomNormalise
//   - magasin "tasks"    : { id, titre, description, projectId, priorite, statut, creeLe, modifieLe }
//                          index sur projectId et sur statut
// Une tâche appartient toujours à un projet existant ; supprimer un projet supprime ses tâches
// dans la MÊME transaction (tout ou rien).

export const DB_NOM = 'todo-db';
export const DB_VERSION = 1;
export const PRIORITES = ['basse', 'normale', 'haute'];
export const STATUTS = ['a-faire', 'terminee'];

/** Erreur "métier" : son message est affiché tel quel à l'utilisateur. */
export class ErreurMetier extends Error {
  constructor(message) {
    super(message);
    this.name = 'ErreurMetier';
  }
}

// ---------------------------------------------------------------- ouverture
let connexion = null;

export function ouvrirBase() {
  if (connexion) return connexion;
  connexion = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error("IndexedDB n'est pas disponible dans ce navigateur."));
      return;
    }
    const requete = indexedDB.open(DB_NOM, DB_VERSION);
    requete.onupgradeneeded = () => {
      const db = requete.result;
      const projets = db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
      projets.createIndex('nomNormalise', 'nomNormalise', { unique: true });
      const taches = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
      taches.createIndex('projectId', 'projectId');            // index non unique (par défaut)
      taches.createIndex('statut', 'statut');
    };
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => {
      connexion = null;
      reject(requete.error);
    };
  });
  return connexion;
}

// ---------------------------------------------------------------- utilitaires
function demander(requete) {
  return new Promise((resolve, reject) => {
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error);
  });
}

/**
 * Exécute `travail(...magasins)` dans une transaction ; la promesse se résout quand la
 * transaction est VALIDÉE. Si `travail` échoue, la transaction est annulée (aucune écriture).
 */
async function transaction(noms, mode, travail) {
  const db = await ouvrirBase();
  const tx = db.transaction(noms, mode);
  const terminee = new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error('Transaction annulée'));
  });
  terminee.catch(() => {});                       // évite un rejet non géré si on annule nous-mêmes
  let resultat;
  try {
    resultat = await travail(...noms.map((nom) => tx.objectStore(nom)));
  } catch (erreur) {
    try { tx.abort(); } catch (_) { /* transaction déjà terminée */ }
    throw erreur;
  }
  await terminee;
  return resultat;
}

const normaliser = (texte) => texte.toLocaleLowerCase('fr');          // le texte est déjà nettoyé par l'appelant

function validerTitre(titre) {
  const propre = String(titre ?? '').trim();
  if (propre === '') throw new ErreurMetier('Le titre est obligatoire.');
  if (propre.length > 150) throw new ErreurMetier('Le titre ne doit pas dépasser 150 caractères.');
  return propre;
}

function validerPriorite(priorite) {
  if (!PRIORITES.includes(priorite)) throw new ErreurMetier('Priorité invalide.');
  return priorite;
}

function validerStatut(statut) {
  if (!STATUTS.includes(statut)) throw new ErreurMetier('Statut invalide.');
  return statut;
}

// ---------------------------------------------------------------- projets
export async function ajouterProjet(nom) {
  const propre = String(nom ?? '').trim();
  if (propre === '') throw new ErreurMetier('Le nom du projet est obligatoire.');
  if (propre.length > 80) throw new ErreurMetier('Le nom du projet ne doit pas dépasser 80 caractères.');
  const projet = { nom: propre, nomNormalise: normaliser(propre), creeLe: new Date().toISOString() };
  try {
    const id = await transaction(['projects'], 'readwrite', (projets) => demander(projets.add(projet)));
    return { ...projet, id };
  } catch (erreur) {
    if (erreur.name === 'ConstraintError') {
      throw new ErreurMetier('Un projet avec ce nom existe déjà.');
    }
    throw erreur;
  }
}

export async function listerProjets() {
  const projets = await transaction(['projects'], 'readonly', (magasin) => demander(magasin.getAll()));
  return projets.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export async function supprimerProjet(id) {
  const idProjet = Number(id);
  await transaction(['projects', 'tasks'], 'readwrite', async (projets, taches) => {
    if (!(await demander(projets.get(idProjet)))) throw new ErreurMetier('Projet introuvable.');
    const cles = await demander(taches.index('projectId').getAllKeys(IDBKeyRange.only(idProjet)));
    for (const cle of cles) {
      await demander(taches.delete(cle));
    }
    await demander(projets.delete(idProjet));
  });
}

// ---------------------------------------------------------------- tâches
export async function ajouterTache({ titre, description = '', projectId, priorite = 'normale' }) {
  const titrePropre = validerTitre(titre);
  const prioritePropre = validerPriorite(priorite);
  if (projectId === undefined || projectId === null || projectId === '') {
    throw new ErreurMetier('Le projet est obligatoire.');
  }
  const idProjet = Number(projectId);
  const maintenant = new Date().toISOString();
  const tache = {
    titre: titrePropre,
    description: String(description ?? '').trim(),
    projectId: idProjet,
    priorite: prioritePropre,
    statut: 'a-faire',
    creeLe: maintenant,
    modifieLe: maintenant,
  };
  const id = await transaction(['projects', 'tasks'], 'readwrite', async (projets, taches) => {
    if (!(await demander(projets.get(idProjet)))) throw new ErreurMetier('Projet introuvable.');
    return demander(taches.add(tache));
  });
  return { ...tache, id };
}

export async function modifierTache(id, changements) {
  return transaction(['projects', 'tasks'], 'readwrite', async (projets, taches) => {
    const actuelle = await demander(taches.get(Number(id)));
    if (!actuelle) throw new ErreurMetier('Tâche introuvable.');
    const maj = { ...actuelle };
    if ('titre' in changements) maj.titre = validerTitre(changements.titre);
    if ('description' in changements) maj.description = String(changements.description ?? '').trim();
    if ('priorite' in changements) maj.priorite = validerPriorite(changements.priorite);
    if ('statut' in changements) maj.statut = validerStatut(changements.statut);
    if ('projectId' in changements) {
      const idProjet = Number(changements.projectId);
      if (!(await demander(projets.get(idProjet)))) throw new ErreurMetier('Projet introuvable.');
      maj.projectId = idProjet;
    }
    maj.modifieLe = new Date().toISOString();
    await demander(taches.put(maj));
    return maj;
  });
}

export async function supprimerTache(id) {
  await transaction(['tasks'], 'readwrite', async (taches) => {
    if (!(await demander(taches.get(Number(id))))) throw new ErreurMetier('Tâche introuvable.');
    await demander(taches.delete(Number(id)));
  });
}

export async function listerTaches({ projectId, statut } = {}) {
  const toutes = await transaction(['tasks'], 'readonly', (magasin) => demander(magasin.getAll()));
  return toutes
    .filter((t) => projectId === undefined || t.projectId === Number(projectId))
    .filter((t) => statut === undefined || t.statut === statut)
    .sort((a, b) => a.creeLe.localeCompare(b.creeLe) || a.id - b.id);
}
