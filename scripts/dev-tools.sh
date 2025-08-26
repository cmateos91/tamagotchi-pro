#!/bin/bash

# Tamagotchi Pro - Developer Tools
# Útiles comandos para desarrollo con IA

echo "🛠️  TAMAGOTCHI PRO - HERRAMIENTAS DE DESARROLLO"
echo "============================================="
echo ""

# Función de ayuda
show_help() {
    echo "Comandos disponibles:"
    echo ""
    echo "📊 ANÁLISIS:"
    echo "  ./scripts/dev-tools.sh stats     - Estadísticas del proyecto"
    echo "  ./scripts/dev-tools.sh types     - Análisis de tipos TypeScript"
    echo "  ./scripts/dev-tools.sh api       - Endpoints disponibles"
    echo ""
    echo "🧹 LIMPIEZA:"
    echo "  ./scripts/dev-tools.sh clean     - Limpiar archivos temporales"
    echo "  ./scripts/dev-tools.sh reset-db  - Resetear base de datos"
    echo ""
    echo "🔧 DESARROLLO:"
    echo "  ./scripts/dev-tools.sh logs      - Ver logs en tiempo real"
    echo "  ./scripts/dev-tools.sh test-all  - Ejecutar todos los tests"
    echo "  ./scripts/dev-tools.sh build-all - Build completo"
    echo ""
    echo "🐛 DEBUG:"
    echo "  ./scripts/dev-tools.sh debug-on  - Activar modo debug"
    echo "  ./scripts/dev-tools.sh debug-off - Desactivar modo debug"
    echo ""
}

# Estadísticas del proyecto
show_stats() {
    echo "📊 ESTADÍSTICAS DEL PROYECTO"
    echo "-------------------------"
    
    echo "📁 Archivos por tipo:"
    find . -name "*.ts" -not -path "./node_modules/*" -not -path "./.git/*" | wc -l | xargs echo "  TypeScript:"
    find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*" | wc -l | xargs echo "  JavaScript:"
    find . -name "*.css" -not -path "./node_modules/*" | wc -l | xargs echo "  CSS:"
    find . -name "*.html" -not -path "./node_modules/*" | wc -l | xargs echo "  HTML:"
    find . -name "*.md" -not -path "./node_modules/*" | wc -l | xargs echo "  Markdown:"
    
    echo ""
    echo "📦 Líneas de código:"
    find . -name "*.ts" -not -path "./node_modules/*" -not -path "./.git/*" -exec cat {} \; | wc -l | xargs echo "  TypeScript:"
    find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*" -exec cat {} \; | wc -l | xargs echo "  JavaScript:"
    
    echo ""
    echo "🗃️  Base de datos:"
    if docker ps | grep -q tamagotchi-postgres; then
        echo "  PostgreSQL: ✅ Ejecutándose"
    else
        echo "  PostgreSQL: ❌ Detenido"
    fi
}

# Análisis de tipos TypeScript
analyze_types() {
    echo "🔍 ANÁLISIS DE TIPOS TYPESCRIPT"
    echo "-----------------------------"
    
    echo "📋 Interfaces definidas:"
    grep -r "export interface" shared/ server/src/ --include="*.ts" | wc -l | xargs echo "  Total:"
    
    echo ""
    echo "🎯 Enums definidos:"
    grep -r "export enum" shared/ server/src/ --include="*.ts" | wc -l | xargs echo "  Total:"
    
    echo ""
    echo "📝 Tipos principales en shared/types.ts:"
    grep "export interface\|export enum" shared/types.ts | sed 's/export interface /  Interface: /' | sed 's/export enum /  Enum: /' | sed 's/ {.*//'
}

# Mostrar APIs disponibles
show_apis() {
    echo "🌐 ENDPOINTS DE LA API"
    echo "--------------------"
    
    echo "🔐 Autenticación (/api/auth):"
    echo "  POST /register - Registro de usuario"
    echo "  POST /login - Iniciar sesión"  
    echo "  POST /refresh - Renovar token"
    echo "  POST /logout - Cerrar sesión"
    
    echo ""
    echo "🐾 Criaturas (/api/creatures):"
    echo "  GET / - Obtener criaturas del usuario"
    echo "  POST / - Crear nueva criatura"
    echo "  GET /:id - Obtener criatura específica"
    echo "  POST /:id/feed - Alimentar criatura"
    echo "  POST /:id/play - Jugar con criatura"
    echo "  POST /:id/clean - Limpiar criatura"
    
    echo ""
    echo "⚔️  Batallas (/api/battles):"
    echo "  POST /start - Iniciar batalla"
    echo "  GET /history - Historial de batallas"
    
    echo ""
    echo "🏆 Logros (/api/achievements):"
    echo "  GET / - Obtener logros disponibles"
    echo "  GET /user - Logros del usuario"
    
    echo ""
    echo "📊 Leaderboards (/api/leaderboard):"
    echo "  GET /experience - Ranking por experiencia"
    echo "  GET /battles - Ranking por batallas"
}

# Limpiar archivos temporales
clean_temp() {
    echo "🧹 LIMPIANDO ARCHIVOS TEMPORALES"
    echo "------------------------------"
    
    echo "🗑️  Limpiando node_modules..."
    rm -rf server/node_modules client/node_modules
    
    echo "🗑️  Limpiando dist..."
    rm -rf server/dist client/dist
    
    echo "🗑️  Limpiando archivos de log..."
    rm -f *.log server/*.log client/*.log
    
    echo "✅ Limpieza completada"
}

# Resetear base de datos
reset_database() {
    echo "🔄 RESETEANDO BASE DE DATOS"
    echo "-------------------------"
    
    if docker ps | grep -q tamagotchi-postgres; then
        echo "🛑 Deteniendo PostgreSQL..."
        docker stop tamagotchi-postgres
    fi
    
    echo "🗑️  Eliminando contenedor anterior..."
    docker rm tamagotchi-postgres 2>/dev/null || true
    
    echo "🚀 Ejecutando instalación fresca..."
    ./scripts/install.sh
    
    echo "✅ Base de datos reseteada"
}

# Ver logs en tiempo real
show_logs() {
    echo "📋 LOGS EN TIEMPO REAL"
    echo "--------------------"
    echo "Presiona Ctrl+C para salir"
    echo ""
    
    if docker ps | grep -q tamagotchi-postgres; then
        docker logs -f tamagotchi-postgres &
        LOG_PID=$!
        trap "kill $LOG_PID 2>/dev/null" SIGINT
        wait $LOG_PID
    else
        echo "❌ PostgreSQL no está ejecutándose"
    fi
}

# Ejecutar todos los tests
run_all_tests() {
    echo "🧪 EJECUTANDO TODOS LOS TESTS"
    echo "----------------------------"
    
    echo "🔧 Tests del servidor..."
    cd server && npm test
    
    echo ""
    echo "🎮 Tests del cliente..."
    cd ../client && npm test
    
    cd ..
    echo "✅ Todos los tests completados"
}

# Build completo
build_all() {
    echo "🔨 BUILD COMPLETO"
    echo "---------------"
    
    echo "🔧 Compilando servidor..."
    cd server && npm run build
    
    echo ""
    echo "🎮 Compilando cliente..."
    cd ../client && npm run build
    
    cd ..
    echo "✅ Build completado"
}

# Activar modo debug
debug_on() {
    echo "🐛 ACTIVANDO MODO DEBUG"
    echo "---------------------"
    
    # Para el cliente
    echo "localStorage.setItem('tamagotchi_debug', 'true');" > client/debug-enable.js
    echo "🎮 Debug activado para cliente (recarga la página)"
    
    # Para el servidor (variable de entorno)
    export DEBUG=tamagotchi:*
    echo "🔧 Debug activado para servidor"
    
    echo "✅ Modo debug activado"
}

# Desactivar modo debug
debug_off() {
    echo "🔇 DESACTIVANDO MODO DEBUG"
    echo "------------------------"
    
    # Para el cliente
    echo "localStorage.removeItem('tamagotchi_debug');" > client/debug-disable.js
    echo "🎮 Debug desactivado para cliente (recarga la página)"
    
    # Para el servidor
    unset DEBUG
    echo "🔧 Debug desactivado para servidor"
    
    echo "✅ Modo debug desactivado"
}

# Procesar argumentos
case "$1" in
    "stats")
        show_stats
        ;;
    "types")
        analyze_types
        ;;
    "api")
        show_apis
        ;;
    "clean")
        clean_temp
        ;;
    "reset-db")
        reset_database
        ;;
    "logs")
        show_logs
        ;;
    "test-all")
        run_all_tests
        ;;
    "build-all")
        build_all
        ;;
    "debug-on")
        debug_on
        ;;
    "debug-off")
        debug_off
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        echo "❌ Comando no reconocido: $1"
        echo ""
        show_help
        exit 1
        ;;
esac