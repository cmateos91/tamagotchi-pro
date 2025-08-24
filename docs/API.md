# 📡 API Documentation - Tamagotchi Pro

Esta documentación describe todos los endpoints disponibles en la API REST de Tamagotchi Pro.

## 🔐 Autenticación

La API utiliza JWT (JSON Web Tokens) para autenticación. Incluye el token en el header `Authorization`:

```
Authorization: Bearer <your-jwt-token>
```

### Endpoints de Autenticación

#### POST /api/auth/register
Registra un nuevo usuario en el sistema.

**Request Body:**
```json
{
  "username": "string (3-20 caracteres, único)",
  "email": "string (email válido, único)", 
  "password": "string (mínimo 6 caracteres)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "createdAt": "datetime"
    },
    "accessToken": "jwt-token",
    "refreshToken": "jwt-refresh-token"
  },
  "message": "Usuario registrado exitosamente"
}
```

**Errores:**
- `400`: Datos inválidos o usuario ya existe
- `500`: Error interno del servidor

---

#### POST /api/auth/login
Inicia sesión con credenciales existentes.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string"
    },
    "accessToken": "jwt-token",
    "refreshToken": "jwt-refresh-token"
  },
  "message": "Inicio de sesión exitoso"
}
```

**Errores:**
- `401`: Credenciales inválidas
- `429`: Demasiados intentos (rate limit)

---

#### POST /api/auth/refresh
Renueva el access token usando el refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-token",
    "refreshToken": "new-refresh-token"
  }
}
```

---

#### POST /api/auth/logout
Cierra sesión e invalida los tokens.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

## 🐾 Criaturas

### GET /api/creatures
Obtiene todas las criaturas del usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Elementos por página (default: 10, max: 50)
- `alive` (opcional): Filtrar por criaturas vivas (true/false)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "species": "verdania|ignius|aquarina|voltus|terralux|aerion|glacius|umbra",
      "stage": "egg|baby|teen|adult|elder",
      "personality": "playful|shy|curious|lazy|energetic|calm",
      "mood": "happy|sad|excited|tired|sick|angry",
      "stats": {
        "hunger": "number (0-100)",
        "happiness": "number (0-100)",
        "health": "number (0-100)",
        "energy": "number (0-100)",
        "cleanliness": "number (0-100)",
        "intelligence": "number (0-100)",
        "strength": "number (0-100)",
        "agility": "number (0-100)"
      },
      "level": "number",
      "experience": "number",
      "age": "number (horas)",
      "birthDate": "datetime",
      "lastFed": "datetime",
      "lastPlayed": "datetime",
      "lastCleaned": "datetime",
      "isAlive": "boolean",
      "evolutionPoints": "number",
      "traits": ["string"],
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number", 
    "total": "number",
    "totalPages": "number"
  }
}
```

---

### POST /api/creatures
Crea una nueva criatura.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "string (3-20 caracteres)",
  "species": "verdania|ignius|aquarina|voltus|terralux|aerion|glacius|umbra"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "species": "string",
    "stage": "egg",
    "stats": {
      "hunger": 80,
      "happiness": 70,
      "health": 100,
      "energy": 90,
      "cleanliness": 100,
      "intelligence": 10,
      "strength": 10,
      "agility": 10
    },
    "level": 1,
    "experience": 0,
    "age": 0,
    "isAlive": true,
    "evolutionPoints": 0,
    "traits": [],
    "createdAt": "datetime"
  },
  "message": "Criatura creada exitosamente"
}
```

**Errores:**
- `400`: Datos inválidos o límite de criaturas alcanzado
- `401`: No autenticado

---

### GET /api/creatures/:id
Obtiene una criatura específica por ID.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Objeto criatura completo (ver GET /api/creatures)
  }
}
```

**Errores:**
- `404`: Criatura no encontrada
- `403`: No tienes acceso a esta criatura

---

### POST /api/creatures/:id/feed
Alimenta una criatura específica.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "foodType": "basic|premium|special" // opcional, default: basic
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Criatura actualizada
    "stats": {
      "hunger": 95, // Incrementado
      "happiness": 75, // Posible incremento
      // ... otros stats
    },
    "experience": 105, // Incrementado
    "lastFed": "datetime"
  },
  "message": "Criatura alimentada exitosamente"
}
```

**Errores:**
- `400`: Criatura no tiene hambre o está muerta
- `404`: Criatura no encontrada

---

### POST /api/creatures/:id/play
Juega con una criatura específica.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "gameType": "fetch|puzzle|exercise" // opcional, default: fetch
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "happiness": 90, // Incrementado
      "energy": 70, // Decrementado
      "intelligence": 15 // Posible incremento
    },
    "experience": 125,
    "evolutionPoints": 5,
    "lastPlayed": "datetime"
  },
  "message": "¡Tu criatura se divirtió mucho!"
}
```

---

### POST /api/creatures/:id/clean
Limpia una criatura específica.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "cleanliness": 100, // Restaurado
      "health": 95, // Posible incremento
      "happiness": 80 // Posible incremento
    },
    "lastCleaned": "datetime"
  },
  "message": "Criatura limpia y feliz"
}
```

---

### POST /api/creatures/:id/sleep
Pone a dormir una criatura.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "energy": 100, // Restaurado
      "mood": "rested"
    }
  },
  "message": "Tu criatura está descansando"
}
```

## 🏆 Logros

### GET /api/achievements
Obtiene todos los logros disponibles en el sistema.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "icon": "string",
      "rarity": "common|uncommon|rare|epic|legendary"
    }
  ]
}
```

---

### GET /api/achievements/user
Obtiene los logros del usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "icon": "string",
      "rarity": "string",
      "unlockedAt": "datetime|null" // null si no está desbloqueado
    }
  ]
}
```

## 🔄 Evolución

### GET /api/evolution/:creatureId/check
Verifica si una criatura puede evolucionar.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "canEvolve": "boolean",
    "nextStage": "baby|teen|adult|elder", // si puede evolucionar
    "requirements": {
      "age": "number",
      "level": "number",
      "happiness": "number",
      "health": "number",
      "evolutionPoints": "number"
    }
  }
}
```

---

### POST /api/evolution/:creatureId/evolve
Evoluciona una criatura si cumple los requisitos.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Criatura evolucionada con stats mejorados
  },
  "message": "¡Tu criatura ha evolucionado a Adolescente!"
}
```

**Errores:**
- `400`: La criatura no cumple los requisitos para evolucionar

## ⚔️ Batallas

### POST /api/battles/start
Inicia una batalla entre dos criaturas.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "myCreatureId": "uuid",
  "opponentCreatureId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "winnerId": "uuid",
    "loserId": "uuid", 
    "winnerCreatureId": "uuid",
    "loserCreatureId": "uuid",
    "experienceGained": "number",
    "battleLog": ["string"], // Array de eventos de batalla
    "duration": "number" // Duración en segundos
  },
  "message": "¡Victoria!" // o "Derrota, pero ganaste experiencia"
}
```

**Errores:**
- `400`: Criaturas no disponibles o sin energía suficiente
- `403`: No puedes usar esta criatura

---

### GET /api/battles/history
Obtiene el historial de batallas del usuario.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (opcional): Número de página
- `limit` (opcional): Elementos por página

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "winnerId": "uuid",
      "loserId": "uuid",
      "winnerCreatureName": "string",
      "loserCreatureName": "string", 
      "winnerUsername": "string",
      "loserUsername": "string",
      "experienceGained": "number",
      "battleLog": ["string"],
      "duration": "number",
      "createdAt": "datetime",
      "isWinner": "boolean" // true si el usuario actual ganó
    }
  ]
}
```

## 🏅 Rankings

### GET /api/leaderboard/experience
Obtiene el ranking por experiencia total.

**Query Parameters:**
- `limit` (opcional): Número de entradas (default: 50, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "userId": "uuid",
        "username": "string",
        "score": "number", // Experiencia total
        "rank": "number",
        "creatureCount": "number",
        "totalExperience": "number"
      }
    ],
    "userRank": {
      // Posición del usuario actual si no está en el top
    }
  }
}
```

---

### GET /api/leaderboard/level
Obtiene el ranking por nivel máximo.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "username": "string", 
      "score": "number", // Nivel máximo
      "rank": "number",
      "creatureCount": "number",
      "totalExperience": "number"
    }
  ]
}
```

---

### GET /api/leaderboard/battles
Obtiene el ranking por batallas ganadas.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "username": "string",
      "score": "number", // Batallas ganadas
      "rank": "number",
      "creatureCount": "number",
      "totalExperience": "number"
    }
  ]
}
```

---

### GET /api/leaderboard/stats
Obtiene estadísticas generales del juego.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": "number",
    "totalCreatures": "number",
    "totalBattles": "number",
    "totalAchievementsUnlocked": "number",
    "averageLevel": "string",
    "mostPopularSpecies": "string"
  }
}
```

## 🔧 Administración

### GET /api/admin/metrics
Obtiene métricas del sistema (requiere permisos de admin).

**Headers:** `Authorization: Bearer <admin-token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "activeUsers": "number",
    "totalCreatures": "number",
    "averageSessionTime": "number",
    "popularActions": {
      "feed": "number",
      "play": "number",
      "clean": "number"
    },
    "serverHealth": {
      "uptime": "number",
      "memoryUsage": {
        "rss": "number",
        "heapTotal": "number",
        "heapUsed": "number"
      },
      "cpuUsage": "number"
    },
    "performance": {
      "totalRequests": "number",
      "requestsByEndpoint": {},
      "averageResponseTime": "number",
      "activeConnections": "number"
    }
  }
}
```

---

### GET /api/admin/health
Health check detallado del sistema.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "datetime",
    "uptime": "number",
    "database": {
      "status": "connected",
      "responseTime": "string"
    },
    "memory": {
      "used": "string",
      "total": "string"
    },
    "activeUsers": "number",
    "totalCreatures": "number"
  }
}
```

## 📊 Rate Limits

La API implementa rate limiting para prevenir abuso:

- **Autenticación**: 5 requests por 15 minutos por IP
- **API General**: 100 requests por 15 minutos por IP  
- **Batallas**: 10 requests por minuto por IP

Cuando se excede el límite, la API responde con:

```json
{
  "success": false,
  "error": "Demasiadas solicitudes. Intenta de nuevo más tarde."
}
```

## 🚨 Códigos de Error

### Códigos HTTP Comunes

- **200**: OK - Solicitud exitosa
- **201**: Created - Recurso creado exitosamente
- **400**: Bad Request - Datos inválidos en la solicitud
- **401**: Unauthorized - Token inválido o faltante
- **403**: Forbidden - Sin permisos para acceder al recurso
- **404**: Not Found - Recurso no encontrado
- **429**: Too Many Requests - Rate limit excedido
- **500**: Internal Server Error - Error interno del servidor

### Formato de Respuesta de Error

```json
{
  "success": false,
  "error": "Descripción del error",
  "code": "ERROR_CODE", // Opcional
  "details": {} // Opcional, información adicional
}
```

## 🔍 Ejemplos de Uso

### Flujo Completo de Autenticación

```javascript
// 1. Registrar usuario
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'player123',
    email: 'player@example.com', 
    password: 'securepass123'
  })
});

const { data } = await registerResponse.json();
const { accessToken, refreshToken } = data;

// 2. Usar token en requests
const creaturesResponse = await fetch('/api/creatures', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// 3. Renovar token cuando expire
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});
```

### Crear y Cuidar una Criatura

```javascript
// 1. Crear criatura
const createResponse = await fetch('/api/creatures', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Sparky',
    species: 'voltus'
  })
});

const { data: creature } = await createResponse.json();

// 2. Alimentar criatura
await fetch(`/api/creatures/${creature.id}/feed`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. Jugar con criatura
await fetch(`/api/creatures/${creature.id}/play`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ gameType: 'puzzle' })
});
```

### Iniciar una Batalla

```javascript
// 1. Obtener criaturas disponibles
const creaturesResponse = await fetch('/api/creatures', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { data: creatures } = await creaturesResponse.json();
const myCreature = creatures[0];

// 2. Iniciar batalla (necesitas el ID de la criatura oponente)
const battleResponse = await fetch('/api/battles/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    myCreatureId: myCreature.id,
    opponentCreatureId: 'opponent-creature-id'
  })
});

const { data: battleResult } = await battleResponse.json();
console.log('Resultado:', battleResult.battleLog);
```

## 📝 Notas Adicionales

### Paginación
Todos los endpoints que devuelven listas soportan paginación:
- `page`: Número de página (empezando en 1)
- `limit`: Elementos por página (máximo 100)

### Timestamps
Todos los timestamps están en formato ISO 8601 UTC:
```
2024-01-15T10:30:00.000Z
```

### UUIDs
Todos los IDs de recursos son UUIDs v4:
```
550e8400-e29b-41d4-a716-446655440000
```

### Versionado
La API actualmente está en versión 1. Futuras versiones mantendrán compatibilidad hacia atrás o se indicará claramente en la URL:
```
/api/v2/creatures
```

