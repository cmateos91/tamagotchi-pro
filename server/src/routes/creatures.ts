import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateCreatureName } from '../middleware/validation';
import { 
  Creature, 
  CreatureSpecies, 
  CreatureStage, 
  CreaturePersonality, 
  CreatureMood, 
  CreatureStats, 
  CreatureAction,
  ApiResponse,
  PaginatedResponse 
} from '../../../shared/types';

const router = express.Router();

// Estadísticas iniciales para criaturas recién nacidas
const getInitialStats = (): CreatureStats => ({
  hunger: 80,
  happiness: 70,
  health: 100,
  energy: 90,
  cleanliness: 100,
  intelligence: 10,
  strength: 10,
  agility: 10
});

// Obtener personalidad aleatoria
const getRandomPersonality = (): CreaturePersonality => {
  const personalities = Object.values(CreaturePersonality);
  return personalities[Math.floor(Math.random() * personalities.length)]!;
};

// Crear nueva criatura
router.post('/', authenticateToken, validateCreatureName, async (req: AuthRequest, res) => {
  try {
    const { name, species } = req.body;
    const userId = req.userId!;

    // Verificar que la especie sea válida
    if (!Object.values(CreatureSpecies).includes(species)) {
      const response: ApiResponse = {
        success: false,
        error: 'Especie de criatura inválida'
      };
      return res.status(400).json(response);
    }

    // Verificar límite de criaturas activas (máximo 3)
    const activeCreatures = await pool.query(
      'SELECT COUNT(*) FROM creatures WHERE user_id = $1 AND is_alive = true',
      [userId]
    );

    if (parseInt(activeCreatures.rows[0].count) >= 3) {
      const response: ApiResponse = {
        success: false,
        error: 'Máximo 3 criaturas activas permitidas'
      };
      return res.status(400).json(response);
    }

    const creatureId = uuidv4();
    const initialStats = getInitialStats();
    const personality = getRandomPersonality();

    const result = await pool.query(`
      INSERT INTO creatures (
        id, user_id, name, species, stage, personality, mood, 
        hunger, happiness, health, energy, cleanliness, intelligence, strength, agility,
        level, experience, age, birth_date, last_fed, last_played, last_cleaned,
        is_alive, evolution_points, traits, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, NOW(), NOW(), NOW(), NOW(), $19, $20, $21, NOW(), NOW()
      ) RETURNING *
    `, [
      creatureId, userId, name, species, CreatureStage.EGG, personality, CreatureMood.FELIZ,
      initialStats.hunger, initialStats.happiness, initialStats.health, 
      initialStats.energy, initialStats.cleanliness, initialStats.intelligence,
      initialStats.strength, initialStats.agility, 1, 0, 0, true, 0, JSON.stringify([])
    ]);

    const creature = mapRowToCreature(result.rows[0]);

    const response: ApiResponse<Creature> = {
      success: true,
      data: creature,
      message: 'Criatura creada exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creando criatura:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Obtener criaturas del usuario
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      'SELECT * FROM creatures WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM creatures WHERE user_id = $1',
      [userId]
    );

    const creatures = result.rows.map(mapRowToCreature);
    const total = parseInt(countResult.rows[0].count);

    const response: ApiResponse<PaginatedResponse<Creature>> = {
      success: true,
      data: {
        items: creatures,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error obteniendo criaturas:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Obtener criatura específica
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const result = await pool.query(
      'SELECT * FROM creatures WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Criatura no encontrada'
      };
      return res.status(404).json(response);
    }

    const creature = mapRowToCreature(result.rows[0]);

    const response: ApiResponse<Creature> = {
      success: true,
      data: creature
    };

    res.json(response);
  } catch (error) {
    console.error('Error obteniendo criatura:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Alimentar criatura
router.post('/:id/feed', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const result = await pool.query(
      'SELECT * FROM creatures WHERE id = $1 AND user_id = $2 AND is_alive = true',
      [id, userId]
    );

    if (result.rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Criatura no encontrada o no está viva'
      };
      return res.status(404).json(response);
    }

    const creature = mapRowToCreature(result.rows[0]);

    // Calcular cambios en estadísticas
    const hungerIncrease = Math.min(30, 100 - creature.stats.hunger);
    const happinessIncrease = Math.min(10, 100 - creature.stats.happiness);
    const experienceGained = 5;

    const newStats = {
      ...creature.stats,
      hunger: Math.min(100, creature.stats.hunger + hungerIncrease),
      happiness: Math.min(100, creature.stats.happiness + happinessIncrease)
    };

    // Actualizar en base de datos
    await pool.query(`
      UPDATE creatures SET 
        hunger = $1, happiness = $2, experience = $3, last_fed = NOW(), updated_at = NOW()
      WHERE id = $4
    `, [newStats.hunger, newStats.happiness, creature.experience + experienceGained, id]);

    const action: CreatureAction = {
      type: 'feed',
      timestamp: new Date(),
      result: {
        statsChange: {
          hunger: hungerIncrease,
          happiness: happinessIncrease
        },
        experienceGained
      }
    };

    const response: ApiResponse<CreatureAction> = {
      success: true,
      data: action,
      message: 'Criatura alimentada exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error alimentando criatura:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Jugar con criatura
router.post('/:id/play', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const result = await pool.query(
      'SELECT * FROM creatures WHERE id = $1 AND user_id = $2 AND is_alive = true',
      [id, userId]
    );

    if (result.rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Criatura no encontrada o no está viva'
      };
      return res.status(404).json(response);
    }

    const creature = mapRowToCreature(result.rows[0]);

    // Calcular cambios en estadísticas
    const happinessIncrease = Math.min(25, 100 - creature.stats.happiness);
    const energyDecrease = Math.min(15, creature.stats.energy);
    const experienceGained = 8;

    const newStats = {
      ...creature.stats,
      happiness: Math.min(100, creature.stats.happiness + happinessIncrease),
      energy: Math.max(0, creature.stats.energy - energyDecrease)
    };

    // Actualizar en base de datos
    await pool.query(`
      UPDATE creatures SET 
        happiness = $1, energy = $2, experience = $3, last_played = NOW(), updated_at = NOW()
      WHERE id = $4
    `, [newStats.happiness, newStats.energy, creature.experience + experienceGained, id]);

    const action: CreatureAction = {
      type: 'play',
      timestamp: new Date(),
      result: {
        statsChange: {
          happiness: happinessIncrease,
          energy: -energyDecrease
        },
        experienceGained
      }
    };

    const response: ApiResponse<CreatureAction> = {
      success: true,
      data: action,
      message: 'Jugaste con tu criatura exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error jugando con criatura:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Función auxiliar para mapear filas de DB a objetos Creature
function mapRowToCreature(row: any): Creature {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    species: row.species,
    stage: row.stage,
    personality: row.personality,
    mood: row.mood,
    stats: {
      hunger: row.hunger,
      happiness: row.happiness,
      health: row.health,
      energy: row.energy,
      cleanliness: row.cleanliness,
      intelligence: row.intelligence,
      strength: row.strength,
      agility: row.agility
    },
    level: row.level,
    experience: row.experience,
    age: row.age,
    birthDate: row.birth_date,
    lastFed: row.last_fed,
    lastPlayed: row.last_played,
    lastCleaned: row.last_cleaned,
    isAlive: row.is_alive,
    evolutionPoints: row.evolution_points,
    traits: JSON.parse(row.traits || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default router;

