/**
 * Shared Types for Tamagotchi Pro
 * Used across frontend, backend, and AI development
 * 
 * Key Entities:
 * - User: Authentication and profile
 * - Creature: Core game entity with 8 species, 5 stages
 * - Battle: PvP combat system
 * - Achievement: Progression rewards
 * - GameEvent: Timed events and rewards
 */

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Enums para especies y tipos
export enum CreatureSpecies {
  VERDANIA = 'verdania',
  TERRANIA = 'terrania',
  AQUARINA = 'aquarina',
  IGNIUS = 'ignius',
  GLACIUS = 'glacius',
  VOLTUS = 'voltus',
  STELLARIS = 'stellaris',
  UMBRA = 'umbra'
}

export enum CreatureStage {
  EGG = 'egg',
  BABY = 'baby',
  TEEN = 'teen',
  ADULT = 'adult',
  ELDER = 'elder'
}

export enum CreaturePersonality {
  TIMIDO = 'timido',
  AVENTURERO = 'aventurero',
  GLOTON = 'gloton',
  PEREZOSO = 'perezoso',
  ENERGICO = 'energico'
}

export enum CreatureMood {
  FELIZ = 'feliz',
  TRISTE = 'triste',
  HAMBRIENTO = 'hambriento',
  CANSADO = 'cansado',
  ENFERMO = 'enfermo',
  ABURRIDO = 'aburrido',
  EMOCIONADO = 'emocionado'
}

// Core stats interface - all values 0-100
export interface CreatureStats {
  hunger: number;      // Decays over time, feed to restore
  happiness: number;   // Affects evolution, play to restore  
  health: number;      // Can get sick, heal to restore
  energy: number;      // Depleted by actions, sleep to restore
  cleanliness: number; // Decays over time, clean to restore
  intelligence: number; // Training stat for battles
  strength: number;    // Combat stat for battles
  agility: number;     // Speed stat for battles
}

// Validation ranges for stats
export const STAT_RANGES = {
  MIN: 0,
  MAX: 100,
  CRITICAL: 20,  // Below this triggers warnings
  GOOD: 70       // Above this is considered healthy
} as const;

// Main creature entity - central to game mechanics
export interface Creature {
  id: string;
  userId: string;
  name: string;
  species: CreatureSpecies;
  stage: CreatureStage;
  personality: CreaturePersonality;
  mood: CreatureMood;
  stats: CreatureStats;
  level: number;
  experience: number;
  age: number;            // Age in hours since birth
  birthDate: Date;
  lastFed: Date;         // For hunger decay calculation
  lastPlayed: Date;      // For happiness decay
  lastCleaned: Date;     // For cleanliness decay
  isAlive: boolean;      // Death state (irreversible)
  evolutionPoints: number; // Progress toward next stage
  traits: string[];      // Special characteristics
  createdAt: Date;
  updatedAt: Date;
}

// Evolution requirements by stage
export const EVOLUTION_REQUIREMENTS = {
  [CreatureStage.EGG]: { age: 24, stats: {} },
  [CreatureStage.BABY]: { age: 72, stats: { happiness: 60, health: 60 } },
  [CreatureStage.TEEN]: { age: 168, stats: { happiness: 70, intelligence: 50 } },
  [CreatureStage.ADULT]: { age: 336, stats: { happiness: 80, strength: 70 } },
  [CreatureStage.ELDER]: { age: 720, stats: { happiness: 90, intelligence: 90 } }
} as const;

export interface CreatureAction {
  type: 'feed' | 'play' | 'clean' | 'sleep' | 'train' | 'heal';
  timestamp: Date;
  result: {
    statsChange: Partial<CreatureStats>;
    experienceGained: number;
    moodChange?: CreatureMood;
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: Date;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  rewards: {
    type: 'creature' | 'item' | 'achievement';
    value: string;
  }[];
  isActive: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Tipos para notificaciones push
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

// Tipos para el sistema de trading
export interface TradeOffer {
  id: string;
  fromUserId: string;
  toUserId: string;
  offeredCreatureId: string;
  requestedCreatureId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: Date;
  expiresAt: Date;
}

// Battle system types
export interface Battle {
  id: string;
  challenger: string;     // User ID
  opponent: string;       // User ID  
  challengerCreature: string; // Creature ID
  opponentCreature: string;   // Creature ID
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  result?: BattleResult;
  createdAt: Date;
  completedAt?: Date;
}

export interface BattleResult {
  winnerId: string;
  loserId: string;
  winnerCreatureId: string;
  loserCreatureId: string;
  experienceGained: number;
  battleLog: string[];    // Turn-by-turn combat log
  duration: number;       // Battle duration in seconds
}

// Combat calculations
export interface CombatStats {
  attack: number;   // Derived from strength + level
  defense: number;  // Derived from health + level  
  speed: number;    // Derived from agility + level
  accuracy: number; // Derived from intelligence + level
}

export interface Leaderboard {
  userId: string;
  username: string;
  score: number;
  rank: number;
  creatureCount: number;
  totalExperience: number;
}

