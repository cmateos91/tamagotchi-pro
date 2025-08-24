// Tipos compartidos entre frontend y backend

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

export interface CreatureStats {
  hunger: number; // 0-100
  happiness: number; // 0-100
  health: number; // 0-100
  energy: number; // 0-100
  cleanliness: number; // 0-100
  intelligence: number; // 0-100
  strength: number; // 0-100
  agility: number; // 0-100
}

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
  age: number; // en horas
  birthDate: Date;
  lastFed: Date;
  lastPlayed: Date;
  lastCleaned: Date;
  isAlive: boolean;
  evolutionPoints: number;
  traits: string[];
  createdAt: Date;
  updatedAt: Date;
}

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

// Tipos para batallas
export interface BattleResult {
  winnerId: string;
  loserId: string;
  winnerCreatureId: string;
  loserCreatureId: string;
  experienceGained: number;
  battleLog: string[];
  duration: number; // en segundos
}

export interface Leaderboard {
  userId: string;
  username: string;
  score: number;
  rank: number;
  creatureCount: number;
  totalExperience: number;
}

