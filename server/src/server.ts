import app from './app';
import pool from './config/database';
import { gameLoop } from './utils/gameLoop';

const PORT = parseInt(process.env.PORT || '3000');

// Función para verificar conexión a la base de datos
async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión a PostgreSQL establecida correctamente');
    client.release();
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error);
    console.log('⚠️  El servidor continuará sin base de datos. Algunas funciones pueden no estar disponibles.');
  }
}

// Función para inicializar el servidor
async function startServer() {
  try {
    // Verificar conexión a base de datos
    await checkDatabaseConnection();

    // Iniciar servidor
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor Tamagotchi iniciado en puerto ${PORT}`);
      console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 API disponible en: http://localhost:${PORT}/api`);
      console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
      
      // Iniciar loop de juego
      gameLoop.start();
    });

    // Manejo graceful de cierre
    process.on('SIGTERM', () => {
      console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
      gameLoop.stop();
      server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        pool.end(() => {
          console.log('✅ Pool de conexiones cerrado');
          process.exit(0);
        });
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
      gameLoop.stop();
      server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        pool.end(() => {
          console.log('✅ Pool de conexiones cerrado');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor
startServer();

