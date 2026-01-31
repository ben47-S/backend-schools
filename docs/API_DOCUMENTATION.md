# 📚 Documentation API - Système de Gestion Académique

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 20+
- PostgreSQL 15+ (ou compte Neon)
- pnpm 10+

### Installation
```bash
cd backend-app
pnpm install
pnpm dev
```

Le serveur démarre sur `http://localhost:4000`

---

## 📥 Importer la Collection

### Postman
1. Ouvrir Postman
2. Cliquer sur **Import**
3. Sélectionner le fichier `docs/postman-collection.json`
4. La collection "Academic Management API" sera ajoutée

### Insomnia
1. Ouvrir Insomnia
2. Cliquer sur **Application** → **Preferences** → **Data**
3. Cliquer sur **Import Data** → **From File**
4. Sélectionner le fichier `docs/insomnia-collection.json`

---

## 🔐 Authentification

Tous les endpoints protégés nécessitent un token JWT dans le header :

```
Authorization: Bearer <votre_access_token>
```

### Workflow d'authentification

1. **Inscription** : `POST /api/auth/register`
2. **Connexion** : `POST /api/auth/login` → Récupérer les tokens
3. **Utiliser l'access token** pour les requêtes protégées
4. **Rafraîchir le token** : `POST /api/auth/refresh` quand il expire

---

## 📋 Endpoints Disponibles

### 🏥 Health Check

#### `GET /`
Vérifier que le serveur est en ligne

**Réponse** :
```json
{
  "success": true,
  "message": "Academic Management API",
  "version": "1.0.0",
  "timestamp": "2026-01-31T14:00:00.000Z"
}
```

---

### 🔐 Authentication

#### `POST /api/auth/register`
Créer un nouveau compte utilisateur

**Permissions** : Public

**Body** :
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "ADMIN_GLOBAL | ADMIN_COLLEGE | ENSEIGNANT | ETUDIANT | PARENT",
  "nom": "Doe",
  "prenom": "John",

  // Champs optionnels selon le rôle
  "telephone": "+33612345678",
  "photoUrl": "https://example.com/photo.jpg",

  // Pour ADMIN_COLLEGE (requis)
  "collegeId": "uuid",

  // Pour ENSEIGNANT (optionnels)
  "datePriseFonction": "2024-01-01T00:00:00.000Z",
  "indice": "HC1",
  "matiereId": "uuid",

  // Pour ETUDIANT (requis)
  "anneeEntree": 2024
}
```

**Réponse** (201) :
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "ADMIN_GLOBAL",
    "photoUrl": null,
    "isActive": true,
    "createdAt": "2026-01-31T14:00:00.000Z",
    "updatedAt": "2026-01-31T14:00:00.000Z"
  },
  "message": "User registered successfully"
}
```

**Erreurs** :
- `409` : Email déjà existant
- `400` : Données de validation incorrectes

---

#### `POST /api/auth/login`
Se connecter et obtenir les tokens JWT

**Permissions** : Public

**Body** :
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "ADMIN_GLOBAL",
      "photoUrl": null,
      "isActive": true,
      "createdAt": "2026-01-31T14:00:00.000Z",
      "updatedAt": "2026-01-31T14:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  },
  "message": "Login successful"
}
```

**Erreurs** :
- `401` : Identifiants incorrects
- `401` : Compte désactivé

---

#### `GET /api/auth/me`
Récupérer le profil de l'utilisateur connecté

**Permissions** : Tous (authentifié)

**Headers** :
```
Authorization: Bearer <accessToken>
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "ADMIN_GLOBAL",
    "photoUrl": null,
    "isActive": true,
    "createdAt": "2026-01-31T14:00:00.000Z",
    "updatedAt": "2026-01-31T14:00:00.000Z",
    "enseignant": null,
    "etudiant": null,
    "parent": null,
    "adminCollege": null
  },
  "message": "Profile retrieved successfully"
}
```

---

#### `POST /api/auth/refresh`
Rafraîchir l'access token

**Permissions** : Public

**Body** :
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  },
  "message": "Token refreshed successfully"
}
```

**Erreurs** :
- `401` : Refresh token invalide ou expiré

---

#### `POST /api/auth/change-password`
Changer le mot de passe de l'utilisateur connecté

**Permissions** : Tous (authentifié)

**Headers** :
```
Authorization: Bearer <accessToken>
```

**Body** :
```json
{
  "oldPassword": "password123",
  "newPassword": "newpassword456"
}
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  },
  "message": "Password changed successfully"
}
```

**Erreurs** :
- `401` : Ancien mot de passe incorrect
- `400` : Nouveau mot de passe trop court (min 6 caractères)

---

### 🏫 Collèges

#### `GET /api/colleges`
Récupérer tous les collèges

**Permissions** :
- `ADMIN_GLOBAL` : Voir tous les collèges
- `ADMIN_COLLEGE` : Voir uniquement son collège

**Headers** :
```
Authorization: Bearer <accessToken>
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nom": "Collège Einstein",
      "adresse": "123 rue de la Science, 75001 Paris",
      "siteWeb": "https://einstein.academy.com",
      "createdAt": "2026-01-31T14:00:00.000Z",
      "updatedAt": "2026-01-31T14:00:00.000Z"
    }
  ]
}
```

---

#### `GET /api/colleges/:id`
Récupérer un collège par son ID

**Permissions** :
- `ADMIN_GLOBAL` : N'importe quel collège
- `ADMIN_COLLEGE` : Uniquement son collège

**Headers** :
```
Authorization: Bearer <accessToken>
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nom": "Collège Einstein",
    "adresse": "123 rue de la Science, 75001 Paris",
    "siteWeb": "https://einstein.academy.com",
    "createdAt": "2026-01-31T14:00:00.000Z",
    "updatedAt": "2026-01-31T14:00:00.000Z",
    "_count": {
      "departements": 5,
      "salles": 20,
      "inscriptions": 150
    }
  }
}
```

**Erreurs** :
- `404` : Collège introuvable
- `403` : Accès non autorisé (ADMIN_COLLEGE tentant d'accéder à un autre collège)

---

#### `POST /api/colleges`
Créer un nouveau collège

**Permissions** : `ADMIN_GLOBAL` uniquement

**Headers** :
```
Authorization: Bearer <accessToken>
```

**Body** :
```json
{
  "nom": "Collège Einstein",
  "adresse": "123 rue de la Science, 75001 Paris",
  "siteWeb": "https://einstein.academy.com"
}
```

**Réponse** (201) :
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nom": "Collège Einstein",
    "adresse": "123 rue de la Science, 75001 Paris",
    "siteWeb": "https://einstein.academy.com",
    "createdAt": "2026-01-31T14:00:00.000Z",
    "updatedAt": "2026-01-31T14:00:00.000Z"
  },
  "message": "College created successfully"
}
```

**Erreurs** :
- `403` : Permissions insuffisantes (pas ADMIN_GLOBAL)
- `400` : Données de validation incorrectes

---

#### `PUT /api/colleges/:id`
Mettre à jour un collège

**Permissions** :
- `ADMIN_GLOBAL` : Peut modifier n'importe quel collège
- `ADMIN_COLLEGE` : Peut modifier uniquement son collège

**Headers** :
```
Authorization: Bearer <accessToken>
```

**Body** :
```json
{
  "nom": "Collège Einstein - Mise à jour",
  "adresse": "456 avenue de la Recherche, 75002 Paris",
  "siteWeb": "https://einstein-updated.academy.com"
}
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nom": "Collège Einstein - Mise à jour",
    "adresse": "456 avenue de la Recherche, 75002 Paris",
    "siteWeb": "https://einstein-updated.academy.com",
    "createdAt": "2026-01-31T14:00:00.000Z",
    "updatedAt": "2026-01-31T14:00:00.000Z"
  },
  "message": "College updated successfully"
}
```

**Erreurs** :
- `404` : Collège introuvable
- `403` : Accès non autorisé

---

#### `DELETE /api/colleges/:id`
Supprimer un collège

**Permissions** : `ADMIN_GLOBAL` uniquement

**Headers** :
```
Authorization: Bearer <accessToken>
```

**Réponse** (200) :
```json
{
  "success": true,
  "data": {
    "message": "College deleted successfully"
  },
  "message": "College deleted successfully"
}
```

**Erreurs** :
- `404` : Collège introuvable
- `403` : Permissions insuffisantes

---

## ⚠️ Gestion des Erreurs

Toutes les erreurs suivent ce format :

```json
{
  "success": false,
  "error": {
    "message": "Description de l'erreur",
    "code": "ERROR_CODE",
    "details": {} // Optionnel
  }
}
```

### Codes d'erreur courants

| Code | Description |
|------|-------------|
| `400` | Mauvaise requête (validation) |
| `401` | Non authentifié |
| `403` | Accès refusé |
| `404` | Ressource introuvable |
| `409` | Conflit (ex: email existant) |
| `500` | Erreur serveur |

---

## 🔒 Matrice des Permissions

| Action | ADMIN_GLOBAL | ADMIN_COLLEGE | ENSEIGNANT | ÉTUDIANT | PARENT |
|--------|--------------|---------------|------------|----------|--------|
| Voir tous les collèges | ✅ | ❌ (son collège) | ❌ | ❌ | ❌ |
| Créer collège | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modifier collège | ✅ | ✅ (son collège) | ❌ | ❌ | ❌ |
| Supprimer collège | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 📝 Notes Importantes

1. **Tokens JWT** :
   - Access token : valide 15 minutes
   - Refresh token : valide 7 jours

2. **Isolation des données** :
   - Les ADMIN_COLLEGE ne voient que les données de leur collège
   - Les ADMIN_GLOBAL ont accès à tout

3. **Validation** :
   - Tous les champs sont validés avec Zod
   - Les erreurs de validation retournent les champs concernés

4. **Sécurité** :
   - Les mots de passe sont hashés avec bcrypt (10 rounds)
   - Les tokens sont signés avec HS256

---

## 🧪 Tests

### Tester avec curl

```bash
# Health check
curl http://localhost:4000/

# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123","role":"ADMIN_GLOBAL","nom":"Admin","prenom":"Test"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# Profile (avec token)
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📞 Support

Pour toute question ou problème, consultez le README principal du projet.
