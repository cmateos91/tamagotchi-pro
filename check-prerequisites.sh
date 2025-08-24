#!/bin/bash

# Script de verificación de prerequisitos para Tamagotchi Pro
echo "🔍 Verificando prerequisitos..."

# Verificar Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
    
    # Verificar si la versión es >= 18
    NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR_VERSION" -ge 18 ]; then
        echo "   ✅ Versión compatible (>= 18)"
    else
        echo "   ⚠️  Versión antigua. Se recomienda Node.js 18+"
    fi
else
    echo "❌ Node.js no está instalado"
    echo "   📥 Instalar desde: https://nodejs.org/"
fi

# Verificar npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm: $NPM_VERSION"
else
    echo "❌ npm no está instalado"
fi

# Verificar PostgreSQL
if command -v psql >/dev/null 2>&1; then
    PSQL_VERSION=$(psql --version)
    echo "✅ PostgreSQL: $PSQL_VERSION"
else
    echo "⚠️  PostgreSQL no está instalado"
    echo "   📥 Instalar desde: https://www.postgresql.org/download/"
    echo "   💡 O usar Docker: docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:13"
fi

echo ""
echo "🎯 Resumen:"
echo "   - Si tienes Node.js 18+ y npm: ✅ Listo para continuar"
echo "   - Si falta PostgreSQL: Usa Docker o instala localmente"
echo "   - Si falta Node.js: Instala desde nodejs.org"
