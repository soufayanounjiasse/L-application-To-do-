// Tests unitaires de la couche IndexedDB (app/js/db.js), exécutés dans Node avec fake-indexeddb.
// Chaque test repart d'une base vierge : nouvelle "usine" IndexedDB et module rechargé.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { genererPairwise, notationJenny } from './outils/pairwise.js';

let db;

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  globalThis.IDBKeyRange = IDBKeyRange;
  vi.resetModules();
  db = await import('../app/js/db.js');
});

afterEach(() => {
  vi.useRealTimers();
});

const refus = (message) => ({ name: 'ErreurMetier', message });

// ------------------------------------------------------------------ ouverture et structure
describe('ouverture de la base', () => {
  test('constantes publiques', () => {
    expect(db.DB_NOM).toBe('todo-db');
    expect(db.DB_VERSION).toBe(1);
    expect(db.PRIORITES).toEqual(['basse', 'normale', 'haute']);
    expect(db.STATUTS).toEqual(['a-faire', 'terminee']);
  });

  test('crée les magasins, les clés et les index', async () => {
    const base = await db.ouvrirBase();
    expect(base.name).toBe('todo-db');
    expect(base.version).toBe(1);
    expect([...base.objectStoreNames].sort()).toEqual(['projects', 'tasks']);

    const tx = base.transaction(['projects', 'tasks'], 'readonly');
    const projets = tx.objectStore('projects');
    const taches = tx.objectStore('tasks');
    expect(projets.keyPath).toBe('id');
    expect(projets.autoIncrement).toBe(true);
    expect(taches.keyPath).toBe('id');
    expect(taches.autoIncrement).toBe(true);
    expect(projets.index('nomNormalise').unique).toBe(true);
    expect(projets.index('nomNormalise').keyPath).toBe('nomNormalise');
    expect(taches.index('projectId').unique).toBe(false);
    expect(taches.index('projectId').keyPath).toBe('projectId');
    expect(taches.index('statut').unique).toBe(false);
    expect(taches.index('statut').keyPath).toBe('statut');
    expect([...taches.indexNames].sort()).toEqual(['projectId', 'statut']);
  });

  test('réutilise la même connexion', async () => {
    expect(db.ouvrirBase()).toBe(db.ouvrirBase());
  });

  test('erreur claire si IndexedDB est absent', async () => {
    globalThis.indexedDB = undefined;
    vi.resetModules();
    const sansIndexedDb = await import('../app/js/db.js');
    await expect(sansIndexedDb.ouvrirBase()).rejects.toThrow("IndexedDB n'est pas disponible dans ce navigateur.");
  });

  test('après un échec d’ouverture, la connexion en cache est abandonnée', async () => {
    await new Promise((resolve) => {                     // une base déjà en version 5 : l'ouverture en version 1 échoue
      const ouverture = indexedDB.open('todo-db', 5);
      ouverture.onsuccess = () => { ouverture.result.close(); resolve(); };
    });
    const premiere = db.ouvrirBase();
    await expect(premiere).rejects.toBeTruthy();
    const seconde = db.ouvrirBase();
    expect(seconde).not.toBe(premiere);
    await expect(seconde).rejects.toBeTruthy();
  });

  test('ErreurMetier est une Error nommée', () => {
    const erreur = new db.ErreurMetier('oups');
    expect(erreur).toBeInstanceOf(Error);
    expect(erreur.name).toBe('ErreurMetier');
    expect(erreur.message).toBe('oups');
  });
});

// ------------------------------------------------------------------ projets
describe('projets', () => {
  test('ajouterProjet enregistre un projet normalisé', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-04T05:06:07.000Z'));
    const projet = await db.ajouterProjet('  Été 2026  ');
    expect(projet).toEqual({
      id: 1, nom: 'Été 2026', nomNormalise: 'été 2026', creeLe: '2026-03-04T05:06:07.000Z',
    });
    expect(await db.listerProjets()).toEqual([projet]);
  });

  test('les identifiants sont auto-incrémentés', async () => {
    const a = await db.ajouterProjet('A');
    const b = await db.ajouterProjet('B');
    expect([a.id, b.id]).toEqual([1, 2]);
  });

  test('les autres erreurs ne sont pas transformées en « doublon »', async () => {
    globalThis.indexedDB = undefined;
    vi.resetModules();
    const sansIndexedDb = await import('../app/js/db.js');
    const erreur = await sansIndexedDb.ajouterProjet('A').catch((e) => e);
    expect(erreur.message).toBe("IndexedDB n'est pas disponible dans ce navigateur.");
    expect(erreur.name).not.toBe('ErreurMetier');
  });

  test.each([[''], ['   '], [undefined], [null]])('refuse le nom %j', async (nom) => {
    await expect(db.ajouterProjet(nom)).rejects.toMatchObject(refus('Le nom du projet est obligatoire.'));
    expect(await db.listerProjets()).toEqual([]);
  });

  test('accepte 80 caractères, refuse 81', async () => {
    await expect(db.ajouterProjet('p'.repeat(80))).resolves.toMatchObject({ id: 1 });
    await expect(db.ajouterProjet('q'.repeat(81))).rejects.toMatchObject(
      refus('Le nom du projet ne doit pas dépasser 80 caractères.')
    );
    expect(await db.listerProjets()).toHaveLength(1);
  });

  test.each([['mémoire'], ['MÉMOIRE'], ['  Mémoire  ']])('refuse le doublon « %s »', async (doublon) => {
    await db.ajouterProjet('Mémoire');
    await expect(db.ajouterProjet(doublon)).rejects.toMatchObject(refus('Un projet avec ce nom existe déjà.'));
    expect(await db.listerProjets()).toHaveLength(1);
  });

  test('listerProjets trie par nom en tenant compte du français', async () => {
    for (const nom of ['Zèbre', 'Éléphant', 'abeille']) await db.ajouterProjet(nom);
    expect((await db.listerProjets()).map((p) => p.nom)).toEqual(['abeille', 'Éléphant', 'Zèbre']);
  });

  test('supprimerProjet efface le projet et seulement ses tâches', async () => {
    const mem = await db.ajouterProjet('Mémoire');
    const loi = await db.ajouterProjet('Loisirs');
    await db.ajouterTache({ titre: 'A', projectId: mem.id });
    await db.ajouterTache({ titre: 'B', projectId: mem.id });
    await db.ajouterTache({ titre: 'C', projectId: loi.id });

    await db.supprimerProjet(mem.id);

    expect((await db.listerProjets()).map((p) => p.nom)).toEqual(['Loisirs']);
    expect((await db.listerTaches()).map((t) => t.titre)).toEqual(['C']);
  });

  test('supprimerProjet accepte un identifiant sous forme de texte', async () => {
    await db.ajouterProjet('A');
    await db.supprimerProjet('1');
    expect(await db.listerProjets()).toEqual([]);
  });

  test('supprimerProjet refuse un projet inconnu', async () => {
    await expect(db.supprimerProjet(42)).rejects.toMatchObject(refus('Projet introuvable.'));
  });
});

// ------------------------------------------------------------------ création de tâche : pairwise
// Quatre paramètres, valeurs partagées en catégories ; les combinaisons viennent du générateur pairwise.
const TITRES = [['valide', '  Rédiger le plan  '], ['vide', ''], ['espaces', '   '], ['limite', 'x'.repeat(150)], ['trop long', 'x'.repeat(151)]];
const DESCRIPTIONS = [['absente', undefined], ['texte', '  Trois parties  '], ['espaces', '   ']];
const PROJETS = [['existant', 'EXISTANT'], ['non fourni', undefined], ['inexistant', 999]];
const PRIORITES = [['basse', 'basse'], ['haute', 'haute'], ['invalide', 'urgente'], ['absente', undefined]];
const DIMENSIONS = [TITRES, DESCRIPTIONS, PROJETS, PRIORITES];

/** L'oracle : la spécification écrite indépendamment du code, dans l'ordre des contrôles. */
function attendu(titre, description, projet, priorite) {
  const t = titre.trim();
  if (t === '') return { erreur: 'Le titre est obligatoire.' };
  if (t.length > 150) return { erreur: 'Le titre ne doit pas dépasser 150 caractères.' };
  if (priorite !== undefined && !['basse', 'normale', 'haute'].includes(priorite)) return { erreur: 'Priorité invalide.' };
  if (projet === undefined) return { erreur: 'Le projet est obligatoire.' };
  if (projet === 999) return { erreur: 'Projet introuvable.' };
  return {
    tache: {
      id: 1, titre: t, description: (description ?? '').trim(), projectId: 1,
      priorite: priorite ?? 'normale', statut: 'a-faire',
    },
  };
}

describe('ajouterTache : combinaisons pairwise', () => {
  const cas = genererPairwise(DIMENSIONS.map((d) => d.length)).map((c) => [notationJenny(c), c]);

  test('le pairwise réduit bien les 180 combinaisons', () => {
    expect(cas.length).toBeLessThan(40);
  });

  test.each(cas)('combinaison %s', async (_, combinaison) => {
    const [titre, description, projet, priorite] = combinaison.map((v, i) => DIMENSIONS[i][v][1]);
    await db.ajouterProjet('Mémoire');                                // id 1
    const projectId = projet === 'EXISTANT' ? 1 : projet;
    const attendue = attendu(titre, description, projet, priorite);

    const resultat = db.ajouterTache({ titre, description, projectId, priorite });

    if (attendue.erreur) {
      await expect(resultat).rejects.toMatchObject(refus(attendue.erreur));
      expect(await db.listerTaches()).toEqual([]);                    // rien n'est écrit
    } else {
      const tache = await resultat;
      expect(tache).toMatchObject(attendue.tache);
      expect(tache.creeLe).toBe(tache.modifieLe);
      const stockees = await db.listerTaches();
      expect(stockees).toEqual([tache]);
    }
  });

  test.each([[null], ['']])('refuse un projet « %j »', async (projectId) => {
    await expect(db.ajouterTache({ titre: 'A', projectId })).rejects.toMatchObject(refus('Le projet est obligatoire.'));
  });
});

// ------------------------------------------------------------------ modification, suppression, lecture
describe('tâches', () => {
  let projet;
  let autre;

  beforeEach(async () => {
    projet = await db.ajouterProjet('Mémoire');
    autre = await db.ajouterProjet('Loisirs');
  });

  test('modifierTache change chaque champ et met à jour la date de modification', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
    const tache = await db.ajouterTache({ titre: 'Plan', description: 'v1', projectId: projet.id });

    vi.setSystemTime(new Date('2026-01-02T11:00:00.000Z'));
    const maj = await db.modifierTache(tache.id, {
      titre: '  Plan détaillé ', description: ' v2 ', priorite: 'haute', statut: 'terminee', projectId: String(autre.id),
    });

    expect(maj).toEqual({
      id: tache.id, titre: 'Plan détaillé', description: 'v2', projectId: autre.id, priorite: 'haute',
      statut: 'terminee', creeLe: '2026-01-01T10:00:00.000Z', modifieLe: '2026-01-02T11:00:00.000Z',
    });
    expect(await db.listerTaches()).toEqual([maj]);
  });

  test('modifierTache ne touche pas aux champs absents', async () => {
    const tache = await db.ajouterTache({ titre: 'Plan', description: 'v1', projectId: projet.id, priorite: 'basse' });
    const maj = await db.modifierTache(tache.id, { titre: 'Autre' });
    expect(maj).toMatchObject({ titre: 'Autre', description: 'v1', projectId: projet.id, priorite: 'basse', statut: 'a-faire' });
  });

  test.each([
    ['titre vide', { titre: '' }, 'Le titre est obligatoire.'],
    ['priorité inconnue', { priorite: 'urgente' }, 'Priorité invalide.'],
    ['statut inconnu', { statut: 'fini' }, 'Statut invalide.'],
    ['projet inconnu', { projectId: 999 }, 'Projet introuvable.'],
  ])('modifierTache refuse : %s (rien n’est modifié)', async (_, changements, message) => {
    const tache = await db.ajouterTache({ titre: 'Plan', projectId: projet.id });
    await expect(db.modifierTache(tache.id, changements)).rejects.toMatchObject(refus(message));
    expect(await db.listerTaches()).toEqual([tache]);
  });

  test.each([[undefined], [null]])('refuse un titre %j (création et modification)', async (titre) => {
    await expect(db.ajouterTache({ titre, projectId: projet.id })).rejects.toMatchObject(refus('Le titre est obligatoire.'));
    const tache = await db.ajouterTache({ titre: 'Plan', projectId: projet.id });
    await expect(db.modifierTache(tache.id, { titre })).rejects.toMatchObject(refus('Le titre est obligatoire.'));
  });

  test('une description nulle devient une description vide', async () => {
    const tache = await db.ajouterTache({ titre: 'Plan', description: null, projectId: projet.id });
    expect(tache.description).toBe('');
    const maj = await db.modifierTache(tache.id, { description: null });
    expect(maj.description).toBe('');
  });

  test('modifierTache refuse une tâche inconnue', async () => {
    await expect(db.modifierTache(42, { titre: 'A' })).rejects.toMatchObject(refus('Tâche introuvable.'));
  });

  test('supprimerTache retire la tâche et garde le projet', async () => {
    const tache = await db.ajouterTache({ titre: 'Plan', projectId: projet.id });
    await db.supprimerTache(String(tache.id));
    expect(await db.listerTaches()).toEqual([]);
    expect(await db.listerProjets()).toHaveLength(2);
  });

  test('supprimerTache refuse une tâche inconnue', async () => {
    await expect(db.supprimerTache(42)).rejects.toMatchObject(refus('Tâche introuvable.'));
  });

  test('listerTaches filtre par projet et par statut', async () => {
    const a = await db.ajouterTache({ titre: 'A', projectId: projet.id });
    const b = await db.ajouterTache({ titre: 'B', projectId: projet.id });
    const c = await db.ajouterTache({ titre: 'C', projectId: autre.id });
    await db.modifierTache(b.id, { statut: 'terminee' });

    const titres = async (filtre) => (await db.listerTaches(filtre)).map((t) => t.titre);
    expect(await titres()).toEqual(['A', 'B', 'C']);
    expect(await titres({ projectId: projet.id })).toEqual(['A', 'B']);
    expect(await titres({ projectId: String(autre.id) })).toEqual(['C']);
    expect(await titres({ statut: 'terminee' })).toEqual(['B']);
    expect(await titres({ statut: 'a-faire' })).toEqual(['A', 'C']);
    expect(await titres({ projectId: projet.id, statut: 'a-faire' })).toEqual(['A']);
    expect([a.id, b.id, c.id]).toEqual([1, 2, 3]);
  });

  test('à date égale, l’ordre de création est conservé (10 tâches)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    for (let i = 1; i <= 10; i++) await db.ajouterTache({ titre: `T${i}`, projectId: projet.id });
    expect((await db.listerTaches()).map((t) => t.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test('listerTaches trie par date de création puis par identifiant', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    await db.ajouterTache({ titre: 'Récente', projectId: projet.id });
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    await db.ajouterTache({ titre: 'Ancienne', projectId: projet.id });
    await db.ajouterTache({ titre: 'Ancienne bis', projectId: projet.id });
    expect((await db.listerTaches()).map((t) => t.titre)).toEqual(['Ancienne', 'Ancienne bis', 'Récente']);
  });
});
