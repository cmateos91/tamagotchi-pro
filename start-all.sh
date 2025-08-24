#!/bin/bash
echo "🎮 INICIANDO TAMAGOTCHI PRO COMPLETO"
echo "=================================="

# Verificar que PostgreSQL esté corriendo
if ! docker ps | grep -q tamagotchi-postgres; then
    echo "❌ PostgreSQL no está corriendo. Iniciando..."
    docker start tamagotchi-postgres
    sleep 5
fi

cleanup() {
    echo ""
    echo "🛑 Cerrando aplicación..."
    kill $SERVER_PID $CLIENT_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT

echo "🚀 Iniciando servidor..."
cd server && npm run dev &
SERVER_PID=$!

sleep 3

echo "🎮 Iniciando cliente..."
cd ../client && npm run dev &
CLIENT_PID=$!

echo ""
echo "✅ Tamagotchi Pro iniciado:"
echo "   🔧 Backend:  http://localhost:3000"
echo "   🎮 Frontend: http://localhost:5173"
echo ""
echo "📊 Base de datos:"
echo "   🐘 PostgreSQL ejecutándose en Docker"
echo "   📋 Para ver logs: docker logs tamagotchi-postgres"
echo ""
echo "Presiona Ctrl+C para cerrar"

wait
