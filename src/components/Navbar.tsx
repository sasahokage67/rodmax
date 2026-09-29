import React from 'react';
import { TabType, AnglerProfile } from '../types';
import { sound } from '../audio';
import { Volume2, VolumeX, BookOpen, User, Play, Home, UserPlus } from 'lucide-react';

interface NavbarProps {
  currentTab: TabType;
  setTab: (tab: TabType) => void;
  profile: AnglerProfile;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  openBestiary: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setTab,
  profile,
  soundEnabled,
  setSoundEnabled,
  openBestiary
}) => {
  return (
    <header className="sticky top-0 z-50 w-full px-4 py-3 bg-[#050e09]/95 backdrop-blur-md border-b-2 border-emerald-500/80 shadow-lg shadow-emerald-950/30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo with Custom SVG Hook */}
        <div 
          onClick={() => setTab('landing')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-sm bg-gradient-to-br from-emerald-500/20 to-emerald-950/80 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 group-hover:scale-105 group-hover:border-emerald-300 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <svg 
              className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="square" 
              strokeLinejoin="miter"
            >
              <circle cx="16" cy="4" r="2.5" strokeWidth="2" />
              <path d="M16 6.5V14a5 5 0 0 1-5 5 5 5 0 0 1-5-5v-3.5" />
              <polyline points="4 12.5 6 10.5 8 12.5" />
            </svg>
          </div>
          <div>
            <div className="font-arcade text-lg tracking-wider text-emerald-400 group-hover:text-emerald-300 transition-colors">
              RODMAX
            </div>
            <div className="font-arcade text-[8px] text-emerald-600 tracking-widest hidden sm:block">
              ГЛУБОКОВОДНЫЙ АРКАДНЫЙ СИМУЛЯТОР
            </div>
          </div>
        </div>

        {/* 3 Dedicated Tabs */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          {/* Tab 1: Landing */}
          <button
            onClick={() => { sound.playReelClick(); setTab('landing'); }}
            className={`px-3 py-1.5 text-xs font-arcade tracking-wider transition-all flex items-center gap-2 border ${
              currentTab === 'landing'
                ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-zinc-900/80 text-zinc-300 border-zinc-700 hover:border-emerald-500/60 hover:text-emerald-300'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ГЛАВНАЯ</span>
          </button>

          {/* Tab 2: Registration / Account */}
          <button
            onClick={() => { sound.playReelClick(); setTab('auth'); }}
            className={`px-3 py-1.5 text-xs font-arcade tracking-wider transition-all flex items-center gap-2 border ${
              currentTab === 'auth'
                ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : profile.isRegistered
                  ? 'bg-zinc-900/80 text-zinc-300 border-zinc-700 hover:border-emerald-500/60 hover:text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/60 hover:bg-amber-500/30'
            }`}
          >
            {profile.isRegistered && profile.avatar ? (
              <img src={profile.avatar} alt="Avatar" className="w-3.5 h-3.5 object-cover border border-emerald-400" />
            ) : profile.isRegistered ? (
              <User className="w-3.5 h-3.5" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {profile.isRegistered ? 'ПРОФИЛЬ' : 'РЕГИСТРАЦИЯ'}
            </span>
          </button>

          {/* Tab 3: Fishing Game */}
          <button
            onClick={() => { sound.playCast(); setTab('fishing'); }}
            className={`px-4 py-1.5 text-xs font-arcade tracking-wider transition-all flex items-center gap-2 border ${
              currentTab === 'fishing'
                ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.5)] animate-pulse'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500 hover:bg-emerald-500 hover:text-black'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>РЫБАЛКА</span>
          </button>
        </nav>

        {/* Right Info Dock: Coins ONLY IF REGISTERED, Sound, Bestiary */}
        <div className="flex items-center gap-3">
          
          {profile.isRegistered ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-black/60 border border-amber-500/40 text-amber-400 font-arcade text-[10px]">
              <span>💰</span>
              <span>{profile.coins.toLocaleString()} C</span>
            </div>
          ) : (
            <button
              onClick={() => { sound.playReelClick(); setTab('auth'); }}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-700 hover:border-amber-400 text-zinc-400 hover:text-amber-300 font-arcade text-[9px] transition-colors"
              title="Создайте аккаунт, чтобы копить монеты и сохранять улов"
            >
              <span>[ ГОСТЬ: БЕЗ БАЛАНСА ]</span>
            </button>
          )}

          <button
            onClick={() => { sound.playReelClick(); openBestiary(); }}
            className="p-1.5 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-emerald-400 hover:text-emerald-400 text-xs font-arcade flex items-center gap-1.5"
            title="Бестиарий рыб"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden lg:inline text-[9px]">БЕСТИАРИЙ</span>
          </button>

          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sound.enabled = next;
              if (next) sound.playCoin();
            }}
            className="p-1.5 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-emerald-400 hover:border-emerald-400"
            title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>
        </div>

      </div>
    </header>
  );
};
