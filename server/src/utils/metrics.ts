import pool from '../config/database';

interface Metrics {
  activeUsers: number;
  totalCreatures: number;
  averageSessionTime: number;
  popularActions: { [key: string]: number };
  serverHealth: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
  };
}

class MetricsCollector {
  private startTime: number;
  private requestCounts: { [endpoint: string]: number } = {};
  private responseTimes: number[] = [];
  private activeConnections: Set<string> = new Set();

  constructor() {
    this.startTime = Date.now();
    this.startPeriodicCollection();
  }

  // Registrar request
  recordRequest(endpoint: string, responseTime: number, userId?: string) {
    this.requestCounts[endpoint] = (this.requestCounts[endpoint] || 0) + 1;
    this.responseTimes.push(responseTime);
    
    // Mantener solo los últimos 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
    
    if (userId) {
      this.activeConnections.add(userId);
    }
  }

  // Obtener métricas actuales
  async getCurrentMetrics(): Promise<Metrics> {
    try {
      // Métricas de base de datos
      const dbMetrics = await this.getDatabaseMetrics();
      
      // Métricas del servidor
      const serverHealth = this.getServerHealth();
      
      // Métricas de acciones populares
      const popularActions = await this.getPopularActions();
      
      return {
        activeUsers: this.activeConnections.size,
        totalCreatures: dbMetrics.totalCreatures,
        averageSessionTime: this.calculateAverageSessionTime(),
        popularActions,
        serverHealth
      };
    } catch (error) {
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

  // Métricas de base de datos
  private async getDatabaseMetrics() {
    const result = await pool.query(`
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

  // Acciones populares
  private async getPopularActions() {
    const result = await pool.query(`
      SELECT 
        action_type,
        COUNT(*) as count
      FROM creature_actions
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY action_type
      ORDER BY count DESC
      LIMIT 10
    `);

    const actions: { [key: string]: number } = {};
    result.rows.forEach(row => {
      actions[row.action_type] = parseInt(row.count);
    });

    return actions;
  }

  // Salud del servidor
  private getServerHealth() {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();
    
    return {
      uptime,
      memoryUsage,
      cpuUsage: process.cpuUsage().user / 1000000 // Convert to milliseconds
    };
  }

  // Tiempo promedio de sesión
  private calculateAverageSessionTime(): number {
    if (this.responseTimes.length === 0) return 0;
    
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return sum / this.responseTimes.length;
  }

  // Limpiar conexiones inactivas
  private cleanupInactiveConnections() {
    // En una implementación real, aquí verificaríamos la última actividad
    // Por simplicidad, limpiamos cada hora
    this.activeConnections.clear();
  }

  // Recolección periódica
  private startPeriodicCollection() {
    // Limpiar métricas cada hora
    setInterval(() => {
      this.cleanupInactiveConnections();
      this.logMetrics();
    }, 60 * 60 * 1000); // 1 hora

    // Log métricas cada 5 minutos en desarrollo
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        this.logMetrics();
      }, 5 * 60 * 1000); // 5 minutos
    }
  }

  // Log de métricas
  private async logMetrics() {
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
    } catch (error) {
      console.error('Error logging métricas:', error);
    }
  }

  // Obtener estadísticas de rendimiento
  getPerformanceStats() {
    return {
      totalRequests: Object.values(this.requestCounts).reduce((a, b) => a + b, 0),
      requestsByEndpoint: { ...this.requestCounts },
      averageResponseTime: this.calculateAverageSessionTime(),
      activeConnections: this.activeConnections.size,
      uptime: Date.now() - this.startTime
    };
  }

  // Resetear métricas
  reset() {
    this.requestCounts = {};
    this.responseTimes = [];
    this.activeConnections.clear();
    this.startTime = Date.now();
  }
}

// Instancia singleton
export const metricsCollector = new MetricsCollector();

// Middleware para recolectar métricas
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    metricsCollector.recordRequest(endpoint, responseTime, req.userId);
  });
  
  next();
};

