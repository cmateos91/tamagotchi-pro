import express from 'express';
import pool from '../config/database';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { Leaderboard, ApiResponse } from '../../../shared/types';

const router = express.Router();

// Obtener ranking global por experiencia total
router.get('/experience', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const userId = req.userId;

    const result = await pool.query(`
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

    const leaderboard: Leaderboard[] = result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      score: row.total_experience,
      rank: row.rank,
      creatureCount: row.creature_count,
      totalExperience: row.total_experience
    }));

    // Si el usuario está autenticado, obtener su posición si no está en el top
    let userRank = null;
    if (userId) {
      const userInTop = leaderboard.find(entry => entry.userId === userId);
      if (!userInTop) {
        const userRankResult = await pool.query(`
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

    const response: ApiResponse<{leaderboard: Leaderboard[], userRank?: Leaderboard}> = {
      success: true,
      data: {
        leaderboard,
        ...(userRank && { userRank })
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error obteniendo ranking de experiencia:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Obtener ranking por nivel máximo
router.get('/level', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await pool.query(`
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

    const leaderboard: Leaderboard[] = result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      score: row.max_level,
      rank: row.rank,
      creatureCount: row.creature_count,
      totalExperience: row.total_experience
    }));

    const response: ApiResponse<Leaderboard[]> = {
      success: true,
      data: leaderboard
    };

    res.json(response);
  } catch (error) {
    console.error('Error obteniendo ranking de nivel:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Obtener ranking por batallas ganadas
router.get('/battles', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await pool.query(`
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

    const leaderboard: Leaderboard[] = result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      score: row.battles_won,
      rank: row.rank,
      creatureCount: row.creature_count,
      totalExperience: row.total_experience
    }));

    const response: ApiResponse<Leaderboard[]> = {
      success: true,
      data: leaderboard
    };

    res.json(response);
  } catch (error) {
    console.error('Error obteniendo ranking de batallas:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Obtener estadísticas generales del juego
router.get('/stats', async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM creatures WHERE is_alive = true) as total_creatures,
        (SELECT COUNT(*) FROM battles) as total_battles,
        (SELECT COUNT(*) FROM user_achievements) as total_achievements_unlocked,
        (SELECT AVG(level) FROM creatures WHERE is_alive = true) as avg_level,
        (SELECT species FROM creatures WHERE is_alive = true GROUP BY species ORDER BY COUNT(*) DESC LIMIT 1) as most_popular_species
    `);

    const stats = statsResult.rows[0];

    const response: ApiResponse = {
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
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

export default router;

