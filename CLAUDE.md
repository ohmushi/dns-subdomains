# CLAUDE.md — Gestionnaire de sous-domaines OVH

## Objectif
Une petite interface web personnelle pour ajouter, modifier et supprimer les
enregistrements DNS de type **A** d'un unique domaine OVH, sans avoir à se
connecter au Manager OVH.

Cas d'usage réel : un seul nom de domaine, plusieurs sous-domaines (`www`,
`api`, `blog`, etc.) qui pointent tous vers la même IP pour l'instant. Le
besoin principal est d'ajouter rapidement un nouveau sous-domaine, ou de
changer la cible d'un sous-domaine existant.

**Non-objectifs** (volontairement hors scope pour l'instant) :
- Gestion multi-domaines ou multi-registrar
- Autres types d'enregistrements (CNAME, MX, TXT...)
- Authentification / multi-utilisateurs
- Suivi de renouvellement / expiration de domaine

## Contexte des décisions prises
- Un outil CLI Python a été essayé en premier, jugé suffisant pour l'usage
  mais l'utilisateur préfère une interface web.
- Une première version web en Flask (Python) a été construite puis écartée :
  **le projet doit être en Node.js / TypeScript**, pas en Python.
- Le déploiement cible est un **conteneur Docker** (pensé pour tourner sur un
  futur homelab, potentiellement un Mac mini).
- La disposition de l'interface a été validée sous forme de maquette avant
  d'écrire le code (voir section Design) — ne pas la complexifier sans
  raison : pas de menu, pas de dashboard, pas de statistiques.

## Stack technique
- **Node.js 20** + **TypeScript**
- **Express** pour le serveur HTTP, rendu HTML côté serveur via template
  literals (pas de moteur de template, pas de framework front — le besoin ne
  le justifie pas)
- **[@ovhcloud/node-ovh](https://www.npmjs.com/package/@ovhcloud/node-ovh)**
  comme client API OVH officiel (pas de typings officiels : un fichier
  `src/types/ovh.d.ts` déclare un type minimal)
- **Docker** multi-stage (build TS → JS dans une étape, image finale sans
  devDependencies)

## Authentification à l'API OVH
L'API OVH utilise un système à 3 clés :
- `appKey` / `appSecret` : identifient l'application, créées une fois sur
  https://eu.api.ovh.com/createApp/
- `consumerKey` : autorise l'application à agir sur le compte, obtenue via un
  appel `POST /auth/credential` avec des `accessRules` scopées (idéalement
  restreintes à `/domain/zone/{domaine}/*` uniquement, pas `/*`), puis validée
  en ouvrant la `validationUrl` renvoyée dans un navigateur.

Ces trois clés sont déjà générées côté utilisateur et doivent être fournies
via variables d'environnement (`OVH_APP_KEY`, `OVH_APP_SECRET`,
`OVH_CONSUMER_KEY`) — jamais commitées, toujours via `.env` (ignoré par
`.dockerignore` et à ajouter à `.gitignore`).

Endpoints OVH utilisés par l'app :

| Action | Requête |
|---|---|
| Lister les enregistrements A | `GET /domain/zone/{domain}/record?fieldType=A` puis `GET /domain/zone/{domain}/record/{id}` pour chaque id |
| Ajouter | `POST /domain/zone/{domain}/record` avec `fieldType=A`, `subDomain`, `target`, `ttl` |
| Modifier | `PUT /domain/zone/{domain}/record/{id}` avec `target` |
| Supprimer | `DELETE /domain/zone/{domain}/record/{id}` |
| Appliquer les changements | `POST /domain/zone/{domain}/refresh` — **obligatoire après chaque add/edit/delete**, sinon les changements restent en attente côté OVH |

## Design
Interface volontairement minimaliste, validée via une maquette avant
développement :
- Une seule carte centrée, fond clair (`#f6f6f4` en fond de page, carte
  blanche `#fff`, bordures fines `#dcdcd6`)
- Le nom de domaine affiché en petit, discret, en haut de la carte
- Une ligne par sous-domaine : nom du sous-domaine à gauche, champ texte
  éditable avec la cible IP au centre, icône ✓ pour valider la modification,
  icône corbeille pour supprimer (icônes [Tabler Icons](https://tabler.io/icons)
  via CDN)
- Une ligne d'ajout en bas, séparée par une bordure en pointillés : champ
  sous-domaine + champ cible (pré-rempli avec l'IP par défaut) + bouton
  "Ajouter"
- Pas de dark mode, pas d'illustration, pas d'animation — l'objectif est la
  rapidité d'exécution des trois actions (ajouter / modifier / supprimer),
  pas la démonstration visuelle

## Structure du projet

```
dns-subdomains/
├── src/
│   ├── application/      # cas d’usage add / edit / delete / refresh
│   ├── config/           # chargement et validation de l’environnement
│   ├── domain/           # modèle et règles de validation DNS
│   ├── infrastructure/   # adaptateur API OVH
│   ├── web/              # routes, gestion d’erreurs et vues
│   ├── app.ts            # composition de l’application Express
│   ├── index.ts          # bootstrap et démarrage du serveur
│   └── types/ovh.d.ts    # typings minimaux pour @ovhcloud/node-ovh
├── public/               # CSS et JavaScript statiques
├── package.json
├── README.md
├── tsconfig.json
├── Dockerfile             # build multi-stage
├── docker-compose.yml     # DOMAIN / DEFAULT_TARGET en clair, clés via .env
├── .env.example
└── .dockerignore
```

## Variables d'environnement

| Variable | Description | Exemple |
|---|---|---|
| `DOMAIN` | Domaine géré | `tondomaine.fr` |
| `DEFAULT_TARGET` | IP par défaut pré-remplie pour les nouveaux sous-domaines | `203.0.113.10` |
| `OVH_ENDPOINT` | Zone de l'API OVH | `ovh-eu` |
| `OVH_APP_KEY` | Clé d'application OVH | — |
| `OVH_APP_SECRET` | Secret d'application OVH | — |
| `OVH_CONSUMER_KEY` | Clé consommateur autorisée sur `/domain/zone/{domain}/*` | — |
| `PORT` | Port d'écoute du serveur (optionnel) | `3000` |

## Lancer le projet

Dev local (sans Docker) :

```bash
npm install
npm run dev
```

Via Docker :

```bash
cp .env.example .env   # puis remplir les 3 clés OVH
docker compose up --build
```

L'interface est accessible sur `http://localhost:3000`.

## État actuel
Le projet est fonctionnel pour le cas d'usage principal (add / edit / delete
d'enregistrements A sur un domaine unique). Le code est séparé entre les cas
d'usage, l'adaptateur OVH et la couche web. Les règles métier disposent de
tests exécutables avec `npm test`, sans appel réel à l'API OVH. Le démarrage
avec `docker compose up --build` reste à vérifier en conditions réelles par
l'utilisateur.

## Pistes d'évolution (non demandées pour l'instant, à ne pas faire sans validation)
- Exposer l'app au-delà de `localhost` (ex: via Tailscale) nécessiterait
  d'ajouter une authentification minimale avant d'ouvrir l'accès réseau
- Support d'autres types d'enregistrements DNS si le besoin apparaît
- Tests automatisés (aucun test n'existe actuellement)
