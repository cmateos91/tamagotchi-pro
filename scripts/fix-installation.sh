#!/bin/bash

echo "🔄 COMPLETANDO INSTALACIÓN TAMAGOTCHI PRO"
echo "========================================"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

show_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

show_error() {
    echo -e "${RED}❌ $1${NC}"
}

show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Verificar que PostgreSQL esté funcionando en Docker
show_step "Verificando PostgreSQL en Docker..."

if ! docker ps | grep -q tamagotchi-postgres; then
    show_error "PostgreSQL no está corriendo en Docker"
    echo "Ejecuta primero: sudo ./install.sh"
    exit 1
fi

show_success "PostgreSQL corriendo en Docker"

# Ejecutar migraciones usando Docker
show_step "Ejecutando migraciones con Docker..."

# Copiar archivo de migración al contenedor
docker cp server/migrations/001_initial_schema.sql tamagotchi-postgres:/tmp/

# Ejecutar migración dentro del contenedor
if docker exec -i tamagotchi-postgres psql -U tamagotchi_user -d tamagotchi_pro -f /tmp/001_initial_schema.sql; then
    show_success "Migraciones ejecutadas correctamente"
else
    show_error "Error ejecutando migraciones"
    
    # Mostrar logs de PostgreSQL para debug
    echo "📋 Logs de PostgreSQL:"
    docker logs tamagotchi-postgres --tail 20
    exit 1
fi

# Compilar TypeScript del servidor
show_step "Compilando TypeScript del servidor..."
cd server

if ! npm run build; then
    show_error "Error compilando TypeScript"
    exit 1
fi

show_success "TypeScript compilado correctamente"

# Verificar que el cliente no tiene dependencias instaladas
show_step "Verificando dependencias del cliente..."
cd ../client

if [ ! -d "node_modules" ]; then
    show_step "Instalando dependencias del cliente..."
    if ! npm install; then
        show_error "Error instalando dependencias del cliente"
        exit 1
    fi
    show_success "Dependencias del cliente instaladas"
else
    show_success "Dependencias del cliente ya instaladas"
fi

# Crear scripts de inicio si no existen
cd ..
if [ ! -f "start-all.sh" ]; then
    show_step "Creando scripts de inicio..."

    # Script para iniciar el servidor
    cat > start-server.sh << 'EOF'
#!/bin/bash
echo "🚀 Iniciando servidor Tamagotchi Pro..."
cd server
npm run dev
EOF

    # Script para iniciar el cliente
    cat > start-client.sh << 'EOF'
#!/bin/bash
echo "🎮 Iniciando cliente Tamagotchi Pro..."
cd client
npm run dev
EOF

    # Script para iniciar ambos
    cat > start-all.sh << 'EOF'
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
EOF

    chmod +x start-server.sh start-client.sh start-all.sh
    show_success "Scripts de inicio creados"
fi

# Verificar que la base de datos tiene datos
show_step "Verificando instalación de la base de datos..."

DB_CHECK=$(docker exec tamagotchi-postgres psql -U tamagotchi_user -d tamagotchi_pro -tAc "SELECT COUNT(*) FROM achievements;")

if [ "$DB_CHECK" -gt "0" ]; then
    show_success "Base de datos configurada correctamente ($DB_CHECK logros instalados)"
else
    show_warning "La base de datos parece estar vacía"
fi

echo ""
echo -e "${GREEN}🎉 INSTALACIÓN COMPLETADA${NC}"
echo "=========================="
echo ""
echo -e "${BLUE}🚀 Para iniciar Tamagotchi Pro:${NC}"
echo ""
echo "   ./start-all.sh"
echo ""
echo -e "${BLUE}🌐 URLs de acceso:${NC}"
echo "   🎮 Juego:    http://localhost:5173"
echo "   🔧 API:      http://localhost:3000"
echo "   📊 Health:   http://localhost:3000/api/health"
echo ""
echo -e "${BLUE}🎯 Primeros pasos:${NC}"
echo "   1. Ejecuta: ./start-all.sh"
echo "   2. Abre: http://localhost:5173"
echo "   3. Registra una cuenta nueva"
echo "   4. Crea tu primera criatura"
echo "   5. ¡Empieza a cuidarla!"
echo ""
echo -e "${BLUE}🐘 Comandos útiles de PostgreSQL:${NC}"
echo "   • Ver logs: docker logs tamagotchi-postgres"
echo "   • Parar DB: docker stop tamagotchi-postgres"
echo "   • Iniciar DB: docker start tamagotchi-postgres"
echo "   • Conectar: docker exec -it tamagotchi-postgres psql -U tamagotchi_user -d tamagotchi_pro"
echo ""
echo -e "${YELLOW}💡 Consejos:${NC}"
echo "   • Usa Chrome/Safari para mejor experiencia PWA"
echo "   • Puedes instalar como app desde el navegador"
echo "   • Los datos persisten en el contenedor Docker"
echo ""
show_success "¡Todo listo! Disfruta tu Tamagotchi Pro!"
