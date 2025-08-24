"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsMiddleware = exports.metricsCollector = void 0;
const database_1 = __importDefault(require("../config/database"));
class MetricsCollector {
    startTime;
    requestCounts = {};
    responseTimes = [];
    activeConnections = new Set();
    constructor() {
        this.startTime = Date.now();
        this.startPeriodicCollection();
    }
    recordRequest(endpoint, responseTime, userId) {
        this.requestCounts[endpoint] = (this.requestCounts[endpoint] || 0) + 1;
        this.responseTimes.push(responseTime);
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
        }
        if (userId) {
            this.activeConnections.add(userId);
        }
    }
    async getCurrentMetrics() {
        try {
            const dbMetrics = await this.getDatabaseMetrics();
            const serverHealth = this.getServerHealth();
            const popularActions = await this.getPopularActions();
            return {
                activeUsers: this.activeConnections.size,
                totalCreatures: dbMetrics.totalCreatures,
                averageSessionTime: this.calculateAverageSessionTime(),
                popularActions,
                serverHealth
            };
        }
        catch (error) {
            console.error('Error obteniendo métricas:', error);
            return {
                activeUsers: 0,
                totalCreatures: 0,
                averageSessionTime: 0,
                popularActions: {},
                serverHealth: this.getServerHealth()
            };
        }
    }
    async getDatabaseMetrics() {
        const result = await database_1.default.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_creatures,
        COUNT(DISTINCT c.user_id) as users_with_creatures,
        AVG(c.level) as avg_level,
        COUNT(DISTINCT CASE WHEN c.updated_at > NOW() - INTERVAL '1 hour' THEN c.user_id END) as active_users_1h
      FROM creatures c
      WHERE c.is_alive = true
    `);
        return {
            totalCreatures: parseInt(result.rows[0].total_creatures || 0),
            usersWithCreatures: parseInt(result.rows[0].users_with_creatures || 0),
            averageLevel: parseFloat(result.rows[0].avg_level || 0),
            activeUsersLastHour: parseInt(result.rows[0].active_users_1h || 0)
        };
    }
    async getPopularActions() {
        const result = await database_1.default.query(`
      SELECT 
        action_type,
        COUNT(*) as count
      FROM creature_actions
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY action_type
      ORDER BY count DESC
      LIMIT 10
    `);
        const actions = {};
        result.rows.forEach(row => {
            actions[row.action_type] = parseInt(row.count);
        });
        return actions;
    }
    getServerHealth() {
        const uptime = Date.now() - this.startTime;
        const memoryUsage = process.memoryUsage();
        return {
            uptime,
            memoryUsage,
            cpuUsage: process.cpuUsage().user / 1000000
        };
    }
    calculateAverageSessionTime() {
        if (this.responseTimes.length === 0)
            return 0;
        const sum = this.responseTimes.reduce((a, b) => a + b, 0);
        return sum / this.responseTimes.length;
    }
    cleanupInactiveConnections() {
        this.activeConnections.clear();
    }
    startPeriodicCollection() {
        setInterval(() => {
            this.cleanupInactiveConnections();
            this.logMetrics();
        }, 60 * 60 * 1000);
        if (process.env.NODE_ENV === 'development') {
            setInterval(() => {
                this.logMetrics();
            }, 5 * 60 * 1000);
        }
    }
    async logMetrics() {
        try {
            const metrics = await this.getCurrentMetrics();
            console.log('📊 Métricas del servidor:', {
                timestamp: new Date().toISOString(),
                activeUsers: metrics.activeUsers,
                totalCreatures: metrics.totalCreatures,
                uptime: `${Math.floor(metrics.serverHealth.uptime / 1000 / 60)} minutos`,
                memoryUsage: `${Math.round(metrics.serverHealth.memoryUsage.heapUsed / 1024 / 1024)} MB`,
                topActions: Object.entries(metrics.popularActions)
                    .slice(0, 3)
                    .map(([action, count]) => `${action}: ${count}`)
            });
        }
        catch (error) {
            console.error('Error logging métricas:', error);
        }
    }
    getPerformanceStats() {
        return {
            totalRequests: Object.values(this.requestCounts).reduce((a, b) => a + b, 0),
            requestsByEndpoint: { ...this.requestCounts },
            averageResponseTime: this.calculateAverageSessionTime(),
            activeConnections: this.activeConnections.size,
            uptime: Date.now() - this.startTime
        };
    }
    reset() {
        this.requestCounts = {};
        this.responseTimes = [];
        this.activeConnections.clear();
        this.startTime = Date.now();
    }
}
exports.metricsCollector = new MetricsCollector();
const metricsMiddleware = (req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const endpoint = `${req.method} ${req.route?.path || req.path}`;
        exports.metricsCollector.recordRequest(endpoint, responseTime, req.userId);
    });
    next();
};
exports.metricsMiddleware = metricsMiddleware;
//# sourceMappingURL=metrics.js.map