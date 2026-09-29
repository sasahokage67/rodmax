import React, { useState } from 'react';
import { TabType, FishItem } from '../types';
import { FISH_DATABASE } from '../data/fishDatabase';
import { sound } from '../audio';
import { useLanguage } from '../i18n/LanguageContext';
import { getFishName, getFishDescription, getRarityName } from '../i18n/translations';
import { 
  Play, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Crown, 
  Camera, 
  HelpCircle, 
  X
} from 'lucide-react';

interface LandingPageProps {
  setTab: (tab: TabType) => void;
  openBestiary: () => void;
  onSelectFish: (f: FishItem) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setTab, openBestiary, onSelectFish }) => {
  const { language, t } = useLanguage();
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const previewClips = [
    { 
      title: t('landing.previewClip1'), 
      src: '/assets/video_reeling_idle.mp4', 
      desc: t('landing.previewClip1Desc') 
    },
    { 
      title: t('landing.previewClip2'), 
      src: '/assets/video_catch_celestial_whale.mp4', 
      desc: t('landing.previewClip2Desc') 
    },
    { 
      title: t('landing.previewClip3'), 
      src: '/assets/video_catch_sea_serpent.mp4', 
      desc: t('landing.previewClip3Desc') 
    }
  ];

  const arcaneFish = FISH_DATABASE.find(f => f.rarity === 'ARCANE') || FISH_DATABASE[7];

  return (
    <div className="relative min-h-screen bg-[#040806] text-zinc-100 overflow-hidden">
      
      {/* 1. Base Underwater Emerald Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center pointer-events-none opacity-45 mix-blend-screen"
        style={{ backgroundImage: `url('/assets/bg_underwater.jpg')` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-[#040806]/80 via-transparent to-[#040806] pointer-events-none" />
      <div className="fixed inset-0 scanlines pointer-events-none" />

      {/* 2. Main Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16 sm:space-y-24">
        
        {/* HERO SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Hero Left: Copy & Actions */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Live Season Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#061e14] border border-emerald-500/80 font-arcade text-[10px] text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <span>{t('landing.seasonBadge')}</span>
            </div>

            {/* Title & Slogans */}
            <div className="space-y-3">
              <h1 className="font-arcade text-3xl sm:text-5xl text-emerald-400 tracking-wider leading-none drop-shadow-[0_4px_12px_rgba(16,185,129,0.4)]">
                {t('landing.heroTitle')}
              </h1>
              <p className="font-arcade text-lg sm:text-2xl text-zinc-100 tracking-wide">
                {t('landing.heroSubtitle')}
              </p>
              <div className="font-arcade text-xs text-amber-300 tracking-widest pt-1 flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('landing.heroTagline')}</span>
              </div>
            </div>

            {/* Description */}
            <p className="font-mono text-sm sm:text-base text-emerald-200/80 leading-relaxed max-w-xl">
              {t('landing.heroDesc')}
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap gap-3 sm:gap-4">
              <button
                onClick={() => { sound.playCast(); setTab('fishing'); }}
                className="py-3.5 sm:py-4 px-6 sm:px-8 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs sm:text-sm tracking-widest border-2 border-emerald-300 shadow-[0_4px_0_#064e3b] active:translate-y-1 active:shadow-none transition-all flex items-center gap-3 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t('landing.ctaPlay')}</span>
              </button>

              <button
                onClick={() => { sound.playReelClick(); setIsGuideOpen(true); }}
                className="py-3.5 sm:py-4 px-4 sm:px-5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-arcade text-xs tracking-wider border-2 border-amber-400 flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>{t('landing.ctaGuide')}</span>
              </button>

              <button
                onClick={() => { sound.playReelClick(); setTab('auth'); }}
                className="py-3.5 sm:py-4 px-4 sm:px-5 bg-zinc-900/90 hover:bg-zinc-800 text-emerald-300 font-arcade text-xs tracking-wider border-2 border-emerald-500/60 flex items-center gap-2 hover:border-emerald-400 transition-colors cursor-pointer"
              >
                <span>{t('nav.profile')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Stats row */}
            <div className="pt-4 border-t border-emerald-500/20 grid grid-cols-2 gap-4 font-arcade text-[10px]">
              <div>
                <div className="text-emerald-500">{t('landing.statSpecies')}</div>
                <div className="text-white text-xs mt-1">{t('landing.statSpeciesSub')}</div>
              </div>
              <div>
                <div className="text-emerald-500">{t('landing.statRarity')}</div>
                <div className="text-emerald-300 text-xs mt-1">{t('landing.statRaritySub')}</div>
              </div>
            </div>

          </div>

          {/* Hero Right: Live Video Arcade Preview */}
          <div className="lg:col-span-6">
            <div className="relative bg-[#08120d] border-2 border-emerald-500/90 p-2 shadow-[0_0_35px_rgba(16,185,129,0.25)] pixel-corners">
              
              {/* Terminal Titlebar */}
              <div className="px-3 py-2 bg-emerald-950/80 border-b border-emerald-500/40 flex items-center justify-between text-xs font-arcade text-emerald-300">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] ml-2 text-zinc-300">{t('landing.previewHeading')}</span>
                </div>
                <div className="text-[9px] text-emerald-400 animate-pulse">
                  ● 60 FPS LIVE
                </div>
              </div>

              {/* Video Player */}
              <div className="relative aspect-video bg-black overflow-hidden border border-emerald-500/30">
                <video
                  key={previewClips[activePreviewIndex].src}
                  src={previewClips[activePreviewIndex].src}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/80 border border-emerald-400 text-emerald-300 font-arcade text-[9px] flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{previewClips[activePreviewIndex].title}</span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 px-3 py-2 bg-black/85 border border-zinc-800 text-zinc-300 font-mono text-xs flex justify-between items-center">
                  <span>{previewClips[activePreviewIndex].desc}</span>
                  <span className="text-emerald-400 font-arcade text-[9px]">1080P HD</span>
                </div>
              </div>

              {/* Clip Switcher Tabs */}
              <div className="grid grid-cols-3 gap-1 mt-2">
                {previewClips.map((clip, i) => (
                  <button
                    key={clip.title}
                    onClick={() => { sound.playReelClick(); setActivePreviewIndex(i); }}
                    className={`py-2 px-2 text-[9px] font-arcade truncate border transition-all cursor-pointer ${
                      activePreviewIndex === i
                        ? 'bg-emerald-500 text-black border-emerald-300 font-bold'
                        : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {language === 'ru' ? `РОЛИК ${i + 1}` : `CLIP ${i + 1}`}
                  </button>
                ))}
              </div>

            </div>
          </div>

        </section>


        {/* ARCANE SUPREME HIGHLIGHT BANNER */}
        <section className="relative p-6 sm:p-8 bg-gradient-to-r from-[#041a0e] via-[#092918] to-[#041a0e] border-2 border-emerald-400 shadow-[0_0_30px_rgba(74,222,128,0.25)] pixel-corners flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-400/20 border border-emerald-400 font-arcade text-[10px] text-emerald-300">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>{getRarityName('ARCANE', language)} ({arcaneFish.catchChance}%)</span>
            </div>
            <h2 className="font-arcade text-xl sm:text-2xl text-white tracking-wider">
              {getFishName(arcaneFish, language)}
            </h2>
            <p className="font-mono text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
              {getFishDescription(arcaneFish, language)}
            </p>
            <div className="font-arcade text-xs text-amber-400 flex items-center gap-3">
              <span>{language === 'ru' ? 'СТОИМОСТЬ' : 'VALUE'}: {arcaneFish.basePrice.toLocaleString()} {language === 'ru' ? 'МОНЕТ' : 'COINS'}</span>
              <span>·</span>
              <span className="text-cyan-400">{language === 'ru' ? 'ШАНС' : 'CHANCE'}: {arcaneFish.catchChance}%</span>
            </div>
          </div>

          <div 
            onClick={() => { sound.playReelClick(); onSelectFish(arcaneFish); }}
            className="w-48 sm:w-64 aspect-[4/3] bg-black border-2 border-emerald-400 overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-lg relative group flex-shrink-0"
          >
            <img src={arcaneFish.cardImage} alt={getFishName(arcaneFish, language)} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-emerald-500/10 group-hover:bg-transparent transition-colors" />
            <div className="absolute bottom-2 left-2 right-2 bg-black/80 px-2 py-1 font-arcade text-[9px] text-emerald-300 text-center border border-emerald-500/40">
              {language === 'ru' ? 'КЛИКНИ ДЛЯ ОСМОТРА' : 'CLICK TO INSPECT'}
            </div>
          </div>
        </section>


        {/* CORE MECHANICS: 3 WEBCAM GESTURE CONTROLS */}
        <section className="space-y-6">
          <div className="border-b border-emerald-500/30 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-arcade text-lg sm:text-xl text-emerald-400 tracking-wider">
                {t('landing.howTitle')}
              </h2>
              <p className="font-arcade text-[10px] text-zinc-400 mt-1">
                {language === 'ru' ? 'ФИЗИЧЕСКИЕ ДВИЖЕНИЯ РУК ЧЕРЕЗ ВЕБ-КАМЕРУ В РЕАЛЬНОМ ВРЕМЕНИ' : 'PHYSICAL HAND GESTURES TRACKED VIA WEBCAM IN REAL-TIME'}
              </p>
            </div>
            <div className="flex items-center gap-2 font-arcade text-[9px] text-emerald-400">
              <Camera className="w-4 h-4" />
              <span>{t('landing.statFps')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Mechanic 1 */}
            <div className="p-5 sm:p-6 bg-[#06130d]/90 border-2 border-emerald-500/50 hover:border-emerald-400 transition-all space-y-3 pixel-corners">
              <div className="w-9 h-9 bg-emerald-500/20 border border-emerald-400 flex items-center justify-center font-arcade text-sm text-emerald-300">
                01
              </div>
              <h3 className="font-arcade text-xs text-white">{t('landing.step1Title')}</h3>
              <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                {t('landing.step1Desc')}
              </p>
              <div className="px-2 py-1 bg-black/60 border border-emerald-500/30 font-arcade text-[8px] sm:text-[9px] text-emerald-400 inline-block">
                {language === 'ru' ? 'ЖЕСТ: ЛАЙК (👍) 0.3 СЕК' : 'GESTURE: THUMBS-UP (👍) 0.3s'}
              </div>
            </div>

            {/* Mechanic 2 */}
            <div className="p-5 sm:p-6 bg-[#06130d]/90 border-2 border-cyan-500/50 hover:border-cyan-400 transition-all space-y-3 pixel-corners">
              <div className="w-9 h-9 bg-cyan-500/20 border border-cyan-400 flex items-center justify-center font-arcade text-sm text-cyan-300">
                02
              </div>
              <h3 className="font-arcade text-xs text-white">{t('landing.step2Title')}</h3>
              <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                {t('landing.step2Desc')}
              </p>
              <div className="px-2 py-1 bg-black/60 border border-cyan-500/30 font-arcade text-[8px] sm:text-[9px] text-cyan-400 inline-block">
                {language === 'ru' ? 'ТАЙМИНГ: 0.75 СЕК ОКНО' : 'TIMING: 0.75s WINDOW'}
              </div>
            </div>

            {/* Mechanic 3 */}
            <div className="p-5 sm:p-6 bg-[#06130d]/90 border-2 border-amber-500/50 hover:border-amber-400 transition-all space-y-3 pixel-corners">
              <div className="w-9 h-9 bg-amber-500/20 border border-amber-400 flex items-center justify-center font-arcade text-sm text-amber-300">
                03
              </div>
              <h3 className="font-arcade text-xs text-white">{t('landing.step3Title')}</h3>
              <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                {t('landing.step3Desc')}
              </p>
              <div className="px-2 py-1 bg-black/60 border border-amber-500/30 font-arcade text-[8px] sm:text-[9px] text-amber-400 inline-block">
                {language === 'ru' ? 'ТОЧНОСТЬ: ☝️ ПРИЦЕЛ НА РЫБЕ' : 'PRECISION: ☝️ RETICLE ON FISH'}
              </div>
            </div>

            {/* Mechanic 4 */}
            <div className="p-5 sm:p-6 bg-[#06130d]/90 border-2 border-purple-500/50 hover:border-purple-400 transition-all space-y-3 pixel-corners">
              <div className="w-9 h-9 bg-purple-500/20 border border-purple-400 flex items-center justify-center font-arcade text-sm text-purple-300">
                04
              </div>
              <h3 className="font-arcade text-xs text-white">{t('landing.step4Title')}</h3>
              <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                {t('landing.step4Desc')}
              </p>
              <div className="px-2 py-1 bg-black/60 border border-purple-500/30 font-arcade text-[8px] sm:text-[9px] text-purple-400 inline-block">
                {language === 'ru' ? 'ПОДТВЕРЖДЕНИЕ: 1.0 СЕК' : 'CONFIRMATION: 1.0s'}
              </div>
            </div>

          </div>
        </section>


        {/* BESTIARY SHOWCASE WITH EXACT PERCENTAGES */}
        <section className="space-y-6">
          <div className="border-b border-emerald-500/30 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-arcade text-lg sm:text-xl text-emerald-400 tracking-wider">
                {t('landing.bestiarySectionTitle')}
              </h2>
              <p className="font-arcade text-[10px] text-zinc-400 mt-1">
                {t('landing.bestiarySectionSub')}
              </p>
            </div>
            <button
              onClick={() => { sound.playReelClick(); openBestiary(); }}
              className="self-start sm:self-auto px-4 py-2 bg-emerald-950 border border-emerald-500/80 hover:bg-emerald-500 hover:text-black font-arcade text-[10px] text-emerald-300 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>{t('landing.bestiaryOpenBtn')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {FISH_DATABASE.map((fish) => (
              <div
                key={fish.id}
                onClick={() => { sound.playReelClick(); onSelectFish(fish); }}
                className="group relative bg-[#07130e] border-2 border-zinc-700 hover:border-emerald-400 p-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] pixel-corners"
              >
                <div className="aspect-[4/3] overflow-hidden bg-black border border-zinc-800 relative">
                  <img
                    src={fish.cardImage}
                    alt={getFishName(fish, language)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/90 border border-cyan-400 font-mono text-[9px] text-cyan-300 font-bold">
                    {fish.catchChance}%
                  </div>
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/90 font-arcade text-[7px]" style={{ color: fish.color }}>
                    {getRarityName(fish.rarity, language)}
                  </div>
                </div>

                <div className="pt-2.5 pb-1 flex justify-between items-center">
                  <span className="font-arcade text-[8px] sm:text-[9px] text-zinc-100 truncate">
                    {getFishName(fish, language)}
                  </span>
                  <span className="font-arcade text-[8px] sm:text-[9px] text-amber-400 font-bold">
                    {fish.basePrice.toLocaleString()} C
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t-2 border-emerald-500/30 pt-8 pb-12 flex flex-col sm:flex-row justify-between items-center gap-6 text-zinc-400 font-mono text-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>
              {language === 'ru' 
                ? 'RODMAX — Глубоководная аркадная рыбалка с веб-камерой. Без задержек, без установки.'
                : 'RODMAX — Deepwater arcade fishing simulator via webcam. Zero latency, zero installation.'}
            </span>
          </div>
          <div className="font-arcade text-[9px] text-emerald-600">
            RODMAX © 2026 // {language === 'ru' ? 'ВСЕ ПРАВА ЗАЩИЩЕНЫ' : 'ALL RIGHTS RESERVED'}
          </div>
        </footer>

      </div>

      {/* HOW TO PLAY GUIDE MODAL ON LANDING PAGE */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-[#08150f] border-2 border-emerald-400 p-4 sm:p-6 pixel-corners shadow-[0_0_50px_rgba(16,185,129,0.4)] space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-emerald-500/40 pb-3">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-arcade text-xs sm:text-sm text-emerald-300 tracking-wider">
                    {t('guide.title')}
                  </h3>
                  <p className="font-mono text-[9px] sm:text-[10px] text-zinc-400 mt-0.5">
                    {t('guide.subtitle')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="p-1.5 bg-zinc-900 border border-zinc-700 hover:border-red-400 hover:text-red-400 text-zinc-400 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 5 Step Walkthrough */}
            <div className="space-y-3 sm:space-y-4">
              
              <div className="p-3 bg-black/60 border border-emerald-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-white">{t('guide.step1Header')}</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    {t('guide.step1Text')}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-black/60 border border-emerald-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-white">{t('guide.step2Header')}</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    {t('guide.step2Text')}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-black/60 border border-amber-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-amber-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-amber-300">{t('guide.step3Header')}</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    {t('guide.step3Text')}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-black/60 border border-cyan-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-cyan-400 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  4
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-cyan-300">{t('guide.step4Header')}</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    {t('guide.step4Text')}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-black/60 border border-emerald-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  5
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-emerald-400">{t('guide.step5Header')}</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    {t('guide.step5Text')}
                  </p>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-emerald-500/30 flex justify-end">
              <button
                type="button"
                onClick={() => { setIsGuideOpen(false); sound.playCast(); setTab('fishing'); }}
                className="py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs border border-emerald-300 shadow-[0_3px_0_#064e3b] cursor-pointer"
              >
                {t('guide.close')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
