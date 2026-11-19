# Compte rendu technique

**Projet :** application web de gestion de tickets, TP *Mise en production & Hébergement*, YNOV, 18 et 19 novembre 2026
**Application :** https://tpmiseenprod.vercel.app
**API :** https://ticket-support.osc-fr1.scalingo.io

**Équipe et contributions** (à compléter par le groupe) :

| Membre | Contribution principale |
|---|---|
| | |
| | |
| | |

## 1. Choix d'hébergement

L'application suit une architecture trois tiers. Chaque tier est hébergé sur un service différent, et GitHub sert de point de départ à tous les déploiements.

| Tier | Service | Pourquoi ce choix |
|---|---|---|
| Code source | GitHub | Dépôt partagé par le groupe, relié nativement à Vercel et à Scalingo : chaque merge sur `main` déclenche un déploiement. |
| Frontend | Vercel | Hébergement gratuit de sites statiques, HTTPS automatique, redéploiement à chaque push et URL de prévisualisation pour chaque branche. |
| Backend | Scalingo | Hébergeur français : l'API tourne en France. Déploiement depuis Git, buildpack Node.js, variables d'environnement et option *Force HTTPS*. Le sujet citait Render, mais l'hébergement était au choix. |
| Base de données | Supabase | PostgreSQL managé et gratuit, hébergé dans l'Union européenne, avec un éditeur SQL pratique pour créer la table et montrer la persistance. |

## 2. Principales configurations

**Scalingo (API)**
- `PROJECT_DIR=backend` : le dépôt contient le front et le back, Scalingo ne doit construire que le dossier `backend`.
- `DATABASE_URL` : URL de connexion à Supabase. C'est le seul secret du projet, et il n'est stocké qu'ici.
- `CORS_ORIGIN=https://tpmiseenprod.vercel.app` : seul le site Vercel peut appeler l'API depuis un navigateur.
- `Procfile` (`web: npm start`) et `engines.node: 22.x` dans `package.json` pour fixer la commande de démarrage et la version de Node.js.
- *Force HTTPS* activé, et déploiement automatique de la branche `main`.

**Vercel (frontend)**
- *Root Directory* `frontend`, sans étape de build, branche de production `main`.
- URL de l'API dans `frontend/config.js`. Ce n'est pas un secret, le navigateur la voit de toute façon.

**Supabase (base de données)**
- Connexion par le *Session pooler*, compatible IPv4, avec SSL.
- *Data API* désactivée et RLS activée : la base n'est accessible que par notre API.
- Contrainte `CHECK` sur la colonne `statut` : la base refuse toute autre valeur que `ouvert`, `en_cours` ou `resolu`.

**GitHub**
- `main` = production, `dev` = travail en cours. Une Pull Request de `dev` vers `main` vaut mise en production.
- `.gitignore` qui exclut `node_modules/` et tous les fichiers `.env*`, sauf `.env.example`.

## 3. Problème rencontré : le CORS bloquait le site

**Symptôme.** Une fois `CORS_ORIGIN` renseigné sur Scalingo, le site semblait fonctionner chez nous : il affichait « API connectée ». Pourtant, un appel sans cache depuis le site échouait avec `Failed to fetch`. Un visiteur arrivant pour la première fois aurait vu « API indisponible ».

**Diagnostic.** Nous avons appelé l'API en simulant le navigateur :
`curl -H "Origin: https://tpmiseenprod.vercel.app" https://ticket-support.osc-fr1.scalingo.io/api/tickets`.
La réponse ne contenait aucun en-tête `Access-Control-Allow-Origin`, donc l'API refusait l'origine.
Le CORS compare l'origine caractère par caractère, or la valeur saisie dans Scalingo ne correspondait pas exactement à l'adresse du site (probablement un `/` final).
Le navigateur, lui, réutilisait une ancienne réponse mise en cache, du temps où l'API autorisait toutes les origines, ce qui masquait l'erreur.

**Résolution.**
- Correction de la valeur de `CORS_ORIGIN`.
- L'API nettoie désormais la valeur (espaces, guillemets, `/` final) et affiche dans les logs, au démarrage, la liste des origines autorisées.
- Vérification avec `curl` et dans une fenêtre de navigation privée, sans cache.

**Ce que nous en retenons :** toujours tester une configuration réseau sans cache, et faire afficher la configuration réellement chargée dans les logs.

## 4. Autres difficultés

| Problème | Cause | Solution |
|---|---|---|
| Les deux premiers déploiements Scalingo ont échoué (*build error*). | `main` ne contenait pas encore de `package.json` dans `backend/`, Scalingo ne savait pas quoi construire. | Merge du backend sur `main`, avec `PROJECT_DIR=backend`. |
| Créer un ticket ou changer son statut renvoyait une erreur 400. | Le front envoyait `title` et `status` en anglais, alors que l'API attend `titre` et `statut`, comme dans le modèle de données du sujet. | Front aligné sur le contrat de l'API. |
| Sur Vercel, le front n'appelait pas l'API. | L'URL de l'API n'était définie nulle part. | Ajout de `frontend/config.js`. |
| Le dossier `frontend` n'apparaissait pas dans les choix de Vercel. | Le dossier ne contenait qu'un fichier caché (`.gitkeep`). | Ajout d'un vrai fichier `index.html`. |
| La connexion directe à Supabase était impossible. | La connexion directe n'est disponible qu'en IPv6. | Utilisation du *Session pooler*, compatible IPv4. |

## 5. Vérifications avant restitution

- [x] Le frontend est accessible en HTTPS.
- [x] Le backend répond (`/health` indique que l'API et la base sont joignables).
- [x] Les tickets s'affichent.
- [ ] Un nouveau ticket peut être créé depuis le site.
- [x] Le statut d'un ticket peut être modifié.
- [x] Les données persistent après actualisation, puisqu'elles sont stockées dans PostgreSQL.
- [x] La documentation est versionnée (`README.md` et ce compte rendu).
- [x] Une modification poussée sur `main` est redéployée automatiquement.
- [x] Aucun secret n'est publié dans le dépôt.

## 6. Utilisation de l'IA

Une IA générative (Claude) a assisté l'écriture du code et de la documentation. Le groupe a relu, testé et déployé chaque partie, et reste responsable du résultat.
