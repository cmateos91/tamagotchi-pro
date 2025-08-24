"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/experience', auth_1.optionalAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const userId = req.userId;
        const result = await database_1.default.query(`
      SELECT 
        u.id as user_id,
        u.username,
        SUM(c.experience) as total_experience,
        COUNT(c.id) as creature_count,
        MAX(c.level) as max_level,
        ROW_NUMBER() OVER (ORDER BY SUM(c.experience) DESC) as rank
      FROM users u
      LEFT JOIN creatures c ON u.id = c.user_id AND c.is_alive = true
      GROUP BY u.id, u.username
      HAVING SUM(c.experience) > 0
      ORDER BY total_experience DESC
      LIMIT $1
    `, [limit]);
        const leaderboard = result.rows.map(row => ({
            userId: row.user_id,
            username: row.username,
            score: row.total_experience,
            rank: row.rank,
            creatureCount: row.creature_count,
            totalExperience: row.total_experience
        }));
        let userRank = null;
        if (userId) {
            const userInTop = leaderboard.find(entry => entry.userId === userId);
            if (!userInTop) {
                const userRankResult = await database_1.default.query(`
          WITH ranked_users AS (
            SELECT 
              u.id as user_id,
              u.username,
              SUM(c.experience) as total_experience,
              COUNT(c.id) as creature_count,
              ROW_NUMBER() OVER (ORDER BY SUM(c.experience) DESC) as rank
            FROM users u
            LEFT JOIN creatures c ON u.id = c.user_id AND c.is_alive = true
            GROUP BY u.id, u.username
            HAVING SUM(c.experience) > 0
          )
          SELECT * FROM ranked_users WHERE user_id = $1
        `, [userId]);
                if (userRankResult.rows.length > 0) {
                    const row = userRankResult.rows[0];
                    userRank = {
                        userId: row.user_id,
                        username: row.username,
                        score: row.total_experience,
                        rank: row.rank,
                        creatureCount: row.creature_count,
                        totalExperience: row.total_experience
                    };
                }
            }
        }
        const response = {
            success: true,
            data: {
                leaderboard,
                ...(userRank && { userRank })
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error obteniendo ranking de experiencia:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.get('/level', auth_1.optionalAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const result = await database_1.default.query(`
      SELECT 
        u.id as user_id,
        u.username,
        MAX(c.level) as max_level,
        COUNT(c.id) as creature_count,
        SUM(c.experience) as total_experience,
        ROW_NUMBER() OVER (ORDER BY MAX(c.level) DESC, SUM(c.experience) DESC) as rank
      FROM users u
      LEFT JOIN creatures c ON u.id = c.user_id AND c.is_alive = true
      GROUP BY u.id, u.username
      HAVING MAX(c.level) > 0
      ORDER BY max_level DESC, total_experience DESC
      LIMIT $1
    `, [limit]);
        const leaderboard = result.rows.map(row => ({
            userId: row.user_id,
            username: row.username,
            score: row.max_level,
            rank: row.rank,
            creatureCount: row.creature_count,
            totalExperience: row.total_experience
        }));
        const response = {
            success: true,
            data: leaderboard
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error obteniendo ranking de nivel:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.get('/battles', auth_1.optionalAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const result = await database_1.default.query(`
      SELECT 
        u.id as user_id,
        u.username,
        COUNT(b.id) as battles_won,
        COALESCE(stats.creature_count, 0) as creature_count,
        COALESCE(stats.total_experience, 0) as total_experience,
        ROW_NUMBER() OVER (ORDER BY COUNT(b.id) DESC) as rank
      FROM users u
      LEFT JOIN battles b ON u.id = b.winner_id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(id) as creature_count,
          SUM(experience) as total_experience
        FROM creatures 
        WHERE is_alive = true
        GROUP BY user_id
      ) stats ON u.id = stats.user_id
      GROUP BY u.id, u.username, stats.creature_count, stats.total_experience
      HAVING COUNT(b.id) > 0
      ORDER BY battles_won DESC
      LIMIT $1
    `, [limit]);
        const leaderboard = result.rows.map(row => ({
            userId: row.user_id,
            username: row.username,
            score: row.battles_won,
            rank: row.rank,
            creatureCount: row.creature_count,
            totalExperience: row.total_experience
        }));
        const response = {
            success: true,
            data: leaderboard
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error obteniendo ranking de batallas:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.get('/stats', async (req, res) => {
    try {
        const statsResult = await database_1.default.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM creatures WHERE is_alive = true) as total_creatures,
        (SELECT COUNT(*) FROM battles) as total_battles,
        (SELECT COUNT(*) FROM user_achievements) as total_achievements_unlocked,
        (SELECT AVG(level) FROM creatures WHERE is_alive = true) as avg_level,
        (SELECT species FROM creatures WHERE is_alive = true GROUP BY species ORDER BY COUNT(*) DESC LIMIT 1) as most_popular_species
    `);
        const stats = statsResult.rows[0];
        const response = {
            success: true,
            data: {
                totalUsers: parseInt(stats.total_users),
                totalCreatures: parseInt(stats.total_creatures),
                totalBattles: parseInt(stats.total_battles),
                totalAchievementsUnlocked: parseInt(stats.total_achievements_unlocked),
                averageLevel: parseFloat(stats.avg_level || 0).toFixed(1),
                mostPopularSpecies: stats.most_popular_species
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=leaderboard.js.map