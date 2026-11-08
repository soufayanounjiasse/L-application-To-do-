# language: fr
@projets
Fonctionnalité: Gestion des projets
  Afin de regrouper mes tâches
  En tant qu'utilisateur
  Je veux créer et supprimer des projets

  Contexte:
    Soit j'ouvre l'application de tâches

  Scénario: Créer un projet
    Quand j'ajoute le projet "Mémoire"
    Alors la liste des projets contient "Mémoire"
    Et le projet "Mémoire" contient 0 tâche

  Scénario: Un projet sans nom est refusé
    Quand j'ajoute le projet ""
    Alors l'erreur de projet "Le nom du projet est obligatoire." est affichée
    Et la liste des projets est vide

  Scénario: Deux projets ne peuvent pas avoir le même nom, même avec une casse différente
    Soit le projet "Mémoire" existe
    Quand j'ajoute le projet "mémoire"
    Alors l'erreur de projet "Un projet avec ce nom existe déjà." est affichée
    Et la liste des projets contient 1 projet

  Scénario: Le compteur d'un projet suit ses tâches
    Soit le projet "Mémoire" existe
    Quand j'ajoute la tâche "Rédiger le plan" au projet "Mémoire"
    Et j'ajoute la tâche "Relire le chapitre 1" au projet "Mémoire"
    Alors le projet "Mémoire" contient 2 tâches

  Scénario: Supprimer un projet supprime aussi ses tâches
    Soit le projet "Mémoire" existe
    Et la tâche "Rédiger le plan" existe dans le projet "Mémoire"
    Quand je supprime le projet "Mémoire"
    Alors la liste des projets est vide
    Et la liste des tâches est vide

  Plan du scénario: Noms de projet valides
    Quand j'ajoute le projet "<nom>"
    Alors la liste des projets contient "<nom>"

    Exemples:
      | nom                   |
      | Cours INF563          |
      | Courses               |
      | Projet 2026 - phase 1 |
