interface Metrics {
    activeUsers: number;
    totalCreatures: number;
    averageSessionTime: number;
    popularActions: {
        [key: string]: number;
    };
    serverHealth: {
        uptime: number;
        memoryUsage: NodeJS.MemoryUsage;
        cpuUsage: number;
    };
}
declare class MetricsCollector {
    private startTime;
    private requestCounts;
    private responseTimes;
    private activeConnections;
    constructor();
    recordRequest(endpoint: string, responseTime: number, userId?: string): void;
    getCurrentMetrics(): Promise<Metrics>;
    private getDatabaseMetrics;
    private getPopularActions;
    private getServerHealth;
    private calculateAverageSessionTime;
    private cleanupInactiveConnections;
    private startPeriodicCollection;
    private logMetrics;
    getPerformanceStats(): {
        totalRequests: number;
        requestsByEndpoint: {
            [endpoint: string]: number;
        };
        averageResponseTime: number;
        activeConnections: number;
        uptime: number;
    };
    reset(): void;
}
export declare const metricsCollector: MetricsCollector;
export declare const metricsMiddleware: (req: any, res: any, next: any) => void;
export {};
//# sourceMappingURL=metrics.d.ts.map