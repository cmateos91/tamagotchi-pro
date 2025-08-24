import express from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CreatureStage, CreatureSpecies, ApiResponse } from '../../../shared/types';

const router = express.Router();

// Definir requisitos de evolución
const EVOLUTION_REQUIREMENTS = {
  [CreatureStage.EGG]: {
    nextStage: CreatureStage.BABY,
    requirements: {
      age: 1, // 1 hora
      happiness: 50,
      health: 70
    }
  },
  [CreatureStage.BABY]: {
    nextStage: CreatureStage.TEEN,
    requirements: {
      age: 24, // 24 horas
      level: 5,
      happiness: 60,
      health: 80,
      evolutionPoints: 10
    }
  },
  [CreatureStage.TEEN]: {
    nextStage: CreatureStage.ADULT,
    requirements: {
      age: 72, // 72 horas (3 días)
      level: 15,
      happiness: 70,
      health: 85,
      evolutionPoints: 50
    }
  },
  [CreatureStage.ADULT]: {
    nextStage: CreatureStage.ELDER,
    requirements: {
      age: 240, // 240 horas (10 días)
      level: 30,
      happiness: 80,
      health: 90,
      evolutionPoints: 150
    }
  }
};

// Verificar si una criatura puede evolucionar
router.get('/:creatureId/check', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { creatureId } = req.params;
    const userId = req.userId!;

    const result = await pool.query(
      'SELECT * FROM creatures WHERE id = $1 AND user_id = $2 AND is_alive = true',
      [creatureId, userId]
    );

    if (result.rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Criatura no encontrada'
      };
      return res.status(404).json(response);
    }

    const creature = result.rows[0];
    const canEvolve = checkEvolutionRequirements(creature);

    const response: ApiResponse<{canEvolve: boolean, nextStage?: CreatureStage, requirements?: any}> = {
      success: true,
      data: {
        canEvolve: canEvolve.canEvolve,
        ...(canEvolve.nextStage && { nextStage: canEvolve.nextStage }),
        ...(canEvolve.requirements && { requirements: canEvolve.requirements })
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error verificando evolución:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Evolucionar criatura
router.post('/:creatureId/evolve', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { creatureId } = req.params;
    const userId = req.userId!;

    const result = await pool.query(
      'SELECT * FROM creatures WHERE id = $1 AND user_id = $2 AND is_alive = true',
      [creatureId, userId]
    );

    if (result.rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Criatura no encontrada'
      };
      return res.status(404).json(response);
    }

    const creature = result.rows[0];
    const evolutionCheck = checkEvolutionRequirements(creature);

    if (!evolutionCheck.canEvolve) {
      const response: ApiResponse = {
        success: false,
        error: 'La criatura no cumple los requisitos para evolucionar'
      };
      return res.status(400).json(response);
    }

    // Realizar evolución
    const newStage = evolutionCheck.nextStage!;
    const evolutionBonus = getEvolutionBonus(newStage);

    await pool.query(`
      UPDATE creatures SET 
        stage = $1,
        level = level + $2,
        intelligence = LEAST(100, intelligence + $3),
        strength = LEAST(100, strength + $4),
        agility = LEAST(100, agility + $5),
        evolution_points = 0,
        updated_at = NOW()
      WHERE id = $6
    `, [
      newStage,
      evolutionBonus.levelBonus,
      evolutionBonus.intelligenceBonus,
      evolutionBonus.strengthBonus,
      evolutionBonus.agilityBonus,
      creatureId
    ]);

    // Obtener criatura actualizada
    const updatedResult = await pool.query(
      'SELECT * FROM creatures WHERE id = $1',
      [creatureId]
    );

    const response: ApiResponse = {
      success: true,
      data: mapRowToCreature(updatedResult.rows[0]),
      message: `¡Tu criatura ha evolucionado a ${getStageDisplayName(newStage)}!`
    };

    res.json(response);
  } catch (error) {
    console.error('Error evolucionando criatura:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Funciones auxiliares
function checkEvolutionRequirements(creature: any): {canEvolve: boolean, nextStage?: CreatureStage, requirements?: any} {
  const currentStage = creature.stage as CreatureStage;
  const evolutionData = EVOLUTION_REQUIREMENTS[currentStage as keyof typeof EVOLUTION_REQUIREMENTS];

  if (!evolutionData) {
    return { canEvolve: false };
  }

  const requirements = evolutionData.requirements;
  const canEvolve = 
    creature.age >= requirements.age &&
    (!('level' in requirements) || creature.level >= requirements.level) &&
    creature.happiness >= requirements.happiness &&
    creature.health >= requirements.health &&
    (!('evolutionPoints' in requirements) || creature.evolution_points >= requirements.evolutionPoints);

  return {
    canEvolve,
    nextStage: evolutionData.nextStage,
    requirements
  };
}

function getEvolutionBonus(stage: CreatureStage) {
  const bonuses: Record<CreatureStage, any> = {
    [CreatureStage.EGG]: {
      levelBonus: 1,
      intelligenceBonus: 2,
      strengthBonus: 2,
      agilityBonus: 2
    },
    [CreatureStage.BABY]: {
      levelBonus: 2,
      intelligenceBonus: 5,
      strengthBonus: 5,
      agilityBonus: 5
    },
    [CreatureStage.TEEN]: {
      levelBonus: 3,
      intelligenceBonus: 10,
      strengthBonus: 10,
      agilityBonus: 10
    },
    [CreatureStage.ADULT]: {
      levelBonus: 5,
      intelligenceBonus: 15,
      strengthBonus: 15,
      agilityBonus: 15
    },
    [CreatureStage.ELDER]: {
      levelBonus: 8,
      intelligenceBonus: 20,
      strengthBonus: 20,
      agilityBonus: 20
    }
  };

  return bonuses[stage] || {
    levelBonus: 1,
    intelligenceBonus: 2,
    strengthBonus: 2,
    agilityBonus: 2
  };
}

function getStageDisplayName(stage: CreatureStage): string {
  const names = {
    [CreatureStage.EGG]: 'Huevo',
    [CreatureStage.BABY]: 'Bebé',
    [CreatureStage.TEEN]: 'Adolescente',
    [CreatureStage.ADULT]: 'Adulto',
    [CreatureStage.ELDER]: 'Anciano'
  };
  return names[stage] || 'Desconocido';
}

function mapRowToCreature(row: any) {
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

