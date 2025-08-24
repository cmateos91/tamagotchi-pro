#!/bin/bash

echo "🎮 INSTALANDO TAMAGOTCHI PRO (SIN DOCKER)"
echo "========================================="

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# PASO 1: Verificar prerequisitos
show_step "Verificando prerequisitos..."

if ! command -v node &> /dev/null; then
    show_error "Node.js no está instalado"
    exit 1
fi

NODE_VERSION=$(node --version)
show_success "Node.js $NODE_VERSION encontrado"

# PASO 2: Instalar PostgreSQL
show_step "Configurando PostgreSQL..."

if ! command -v psql &> /dev/null; then
    show_warning "PostgreSQL no está instalado. Instalando..."
    
    # Detectar distribución
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        sudo yum install -y postgresql postgresql-server postgresql-contrib
        sudo postgresql-setup initdb
    elif command -v pacman &> /dev/null; then
        # Arch Linux
        sudo pacman -S postgresql
        sudo -u postgres initdb -D /var/lib/postgres/data
    else
        show_error "Distribución no soportada. Instala PostgreSQL manualmente"
        exit 1
    fi
    
    # Iniciar servicio PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    show_success "PostgreSQL instalado e iniciado"
else
    show_success "PostgreSQL ya está instalado"
    
    # Asegurar que el servicio esté corriendo
    sudo systemctl start postgresql 2>/dev/null || true
fi

# PASO 3: Configurar base de datos y usuario
show_step "Configurando base de datos tamagotchi_pro..."

# Crear usuario y base de datos
sudo -u postgres psql << EOF
-- Crear usuario si no existe
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'tamagotchi_user') THEN
        CREATE USER tamagotchi_user WITH PASSWORD 'tamagotchi_pass';
    END IF;
END
\$\$;

-- Crear base de datos si no existe
SELECT 'CREATE DATABASE tamagotchi_pro OWNER tamagotchi_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'tamagotchi_pro')\gexec

-- Dar permisos
GRANT ALL PRIVILEGES ON DATABASE tamagotchi_pro TO tamagotchi_user;
ALTER USER tamagotchi_user CREATEDB;

\q
EOF

if [ $? -eq 0 ]; then
    show_success "Base de datos configurada correctamente"
else
    show_error "Error configurando la base de datos"
    exit 1
fi

# PASO 4: Instalar dependencias del servidor
show_step "Instalando dependencias del servidor..."
cd server

if ! npm install; then
    show_error "Error instalando dependencias del servidor"
    exit 1
fi

show_success "Dependencias del servidor instaladas"

# PASO 5: Ejecutar migraciones
show_step "Ejecutando migraciones de base de datos..."

if PGPASSWORD=tamagotchi_pass psql -h localhost -U tamagotchi_user -d tamagotchi_pro -f migrations/001_initial_schema.sql; then
    show_success "Migraciones ejecutadas correctamente"
else
    show_error "Error ejecutando migraciones"
    
    # Intentar con configuración alternativa
    show_step "Intentando configuración alternativa..."
    sudo -u postgres PGPASSWORD=tamagotchi_pass psql -d tamagotchi_pro -f migrations/001_initial_schema.sql
    
    if [ $? -eq 0 ]; then
        show_success "Migraciones ejecutadas con configuración alternativa"
    else
        show_error "Error ejecutando migraciones"
        exit 1
    fi
fi

# PASO 6: Compilar TypeScript
show_step "Compilando TypeScript..."
if ! npm run build; then
    show_error "Error compilando TypeScript"
    exit 1
fi

show_success "TypeScript compilado correctamente"

# PASO 7: Instalar dependencias del cliente
show_step "Instalando dependencias del cliente..."
cd ../client

if ! npm install; then
    show_error "Error instalando dependencias del cliente"
    exit 1
fi

show_success "Dependencias del cliente instaladas"

# PASO 8: Crear scripts de inicio
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
echo "Presiona Ctrl+C para cerrar"

wait
EOF

chmod +x start-server.sh start-client.sh start-all.sh

show_success "Scripts de inicio creados"

echo ""
echo -e "${GREEN}🎉 INSTALACIÓN COMPLETADA SIN DOCKER${NC}"
echo "====================================="
echo ""
echo -e "${BLUE}🚀 Para iniciar Tamagotchi Pro:${NC}"
echo "   ./start-all.sh"
echo ""
echo -e "${BLUE}🌐 URLs de acceso:${NC}"
echo "   🎮 Juego:    http://localhost:5173"
echo "   🔧 API:      http://localhost:3000"
echo ""
echo -e "${BLUE}📊 Info de la base de datos:${NC}"
echo "   🗄️  Database: tamagotchi_pro"
echo "   👤 User: tamagotchi_user"
echo "   🔑 Password: tamagotchi_pass"
echo "   📍 Host: localhost:5432"
echo ""
show_success "¡PostgreSQL corriendo como servicio del sistema!"
