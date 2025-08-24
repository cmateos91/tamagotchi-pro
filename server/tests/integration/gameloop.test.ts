import pool from '../../src/config/database';
import { gameLoop } from '../../src/utils/gameLoop';

describe('Game Loop Integration Tests', () => {
  let testUserId: string;
  let testCreatureId: string;

  beforeAll(async () => {
    // Limpiar base de datos
    await pool.query('DELETE FROM creature_actions');
    await pool.query('DELETE FROM creatures');
    await pool.query('DELETE FROM users');

    // Crear usuario de prueba
    const userResult = await pool.query(`
      INSERT INTO users (username, email, password_hash)
      VALUES ('gamelooptest', 'gameloop@test.com', 'hashedpassword')
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;

    // Crear criatura de prueba
    const creatureResult = await pool.query(`
      INSERT INTO creatures (
        user_id, name, species, stage, personality,
        hunger, happiness, health, energy, cleanliness,
        level, experience, age, birth_date, last_fed, last_played, last_cleaned
      ) VALUES (
        $1, 'TestCreature', 'voltus', 'baby', 'playful',
        50, 60, 80, 70, 40,
        2, 150, 24, NOW() - INTERVAL '24 hours',
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '3 hours', 
        NOW() - INTERVAL '4 hours'
      ) RETURNING id
    `, [testUserId]);
    testCreatureId = creatureResult.rows[0].id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Stat Degradation', () => {
    it('should degrade creature stats over time', async () => {
      // Obtener stats iniciales
      const initialResult = await pool.query(
        'SELECT hunger, happiness, energy, cleanliness FROM creatures WHERE id = $1',
        [testCreatureId]
      );
      const initialStats = initialResult.rows[0];

      // Simular paso del tiempo actualizando last_updated
      await pool.query(
        'UPDATE creatures SET updated_at = NOW() - INTERVAL \'2 hours\' WHERE id = $1',
        [testCreatureId]
      );

      // Ejecutar actualización del game loop
      await gameLoop.updateCreatures();

      // Verificar que las stats se degradaron
      const finalResult = await pool.query(
        'SELECT hunger, happiness, energy, cleanliness FROM creatures WHERE id = $1',
        [testCreatureId]
      );
      const finalStats = finalResult.rows[0];

      expect(finalStats.hunger).toBeLessThan(initialStats.hunger);
      expect(finalStats.happiness).toBeLessThan(initialStats.happiness);
      expect(finalStats.energy).toBeLessThan(initialStats.energy);
      expect(finalStats.cleanliness).toBeLessThan(initialStats.cleanliness);
    });

    it('should not degrade stats below 0', async () => {
      // Establecer stats muy bajas
      await pool.query(`
        UPDATE creatures 
        SET hunger = 2, happiness = 1, energy = 3, cleanliness = 1,
            updated_at = NOW() - INTERVAL '5 hours'
        WHERE id = $1
      `, [testCreatureId]);

      // Ejecutar game loop
      await gameLoop.updateCreatures();

      // Verificar que las stats no bajaron de 0
      const result = await pool.query(
        'SELECT hunger, happiness, energy, cleanliness FROM creatures WHERE id = $1',
        [testCreatureId]
      );
      const stats = result.rows[0];

      expect(stats.hunger).toBeGreaterThanOrEqual(0);
      expect(stats.happiness).toBeGreaterThanOrEqual(0);
      expect(stats.energy).toBeGreaterThanOrEqual(0);
      expect(stats.cleanliness).toBeGreaterThanOrEqual(0);
    });

    it('should kill creature if health reaches 0', async () => {
      // Crear criatura con salud muy baja
      const dyingCreatureResult = await pool.query(`
        INSERT INTO creatures (
          user_id, name, species, stage, personality,
          hunger, happiness, health, energy, cleanliness,
          updated_at
        ) VALUES (
          $1, 'DyingCreature', 'ignius', 'baby', 'lazy',
          0, 0, 5, 10, 0,
          NOW() - INTERVAL '10 hours'
        ) RETURNING id
      `, [testUserId]);
      const dyingCreatureId = dyingCreatureResult.rows[0].id;

      // Ejecutar game loop
      await gameLoop.updateCreatures();

      // Verificar que la criatura murió
      const result = await pool.query(
        'SELECT is_alive, health FROM creatures WHERE id = $1',
        [dyingCreatureId]
      );
      const creature = result.rows[0];

      expect(creature.is_alive).toBe(false);
      expect(creature.health).toBe(0);
    });
  });

  describe('Age Progression', () => {
    it('should increase creature age over time', async () => {
      // Obtener edad inicial
      const initialResult = await pool.query(
        'SELECT age FROM creatures WHERE id = $1',
        [testCreatureId]
      );
      const initialAge = initialResult.rows[0].age;

      // Simular paso de tiempo
      await pool.query(
        'UPDATE creatures SET updated_at = NOW() - INTERVAL \'3 hours\' WHERE id = $1',
        [testCreatureId]
      );

      // Ejecutar game loop
      await gameLoop.updateCreatures();

      // Verificar incremento de edad
      const finalResult = await pool.query(
        'SELECT age FROM creatures WHERE id = $1',
        [testCreatureId]
      );
      const finalAge = finalResult.rows[0].age;

      expect(finalAge).toBeGreaterThan(initialAge);
    });
  });

  describe('Evolution System', () => {
    it('should evolve creature when requirements are met', async () => {
      // Crear criatura lista para evolucionar
      const evolveCreatureResult = await pool.query(`
        INSERT INTO creatures (
          user_id, name, species, stage, personality,
          hunger, happiness, health, energy, cleanliness,
          level, experience, age, evolution_points
        ) VALUES (
          $1, 'EvolveCreature', 'verdania', 'baby', 'curious',
          80, 85, 90, 75, 80,
          5, 500, 48, 25
        ) RETURNING id
      `, [testUserId]);
      const evolveCreatureId = evolveCreatureResult.rows[0].id;

      // Ejecutar verificación de evoluciones
      await gameLoop.checkEvolutions();

      // Verificar que evolucionó
      const result = await pool.query(
        'SELECT stage, level FROM creatures WHERE id = $1',
        [evolveCreatureId]
      );
      const creature = result.rows[0];

      expect(creature.stage).toBe('teen');
      expect(creature.level).toBeGreaterThan(5);
    });

    it('should not evolve creature if requirements not met', async () => {
      // Crear criatura que no cumple requisitos
      const noEvolveCreatureResult = await pool.query(`
        INSERT INTO creatures (
          user_id, name, species, stage, personality,
          hunger, happiness, health, energy, cleanliness,
          level, experience, age, evolution_points
        ) VALUES (
          $1, 'NoEvolveCreature', 'aquarina', 'baby', 'shy',
          30, 40, 50, 60, 70,
          2, 100, 12, 5
        ) RETURNING id
      `, [testUserId]);
      const noEvolveCreatureId = noEvolveCreatureResult.rows[0].id;

      // Ejecutar verificación de evoluciones
      await gameLoop.checkEvolutions();

      // Verificar que NO evolucionó
      const result = await pool.query(
        'SELECT stage FROM creatures WHERE id = $1',
        [noEvolveCreatureId]
      );
      const creature = result.rows[0];

      expect(creature.stage).toBe('baby');
    });
  });

  describe('Achievement Processing', () => {
    beforeAll(async () => {
      // Crear algunos logros de prueba
      await pool.query(`
        INSERT INTO achievements (name, description, icon, rarity, conditions)
        VALUES 
        ('First Feed', 'Feed a creature for the first time', 'food', 'common', '{"type": "feed", "count": 1}'),
        ('Caretaker', 'Feed creatures 10 times', 'heart', 'uncommon', '{"type": "feed", "count": 10}')
      `);
    });

    it('should unlock achievements when conditions are met', async () => {
      // Crear acciones que cumplan condiciones de logro
      await pool.query(`
        INSERT INTO creature_actions (creature_id, action_type, details)
        VALUES ($1, 'feed', '{}')
      `, [testCreatureId]);

      // Ejecutar procesamiento de logros
      await gameLoop.processAchievements();

      // Verificar que se desbloqueó el logro
      const result = await pool.query(`
        SELECT ua.*, a.name 
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = $1 AND a.name = 'First Feed'
      `, [testUserId]);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should not duplicate achievements', async () => {
      // Ejecutar procesamiento de logros nuevamente
      await gameLoop.processAchievements();

      // Verificar que no se duplicó el logro
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = $1 AND a.name = 'First Feed'
      `, [testUserId]);

      expect(parseInt(result.rows[0].count)).toBe(1);
    });
  });

  describe('Game Loop Performance', () => {
    it('should complete full cycle within reasonable time', async () => {
      const startTime = Date.now();

      // Ejecutar ciclo completo del game loop
      await gameLoop.updateCreatures();
      await gameLoop.checkEvolutions();
      await gameLoop.processAchievements();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // El ciclo completo debería tomar menos de 5 segundos
      expect(duration).toBeLessThan(5000);
    });

    it('should handle multiple creatures efficiently', async () => {
      // Crear múltiples criaturas
      const creaturePromises = [];
      for (let i = 0; i < 10; i++) {
        creaturePromises.push(
          pool.query(`
            INSERT INTO creatures (
              user_id, name, species, stage, personality,
              hunger, happiness, health, energy, cleanliness
            ) VALUES (
              $1, $2, 'voltus', 'baby', 'playful',
              50, 60, 80, 70, 40
            )
          `, [testUserId, `TestCreature${i}`])
        );
      }
      await Promise.all(creaturePromises);

      const startTime = Date.now();

      // Ejecutar game loop con múltiples criaturas
      await gameLoop.updateCreatures();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Debería manejar 10+ criaturas eficientemente
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Simular error de base de datos cerrando temporalmente la conexión
      const originalQuery = pool.query;
      pool.query = jest.fn().mockRejectedValue(new Error('Database connection lost'));

      // El game loop no debería fallar completamente
      await expect(gameLoop.updateCreatures()).resolves.not.toThrow();

      // Restaurar función original
      pool.query = originalQuery;
    });

    it('should continue processing other creatures if one fails', async () => {
      // Crear criatura con datos inválidos que podría causar error
      await pool.query(`
        INSERT INTO creatures (
          user_id, name, species, stage, personality,
          hunger, happiness, health, energy, cleanliness
        ) VALUES (
          $1, 'InvalidCreature', 'invalid_species', 'invalid_stage', 'invalid_personality',
          -10, 150, -5, 200, -20
        )
      `, [testUserId]);

      // El game loop debería continuar procesando otras criaturas
      await expect(gameLoop.updateCreatures()).resolves.not.toThrow();

      // Verificar que otras criaturas siguen siendo procesadas
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM creatures WHERE is_alive = true'
      );
      expect(parseInt(result.rows[0].count)).toBeGreaterThan(0);
    });
  });
});

