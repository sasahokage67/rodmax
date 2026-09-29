import React, { useState } from 'react';
import { FishItem, AnglerProfile } from '../types';
import { FISH_DATABASE } from '../data/fishDatabase';
import { sound } from '../audio';
import { useLanguage } from '../i18n/LanguageContext';
import { getFishName, getFishDescription, getRarityName } from '../i18n/translations';
import { X, Trophy } from 'lucide-react';

interface BestiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AnglerProfile;
  initialSelected?: FishItem | null;
}

export const BestiaryModal: React.FC<BestiaryModalProps> = ({
  isOpen,
  onClose,
  profile,
  initialSelected
}) => {
  const { language, t } = useLanguage();
  const [selectedFish, setSelectedFish] = useState<FishItem>(initialSelected || FISH_DATABASE[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm select-none animate-in fade-in duration-150">
      
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#07130e] border-2 border-emerald-400 p-4 sm:p-6 flex flex-col shadow-[0_0_40px_rgba(16,185,129,0.3)] pixel-corners overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-emerald-500/40">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-arcade text-emerald-400 text-xs sm:text-sm tracking-wider">
                {t('bestiary.modalTitle')}
              </h2>
              <p className="font-mono text-[9px] sm:text-[10px] text-zinc-400 mt-0.5">
                {t('bestiary.modalSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={() => { sound.playReelClick(); onClose(); }}
            className="p-1.5 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:border-emerald-400 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 overflow-y-auto pr-1">
          
          {/* Left: Species Grid */}
          <div className="md:col-span-6 grid grid-cols-2 gap-2 sm:gap-3 max-h-[480px] overflow-y-auto pr-1">
            {FISH_DATABASE.map((fish) => {
              const catchCount = profile.catchCounts?.[fish.id] || 0;
              const hasCaught = catchCount > 0 || profile.inventory.some(i => i.fish.id === fish.id);
              const isSelected = selectedFish.id === fish.id;

              return (
                <div
                  key={fish.id}
                  onClick={() => { sound.playReelClick(); setSelectedFish(fish); }}
                  className={`p-2 border-2 cursor-pointer transition-all pixel-corners flex flex-col justify-between ${
                    isSelected 
                      ? 'bg-emerald-950/80 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                      : 'bg-black/60 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="aspect-[4/3] bg-black overflow-hidden relative border border-zinc-900">
                    <img
                      src={fish.cardImage}
                      alt={getFishName(fish, language)}
                      className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                    />
                    
                    {/* Chance Badge */}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/90 border border-cyan-400/80 font-mono text-[9px] text-cyan-300 font-bold shadow-md">
                      {fish.catchChance}%
                    </div>

                    {/* Caught status */}
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/85 border border-zinc-700 font-arcade text-[7px]">
                      {hasCaught ? (
                        <span className="text-emerald-400 font-bold">{t('bestiary.caught')}</span>
                      ) : (
                        <span className="text-zinc-500">{t('bestiary.notCaught')}</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex justify-between items-center font-arcade text-[8px]">
                    <span className="text-cyan-300 font-mono font-bold">{fish.catchChance}% {t('bestiary.chance')}</span>
                    <span className="text-amber-400">{fish.basePrice.toLocaleString()} C</span>
                  </div>

                  <div className="font-arcade text-[8px] sm:text-[9px] text-zinc-100 truncate mt-0.5">
                    {getFishName(fish, language)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Selected Fish Detailed Card & Video */}
          <div className="md:col-span-6 bg-black/70 border-2 border-emerald-500/50 p-3 sm:p-4 space-y-3 sm:space-y-4 flex flex-col justify-between pixel-corners">
            
            <div className="space-y-3">
              {/* Catch Video Showcase */}
              <div className="aspect-video bg-black overflow-hidden border border-emerald-500/40 relative">
                {selectedFish.catchVideo ? (
                  <video
                    key={selectedFish.catchVideo}
                    src={selectedFish.catchVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={selectedFish.cardImage}
                    alt={getFishName(selectedFish, language)}
                    className="w-full h-full object-cover"
                  />
                )}

                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/90 border border-cyan-400 font-mono text-[9px] sm:text-[10px] text-cyan-300 font-bold">
                  {t('bestiary.biteRate')}: {selectedFish.catchChance}%
                </div>
              </div>

              {/* Title & Stats */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-arcade text-xs sm:text-sm text-white tracking-wide">
                    {getFishName(selectedFish, language)}
                  </h3>
                  <span 
                    className="font-arcade text-[9px] px-2 py-0.5 border"
                    style={{ color: selectedFish.color, borderColor: `${selectedFish.color}60` }}
                  >
                    {getRarityName(selectedFish.rarity, language)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] sm:text-xs text-zinc-300 mt-2 p-2 bg-[#06120b] border border-emerald-500/30">
                  <div>{t('bestiary.weight')}: <span className="text-emerald-400 font-bold">{selectedFish.weightMin} - {selectedFish.weightMax} {t('bestiary.kg')}</span></div>
                  <div>{t('bestiary.basePrice')}: <span className="text-amber-400 font-bold">{selectedFish.basePrice.toLocaleString()} C</span></div>
                  <div>{t('bestiary.catchRate')}: <span className="text-cyan-400 font-bold">{selectedFish.catchChance}%</span></div>
                  <div>{t('bestiary.caughtByYou')}: <span className="text-emerald-300 font-bold">{profile.catchCounts?.[selectedFish.id] || 0} {t('bestiary.times')}</span></div>
                </div>
              </div>

              {/* Lore description */}
              <p className="font-mono text-[11px] sm:text-xs text-emerald-200/90 leading-relaxed bg-[#050c08] p-3 border border-emerald-500/20">
                {getFishDescription(selectedFish, language)}
              </p>
            </div>

            {/* Difficulty Rating */}
            <div className="pt-2 border-t border-emerald-500/30 flex justify-between items-center text-xs font-arcade">
              <span className="text-zinc-400 text-[8px] sm:text-[9px]">
                {language === 'ru' ? 'СЛОЖНОСТЬ ВЫВАЖИВАНИЯ:' : 'REELING DIFFICULTY:'}
              </span>
              <div className="flex gap-1 text-sm">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={star <= selectedFish.catchDifficulty ? 'text-amber-400' : 'text-zinc-700'}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
