# Application To-do testée en BDD (Cucumber + Playwright)

Devoir INF563 : application de tâches rattachées à des projets, sauvegardée dans **IndexedDB**, et testée en
**BDD** (scénarios Gherkin en français exécutés par **Cucumber.js**, navigateur piloté par **Playwright**).
Les tests se déclenchent à chaque `git push` grâce à **GitHub Actions**. Un test BDD de **connexion à GitHub**
est aussi fourni.

## Ce que contient le projet

```
app/                         l'application (HTML, CSS, JavaScript, sans framework)
  js/db.js                   toute la persistance : base IndexedDB "todo-db" (projets, tâches)
  js/app.js                  l'interface
features/
  connexion_github.feature   BDD : connexion à un compte GitHub
  projets.feature            BDD : création / suppression de projets
  taches.feature             BDD : ajout, modification, déplacement, filtres de tâches
  persistance_indexeddb.feature   BDD : ce qui est réellement stocké dans la base du navigateur
  step_definitions/          le code Playwright derrière chaque phrase
  support/                   démarrage du navigateur, faux site de connexion GitHub, "monde" Cucumber
server.js                    petit serveur local (application + faux site de connexion)
.github/workflows/ci.yml     pipeline : tests à chaque push
cucumber.cjs                 configuration de Cucumber (rapports HTML et JUnit)
```

**Fonctionnalités de l'application** : créer / supprimer des projets (nom unique, sans tenir compte de la casse) ;
ajouter / modifier / terminer / supprimer des tâches (titre, description, priorité, projet) ; déplacer une tâche
vers un autre projet ; filtrer par projet ou par statut. Supprimer un projet supprime ses tâches (même transaction).

## Installation et lancement

Prérequis : **Node.js 20 ou plus** (`node -v`).

```
npm install
npx playwright install chromium     # télécharge le navigateur de test (une seule fois)
npm test                            # lance les 44 scénarios
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

## Test de connexion à GitHub

Par défaut, les scénarios de `connexion_github.feature` s'exécutent sur un **faux site de connexion local**
(`/mock/github/login`) qui reprend les champs et messages de GitHub. Compte de démonstration du faux site :
`etudiant-test` / `MotDePasse!42` (ce ne sont pas de vrais identifiants). Ce choix rend les tests
reproductibles, utilisables en intégration continue et sans risque pour un vrai compte.

Le scénario marqué **`@reel`** vise le **vrai github.com** avec VOTRE compte. Il est ignoré tant que les
variables d'environnement ne sont pas définies :

```
$env:GITHUB_USERNAME = "mon-identifiant"      # l'identifiant, pas l'adresse e-mail
$env:GITHUB_PASSWORD = "mon-mot-de-passe"
npm run test:reel
```

Précautions : n'écrivez **jamais** vos identifiants dans le code ni dans le dépôt ; préférez un compte de test ;
si votre compte a l'authentification à deux facteurs, GitHub demandera un code ou une vérification de
l'appareil et le test s'arrêtera avec un message explicatif ; des connexions automatisées répétées peuvent
déclencher un captcha ou un blocage temporaire. Ce scénario réel n'est pas lancé par la CI.

**Facebook** n'est pas fourni : automatiser la connexion à Facebook va à l'encontre de ses conditions
d'utilisation et déclenche rapidement des blocages de compte.

## Intégration continue : les tests se lancent à chaque push

Le fichier `.github/workflows/ci.yml` lance `npm test` sur GitHub à chaque `push` et à chaque pull request.

1. Créer un dépôt vide sur github.com (sans README).
2. Dans le dossier du projet :

```
git init
git add .
git commit -m "Application To-do et tests BDD"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/VOTRE-DEPOT.git
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
