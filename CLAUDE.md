# CLAUDE.md - Tamagotchi Pro Development Guide

## Proyecto Overview
Sistema Tamagotchi moderno con backend TypeScript (Express/PostgreSQL) y frontend Vanilla JS + Canvas.

## Estructura del Proyecto
```
tamagotchi-pro/
├── server/          # Backend TypeScript + Express
├── client/          # Frontend Vanilla JS + Canvas
├── shared/          # Tipos compartidos TypeScript
├── scripts/         # Scripts de utilidad
└── docs/           # Documentación técnica
```

## Scripts Principales
- `./scripts/start-all.sh` - Inicia backend + frontend + DB
- `./scripts/install.sh` - Instalación completa con Docker
- `./scripts/fix-installation.sh` - Repara y migra DB
- Backend: `npm run dev` (puerto 3000)
- Frontend: `npm run dev` (puerto 5173)

## Base de Datos
- PostgreSQL corriendo en Docker como `tamagotchi-postgres`
- Schema en `server/migrations/001_initial_schema.sql`
- Para ver usuarios: `./scripts/show-users.sh`

## Stack Tecnológico
**Backend:**
- Node.js + TypeScript + Express
- PostgreSQL + JWT auth
- Tests con Jest

**Frontend:**
- Vanilla JavaScript ES2022
- Canvas 2D para rendering
- PWA con Service Workers
- Vite como bundler

## Arquitectura de Datos
**Entidades principales:**
- Users (auth, profiles)
- Creatures (8 especies, 5 etapas evolución)
- Battles (sistema PvP)
- Achievements (sistema logros)
- Metrics (telemetría)

## APIs Key
- Auth: `/api/auth/*`
- Creatures: `/api/creatures/*`
- Battles: `/api/battles/*`
- Admin: `/api/admin/*`

## Comandos de Desarrollo
```bash
# Instalar dependencias
cd server && npm install
cd client && npm install

# Desarrollo
./scripts/start-all.sh

# Tests
cd server && npm test
cd client && npm test

# Build producción
cd server && npm run build
cd client && npm run build
```

## Testing
- Server: Jest con setup en `tests/setup.ts`
- Client: Jest + JSDOM
- Ejecutar: `npm test` en cada directorio

## Debugging
- Backend: logs con Winston
- Frontend: console.log extensivo (limpiar para producción)
- DB logs: `docker logs tamagotchi-postgres`

## Consideraciones para IA
1. **Tipos compartidos** están en `shared/types.ts`
2. **Middleware** de validación en `server/src/middleware/`
3. **Game loop** en `server/src/utils/gameLoop.ts`
4. **Frontend state** en `client/src/main.js` (clase TamagotchiApp)
5. **Canvas rendering** métodos `render*()` en TamagotchiApp

## Patrones del Proyecto
- JWT con refresh tokens
- Rate limiting con express-rate-limit  
- Sanitización con middleware personalizado
- Game loop automático cada 5 minutos
- PWA manifesto + service worker

## Estados de Desarrollo
- ✅ Funcionalidades core implementadas
- ⚠️ Código debug extensivo (limpiar)
- ⚠️ Tests mínimos (expandir)
- ⚠️ Error handling básico
- 🔄 En desarrollo activo