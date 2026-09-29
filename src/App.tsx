import React, { useState, useEffect } from 'react';
import { TabType, AnglerProfile, CaughtFish, FishItem } from './types';
import { getLevelInfo } from './utils/levelUtils';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { FishingGame } from './components/FishingGame';
import { BestiaryModal } from './components/BestiaryModal';

const DEFAULT_GUEST_PROFILE: AnglerProfile = {
  callsign: 'Guest_Angler',
  avatar: '/assets/avatar_cyber_angler.jpg',
  isRegistered: false,
  level: 1,
  exp: 0,
  coins: 0,
  inventory: [],
  bestiaryUnlocked: ['boot', 'salmon', 'goldfish', 'anglerfish', 'megalodon', 'sea_serpent', 'celestial_whale', 'arcane_jellyfish'],
  catchCounts: {},
  recordWeights: {},
  totalCatchesCount: 0
};

export const App: React.FC = () => {
  const [tab, setTab] = useState<TabType>('landing');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isBestiaryOpen, setIsBestiaryOpen] = useState(false);
  const [selectedFishDetail, setSelectedFishDetail] = useState<FishItem | null>(null);

  // Load / Save Profile from LocalStorage (Only persists if registered!)
  const [profile, setProfile] = useState<AnglerProfile>(() => {
    try {
      const saved = localStorage.getItem('rodmax_profile_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isRegistered) {
          const catchCounts = parsed.catchCounts || {};
          const recordWeights = parsed.recordWeights || {};
          let totalCatches = parsed.totalCatchesCount || 0;

          // Migrate from existing inventory if catchCounts is empty
          if (Object.keys(catchCounts).length === 0 && Array.isArray(parsed.inventory)) {
            parsed.inventory.forEach((item: CaughtFish) => {
              const id = item.fish.id;
              catchCounts[id] = (catchCounts[id] || 0) + 1;
              recordWeights[id] = Math.max(recordWeights[id] || 0, item.weight);
              totalCatches += 1;
            });
          }

          const { level } = getLevelInfo(parsed.exp || 0);

          return {
            ...DEFAULT_GUEST_PROFILE,
            avatar: parsed.avatar || '/assets/avatar_cyber_angler.jpg',
            ...parsed,
            level: level || parsed.level || 1,
            catchCounts,
            recordWeights,
            totalCatchesCount: totalCatches || Object.values(catchCounts).reduce((a: number, b: any) => a + Number(b), 0)
          };
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_GUEST_PROFILE;
  });

  useEffect(() => {
    try {
      if (profile.isRegistered) {
        localStorage.setItem('rodmax_profile_v2', JSON.stringify(profile));
      }
    } catch {
      // storage unavailable
    }
  }, [profile]);

  const updateProfile = (updates: Partial<AnglerProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const handleCatchFish = (caught: CaughtFish) => {
    // Only increment and save if user is registered!
    if (!profile.isRegistered) return;

    setProfile(prev => {
      const fishId = caught.fish.id;
      const prevCounts = prev.catchCounts || {};
      const prevWeights = prev.recordWeights || {};

      const nextCatchCounts = {
        ...prevCounts,
        [fishId]: (prevCounts[fishId] || 0) + 1
      };

      const nextRecordWeights = {
        ...prevWeights,
        [fishId]: Math.max(prevWeights[fishId] || 0, caught.weight)
      };

      const expGain = caught.expEarned || Math.round(caught.price / 4) + 25;
      const nextExp = prev.exp + expGain;
      const { level: nextLevel } = getLevelInfo(nextExp);
      const nextUnlocked = Array.from(new Set([...prev.bestiaryUnlocked, fishId]));
      // Keep up to 200 fish in live inventory
      const nextInventory = [caught, ...prev.inventory.slice(0, 199)];
      const nextTotalCatches = (prev.totalCatchesCount || 0) + 1;

      return {
        ...prev,
        exp: nextExp,
        level: nextLevel,
        bestiaryUnlocked: nextUnlocked,
        inventory: nextInventory,
        catchCounts: nextCatchCounts,
        recordWeights: nextRecordWeights,
        totalCatchesCount: nextTotalCatches
      };
    });
  };

  const handleSellFish = (fishId?: string) => {
    setProfile(prev => {
      if (fishId) {
        const toSell = prev.inventory.filter(item => item.fish.id === fishId);
        if (toSell.length === 0) return prev;
        const earned = toSell.reduce((sum, item) => sum + item.price, 0);
        const remaining = prev.inventory.filter(item => item.fish.id !== fishId);
        return {
          ...prev,
          coins: prev.coins + earned,
          inventory: remaining
        };
      } else {
        if (prev.inventory.length === 0) return prev;
        const earned = prev.inventory.reduce((sum, item) => sum + item.price, 0);
        return {
          ...prev,
          coins: prev.coins + earned,
          inventory: []
        };
      }
    });
  };

  const handleOpenFishDetail = (fish: FishItem) => {
    setSelectedFishDetail(fish);
    setIsBestiaryOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#040806] text-zinc-100 flex flex-col font-mono select-none">
      {/* Persistent Navbar */}
      <Navbar
        currentTab={tab}
        setTab={setTab}
        profile={profile}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        openBestiary={() => setIsBestiaryOpen(true)}
      />

      {/* Main Tab Router */}
      <main className="flex-1 flex flex-col">
        {tab === 'landing' && (
          <LandingPage
            setTab={setTab}
            openBestiary={() => setIsBestiaryOpen(true)}
            onSelectFish={handleOpenFishDetail}
          />
        )}

        {tab === 'auth' && (
          <AuthPage
            profile={profile}
            updateProfile={updateProfile}
            setTab={setTab}
            onSellFish={handleSellFish}
          />
        )}

        {tab === 'fishing' && (
          <FishingGame
            profile={profile}
            onCatchFish={handleCatchFish}
            openBestiary={() => setIsBestiaryOpen(true)}
            setTab={setTab}
          />
        )}
      </main>

      {/* Bestiary Modal */}
      <BestiaryModal
        isOpen={isBestiaryOpen}
        onClose={() => setIsBestiaryOpen(false)}
        profile={profile}
        initialSelected={selectedFishDetail}
      />
    </div>
  );
};

export default App;
