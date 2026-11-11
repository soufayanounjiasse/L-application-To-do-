# Application To-do testée en BDD (Cucumber + Playwright)

Devoir INF563 : application de tâches rattachées à des projets, sauvegardée dans **IndexedDB**, et testée en
**BDD** (scénarios Gherkin en français exécutés par **Cucumber.js**, navigateur piloté par **Playwright**).
Les tests se déclenchent à chaque `git push` grâce à **GitHub Actions**.

> Le devoir « test de connexion à un compte GitHub » est un **projet séparé** (`github-login-bdd`, aussi en
> JavaScript) : il a son propre dépôt, ses propres tests et son propre pipeline.

## Ce que contient le projet

```
app/                         l'application (HTML, CSS, JavaScript, sans framework)
  js/db.js                   toute la persistance : base IndexedDB "todo-db" (projets, tâches)
  js/statistiques.js         fonctions pures : pluriel, couleur, avancement, résumé
  js/app.js                  l'interface
features/
  projets.feature            BDD : création / suppression de projets
  taches.feature             BDD : ajout, modification, déplacement, filtres de tâches
  persistance_indexeddb.feature   BDD : ce qui est réellement stocké dans la base du navigateur
  step_definitions/          le code Playwright derrière chaque phrase
  support/                   démarrage du navigateur et "monde" Cucumber (outils Playwright partagés)
tests-unitaires/             tests unitaires Vitest (db, statistiques) et outils (pairwise, ulp)
vitest.config.mjs            configuration de Vitest et seuils de couverture
stryker.config.json          configuration du test de mutation
server.js                    petit serveur local qui sert l'application
.github/workflows/ci.yml     pipeline : tests à chaque push
cucumber.cjs                 configuration de Cucumber (rapports HTML et JUnit)
```

**Fonctionnalités de l'application** : créer / supprimer des projets (nom unique, sans tenir compte de la casse) ;
ajouter / modifier / terminer / supprimer des tâches (titre, description, priorité, projet) ; déplacer une tâche
vers un autre projet ; filtrer par projet ou par statut (ou en cliquant sur un projet de la barre latérale) ;
tableau de bord (total, à faire, terminées, barre de progression). Supprimer un projet supprime ses tâches
(même transaction).

**Design** : barre latérale dédiée aux projets (création et liste, une couleur par projet), carte « Nouvelle
tâche » qui devient « Modifier la tâche » en édition, notifications d'enregistrement, mode sombre automatique,
affichage adapté au téléphone. Le HTML garde les mêmes repères (`data-testid`, libellés des boutons) pour que les
scénarios BDD restent valables après un changement de présentation.

## Installation et lancement

Prérequis : **Node.js 20 ou plus** (`node -v`).

```
npm install
npx playwright install chromium     # télécharge le navigateur de test (une seule fois)
npm test                            # tests unitaires + couverture, puis les 40 scénarios BDD
npm start                           # lance l'application sur http://localhost:3000
```

Options utiles (PowerShell) :

```
$env:HEADED = "1"; npm test                   # voir le navigateur pendant les tests
$env:HEADED = "1"; $env:SLOWMO = "300"; npm test   # ... en ralenti
npx cucumber-js --tags "@indexeddb"           # un seul groupe de scénarios
```

Après `npm test`, le rapport est dans **`reports/cucumber.html`** (ouvrir dans le navigateur ; une capture d'écran
est jointe à chaque scénario en échec) et `reports/junit.xml`.

## Le BDD en pratique

- Un **scénario** décrit un comportement en français (`Soit` / `Quand` / `Alors`), indépendamment du code.
- Un **plan du scénario** avec **Exemples** rejoue le même scénario avec plusieurs jeux de données.
- Chaque phrase est reliée à du code Playwright dans `features/step_definitions/`.
- Chaque scénario démarre avec un **profil de navigateur vierge** : IndexedDB est vide, les scénarios sont
  indépendants et peuvent s'exécuter dans n'importe quel ordre.

### Ce que vérifient les scénarios IndexedDB

Les étapes lisent la base **directement dans le navigateur**, sans passer par le code de l'application :
version, magasins et index de la base ; index unique ; contenu et champs de chaque enregistrement ; clés
auto-incrémentées ; référence d'une tâche vers son projet ; écriture des modifications ; suppression en cascade
dans une seule transaction ; refus d'un doublon par la base (`ConstraintError`) ; données conservées après
rechargement de la page et après fermeture de l'onglet ; base vide dans un nouveau profil.

## Tests unitaires, couverture, mutation, pairwise et ulp

En plus du BDD, ce projet utilise les techniques du cours (JUnit, JaCoCo, PIT, Jenny, ulp). Le projet est en
**JavaScript** : JUnit, JaCoCo et PIT sont des outils pour Java et ne s'appliquent pas à du code JavaScript.
On utilise donc leurs **équivalents JavaScript**, qui appliquent les mêmes idées :

| Technique du cours | Outil utilisé ici | Rôle |
|---|---|---|
| JUnit (tests unitaires, `@ParameterizedTest`) | **Vitest** (`test`, `test.each`, rapport JUnit XML) | tests unitaires de la logique métier |
| JaCoCo (couverture) | **Vitest + V8** (`--coverage`, seuils) | couverture des instructions, branches, fonctions, lignes ; échec sous les seuils |
| PIT (test de mutation) | **StrykerJS** | injecte des défauts dans le code et vérifie que les tests les détectent |
| Jenny (pairwise) | `tests-unitaires/outils/pairwise.js` | génère les combinaisons de tests ; lit aussi la sortie du vrai Jenny |
| ulp (tolérance en flottants) | `tests-unitaires/outils/ulp.js` | compare des nombres décimaux à N ulps près |

**Ce qui est testé unitairement** : `app/js/db.js` (toute la couche IndexedDB, avec `fake-indexeddb` pour simuler la base dans Node) et `app/js/statistiques.js` (pluriel, couleur, avancement). L'interface `app.js` (DOM) est couverte par les scénarios BDD.

```
npm run test:unit        # Vitest : tests unitaires + couverture (échoue sous 90 % lignes, 80 % branches)
npm run test:bdd         # Cucumber : scénarios BDD
npm test                 # les deux, à la suite
npm run test:mutation    # StrykerJS : test de mutation (quelques minutes)
```

Rapports : `reports/couverture/index.html` (couverture), `reports/mutation/index.html` (mutation),
`reports/junit-unitaires.xml` (JUnit XML), `reports/cucumber.html` (BDD).

**Résultats mesurés** :

| Mesure | Résultat |
|---|---|
| Tests unitaires | **109** réussis |
| Couverture (`db.js` et `statistiques.js`) | **100 %** instructions, branches, fonctions et lignes |
| Score de mutation (StrykerJS) | **96,96 %** (255 mutants tués sur 263 ; seuil d'échec : 80 %) |
| Scénarios BDD | **40** réussis |

**Pairwise (équivalent de Jenny)** : la création d'une tâche a 4 paramètres (titre, description, projet, priorité) : 5 × 3 × 3 × 4 = 180 combinaisons exhaustives, ramenées à **20 cas** par le pairwise ; l'oracle (la spécification) est écrit indépendamment du code.
Avec le vrai Jenny : `jenny -n2 3 3 3 > cas.txt`, puis `depuisSortieJenny(texte, 3)` (dans `pairwise.js`) lit le fichier.

**ulp** : l'avancement `terminées / total` est un nombre décimal : le test vérifie que « part terminée + part restante = 1 » à 2 ulps près pour tous les totaux de 1 à 60, et que 1/3 est à 0 ulp de sa valeur arrondie.

**Mutation** : StrykerJS modifie le code (opérateur `<` changé en `<=`, constante changée, condition inversée,
etc.) et relance les tests : un mutant « tué » est un défaut détecté, un mutant « survivant » montre une
lacune des tests. Le rapport HTML liste chaque mutant. Les mutants qui survivent encore sont du code défensif
qu'aucun scénario public ne peut atteindre.

## Intégration continue : les tests se lancent à chaque push

Le fichier `.github/workflows/ci.yml` lance, sur GitHub, à chaque `push` et à chaque pull request : les tests unitaires avec couverture, les tests BDD et le test de mutation.

1. Créer un dépôt vide sur github.com (sans README).
2. Dans le dossier du projet :

```
git init
git add .
git commit -m "Application To-do et tests BDD"
git branch -M main
git remote add origin https://github.com/soufayanounjiasse/L-application-To-do-.git/
git push -u origin main
```

3. Ouvrir l'onglet **Actions** du dépôt : le pipeline `ci` démarre. Coche verte = tous les tests passent,
   croix rouge = un test échoue (ouvrir l'exécution, puis télécharger l'artefact `rapports-bdd`).
4. Chaque nouveau `git push` relance les tests. Pour bloquer la fusion quand les tests échouent :
   *Settings → Branches → Add rule → Require status checks to pass* et choisir `tests-bdd`.

## Décisions de conception et lacunes de spécification rencontrées

- **Unicité du nom de projet** : comparée sans tenir compte de la casse ni des espaces autour (`Mémoire` = `mémoire`).
- **Titre** : obligatoire (espaces seuls refusés), 150 caractères au maximum ; nom de projet : 80 au maximum.
- **Une tâche appartient toujours à un projet** : aucun projet choisi = erreur « Le projet est obligatoire. ».
- **Suppression d'un projet** : supprime ses tâches, sans demande de confirmation (choix fait pour simplifier
  les tests ; une vraie application demanderait confirmation).
- **Course entre saisie et écriture en base** : IndexedDB est asynchrone. Les premiers essais ont échoué parce
  qu'un test (comme un utilisateur très rapide) pouvait saisir un nouveau texte avant la fin de l'écriture
  précédente, et le formulaire était alors vidé. Les formulaires sont maintenant bloqués pendant l'écriture.
- **Non couvert** : modification du nom d'un projet, tâches à échéance, synchronisation entre onglets,
  migration de la base vers une version 2.
