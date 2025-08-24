import express from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Achievement, UserAchievement, ApiResponse, PaginatedResponse } from '../../../shared/types';

const router = express.Router();

// Obtener todos los logros disponibles
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM achievements ORDER BY rarity, name'
    );

    const achievements: Achievement[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      rarity: row.rarity
    }));

    const response: ApiResponse<Achievement[]> = {
      success: true,
      data: achievements
    };

    res.json(response);
  } catch (error) {
    console.error('Error obteniendo logros:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Obtener logros del usuario
router.get('/user', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const result = await pool.query(`
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

    const response: ApiResponse<Achievement[]> = {
      success: true,
      data: achievements
    };

    res.json(response);
  } catch (error) {
    console.error('Error obteniendo logros del usuario:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Desbloquear logro (función interna)
export async function unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
  try {
    // Verificar si ya está desbloqueado
    const existing = await pool.query(
      'SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
      [userId, achievementId]
    );

    if (existing.rows.length > 0) {
      return false; // Ya desbloqueado
    }

    // Desbloquear logro
    await pool.query(
      'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
      [userId, achievementId]
    );

    return true;
  } catch (error) {
    console.error('Error desbloqueando logro:', error);
    return false;
  }
}

// Verificar logros automáticamente
export async function checkAchievements(userId: string): Promise<string[]> {
  const unlockedAchievements: string[] = [];

  try {
    // Obtener estadísticas del usuario
    const userStats = await pool.query(`
      SELECT 
        COUNT(*) as creature_count,
        COUNT(DISTINCT species) as species_count,
        MAX(level) as max_level,
        MAX(age) as max_age
      FROM creatures 
      WHERE user_id = $1 AND is_alive = true
    `, [userId]);

    const stats = userStats.rows[0];

    // Obtener acciones del usuario
    const actionStats = await pool.query(`
      SELECT 
        action_type,
        COUNT(*) as count
      FROM creature_actions ca
      JOIN creatures c ON ca.creature_id = c.id
      WHERE c.user_id = $1
      GROUP BY action_type
    `, [userId]);

    const actions: { [key: string]: number } = {};
    actionStats.rows.forEach(row => {
      actions[row.action_type] = parseInt(row.count);
    });

    // Obtener logros disponibles
    const achievementsResult = await pool.query('SELECT * FROM achievements');
    
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
  } catch (error) {
    console.error('Error verificando logros:', error);
  }

  return unlockedAchievements;
}

export default router;

