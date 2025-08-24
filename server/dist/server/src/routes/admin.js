"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const metrics_1 = require("../utils/metrics");
const database_1 = __importDefault(require("../config/database"));
const router = express_1.default.Router();
const requireAdmin = async (req, res, next) => {
    try {
        const userId = req.userId;
        const adminIds = (process.env.ADMIN_USER_IDS || '').split(',');
        if (!adminIds.includes(userId)) {
            const response = {
                success: false,
                error: 'Acceso denegado. Se requieren permisos de administrador.'
            };
            return res.status(403).json(response);
        }
        next();
    }
    catch (error) {
        const response = {
            success: false,
            error: 'Error verificando permisos'
        };
        res.status(500).json(response);
    }
};
router.get('/metrics', auth_1.authenticateToken, requireAdmin, async (req, res) => {
    try {
        const metrics = await metrics_1.metricsCollector.getCurrentMetrics();
        const performanceStats = metrics_1.metricsCollector.getPerformanceStats();
        const response = {
            success: true,
            data: {
                ...metrics,
                performance: performanceStats
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error obteniendo métricas:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.get('/users/stats', auth_1.authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await database_1.default.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as new_users_24h,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_users_7d,
        COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 hour' THEN 1 END) as active_users_1h,
        COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END) as active_users_24h
      FROM users
    `);
        const userStats = result.rows[0];
        const response = {
            success: true,
            data: {
                totalUsers: parseInt(userStats.total_users),
                newUsers24h: parseInt(userStats.new_users_24h),
                newUsers7d: parseInt(userStats.new_users_7d),
                activeUsers1h: parseInt(userStats.active_users_1h),
                activeUsers24h: parseInt(userStats.active_users_24h)
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error obteniendo estadísticas de usuarios:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.get('/creatures/stats', auth_1.authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await database_1.default.query(`
      SELECT 
        COUNT(*) as total_creatures,
        COUNT(CASE WHEN is_alive = true THEN 1 END) as alive_creatures,
        COUNT(CASE WHEN is_alive = false THEN 1 END) as dead_creatures,
        species,
        COUNT(*) as count_by_species
      FROM creatures
      GROUP BY species
      ORDER BY count_by_species DESC
    `);
        const speciesStats = result.rows.map(row => ({
            species: row.species,
            count: parseInt(row.count_by_species)
        }));
        const totalResult = await database_1.default.query(`
      SELECT 
        COUNT(*) as total_creatures,
        COUNT(CASE WHEN is_alive = true THEN 1 END) as alive_creatures,
        COUNT(CASE WHEN is_alive = false THEN 1 END) as dead_creatures,
        AVG(level) as avg_level,
        AVG(age) as avg_age
      FROM creatures
    `);
        const totals = totalResult.rows[0];
        const response = {
            success: true,
            data: {
                totalCreatures: parseInt(totals.total_creatures),
                aliveCreatures: parseInt(totals.alive_creatures),
                deadCreatures: parseInt(totals.dead_creatures),
                averageLevel: parseFloat(totals.avg_level || 0).toFixed(2),
                averageAge: parseFloat(totals.avg_age || 0).toFixed(2),
                speciesDistribution: speciesStats
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error obteniendo estadísticas de criaturas:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.get('/logs', auth_1.authenticateToken, requireAdmin, async (req, res) => {
    try {
        const logs = [
            {
                timestamp: new Date().toISOString(),
                level: 'info',
                message: 'Sistema funcionando correctamente',
                source: 'system'
            },
            {
                timestamp: new Date(Date.now() - 60000).toISOString(),
                level: 'info',
                message: 'Loop de juego ejecutado exitosamente',
                source: 'gameLoop'
            }
        ];
        const response = {
            success: true,
            data: logs
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error obteniendo logs:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.post('/metrics/reset', auth_1.authenticateToken, requireAdmin, async (req, res) => {
    try {
        metrics_1.metricsCollector.reset();
        const response = {
            success: true,
            message: 'Métricas reseteadas exitosamente'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error reseteando métricas:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.get('/health', async (req, res) => {
    try {
        const dbStart = Date.now();
        await database_1.default.query('SELECT 1');
        const dbResponseTime = Date.now() - dbStart;
        const metrics = await metrics_1.metricsCollector.getCurrentMetrics();
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: metrics.serverHealth.uptime,
            database: {
                status: 'connected',
                responseTime: `${dbResponseTime}ms`
            },
            memory: {
                used: `${Math.round(metrics.serverHealth.memoryUsage.heapUsed / 1024 / 1024)}MB`,
                total: `${Math.round(metrics.serverHealth.memoryUsage.rss / 1024 / 1024)}MB`
            },
            activeUsers: metrics.activeUsers,
            totalCreatures: metrics.totalCreatures
        };
        res.json({
            success: true,
            data: health
        });
    }
    catch (error) {
        console.error('Error en health check:', error);
        res.status(503).json({
            success: false,
            error: 'Servicio no disponible',
            data: {
                status: 'unhealthy',
                timestamp: new Date().toISOString()
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map