# DNS Subdomains

Interface web minimale pour gérer les enregistrements DNS de type A d’une zone OVH.

## Architecture

```text
HTTP / Express
      ↓
src/web/routes.ts
      ↓
src/application/dns-record-service.ts
      ↓
src/infrastructure/ovh/ovh-zone-repository.ts
      ↓
API OVH
```

- `src/config` charge et valide la configuration.
- `src/domain` contient le modèle et les règles de validation.
- `src/application` orchestre les cas d’usage add / edit / delete et le refresh obligatoire.
- `src/infrastructure` encapsule le client OVH.
- `src/web` contient les routes, la gestion d’erreurs et les vues HTML.
- `public` contient les assets statiques.

## Développement local

Créer un fichier `.env` à partir de `.env.example`, puis renseigner les clés OVH.

```powershell
npm install
npm run dev
```

L’interface est disponible sur `http://localhost:3000`.

## Vérifications

Les tests métier utilisent un faux repository et ne contactent pas OVH.

```powershell
npm test
```

## Docker

```powershell
Copy-Item .env.example .env
# Renseigner les clés OVH dans .env
docker compose up --build
```

Les permissions OVH doivent rester limitées à la zone du domaine géré. L’application ne doit pas être exposée sur un réseau non maîtrisé sans ajouter une authentification et une protection CSRF.

