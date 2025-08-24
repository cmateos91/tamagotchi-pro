"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlockAchievement = unlockAchievement;
exports.checkAchievements = checkAchievements;
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const result = await database_1.default.query('SELECT * FROM achievements ORDER BY rarity, name');
        const achievements = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            icon: row.icon,
            rarity: row.rarity
        }));
        const response = {
            success: true,
            data: achievements
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error obteniendo logros:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.get('/user', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const result = await database_1.default.query(`
      SELECT a.*, ua.unlocked_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      ORDER BY ua.unlocked_at DESC NULLS LAST, a.rarity, a.name
    `, [userId]);
        const achievements = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            icon: row.icon,
            rarity: row.rarity,
            unlockedAt: row.unlocked_at
        }));
        const response = {
            success: true,
            data: achievements
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error obteniendo logros del usuario:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
async function unlockAchievement(userId, achievementId) {
    try {
        const existing = await database_1.default.query('SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2', [userId, achievementId]);
        if (existing.rows.length > 0) {
            return false;
        }
        await database_1.default.query('INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)', [userId, achievementId]);
        return true;
    }
    catch (error) {
        console.error('Error desbloqueando logro:', error);
        return false;
    }
}
async function checkAchievements(userId) {
    const unlockedAchievements = [];
    try {
        const userStats = await database_1.default.query(`
      SELECT 
        COUNT(*) as creature_count,
        COUNT(DISTINCT species) as species_count,
        MAX(level) as max_level,
        MAX(age) as max_age
      FROM creatures 
      WHERE user_id = $1 AND is_alive = true
    `, [userId]);
        const stats = userStats.rows[0];
        const actionStats = await database_1.default.query(`
      SELECT 
        action_type,
        COUNT(*) as count
      FROM creature_actions ca
      JOIN creatures c ON ca.creature_id = c.id
      WHERE c.user_id = $1
      GROUP BY action_type
    `, [userId]);
        const actions = {};
        actionStats.rows.forEach(row => {
            actions[row.action_type] = parseInt(row.count);
        });
        const achievementsResult = await database_1.default.query('SELECT * FROM achievements');
        for (const achievement of achievementsResult.rows) {
            const conditions = achievement.conditions;
            let shouldUnlock = false;
            switch (conditions.type) {
                case 'creature_created':
                    shouldUnlock = stats.creature_count >= conditions.count;
                    break;
                case 'feed_count':
                    shouldUnlock = (actions.feed || 0) >= conditions.count;
                    break;
                case 'play_count':
                    shouldUnlock = (actions.play || 0) >= conditions.count;
                    break;
                case 'different_species':
                    shouldUnlock = stats.species_count >= conditions.count;
                    break;
                case 'creature_level':
                    shouldUnlock = stats.max_level >= conditions.level;
                    break;
                case 'creature_age':
                    shouldUnlock = stats.max_age >= (conditions.days * 24);
                    break;
            }
            if (shouldUnlock) {
                const unlocked = await unlockAchievement(userId, achievement.id);
                if (unlocked) {
                    unlockedAchievements.push(achievement.id);
                }
            }
        }
    }
    catch (error) {
        console.error('Error verificando logros:', error);
    }
    return unlockedAchievements;
}
exports.default = router;
//# sourceMappingURL=achievements.js.map