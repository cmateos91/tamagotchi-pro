import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';

describe('Creatures Routes', () => {
  let accessToken: string;
  let userId: string;
  let creatureId: string;

  beforeAll(async () => {
    // Limpiar base de datos
    await pool.query('DELETE FROM creature_actions');
    await pool.query('DELETE FROM creatures');
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM users');

    // Crear usuario de prueba
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'creaturetest',
        email: 'creature@test.com',
        password: 'password123'
      });

    accessToken = registerResponse.body.data.accessToken;
    userId = registerResponse.body.data.user.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/creatures', () => {
    it('should create a new creature successfully', async () => {
      const creatureData = {
        name: 'Sparky',
        species: 'voltus'
      };

      const response = await request(app)
        .post('/api/creatures')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(creatureData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(creatureData.name);
      expect(response.body.data.species).toBe(creatureData.species);
      expect(response.body.data.stage).toBe('egg');
      expect(response.body.data.isAlive).toBe(true);
      expect(response.body.data.level).toBe(1);
      expect(response.body.data.experience).toBe(0);

      creatureId = response.body.data.id;
    });

    it('should fail with invalid species', async () => {
      const creatureData = {
        name: 'Invalid',
        species: 'invalid_species'
      };

      const response = await request(app)
        .post('/api/creatures')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(creatureData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with short name', async () => {
      const creatureData = {
        name: 'A',
        species: 'verdania'
      };

      const response = await request(app)
        .post('/api/creatures')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(creatureData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const creatureData = {
        name: 'Unauthorized',
        species: 'ignius'
      };

      const response = await request(app)
        .post('/api/creatures')
        .send(creatureData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/creatures', () => {
    it('should get user creatures successfully', async () => {
      const response = await request(app)
        .get('/api/creatures')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toBe('Sparky');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/creatures?page=1&limit=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should filter by alive status', async () => {
      const response = await request(app)
        .get('/api/creatures?alive=true')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((c: any) => c.isAlive === true)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/creatures')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/creatures/:id', () => {
    it('should get specific creature successfully', async () => {
      const response = await request(app)
        .get(`/api/creatures/${creatureId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(creatureId);
      expect(response.body.data.name).toBe('Sparky');
    });

    it('should fail with invalid creature ID', async () => {
      const response = await request(app)
        .get('/api/creatures/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with non-existent creature', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/creatures/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/creatures/:id/feed', () => {
    it('should feed creature successfully', async () => {
      const response = await request(app)
        .post(`/api/creatures/${creatureId}/feed`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats.hunger).toBeGreaterThan(80);
      expect(response.body.data.experience).toBeGreaterThan(0);
      expect(response.body.data.lastFed).toBeDefined();
    });

    it('should support different food types', async () => {
      const response = await request(app)
        .post(`/api/creatures/${creatureId}/feed`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ foodType: 'premium' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should fail with invalid creature ID', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .post(`/api/creatures/${fakeId}/feed`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/creatures/:id/play', () => {
    it('should play with creature successfully', async () => {
      const response = await request(app)
        .post(`/api/creatures/${creatureId}/play`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats.happiness).toBeGreaterThan(70);
      expect(response.body.data.experience).toBeGreaterThan(0);
      expect(response.body.data.lastPlayed).toBeDefined();
    });

    it('should support different game types', async () => {
      const response = await request(app)
        .post(`/api/creatures/${creatureId}/play`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ gameType: 'puzzle' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should increase intelligence with puzzle games', async () => {
      // Obtener stats iniciales
      const initialResponse = await request(app)
        .get(`/api/creatures/${creatureId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      const initialIntelligence = initialResponse.body.data.stats.intelligence;

      // Jugar puzzle varias veces
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/creatures/${creatureId}/play`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ gameType: 'puzzle' });
      }

      // Verificar incremento
      const finalResponse = await request(app)
        .get(`/api/creatures/${creatureId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      const finalIntelligence = finalResponse.body.data.stats.intelligence;
      expect(finalIntelligence).toBeGreaterThan(initialIntelligence);
    });
  });

  describe('POST /api/creatures/:id/clean', () => {
    it('should clean creature successfully', async () => {
      const response = await request(app)
        .post(`/api/creatures/${creatureId}/clean`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats.cleanliness).toBe(100);
      expect(response.body.data.lastCleaned).toBeDefined();
    });

    it('should improve health when cleaning', async () => {
      // Reducir limpieza artificialmente
      await pool.query(
        'UPDATE creatures SET cleanliness = 30 WHERE id = $1',
        [creatureId]
      );

      const response = await request(app)
        .post(`/api/creatures/${creatureId}/clean`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats.cleanliness).toBe(100);
      expect(response.body.data.stats.health).toBeGreaterThan(90);
    });
  });

  describe('POST /api/creatures/:id/sleep', () => {
    it('should put creature to sleep successfully', async () => {
      const response = await request(app)
        .post(`/api/creatures/${creatureId}/sleep`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats.energy).toBe(100);
    });

    it('should change mood to rested', async () => {
      const response = await request(app)
        .post(`/api/creatures/${creatureId}/sleep`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(['rested', 'calm']).toContain(response.body.data.mood);
    });
  });

  describe('Creature Stats Validation', () => {
    it('should maintain stats within valid ranges', async () => {
      // Alimentar muchas veces
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post(`/api/creatures/${creatureId}/feed`)
          .set('Authorization', `Bearer ${accessToken}`);
      }

      const response = await request(app)
        .get(`/api/creatures/${creatureId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      const stats = response.body.data.stats;
      
      // Verificar que todas las stats estén en rango válido
      Object.values(stats).forEach((stat: any) => {
        expect(stat).toBeGreaterThanOrEqual(0);
        expect(stat).toBeLessThanOrEqual(100);
      });
    });

    it('should track action history', async () => {
      // Realizar varias acciones
      await request(app)
        .post(`/api/creatures/${creatureId}/feed`)
        .set('Authorization', `Bearer ${accessToken}`);

      await request(app)
        .post(`/api/creatures/${creatureId}/play`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Verificar que las acciones se registraron
      const actionsResult = await pool.query(
        'SELECT * FROM creature_actions WHERE creature_id = $1 ORDER BY created_at DESC',
        [creatureId]
      );

      expect(actionsResult.rows.length).toBeGreaterThan(0);
      expect(['feed', 'play']).toContain(actionsResult.rows[0].action_type);
    });
  });
});

