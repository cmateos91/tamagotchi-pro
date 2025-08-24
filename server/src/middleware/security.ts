import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Rate limiting más permisivo para desarrollo
export const authLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutos (en lugar de 15)
  max: 20, // 20 intentos por IP (en lugar de 5)
  message: {
    success: false,
    error: 'Demasiados intentos de autenticación. Intenta de nuevo en 2 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Permitir bypass en desarrollo
  skip: (req) => process.env.NODE_ENV === 'development' && req.ip === '::1' || req.ip === '127.0.0.1',
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto (en lugar de 15)  
  max: 200, // 200 requests por IP (en lugar de 100)
  message: {
    success: false,
    error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Permitir bypass en desarrollo
  skip: (req) => process.env.NODE_ENV === 'development' && (req.ip === '::1' || req.ip === '127.0.0.1'),
});

export const battleLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 50, // 50 batallas por minuto (en lugar de 10)
  message: {
    success: false,
    error: 'Demasiadas batallas. Espera un momento antes de batallar de nuevo.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware para validar entrada de datos
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitizar strings en el body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Remover caracteres peligrosos
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
        
        // Limitar longitud
        if (req.body[key].length > 1000) {
          req.body[key] = req.body[key].substring(0, 1000);
        }
      }
    }
  }
  
  next();
};

// Middleware para logging de seguridad
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).userId || 'anonymous'
    };
    
    // Log requests sospechosos
    if (res.statusCode >= 400 || duration > 5000) {
      console.warn('🚨 Suspicious request:', JSON.stringify(logData));
    }
    
    // Log requests normales en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Request:', JSON.stringify(logData));
    }
  });
  
  next();
};

// Middleware para validar tipos de contenido
export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type debe ser application/json'
      });
    }
  }
  
  next();
};

// Middleware para prevenir ataques de timing
export const preventTimingAttacks = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Agregar delay mínimo solo en producción
    if (process.env.NODE_ENV === 'production' && req.path.includes('/auth/') && duration < 100) {
      const delay = 100 - duration;
      setTimeout(() => {}, delay);
    }
  });
  
  next();
};

// Headers de seguridad adicionales
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Habilitar XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy básico
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self';"
  );
  
  next();
};
