import { FishItem } from '../types';

export const FISH_DATABASE: FishItem[] = [
  {
    id: 'boot',
    name: 'СТАРЫЙ САПОГ',
    rarity: 'COMMON',
    color: '#94a3b8',
    cardImage: '/assets/card_boot.jpg',
    catchVideo: '/assets/video_catch_boot.mp4',
    weightMin: 0.8,
    weightMax: 2.2,
    basePrice: 15,
    description: 'Утонувший резиновый сапог незадачливого рыболова. Есть нельзя, но старьевщики скупают на утилизацию.',
    catchDifficulty: 1,
    catchChance: 40.0
  },
  {
    id: 'salmon',
    name: 'СЕРЕБРИСТЫЙ ЛОСОСЬ',
    rarity: 'UNCOMMON',
    color: '#38bdf8',
    cardImage: '/assets/card_salmon.jpg',
    catchVideo: '/assets/video_catch_salmon.mp4',
    weightMin: 3.5,
    weightMax: 8.0,
    basePrice: 250,
    description: 'Быстрая океаническая рыба с переливающейся чешуей. Активно сопротивляется при поклевке.',
    catchDifficulty: 2,
    catchChance: 28.0
  },
  {
    id: 'goldfish',
    name: 'ПУЗАТЫЙ ЗОЛОТОЙ КАРАСЬ',
    rarity: 'RARE',
    color: '#a855f7',
    cardImage: '/assets/card_goldfish.jpg',
    catchVideo: '/assets/video_catch_fish.mp4',
    weightMin: 1.2,
    weightMax: 4.5,
    basePrice: 750,
    description: 'Необычайно крупная золотая рыба с фиолетовым мерцанием. Удивительно выносливый боец.',
    catchDifficulty: 2,
    catchChance: 16.0
  },
  {
    id: 'anglerfish',
    name: 'ГЛУБИННЫЙ УДИЛЬЩИК',
    rarity: 'EPIC',
    color: '#ef4444',
    cardImage: '/assets/card_anglerfish.jpg',
    catchVideo: '/assets/video_catch_generic.mp4',
    weightMin: 12.0,
    weightMax: 28.0,
    basePrice: 2200,
    description: 'Обитатель полуночных океанических впадин. Алый биолюминесцентный фонарь гипнотизирует добычу.',
    catchDifficulty: 3,
    catchChance: 8.5
  },
  {
    id: 'megalodon',
    name: 'ДОИСТОРИЧЕСКИЙ МЕГАЛОДОН',
    rarity: 'EPIC',
    color: '#f59e0b',
    cardImage: '/assets/card_megalodon.jpg',
    catchVideo: '/assets/video_catch_megalodon.mp4',
    weightMin: 140.0,
    weightMax: 480.0,
    basePrice: 9500,
    description: 'Древний сверххищник морей. Ломает карбоновые удилища пополам при малейшей ошибке натяжения.',
    catchDifficulty: 4,
    catchChance: 4.5
  },
  {
    id: 'sea_serpent',
    name: 'ЛЕВИАФАН БЕЗДНЫ',
    rarity: 'SECRET',
    color: '#e2e8f0',
    cardImage: '/assets/card_sea_serpent.jpg',
    catchVideo: '/assets/video_catch_sea_serpent.mp4',
    weightMin: 850.0,
    weightMax: 2400.0,
    basePrice: 38000,
    description: 'Тайная сущность, спящая под океанической корой. Шанс поклевки ровно 2.0%. Легендарная глубоководная добыча.',
    catchDifficulty: 5,
    catchChance: 2.0
  },
  {
    id: 'celestial_whale',
    name: 'СОЛНЕЧНЫЙ НЕБЕСНЫЙ КИТ',
    rarity: 'GODLY',
    color: '#fbbf24',
    cardImage: '/assets/card_celestial_whale.jpg',
    catchVideo: '/assets/video_catch_celestial_whale.mp4',
    weightMin: 380.0,
    weightMax: 1100.0,
    basePrice: 85000,
    description: 'Божественный белый левиафан с ореолом солнечных рун. Редчайший шанс 0.8%. Всплывает лишь во время затмений.',
    catchDifficulty: 5,
    catchChance: 0.8
  },
  {
    id: 'arcane_jellyfish',
    name: 'АРКАННАЯ НЕОНОВАЯ МЕДУЗА',
    rarity: 'ARCANE',
    color: '#4ade80',
    cardImage: '/assets/card_arcane_jellyfish.jpg',
    catchVideo: '/assets/video_jellyfish_emerge.mp4',
    weightMin: 18.0,
    weightMax: 45.0,
    basePrice: 195000,
    description: 'ВЕРХОВНЫЙ ТРОФЕЙ ВСЕЛЕННОЙ (0.2%). Заряжена чистой арканной плазмой первородного океана. Самый дорогой и редчайший улов в RODMAX.',
    catchDifficulty: 5,
    catchChance: 0.2
  }
];

export const rollFish = (): FishItem => {
  const roll = Math.random() * 100;
  if (roll < 0.2) return FISH_DATABASE[7]; // ARCANE (0.2%)
  if (roll < 1.0) return FISH_DATABASE[6]; // GODLY (0.8%)
  if (roll < 3.0) return FISH_DATABASE[5]; // SECRET (2.0%)
  if (roll < 7.5) return FISH_DATABASE[4]; // EPIC Megalodon (4.5%)
  if (roll < 16.0) return FISH_DATABASE[3]; // EPIC Anglerfish (8.5%)
  if (roll < 32.0) return FISH_DATABASE[2]; // RARE Goldfish (16.0%)
  if (roll < 60.0) return FISH_DATABASE[1]; // UNCOMMON Salmon (28.0%)
  return FISH_DATABASE[0]; // COMMON Boot (40.0%)
};
