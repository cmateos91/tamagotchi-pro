#!/bin/bash

echo "👥 USUARIOS REGISTRADOS EN TAMAGOTCHI PRO"
echo "========================================"

# Verificar si PostgreSQL está corriendo
if ! docker ps | grep -q tamagotchi-postgres; then
    echo "❌ PostgreSQL no está corriendo. Iniciando..."
    docker start tamagotchi-postgres
    sleep 3
fi

echo "📊 Total de usuarios:"
docker exec tamagotchi-postgres psql -U tamagotchi_user -d tamagotchi_pro -t -c "SELECT COUNT(*) FROM users;" | xargs echo "   👤"

echo ""
echo "📋 Lista de usuarios:"
docker exec tamagotchi-postgres psql -U tamagotchi_user -d tamagotchi_pro -c "
SELECT 
    ROW_NUMBER() OVER (ORDER BY created_at) as \"#\",
    username as \"Usuario\",
    email as \"Email\", 
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as \"Registrado\"
FROM users 
ORDER BY created_at DESC;
"

echo ""
echo "🐾 Criaturas por usuario:"
docker exec tamagotchi-postgres psql -U tamagotchi_user -d tamagotchi_pro -c "
SELECT 
    u.username as \"Usuario\",
    COALESCE(COUNT(c.id), 0) as \"Criaturas\",
    CASE 
        WHEN COUNT(c.id) = 0 THEN '❌ Sin criaturas'
        ELSE '✅ ' || STRING_AGG(c.name, ', ')
    END as \"Nombres\"
FROM users u
LEFT JOIN creatures c ON u.id = c.user_id
GROUP BY u.username
ORDER BY COUNT(c.id) DESC;
"

echo ""
echo "🕒 Usuarios recientes:"
docker exec tamagotchi-postgres psql -U tamagotchi_user -d tamagotchi_pro -c "
SELECT 
    username as \"Usuario\",
    CASE 
        WHEN created_at > NOW() - INTERVAL '1 hour' THEN '🆕 Hace ' || EXTRACT(MINUTE FROM NOW() - created_at) || ' minutos'
        WHEN created_at > NOW() - INTERVAL '1 day' THEN '📅 Hoy ' || TO_CHAR(created_at, 'HH24:MI')
        ELSE '📅 ' || TO_CHAR(created_at, 'DD/MM/YYYY')
    END as \"Cuándo\"
FROM users 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 5;
"
