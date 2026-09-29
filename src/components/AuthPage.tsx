import React, { useState, useMemo } from 'react';
import { AnglerProfile, TabType, CaughtFish } from '../types';
import { FISH_DATABASE } from '../data/fishDatabase';
import { getLevelInfo } from '../utils/levelUtils';
import { sound } from '../audio';
import { registerUser, loginUser } from '../utils/authUtils';
import { useLanguage } from '../i18n/LanguageContext';
import { getFishName, getRarityName, getAvatarName, getAvatarRole } from '../i18n/translations';
import { 
  Shield, 
  CheckCircle2, 
  UserCheck, 
  Play, 
  Sparkles, 
  AlertCircle, 
  Info, 
  Coins, 
  Scale, 
  Fish, 
  LogOut, 
  DollarSign, 
  Trophy,
  Filter,
  Edit3,
  Camera,
  Check,
  X,
  LogIn,
  KeyRound,
  UserPlus
} from 'lucide-react';

const AVAILABLE_AVATARS = [
  {
    id: 'cyber_angler',
    name: 'Кибер-Водолаз',
    role: 'ЛЕГЕНДАРНЫЙ ГЛУБИННИК',
    src: '/assets/avatar_cyber_angler.jpg',
    rarity: 'ARCANE',
    color: '#34d399'
  },
  {
    id: 'neon_predator',
    name: 'Био-Хищник Неона',
    role: 'КИБЕР-МУТАНТ',
    src: '/assets/avatar_neon_predator.jpg',
    rarity: 'ARCANE',
    color: '#22d3ee'
  },
  {
    id: 'arcane_jellyfish',
    name: 'Неоновая Медуза',
    role: 'ВЫСШИЙ АРКЕЙН',
    src: '/assets/card_arcane_jellyfish.jpg',
    rarity: 'ARCANE',
    color: '#a855f7'
  },
  {
    id: 'celestial_whale',
    name: 'Небесный Кит',
    role: 'БОЖЕСТВЕННЫЙ ТИР',
    src: '/assets/card_celestial_whale.jpg',
    rarity: 'GODLY',
    color: '#38bdf8'
  },
  {
    id: 'sea_serpent',
    name: 'Морской Змей',
    role: 'СЕКРЕТ БЕЗДНЫ',
    src: '/assets/card_sea_serpent.jpg',
    rarity: 'SECRET',
    color: '#f43f5e'
  },
  {
    id: 'megalodon',
    name: 'Древний Мегалодон',
    role: 'МИФИЧЕСКИЙ СВЕРХХИЩНИК',
    src: '/assets/card_megalodon.jpg',
    rarity: 'MYTHIC',
    color: '#f43f5e'
  },
  {
    id: 'anglerfish',
    name: 'Глубоководный Удильщик',
    role: 'ЭПИЧЕСКИЙ ОХОТНИК ТЕМНОТЫ',
    src: '/assets/card_anglerfish.jpg',
    rarity: 'EPIC',
    color: '#a855f7'
  },
  {
    id: 'goldfish',
    name: 'Золотая Рыбка',
    role: 'РЕДКИЙ ТРОФЕЙ',
    src: '/assets/card_goldfish.jpg',
    rarity: 'RARE',
    color: '#fbbf24'
  },
  {
    id: 'salmon',
    name: 'Глубинный Лосось',
    role: 'НЕОБЫЧНЫЙ ЛОВЕЦ',
    src: '/assets/card_salmon.jpg',
    rarity: 'UNCOMMON',
    color: '#10b981'
  },
  {
    id: 'boot',
    name: 'Легендарный Сапог',
    role: 'КЛАССИКА РЫБАЛКИ',
    src: '/assets/card_boot.jpg',
    rarity: 'COMMON',
    color: '#9ca3af'
  }
];

interface AuthPageProps {
  profile: AnglerProfile;
  updateProfile: (p: Partial<AnglerProfile>) => void;
  setFullProfile?: (p: AnglerProfile) => void;
  setTab: (tab: TabType) => void;
  onSellFish?: (fishId?: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ 
  profile, 
  updateProfile, 
  setFullProfile,
  setTab,
  onSellFish 
}) => {
  const { t, language } = useLanguage();
  // Avatar modal state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  // Auth mode: 'REGISTER' | 'LOGIN'
  const [authMode, setAuthMode] = useState<'REGISTER' | 'LOGIN'>('REGISTER');
  const [callsign, setCallsign] = useState(profile.isRegistered ? profile.callsign : '');
  const [password, setPassword] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // Inventory filter state
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'IN_BASKET' | 'ALL_CAUGHT' | 'FULL_BESTIARY'>('IN_BASKET');

  // Callsign validation
  const handleCallsignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const validPattern = /^[a-zA-Z0-9._]*$/;

    if (!validPattern.test(val)) {
      setInputError(t('auth.errEngOnly'));
      return;
    }

    setInputError(null);
    setCallsign(val);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsign.trim()) {
      setInputError(t('auth.errCallsignEmpty'));
      return;
    }
    if (callsign.length < 3) {
      setInputError(t('auth.errCallsignShort'));
      return;
    }
    if (password.length < 8) {
      setInputError(t('auth.errPassShort', { count: password.length }));
      return;
    }

    if (authMode === 'REGISTER') {
      const res = registerUser(callsign, password, profile);
      if (!res.success) {
        setInputError(res.error || t('auth.errRegister'));
        return;
      }
      sound.playCoin();
      if (setFullProfile && res.profile) {
        setFullProfile(res.profile);
      } else if (res.profile) {
        updateProfile(res.profile);
      }
    } else {
      const res = loginUser(callsign, password);
      if (!res.success) {
        setInputError(res.error || t('auth.errLogin'));
        return;
      }
      sound.playCoin();
      if (setFullProfile && res.profile) {
        setFullProfile(res.profile);
      } else if (res.profile) {
        updateProfile(res.profile);
      }
    }
  };

  const handleGuestPlay = () => {
    sound.playCast();
    updateProfile({
      callsign: `Guest_${Math.floor(100 + Math.random() * 900)}`,
      isRegistered: false
    });
    setTab('fishing');
  };

  const handleLogout = () => {
    sound.playReelClick();
    updateProfile({
      isRegistered: false,
      callsign: 'Guest_Angler',
      coins: 0,
      inventory: [],
      catchCounts: {},
      recordWeights: {},
      totalCatchesCount: 0
    });
  };

  // Compile full catalog stats: catches lifetime, record weights, and items in basket
  const allFishStats = useMemo(() => {
    return FISH_DATABASE.map((fish) => {
      // Items currently in sadok
      const itemsInBasket = profile.inventory.filter((item) => item.fish.id === fish.id);
      const basketCount = itemsInBasket.length;
      const basketValue = itemsInBasket.reduce((sum, item) => sum + item.price, 0);

      // Lifetime stats from profile.catchCounts / recordWeights
      const countFromMap = profile.catchCounts?.[fish.id] || 0;
      const lifetimeCount = Math.max(countFromMap, basketCount);
      const recordWeight = profile.recordWeights?.[fish.id] || (itemsInBasket.length > 0 ? Math.max(...itemsInBasket.map(i => i.weight)) : 0);
      const hasCaughtEver = lifetimeCount > 0 || basketCount > 0;

      return {
        fish,
        basketCount,
        basketValue,
        lifetimeCount,
        recordWeight,
        hasCaughtEver
      };
    });
  }, [profile.inventory, profile.catchCounts, profile.recordWeights]);

  // Total lifetime catches count
  const totalLifetimeCatches = useMemo(() => {
    if (profile.totalCatchesCount) return profile.totalCatchesCount;
    return allFishStats.reduce((sum, item) => sum + item.lifetimeCount, 0);
  }, [profile.totalCatchesCount, allFishStats]);

  // Unique species caught
  const caughtSpeciesCount = useMemo(() => {
    return allFishStats.filter(item => item.hasCaughtEver).length;
  }, [allFishStats]);

  // Total weight and inventory value in basket
  const totalWeight = useMemo(() => {
    return profile.inventory.reduce((sum, item) => sum + item.weight, 0).toFixed(1);
  }, [profile.inventory]);

  const totalInventoryValue = useMemo(() => {
    return profile.inventory.reduce((sum, item) => sum + item.price, 0);
  }, [profile.inventory]);

  // Active inventory items (in sadok)
  const displayedInventory = useMemo(() => {
    let list = profile.inventory;
    if (selectedRarity !== 'ALL') {
      list = list.filter(item => item.fish.rarity === selectedRarity);
    }
    return list;
  }, [profile.inventory, selectedRarity]);

  // Shiny catches currently in basket
  const shinyCountInBasket = useMemo(() => {
    return profile.inventory.filter(item => item.isShiny).length;
  }, [profile.inventory]);

  // Filter items by view mode and rarity for Bestiary
  const displayedFish = useMemo(() => {
    let list = allFishStats;
    if (viewMode === 'ALL_CAUGHT') {
      list = list.filter(item => item.hasCaughtEver);
    }

    if (selectedRarity !== 'ALL') {
      list = list.filter(item => item.fish.rarity === selectedRarity);
    }
    return list;
  }, [allFishStats, viewMode, selectedRarity]);

  // Level info and avatar
  const levelInfo = useMemo(() => getLevelInfo(profile.exp || 0), [profile.exp]);
  const currentAvatar = profile.avatar || '/assets/avatar_cyber_angler.jpg';

  // Rank determination
  const rankTitle = useMemo(() => {
    const lvl = levelInfo.level;
    if (lvl >= 20) return t('auth.rankAbyss');
    if (lvl >= 10) return t('auth.rankOcean');
    if (lvl >= 5) return t('auth.rankVeteran');
    return t('auth.rankNovice');
  }, [levelInfo.level, t]);

  // -------------------------------------------------------------
  // VIEW 1: REGISTRATION FORM (When NOT Registered)
  // -------------------------------------------------------------
  if (!profile.isRegistered) {
    return (
      <div className="min-h-[calc(100vh-65px)] relative flex items-center justify-center p-4 sm:p-8 bg-[#060a08]">
        
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none"
          style={{ backgroundImage: `url('/assets/bg_underwater.jpg')` }}
        />
        <div className="absolute inset-0 scanlines" />

        <div className="relative z-10 w-full max-w-xl bg-[#09150f]/95 border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] p-6 sm:p-8 pixel-corners">
          
          {/* Auth Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => { sound.playReelClick(); setAuthMode('REGISTER'); setInputError(null); }}
              className={`py-3 px-3 font-arcade text-xs tracking-wider border-2 transition-all flex items-center justify-center gap-2 ${
                authMode === 'REGISTER'
                  ? 'bg-emerald-500 text-black border-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('auth.tabCreate')}</span>
            </button>

            <button
              type="button"
              onClick={() => { sound.playReelClick(); setAuthMode('LOGIN'); setInputError(null); }}
              className={`py-3 px-3 font-arcade text-xs tracking-wider border-2 transition-all flex items-center justify-center gap-2 ${
                authMode === 'LOGIN'
                  ? 'bg-emerald-500 text-black border-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('auth.tabLogin')}</span>
            </button>
          </div>

          <div className="flex items-center justify-between border-b-2 border-emerald-500/40 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-400 animate-pulse" />
              <div>
                <h1 className="font-arcade text-emerald-400 text-sm sm:text-base tracking-wider">
                  {authMode === 'REGISTER' ? t('auth.titleRegister') : t('auth.titleLogin')}
                </h1>
                <p className="font-arcade text-[8px] text-emerald-600 mt-1">
                  {authMode === 'REGISTER' 
                    ? t('auth.subtitleRegister') 
                    : t('auth.subtitleLogin')}
                </p>
              </div>
            </div>
            <div className="px-2.5 py-1 bg-amber-950 border border-amber-500/60 font-arcade text-[9px] text-amber-300">
              {t('auth.guestBadge')}
            </div>
          </div>

          <div className="mb-6 p-3.5 bg-amber-950/40 border border-amber-500/60 flex items-start gap-3 text-amber-300 font-mono text-xs">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-arcade text-[9px] text-amber-400 block mb-1">
                {authMode === 'REGISTER' ? t('auth.benefitsTitle') : t('auth.accessTitle')}
              </strong>
              {authMode === 'REGISTER' 
                ? t('auth.benefitsDesc') 
                : t('auth.accessDesc')}
            </div>
          </div>

          {inputError && (
            <div className="mb-5 p-3 bg-red-950/80 border border-red-500 flex items-center gap-2 font-arcade text-[9px] text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{inputError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-arcade text-[10px] text-emerald-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {t('auth.callsignLabel')}
                </label>
                <span className="font-mono text-[10px] text-zinc-400">{t('auth.callsignHint')}</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={callsign}
                  maxLength={18}
                  onChange={handleCallsignChange}
                  placeholder="Neptune_Strike_99"
                  className="w-full bg-[#040906] border-2 border-emerald-500/60 focus:border-emerald-400 focus:outline-none px-4 py-2.5 font-arcade text-xs text-emerald-100 placeholder:text-zinc-600 tracking-wider shadow-inner"
                />
                <div className="absolute right-3 top-2.5 font-arcade text-[9px] text-emerald-600">
                  [EN ONLY]
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-arcade text-[10px] text-emerald-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  {t('auth.passwordLabel')}
                </label>
                <span className={`font-mono text-[10px] ${password.length >= 8 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {password.length >= 8 ? t('auth.passMinSuccess') : t('auth.passMinReq', { count: password.length })}
                </span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  placeholder={t('auth.passPlaceholder')}
                  className="w-full bg-[#040906] border-2 border-emerald-500/60 focus:border-emerald-400 focus:outline-none px-4 py-2.5 font-mono text-xs text-emerald-100 placeholder:text-zinc-600 shadow-inner"
                />
                <div className="absolute right-3 top-2.5 font-mono text-[10px] text-zinc-500">
                  {t('auth.passBadge')}
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="flex-1 py-3.5 px-6 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-arcade text-xs tracking-wider border-2 border-emerald-300 shadow-[0_4px_0_#064e3b] transition-all flex items-center justify-center gap-2"
              >
                {authMode === 'REGISTER' ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t('auth.submitRegister')}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{t('auth.submitLogin')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleGuestPlay}
                className="py-3 px-5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 hover:text-white font-arcade text-[9px] tracking-wider border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('auth.playGuest')}</span>
              </button>
            </div>

            {/* Quick toggle link */}
            <div className="pt-2 text-center border-t border-emerald-500/20">
              {authMode === 'REGISTER' ? (
                <div className="font-mono text-xs text-zinc-400">
                  {t('auth.haveAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playReelClick();
                      setAuthMode('LOGIN');
                      setInputError(null);
                    }}
                    className="text-emerald-400 hover:text-emerald-300 underline font-arcade text-[10px] ml-1"
                  >
                    {t('auth.loginLink')}
                  </button>
                </div>
              ) : (
                <div className="font-mono text-xs text-zinc-400">
                  {t('auth.newHere')}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playReelClick();
                      setAuthMode('REGISTER');
                      setInputError(null);
                    }}
                    className="text-emerald-400 hover:text-emerald-300 underline font-arcade text-[10px] ml-1"
                  >
                    {t('auth.registerLink')}
                  </button>
                </div>
              )}
            </div>
          </form>

        </div>

      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: PERSONAL CABINET & INVENTORY (When Registered)
  // -------------------------------------------------------------
  return (
    <div className="min-h-[calc(100vh-65px)] relative bg-[#040806] text-zinc-100 p-4 sm:p-8">
      
      {/* Background with ambient underwater image */}
      <div 
        className="fixed inset-0 bg-cover bg-center opacity-20 pointer-events-none"
        style={{ backgroundImage: `url('/assets/bg_underwater.jpg')` }}
      />
      <div className="fixed inset-0 scanlines pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        {/* Personal Cabinet Header Card */}
        <div className="p-6 sm:p-8 bg-[#08150f]/95 border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] pixel-corners">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-emerald-500/30">
            
            {/* Angler Identity & Avatar with Edit button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full md:w-auto">
              <div 
                onClick={() => setIsAvatarModalOpen(true)}
                className="relative group cursor-pointer flex-shrink-0"
                title={t('auth.changeAvatarTip')}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black border-2 border-emerald-400 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.35)] relative pixel-corners">
                  <img
                    src={currentAvatar}
                    alt={profile.callsign}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-[8px] font-arcade text-emerald-300 text-center p-1">
                    <Camera className="w-4 h-4 mb-0.5 text-emerald-400" />
                    <span>{t('auth.changeAvatar')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsAvatarModalOpen(true); }}
                  className="absolute -bottom-1.5 -right-1.5 p-1 bg-zinc-900 border border-emerald-400 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors shadow-md"
                  title={t('auth.chooseAvatar')}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>

              {/* Angler Nickname, Level & EXP Progress Bar */}
              <div className="flex-1 min-w-[260px] max-w-xl space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-arcade text-lg sm:text-2xl text-white tracking-wider">
                    {profile.callsign}
                  </h1>
                  <span className="px-2 py-0.5 bg-emerald-500 text-black font-arcade text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                    {t('auth.levelBadge', { lvl: levelInfo.level })}
                  </span>
                  <div className="font-arcade text-[10px] text-amber-400 tracking-widest flex items-center gap-1.5 ml-auto sm:ml-0">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{rankTitle}</span>
                  </div>
                </div>

                {/* EXP Progress Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center font-arcade text-[8px] text-zinc-400">
                    <span className="text-cyan-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      {t('auth.expProgress')}
                    </span>
                    <span className="text-emerald-300 font-mono text-[10px]">
                      {levelInfo.expIntoCurrentLevel} / {levelInfo.expRequiredForNext} EXP ({levelInfo.progressPercent}%)
                    </span>
                  </div>

                  {/* Visual 16-bit Pixel Progress Bar */}
                  <div className="w-full h-3 bg-black border border-emerald-500/60 p-0.5 relative overflow-hidden pixel-corners">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                      style={{ width: `${levelInfo.progressPercent}%` }}
                    />
                    {/* Retro segmented notch overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_90%,rgba(0,0,0,0.85)_100%)] bg-[length:14px_100%] pointer-events-none opacity-40" />
                  </div>

                  <div className="flex justify-between items-center text-[7px] font-arcade text-zinc-500">
                    <span>{t('auth.lvlShort', { lvl: levelInfo.level })}</span>
                    <span className="text-cyan-400">
                      {t('auth.toNextLevel', { exp: levelInfo.expRequiredForNext - levelInfo.expIntoCurrentLevel })}
                    </span>
                    <span>{t('auth.lvlShort', { lvl: levelInfo.level + 1 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions: Play Fishing / Logout */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => { sound.playCast(); setTab('fishing'); }}
                className="flex-1 md:flex-initial py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs border border-emerald-300 flex items-center justify-center gap-2 shadow-[0_3px_0_#064e3b]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('auth.btnFishing')}</span>
              </button>

              <button
                onClick={handleLogout}
                className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 font-arcade text-[10px] border border-zinc-700 flex items-center gap-1.5 transition-colors"
                title={t('auth.switchProfile')}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('auth.btnLogout')}</span>
              </button>
            </div>

          </div>

          {/* 4 Summary Metric Tiles (Bento) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
            
            {/* Metric 1: Coins Balance */}
            <div className="p-4 bg-black/60 border border-emerald-500/40 space-y-1">
              <div className="flex items-center gap-1.5 font-arcade text-[9px] text-zinc-400">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('auth.metricCoins')}</span>
              </div>
              <div className="font-arcade text-lg sm:text-xl text-amber-400">
                {profile.coins.toLocaleString()} C
              </div>
            </div>

            {/* Metric 2: Total Lifetime Catches */}
            <div className="p-4 bg-black/60 border border-emerald-500/40 space-y-1">
              <div className="flex items-center gap-1.5 font-arcade text-[9px] text-zinc-400">
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('auth.metricCatches')}</span>
              </div>
              <div className="font-arcade text-lg sm:text-xl text-emerald-300">
                {totalLifetimeCatches} {t('auth.unitsPcs')}
              </div>
            </div>

            {/* Metric 3: Live in Basket */}
            <div className="p-4 bg-black/60 border border-emerald-500/40 space-y-1">
              <div className="flex items-center gap-1.5 font-arcade text-[9px] text-zinc-400">
                <Fish className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('auth.metricBasket')}</span>
              </div>
              <div className="font-arcade text-lg sm:text-xl text-cyan-300">
                {profile.inventory.length} {t('auth.unitsPcs')} <span className="text-xs text-zinc-500">({totalWeight} {t('auth.unitsKg')})</span>
              </div>
            </div>

            {/* Metric 4: Value of Live Fish */}
            <div className="p-4 bg-black/60 border border-emerald-500/40 space-y-1">
              <div className="flex items-center gap-1.5 font-arcade text-[9px] text-zinc-400">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('auth.metricBasketVal')}</span>
              </div>
              <div className="font-arcade text-lg sm:text-xl text-emerald-400">
                {totalInventoryValue.toLocaleString()} C
              </div>
            </div>

          </div>

        </div>


        {/* INVENTORY / FISH BASKET & TROPHY SECTION */}
        <section className="space-y-6">
          
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-500/30">
            <div>
              <h2 className="font-arcade text-lg sm:text-xl text-emerald-400 tracking-wider flex items-center gap-2">
                <span>{t('auth.invTitle')}</span>
                <span className="text-xs text-zinc-400 font-mono">
                  {t('auth.invSpeciesCount', { caught: caughtSpeciesCount, total: FISH_DATABASE.length })}
                </span>
              </h2>
              <p className="font-arcade text-[9px] text-zinc-400 mt-1">
                {t('auth.invSub')}
              </p>
            </div>

            {/* Sell All Button */}
            {profile.inventory.length > 0 && onSellFish && (
              <button
                onClick={() => { sound.playCoin(); onSellFish(); }}
                className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-black font-arcade text-xs border border-amber-300 flex items-center gap-2 shadow-[0_3px_0_#78350f] transition-all self-start md:self-auto"
              >
                <Coins className="w-4 h-4" />
                <span>{t('auth.sellAllBasket', { val: totalInventoryValue.toLocaleString() })}</span>
              </button>
            )}
          </div>

          {/* View Mode & Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#06120b] p-3 border border-emerald-500/30 pixel-corners">
            
            {/* View Mode Switcher */}
            <div className="flex flex-wrap items-center gap-2 font-arcade text-[9px]">
              <span className="text-zinc-500 mr-1">{t('auth.modeLabel')}</span>
              <button
                onClick={() => { sound.playReelClick(); setViewMode('IN_BASKET'); }}
                className={`px-3 py-1.5 border transition-all flex items-center gap-1.5 ${
                  viewMode === 'IN_BASKET'
                    ? 'bg-emerald-500 text-black border-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                <span>{t('auth.modeInBasket', { count: profile.inventory.length })}</span>
                {shinyCountInBasket > 0 && (
                  <span className="px-1 py-0.2 bg-amber-400 text-black text-[7px] font-bold">
                    ✨{shinyCountInBasket} SHINY
                  </span>
                )}
              </button>

              <button
                onClick={() => { sound.playReelClick(); setViewMode('ALL_CAUGHT'); }}
                className={`px-3 py-1.5 border transition-all ${
                  viewMode === 'ALL_CAUGHT'
                    ? 'bg-emerald-500 text-black border-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                {t('auth.modeBestiary', { count: caughtSpeciesCount })}
              </button>

              <button
                onClick={() => { sound.playReelClick(); setViewMode('FULL_BESTIARY'); }}
                className={`px-3 py-1.5 border transition-all ${
                  viewMode === 'FULL_BESTIARY'
                    ? 'bg-emerald-500 text-black border-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                {t('auth.modeFull', { count: FISH_DATABASE.length })}
              </button>
            </div>

            {/* Rarity Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 font-arcade text-[8px]">
              {['ALL', 'ARCANE', 'GODLY', 'SECRET', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'].map((r) => (
                <button
                  key={r}
                  onClick={() => { sound.playReelClick(); setSelectedRarity(r); }}
                  className={`px-2 py-1 border transition-all ${
                    selectedRarity === r
                      ? 'bg-cyan-500 text-black border-cyan-300 font-bold'
                      : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  {r === 'ALL' ? t('auth.filterAll') : getRarityName(r as any, language)}
                </button>
              ))}
            </div>

          </div>

          {/* VIEW MODE 1: ACTIVE FISHING BASKET (IN_BASKET) */}
          {viewMode === 'IN_BASKET' ? (
            displayedInventory.length === 0 ? (
              <div className="p-12 text-center bg-[#07130e]/80 border-2 border-dashed border-emerald-500/40 pixel-corners space-y-4">
                <div className="text-4xl">🐟</div>
                <h3 className="font-arcade text-sm text-emerald-300">
                  {selectedRarity !== 'ALL' ? t('auth.emptyBasketRarity') : t('auth.emptyBasket')}
                </h3>
                <p className="font-mono text-xs text-zinc-400 max-w-md mx-auto">
                  {selectedRarity !== 'ALL'
                    ? t('auth.emptyBasketRarityDesc')
                    : t('auth.emptyBasketDesc')}
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => { sound.playReelClick(); setViewMode('ALL_CAUGHT'); }}
                    className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-arcade text-xs border border-zinc-600"
                  >
                    {t('auth.openBestiary')}
                  </button>
                  <button
                    onClick={() => { sound.playCast(); setTab('fishing'); }}
                    className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs border border-emerald-300 shadow-[0_3px_0_#064e3b] inline-flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t('auth.btnFishing')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayedInventory.map((item, index) => {
                  const isShiny = !!item.isShiny;
                  const fishDisplayName = getFishName(item.fish, language);
                  return (
                    <div
                      key={item.id || `${item.fish.id}_${item.weight}_${index}`}
                      className={`bg-[#07130e] border-2 p-3 pixel-corners space-y-3 shadow-md transition-all relative ${
                        isShiny
                          ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)] ring-1 ring-amber-400/40 bg-gradient-to-b from-amber-950/20 via-[#07130e] to-[#07130e]'
                          : 'border-emerald-500/60 hover:border-emerald-400'
                      }`}
                    >
                      {/* Card Image with Badges */}
                      <div className="relative aspect-[4/3] bg-black overflow-hidden border border-zinc-800">
                        <img
                          src={item.fish.cardImage}
                          alt={fishDisplayName}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />

                        {/* Shiny Mutation Badge */}
                        {isShiny && (
                          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-amber-950/95 border border-amber-300 font-arcade text-[8px] text-amber-300 flex items-center gap-1 shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-pulse">
                            <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                            <span>SHINY [2X]</span>
                          </div>
                        )}

                        {/* Weight Badge */}
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/90 border border-emerald-400 font-arcade text-[10px] text-emerald-300 shadow-md">
                          {item.weight} {language === 'ru' ? 'КГ' : 'KG'}
                        </div>
                      </div>

                      {/* Fish Info */}
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-arcade text-xs text-white truncate">{fishDisplayName}</h4>
                          {isShiny && (
                            <span className="text-[8px] font-arcade text-amber-400 flex-shrink-0 animate-pulse">
                              ✨ SHINY
                            </span>
                          )}
                        </div>
                        
                        <div className="font-mono text-[11px] text-zinc-400 space-y-1 mt-1.5">
                          <div className="flex justify-between">
                            <span>{t('auth.weightLabel')}</span>
                            <span className="text-emerald-400 font-bold">{item.weight} {t('auth.unitsKg')}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span>{t('auth.sellPriceLabel')}</span>
                            <span className={`font-bold flex items-center gap-1 ${isShiny ? 'text-amber-400 font-arcade text-xs' : 'text-emerald-400'}`}>
                              +{item.price.toLocaleString()} C
                              {isShiny && <span className="text-[8px] text-amber-300 bg-amber-950 px-1 border border-amber-500/50">2X</span>}
                            </span>
                          </div>

                          {item.caughtAt && (
                            <div className="flex justify-between text-[9px] text-zinc-500">
                              <span>{t('auth.caughtAtLabel')}</span>
                              <span>{item.caughtAt}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Individual Sell Action */}
                      {onSellFish && (
                        <button
                          onClick={() => { sound.playCoin(); onSellFish(item.id || item.fish.id); }}
                          className={`w-full py-2 font-arcade text-[9px] border transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                            isShiny
                              ? 'bg-amber-500/20 hover:bg-amber-400 hover:text-black text-amber-300 border-amber-400'
                              : 'bg-zinc-900 hover:bg-emerald-500 hover:text-black text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>{t('auth.sellBtn', { val: item.price.toLocaleString() })}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* VIEW MODE 2: BESTIARY & CATALOG (ALL_CAUGHT or FULL_BESTIARY) */
            displayedFish.length === 0 ? (
              <div className="p-12 text-center bg-[#07130e]/80 border-2 border-dashed border-emerald-500/40 pixel-corners space-y-4">
                <div className="text-4xl">🐟</div>
                <h3 className="font-arcade text-sm text-emerald-300">
                  {t('auth.emptyCategory')}
                </h3>
                <p className="font-mono text-xs text-zinc-400 max-w-md mx-auto">
                  {t('auth.emptyCategoryDesc')}
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => { sound.playCast(); setTab('fishing'); }}
                    className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs border border-emerald-300 shadow-[0_3px_0_#064e3b] inline-flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t('auth.btnFishing')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayedFish.map(({ fish, basketCount, basketValue, lifetimeCount, recordWeight, hasCaughtEver }) => {
                  const fishDisplayName = getFishName(fish, language);
                  return (
                    <div
                      key={fish.id}
                      className={`bg-[#07130e] border-2 p-3 pixel-corners space-y-3 shadow-md transition-all ${
                        hasCaughtEver 
                          ? 'border-emerald-500/60 hover:border-emerald-400' 
                          : 'border-zinc-800 opacity-60'
                      }`}
                    >
                      {/* Card Image with Count Badge */}
                      <div className="relative aspect-[4/3] bg-black overflow-hidden border border-zinc-800">
                        <img
                          src={fish.cardImage}
                          alt={fishDisplayName}
                          className={`w-full h-full object-cover transition-transform duration-300 hover:scale-105 ${
                            !hasCaughtEver ? 'grayscale brightness-50' : ''
                          }`}
                        />

                        {/* How many times caught badge (xCount) */}
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/90 border border-emerald-400 font-arcade text-[10px] text-emerald-300 shadow-md">
                          {hasCaughtEver ? t('auth.caughtLifetime', { count: lifetimeCount }) : t('auth.notCaughtBadge')}
                        </div>
                      </div>

                      {/* Fish Info */}
                      <div>
                        <h4 className="font-arcade text-xs text-white truncate">{fishDisplayName}</h4>
                        <div className="font-mono text-[11px] text-zinc-400 space-y-1 mt-1.5">
                          <div className="flex justify-between">
                            <span>{t('auth.recordWeight')}</span>
                            <span className="text-emerald-400 font-bold">
                              {recordWeight > 0 ? `${recordWeight} ${t('auth.unitsKg')}` : '—'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span>{t('auth.inBasketNow')}</span>
                            <span className={basketCount > 0 ? 'text-amber-400 font-bold' : 'text-zinc-600'}>
                              {basketCount > 0 ? `${basketCount} ${t('auth.unitsPcs')} (${basketValue.toLocaleString()} C)` : `0 ${t('auth.unitsPcs')}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sell or Status Action */}
                      {basketCount > 0 && onSellFish ? (
                        <button
                          onClick={() => { sound.playCoin(); onSellFish(fish.id); }}
                          className="w-full py-2 bg-zinc-900 hover:bg-amber-500 hover:text-black text-amber-300 font-arcade text-[9px] border border-amber-500/40 hover:border-amber-400 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span>{t('auth.sellAllOfFish', { count: basketCount, val: basketValue.toLocaleString() })}</span>
                        </button>
                      ) : hasCaughtEver ? (
                        <div className="w-full py-1.5 bg-zinc-950/80 border border-zinc-800 text-zinc-500 font-arcade text-[8px] text-center">
                          {t('auth.statusDiscovered')}
                        </div>
                      ) : (
                        <div className="w-full py-1.5 bg-black border border-zinc-900 text-zinc-600 font-arcade text-[8px] text-center">
                          {t('auth.statusUndiscovered')}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )
          )}

        </section>

      </div>

      {/* AVATAR SELECTION MODAL */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-[#08150f] border-2 border-emerald-400 p-6 pixel-corners shadow-[0_0_40px_rgba(16,185,129,0.35)] space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-emerald-500/40 pb-3">
              <div className="flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-arcade text-sm text-emerald-300 tracking-wider">
                    {t('auth.modalAvatarTitle')}
                  </h3>
                  <p className="font-mono text-[10px] text-zinc-400 mt-0.5">
                    {t('auth.modalAvatarSub')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-1.5 bg-zinc-900 border border-zinc-700 hover:border-red-400 hover:text-red-400 text-zinc-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of Avatars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
              {AVAILABLE_AVATARS.map((avatar) => {
                const isSelected = (profile.avatar || '/assets/avatar_cyber_angler.jpg') === avatar.src;
                const avatarName = getAvatarName(avatar.id, avatar.name, language);
                const avatarRole = getAvatarRole(avatar.id, avatar.role, language);
                const avatarRarity = getRarityName(avatar.rarity as any, language);
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      sound.playCoin();
                      updateProfile({ avatar: avatar.src });
                      setIsAvatarModalOpen(false);
                    }}
                    className={`relative p-2 text-left border-2 transition-all flex flex-col gap-2 group pixel-corners ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        : 'border-zinc-800 bg-black/60 hover:border-emerald-500/70 hover:bg-[#06120b]'
                    }`}
                  >
                    {/* Square Image Box */}
                    <div className="relative aspect-square w-full overflow-hidden border border-zinc-800 bg-black">
                      <img
                        src={avatar.src}
                        alt={avatarName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 p-1 bg-emerald-500 text-black shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <div 
                        className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/90 border font-arcade text-[7px]"
                        style={{ borderColor: avatar.color, color: avatar.color }}
                      >
                        {avatarRarity}
                      </div>
                    </div>

                    {/* Avatar Label */}
                    <div>
                      <div className="font-arcade text-[9px] text-white truncate group-hover:text-emerald-300">
                        {avatarName}
                      </div>
                      <div className="font-mono text-[8px] text-zinc-400 truncate mt-0.5">
                        {avatarRole}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer notice */}
            <div className="pt-2 border-t border-emerald-500/30 flex justify-between items-center text-[9px] font-arcade text-zinc-400">
              <span className="text-emerald-400">{t('auth.modalAvatarSaved')}</span>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="py-1.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200"
              >
                {t('auth.modalClose')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
