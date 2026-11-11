# language: fr
@taches
Fonctionnalité: Gestion des tâches
  Afin de ne rien oublier
  En tant qu'utilisateur
  Je veux ajouter, modifier, terminer et supprimer des tâches rattachées à des projets

  Contexte:
    Soit j'ouvre l'application de tâches
    Et le projet "Mémoire" existe

  Scénario: Ajouter une tâche à un projet
    Quand j'ajoute la tâche "Rédiger le plan" au projet "Mémoire"
    Alors la liste des tâches contient "Rédiger le plan"
    Et la tâche "Rédiger le plan" appartient au projet "Mémoire"
    Et la tâche "Rédiger le plan" est à faire
    Et la tâche "Rédiger le plan" a la priorité "normale"

  Scénario: Ajouter une tâche avec une description et une priorité
    Quand j'ajoute la tâche "Relire le chapitre 2" au projet "Mémoire" avec la priorité "haute" et la description "Vérifier les références"
    Alors la tâche "Relire le chapitre 2" a la priorité "haute"
    Et la tâche "Relire le chapitre 2" a la description "Vérifier les références"

  Scénario: Une tâche sans titre est refusée
    Quand j'ajoute la tâche "" au projet "Mémoire"
    Alors l'erreur de tâche "Le titre est obligatoire." est affichée
    Et la liste des tâches est vide

  Scénario: Une tâche doit appartenir à un projet
    Quand j'ajoute la tâche "Rédiger le plan" sans choisir de projet
    Alors l'erreur de tâche "Le projet est obligatoire." est affichée
    Et la liste des tâches est vide

  Scénario: Modifier le titre d'une tâche
    Soit la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Quand je modifie la tâche "Rédiger le plan" avec le titre "Rédiger le plan détaillé"
    Alors la liste des tâches contient "Rédiger le plan détaillé"
    Et la liste des tâches ne contient pas "Rédiger le plan"

  Scénario: Modifier la priorité d'une tâche
    Soit la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Quand je change la priorité de la tâche "Rédiger le plan" en "haute"
    Alors la tâche "Rédiger le plan" a la priorité "haute"

  Scénario: Déplacer une tâche vers un autre projet
    Soit le projet "Loisirs" existe
    Et la tâche "Réserver le billet" existe dans le projet "Mémoire"
    Quand je déplace la tâche "Réserver le billet" vers le projet "Loisirs"
    Alors la tâche "Réserver le billet" appartient au projet "Loisirs"
    Et le projet "Mémoire" contient 0 tâche
    Et le projet "Loisirs" contient 1 tâche

  Scénario: Une modification avec un titre vide est refusée
    Soit la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Quand je commence à modifier la tâche "Rédiger le plan"
    Et je saisis le titre ""
    Et j'enregistre la modification
    Alors l'erreur de tâche "Le titre est obligatoire." est affichée
    Et la liste des tâches contient "Rédiger le plan"

  Scénario: Annuler une modification ne change rien
    Soit la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Quand je commence à modifier la tâche "Rédiger le plan"
    Et je saisis le titre "Autre titre"
    Et j'annule la modification
    Alors la liste des tâches contient "Rédiger le plan"
    Et le formulaire de tâche est en mode ajout

  Scénario: Terminer puis rouvrir une tâche
    Soit la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Quand je termine la tâche "Rédiger le plan"
    Alors la tâche "Rédiger le plan" est terminée
    Quand je rouvre la tâche "Rédiger le plan"
    Alors la tâche "Rédiger le plan" est à faire

  Scénario: Supprimer une tâche
    Soit la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Quand je supprime la tâche "Rédiger le plan"
    Alors la liste des tâches est vide
    Et le projet "Mémoire" contient 0 tâche

  Scénario: Filtrer les tâches par projet
    Soit le projet "Loisirs" existe
    Et la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Et la tâche "Réserver le billet" existe dans le projet "Loisirs"
    Quand je filtre les tâches par le projet "Loisirs"
    Alors la liste des tâches contient "Réserver le billet"
    Et la liste des tâches ne contient pas "Rédiger le plan"
    Et le compteur affiche 1 tâche

  Scénario: Filtrer les tâches par statut
    Soit la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Et la tâche "Relire le chapitre 1" existe dans le projet "Mémoire"
    Quand je termine la tâche "Relire le chapitre 1"
    Et je filtre les tâches par le statut "Terminées"
    Alors la liste des tâches contient "Relire le chapitre 1"
    Et la liste des tâches ne contient pas "Rédiger le plan"

  Scénario: Le tableau de bord résume l'avancement
    Soit la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Et la tâche "Relire le chapitre 1" existe dans le projet "Mémoire"
    Quand je termine la tâche "Relire le chapitre 1"
    Alors le tableau de bord affiche 2 au total, 1 à faire et 1 terminée

  Scénario: Cliquer sur un projet affiche seulement ses tâches
    Soit le projet "Loisirs" existe
    Et la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Et la tâche "Réserver le billet" existe dans le projet "Loisirs"
    Quand je clique sur le projet "Loisirs"
    Alors la liste des tâches contient "Réserver le billet"
    Et la liste des tâches ne contient pas "Rédiger le plan"
    Quand j'affiche toutes les tâches
    Alors la liste des tâches contient "Rédiger le plan"
    Et la liste des tâches contient "Réserver le billet"

  Plan du scénario: Les trois priorités sont acceptées
    Quand j'ajoute la tâche "<titre>" au projet "Mémoire" avec la priorité "<priorite>" et la description "<description>"
    Alors la tâche "<titre>" a la priorité "<priorite>"
    Et la tâche "<titre>" a la description "<description>"

    Exemples:
      | titre              | priorite | description          |
      | Ranger le bureau   | basse    | Quand j'ai le temps  |
      | Envoyer le rapport | normale  | Avant vendredi       |
      | Corriger la thèse  | haute    | Urgent               |
