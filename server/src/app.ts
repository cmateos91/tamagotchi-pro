import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Importar rutas
import authRoutes from './routes/auth';
import creatureRoutes from './routes/creatures';
import achievementRoutes from './routes/achievements';
import evolutionRoutes from './routes/evolution';
import battleRoutes from './routes/battles';
import leaderboardRoutes from './routes/leaderboard';
import adminRoutes from './routes/admin';

// Importar middleware de seguridad y métricas
import { 
  authLimiter, 
  apiLimiter, 
  battleLimiter,
  sanitizeInput,
  securityLogger,
  validateContentType,
  preventTimingAttacks,
  securityHeaders
} from './middleware/security';
import { metricsMiddleware } from './utils/metrics';

// Cargar variables de entorno
dotenv.config();

const app = express();

// Middleware de seguridad
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

app.use(securityHeaders);
app.use(securityLogger);
app.use(preventTimingAttacks);

// CORS configurado
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware de parsing y compresión
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Validación y sanitización
app.use(validateContentType);
app.use(sanitizeInput);

// Logging
app.use(morgan('combined'));

// Métricas
app.use(metricsMiddleware);

// Rate limiting general
app.use('/api/', apiLimiter);

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas de la API con rate limiting específico
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/creatures', creatureRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/evolution', evolutionRoutes);
app.use('/api/battles', battleLimiter, battleRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Servir frontend en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

// Manejo global de errores
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error no manejado:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message
  });
});

export default app;

