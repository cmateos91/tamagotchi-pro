#!/bin/bash

echo "🔍 VERIFICANDO USUARIOS EN LA BASE DE DATOS"
echo "==========================================="

echo "📊 Usuarios registrados:"
docker exec tamagotchi-postgres psql -U tamagotchi_user -d tamagotchi_pro -c "
SELECT 
    username,
    email,
    created_at,
    CASE 
        WHEN created_at > NOW() - INTERVAL '1 hour' THEN '🆕 Nuevo'
        WHEN created_at > NOW() - INTERVAL '1 day' THEN '📅 Hoy'
        ELSE '📅 ' || DATE(created_at)
    END as estado
FROM users 
ORDER BY created_at DESC;
"

echo ""
echo "📈 Estadísticas:"
docker exec tamagotchi-postgres psql -U tamagotchi_user -d tamagotchi_pro -c "
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as registros_hoy,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as registros_ultima_hora
FROM users;
"

echo ""
echo "🐾 Criaturas por usuario:"
docker exec tamagotchi-postgres psql -U tamagotchi_user -d tamagotchi_pro -c "
SELECT 
    u.username,
    COUNT(c.id) as num_criaturas,
    STRING_AGG(c.name, ', ') as nombres_criaturas
FROM users u
LEFT JOIN creatures c ON u.id = c.user_id
GROUP BY u.username
ORDER BY num_criaturas DESC;
"
