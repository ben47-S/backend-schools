# DOCUMENTATION COMPLÈTE - API BACKEND
# Système de Gestion Académique UICI

## TABLE DES MATIÈRES
1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture](#2-architecture)
3. [Configuration & Démarrage](#3-configuration--démarrage)
4. [Authentification](#4-authentification)
5. [Schéma de Base de Données](#5-schéma-de-base-de-données)
6. [Endpoints API - Auth](#6-endpoints-api---auth)
7. [Endpoints API - Colleges](#7-endpoints-api---colleges)
8. [Endpoints API - Départements](#8-endpoints-api---départements)
9. [Endpoints API - Années Scolaires](#9-endpoints-api---années-scolaires)
10. [Endpoints API - Enseignants](#10-endpoints-api---enseignants)
11. [Endpoints API - Étudiants](#11-endpoints-api---étudiants)
12. [Endpoints API - Matières](#12-endpoints-api---matières)
13. [Endpoints API - Salles](#13-endpoints-api---salles)
14. [Endpoints API - Notes](#14-endpoints-api---notes)
15. [Endpoints API - Parents](#15-endpoints-api---parents)
16. [Endpoints API - Inscriptions](#16-endpoints-api---inscriptions)
17. [Middleware & Sécurité](#17-middleware--sécurité)
18. [Règles Métier Critiques](#18-règles-métier-critiques)
19. [Formats de Réponse](#19-formats-de-réponse)
20. [Codes d'Erreur](#20-codes-derreur)
21. [Exemples d'Utilisation](#21-exemples-dutilisation)
22. [Tests & Seeds](#22-tests--seeds)
23. [Variables d'Environnement](#23-variables-denvironnement)

---

## 1. VUE D'ENSEMBLE

### Description du Projet
Système de gestion académique pour l'Université UICI permettant de gérer plusieurs collèges, départements, enseignants, étudiants et leurs notes.

### Caractéristiques Principales
- **Multi-collège** : Gestion de plusieurs établissements dans une seule base de données
- **Multi-rôles** : 5 types d'utilisateurs avec permissions différentes
- **Gestion académique** : Années scolaires, inscriptions, notes, moyennes
- **API RESTful** : Architecture REST standard avec JSON
- **Authentication JWT** : Sécurisation par tokens
- **Validation stricte** : Zod schemas sur tous les inputs

### Technologies Utilisées
- **Runtime** : Node.js
- **Framework** : Express 5.x
- **Langage** : TypeScript
- **Base de données** : PostgreSQL
- **ORM** : Prisma
- **Validation** : Zod
- **Authentication** : JWT (jsonwebtoken)
- **Password Hashing** : bcrypt

---

## 2. ARCHITECTURE

### Structure des Dossiers
```
backend-app/
├── prisma/
│   ├── schema.prisma           # Schéma de base de données
│   └── seed.ts                 # Données de test
├── src/
│   ├── config/
│   │   ├── env.ts              # Variables d'environnement
│   │   └── prisma.ts           # Client Prisma
│   ├── controllers/            # Logique des endpoints
│   │   ├── auth.controller.ts
│   │   ├── college.controller.ts
│   │   ├── departement.controller.ts
│   │   ├── annee-scolaire.controller.ts
│   │   ├── enseignant.controller.ts
│   │   ├── etudiant.controller.ts
│   │   ├── matiere.controller.ts
│   │   ├── salle.controller.ts
│   │   ├── note.controller.ts
│   │   ├── parent.controller.ts
│   │   └── inscription.controller.ts
│   ├── services/               # Business logic
│   │   ├── auth.service.ts
│   │   ├── college.service.ts
│   │   └── ...
│   ├── routes/                 # Définition des routes
│   │   ├── auth.route.ts
│   │   ├── college.route.ts
│   │   └── ...
│   ├── middlewares/
│   │   ├── auth.middleware.ts      # Vérification JWT
│   │   ├── rbac.middleware.ts      # Role-based access control
│   │   └── validate.middleware.ts   # Validation Zod
│   ├── utils/
│   │   ├── errors.ts           # Classes d'erreurs custom
│   │   ├── response.ts         # Format de réponse standard
│   │   └── validators.ts       # Schémas Zod
│   └── index.ts                # Entry point
├── package.json
└── tsconfig.json
```

### Flow de Requête
```
Client Request
    ↓
Express Router
    ↓
Auth Middleware (authenticate)
    ↓
RBAC Middleware (requireRole)
    ↓
Validation Middleware (validate)
    ↓
Controller
    ↓
Service (Business Logic)
    ↓
Prisma (Database)
    ↓
Response (Success/Error)
```

### Base URL
```
http://localhost:4000
```

### Préfixe API
```
/api
```

---

## 3. CONFIGURATION & DÉMARRAGE

### Installation
```bash
# Cloner le projet
cd backend-app

# Installer les dépendances
pnpm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs
```

### Configuration Base de Données
```bash
# Générer le client Prisma
pnpm prisma:generate

# Exécuter les migrations
pnpm prisma:migrate

# Seed la base de données (optionnel)
pnpm db:seed
```

### Démarrage
```bash
# Mode développement (watch mode)
pnpm dev

# Build production
pnpm build

# Démarrer en production
pnpm start

# Ouvrir Prisma Studio (GUI DB)
pnpm prisma:studio
```

### Vérification
```bash
# Tester que le serveur fonctionne
curl http://localhost:4000/api/colleges

# Réponse attendue : liste des collèges (endpoint public)
```

---

## 4. AUTHENTIFICATION

### 4.1 Vue d'Ensemble

Le système utilise JWT (JSON Web Tokens) pour l'authentification avec deux types de tokens :
- **Access Token** : Valide 7 jours, utilisé pour les requêtes API
- **Refresh Token** : Valide 30 jours, utilisé pour obtenir un nouveau access token

### 4.2 Flow d'Authentification

```
1. Client → POST /api/auth/login (email + password)
2. Server → Vérifie credentials
3. Server → Génère access token + refresh token
4. Server → Retourne tokens + user data
5. Client → Stocke tokens (localStorage/AsyncStorage)
6. Client → Utilise access token dans header Authorization
7. Server → Vérifie token à chaque requête protégée
8. Si token expiré → Client utilise refresh token
9. Server → Génère nouveaux tokens
```

### 4.3 Format des Tokens

**Access Token Payload :**
```json
{
  "id": "uuid-utilisateur",
  "email": "user@example.com",
  "role": "ENSEIGNANT",
  "collegeId": "uuid-college",  // Seulement pour ADMIN_COLLEGE
  "iat": 1704067200,
  "exp": 1704672000
}
```

**Refresh Token Payload :**
```json
{
  "id": "uuid-utilisateur",
  "type": "refresh",
  "iat": 1704067200,
  "exp": 1706659200
}
```

### 4.4 Utilisation dans les Requêtes

**Header requis pour routes protégées :**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 5. SCHÉMA DE BASE DE DONNÉES

### 5.1 Diagramme ERD (Relations)

```
User (1) ←→ (0..1) Enseignant
User (1) ←→ (0..1) Etudiant
User (1) ←→ (0..1) Parent
User (1) ←→ (0..1) AdminCollege

College (1) ←→ (*) Departement
College (1) ←→ (*) Salle
College (1) ←→ (*) AdminCollege

Departement (1) ←→ (*) Matiere
Departement (*) ←→ (*) Enseignant (via EnseignantDepartement)

AnneeScolaire (1) ←→ (*) Inscription
AnneeScolaire (1) ←→ (*) Note
AnneeScolaire (1) ←→ (*) Cours

Etudiant (1) ←→ (*) Inscription
Etudiant (1) ←→ (*) Note
Etudiant (*) ←→ (*) Parent (via ParentEtudiant)

Matiere (1) ←→ (*) Note
Matiere (1) ←→ (*) Cours

Enseignant (1) ←→ (*) Cours
```

### 5.2 Modèle User

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  role          Role
  photoUrl      String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations polymorphiques (1-to-1)
  enseignant    Enseignant?
  etudiant      Etudiant?
  parent        Parent?
  adminCollege  AdminCollege?

  @@map("users")
}

enum Role {
  ADMIN_GLOBAL
  ADMIN_COLLEGE
  ENSEIGNANT
  ETUDIANT
  PARENT
}
```

**Champs :**
- `id` : UUID auto-généré, clé primaire
- `email` : Email unique, utilisé pour login
- `passwordHash` : Hash bcrypt du mot de passe (JAMAIS stocké en clair)
- `role` : Rôle de l'utilisateur (enum)
- `photoUrl` : URL de la photo de profil (optionnel)
- `isActive` : Flag pour activer/désactiver le compte
- `createdAt` : Date de création (auto)
- `updatedAt` : Date de dernière modification (auto)

**Relations :**
- Un User peut être lié à UN enseignant OU un étudiant OU un parent OU un admin college
- Relation 1-to-1 bidirectionnelle

### 5.3 Modèle College

```prisma
model College {
  id        String   @id @default(uuid())
  nom       String
  siteWeb   String?
  adresse   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  departements  Departement[]
  salles        Salle[]
  adminColleges AdminCollege[]

  @@map("colleges")
}
```

### 5.4 Modèle Departement

```prisma
model Departement {
  id        String   @id @default(uuid())
  nom       String
  collegeId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  college                College                   @relation(fields: [collegeId], references: [id], onDelete: Cascade)
  matieres               Matiere[]
  enseignantDepartements EnseignantDepartement[]

  @@map("departements")
}
```

### 5.5 Modèle AnneeScolaire

```prisma
model AnneeScolaire {
  id         String   @id @default(uuid())
  libelle    String   @unique  // Ex: "2024-2025"
  dateDebut  DateTime
  dateFin    DateTime
  estActive  Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  inscriptions           Inscription[]
  notes                  Note[]
  cours                  Cours[]
  enseignantDepartements EnseignantDepartement[]

  @@map("annees_scolaires")
}
```

**⚠️ IMPORTANT :** Une seule année scolaire peut être active (`estActive = true`) à la fois.

### 5.6 Modèle Enseignant

```prisma
model Enseignant {
  id         String   @id @default(uuid())
  userId     String   @unique
  nom        String
  prenom     String
  telephone  String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  user                   User                      @relation(fields: [userId], references: [id], onDelete: Cascade)
  cours                  Cours[]
  enseignantDepartements EnseignantDepartement[]

  @@map("enseignants")
}
```

### 5.7 Modèle Etudiant

```prisma
model Etudiant {
  id          String   @id @default(uuid())
  userId      String   @unique
  nom         String
  prenom      String
  dateNais    DateTime?
  lieuNais    String?
  telephone   String?
  anneeEntree Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  inscriptions    Inscription[]
  notes           Note[]
  parentEtudiants ParentEtudiant[]

  @@map("etudiants")
}
```

### 5.8 Modèle Parent

```prisma
model Parent {
  id        String   @id @default(uuid())
  userId    String   @unique
  nom       String
  prenom    String
  telephone String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  parentEtudiants ParentEtudiant[]

  @@map("parents")
}
```

### 5.9 Modèle Matiere

```prisma
model Matiere {
  id            String   @id @default(uuid())
  nom           String
  coefficient   Float    @default(1)
  departementId String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  departement Departement @relation(fields: [departementId], references: [id], onDelete: Cascade)
  notes       Note[]
  cours       Cours[]

  @@map("matieres")
}
```

### 5.10 Modèle Salle

```prisma
model Salle {
  id        String   @id @default(uuid())
  nom       String
  capacite  Int?
  collegeId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  college      College       @relation(fields: [collegeId], references: [id], onDelete: Cascade)
  inscriptions Inscription[]
  cours        Cours[]

  @@map("salles")
}
```

### 5.11 Modèle Note

```prisma
model Note {
  id              String   @id @default(uuid())
  valeur          Float
  commentaire     String?
  dateNote        DateTime @default(now())
  etudiantId      String
  matiereId       String
  anneeScolaireId String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  etudiant      Etudiant      @relation(fields: [etudiantId], references: [id], onDelete: Cascade)
  matiere       Matiere       @relation(fields: [matiereId], references: [id], onDelete: Cascade)
  anneeScolaire AnneeScolaire @relation(fields: [anneeScolaireId], references: [id], onDelete: Cascade)

  // Contrainte : Une note unique par (étudiant, matière, année)
  @@unique([etudiantId, matiereId, anneeScolaireId])
  @@map("notes")
}
```

**⚠️ CRITIQUE :** La contrainte `@@unique` garantit qu'un étudiant ne peut avoir qu'UNE note par matière par année.

### 5.12 Modèle Inscription

```prisma
model Inscription {
  id              String          @id @default(uuid())
  etudiantId      String
  anneeScolaireId String
  salleId         String?
  statut          StatutInscription @default(EN_ATTENTE)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // Relations
  etudiant      Etudiant      @relation(fields: [etudiantId], references: [id], onDelete: Cascade)
  anneeScolaire AnneeScolaire @relation(fields: [anneeScolaireId], references: [id], onDelete: Cascade)
  salle         Salle?        @relation(fields: [salleId], references: [id])

  @@unique([etudiantId, anneeScolaireId])
  @@map("inscriptions")
}

enum StatutInscription {
  EN_ATTENTE
  ACCEPTE
  REFUSE
}
```

### 5.13 Modèle EnseignantDepartement (Join Table)

```prisma
model EnseignantDepartement {
  id              String   @id @default(uuid())
  enseignantId    String
  departementId   String
  anneeScolaireId String
  estResponsable  Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  enseignant    Enseignant    @relation(fields: [enseignantId], references: [id], onDelete: Cascade)
  departement   Departement   @relation(fields: [departementId], references: [id], onDelete: Cascade)
  anneeScolaire AnneeScolaire @relation(fields: [anneeScolaireId], references: [id], onDelete: Cascade)

  @@unique([enseignantId, departementId, anneeScolaireId])
  @@index([departementId, anneeScolaireId, estResponsable])
  @@map("enseignant_departements")
}
```

---

## 6. ENDPOINTS API - AUTH

### Base Path
```
/api/auth
```

### 6.1 POST /api/auth/register

**Description :** Inscription d'un nouvel utilisateur

**Auth :** Public (pas d'authentification requise)

**Request Body :**
```json
{
  "email": "user@example.com",
  "password": "securepass123",
  "role": "ENSEIGNANT",
  "nom": "Doe",
  "prenom": "John",
  "telephone": "+225123456789"
}
```

**Validation :**
- `email` : Format email valide (requis)
- `password` : Minimum 8 caractères (requis)
- `role` : Enum valide (ADMIN_GLOBAL, ADMIN_COLLEGE, ENSEIGNANT, ETUDIANT, PARENT) (requis)
- `nom` : String non vide (requis)
- `prenom` : String non vide (requis)
- `telephone` : String (optionnel)

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "role": "ENSEIGNANT",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "Inscription réussie"
}
```

**Response Error (400) :**
```json
{
  "success": false,
  "error": {
    "message": "Email déjà utilisé",
    "code": "P2002"
  }
}
```

**Exemple cURL :**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "prof.martin@example.com",
    "password": "password123",
    "role": "ENSEIGNANT",
    "nom": "Martin",
    "prenom": "Jean",
    "telephone": "+225123456789"
  }'
```

---

### 6.2 POST /api/auth/login

**Description :** Connexion utilisateur

**Auth :** Public

**Request Body :**
```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Validation :**
- `email` : Format email valide (requis)
- `password` : String non vide (requis)

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "role": "ENSEIGNANT",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Response Error (401) :**
```json
{
  "success": false,
  "error": {
    "message": "Email ou mot de passe incorrect"
  }
}
```

**Exemple cURL :**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "prof.martin@example.com",
    "password": "password123"
  }'
```

---

### 6.3 POST /api/auth/refresh

**Description :** Rafraîchir l'access token avec un refresh token

**Auth :** Public (mais nécessite refresh token)

**Request Body :**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response Error (401) :**
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired refresh token"
  }
}
```

---

### 6.4 GET /api/auth/me

**Description :** Récupérer les informations de l'utilisateur connecté

**Auth :** Bearer token requis

**Headers :**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "ENSEIGNANT",
    "photoUrl": null,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Exemple cURL :**
```bash
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 6.5 POST /api/auth/change-password

**Description :** Changer le mot de passe de l'utilisateur connecté

**Auth :** Bearer token requis

**Request Body :**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Validation :**
- `currentPassword` : String non vide (requis)
- `newPassword` : Minimum 8 caractères (requis)

**Response Success (200) :**
```json
{
  "success": true,
  "message": "Mot de passe modifié avec succès"
}
```

**Response Error (401) :**
```json
{
  "success": false,
  "error": {
    "message": "Mot de passe actuel incorrect"
  }
}
```

**Exemple cURL :**
```bash
curl -X POST http://localhost:4000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newpassword456"
  }'
```

---

## 7. ENDPOINTS API - COLLEGES

### Base Path
```
/api/colleges
```

### 7.1 GET /api/colleges

**Description :** Liste tous les collèges

**Auth :** Public (pas d'authentification requise)

**Response Success (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nom": "Collège Einstein",
      "siteWeb": "https://einstein.edu",
      "adresse": "123 Science Street, Abidjan",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "nom": "Collège Marie Curie",
      "siteWeb": "https://curie.edu",
      "adresse": "456 Physics Avenue, Abidjan",
      "createdAt": "2024-01-02T00:00:00.000Z",
      "updatedAt": "2024-01-02T00:00:00.000Z"
    }
  ]
}
```

**Cas d'usage :**
- Page de sélection de collège pour inscription
- Liste publique des établissements
- Dropdown de sélection

**Exemple cURL :**
```bash
curl -X GET http://localhost:4000/api/colleges
```

---

### 7.2 GET /api/colleges/:id

**Description :** Récupère un collège par ID avec statistiques

**Auth :** Bearer token requis

**Roles :** Tous

**Params :**
- `id` : UUID du collège (requis)

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nom": "Collège Einstein",
    "siteWeb": "https://einstein.edu",
    "adresse": "123 Science Street, Abidjan",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "_count": {
      "departements": 5,
      "salles": 12,
      "adminColleges": 2
    }
  }
}
```

**Response Error (404) :**
```json
{
  "success": false,
  "error": {
    "message": "Collège non trouvé"
  }
}
```

**Exemple cURL :**
```bash
curl -X GET http://localhost:4000/api/colleges/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 7.3 POST /api/colleges

**Description :** Crée un nouveau collège

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL uniquement

**Request Body :**
```json
{
  "nom": "Collège Newton",
  "siteWeb": "https://newton.edu",
  "adresse": "789 Physics Road, Abidjan"
}
```

**Validation :**
- `nom` : String non vide (requis)
- `siteWeb` : URL valide (optionnel)
- `adresse` : String (optionnel)

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "nom": "Collège Newton",
    "siteWeb": "https://newton.edu",
    "adresse": "789 Physics Road, Abidjan",
    "createdAt": "2024-01-15T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  },
  "message": "Collège créé avec succès"
}
```

**Response Error (403) :**
```json
{
  "success": false,
  "error": {
    "message": "Accès interdit : réservé aux administrateurs globaux"
  }
}
```

**Exemple cURL :**
```bash
curl -X POST http://localhost:4000/api/colleges \
  -H "Authorization: Bearer ADMIN_GLOBAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Collège Newton",
    "siteWeb": "https://newton.edu",
    "adresse": "789 Physics Road, Abidjan"
  }'
```

---

### 7.4 PUT /api/colleges/:id

**Description :** Met à jour un collège existant

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL uniquement

**Params :**
- `id` : UUID du collège (requis)

**Request Body :**
```json
{
  "nom": "Collège Einstein - Campus Principal",
  "siteWeb": "https://einstein-main.edu",
  "adresse": "123 Science Street, Plateau, Abidjan"
}
```

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nom": "Collège Einstein - Campus Principal",
    "siteWeb": "https://einstein-main.edu",
    "adresse": "123 Science Street, Plateau, Abidjan",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-20T00:00:00.000Z"
  },
  "message": "Collège mis à jour avec succès"
}
```

**Response Error (404) :**
```json
{
  "success": false,
  "error": {
    "message": "Collège non trouvé"
  }
}
```

---

### 7.5 DELETE /api/colleges/:id

**Description :** Supprime un collège

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL uniquement

**Params :**
- `id` : UUID du collège (requis)

**⚠️ ATTENTION :** Supprime en cascade tous les départements, salles et données liées.

**Response Success (200) :**
```json
{
  "success": true,
  "message": "Collège supprimé avec succès"
}
```

**Response Error (404) :**
```json
{
  "success": false,
  "error": {
    "message": "Collège non trouvé"
  }
}
```

**Exemple cURL :**
```bash
curl -X DELETE http://localhost:4000/api/colleges/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer ADMIN_GLOBAL_TOKEN"
```

---

## 8. ENDPOINTS API - DÉPARTEMENTS

### Base Path
```
/api/departements
```

### 8.1 GET /api/departements

**Description :** Liste tous les départements (filtrés par collège pour ADMIN_COLLEGE)

**Auth :** Bearer token requis

**Roles :** Tous

**Query Params :**
- `collegeId` : UUID du collège pour filtrer (optionnel, ignoré pour ADMIN_COLLEGE)

**Comportement par rôle :**
- **ADMIN_GLOBAL** : Voit tous les départements (peut filtrer par collegeId)
- **ADMIN_COLLEGE** : Voit uniquement les départements de son collège
- **Autres rôles** : Voient tous les départements

**Response Success (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "dep-uuid-1",
      "nom": "Mathématiques",
      "collegeId": "college-uuid-1",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "college": {
        "id": "college-uuid-1",
        "nom": "Collège Einstein"
      },
      "_count": {
        "matieres": 3,
        "enseignantDepartements": 5
      }
    },
    {
      "id": "dep-uuid-2",
      "nom": "Physique",
      "collegeId": "college-uuid-1",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "college": {
        "id": "college-uuid-1",
        "nom": "Collège Einstein"
      },
      "_count": {
        "matieres": 2,
        "enseignantDepartements": 3
      }
    }
  ]
}
```

**Exemple cURL :**
```bash
# Liste tous les départements
curl -X GET http://localhost:4000/api/departements \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filtrer par collège (ADMIN_GLOBAL seulement)
curl -X GET "http://localhost:4000/api/departements?collegeId=college-uuid-1" \
  -H "Authorization: Bearer ADMIN_GLOBAL_TOKEN"
```

---

### 8.2 GET /api/departements/:id

**Description :** Récupère un département par ID avec statistiques

**Auth :** Bearer token requis

**Roles :** Tous

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "dep-uuid-1",
    "nom": "Mathématiques",
    "collegeId": "college-uuid-1",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "college": {
      "id": "college-uuid-1",
      "nom": "Collège Einstein",
      "adresse": "123 Science Street"
    },
    "_count": {
      "matieres": 3,
      "enseignantDepartements": 5
    }
  }
}
```

---

### 8.3 POST /api/departements

**Description :** Crée un nouveau département

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "nom": "Informatique",
  "collegeId": "college-uuid-1"
}
```

**Validation :**
- `nom` : String non vide (requis)
- `collegeId` : UUID valide (requis pour ADMIN_GLOBAL, automatique pour ADMIN_COLLEGE)

**Comportement :**
- **ADMIN_GLOBAL** : Peut créer dans n'importe quel collège
- **ADMIN_COLLEGE** : Peut créer uniquement dans son propre collège (collegeId ignoré)

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "id": "dep-uuid-3",
    "nom": "Informatique",
    "collegeId": "college-uuid-1",
    "createdAt": "2024-01-15T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  },
  "message": "Département créé avec succès"
}
```

---

### 8.4 PUT /api/departements/:id

**Description :** Met à jour un département

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE (son collège uniquement)

**Request Body :**
```json
{
  "nom": "Mathématiques Appliquées"
}
```

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "dep-uuid-1",
    "nom": "Mathématiques Appliquées",
    "collegeId": "college-uuid-1",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-20T00:00:00.000Z"
  },
  "message": "Département mis à jour avec succès"
}
```

---

### 8.5 DELETE /api/departements/:id

**Description :** Supprime un département

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE (son collège uniquement)

**⚠️ ATTENTION :** Supprime en cascade toutes les matières liées.

**Response Success (200) :**
```json
{
  "success": true,
  "message": "Département supprimé avec succès"
}
```

---

### 8.6 GET /api/departements/:id/matieres

**Description :** Liste toutes les matières d'un département

**Auth :** Bearer token requis

**Roles :** Tous

**Response Success (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "matiere-uuid-1",
      "nom": "Algèbre",
      "coefficient": 2.0,
      "departementId": "dep-uuid-1",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "matiere-uuid-2",
      "nom": "Géométrie",
      "coefficient": 1.5,
      "departementId": "dep-uuid-1",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 9. ENDPOINTS API - ANNÉES SCOLAIRES

### Base Path
```
/api/annees-scolaires
```

### 9.1 GET /api/annees-scolaires

**Description :** Liste toutes les années scolaires

**Auth :** Bearer token requis

**Roles :** Tous

**Response Success (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "annee-uuid-1",
      "libelle": "2023-2024",
      "dateDebut": "2023-09-01T00:00:00.000Z",
      "dateFin": "2024-06-30T00:00:00.000Z",
      "estActive": false,
      "createdAt": "2023-08-01T00:00:00.000Z"
    },
    {
      "id": "annee-uuid-2",
      "libelle": "2024-2025",
      "dateDebut": "2024-09-01T00:00:00.000Z",
      "dateFin": "2025-06-30T00:00:00.000Z",
      "estActive": true,
      "createdAt": "2024-08-01T00:00:00.000Z"
    }
  ]
}
```

---

### 9.2 GET /api/annees-scolaires/active

**Description :** Récupère l'année scolaire active

**Auth :** Bearer token requis

**Roles :** Tous

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "annee-uuid-2",
    "libelle": "2024-2025",
    "dateDebut": "2024-09-01T00:00:00.000Z",
    "dateFin": "2025-06-30T00:00:00.000Z",
    "estActive": true,
    "createdAt": "2024-08-01T00:00:00.000Z",
    "_count": {
      "inscriptions": 150,
      "notes": 450,
      "cours": 30
    }
  }
}
```

**Response Error (404) :**
```json
{
  "success": false,
  "error": {
    "message": "Aucune année scolaire active"
  }
}
```

---

### 9.3 POST /api/annees-scolaires

**Description :** Crée une nouvelle année scolaire

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL uniquement

**Request Body :**
```json
{
  "libelle": "2025-2026",
  "dateDebut": "2025-09-01",
  "dateFin": "2026-06-30"
}
```

**Validation :**
- `libelle` : String unique (requis)
- `dateDebut` : Date ISO8601 (requis)
- `dateFin` : Date ISO8601, après dateDebut (requis)

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "id": "annee-uuid-3",
    "libelle": "2025-2026",
    "dateDebut": "2025-09-01T00:00:00.000Z",
    "dateFin": "2026-06-30T00:00:00.000Z",
    "estActive": false,
    "createdAt": "2025-08-01T00:00:00.000Z"
  },
  "message": "Année scolaire créée avec succès"
}
```

---

### 9.4 PATCH /api/annees-scolaires/:id/activer

**Description :** Active une année scolaire (désactive automatiquement l'ancienne)

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL uniquement

**⚠️ IMPORTANT :** Une seule année peut être active à la fois.

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "annee-uuid-3",
    "libelle": "2025-2026",
    "estActive": true,
    "updatedAt": "2025-09-01T08:00:00.000Z"
  },
  "message": "Année scolaire activée avec succès"
}
```

**Exemple cURL :**
```bash
curl -X PATCH http://localhost:4000/api/annees-scolaires/annee-uuid-3/activer \
  -H "Authorization: Bearer ADMIN_GLOBAL_TOKEN"
```

---

### 9.5 PATCH /api/annees-scolaires/:id/desactiver

**Description :** Désactive une année scolaire

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL uniquement

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "annee-uuid-2",
    "libelle": "2024-2025",
    "estActive": false,
    "updatedAt": "2025-09-01T08:00:00.000Z"
  },
  "message": "Année scolaire désactivée avec succès"
}
```

---

## 10. ENDPOINTS API - ENSEIGNANTS

### Base Path
```
/api/enseignants
```

### 10.1 GET /api/enseignants

**Description :** Liste tous les enseignants

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE, ENSEIGNANT

**Response Success (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "enseignant-uuid-1",
      "userId": "user-uuid-1",
      "nom": "Martin",
      "prenom": "Jean",
      "telephone": "+225123456789",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "user-uuid-1",
        "email": "prof.martin@example.com",
        "role": "ENSEIGNANT",
        "isActive": true
      }
    },
    {
      "id": "enseignant-uuid-2",
      "userId": "user-uuid-2",
      "nom": "Dupont",
      "prenom": "Marie",
      "telephone": "+225987654321",
      "createdAt": "2024-01-02T00:00:00.000Z",
      "user": {
        "id": "user-uuid-2",
        "email": "prof.dupont@example.com",
        "role": "ENSEIGNANT",
        "isActive": true
      }
    }
  ]
}
```

---

### 10.2 GET /api/enseignants/:id

**Description :** Récupère un enseignant par ID avec ses départements

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE, ENSEIGNANT

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "enseignant-uuid-1",
    "userId": "user-uuid-1",
    "nom": "Martin",
    "prenom": "Jean",
    "telephone": "+225123456789",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": "user-uuid-1",
      "email": "prof.martin@example.com",
      "role": "ENSEIGNANT",
      "photoUrl": null,
      "isActive": true
    },
    "enseignantDepartements": [
      {
        "id": "ed-uuid-1",
        "departementId": "dep-uuid-1",
        "anneeScolaireId": "annee-uuid-2",
        "estResponsable": true,
        "departement": {
          "id": "dep-uuid-1",
          "nom": "Mathématiques",
          "college": {
            "id": "college-uuid-1",
            "nom": "Collège Einstein"
          }
        },
        "anneeScolaire": {
          "id": "annee-uuid-2",
          "libelle": "2024-2025",
          "estActive": true
        }
      }
    ]
  }
}
```

---

### 10.3 POST /api/enseignants

**Description :** Crée un enseignant (nécessite un compte User existant avec role ENSEIGNANT)

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "userId": "user-uuid-3",
  "nom": "Kouassi",
  "prenom": "Paul",
  "telephone": "+225555123456"
}
```

**Validation :**
- `userId` : UUID valide d'un User avec role ENSEIGNANT (requis)
- `nom` : String non vide (requis)
- `prenom` : String non vide (requis)
- `telephone` : String (optionnel)

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "id": "enseignant-uuid-3",
    "userId": "user-uuid-3",
    "nom": "Kouassi",
    "prenom": "Paul",
    "telephone": "+225555123456",
    "createdAt": "2024-01-15T00:00:00.000Z"
  },
  "message": "Enseignant créé avec succès"
}
```

---

### 10.4 PUT /api/enseignants/:id

**Description :** Met à jour un enseignant

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "nom": "Kouassi",
  "prenom": "Paul-André",
  "telephone": "+225555999888"
}
```

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "enseignant-uuid-3",
    "userId": "user-uuid-3",
    "nom": "Kouassi",
    "prenom": "Paul-André",
    "telephone": "+225555999888",
    "updatedAt": "2024-01-20T00:00:00.000Z"
  },
  "message": "Enseignant mis à jour avec succès"
}
```

---

### 10.5 DELETE /api/enseignants/:id

**Description :** Supprime un enseignant (supprime aussi l'User associé)

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Response Success (200) :**
```json
{
  "success": true,
  "message": "Enseignant supprimé avec succès"
}
```

---

### 10.6 POST /api/enseignants/:id/departements

**Description :** Assigne un enseignant à un département pour une année scolaire

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "departementId": "dep-uuid-1",
  "anneeScolaireId": "annee-uuid-2",
  "estResponsable": true
}
```

**Validation :**
- `departementId` : UUID valide (requis)
- `anneeScolaireId` : UUID valide (requis)
- `estResponsable` : Boolean (optionnel, défaut: false)

**⚠️ IMPORTANT :** Si `estResponsable = true`, l'ancien responsable est automatiquement retiré.

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "id": "ed-uuid-5",
    "enseignantId": "enseignant-uuid-1",
    "departementId": "dep-uuid-1",
    "anneeScolaireId": "annee-uuid-2",
    "estResponsable": true,
    "createdAt": "2024-01-15T00:00:00.000Z"
  },
  "message": "Enseignant assigné au département avec succès"
}
```

**Exemple cURL :**
```bash
curl -X POST http://localhost:4000/api/enseignants/enseignant-uuid-1/departements \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "departementId": "dep-uuid-1",
    "anneeScolaireId": "annee-uuid-2",
    "estResponsable": true
  }'
```

---

### 10.7 DELETE /api/enseignants/:id/departements/:departementId

**Description :** Retire un enseignant d'un département

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Response Success (200) :**
```json
{
  "success": true,
  "message": "Enseignant retiré du département avec succès"
}
```

---

## 11. ENDPOINTS API - ÉTUDIANTS

### Base Path
```
/api/etudiants
```

### 11.1 GET /api/etudiants

**Description :** Liste tous les étudiants

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE, ENSEIGNANT

**Query Params :**
- `search` : Recherche par nom/prénom (optionnel)
- `anneeEntree` : Filtre par année d'entrée (optionnel)

**Response Success (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "etudiant-uuid-1",
      "userId": "user-uuid-10",
      "nom": "Diallo",
      "prenom": "Fatou",
      "dateNais": "2005-03-15T00:00:00.000Z",
      "lieuNais": "Abidjan",
      "telephone": "+225111222333",
      "anneeEntree": 2024,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "user-uuid-10",
        "email": "fatou.diallo@student.com",
        "role": "ETUDIANT",
        "isActive": true
      }
    },
    {
      "id": "etudiant-uuid-2",
      "userId": "user-uuid-11",
      "nom": "Kone",
      "prenom": "Amadou",
      "dateNais": "2006-07-22T00:00:00.000Z",
      "lieuNais": "Bouaké",
      "telephone": "+225444555666",
      "anneeEntree": 2024,
      "createdAt": "2024-01-02T00:00:00.000Z",
      "user": {
        "id": "user-uuid-11",
        "email": "amadou.kone@student.com",
        "role": "ETUDIANT",
        "isActive": true
      }
    }
  ]
}
```

**Exemple avec recherche :**
```bash
curl -X GET "http://localhost:4000/api/etudiants?search=Diallo&anneeEntree=2024" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### 11.2 GET /api/etudiants/:id

**Description :** Récupère un étudiant par ID avec inscriptions et notes

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE, ENSEIGNANT, ETUDIANT (lui-même), PARENT (ses enfants)

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "etudiant-uuid-1",
    "userId": "user-uuid-10",
    "nom": "Diallo",
    "prenom": "Fatou",
    "dateNais": "2005-03-15T00:00:00.000Z",
    "lieuNais": "Abidjan",
    "telephone": "+225111222333",
    "anneeEntree": 2024,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": "user-uuid-10",
      "email": "fatou.diallo@student.com",
      "role": "ETUDIANT",
      "photoUrl": null,
      "isActive": true
    },
    "inscriptions": [
      {
        "id": "inscription-uuid-1",
        "anneeScolaireId": "annee-uuid-2",
        "salleId": "salle-uuid-1",
        "statut": "ACCEPTE",
        "anneeScolaire": {
          "libelle": "2024-2025",
          "estActive": true
        },
        "salle": {
          "nom": "Salle A1",
          "college": {
            "nom": "Collège Einstein"
          }
        }
      }
    ],
    "_count": {
      "notes": 12,
      "inscriptions": 1,
      "parentEtudiants": 2
    }
  }
}
```

---

### 11.3 POST /api/etudiants

**Description :** Crée un étudiant

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "userId": "user-uuid-12",
  "nom": "Traore",
  "prenom": "Aminata",
  "dateNais": "2006-05-10",
  "lieuNais": "Yamoussoukro",
  "telephone": "+225777888999",
  "anneeEntree": 2024
}
```

**Validation :**
- `userId` : UUID valide d'un User avec role ETUDIANT (requis)
- `nom` : String non vide (requis)
- `prenom` : String non vide (requis)
- `dateNais` : Date ISO8601 (optionnel)
- `lieuNais` : String (optionnel)
- `telephone` : String (optionnel)
- `anneeEntree` : Integer (optionnel)

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "id": "etudiant-uuid-3",
    "userId": "user-uuid-12",
    "nom": "Traore",
    "prenom": "Aminata",
    "dateNais": "2006-05-10T00:00:00.000Z",
    "lieuNais": "Yamoussoukro",
    "telephone": "+225777888999",
    "anneeEntree": 2024,
    "createdAt": "2024-01-15T00:00:00.000Z"
  },
  "message": "Étudiant créé avec succès"
}
```

---

### 11.4 PUT /api/etudiants/:id

**Description :** Met à jour un étudiant

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "nom": "Traore",
  "prenom": "Aminata Fatimata",
  "telephone": "+225777999888"
}
```

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "etudiant-uuid-3",
    "nom": "Traore",
    "prenom": "Aminata Fatimata",
    "telephone": "+225777999888",
    "updatedAt": "2024-01-20T00:00:00.000Z"
  },
  "message": "Étudiant mis à jour avec succès"
}
```

---

### 11.5 DELETE /api/etudiants/:id

**Description :** Supprime un étudiant (supprime aussi l'User associé)

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Response Success (200) :**
```json
{
  "success": true,
  "message": "Étudiant supprimé avec succès"
}
```

---

## 12. ENDPOINTS API - MATIÈRES

### Base Path
```
/api/matieres
```

### 12.1 GET /api/matieres

**Description :** Liste toutes les matières (peut être filtrée par département)

**Auth :** Bearer token requis

**Roles :** Tous

**Query Params :**
- `departementId` : UUID du département pour filtrer (optionnel)

**Response Success (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "matiere-uuid-1",
      "nom": "Algèbre",
      "coefficient": 2.0,
      "departementId": "dep-uuid-1",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "departement": {
        "id": "dep-uuid-1",
        "nom": "Mathématiques",
        "college": {
          "nom": "Collège Einstein"
        }
      }
    },
    {
      "id": "matiere-uuid-2",
      "nom": "Géométrie",
      "coefficient": 1.5,
      "departementId": "dep-uuid-1",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "departement": {
        "id": "dep-uuid-1",
        "nom": "Mathématiques",
        "college": {
          "nom": "Collège Einstein"
        }
      }
    }
  ]
}
```

---

### 12.2 GET /api/matieres/:id

**Description :** Récupère une matière par ID

**Auth :** Bearer token requis

**Roles :** Tous

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "matiere-uuid-1",
    "nom": "Algèbre",
    "coefficient": 2.0,
    "departementId": "dep-uuid-1",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "departement": {
      "id": "dep-uuid-1",
      "nom": "Mathématiques",
      "college": {
        "id": "college-uuid-1",
        "nom": "Collège Einstein"
      }
    },
    "_count": {
      "notes": 45,
      "cours": 5
    }
  }
}
```

---

### 12.3 POST /api/matieres

**Description :** Crée une nouvelle matière

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "nom": "Analyse",
  "coefficient": 2.5,
  "departementId": "dep-uuid-1"
}
```

**Validation :**
- `nom` : String non vide (requis)
- `coefficient` : Float positif (optionnel, défaut: 1.0)
- `departementId` : UUID valide (requis)

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "id": "matiere-uuid-3",
    "nom": "Analyse",
    "coefficient": 2.5,
    "departementId": "dep-uuid-1",
    "createdAt": "2024-01-15T00:00:00.000Z"
  },
  "message": "Matière créée avec succès"
}
```

---

### 12.4 PUT /api/matieres/:id

**Description :** Met à jour une matière

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "nom": "Algèbre Linéaire",
  "coefficient": 2.5
}
```

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "matiere-uuid-1",
    "nom": "Algèbre Linéaire",
    "coefficient": 2.5,
    "departementId": "dep-uuid-1",
    "updatedAt": "2024-01-20T00:00:00.000Z"
  },
  "message": "Matière mise à jour avec succès"
}
```

---

### 12.5 DELETE /api/matieres/:id

**Description :** Supprime une matière

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**⚠️ ATTENTION :** Supprime en cascade toutes les notes liées.

**Response Success (200) :**
```json
{
  "success": true,
  "message": "Matière supprimée avec succès"
}
```

---

## 13. ENDPOINTS API - SALLES

### Base Path
```
/api/salles
```

### 13.1 GET /api/salles

**Description :** Liste toutes les salles (filtrées par collège pour ADMIN_COLLEGE)

**Auth :** Bearer token requis

**Roles :** Tous

**Query Params :**
- `collegeId` : UUID du collège pour filtrer (optionnel)

**Response Success (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "salle-uuid-1",
      "nom": "Salle A1",
      "capacite": 30,
      "collegeId": "college-uuid-1",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "college": {
        "id": "college-uuid-1",
        "nom": "Collège Einstein"
      },
      "_count": {
        "inscriptions": 28,
        "cours": 5
      }
    },
    {
      "id": "salle-uuid-2",
      "nom": "Salle B2",
      "capacite": 25,
      "collegeId": "college-uuid-1",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "college": {
        "id": "college-uuid-1",
        "nom": "Collège Einstein"
      },
      "_count": {
        "inscriptions": 22,
        "cours": 4
      }
    }
  ]
}
```

---

### 13.2 GET /api/salles/:id

**Description :** Récupère une salle par ID avec statistiques

**Auth :** Bearer token requis

**Roles :** Tous

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "salle-uuid-1",
    "nom": "Salle A1",
    "capacite": 30,
    "collegeId": "college-uuid-1",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "college": {
      "id": "college-uuid-1",
      "nom": "Collège Einstein",
      "adresse": "123 Science Street"
    },
    "_count": {
      "inscriptions": 28,
      "cours": 5
    }
  }
}
```

---

### 13.3 POST /api/salles

**Description :** Crée une nouvelle salle

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "nom": "Salle C3",
  "capacite": 35,
  "collegeId": "college-uuid-1"
}
```

**Validation :**
- `nom` : String non vide (requis)
- `capacite` : Integer positif (optionnel)
- `collegeId` : UUID valide (requis pour ADMIN_GLOBAL, automatique pour ADMIN_COLLEGE)

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "id": "salle-uuid-3",
    "nom": "Salle C3",
    "capacite": 35,
    "collegeId": "college-uuid-1",
    "createdAt": "2024-01-15T00:00:00.000Z"
  },
  "message": "Salle créée avec succès"
}
```

---

### 13.4 PUT /api/salles/:id

**Description :** Met à jour une salle

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "nom": "Salle A1 - Laboratoire",
  "capacite": 32
}
```

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "salle-uuid-1",
    "nom": "Salle A1 - Laboratoire",
    "capacite": 32,
    "collegeId": "college-uuid-1",
    "updatedAt": "2024-01-20T00:00:00.000Z"
  },
  "message": "Salle mise à jour avec succès"
}
```

---

### 13.5 DELETE /api/salles/:id

**Description :** Supprime une salle

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Response Success (200) :**
```json
{
  "success": true,
  "message": "Salle supprimée avec succès"
}
```

---

## 14. ENDPOINTS API - NOTES

### Base Path
```
/api/notes
```

### 14.1 GET /api/notes

**Description :** Liste toutes les notes (filtrées selon le rôle)

**Auth :** Bearer token requis

**Roles :** Tous

**Query Params :**
- `etudiantId` : UUID étudiant (optionnel)
- `matiereId` : UUID matière (optionnel)
- `anneeScolaireId` : UUID année scolaire (optionnel)

**Comportement par rôle :**
- **ADMIN_GLOBAL / ADMIN_COLLEGE** : Voient toutes les notes
- **ENSEIGNANT** : Voit les notes de ses matières
- **ETUDIANT** : Voit uniquement ses propres notes
- **PARENT** : Voit les notes de ses enfants

**Response Success (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "note-uuid-1",
      "valeur": 15.5,
      "commentaire": "Bon travail",
      "dateNote": "2024-10-15T00:00:00.000Z",
      "etudiantId": "etudiant-uuid-1",
      "matiereId": "matiere-uuid-1",
      "anneeScolaireId": "annee-uuid-2",
      "createdAt": "2024-10-15T00:00:00.000Z",
      "etudiant": {
        "id": "etudiant-uuid-1",
        "nom": "Diallo",
        "prenom": "Fatou"
      },
      "matiere": {
        "id": "matiere-uuid-1",
        "nom": "Algèbre",
        "coefficient": 2.0
      },
      "anneeScolaire": {
        "id": "annee-uuid-2",
        "libelle": "2024-2025",
        "estActive": true
      }
    }
  ]
}
```

**Exemple avec filtres :**
```bash
curl -X GET "http://localhost:4000/api/notes?etudiantId=etudiant-uuid-1&anneeScolaireId=annee-uuid-2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 14.2 GET /api/notes/:id

**Description :** Récupère une note par ID

**Auth :** Bearer token requis

**Roles :** Tous (avec restrictions selon rôle)

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "note-uuid-1",
    "valeur": 15.5,
    "commentaire": "Bon travail",
    "dateNote": "2024-10-15T00:00:00.000Z",
    "etudiantId": "etudiant-uuid-1",
    "matiereId": "matiere-uuid-1",
    "anneeScolaireId": "annee-uuid-2",
    "createdAt": "2024-10-15T00:00:00.000Z",
    "etudiant": {
      "id": "etudiant-uuid-1",
      "nom": "Diallo",
      "prenom": "Fatou",
      "user": {
        "email": "fatou.diallo@student.com"
      }
    },
    "matiere": {
      "id": "matiere-uuid-1",
      "nom": "Algèbre",
      "coefficient": 2.0,
      "departement": {
        "nom": "Mathématiques"
      }
    },
    "anneeScolaire": {
      "id": "annee-uuid-2",
      "libelle": "2024-2025",
      "estActive": true
    }
  }
}
```

---

### 14.3 POST /api/notes

**Description :** Crée une nouvelle note

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE, ENSEIGNANT

**Request Body :**
```json
{
  "etudiantId": "etudiant-uuid-1",
  "matiereId": "matiere-uuid-1",
  "anneeScolaireId": "annee-uuid-2",
  "valeur": 16.0,
  "commentaire": "Excellent progrès"
}
```

**Validation :**
- `etudiantId` : UUID valide (requis)
- `matiereId` : UUID valide (requis)
- `anneeScolaireId` : UUID valide (requis)
- `valeur` : Float entre 0 et 20 (requis)
- `commentaire` : String (optionnel)

**⚠️ IMPORTANT :**
- Un étudiant ne peut avoir qu'UNE note par matière par année
- L'étudiant doit avoir une inscription ACCEPTE pour l'année
- ENSEIGNANT peut créer des notes uniquement pour ses matières

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "id": "note-uuid-5",
    "valeur": 16.0,
    "commentaire": "Excellent progrès",
    "dateNote": "2024-10-20T00:00:00.000Z",
    "etudiantId": "etudiant-uuid-1",
    "matiereId": "matiere-uuid-1",
    "anneeScolaireId": "annee-uuid-2",
    "createdAt": "2024-10-20T00:00:00.000Z"
  },
  "message": "Note créée avec succès"
}
```

**Response Error (409) :**
```json
{
  "success": false,
  "error": {
    "message": "Une note existe déjà pour cet étudiant dans cette matière pour cette année",
    "code": "P2002"
  }
}
```

---

### 14.4 PUT /api/notes/:id

**Description :** Met à jour une note existante

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE, ENSEIGNANT (ses matières)

**Request Body :**
```json
{
  "valeur": 17.0,
  "commentaire": "Très bon travail, progression constante"
}
```

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "note-uuid-5",
    "valeur": 17.0,
    "commentaire": "Très bon travail, progression constante",
    "dateNote": "2024-10-20T00:00:00.000Z",
    "updatedAt": "2024-10-21T00:00:00.000Z"
  },
  "message": "Note mise à jour avec succès"
}
```

---

### 14.5 DELETE /api/notes/:id

**Description :** Supprime une note

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Response Success (200) :**
```json
{
  "success": true,
  "message": "Note supprimée avec succès"
}
```

---

### 14.6 GET /api/notes/statistiques/:etudiantId/:anneeScolaireId

**Description :** Récupère les statistiques d'un étudiant pour une année

**Auth :** Bearer token requis

**Roles :** Tous (avec restrictions selon rôle)

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "etudiant": {
      "id": "etudiant-uuid-1",
      "nom": "Diallo",
      "prenom": "Fatou",
      "user": {
        "email": "fatou.diallo@student.com"
      }
    },
    "anneeScolaire": {
      "id": "annee-uuid-2",
      "libelle": "2024-2025",
      "estActive": true
    },
    "notes": [
      {
        "id": "note-uuid-1",
        "valeur": 15.5,
        "matiere": {
          "nom": "Algèbre",
          "coefficient": 2.0
        },
        "dateNote": "2024-10-15T00:00:00.000Z"
      },
      {
        "id": "note-uuid-2",
        "valeur": 14.0,
        "matiere": {
          "nom": "Géométrie",
          "coefficient": 1.5
        },
        "dateNote": "2024-10-20T00:00:00.000Z"
      },
      {
        "id": "note-uuid-3",
        "valeur": 16.5,
        "matiere": {
          "nom": "Analyse",
          "coefficient": 2.5
        },
        "dateNote": "2024-10-22T00:00:00.000Z"
      }
    ],
    "statistiques": {
      "moyenne": 15.42,
      "nombreNotes": 3,
      "noteMin": 14.0,
      "noteMax": 16.5,
      "totalCoefficients": 6.0,
      "moyennePonderee": 15.46
    }
  }
}
```

**Exemple cURL :**
```bash
curl -X GET http://localhost:4000/api/notes/statistiques/etudiant-uuid-1/annee-uuid-2 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 15. ENDPOINTS API - PARENTS

### Base Path
```
/api/parents
```

### 15.1 GET /api/parents

**Description :** Liste tous les parents

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Response Success (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "parent-uuid-1",
      "userId": "user-uuid-20",
      "nom": "Diallo",
      "prenom": "Ibrahim",
      "telephone": "+225333444555",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "user-uuid-20",
        "email": "ibrahim.diallo@parent.com",
        "role": "PARENT",
        "isActive": true
      },
      "_count": {
        "parentEtudiants": 2
      }
    }
  ]
}
```

---

### 15.2 GET /api/parents/:id

**Description :** Récupère un parent par ID avec ses enfants

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE, PARENT (lui-même)

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "parent-uuid-1",
    "userId": "user-uuid-20",
    "nom": "Diallo",
    "prenom": "Ibrahim",
    "telephone": "+225333444555",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": "user-uuid-20",
      "email": "ibrahim.diallo@parent.com",
      "role": "PARENT",
      "isActive": true
    },
    "parentEtudiants": [
      {
        "id": "pe-uuid-1",
        "etudiantId": "etudiant-uuid-1",
        "etudiant": {
          "id": "etudiant-uuid-1",
          "nom": "Diallo",
          "prenom": "Fatou",
          "anneeEntree": 2024,
          "user": {
            "email": "fatou.diallo@student.com"
          }
        }
      },
      {
        "id": "pe-uuid-2",
        "etudiantId": "etudiant-uuid-10",
        "etudiant": {
          "id": "etudiant-uuid-10",
          "nom": "Diallo",
          "prenom": "Mamadou",
          "anneeEntree": 2022,
          "user": {
            "email": "mamadou.diallo@student.com"
          }
        }
      }
    ]
  }
}
```

---

### 15.3 POST /api/parents

**Description :** Crée un parent

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "userId": "user-uuid-21",
  "nom": "Kone",
  "prenom": "Mariam",
  "telephone": "+225666777888"
}
```

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "id": "parent-uuid-2",
    "userId": "user-uuid-21",
    "nom": "Kone",
    "prenom": "Mariam",
    "telephone": "+225666777888",
    "createdAt": "2024-01-15T00:00:00.000Z"
  },
  "message": "Parent créé avec succès"
}
```

---

### 15.4 PUT /api/parents/:id

**Description :** Met à jour un parent

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "nom": "Kone",
  "prenom": "Mariam Fatoumata",
  "telephone": "+225666888999"
}
```

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "parent-uuid-2",
    "nom": "Kone",
    "prenom": "Mariam Fatoumata",
    "telephone": "+225666888999",
    "updatedAt": "2024-01-20T00:00:00.000Z"
  },
  "message": "Parent mis à jour avec succès"
}
```

---

### 15.5 DELETE /api/parents/:id

**Description :** Supprime un parent

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Response Success (200) :**
```json
{
  "success": true,
  "message": "Parent supprimé avec succès"
}
```

---

### 15.6 POST /api/parents/:id/enfants

**Description :** Lie un enfant (étudiant) à un parent

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "etudiantId": "etudiant-uuid-5"
}
```

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "id": "pe-uuid-5",
    "parentId": "parent-uuid-1",
    "etudiantId": "etudiant-uuid-5",
    "createdAt": "2024-01-15T00:00:00.000Z"
  },
  "message": "Enfant lié au parent avec succès"
}
```

**Exemple cURL :**
```bash
curl -X POST http://localhost:4000/api/parents/parent-uuid-1/enfants \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "etudiantId": "etudiant-uuid-5"
  }'
```

---

### 15.7 DELETE /api/parents/:id/enfants/:etudiantId

**Description :** Retire la liaison entre un parent et un enfant

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Response Success (200) :**
```json
{
  "success": true,
  "message": "Enfant retiré du parent avec succès"
}
```

---

## 16. ENDPOINTS API - INSCRIPTIONS

### Base Path
```
/api/inscriptions
```

### 16.1 GET /api/inscriptions

**Description :** Liste toutes les inscriptions (filtrées selon le rôle)

**Auth :** Bearer token requis

**Roles :** Tous

**Query Params :**
- `anneeScolaireId` : UUID année scolaire (optionnel)
- `statut` : EN_ATTENTE, ACCEPTE, REFUSE (optionnel)
- `etudiantId` : UUID étudiant (optionnel)

**Response Success (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "inscription-uuid-1",
      "etudiantId": "etudiant-uuid-1",
      "anneeScolaireId": "annee-uuid-2",
      "salleId": "salle-uuid-1",
      "statut": "ACCEPTE",
      "createdAt": "2024-08-15T00:00:00.000Z",
      "updatedAt": "2024-08-20T00:00:00.000Z",
      "etudiant": {
        "id": "etudiant-uuid-1",
        "nom": "Diallo",
        "prenom": "Fatou",
        "user": {
          "email": "fatou.diallo@student.com"
        }
      },
      "anneeScolaire": {
        "id": "annee-uuid-2",
        "libelle": "2024-2025",
        "estActive": true
      },
      "salle": {
        "id": "salle-uuid-1",
        "nom": "Salle A1",
        "college": {
          "nom": "Collège Einstein"
        }
      }
    }
  ]
}
```

---

### 16.2 GET /api/inscriptions/demandes-en-attente

**Description :** Liste les demandes d'inscription en attente

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Comportement :**
- **ADMIN_GLOBAL** : Voit toutes les demandes en attente
- **ADMIN_COLLEGE** : Voit uniquement les demandes pour son collège

**Response Success (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "inscription-uuid-10",
      "etudiantId": "etudiant-uuid-15",
      "anneeScolaireId": "annee-uuid-2",
      "salleId": null,
      "statut": "EN_ATTENTE",
      "createdAt": "2024-08-25T00:00:00.000Z",
      "etudiant": {
        "id": "etudiant-uuid-15",
        "nom": "Traore",
        "prenom": "Aminata",
        "anneeEntree": 2024,
        "user": {
          "email": "aminata.traore@student.com",
          "telephone": "+225777888999"
        }
      },
      "anneeScolaire": {
        "id": "annee-uuid-2",
        "libelle": "2024-2025",
        "estActive": true
      }
    }
  ]
}
```

---

### 16.3 GET /api/inscriptions/:id

**Description :** Récupère une inscription par ID

**Auth :** Bearer token requis

**Roles :** Tous (avec restrictions)

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "inscription-uuid-1",
    "etudiantId": "etudiant-uuid-1",
    "anneeScolaireId": "annee-uuid-2",
    "salleId": "salle-uuid-1",
    "statut": "ACCEPTE",
    "createdAt": "2024-08-15T00:00:00.000Z",
    "updatedAt": "2024-08-20T00:00:00.000Z",
    "etudiant": {
      "id": "etudiant-uuid-1",
      "nom": "Diallo",
      "prenom": "Fatou",
      "dateNais": "2005-03-15T00:00:00.000Z",
      "anneeEntree": 2024,
      "user": {
        "id": "user-uuid-10",
        "email": "fatou.diallo@student.com",
        "photoUrl": null
      }
    },
    "anneeScolaire": {
      "id": "annee-uuid-2",
      "libelle": "2024-2025",
      "dateDebut": "2024-09-01T00:00:00.000Z",
      "dateFin": "2025-06-30T00:00:00.000Z",
      "estActive": true
    },
    "salle": {
      "id": "salle-uuid-1",
      "nom": "Salle A1",
      "capacite": 30,
      "college": {
        "id": "college-uuid-1",
        "nom": "Collège Einstein",
        "adresse": "123 Science Street"
      }
    }
  }
}
```

---

### 16.4 POST /api/inscriptions/demandes

**Description :** Soumet une demande d'inscription (pour ETUDIANT)

**Auth :** Bearer token requis

**Roles :** ETUDIANT

**Request Body :**
```json
{
  "collegeId": "college-uuid-1",
  "anneeScolaireId": "annee-uuid-2"
}
```

**Validation :**
- `collegeId` : UUID valide (requis)
- `anneeScolaireId` : UUID valide, année active (requis)

**Comportement :**
- Crée une inscription avec statut EN_ATTENTE
- L'étudiant ne peut avoir qu'UNE inscription par année
- salleId est null (sera assignée par admin lors de l'acceptation)

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "id": "inscription-uuid-11",
    "etudiantId": "etudiant-uuid-16",
    "anneeScolaireId": "annee-uuid-2",
    "salleId": null,
    "statut": "EN_ATTENTE",
    "createdAt": "2024-08-26T00:00:00.000Z"
  },
  "message": "Demande d'inscription soumise avec succès"
}
```

**Response Error (409) :**
```json
{
  "success": false,
  "error": {
    "message": "Vous avez déjà une inscription pour cette année scolaire"
  }
}
```

**Exemple cURL :**
```bash
curl -X POST http://localhost:4000/api/inscriptions/demandes \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collegeId": "college-uuid-1",
    "anneeScolaireId": "annee-uuid-2"
  }'
```

---

### 16.5 PATCH /api/inscriptions/:id/reponse

**Description :** Répond à une demande d'inscription (accepter/refuser)

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body (Accepter) :**
```json
{
  "statut": "ACCEPTE",
  "salleId": "salle-uuid-2"
}
```

**Request Body (Refuser) :**
```json
{
  "statut": "REFUSE"
}
```

**Validation :**
- `statut` : "ACCEPTE" ou "REFUSE" (requis)
- `salleId` : UUID valide (requis si ACCEPTE, interdit si REFUSE)

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "inscription-uuid-11",
    "etudiantId": "etudiant-uuid-16",
    "anneeScolaireId": "annee-uuid-2",
    "salleId": "salle-uuid-2",
    "statut": "ACCEPTE",
    "updatedAt": "2024-08-27T00:00:00.000Z"
  },
  "message": "Demande d'inscription acceptée avec succès"
}
```

**Exemple cURL :**
```bash
# Accepter
curl -X PATCH http://localhost:4000/api/inscriptions/inscription-uuid-11/reponse \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "statut": "ACCEPTE",
    "salleId": "salle-uuid-2"
  }'

# Refuser
curl -X PATCH http://localhost:4000/api/inscriptions/inscription-uuid-11/reponse \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "statut": "REFUSE"
  }'
```

---

### 16.6 POST /api/inscriptions

**Description :** Crée une inscription directement (pour ADMIN)

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "etudiantId": "etudiant-uuid-5",
  "anneeScolaireId": "annee-uuid-2",
  "salleId": "salle-uuid-1",
  "statut": "ACCEPTE"
}
```

**Response Success (201) :**
```json
{
  "success": true,
  "data": {
    "id": "inscription-uuid-12",
    "etudiantId": "etudiant-uuid-5",
    "anneeScolaireId": "annee-uuid-2",
    "salleId": "salle-uuid-1",
    "statut": "ACCEPTE",
    "createdAt": "2024-08-28T00:00:00.000Z"
  },
  "message": "Inscription créée avec succès"
}
```

---

### 16.7 PUT /api/inscriptions/:id

**Description :** Met à jour une inscription

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Request Body :**
```json
{
  "salleId": "salle-uuid-3",
  "statut": "ACCEPTE"
}
```

**Response Success (200) :**
```json
{
  "success": true,
  "data": {
    "id": "inscription-uuid-1",
    "salleId": "salle-uuid-3",
    "statut": "ACCEPTE",
    "updatedAt": "2024-08-29T00:00:00.000Z"
  },
  "message": "Inscription mise à jour avec succès"
}
```

---

### 16.8 DELETE /api/inscriptions/:id

**Description :** Supprime une inscription

**Auth :** Bearer token requis

**Roles :** ADMIN_GLOBAL, ADMIN_COLLEGE

**Response Success (200) :**
```json
{
  "success": true,
  "message": "Inscription supprimée avec succès"
}
```

---

## 17. MIDDLEWARE & SÉCURITÉ

### 17.1 Authentication Middleware (`authenticate`)

**Fichier :** `src/middlewares/auth.middleware.ts`

**Fonctionnement :**
1. Extrait le token du header `Authorization: Bearer {token}`
2. Vérifie la signature JWT avec JWT_SECRET
3. Décode le payload
4. Attache les données user à `req.user`
5. Lance UnauthorizedError si token invalide/expiré

**Utilisation :**
```typescript
router.get('/protected', authenticate, controller.method);
```

**Données disponibles dans `req.user` :**
```typescript
{
  id: string;        // UUID de l'utilisateur
  email: string;     // Email
  role: Role;        // Rôle (enum)
  collegeId?: string; // ID du collège (seulement pour ADMIN_COLLEGE)
}
```

**Erreurs lancées :**
- `401` : Token manquant ou invalide
- `401` : Token expiré

---

### 17.2 RBAC Middleware (Role-Based Access Control)

**Fichier :** `src/middlewares/rbac.middleware.ts`

**Fonctions disponibles :**

#### `requireAdminGlobal`
- Autorise uniquement ADMIN_GLOBAL
- Usage : Routes d'administration globale (créer collèges, activer années scolaires)

```typescript
router.post('/colleges', authenticate, requireAdminGlobal, controller.create);
```

#### `requireAdmin`
- Autorise ADMIN_GLOBAL et ADMIN_COLLEGE
- Usage : Routes d'administration de collège

```typescript
router.post('/departements', authenticate, requireAdmin, controller.create);
```

#### `requireEnseignant`
- Autorise uniquement ENSEIGNANT
- Usage : Routes spécifiques aux enseignants

```typescript
router.get('/mes-cours', authenticate, requireEnseignant, controller.getMyCourses);
```

#### `requireRole(...roles)`
- Autorise une liste custom de rôles
- Usage : Routes avec permissions complexes

```typescript
router.get(
  '/notes',
  authenticate,
  requireRole('ADMIN_GLOBAL', 'ADMIN_COLLEGE', 'ENSEIGNANT', 'ETUDIANT', 'PARENT'),
  controller.list
);
```

**Erreurs lancées :**
- `403` : Accès interdit (rôle non autorisé)

---

### 17.3 Validation Middleware

**Fichier :** `src/middlewares/validate.middleware.ts`

**Fonctionnement :**
- Utilise Zod pour valider les données entrantes
- Valide `req.body`, `req.params`, `req.query`
- Retourne erreur 400 si validation échoue

**Utilisation :**
```typescript
import { loginSchema } from '../utils/validators.js';

router.post(
  '/login',
  validate(loginSchema),
  authController.login
);
```

**Exemple de schéma Zod :**
```typescript
// src/utils/validators.ts
import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Mot de passe trop court')
  })
});

export const createNoteSchema = z.object({
  body: z.object({
    etudiantId: z.string().uuid(),
    matiereId: z.string().uuid(),
    anneeScolaireId: z.string().uuid(),
    valeur: z.number().min(0).max(20),
    commentaire: z.string().optional()
  })
});
```

**Erreur de validation :**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "email": ["Email invalide"],
      "password": ["Mot de passe trop court"]
    }
  }
}
```

---

### 17.4 CORS Configuration

**Configuration :** Whitelist d'origines autorisées

```typescript
// src/index.ts
const allowedOrigins = [
  'http://localhost:3000',      // Frontend web dev
  'http://localhost:19006',     // Expo dev
  'capacitor://localhost',      // Capacitor (iOS/Android)
  'http://localhost:3002'       // Frontend web (autre port)
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

---

### 17.5 Sécurité Implémentée ✅

1. **Hash Passwords** : bcrypt avec 10 rounds
2. **JWT Signatures** : Tous les tokens sont signés avec JWT_SECRET
3. **Input Validation** : Zod schemas sur tous les endpoints
4. **CORS Whitelist** : Origines autorisées uniquement
5. **SQL Injection Protection** : Prisma ORM (requêtes paramétrées)
6. **Cascading Deletes** : Suppression propre des relations
7. **Role-Based Access** : Permissions strictes par rôle
8. **Active User Check** : Vérification isActive dans auth

---

### 17.6 Sécurité À Implémenter 🔄

1. **Rate Limiting** : Limiter les requêtes par IP/user
2. **Helmet.js** : Headers de sécurité HTTP
3. **Logging** : Winston ou Pino pour logs structurés
4. **Error Monitoring** : Sentry pour tracking des erreurs
5. **Refresh Token Rotation** : Nouveaux refresh tokens à chaque refresh
6. **HTTP-Only Cookies** : Stocker refresh token en cookie sécurisé
7. **2FA** : Authentification à deux facteurs (optionnel)
8. **Audit Logs** : Tracer toutes les actions admin
9. **Password Reset** : Flow de réinitialisation par email
10. **Email Verification** : Vérifier email lors de l'inscription

---

## 18. RÈGLES MÉTIER CRITIQUES

### 18.1 ⚠️ RÈGLE ABSOLUE : Filtrage Année Scolaire

**Principe :** Toutes les requêtes de notes et inscriptions DOIVENT filtrer par `anneeScolaireId`

**❌ MAUVAIS (Mélange toutes les années) :**
```typescript
const notes = await prisma.note.findMany({
  where: { etudiantId: studentId }
});
```

**✅ BON (Filtrage par année) :**
```typescript
const anneActive = await prisma.anneeScolaire.findFirst({
  where: { estActive: true }
});

if (!anneActive) {
  throw new NotFoundError("Aucune année scolaire active");
}

const notes = await prisma.note.findMany({
  where: {
    etudiantId: studentId,
    anneeScolaireId: anneActive.id  // OBLIGATOIRE
  }
});
```

**Raison :**
- Les notes sont spécifiques à une année scolaire
- Un étudiant peut avoir plusieurs notes pour la même matière sur différentes années
- Le calcul de moyenne DOIT être fait année par année
- Les inscriptions sont annuelles

---

### 18.2 Isolation Multi-Collège

**Principe :** Tous les collèges dans la même DB, mais isolation stricte des données

**Implémentation pour ADMIN_COLLEGE :**
```typescript
// 1. Récupérer le collège de l'admin
const adminCollege = await prisma.adminCollege.findUnique({
  where: { userId: req.user.id }
});

if (!adminCollege) {
  throw new ForbiddenError("Admin college non trouvé");
}

// 2. Filtrer TOUTES les requêtes par collegeId
const departements = await prisma.departement.findMany({
  where: { collegeId: adminCollege.collegeId }
});

const salles = await prisma.salle.findMany({
  where: { collegeId: adminCollege.collegeId }
});
```

**⚠️ ADMIN_GLOBAL** : Pas de filtrage, voit tous les collèges

**Cas complexe : Enseignants et Étudiants**
- Enseignants/Étudiants ne sont pas directement liés à un collège
- Ils sont liés via Département → College ou Salle → College
- Filtrage via JOIN :

```typescript
// Pour ADMIN_COLLEGE : lister les étudiants de son collège
const etudiants = await prisma.etudiant.findMany({
  where: {
    inscriptions: {
      some: {
        salle: {
          collegeId: adminCollege.collegeId
        }
      }
    }
  }
});
```

---

### 18.3 Contrainte Unicité Notes

**Règle :** UN étudiant = UNE note par matière par année

**Contrainte DB :**
```prisma
model Note {
  // ...
  @@unique([etudiantId, matiereId, anneeScolaireId])
}
```

**Comportement :**
- Tentative de créer une 2ème note pour même (étudiant, matière, année) → Erreur P2002
- Pour modifier une note : utiliser UPDATE, pas CREATE

**Gestion dans le code :**
```typescript
// Créer une note
try {
  const note = await prisma.note.create({
    data: {
      etudiantId,
      matiereId,
      anneeScolaireId,
      valeur,
      commentaire
    }
  });
} catch (error) {
  if (error.code === 'P2002') {
    throw new ConflictError(
      "Une note existe déjà pour cet étudiant dans cette matière pour cette année"
    );
  }
  throw error;
}
```

---

### 18.4 Prérequis Inscription

**Règle :** Un étudiant DOIT avoir une inscription active (ACCEPTE) pour :
- Recevoir des notes
- Apparaître dans les listes de classe
- Calculer les moyennes

**Vérification avant création de note :**
```typescript
// Vérifier inscription active
const inscription = await prisma.inscription.findFirst({
  where: {
    etudiantId: studentId,
    anneeScolaireId: activeYearId,
    statut: 'ACCEPTE'
  }
});

if (!inscription) {
  throw new BadRequestError(
    "L'étudiant n'a pas d'inscription acceptée pour cette année"
  );
}

// Créer la note
const note = await prisma.note.create({ /* ... */ });
```

**Flow d'inscription :**
1. Étudiant soumet demande (statut: EN_ATTENTE, salleId: null)
2. Admin consulte demandes en attente
3. Admin accepte (statut: ACCEPTE, salleId: assignée) ou refuse (statut: REFUSE)
4. Si accepté, étudiant peut recevoir des notes

---

### 18.5 Responsable de Département

**Règle :** UN enseignant responsable par département par année

**Index DB :**
```prisma
@@index([departementId, anneeScolaireId, estResponsable])
```

**Validation lors de l'assignation :**
```typescript
// Avant d'assigner un responsable, désassigner l'ancien
if (estResponsable) {
  // Retirer le flag responsable de l'ancien
  await prisma.enseignantDepartement.updateMany({
    where: {
      departementId: deptId,
      anneeScolaireId: yearId,
      estResponsable: true
    },
    data: { estResponsable: false }
  });
}

// Créer la nouvelle assignation
await prisma.enseignantDepartement.create({
  data: {
    enseignantId: teacherId,
    departementId: deptId,
    anneeScolaireId: yearId,
    estResponsable: estResponsable
  }
});
```

---

### 18.6 Année Scolaire Active Unique

**Règle :** UNE seule année scolaire peut être active (`estActive = true`) à la fois

**Validation lors de l'activation :**
```typescript
// Désactiver toutes les années
await prisma.anneeScolaire.updateMany({
  where: { estActive: true },
  data: { estActive: false }
});

// Activer la nouvelle
await prisma.anneeScolaire.update({
  where: { id: yearId },
  data: { estActive: true }
});
```

**Impact :**
- L'année active détermine l'année par défaut pour les nouvelles notes/inscriptions
- Les endpoints qui ne spécifient pas d'année utilisent l'année active

---

## 19. FORMATS DE RÉPONSE

### 19.1 Success Response

**Format standard :**
```json
{
  "success": true,
  "data": { /* payload */ },
  "message": "Optional success message"
}
```

**Exemples :**

**Liste (array) :**
```json
{
  "success": true,
  "data": [
    { "id": "1", "nom": "Item 1" },
    { "id": "2", "nom": "Item 2" }
  ]
}
```

**Objet unique :**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nom": "Collège Einstein",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Avec message :**
```json
{
  "success": true,
  "data": { "id": "uuid", "nom": "..." },
  "message": "Collège créé avec succès"
}
```

**Suppression :**
```json
{
  "success": true,
  "message": "Collège supprimé avec succès"
}
```

---

### 19.2 Error Response

**Format standard :**
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": { /* optional */ }
  }
}
```

**Exemples :**

**Erreur simple :**
```json
{
  "success": false,
  "error": {
    "message": "Collège non trouvé"
  }
}
```

**Erreur avec code :**
```json
{
  "success": false,
  "error": {
    "message": "Email déjà utilisé",
    "code": "P2002"
  }
}
```

**Erreur de validation :**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "email": ["Format email invalide"],
      "password": ["Minimum 8 caractères requis"]
    }
  }
}
```

---

### 19.3 Pagination Response (si implémenté)

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Note :** La pagination n'est pas implémentée actuellement mais peut être ajoutée.

---

## 20. CODES D'ERREUR

### 20.1 Codes HTTP

| Code | Nom | Signification | Exemple |
|------|-----|---------------|---------|
| 200 | OK | Requête réussie | GET, PUT, DELETE réussis |
| 201 | Created | Ressource créée | POST réussi |
| 400 | Bad Request | Données invalides | Validation échouée |
| 401 | Unauthorized | Non authentifié | Token manquant/invalide |
| 403 | Forbidden | Accès interdit | Permissions insuffisantes |
| 404 | Not Found | Ressource non trouvée | ID inexistant |
| 409 | Conflict | Conflit de ressource | Email déjà utilisé |
| 422 | Unprocessable Entity | Erreur sémantique | Validation métier |
| 500 | Internal Server Error | Erreur serveur | Bug backend |

---

### 20.2 Classes d'Erreur Custom

**Fichier :** `src/utils/errors.ts`

```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Non authentifié") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Accès interdit") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Ressource non trouvée") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
```

---

### 20.3 Codes Prisma Fréquents

| Code | Signification | Action |
|------|---------------|--------|
| P2002 | Contrainte unique violée | Conflict 409 - Email/Libellé déjà utilisé |
| P2025 | Enregistrement non trouvé | Not Found 404 |
| P2003 | Violation clé étrangère | Bad Request 400 - ID référencé inexistant |
| P2014 | Violation relation requise | Bad Request 400 |
| P2028 | Timeout transaction | Internal Error 500 |

**Gestion dans le code :**
```typescript
try {
  await prisma.college.create({ data });
} catch (error) {
  if (error.code === 'P2002') {
    throw new ConflictError("Ce nom de collège existe déjà");
  }
  if (error.code === 'P2025') {
    throw new NotFoundError("Collège non trouvé");
  }
  throw error;
}
```

---

## 21. EXEMPLES D'UTILISATION

### 21.1 Scénario Complet : Inscription Étudiant

#### Étape 1 : L'étudiant s'inscrit au système

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "fatou.diallo@student.com",
    "password": "password123",
    "role": "ETUDIANT",
    "nom": "Diallo",
    "prenom": "Fatou",
    "telephone": "+225111222333",
    "dateNais": "2005-03-15",
    "lieuNais": "Abidjan",
    "anneeEntree": 2024
  }'

# Response: User + tokens
# Sauvegarder le accessToken pour les prochaines requêtes
```

#### Étape 2 : Étudiant soumet demande d'inscription

```bash
# Récupérer l'année scolaire active
curl -X GET http://localhost:4000/api/annees-scolaires/active \
  -H "Authorization: Bearer STUDENT_TOKEN"

# Response: { "id": "annee-uuid-2", "libelle": "2024-2025", "estActive": true }

# Soumettre la demande
curl -X POST http://localhost:4000/api/inscriptions/demandes \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collegeId": "college-uuid-1",
    "anneeScolaireId": "annee-uuid-2"
  }'

# Response: Demande créée avec statut EN_ATTENTE, salleId null
```

#### Étape 3 : Admin consulte les demandes en attente

```bash
curl -X GET http://localhost:4000/api/inscriptions/demandes-en-attente \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Response: Liste des demandes EN_ATTENTE avec infos étudiants
```

#### Étape 4 : Admin accepte la demande

```bash
curl -X PATCH http://localhost:4000/api/inscriptions/{inscription-id}/reponse \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "statut": "ACCEPTE",
    "salleId": "salle-uuid-1"
  }'

# Response: Inscription mise à jour avec statut ACCEPTE et salle assignée
```

#### Étape 5 : Enseignant entre une note

```bash
curl -X POST http://localhost:4000/api/notes \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "etudiantId": "etudiant-uuid-1",
    "matiereId": "matiere-uuid-1",
    "anneeScolaireId": "annee-uuid-2",
    "valeur": 15.5,
    "commentaire": "Très bon travail"
  }'

# Response: Note créée avec succès
```

#### Étape 6 : Étudiant consulte ses notes

```bash
curl -X GET "http://localhost:4000/api/notes?etudiantId=etudiant-uuid-1&anneeScolaireId=annee-uuid-2" \
  -H "Authorization: Bearer STUDENT_TOKEN"

# Response: Liste des notes de l'étudiant pour l'année
```

#### Étape 7 : Consulter les statistiques

```bash
curl -X GET http://localhost:4000/api/notes/statistiques/etudiant-uuid-1/annee-uuid-2 \
  -H "Authorization: Bearer STUDENT_TOKEN"

# Response: Notes + moyenne + stats détaillées
```

---

### 21.2 Scénario : Gestion Département par Admin

```bash
# 1. Admin crée un département
curl -X POST http://localhost:4000/api/departements \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Informatique",
    "collegeId": "college-uuid-1"
  }'

# Response: { "id": "dep-uuid-5", "nom": "Informatique", ... }

# 2. Admin crée des matières dans le département
curl -X POST http://localhost:4000/api/matieres \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Programmation Python",
    "coefficient": 3.0,
    "departementId": "dep-uuid-5"
  }'

curl -X POST http://localhost:4000/api/matieres \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Bases de Données",
    "coefficient": 2.5,
    "departementId": "dep-uuid-5"
  }'

# 3. Admin assigne un enseignant comme responsable
curl -X POST http://localhost:4000/api/enseignants/enseignant-uuid-3/departements \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "departementId": "dep-uuid-5",
    "anneeScolaireId": "annee-uuid-2",
    "estResponsable": true
  }'

# Response: Enseignant assigné comme responsable
```

---

### 21.3 Scénario : Parent Consulte Notes de Son Enfant

```bash
# 1. Parent se connecte
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent.diallo@example.com",
    "password": "password123"
  }'

# Response: tokens

# 2. Parent récupère ses infos (avec liste enfants)
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer PARENT_TOKEN"

# 3. Parent consulte les notes d'un enfant
curl -X GET "http://localhost:4000/api/notes?etudiantId=etudiant-uuid-1&anneeScolaireId=annee-uuid-2" \
  -H "Authorization: Bearer PARENT_TOKEN"

# Response: Notes de l'enfant (filtré automatiquement)

# 4. Parent consulte les statistiques
curl -X GET http://localhost:4000/api/notes/statistiques/etudiant-uuid-1/annee-uuid-2 \
  -H "Authorization: Bearer PARENT_TOKEN"

# Response: Moyenne et statistiques de l'enfant
```

---

## 22. TESTS & SEEDS

### 22.1 Comptes de Test (après seed)

| Rôle | Email | Password | Accès | Collège |
|------|-------|----------|--------|---------|
| Admin Global | `admin@academy.com` | `password123` | Tous collèges | N/A |
| Admin Einstein | `admin.einstein@academy.com` | `password123` | Collège Einstein | Einstein |
| Admin Curie | `admin.curie@academy.com` | `password123` | Collège Curie | Curie |
| Enseignant | `prof.martin@academy.com` | `password123` | Ses matières | Einstein |
| Étudiant | `fatou.diallo@student.com` | `password123` | Ses notes | Einstein |
| Parent | `parent.diallo@example.com` | `password123` | Notes enfants | N/A |

---

### 22.2 Données Seed

**Collèges :**
- Collège Einstein (Sciences)
- Collège Marie Curie (Sciences et Lettres)

**Départements (Einstein) :**
- Mathématiques
- Physique
- Informatique

**Départements (Curie) :**
- Mathématiques
- Lettres

**Années Scolaires :**
- 2023-2024 (inactive)
- 2024-2025 (ACTIVE) ← Année par défaut
- 2025-2026 (future, inactive)

**Matières (Mathématiques Einstein) :**
- Algèbre (coefficient 2.0)
- Géométrie (coefficient 1.5)
- Analyse (coefficient 2.5)

**Salles (Einstein) :**
- Salle A1 (capacité 30)
- Salle A2 (capacité 25)
- Salle B1 (capacité 32)

**Enseignants :**
- Prof. Jean Martin (Mathématiques, responsable)
- Prof. Marie Dupont (Physique)

**Étudiants :**
- Fatou Diallo (inscrite, Salle A1, avec notes)
- Amadou Kone (inscrit, Salle A2)
- Aminata Traore (demande en attente)

**Parents :**
- Ibrahim Diallo (parent de Fatou Diallo)

**Notes (Fatou Diallo, 2024-2025) :**
- Algèbre : 15.5
- Géométrie : 14.0
- Analyse : 16.5

---

### 22.3 Commandes Test

```bash
# Reset DB + seed
npm run db:reset
# ou
pnpm db:reset

# Prisma Studio (GUI pour voir les données)
npm run prisma:studio
# ou
pnpm prisma:studio

# Test login admin global
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@academy.com", "password": "password123"}'

# Test création collège (avec token admin)
curl -X POST http://localhost:4000/api/colleges \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nom": "Test College", "adresse": "Test Address"}'
```

---

## 23. VARIABLES D'ENVIRONNEMENT

### 23.1 Fichier .env

```env
# ======================
# DATABASE
# ======================
DATABASE_URL="postgresql://user:password@localhost:5432/academy_db?schema=public"

# Pour production avec SSL
# DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"

# ======================
# JWT AUTHENTICATION
# ======================
JWT_SECRET="your_super_secret_key_change_in_production_min_32_chars"
JWT_EXPIRES_IN="7d"              # Access token expiration
JWT_REFRESH_EXPIRES_IN="30d"     # Refresh token expiration

# ======================
# SERVER
# ======================
PORT=4000
NODE_ENV="development"           # development | production | test

# ======================
# CORS
# ======================
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3002,http://localhost:19006,capacitor://localhost"

# ======================
# UPLOAD (Optionnel - Cloudinary)
# ======================
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# ======================
# UPLOAD LOCAL
# ======================
UPLOAD_DIR="uploads"
MAX_FILE_SIZE=5242880  # 5MB en bytes

# ======================
# LOGGING (À implémenter)
# ======================
LOG_LEVEL="info"                 # error | warn | info | debug
LOG_FILE="logs/app.log"
```

---

### 23.2 Configuration Requise

**Variables OBLIGATOIRES :**
- `DATABASE_URL` : Connexion PostgreSQL
- `JWT_SECRET` : Secret pour signer les tokens (min 32 caractères)
- `PORT` : Port du serveur (défaut: 4000)

**Variables RECOMMANDÉES :**
- `NODE_ENV` : Environnement (development/production)
- `ALLOWED_ORIGINS` : Liste des origines autorisées pour CORS

**Variables OPTIONNELLES :**
- Upload Cloudinary (si upload de fichiers activé)
- Logging (si système de logs implémenté)

---

### 23.3 Exemple .env.example

```env
# Copier ce fichier en .env et remplir les valeurs

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/academy_db"

# JWT
JWT_SECRET="change-this-to-a-random-32-char-secret-key"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Server
PORT=4000
NODE_ENV="development"

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:19006,capacitor://localhost"
```

---

## 24. COMMANDES DÉVELOPPEMENT

```bash
# ======================
# INSTALLATION
# ======================
npm install
# ou
pnpm install

# ======================
# PRISMA
# ======================
# Générer le client Prisma
npm run prisma:generate
# ou
pnpm prisma:generate

# Créer une migration
npm run prisma:migrate
# ou
pnpm prisma:migrate

# Reset DB + seed
npm run db:reset
# ou
pnpm db:reset

# Seed uniquement
npm run db:seed
# ou
pnpm db:seed

# Ouvrir Prisma Studio (GUI)
npm run prisma:studio
# ou
pnpm prisma:studio

# ======================
# DÉVELOPPEMENT
# ======================
# Mode développement (watch mode avec nodemon)
npm run dev
# ou
pnpm dev

# Build TypeScript → JavaScript
npm run build
# ou
pnpm build

# Démarrer en production (après build)
npm start
# ou
pnpm start

# ======================
# TESTS (À implémenter)
# ======================
npm test
npm run test:watch
npm run test:coverage

# ======================
# LINTING
# ======================
npm run lint
npm run lint:fix

# ======================
# VÉRIFICATIONS
# ======================
# Vérifier que le serveur fonctionne
curl http://localhost:4000/api/colleges

# Tester le health check (si implémenté)
curl http://localhost:4000/health
```

---

## 25. RÉCAPITULATIF STATISTIQUES

### Endpoints Totaux : 60+

| Module | Endpoints | Publics | Protégés |
|--------|-----------|---------|----------|
| Auth | 5 | 3 | 2 |
| Colleges | 5 | 1 | 4 |
| Départements | 6 | 0 | 6 |
| Années Scolaires | 5 | 0 | 5 |
| Enseignants | 7 | 0 | 7 |
| Étudiants | 5 | 0 | 5 |
| Matières | 5 | 0 | 5 |
| Salles | 5 | 0 | 5 |
| Notes | 6 | 0 | 6 |
| Parents | 7 | 0 | 7 |
| Inscriptions | 8 | 0 | 8 |
| **TOTAL** | **64** | **4** | **60** |

---

### Modèles Prisma : 15

1. User
2. College
3. Departement
4. AnneeScolaire
5. Enseignant
6. Etudiant
7. Parent
8. AdminCollege
9. Matiere
10. Salle
11. Note
12. Inscription
13. Cours
14. EnseignantDepartement
15. ParentEtudiant

---

### Rôles Utilisateur : 5

1. **ADMIN_GLOBAL** : Administrateur académique (tous collèges)
2. **ADMIN_COLLEGE** : Administrateur de collège (son collège uniquement)
3. **ENSEIGNANT** : Enseignant (ses matières/classes)
4. **ETUDIANT** : Étudiant (ses notes/inscriptions)
5. **PARENT** : Parent (notes de ses enfants)

---

### Règles Métier Critiques : 6

1. ⚠️ Filtrage obligatoire par année scolaire
2. Isolation multi-collège stricte
3. Contrainte unicité notes (1 note/matière/année/étudiant)
4. Prérequis inscription pour recevoir notes
5. Un seul responsable par département par année
6. Une seule année scolaire active à la fois

---

## FIN DE LA DOCUMENTATION

**Date de création :** 2026-02-02
**Version Backend :** 1.0.0
**Dernière mise à jour :** 2026-02-02

**Contact Développeur :**
- Project : Système de Gestion Académique UICI
- Backend : Express + TypeScript + Prisma + PostgreSQL

**Notes :**
- Cette documentation couvre 100% du backend actuel
- Tous les endpoints sont documentés avec exemples JSON
- Les règles métier critiques sont mises en évidence
- Les scénarios d'utilisation sont complets et testables
- Les comptes de test sont disponibles après seed

**Prochaines étapes recommandées :**
1. Implémenter rate limiting
2. Ajouter système de logging (Winston/Pino)
3. Intégrer error monitoring (Sentry)
4. Créer tests automatisés (Jest)
5. Ajouter documentation OpenAPI/Swagger
6. Implémenter pagination sur les listes
7. Ajouter système de reset password par email
8. Créer audit logs pour actions admin

---

**🎉 Documentation complète et prête à l'emploi ! 🎉**

