import React, { useState } from 'react';
import { FishItem, AnglerProfile } from '../types';
import { FISH_DATABASE } from '../data/fishDatabase';
import { sound } from '../audio';
import { X, Trophy, Sparkles, Percent } from 'lucide-react';

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
  const [selectedFish, setSelectedFish] = useState<FishItem>(initialSelected || FISH_DATABASE[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none animate-in fade-in duration-150">
      
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#07130e] border-2 border-emerald-400 p-6 flex flex-col shadow-[0_0_40px_rgba(16,185,129,0.3)] pixel-corners overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-emerald-500/40">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-arcade text-emerald-400 text-sm tracking-wider">
                БЕСТИАРИЙ ГЛУБИН И ЭНЦИКЛОПЕДИЯ РЫБ
              </h2>
              <p className="font-mono text-[10px] text-zinc-400 mt-0.5">
                Все 8 видов океана с точными процентами шанса вылова и 1080p видео поимки
              </p>
            </div>
          </div>
          <button
            onClick={() => { sound.playReelClick(); onClose(); }}
            className="p-1.5 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:border-emerald-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto pr-1">
          
          {/* Left: Species Grid */}
          <div className="md:col-span-6 grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
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
                      alt={fish.name}
                      className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                    />
                    
                    {/* Chance Badge */}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/90 border border-cyan-400/80 font-mono text-[9px] text-cyan-300 font-bold shadow-md">
                      {fish.catchChance}%
                    </div>

                    {/* Caught status */}
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/85 border border-zinc-700 font-arcade text-[7px]">
                      {hasCaught ? (
                        <span className="text-emerald-400 font-bold">ПОЙМАН</span>
                      ) : (
                        <span className="text-zinc-500">НЕ ВЫЛОВЛЕН</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex justify-between items-center font-arcade text-[8px]">
                    <span style={{ color: fish.color }}>{fish.rarity}</span>
                    <span className="text-amber-400">{fish.basePrice.toLocaleString()} C</span>
                  </div>

                  <div className="font-arcade text-[9px] text-zinc-100 truncate mt-0.5">
                    {fish.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Selected Fish Detailed Card & Video */}
          <div className="md:col-span-6 bg-black/70 border-2 border-emerald-500/50 p-4 space-y-4 flex flex-col justify-between pixel-corners">
            
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
                    alt={selectedFish.name}
                    className="w-full h-full object-cover"
                  />
                )}

                <div 
                  className="absolute top-2 right-2 px-2 py-0.5 bg-black/90 border font-arcade text-[8px]"
                  style={{ borderColor: selectedFish.color, color: selectedFish.color }}
                >
                  {selectedFish.rarity}
                </div>

                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/90 border border-cyan-400 font-mono text-[10px] text-cyan-300 font-bold">
                  ШАНС ПОКЛЕВКИ: {selectedFish.catchChance}%
                </div>
              </div>

              {/* Title & Stats */}
              <div>
                <h3 className="font-arcade text-sm text-white tracking-wide">{selectedFish.name}</h3>
                
                <div className="grid grid-cols-2 gap-2 font-mono text-xs text-zinc-300 mt-2 p-2 bg-[#06120b] border border-emerald-500/30">
                  <div>Вес: <span className="text-emerald-400 font-bold">{selectedFish.weightMin} - {selectedFish.weightMax} кг</span></div>
                  <div>Базовая цена: <span className="text-amber-400 font-bold">{selectedFish.basePrice.toLocaleString()} C</span></div>
                  <div>Шанс вылова: <span className="text-cyan-400 font-bold">{selectedFish.catchChance}%</span></div>
                  <div>Поймано вами: <span className="text-emerald-300 font-bold">{profile.catchCounts?.[selectedFish.id] || 0} раз</span></div>
                </div>
              </div>

              {/* Lore description */}
              <p className="font-mono text-xs text-emerald-200/90 leading-relaxed bg-[#050c08] p-3 border border-emerald-500/20">
                {selectedFish.description}
              </p>
            </div>

            {/* Difficulty Rating */}
            <div className="pt-2 border-t border-emerald-500/30 flex justify-between items-center text-xs font-arcade">
              <span className="text-zinc-400 text-[9px]">СЛОЖНОСТЬ ВЫВАЖИВАНИЯ:</span>
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
