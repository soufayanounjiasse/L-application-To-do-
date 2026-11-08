# language: fr
@indexeddb
Fonctionnalité: Sauvegarde des données dans IndexedDB
  Afin de retrouver mes projets et mes tâches
  En tant qu'utilisateur
  Je veux que tout soit conservé dans la base IndexedDB du navigateur

  Contexte:
    Soit j'ouvre l'application de tâches

  Scénario: La base locale est créée au premier lancement
    Alors la base IndexedDB "todo-db" existe en version 1
    Et elle contient les magasins "projects" et "tasks"
    Et le magasin "projects" possède la clé "id" en auto-incrément
    Et le magasin "tasks" possède la clé "id" en auto-incrément
    Et le magasin "tasks" possède les index "projectId" et "statut"
    Et le magasin "projects" possède un index unique "nomNormalise"
    Et le magasin "projects" contient 0 enregistrement
    Et le magasin "tasks" contient 0 enregistrement

  Scénario: Un projet ajouté est enregistré dans IndexedDB
    Quand j'ajoute le projet "Mémoire"
    Alors le magasin "projects" contient 1 enregistrement
    Et le premier enregistrement du magasin "projects" a pour champ "nom" la valeur "Mémoire"
    Et chaque enregistrement du magasin "projects" possède les champs "id, nom, nomNormalise, creeLe"

  Scénario: Une tâche enregistrée contient tous ses champs et référence son projet
    Soit le projet "Mémoire" existe
    Quand j'ajoute la tâche "Rédiger le plan" au projet "Mémoire" avec la priorité "haute" et la description "Trois parties"
    Alors le magasin "tasks" contient 1 enregistrement
    Et chaque enregistrement du magasin "tasks" possède les champs "id, titre, description, projectId, priorite, statut, creeLe, modifieLe"
    Et l'enregistrement de la tâche "Rédiger le plan" référence le projet "Mémoire"
    Et le premier enregistrement du magasin "tasks" a pour champ "priorite" la valeur "haute"
    Et le premier enregistrement du magasin "tasks" a pour champ "statut" la valeur "a-faire"

  Scénario: Les identifiants sont générés automatiquement
    Quand j'ajoute le projet "Mémoire"
    Et j'ajoute le projet "Loisirs"
    Et j'ajoute le projet "Courses"
    Alors les identifiants du magasin "projects" sont "1, 2, 3"

  Scénario: Les données survivent au rechargement de la page
    Soit le projet "Mémoire" existe
    Et la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Quand je recharge la page
    Alors la liste des projets contient "Mémoire"
    Et la liste des tâches contient "Rédiger le plan"
    Et le magasin "tasks" contient 1 enregistrement

  Scénario: Les données survivent à la fermeture de l'onglet
    Soit le projet "Mémoire" existe
    Et la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Quand je ferme l'onglet et j'en ouvre un nouveau
    Alors la liste des projets contient "Mémoire"
    Et la liste des tâches contient "Rédiger le plan"

  Scénario: Un nouveau profil de navigateur démarre avec une base vide
    Soit le projet "Mémoire" existe
    Quand j'ouvre l'application dans un nouveau profil de navigateur
    Alors la liste des projets est vide
    Et le magasin "projects" contient 0 enregistrement

  Scénario: La base refuse deux projets de même nom normalisé
    Soit le projet "Mémoire" existe
    Quand j'essaie d'insérer directement le projet "mémoire" dans IndexedDB
    Alors IndexedDB refuse l'insertion avec l'erreur "ConstraintError"
    Et le magasin "projects" contient 1 enregistrement

  Scénario: Une modification est écrite dans IndexedDB
    Soit le projet "Mémoire" existe
    Et la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Quand je termine la tâche "Rédiger le plan"
    Alors l'enregistrement de la tâche "Rédiger le plan" a pour statut "terminee"
    Et la date de modification de la tâche "Rédiger le plan" n'est pas antérieure à sa date de création

  Scénario: Une suppression retire l'enregistrement
    Soit le projet "Mémoire" existe
    Et la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Quand je supprime la tâche "Rédiger le plan"
    Alors le magasin "tasks" contient 0 enregistrement
    Et le magasin "projects" contient 1 enregistrement

  Scénario: Supprimer un projet efface ses tâches dans la même transaction
    Soit le projet "Mémoire" existe
    Et le projet "Loisirs" existe
    Et la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Et la tâche "Relire le chapitre 1" existe dans le projet "Mémoire"
    Et la tâche "Réserver le billet" existe dans le projet "Loisirs"
    Quand je supprime le projet "Mémoire"
    Alors le magasin "projects" contient 1 enregistrement
    Et le magasin "tasks" contient 1 enregistrement
    Et l'enregistrement de la tâche "Réserver le billet" référence le projet "Loisirs"

  Plan du scénario: Le nom normalisé sert de clé d'unicité
    Quand j'ajoute le projet "<nom>"
    Alors le magasin "projects" contient 1 enregistrement
    Et le premier enregistrement du magasin "projects" a pour champ "nomNormalise" la valeur "<normalise>"

    Exemples:
      | nom          | normalise    |
      | Mémoire      | mémoire      |
      | COURS INF563 | cours inf563 |
      | Été 2026     | été 2026     |
