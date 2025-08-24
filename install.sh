#!/bin/bash

echo "🎮 INSTALANDO TAMAGOTCHI PRO"
echo "=============================="

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar pasos
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

# Verificar que estamos en el directorio correcto
if [[ ! -f "README.md" || ! -d "server" || ! -d "client" ]]; then
    show_error "Por favor ejecuta este script desde el directorio tamagotchi-pro"
    exit 1
fi

# PASO 1: Verificar prerequisitos
show_step "Verificando prerequisitos..."

if ! command -v node &> /dev/null; then
    show_error "Node.js no está instalado. Instala desde https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    show_error "npm no está instalado"
    exit 1
fi

NODE_VERSION=$(node --version)
show_success "Node.js $NODE_VERSION encontrado"

# PASO 2: Configurar base de datos
show_step "Configurando base de datos..."

# Verificar si Docker está disponible
if command -v docker &> /dev/null; then
    show_success "Docker encontrado. Iniciando PostgreSQL..."
    
    # Detener contenedor si existe
    docker stop tamagotchi-postgres 2>/dev/null || true
    docker rm tamagotchi-postgres 2>/dev/null || true
    
    # Crear y iniciar contenedor PostgreSQL
    docker run --name tamagotchi-postgres \
        -e POSTGRES_DB=tamagotchi_pro \
        -e POSTGRES_USER=tamagotchi_user \
        -e POSTGRES_PASSWORD=tamagotchi_pass \
        -p 5432:5432 \
        -d postgres:13
    
    if [ $? -eq 0 ]; then
        show_success "PostgreSQL iniciado en Docker"
        echo "   📍 Host: localhost:5432"
        echo "   🗄️  Database: tamagotchi_pro" 
        echo "   👤 User: tamagotchi_user"
        echo "   🔑 Password: tamagotchi_pass"
    else
        show_error "Error iniciando PostgreSQL con Docker"
        exit 1
    fi
    
    # Esperar a que PostgreSQL esté listo
    show_step "Esperando a que PostgreSQL esté listo..."
    sleep 10
else
    show_warning "Docker no encontrado. Debes instalar PostgreSQL manualmente"
    echo "   1. Instala PostgreSQL: https://www.postgresql.org/download/"
    echo "   2. Crea la base de datos: createdb tamagotchi_pro"
    echo "   3. Crea el usuario con los datos del archivo server/.env"
    read -p "¿Has configurado PostgreSQL manualmente? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        show_error "PostgreSQL es necesario para continuar"
        exit 1
    fi
fi

# PASO 3: Instalar dependencias del servidor
show_step "Instalando dependencias del servidor..."
cd server

if ! npm install; then
    show_error "Error instalando dependencias del servidor"
    exit 1
fi

show_success "Dependencias del servidor instaladas"

# PASO 4: Ejecutar migraciones
show_step "Ejecutando migraciones de base de datos..."

# Esperar un poco más para asegurar que PostgreSQL esté listo
sleep 5

# Intentar ejecutar migraciones
max_attempts=5
attempt=1

while [ $attempt -le $max_attempts ]; do
    show_step "Intento $attempt de $max_attempts: Ejecutando migraciones..."
    
    if PGPASSWORD=tamagotchi_pass psql -h localhost -U tamagotchi_user -d tamagotchi_pro -f migrations/001_initial_schema.sql; then
        show_success "Migraciones ejecutadas correctamente"
        break
    else
        show_warning "Intento $attempt falló. Esperando 5 segundos..."
        sleep 5
        attempt=$((attempt + 1))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    show_error "Error ejecutando migraciones después de $max_attempts intentos"
    echo "   💡 Verifica que PostgreSQL esté funcionando:"
    echo "   docker logs tamagotchi-postgres"
    exit 1
fi

# PASO 5: Compilar TypeScript
show_step "Compilando TypeScript..."
if ! npm run build; then
    show_error "Error compilando TypeScript"
    exit 1
fi

show_success "TypeScript compilado correctamente"

# PASO 6: Instalar dependencias del cliente
show_step "Instalando dependencias del cliente..."
cd ../client

if ! npm install; then
    show_error "Error instalando dependencias del cliente"
    exit 1
fi

show_success "Dependencias del cliente instaladas"

# PASO 7: Crear scripts de inicio
show_step "Creando scripts de inicio..."
cd ..

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

# Función para manejar Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Cerrando aplicación..."
    kill $SERVER_PID $CLIENT_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT

# Iniciar servidor en background
echo "🚀 Iniciando servidor..."
cd server && npm run dev &
SERVER_PID=$!

# Esperar un poco
sleep 3

# Iniciar cliente en background  
echo "🎮 Iniciando cliente..."
cd ../client && npm run dev &
CLIENT_PID=$!

echo ""
echo "✅ Tamagotchi Pro iniciado:"
echo "   🔧 Backend:  http://localhost:3000"
echo "   🎮 Frontend: http://localhost:5173"
echo ""
echo "Presiona Ctrl+C para cerrar"

# Esperar a que los procesos terminen
wait
EOF

# Hacer scripts ejecutables
chmod +x start-server.sh start-client.sh start-all.sh

show_success "Scripts de inicio creados"

# PASO FINAL: Mostrar instrucciones
echo ""
echo -e "${GREEN}🎉 INSTALACIÓN COMPLETADA${NC}"
echo "=========================="
echo ""
echo -e "${BLUE}🚀 Para iniciar Tamagotchi Pro:${NC}"
echo ""
echo "   Opción 1 - Todo automático:"
echo "   ./start-all.sh"
echo ""
echo "   Opción 2 - Manual (2 terminales):"
echo "   Terminal 1: ./start-server.sh"
echo "   Terminal 2: ./start-client.sh"
echo ""
echo -e "${BLUE}🌐 URLs de acceso:${NC}"
echo "   🎮 Juego:    http://localhost:5173"
echo "   🔧 API:      http://localhost:3000"
echo "   📊 Health:   http://localhost:3000/api/health"
echo ""
echo -e "${BLUE}🎯 Primeros pasos:${NC}"
echo "   1. Abre http://localhost:5173 en tu navegador"
echo "   2. Registra una cuenta nueva"
echo "   3. Crea tu primera criatura"
echo "   4. ¡Empieza a cuidarla!"
echo ""
echo -e "${YELLOW}💡 Consejos:${NC}"
echo "   • Usa Chrome/Safari para mejor experiencia PWA"
echo "   • Puedes instalar como app desde el navegador"
echo "   • Los datos se guardan en PostgreSQL"
echo "   • Revisa la documentación en docs/"
echo ""
show_success "¡Disfruta tu Tamagotchi Pro!"
