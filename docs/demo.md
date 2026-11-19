# Déroulé de la démo (3 à 5 minutes)

## Avant de passer (5 minutes avant)

1. Ouvrir https://ticket-support.osc-fr1.scalingo.io/health et vérifier `{"status":"ok","database":"ok"}`.
2. Ouvrir ces onglets, dans cet ordre :
   1. GitHub : le README du dépôt, pour le schéma d'architecture ;
   2. le site : https://tpmiseenprod.vercel.app ;
   3. Supabase : *Table Editor* > `tickets` ;
   4. Scalingo : l'app `ticket-support`, onglet *Deployments* ;
   5. Vercel : le projet, onglet *Deployments* ;
   6. GitHub : la Pull Request de redéploiement, prête à être mergée (voir l'étape 7).
3. Préparer la modification visible pour le redéploiement. Par exemple, dans `frontend/index.html`, remplacer `Bonjour, bienvenue` par `Bonjour, bienvenue (démo YNOV)`, puis faire un commit et un push sur `dev`, et ouvrir la PR `dev` → `main` **sans la merger**.
4. Facultatif : supprimer les tickets de test dans le *SQL Editor* de Supabase, pour présenter des données propres.

## Déroulé

| # | Étape | Durée | Qui | Ce qu'on montre et ce qu'on dit |
|---|---|---|---|---|
| 1 | Architecture | 45 s | Doc | Schéma du README : trois tiers sur trois services, le front ne parle qu'à l'API, seule l'API parle à la base. |
| 2 | Choix d'hébergement | 30 s | Doc | Vercel pour le site statique, Scalingo pour l'API (hébergeur français), Supabase pour PostgreSQL, GitHub qui déclenche les déploiements. |
| 3 | Application en ligne | 15 s | Front | Ouvrir le site. Le voyant « API connectée » prouve que le front joint l'API, qui joint la base. |
| 4 | Création d'un ticket | 30 s | Front | Remplir le formulaire et l'envoyer : le ticket apparaît en haut de la liste, avec le statut « Ouvert ». |
| 5 | Modification du statut | 20 s | Back | Passer le ticket en « En cours » puis en « Résolu ». L'API valide le statut et la base refuse toute autre valeur (contrainte `CHECK`). |
| 6 | Persistance | 30 s | BDD | Recharger la page avec F5 : le ticket est toujours là. Montrer la même ligne dans le *Table Editor* de Supabase : les données sont en base, pas dans le navigateur. |
| 7 | Redéploiement automatique | 45 s | Back | Merger la PR préparée. Montrer le déploiement qui démarre sur Vercel, recharger le site : la modification est en ligne, sans action manuelle. |
| 8 | Sécurité | 20 s | Back | Mot de passe de la base uniquement dans les variables Scalingo, `.env` jamais commité, CORS limité au site, HTTPS forcé, *Data API* Supabase désactivée et RLS activée. |

Durée totale : 4 minutes environ. Adapter la colonne « Qui » aux membres du groupe : chacun présente la partie qu'il a réalisée.

## Questions probables

**Qu'est-ce qu'une architecture trois tiers ?**
L'application est découpée en trois couches séparées : la présentation (le front), la logique métier (l'API) et les données (la base). Chacune peut être hébergée, déployée et mise à l'échelle indépendamment.

**Pourquoi le front ne se connecte-t-il pas directement à Supabase ?**
Il faudrait alors donner au navigateur un accès à la base, donc l'exposer à tout le monde. Ici, seule l'API possède les identifiants. Elle valide les données avant de les écrire.

**Où sont les secrets ?**
Uniquement dans les variables d'environnement de Scalingo (`DATABASE_URL`). En local, ils sont dans `backend/.env`, ignoré par Git. L'URL de l'API dans `config.js` n'est pas un secret : le navigateur la voit de toute façon.

**À quoi sert le CORS ?**
C'est le navigateur qui l'applique : il n'autorise un site à lire les réponses de l'API que si l'API l'accepte. Notre API n'accepte que `https://tpmiseenprod.vercel.app`.

**Comment fonctionne le redéploiement automatique ?**
Au merge sur `main`, GitHub prévient Vercel et Scalingo. Chacun récupère le code, le construit (`npm install` pour l'API) et remplace l'ancienne version par la nouvelle.

**Les données survivent-elles à un redémarrage de l'API ?**
Oui. L'API ne stocke rien elle-même, tout est dans PostgreSQL sur Supabase. Redémarrer ou redéployer l'API ne touche pas aux données.

**Pourquoi le *Session pooler* de Supabase ?**
La connexion directe à Supabase n'est disponible qu'en IPv6. Le pooler fait le relais en IPv4.

**Est-ce vraiment du CI/CD ?**
La partie CD (déploiement continu) est en place : chaque merge sur `main` part en production. La partie CI (tests automatiques avant le déploiement) serait l'amélioration suivante, par exemple avec GitHub Actions.

**Quelles sont les limites des offres gratuites ?**
Ressources limitées, et un projet Supabase gratuit est mis en pause après une période d'inactivité. Il faut aussi surveiller les quotas de chaque plateforme.

## Plan B

- Si le site ou l'API ne répond pas : faire la démo en local (`cd backend`, `npm run dev`, puis servir le dossier `frontend`), et montrer les déploiements réussis dans Scalingo et Vercel.
- Garder des captures d'écran de chaque étape au cas où le réseau de la salle tombe.
