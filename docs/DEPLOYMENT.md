# 🚀 Guía de Despliegue - Tamagotchi Pro

Esta guía te ayudará a desplegar Tamagotchi Pro en diferentes entornos de producción.

## 📋 Requisitos Previos

### Hardware Mínimo
- **CPU**: 2 cores
- **RAM**: 2GB
- **Almacenamiento**: 10GB SSD
- **Ancho de banda**: 100 Mbps

### Hardware Recomendado
- **CPU**: 4+ cores
- **RAM**: 4GB+
- **Almacenamiento**: 20GB+ SSD
- **Ancho de banda**: 1 Gbps

### Software
- **Sistema Operativo**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js**: 18.x o superior
- **PostgreSQL**: 13.x o superior
- **Nginx**: 1.18+ (recomendado como proxy reverso)
- **SSL Certificate**: Let's Encrypt o certificado comercial

## 🐳 Despliegue con Docker (Recomendado)

### 1. Preparar el Entorno

```bash
# Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Configurar Variables de Entorno

```bash
# Crear archivo de configuración
cp .env.example .env.production

# Editar configuración de producción
nano .env.production
```

**Configuración de producción (.env.production):**
```env
# Base de datos
DATABASE_URL=postgresql://tamagotchi_user:secure_password@postgres:5432/tamagotchi_pro
DB_HOST=postgres
DB_PORT=5432
DB_NAME=tamagotchi_pro
DB_USER=tamagotchi_user
DB_PASSWORD=secure_password_here

# JWT (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET=your-super-secure-jwt-secret-key-256-bits
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-256-bits
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Servidor
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# Administración
ADMIN_USER_IDS=admin-user-id-1,admin-user-id-2

# Límites
UPLOAD_MAX_SIZE=5mb
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# PostgreSQL (para contenedor)
POSTGRES_DB=tamagotchi_pro
POSTGRES_USER=tamagotchi_user
POSTGRES_PASSWORD=secure_password_here
```

### 3. Crear docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./server/uploads:/app/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=https://your-domain.com/api
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 4. Crear Dockerfiles

**Backend Dockerfile (server/Dockerfile):**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

EXPOSE 3000

USER node

CMD ["npm", "start"]
```

**Frontend Dockerfile (client/Dockerfile):**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### 5. Configurar Nginx

**nginx.conf:**
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Configuración de logs
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Configuración de compresión
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/json application/xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

    # Upstream backend
    upstream backend {
        server backend:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

        # Frontend
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Auth routes with stricter rate limiting
        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket support (si se implementa en el futuro)
        location /ws/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }
    }
}
```

### 6. Desplegar

```bash
# Construir y iniciar servicios
docker-compose -f docker-compose.yml --env-file .env.production up -d --build

# Verificar estado
docker-compose ps

# Ver logs
docker-compose logs -f

# Ejecutar migraciones (si es necesario)
docker-compose exec backend npm run migrate
```

## 🔧 Despliegue Manual

### 1. Preparar el Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Instalar Nginx
sudo apt install nginx -y

# Instalar PM2 para gestión de procesos
sudo npm install -g pm2
```

### 2. Configurar PostgreSQL

```bash
# Cambiar a usuario postgres
sudo -u postgres psql

-- Crear base de datos y usuario
CREATE DATABASE tamagotchi_pro;
CREATE USER tamagotchi_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE tamagotchi_pro TO tamagotchi_user;
\q

# Configurar acceso
sudo nano /etc/postgresql/13/main/pg_hba.conf
# Agregar: local   tamagotchi_pro   tamagotchi_user   md5

sudo systemctl restart postgresql
```

### 3. Desplegar Backend

```bash
# Crear directorio de aplicación
sudo mkdir -p /var/www/tamagotchi-pro
sudo chown $USER:$USER /var/www/tamagotchi-pro

# Clonar y configurar
cd /var/www/tamagotchi-pro
git clone <repository-url> .

# Configurar backend
cd server
npm install --production
cp .env.example .env

# Editar configuración
nano .env

# Construir aplicación
npm run build

# Ejecutar migraciones
npm run migrate

# Configurar PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'tamagotchi-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/tamagotchi-error.log',
    out_file: '/var/log/pm2/tamagotchi-out.log',
    log_file: '/var/log/pm2/tamagotchi-combined.log',
    time: true
  }]
};
```

### 4. Desplegar Frontend

```bash
# Construir frontend
cd ../client
npm install
npm run build

# Copiar archivos a Nginx
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
```

### 5. Configurar Nginx

```bash
# Crear configuración del sitio
sudo nano /etc/nginx/sites-available/tamagotchi-pro

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/tamagotchi-pro /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

## 🔒 Configurar SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Verificar renovación automática
sudo certbot renew --dry-run

# Configurar cron para renovación
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoreo y Logs

### 1. Configurar Logs

```bash
# Crear directorio de logs
sudo mkdir -p /var/log/tamagotchi-pro
sudo chown $USER:$USER /var/log/tamagotchi-pro

# Configurar rotación de logs
sudo nano /etc/logrotate.d/tamagotchi-pro
```

**/etc/logrotate.d/tamagotchi-pro:**
```
/var/log/tamagotchi-pro/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reload tamagotchi-backend
    endscript
}
```

### 2. Monitoreo con PM2

```bash
# Ver estado de procesos
pm2 status

# Ver logs en tiempo real
pm2 logs

# Monitoreo web
pm2 web

# Métricas
pm2 monit
```

### 3. Configurar Alertas

**scripts/health-check.sh:**
```bash
#!/bin/bash

# Health check script
HEALTH_URL="https://your-domain.com/api/admin/health"
WEBHOOK_URL="your-slack-webhook-url"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response != "200" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 Tamagotchi Pro health check failed! Status: '$response'"}' \
        $WEBHOOK_URL
fi
```

```bash
# Hacer ejecutable
chmod +x scripts/health-check.sh

# Agregar a cron (cada 5 minutos)
crontab -e
# Agregar: */5 * * * * /var/www/tamagotchi-pro/scripts/health-check.sh
```

## 🔄 Actualizaciones

### Actualización con Docker

```bash
# Hacer backup de la base de datos
docker-compose exec postgres pg_dump -U tamagotchi_user tamagotchi_pro > backup.sql

# Actualizar código
git pull origin main

# Reconstruir y desplegar
docker-compose down
docker-compose up -d --build

# Verificar estado
docker-compose ps
docker-compose logs -f
```

### Actualización Manual

```bash
# Backup de base de datos
pg_dump -U tamagotchi_user -h localhost tamagotchi_pro > backup-$(date +%Y%m%d).sql

# Actualizar código
cd /var/www/tamagotchi-pro
git pull origin main

# Actualizar backend
cd server
npm install --production
npm run build

# Ejecutar migraciones si hay
npm run migrate

# Reiniciar aplicación
pm2 restart tamagotchi-backend

# Actualizar frontend
cd ../client
npm install
npm run build
sudo cp -r dist/* /var/www/html/

# Reiniciar Nginx
sudo systemctl reload nginx
```

## 🛡️ Seguridad Adicional

### 1. Firewall

```bash
# Configurar UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Fail2Ban

```bash
# Instalar Fail2Ban
sudo apt install fail2ban -y

# Configurar para Nginx
sudo nano /etc/fail2ban/jail.local
```

**/etc/fail2ban/jail.local:**
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
```

### 3. Backup Automático

**scripts/backup.sh:**
```bash
#!/bin/bash

BACKUP_DIR="/var/backups/tamagotchi-pro"
DATE=$(date +%Y%m%d_%H%M%S)

# Crear directorio de backup
mkdir -p $BACKUP_DIR

# Backup de base de datos
pg_dump -U tamagotchi_user -h localhost tamagotchi_pro | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup de archivos subidos
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/tamagotchi-pro/server/uploads/

# Limpiar backups antiguos (mantener 30 días)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completado: $DATE"
```

```bash
# Programar backup diario
crontab -e
# Agregar: 0 2 * * * /var/www/tamagotchi-pro/scripts/backup.sh
```

## 🔍 Troubleshooting

### Problemas Comunes

#### 1. Error de Conexión a Base de Datos
```bash
# Verificar estado de PostgreSQL
sudo systemctl status postgresql

# Verificar logs
sudo tail -f /var/log/postgresql/postgresql-13-main.log

# Probar conexión
psql -U tamagotchi_user -h localhost -d tamagotchi_pro
```

#### 2. Error 502 Bad Gateway
```bash
# Verificar estado del backend
pm2 status

# Verificar logs del backend
pm2 logs tamagotchi-backend

# Verificar configuración de Nginx
sudo nginx -t
```

#### 3. Alto Uso de Memoria
```bash
# Verificar uso de memoria
free -h
pm2 monit

# Reiniciar aplicación
pm2 restart tamagotchi-backend
```

#### 4. Logs de Depuración
```bash
# Habilitar logs detallados
export DEBUG=tamagotchi:*
pm2 restart tamagotchi-backend --update-env

# Ver logs en tiempo real
tail -f /var/log/tamagotchi-pro/app.log
```

### Comandos Útiles

```bash
# Estado general del sistema
sudo systemctl status nginx postgresql
pm2 status

# Uso de recursos
htop
df -h
free -h

# Conexiones de red
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :80

# Logs importantes
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
pm2 logs --lines 100
```

## 📞 Soporte

Si encuentras problemas durante el despliegue:

1. Revisa los logs detalladamente
2. Verifica la configuración de red y firewall
3. Consulta la documentación de troubleshooting
4. Abre un issue en GitHub con detalles completos

¡Tu aplicación Tamagotchi Pro estará lista para miles de usuarios! 🚀

