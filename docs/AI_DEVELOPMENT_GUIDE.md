# AI Development Guide - Tamagotchi Pro

## Para Desarrolladores IA

Esta guía está optimizada para asistentes de IA que trabajen en el desarrollo del proyecto Tamagotchi Pro.

## Contexto Rápido

**Tipo de Proyecto:** Juego Tamagotchi moderno con backend TypeScript y frontend Vanilla JS
**Estado:** Desarrollo activo, funcionalidades core implementadas
**Objetivo:** Sistema completo de mascota virtual con evolución, batallas PvP, logros y métricas

## Estructura Clave del Proyecto

```
tamagotchi-pro/
├── CLAUDE.md                 # Información principal para IA
├── shared/types.ts          # Tipos TypeScript centralizados
├── server/                  # Backend Express + TypeScript
│   ├── src/app.ts          # Configuración principal
│   ├── src/routes/         # Endpoints de la API
│   ├── src/middleware/     # Autenticación y validación
│   └── src/utils/          # Game loop y utilidades
├── client/                  # Frontend Vanilla JS
│   ├── src/main.js         # Aplicación principal (clase TamagotchiApp)
│   └── src/styles/         # CSS con glassmorphism
└── scripts/                # Herramientas de desarrollo
```

## Comandos Esenciales para IA

```bash
# Iniciar desarrollo
./scripts/start-all.sh

# Herramientas de análisis
./scripts/dev-tools.sh stats    # Estadísticas del proyecto
./scripts/dev-tools.sh api      # Lista de endpoints
./scripts/dev-tools.sh types    # Análisis de tipos TS

# Debug mode
./scripts/dev-tools.sh debug-on
./scripts/dev-tools.sh debug-off

# Tests y builds
./scripts/dev-tools.sh test-all
./scripts/dev-tools.sh build-all
```

## Entidades Principales

### 1. **Creature** (core entity)
```typescript
interface Creature {
  id: string;
  species: CreatureSpecies;     // 8 especies (verdania, ignius, etc.)
  stage: CreatureStage;         // 5 etapas (egg → baby → teen → adult → elder)
  stats: CreatureStats;         // 8 stats (hunger, happiness, health, etc.)
  personality: CreaturePersonality;
  level: number;
  experience: number;
  // ... más campos en shared/types.ts
}
```

### 2. **User** (authentication)
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  // JWT tokens manejados automáticamente
}
```

### 3. **Battle** (PvP system)
```typescript
interface Battle {
  challenger: string;
  opponent: string;
  challengerCreature: string;
  opponentCreature: string;
  result?: BattleResult;
}
```

## Flujo de Datos Principal

1. **Authentication:** JWT con refresh tokens automático
2. **Game Loop:** Ejecuta cada 5 min, decae stats de criaturas
3. **Actions:** Feed/Play/Clean afectan stats y experiencia
4. **Evolution:** Automática cuando se cumplen requisitos
5. **Battles:** Sistema PvP con cálculos de combate

## APIs Más Usadas

```
POST /api/auth/register          # Crear cuenta
POST /api/auth/login             # Iniciar sesión
GET  /api/creatures              # Obtener criaturas del usuario
POST /api/creatures              # Crear nueva criatura
POST /api/creatures/:id/feed     # Alimentar criatura
POST /api/creatures/:id/play     # Jugar con criatura
POST /api/battles/start          # Iniciar batalla PvP
GET  /api/achievements/user      # Logros del usuario
```

## Frontend Architecture

**Clase principal:** `TamagotchiApp` en `client/src/main.js`

**Métodos importantes:**
- `apiCall()` - Wrapper para todas las llamadas a API
- `renderCreature()` - Dibuja criatura en Canvas
- `handleAction()` - Procesa acciones del usuario
- `updateUI()` - Actualiza interfaz según estado

**Debug mode:** 
- Se activa con `localStorage.setItem('tamagotchi_debug', 'true')`
- Usa `this.debug()` en lugar de `console.log()` directo

## Database Schema

**PostgreSQL** con estas tablas principales:
- `users` - Usuarios y autenticación
- `creatures` - Criaturas y sus stats
- `battles` - Historial de combates
- `achievements` - Sistema de logros
- `user_achievements` - Relación usuario-logro

**Migrations:** `server/migrations/001_initial_schema.sql`

## Patrones de Desarrollo

### 1. **Error Handling**
- Backend: Try-catch con logging Winston
- Frontend: API wrapper con manejo automático
- Base de datos: Transacciones para operaciones críticas

### 2. **Validation**
- Middleware de validación en `server/src/middleware/validation.ts`
- Rate limiting global
- Sanitización de inputs

### 3. **State Management**
- Frontend: Estado en memoria de TamagotchiApp
- Backend: Stateless con JWT
- Persistencia: PostgreSQL exclusivamente

## Testing Strategy

**Backend:** Jest con `tests/setup.ts`
```bash
cd server && npm test
```

**Frontend:** Jest + JSDOM
```bash
cd client && npm test
```

**Key test files:**
- `server/tests/unit/creatures.test.ts`
- `client/tests/unit/api.test.js`

## Common Development Tasks

### Añadir nueva acción de criatura:
1. Crear endpoint en `server/src/routes/creatures.ts`
2. Actualizar tipos en `shared/types.ts`
3. Implementar en frontend `handleAction()`
4. Añadir tests correspondientes

### Nuevo tipo de criatura:
1. Actualizar `CreatureSpecies` enum en `shared/types.ts`
2. Añadir assets en `client/assets/creatures/`
3. Actualizar lógica de rendering
4. Migración de base de datos si necesario

### Nueva funcionalidad de API:
1. Crear route en `server/src/routes/`
2. Añadir middleware si necesario
3. Actualizar tipos compartidos
4. Documentar en `docs/API.md`

## Performance Considerations

- **Game Loop:** Usa batching para operaciones DB
- **Frontend:** Canvas optimizado, render on-demand
- **API:** Rate limiting configurado
- **Database:** Índices en campos frecuentes

## Security Features

- JWT con rotación automática
- Rate limiting por IP
- Sanitización de inputs
- Helmet.js para headers
- Passwords hasheados con bcrypt

## Debugging Tips para IA

1. **Usa `./scripts/dev-tools.sh stats`** para overview rápido
2. **Revisa `shared/types.ts`** antes de modificar estructuras
3. **El game loop está en `server/src/utils/gameLoop.ts`**
4. **Frontend debug con `localStorage.setItem('tamagotchi_debug', 'true')`**
5. **Database logs:** `docker logs tamagotchi-postgres`
6. **API testing:** Usa Postman o curl con JWT token

## Archivos que NO modificar

- `migrations/` - Solo añadir nuevas migraciones
- `package-lock.json` - Usar npm install
- `.git/` - Control de versiones
- `node_modules/` - Dependencias

## Archivos clave para modificaciones

- `shared/types.ts` - Tipos centralizados
- `server/src/routes/` - Endpoints de API
- `client/src/main.js` - Lógica de frontend
- `server/src/utils/gameLoop.ts` - Mecánicas de juego
- `CLAUDE.md` - Información para IA (este archivo)

## Estado Actual del Proyecto

✅ **Completado:**
- Sistema de autenticación JWT
- CRUD de criaturas con 8 especies
- Sistema de stats y evolución
- Batallas PvP básicas
- Logros y leaderboards
- PWA con offline support
- Game loop automático

⚠️ **En progreso:**
- Testing coverage
- Error handling robusto
- Optimizaciones de performance
- UI/UX refinement

🔄 **Próximo:**
- Sistema de trading
- Notificaciones push
- Eventos temporales
- Analytics avanzados