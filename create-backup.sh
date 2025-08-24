#!/bin/bash

echo "📦 CREANDO BACKUP DE TAMAGOTCHI PRO"
echo "=================================="

# Crear directorio para backups
mkdir -p backups

# Fecha actual para el nombre del archivo
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/tamagotchi_backup_${DATE}.sql"

echo "💾 Creando backup en: $BACKUP_FILE"

# Crear backup completo de la base de datos
docker exec tamagotchi-postgres pg_dump -U tamagotchi_user -d tamagotchi_pro > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Backup creado exitosamente: $BACKUP_FILE"
    echo "📊 Tamaño del backup: $(du -sh $BACKUP_FILE | cut -f1)"
    
    # Mostrar estadísticas del backup
    echo ""
    echo "📈 Contenido del backup:"
    grep -c "INSERT INTO users" $BACKUP_FILE && echo "   usuarios encontrados" || echo "   0 usuarios"
    grep -c "INSERT INTO creatures" $BACKUP_FILE && echo "   criaturas encontradas" || echo "   0 criaturas"
    
else
    echo "❌ Error creando el backup"
fi

echo ""
echo "💡 Para restaurar este backup:"
echo "   docker exec -i tamagotchi-postgres psql -U tamagotchi_user -d tamagotchi_pro < $BACKUP_FILE"
