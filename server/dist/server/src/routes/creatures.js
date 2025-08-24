"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const types_1 = require("../../../shared/types");
const router = express_1.default.Router();
const getInitialStats = () => ({
    hunger: 80,
    happiness: 70,
    health: 100,
    energy: 90,
    cleanliness: 100,
    intelligence: 10,
    strength: 10,
    agility: 10
});
const getRandomPersonality = () => {
    const personalities = Object.values(types_1.CreaturePersonality);
    return personalities[Math.floor(Math.random() * personalities.length)];
};
router.post('/', auth_1.authenticateToken, validation_1.validateCreatureName, async (req, res) => {
    try {
        const { name, species } = req.body;
        const userId = req.userId;
        if (!Object.values(types_1.CreatureSpecies).includes(species)) {
            const response = {
                success: false,
                error: 'Especie de criatura inválida'
            };
            return res.status(400).json(response);
        }
        const activeCreatures = await database_1.default.query('SELECT COUNT(*) FROM creatures WHERE user_id = $1 AND is_alive = true', [userId]);
        if (parseInt(activeCreatures.rows[0].count) >= 3) {
            const response = {
                success: false,
                error: 'Máximo 3 criaturas activas permitidas'
            };
            return res.status(400).json(response);
        }
        const creatureId = (0, uuid_1.v4)();
        const initialStats = getInitialStats();
        const personality = getRandomPersonality();
        const result = await database_1.default.query(`
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
            creatureId, userId, name, species, types_1.CreatureStage.EGG, personality, types_1.CreatureMood.FELIZ,
            initialStats.hunger, initialStats.happiness, initialStats.health,
            initialStats.energy, initialStats.cleanliness, initialStats.intelligence,
            initialStats.strength, initialStats.agility, 1, 0, 0, true, 0, JSON.stringify([])
        ]);
        const creature = mapRowToCreature(result.rows[0]);
        const response = {
            success: true,
            data: creature,
            message: 'Criatura creada exitosamente'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Error creando criatura:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const result = await database_1.default.query('SELECT * FROM creatures WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [userId, limit, offset]);
        const countResult = await database_1.default.query('SELECT COUNT(*) FROM creatures WHERE user_id = $1', [userId]);
        const creatures = result.rows.map(mapRowToCreature);
        const total = parseInt(countResult.rows[0].count);
        const response = {
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
    }
    catch (error) {
        console.error('Error obteniendo criaturas:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const result = await database_1.default.query('SELECT * FROM creatures WHERE id = $1 AND user_id = $2', [id, userId]);
        if (result.rows.length === 0) {
            const response = {
                success: false,
                error: 'Criatura no encontrada'
            };
            return res.status(404).json(response);
        }
        const creature = mapRowToCreature(result.rows[0]);
        const response = {
            success: true,
            data: creature
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error obteniendo criatura:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.post('/:id/feed', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const result = await database_1.default.query('SELECT * FROM creatures WHERE id = $1 AND user_id = $2 AND is_alive = true', [id, userId]);
        if (result.rows.length === 0) {
            const response = {
                success: false,
                error: 'Criatura no encontrada o no está viva'
            };
            return res.status(404).json(response);
        }
        const creature = mapRowToCreature(result.rows[0]);
        const hungerIncrease = Math.min(30, 100 - creature.stats.hunger);
        const happinessIncrease = Math.min(10, 100 - creature.stats.happiness);
        const experienceGained = 5;
        const newStats = {
            ...creature.stats,
            hunger: Math.min(100, creature.stats.hunger + hungerIncrease),
            happiness: Math.min(100, creature.stats.happiness + happinessIncrease)
        };
        await database_1.default.query(`
      UPDATE creatures SET 
        hunger = $1, happiness = $2, experience = $3, last_fed = NOW(), updated_at = NOW()
      WHERE id = $4
    `, [newStats.hunger, newStats.happiness, creature.experience + experienceGained, id]);
        const action = {
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
        const response = {
            success: true,
            data: action,
            message: 'Criatura alimentada exitosamente'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error alimentando criatura:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.post('/:id/play', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const result = await database_1.default.query('SELECT * FROM creatures WHERE id = $1 AND user_id = $2 AND is_alive = true', [id, userId]);
        if (result.rows.length === 0) {
            const response = {
                success: false,
                error: 'Criatura no encontrada o no está viva'
            };
            return res.status(404).json(response);
        }
        const creature = mapRowToCreature(result.rows[0]);
        const happinessIncrease = Math.min(25, 100 - creature.stats.happiness);
        const energyDecrease = Math.min(15, creature.stats.energy);
        const experienceGained = 8;
        const newStats = {
            ...creature.stats,
            happiness: Math.min(100, creature.stats.happiness + happinessIncrease),
            energy: Math.max(0, creature.stats.energy - energyDecrease)
        };
        await database_1.default.query(`
      UPDATE creatures SET 
        happiness = $1, energy = $2, experience = $3, last_played = NOW(), updated_at = NOW()
      WHERE id = $4
    `, [newStats.happiness, newStats.energy, creature.experience + experienceGained, id]);
        const action = {
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
        const response = {
            success: true,
            data: action,
            message: 'Jugaste con tu criatura exitosamente'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error jugando con criatura:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
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
//# sourceMappingURL=creatures.js.map