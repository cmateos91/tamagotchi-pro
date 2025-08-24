import pool from '../config/database';
import { checkAchievements } from '../routes/achievements';

// Intervalo de actualización del juego (cada 5 minutos)
const GAME_LOOP_INTERVAL = 5 * 60 * 1000; // 5 minutos en milisegundos

// Degradación de estadísticas por hora
const STAT_DEGRADATION = {
  hunger: 2,      // -2 por hora
  happiness: 1,   // -1 por hora
  energy: 1,      // -1 por hora
  cleanliness: 1  // -1 por hora
};

export class GameLoop {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    console.log('🎮 Iniciando loop de juego...');
    
    this.intervalId = setInterval(async () => {
      try {
        await this.updateCreatures();
        await this.checkEvolutions();
        await this.processAchievements();
      } catch (error) {
        console.error('Error en loop de juego:', error);
      }
    }, GAME_LOOP_INTERVAL);

    console.log(`✅ Loop de juego iniciado (intervalo: ${GAME_LOOP_INTERVAL / 1000}s)`);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Loop de juego detenido');
    }
  }

  private async updateCreatures() {
    try {
      // Obtener todas las criaturas vivas
      const result = await pool.query(`
        SELECT id, user_id, hunger, happiness, energy, cleanliness, health, age, updated_at
        FROM creatures 
        WHERE is_alive = true
      `);

      for (const creature of result.rows) {
        const now = new Date();
        const lastUpdate = new Date(creature.updated_at);
        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceUpdate >= 1) {
          // Calcular degradación
          const hoursToDegrade = Math.floor(hoursSinceUpdate);
          
          const newStats = {
            hunger: Math.max(0, creature.hunger - (STAT_DEGRADATION.hunger * hoursToDegrade)),
            happiness: Math.max(0, creature.happiness - (STAT_DEGRADATION.happiness * hoursToDegrade)),
            energy: Math.max(0, creature.energy - (STAT_DEGRADATION.energy * hoursToDegrade)),
            cleanliness: Math.max(0, creature.cleanliness - (STAT_DEGRADATION.cleanliness * hoursToDegrade)),
            age: creature.age + hoursToDegrade
          };

          // Verificar si la criatura debe morir
          let isAlive = true;
          let newHealth = creature.health;

          if (newStats.hunger === 0 || newStats.happiness === 0) {
            newHealth = Math.max(0, newHealth - (hoursToDegrade * 5));
            if (newHealth === 0) {
              isAlive = false;
            }
          }

          // Actualizar criatura
          await pool.query(`
            UPDATE creatures SET 
              hunger = $1,
              happiness = $2,
              energy = $3,
              cleanliness = $4,
              health = $5,
              age = $6,
              is_alive = $7,
              updated_at = NOW()
            WHERE id = $8
          `, [
            newStats.hunger,
            newStats.happiness,
            newStats.energy,
            newStats.cleanliness,
            newHealth,
            newStats.age,
            isAlive,
            creature.id
          ]);

          if (!isAlive) {
            console.log(`💀 Criatura ${creature.id} ha fallecido por falta de cuidados`);
          }
        }
      }
    } catch (error) {
      console.error('Error actualizando criaturas:', error);
    }
  }

  private async checkEvolutions() {
    try {
      // Obtener criaturas que podrían evolucionar
      const result = await pool.query(`
        SELECT id, user_id, stage, age, level, happiness, health, evolution_points
        FROM creatures 
        WHERE is_alive = true 
        AND stage IN ('egg', 'baby', 'teen', 'adult')
      `);

      for (const creature of result.rows) {
        let canEvolve = false;
        let newStage = '';

        switch (creature.stage) {
          case 'egg':
            if (creature.age >= 1 && creature.happiness >= 50 && creature.health >= 70) {
              canEvolve = true;
              newStage = 'baby';
            }
            break;
          case 'baby':
            if (creature.age >= 24 && creature.level >= 5 && creature.happiness >= 60 && 
                creature.health >= 80 && creature.evolution_points >= 10) {
              canEvolve = true;
              newStage = 'teen';
            }
            break;
          case 'teen':
            if (creature.age >= 72 && creature.level >= 15 && creature.happiness >= 70 && 
                creature.health >= 85 && creature.evolution_points >= 50) {
              canEvolve = true;
              newStage = 'adult';
            }
            break;
          case 'adult':
            if (creature.age >= 240 && creature.level >= 30 && creature.happiness >= 80 && 
                creature.health >= 90 && creature.evolution_points >= 150) {
              canEvolve = true;
              newStage = 'elder';
            }
            break;
        }

        if (canEvolve) {
          // Evolución automática
          const evolutionBonus = this.getEvolutionBonus(newStage);
          
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
            creature.id
          ]);

          console.log(`🌟 Criatura ${creature.id} evolucionó automáticamente a ${newStage}`);
        }
      }
    } catch (error) {
      console.error('Error verificando evoluciones:', error);
    }
  }

  private async processAchievements() {
    try {
      // Obtener todos los usuarios con criaturas
      const usersResult = await pool.query(`
        SELECT DISTINCT user_id 
        FROM creatures 
        WHERE is_alive = true
      `);

      for (const user of usersResult.rows) {
        await checkAchievements(user.user_id);
      }
    } catch (error) {
      console.error('Error procesando logros:', error);
    }
  }

  private getEvolutionBonus(stage: string) {
    const bonuses: { [key: string]: any } = {
      'baby': {
        levelBonus: 2,
        intelligenceBonus: 5,
        strengthBonus: 5,
        agilityBonus: 5
      },
      'teen': {
        levelBonus: 3,
        intelligenceBonus: 10,
        strengthBonus: 10,
        agilityBonus: 10
      },
      'adult': {
        levelBonus: 5,
        intelligenceBonus: 15,
        strengthBonus: 15,
        agilityBonus: 15
      },
      'elder': {
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
}

export const gameLoop = new GameLoop();

