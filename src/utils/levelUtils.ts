export interface LevelInfo {
  level: number;
  expIntoCurrentLevel: number;
  expRequiredForNext: number;
  progressPercent: number;
  totalExp: number;
}

export function getLevelInfo(totalExp: number): LevelInfo {
  let level = 1;
  let expRequiredForNext = 100;
  let currentLevelBaseExp = 0;

  // Level curve: 100, 130, 169, 220, 286...
  while (totalExp >= currentLevelBaseExp + expRequiredForNext) {
    currentLevelBaseExp += expRequiredForNext;
    level += 1;
    expRequiredForNext = Math.round(100 * Math.pow(1.3, level - 1));
  }

  const expIntoCurrentLevel = Math.max(0, totalExp - currentLevelBaseExp);
  const progressPercent = Math.min(100, Math.max(0, Math.floor((expIntoCurrentLevel / expRequiredForNext) * 100)));

  return {
    level,
    expIntoCurrentLevel,
    expRequiredForNext,
    progressPercent,
    totalExp
  };
}
