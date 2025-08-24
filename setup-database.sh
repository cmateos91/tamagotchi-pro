#!/bin/bash

echo "🐘 Configurando PostgreSQL para Tamagotchi Pro..."

# Opción 1: Docker (Recomendado)
echo "📦 Opción 1 - Usar Docker:"
echo "docker run --name tamagotchi-postgres \\"
echo "  -e POSTGRES_DB=tamagotchi_pro \\"
echo "  -e POSTGRES_USER=tamagotchi_user \\"
echo "  -e POSTGRES_PASSWORD=tamagotchi_pass \\"
echo "  -p 5432:5432 \\"
echo "  -d postgres:13"

echo ""
echo "📋 Opción 2 - PostgreSQL local:"
echo "createdb tamagotchi_pro"
echo "psql -d tamagotchi_pro -c \"CREATE USER tamagotchi_user WITH PASSWORD 'tamagotchi_pass';\""
echo "psql -d tamagotchi_pro -c \"GRANT ALL PRIVILEGES ON DATABASE tamagotchi_pro TO tamagotchi_user;\""

echo ""
echo "🚀 Para continuar ejecuta una de las opciones arriba..."
