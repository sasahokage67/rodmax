export type TabType = 'landing' | 'auth' | 'fishing';

// ARCANE is the highest tier, above GODLY and SECRET
export type RarityType = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'MYTHIC' | 'SECRET' | 'GODLY' | 'ARCANE';

export interface FishItem {
  id: string;
  name: string;
  rarity: RarityType;
  color: string;
  cardImage: string;
  catchVideo?: string;
  weightMin: number;
  weightMax: number;
  basePrice: number;
  description: string;
  catchDifficulty: number; // 1 to 5
  catchChance: number; // Percentage chance (e.g. 0.2 for 0.2%)
}

export interface CaughtFish {
  id?: string;
  fish: FishItem;
  weight: number;
  price: number;
  caughtAt: string;
  expEarned?: number;
  isShiny?: boolean;
}

export interface AnglerProfile {
  callsign: string;
  isRegistered: boolean; // false for anonymous guest, true for registered
  avatar?: string; // image path or avatar id
  level: number;
  exp: number;
  coins: number;
  inventory: CaughtFish[];
  bestiaryUnlocked: string[];
  catchCounts?: Record<string, number>; // fishId -> total times caught
  recordWeights?: Record<string, number>; // fishId -> max weight ever caught
  totalCatchesCount?: number;
}
