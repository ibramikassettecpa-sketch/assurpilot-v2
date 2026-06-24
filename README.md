# AssurPilot — Centre d'appels IA

Plateforme de prospection téléphonique IA pour les centres d'appels français.

## Prérequis

- **Node.js 18+** — [télécharger ici](https://nodejs.org)
- **npm** (inclus avec Node.js)

## Installation

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd assurpilot-v1
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Ouvrez `.env` et modifiez au minimum :
- `NEXTAUTH_SECRET` : générez une clé sécurisée avec `openssl rand -base64 32`
- Les autres variables Vapi et IA seront nécessaires en Phase 2

### 4. Initialiser la base de données

```bash
npx prisma migrate dev --name init
```

### 5. Créer l'utilisateur administrateur

```bash
npm run db:seed
```

Identifiants créés : `admin@assurpilot.fr` / `admin123`

### 6. Lancer l'application

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## Utilisation

1. **Connexion** : `admin@assurpilot.fr` / `admin123`
2. **Importer des prospects** : Menu "Importer" → glisser-déposer votre fichier Excel ou CSV
3. **Voir les prospects** : Menu "Prospects" → liste avec recherche et filtres
4. **Détail d'un prospect** : Cliquer sur une ligne → voir tous les champs + champs personnalisés + historique des appels

### Fichier exemple

Le fichier `exemple-prospects.xlsx` contient des colonnes standard + une colonne personnalisée `type_client` pour illustrer la fonctionnalité des champs personnalisés.

---

## Webhooks avec ngrok (développement)

Pour recevoir les webhooks Vapi en développement local :

```bash
# Installer ngrok : https://ngrok.com
ngrok http 3000
```

Copiez l'URL HTTPS fournie (ex: `https://abc123.ngrok.io`) et :
- Définissez `NEXTAUTH_URL=https://abc123.ngrok.io` dans `.env`
- Configurez l'URL de webhook dans votre tableau de bord Vapi : `https://abc123.ngrok.io/api/webhooks/vapi`

---

## Structure du projet

```
app/              Pages et routes API (Next.js App Router)
components/       Composants React réutilisables
lib/              Logique métier
  auth.ts         Configuration NextAuth
  prisma.ts       Client Prisma (singleton)
  import/         Parseur Excel/CSV
  providers/voice Interface VoiceProvider (Phase 2)
prisma/           Schéma et migrations SQLite
```

---

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrer en mode développement |
| `npm run build` | Compiler pour la production |
| `npm start` | Démarrer en mode production |
| `npm run db:push` | Appliquer le schéma Prisma sans migration |
| `npm run db:studio` | Ouvrir Prisma Studio (interface DB) |
| `npm run db:seed` | Créer l'utilisateur admin |
