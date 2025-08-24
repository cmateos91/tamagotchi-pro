"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/start', auth_1.authenticateToken, async (req, res) => {
    try {
        const { myCreatureId, opponentCreatureId } = req.body;
        const userId = req.userId;
        const creaturesResult = await database_1.default.query(`
      SELECT c.*, u.username as owner_username
      FROM creatures c
      JOIN users u ON c.user_id = u.id
      WHERE c.id IN ($1, $2) AND c.is_alive = true
    `, [myCreatureId, opponentCreatureId]);
        if (creaturesResult.rows.length !== 2) {
            const response = {
                success: false,
                error: 'Una o ambas criaturas no están disponibles para batalla'
            };
            return res.status(400).json(response);
        }
        const creatures = creaturesResult.rows;
        const myCreature = creatures.find(c => c.id === myCreatureId);
        const opponentCreature = creatures.find(c => c.id === opponentCreatureId);
        if (!myCreature || myCreature.user_id !== userId) {
            const response = {
                success: false,
                error: 'No puedes usar esta criatura'
            };
            return res.status(403).json(response);
        }
        if (myCreature.user_id === opponentCreature.user_id) {
            const response = {
                success: false,
                error: 'No puedes batallar contra tu propia criatura'
            };
            return res.status(400).json(response);
        }
        if (myCreature.energy < 30 || opponentCreature.energy < 30) {
            const response = {
                success: false,
                error: 'Las criaturas necesitan al menos 30 de energía para batallar'
            };
            return res.status(400).json(response);
        }
        const battleResult = simulateBattle(myCreature, opponentCreature);
        const battleId = (0, uuid_1.v4)();
        await database_1.default.query(`
      INSERT INTO battles (
        id, winner_id, loser_id, winner_creature_id, loser_creature_id,
        experience_gained, battle_log, duration, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
            battleId,
            battleResult.winnerId,
            battleResult.loserId,
            battleResult.winnerCreatureId,
            battleResult.loserCreatureId,
            battleResult.experienceGained,
            JSON.stringify(battleResult.battleLog),
            battleResult.duration
        ]);
        const winnerBonus = battleResult.winnerId === userId ? battleResult.experienceGained : Math.floor(battleResult.experienceGained / 2);
        const loserBonus = battleResult.loserId === userId ? Math.floor(battleResult.experienceGained / 2) : 0;
        await database_1.default.query(`
      UPDATE creatures SET 
        experience = experience + $1,
        energy = GREATEST(0, energy - 25),
        updated_at = NOW()
      WHERE id = $2
    `, [winnerBonus, myCreatureId]);
        await database_1.default.query(`
      UPDATE creatures SET 
        experience = experience + $1,
        energy = GREATEST(0, energy - 25),
        updated_at = NOW()
      WHERE id = $2
    `, [loserBonus, opponentCreatureId]);
        const response = {
            success: true,
            data: battleResult,
            message: battleResult.winnerId === userId ? '¡Victoria!' : 'Derrota, pero ganaste experiencia'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error en batalla:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.get('/history', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const result = await database_1.default.query(`
      SELECT 
        b.*,
        wc.name as winner_creature_name,
        lc.name as loser_creature_name,
        wu.username as winner_username,
        lu.username as loser_username
      FROM battles b
      JOIN creatures wc ON b.winner_creature_id = wc.id
      JOIN creatures lc ON b.loser_creature_id = lc.id
      JOIN users wu ON b.winner_id = wu.id
      JOIN users lu ON b.loser_id = lu.id
      WHERE b.winner_id = $1 OR b.loser_id = $1
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
        const battles = result.rows.map(row => ({
            id: row.id,
            winnerId: row.winner_id,
            loserId: row.loser_id,
            winnerCreatureId: row.winner_creature_id,
            loserCreatureId: row.loser_creature_id,
            winnerCreatureName: row.winner_creature_name,
            loserCreatureName: row.loser_creature_name,
            winnerUsername: row.winner_username,
            loserUsername: row.loser_username,
            experienceGained: row.experience_gained,
            battleLog: JSON.parse(row.battle_log),
            duration: row.duration,
            createdAt: row.created_at,
            isWinner: row.winner_id === userId
        }));
        const response = {
            success: true,
            data: battles
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error obteniendo historial de batallas:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
function simulateBattle(creature1, creature2) {
    const battleLog = [];
    let hp1 = creature1.health;
    let hp2 = creature2.health;
    let turn = 1;
    const maxTurns = 20;
    battleLog.push(`¡Batalla entre ${creature1.name} y ${creature2.name}!`);
    while (hp1 > 0 && hp2 > 0 && turn <= maxTurns) {
        const attacker = turn % 2 === 1 ? creature1 : creature2;
        const defender = turn % 2 === 1 ? creature2 : creature1;
        const attackPower = calculateAttackPower(attacker);
        const defense = calculateDefense(defender);
        const damage = Math.max(1, attackPower - defense);
        if (turn % 2 === 1) {
            hp2 -= damage;
            battleLog.push(`${attacker.name} ataca a ${defender.name} por ${damage} de daño`);
        }
        else {
            hp1 -= damage;
            battleLog.push(`${attacker.name} ataca a ${defender.name} por ${damage} de daño`);
        }
        turn++;
    }
    let winnerId;
    let loserId;
    let winnerCreatureId;
    let loserCreatureId;
    if (hp1 <= 0 && hp2 <= 0) {
        if (creature1.level >= creature2.level) {
            winnerId = creature1.user_id;
            loserId = creature2.user_id;
            winnerCreatureId = creature1.id;
            loserCreatureId = creature2.id;
        }
        else {
            winnerId = creature2.user_id;
            loserId = creature1.user_id;
            winnerCreatureId = creature2.id;
            loserCreatureId = creature1.id;
        }
        battleLog.push('¡Empate! Gana por nivel superior');
    }
    else if (hp1 <= 0) {
        winnerId = creature2.user_id;
        loserId = creature1.user_id;
        winnerCreatureId = creature2.id;
        loserCreatureId = creature1.id;
        battleLog.push(`¡${creature2.name} gana la batalla!`);
    }
    else {
        winnerId = creature1.user_id;
        loserId = creature2.user_id;
        winnerCreatureId = creature1.id;
        loserCreatureId = creature2.id;
        battleLog.push(`¡${creature1.name} gana la batalla!`);
    }
    const experienceGained = Math.floor(Math.random() * 20) + 10;
    const duration = turn * 2;
    return {
        winnerId,
        loserId,
        winnerCreatureId,
        loserCreatureId,
        experienceGained,
        battleLog,
        duration
    };
}
function calculateAttackPower(creature) {
    return Math.floor((creature.strength + creature.agility + creature.level) / 3) + Math.floor(Math.random() * 10);
}
function calculateDefense(creature) {
    return Math.floor((creature.health + creature.intelligence) / 4) + Math.floor(Math.random() * 5);
}
exports.default = router;
//# sourceMappingURL=battles.js.map