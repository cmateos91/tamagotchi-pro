"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityHeaders = exports.preventTimingAttacks = exports.validateContentType = exports.securityLogger = exports.sanitizeInput = exports.battleLimiter = exports.apiLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.battleLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Demasiadas batallas. Espera un momento antes de batallar de nuevo.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const sanitizeInput = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '')
                    .trim();
                if (req.body[key].length > 1000) {
                    req.body[key] = req.body[key].substring(0, 1000);
                }
            }
        }
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
const securityLogger = (req, res, next) => {
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
            userId: req.userId || 'anonymous'
        };
        if (res.statusCode >= 400 || duration > 5000) {
            console.warn('🚨 Suspicious request:', JSON.stringify(logData));
        }
        if (process.env.NODE_ENV === 'development') {
            console.log('📝 Request:', JSON.stringify(logData));
        }
    });
    next();
};
exports.securityLogger = securityLogger;
const validateContentType = (req, res, next) => {
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
exports.validateContentType = validateContentType;
const preventTimingAttacks = (req, res, next) => {
    const startTime = process.hrtime.bigint();
    res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        if (req.path.includes('/auth/') && duration < 100) {
            const delay = 100 - duration;
            setTimeout(() => { }, delay);
        }
    });
    next();
};
exports.preventTimingAttacks = preventTimingAttacks;
const securityHeaders = (req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self';");
    next();
};
exports.securityHeaders = securityHeaders;
//# sourceMappingURL=security.js.map