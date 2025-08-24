"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const database_1 = __importDefault(require("./config/database"));
const gameLoop_1 = require("./utils/gameLoop");
const PORT = parseInt(process.env.PORT || '3000');
async function checkDatabaseConnection() {
    try {
        const client = await database_1.default.connect();
        console.log('✅ Conexión a PostgreSQL establecida correctamente');
        client.release();
    }
    catch (error) {
        console.error('❌ Error conectando a PostgreSQL:', error);
        console.log('⚠️  El servidor continuará sin base de datos. Algunas funciones pueden no estar disponibles.');
    }
}
async function startServer() {
    try {
        await checkDatabaseConnection();
        const server = app_1.default.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor Tamagotchi iniciado en puerto ${PORT}`);
            console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📡 API disponible en: http://localhost:${PORT}/api`);
            console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
            gameLoop_1.gameLoop.start();
        });
        process.on('SIGTERM', () => {
            console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
            gameLoop_1.gameLoop.stop();
            server.close(() => {
                console.log('✅ Servidor cerrado correctamente');
                database_1.default.end(() => {
                    console.log('✅ Pool de conexiones cerrado');
                    process.exit(0);
                });
            });
        });
        process.on('SIGINT', () => {
            console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
            gameLoop_1.gameLoop.stop();
            server.close(() => {
                console.log('✅ Servidor cerrado correctamente');
                database_1.default.end(() => {
                    console.log('✅ Pool de conexiones cerrado');
                    process.exit(0);
                });
            });
        });
    }
    catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map