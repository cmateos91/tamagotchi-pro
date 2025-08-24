-- Migración inicial para el sistema Tamagotchi
-- Versión: 001
-- Descripción: Crear tablas básicas para usuarios, criaturas y sistema de juego

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Tabla de criaturas
CREATE TABLE IF NOT EXISTS creatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(20) NOT NULL,
    species VARCHAR(20) NOT NULL CHECK (species IN ('verdania', 'terrania', 'aquarina', 'ignius', 'glacius', 'voltus', 'stellaris', 'umbra')),
    stage VARCHAR(20) NOT NULL CHECK (stage IN ('egg', 'baby', 'teen', 'adult', 'elder')),
    personality VARCHAR(20) NOT NULL CHECK (personality IN ('timido', 'aventurero', 'gloton', 'perezoso', 'energico')),
    mood VARCHAR(20) NOT NULL CHECK (mood IN ('feliz', 'triste', 'hambriento', 'cansado', 'enfermo', 'aburrido', 'emocionado')),
    
    -- Estadísticas (0-100)
    hunger INTEGER NOT NULL DEFAULT 80 CHECK (hunger >= 0 AND hunger <= 100),
    happiness INTEGER NOT NULL DEFAULT 70 CHECK (happiness >= 0 AND happiness <= 100),
    health INTEGER NOT NULL DEFAULT 100 CHECK (health >= 0 AND health <= 100),
    energy INTEGER NOT NULL DEFAULT 90 CHECK (energy >= 0 AND energy <= 100),
    cleanliness INTEGER NOT NULL DEFAULT 100 CHECK (cleanliness >= 0 AND cleanliness <= 100),
    intelligence INTEGER NOT NULL DEFAULT 10 CHECK (intelligence >= 0 AND intelligence <= 100),
    strength INTEGER NOT NULL DEFAULT 10 CHECK (strength >= 0 AND strength <= 100),
    agility INTEGER NOT NULL DEFAULT 10 CHECK (agility >= 0 AND agility <= 100),
    
    -- Progreso
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    experience INTEGER NOT NULL DEFAULT 0 CHECK (experience >= 0),
    age INTEGER NOT NULL DEFAULT 0 CHECK (age >= 0), -- en horas
    
    -- Timestamps de acciones
    birth_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_fed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_played TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_cleaned TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Estado
    is_alive BOOLEAN NOT NULL DEFAULT TRUE,
    evolution_points INTEGER NOT NULL DEFAULT 0 CHECK (evolution_points >= 0),
    traits JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para criaturas
CREATE INDEX IF NOT EXISTS idx_creatures_user_id ON creatures(user_id);
CREATE INDEX IF NOT EXISTS idx_creatures_species ON creatures(species);
CREATE INDEX IF NOT EXISTS idx_creatures_is_alive ON creatures(is_alive);
CREATE INDEX IF NOT EXISTS idx_creatures_level ON creatures(level);

-- Tabla de logros
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    conditions JSONB NOT NULL, -- Condiciones para desbloquear
    rewards JSONB DEFAULT '[]'::jsonb, -- Recompensas al desbloquear
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de logros de usuarios
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

-- Índices para logros
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at);

-- Tabla de eventos del juego
CREATE TABLE IF NOT EXISTS game_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    rewards JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para eventos
CREATE INDEX IF NOT EXISTS idx_game_events_active ON game_events(is_active);
CREATE INDEX IF NOT EXISTS idx_game_events_dates ON game_events(start_date, end_date);

-- Tabla de intercambios (trading)
CREATE TABLE IF NOT EXISTS trade_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offered_creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
    requested_creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Índices para intercambios
CREATE INDEX IF NOT EXISTS idx_trade_offers_from_user ON trade_offers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_to_user ON trade_offers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_status ON trade_offers(status);

-- Tabla de batallas
CREATE TABLE IF NOT EXISTS battles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    winner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    loser_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    winner_creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
    loser_creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
    experience_gained INTEGER NOT NULL DEFAULT 0,
    battle_log JSONB DEFAULT '[]'::jsonb,
    duration INTEGER NOT NULL DEFAULT 0, -- en segundos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para batallas
CREATE INDEX IF NOT EXISTS idx_battles_winner ON battles(winner_id);
CREATE INDEX IF NOT EXISTS idx_battles_loser ON battles(loser_id);
CREATE INDEX IF NOT EXISTS idx_battles_created_at ON battles(created_at);

-- Tabla de acciones de criaturas (log de actividades)
CREATE TABLE IF NOT EXISTS creature_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('feed', 'play', 'clean', 'sleep', 'train', 'heal')),
    stats_change JSONB DEFAULT '{}'::jsonb,
    experience_gained INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para acciones
CREATE INDEX IF NOT EXISTS idx_creature_actions_creature_id ON creature_actions(creature_id);
CREATE INDEX IF NOT EXISTS idx_creature_actions_type ON creature_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_creature_actions_created_at ON creature_actions(created_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creatures_updated_at BEFORE UPDATE ON creatures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar logros básicos
INSERT INTO achievements (name, description, icon, rarity, conditions) VALUES
('Primera Criatura', 'Crea tu primera criatura', '🥚', 'common', '{"type": "creature_created", "count": 1}'),
('Cuidador Dedicado', 'Alimenta a una criatura 10 veces', '🍎', 'common', '{"type": "feed_count", "count": 10}'),
('Compañero de Juegos', 'Juega con una criatura 20 veces', '🎮', 'common', '{"type": "play_count", "count": 20}'),
('Evolucionista', 'Evoluciona una criatura por primera vez', '⭐', 'rare', '{"type": "evolution", "count": 1}'),
('Coleccionista', 'Ten 3 criaturas diferentes al mismo tiempo', '📚', 'rare', '{"type": "different_species", "count": 3}'),
('Maestro Entrenador', 'Alcanza nivel 10 con una criatura', '🏆', 'epic', '{"type": "creature_level", "level": 10}'),
('Leyenda Viviente', 'Mantén una criatura viva por 30 días', '👑', 'legendary', '{"type": "creature_age", "days": 30}');

-- Insertar evento de ejemplo
INSERT INTO game_events (name, description, start_date, end_date, rewards, is_active) VALUES
('Bienvenida de Invierno', 'Evento especial de temporada con criaturas únicas', 
 NOW(), NOW() + INTERVAL '30 days', 
 '[{"type": "creature", "species": "glacius", "rarity": "rare"}]', 
 true);

COMMIT;

