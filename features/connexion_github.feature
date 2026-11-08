# language: fr
@connexion
Fonctionnalité: Connexion à un compte GitHub
  Afin d'accéder à mes dépôts
  En tant qu'utilisateur
  Je veux me connecter à mon compte GitHub

  # Par défaut, les scénarios tournent sur un FAUX site de connexion local (reproductible, sans réseau,
  # sans risquer de bloquer un vrai compte). Le scénario @reel vise le vrai github.com.

  Contexte:
    Soit je suis sur la page de connexion de GitHub

  Scénario: Connexion réussie avec des identifiants valides
    Quand je saisis l'identifiant "etudiant-test" et le mot de passe "MotDePasse!42"
    Et je clique sur le bouton "Sign in"
    Alors je suis connecté en tant que "etudiant-test"

  Scénario: Connexion refusée avec un mauvais mot de passe
    Quand je saisis l'identifiant "etudiant-test" et le mot de passe "mauvais"
    Et je clique sur le bouton "Sign in"
    Alors le message d'erreur "Incorrect username or password." est affiché
    Et je ne suis pas connecté

  Plan du scénario: Connexion refusée pour des identifiants invalides
    Quand je saisis l'identifiant "<identifiant>" et le mot de passe "<mot_de_passe>"
    Et je clique sur le bouton "Sign in"
    Alors le message d'erreur "Incorrect username or password." est affiché
    Et je ne suis pas connecté

    Exemples:
      | identifiant   | mot_de_passe  |
      | etudiant-test | motdepasse!42 |
      | inconnu       | MotDePasse!42 |
      | inconnu       | mauvais       |
      |               |               |

  @reel
  Scénario: Connexion à mon vrai compte GitHub
    Quand je saisis mes identifiants GitHub personnels
    Et je clique sur le bouton "Sign in"
    Alors je suis connecté avec mon compte personnel
