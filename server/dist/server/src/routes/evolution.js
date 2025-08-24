"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const types_1 = require("../../../shared/types");
const router = express_1.default.Router();
const EVOLUTION_REQUIREMENTS = {
    [types_1.CreatureStage.EGG]: {
        nextStage: types_1.CreatureStage.BABY,
        requirements: {
            age: 1,
            happiness: 50,
            health: 70
        }
    },
    [types_1.CreatureStage.BABY]: {
        nextStage: types_1.CreatureStage.TEEN,
        requirements: {
            age: 24,
            level: 5,
            happiness: 60,
            health: 80,
            evolutionPoints: 10
        }
    },
    [types_1.CreatureStage.TEEN]: {
        nextStage: types_1.CreatureStage.ADULT,
        requirements: {
            age: 72,
            level: 15,
            happiness: 70,
            health: 85,
            evolutionPoints: 50
        }
    },
    [types_1.CreatureStage.ADULT]: {
        nextStage: types_1.CreatureStage.ELDER,
        requirements: {
            age: 240,
            level: 30,
            happiness: 80,
            health: 90,
            evolutionPoints: 150
        }
    }
};
router.get('/:creatureId/check', auth_1.authenticateToken, async (req, res) => {
    try {
        const { creatureId } = req.params;
        const userId = req.userId;
        const result = await database_1.default.query('SELECT * FROM creatures WHERE id = $1 AND user_id = $2 AND is_alive = true', [creatureId, userId]);
        if (result.rows.length === 0) {
            const response = {
                success: false,
                error: 'Criatura no encontrada'
            };
            return res.status(404).json(response);
        }
        const creature = result.rows[0];
        const canEvolve = checkEvolutionRequirements(creature);
        const response = {
            success: true,
            data: {
                canEvolve: canEvolve.canEvolve,
                ...(canEvolve.nextStage && { nextStage: canEvolve.nextStage }),
                ...(canEvolve.requirements && { requirements: canEvolve.requirements })
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error verificando evolución:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.post('/:creatureId/evolve', auth_1.authenticateToken, async (req, res) => {
    try {
        const { creatureId } = req.params;
        const userId = req.userId;
        const result = await database_1.default.query('SELECT * FROM creatures WHERE id = $1 AND user_id = $2 AND is_alive = true', [creatureId, userId]);
        if (result.rows.length === 0) {
            const response = {
                success: false,
                error: 'Criatura no encontrada'
            };
            return res.status(404).json(response);
        }
        const creature = result.rows[0];
        const evolutionCheck = checkEvolutionRequirements(creature);
        if (!evolutionCheck.canEvolve) {
            const response = {
                success: false,
                error: 'La criatura no cumple los requisitos para evolucionar'
            };
            return res.status(400).json(response);
        }
        const newStage = evolutionCheck.nextStage;
        const evolutionBonus = getEvolutionBonus(newStage);
        await database_1.default.query(`
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
        const updatedResult = await database_1.default.query('SELECT * FROM creatures WHERE id = $1', [creatureId]);
        const response = {
            success: true,
            data: mapRowToCreature(updatedResult.rows[0]),
            message: `¡Tu criatura ha evolucionado a ${getStageDisplayName(newStage)}!`
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error evolucionando criatura:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
function checkEvolutionRequirements(creature) {
    const currentStage = creature.stage;
    const evolutionData = EVOLUTION_REQUIREMENTS[currentStage];
    if (!evolutionData) {
        return { canEvolve: false };
    }
    const requirements = evolutionData.requirements;
    const canEvolve = creature.age >= requirements.age &&
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
function getEvolutionBonus(stage) {
    const bonuses = {
        [types_1.CreatureStage.EGG]: {
            levelBonus: 1,
            intelligenceBonus: 2,
            strengthBonus: 2,
            agilityBonus: 2
        },
        [types_1.CreatureStage.BABY]: {
            levelBonus: 2,
            intelligenceBonus: 5,
            strengthBonus: 5,
            agilityBonus: 5
        },
        [types_1.CreatureStage.TEEN]: {
            levelBonus: 3,
            intelligenceBonus: 10,
            strengthBonus: 10,
            agilityBonus: 10
        },
        [types_1.CreatureStage.ADULT]: {
            levelBonus: 5,
            intelligenceBonus: 15,
            strengthBonus: 15,
            agilityBonus: 15
        },
        [types_1.CreatureStage.ELDER]: {
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
function getStageDisplayName(stage) {
    const names = {
        [types_1.CreatureStage.EGG]: 'Huevo',
        [types_1.CreatureStage.BABY]: 'Bebé',
        [types_1.CreatureStage.TEEN]: 'Adolescente',
        [types_1.CreatureStage.ADULT]: 'Adulto',
        [types_1.CreatureStage.ELDER]: 'Anciano'
    };
    return names[stage] || 'Desconocido';
}
function mapRowToCreature(row) {
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
exports.default = router;
//# sourceMappingURL=evolution.js.map