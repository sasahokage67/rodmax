import React, { useState, useEffect, useRef } from 'react';
import { AnglerProfile, FishItem, CaughtFish, TabType } from '../types';
import { FISH_DATABASE, rollFish } from '../data/fishDatabase';
import { sound } from '../audio';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  UserPlus, 
  Radio, 
  Camera, 
  CameraOff, 
  HelpCircle, 
  X, 
  Check, 
  Hand,
  Activity, 
  MousePointer, 
  Layers, 
  Trophy 
} from 'lucide-react';

interface FishingGameProps {
  profile: AnglerProfile;
  onCatchFish: (c: CaughtFish) => void;
  openBestiary: () => void;
  setTab?: (tab: TabType) => void;
}

type GameStage = 'IDLE' | 'CASTING' | 'WAITING' | 'BITE' | 'REELING' | 'CATCH_SUCCESS' | 'LOST';

export const FishingGame: React.FC<FishingGameProps> = ({ profile, onCatchFish, openBestiary, setTab }) => {
  const [stage, setStage] = useState<GameStage>('IDLE');
  const [targetFish, setTargetFish] = useState<FishItem>(FISH_DATABASE[1]);
  const [lastCaught, setLastCaught] = useState<CaughtFish | null>(null);

  // Guide modal state
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Webcam Motion Tracking State
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraStatus, setCameraStatus] = useState<'ACTIVE' | 'CONNECTING' | 'DENIED' | 'OFF'>('CONNECTING');
  const [handMotionY, setHandMotionY] = useState(50); // 0 to 100
  const [motionIntensity, setMotionIntensity] = useState(0);

  // Minigame variables (Stardew / FISCH gravity physics)
  const [fishPos, setFishPos] = useState(50); // 0 to 100
  const [barPos, setBarPos] = useState(50);   // 0 to 100
  const [catchProgress, setCatchProgress] = useState(35); // 0 to 100
  const [tensionStatus, setTensionStatus] = useState<'БЕЗОПАСНО' | 'ОПАСНО'>('БЕЗОПАСНО');
  const [isPulling, setIsPulling] = useState(false);

  // Physics refs
  const barVelocity = useRef(0);
  const barPosRef = useRef(50);
  const fishPosRef = useRef(50);
  const isPullingRef = useRef(false);

  // Camera & Canvas refs
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);

  // Simulated depth
  const [depth, setDepth] = useState(45);

  // 1. Initialize Webcam Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (cameraEnabled) {
      setCameraStatus('CONNECTING');
      navigator.mediaDevices?.getUserMedia({ 
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' } 
      })
      .then((s) => {
        stream = s;
        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = s;
        }
        setCameraStatus('ACTIVE');
      })
      .catch(() => {
        setCameraStatus('DENIED');
      });
    } else {
      setCameraStatus('OFF');
      if (webcamVideoRef.current && webcamVideoRef.current.srcObject) {
        const currentStream = webcamVideoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach(t => t.stop());
        webcamVideoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraEnabled]);

  // 2. Optical Motion & Hand Centroid Tracking Loop
  useEffect(() => {
    if (cameraStatus !== 'ACTIVE') return;

    let prevPixels: Uint8ClampedArray | null = null;
    const interval = setInterval(() => {
      const video = webcamVideoRef.current;
      const canvas = motionCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 64;
      canvas.height = 48;
      ctx.drawImage(video, 0, 0, 64, 48);

      const frame = ctx.getImageData(0, 0, 64, 48);
      const data = frame.data;

      if (prevPixels) {
        let diffSum = 0;
        let weightedY = 0;
        let motionPoints = 0;

        for (let i = 0; i < data.length; i += 4) {
          const lumNow = (data[i] + data[i+1] + data[i+2]) / 3;
          const lumPrev = (prevPixels[i] + prevPixels[i+1] + prevPixels[i+2]) / 3;
          const diff = Math.abs(lumNow - lumPrev);

          if (diff > 25) {
            diffSum += diff;
            const y = Math.floor((i / 4) / 64);
            weightedY += y;
            motionPoints++;
          }
        }

        const avgMotion = Math.min(100, Math.floor(diffSum / 120));
        setMotionIntensity(avgMotion);

        if (motionPoints > 15) {
          // Invert so high hand = 0% (top)
          const centroidY = (weightedY / motionPoints) / 48 * 100;
          setHandMotionY(Math.round(centroidY));

          // Camera Gesture 1: Cast on sudden hand swing
          if (stage === 'IDLE' && avgMotion > 28) {
            handleCast();
          } 
          // Camera Gesture 2: Strike on quick jolt
          else if (stage === 'BITE' && avgMotion > 22) {
            handleStrike();
          } 
          // Camera Gesture 3: Reeling bar control by vertical hand height
          else if (stage === 'REELING') {
            // Hand in upper half of camera lifts bar
            if (centroidY < 48) {
              isPullingRef.current = true;
              setIsPulling(true);
            } else {
              isPullingRef.current = false;
              setIsPulling(false);
            }
          }
        }
      }

      prevPixels = new Uint8ClampedArray(data);
    }, 60);

    return () => clearInterval(interval);
  }, [cameraStatus, stage]);

  // Cast Handler
  const handleCast = () => {
    if (stage !== 'IDLE') return;
    sound.playCast();
    setStage('CASTING');
    setDepth(25 + Math.floor(Math.random() * 210));

    setTimeout(() => {
      sound.playSplash();
      setStage('WAITING');
      
      const biteDelay = 2000 + Math.random() * 2600;
      setTimeout(() => {
        sound.playBite();
        const rolled = rollFish();
        setTargetFish(rolled);
        setStage('BITE');
      }, biteDelay);
    }, 900);
  };

  // Strike Handler
  const handleStrike = () => {
    if (stage !== 'BITE') return;
    sound.playReelClick();
    barPosRef.current = 50;
    fishPosRef.current = 50;
    barVelocity.current = 0;
    setBarPos(50);
    setFishPos(50);
    setCatchProgress(40);
    setStage('REELING');
  };

  // Physics Reeling Loop: gravity + thrust (from camera gesture or mouse/key)
  useEffect(() => {
    if (stage !== 'REELING') return;

    const gravity = 0.55;
    const thrust = -0.95;
    const difficultyFactor = targetFish.catchDifficulty * 1.3;

    const loop = setInterval(() => {
      // 1. Bar Physics
      if (isPullingRef.current) {
        barVelocity.current += thrust;
        sound.playReelClick();
      } else {
        barVelocity.current += gravity;
      }

      // Apply damping / drag
      barVelocity.current *= 0.88;
      barPosRef.current += barVelocity.current;

      // Bounce off walls
      if (barPosRef.current < 8) {
        barPosRef.current = 8;
        barVelocity.current = 0;
      } else if (barPosRef.current > 92) {
        barPosRef.current = 92;
        barVelocity.current = 0;
      }
      setBarPos(barPosRef.current);

      // 2. Fish Movement Physics
      const fishJitter = (Math.random() - 0.48) * (difficultyFactor * 5.5);
      fishPosRef.current = Math.min(88, Math.max(12, fishPosRef.current + fishJitter));
      setFishPos(fishPosRef.current);

      // 3. Tension and Progress calculation
      const dist = Math.abs(barPosRef.current - fishPosRef.current);
      const inSafeZone = dist < 17; // safe threshold
      setTensionStatus(inSafeZone ? 'БЕЗОПАСНО' : 'ОПАСНО');

      setCatchProgress((prev) => {
        const delta = inSafeZone ? 1.7 : -1.9;
        const next = prev + delta;

        if (next >= 100) {
          clearInterval(loop);
          triggerCatchSuccess();
          return 100;
        }
        if (next <= 0) {
          clearInterval(loop);
          triggerLost();
          return 0;
        }
        return next;
      });

    }, 50);

    return () => clearInterval(loop);
  }, [stage, targetFish]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (stage === 'IDLE') handleCast();
        else if (stage === 'BITE') handleStrike();
        else if (stage === 'REELING') {
          setIsPulling(true);
          isPullingRef.current = true;
        }
      }
      if (stage === 'REELING') {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
          setIsPulling(true);
          isPullingRef.current = true;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        setIsPulling(false);
        isPullingRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [stage]);

  // Mouse holding handlers for tension
  const handleMouseDown = () => {
    if (stage === 'REELING') {
      setIsPulling(true);
      isPullingRef.current = true;
    }
  };

  const handleMouseUp = () => {
    if (stage === 'REELING') {
      setIsPulling(false);
      isPullingRef.current = false;
    }
  };

  // Catch Success
  const triggerCatchSuccess = () => {
    const isArcane = targetFish.rarity === 'ARCANE';
    sound.playCatch(isArcane);
    sound.playCoin();

    const weight = +(targetFish.weightMin + Math.random() * (targetFish.weightMax - targetFish.weightMin)).toFixed(1);
    const price = Math.round(targetFish.basePrice * (weight / targetFish.weightMin));

    // EXP scaled by rarity and weight
    const baseExpMap: Record<string, number> = {
      COMMON: 30,
      UNCOMMON: 65,
      RARE: 140,
      EPIC: 320,
      SECRET: 800,
      GODLY: 1600,
      ARCANE: 4000
    };
    const expEarned = Math.round(
      (baseExpMap[targetFish.rarity] || 40) * 
      (1 + ((weight - targetFish.weightMin) / (targetFish.weightMax - targetFish.weightMin || 1)) * 0.5)
    );

    const caughtRecord: CaughtFish = {
      fish: targetFish,
      weight,
      price,
      caughtAt: new Date().toLocaleTimeString(),
      expEarned
    };

    setLastCaught(caughtRecord);

    if (profile.isRegistered) {
      onCatchFish(caughtRecord);
    }

    setStage('CATCH_SUCCESS');

    confetti({
      particleCount: isArcane ? 180 : 70,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  const triggerLost = () => {
    setStage('LOST');
    setTimeout(() => {
      setStage('IDLE');
    }, 2000);
  };

  return (
    <div 
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative w-full h-[calc(100vh-65px)] bg-black overflow-hidden select-none flex flex-col justify-between"
    >
      {/* Hidden Motion Detection Canvas */}
      <canvas ref={motionCanvasRef} className="hidden" />

      {/* 1. Main Viewport Video Background */}
      <div className="absolute inset-0 z-0">
        {stage === 'CATCH_SUCCESS' && targetFish.catchVideo ? (
          <video
            key={targetFish.catchVideo}
            ref={mainVideoRef}
            src={targetFish.catchVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            ref={mainVideoRef}
            src="/assets/video_reeling_idle.mp4"
            autoPlay
            loop
            muted
            playsInline
            className={`w-full h-full object-cover transition-filter duration-300 ${
              stage === 'BITE' ? 'brightness-125 contrast-125' : ''
            }`}
          />
        )}
      </div>

      <div className="absolute inset-0 scanlines pointer-events-none z-10" />

      {/* 2. Top Game HUD */}
      <div className="relative z-20 px-4 py-2.5 bg-[#06100a]/90 border-b border-emerald-500/50 backdrop-blur-md flex flex-wrap justify-between items-center gap-3 text-xs font-arcade">
        
        {/* Left: Location & Guide Button */}
        <div className="flex items-center gap-3">
          <div className="text-emerald-400">
            ИЗУМРУДНЫЙ АТОЛЛ [ЗОНА 1]
          </div>
          <div className="hidden sm:inline text-zinc-500">|</div>
          <div className="hidden sm:inline text-cyan-300">
            ГЛУБИНА: {depth} М
          </div>

          {/* HOW TO PLAY GUIDE BUTTON */}
          <button
            onClick={() => { sound.playReelClick(); setIsGuideOpen(true); }}
            className="py-1 px-2.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-400 font-arcade text-[9px] flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(251,191,36,0.3)] animate-pulse"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>КАК ИГРАТЬ? (ГАЙД)</span>
          </button>
        </div>

        {/* Right: Camera Toggle & Angler Info */}
        <div className="flex items-center gap-3">
          
          {/* Camera Toggle Button */}
          <button
            onClick={() => {
              sound.playReelClick();
              setCameraEnabled(!cameraEnabled);
            }}
            className={`py-1 px-2.5 border font-arcade text-[9px] flex items-center gap-1.5 transition-all ${
              cameraEnabled && cameraStatus === 'ACTIVE'
                ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.5)] font-bold'
                : cameraEnabled && cameraStatus === 'CONNECTING'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 animate-pulse'
                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
            }`}
            title="Включить или отключить управление веб-камерой"
          >
            {cameraEnabled && cameraStatus === 'ACTIVE' ? (
              <Camera className="w-3.5 h-3.5" />
            ) : (
              <CameraOff className="w-3.5 h-3.5 text-zinc-500" />
            )}
            <span>
              {cameraEnabled && cameraStatus === 'ACTIVE' 
                ? 'КАМЕРА: АКТИВНА' 
                : cameraStatus === 'CONNECTING' 
                ? 'ПОДКЛЮЧЕНИЕ...' 
                : 'КАМЕРА: ВЫКЛ'}
            </span>
          </button>

          {/* Profile Money / Guest pill */}
          <div className="text-zinc-200 hidden md:block">
            {profile.isRegistered ? (
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">{profile.callsign}</span>
                <span className="text-amber-400">💰 {profile.coins.toLocaleString()} C</span>
              </div>
            ) : (
              <span className="text-amber-400">[ ГОСТЬ ]</span>
            )}
          </div>

        </div>

      </div>

      {/* 3. Center Game Stage Alerts & Minigame */}
      <div className="relative z-20 flex-1 flex items-center justify-center pointer-events-none">
        
        {/* IDLE Prompt */}
        {stage === 'IDLE' && (
          <div className="pointer-events-auto p-6 bg-[#06120b]/95 border-2 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.35)] text-center max-w-md space-y-4 pixel-corners animate-pulse">
            <div className="font-arcade text-emerald-400 text-sm tracking-wider">
              ГОТОВНОСТЬ К ЗАБРОСУ
            </div>
            
            <p className="font-mono text-xs text-zinc-300 leading-relaxed">
              {cameraStatus === 'ACTIVE' ? (
                <>Взмахни рукой вверх перед камерой или нажми кнопку ниже, чтобы забросить снасти в глубоководный океан.</>
              ) : (
                <>Нажми [ПРОБЕЛ] или кнопку ниже, чтобы забросить снасти в глубоководный океан.</>
              )}
            </p>

            <button
              onClick={handleCast}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs tracking-wider border-2 border-emerald-300 shadow-[0_3px_0_#064e3b] transition-all"
            >
              [ ЗАБРОСИТЬ УДОЧКУ ]
            </button>
            
            <div className="text-[9px] font-arcade text-zinc-500">
              {cameraStatus === 'ACTIVE' ? '✓ ТРЕКИНГ РУК АКТИВЕН' : '✓ РЕЖИМ МЫШИ И КЛАВИАТУРЫ'}
            </div>
          </div>
        )}

        {/* CASTING Animation phase */}
        {stage === 'CASTING' && (
          <div className="p-4 bg-black/85 border-2 border-emerald-400 font-arcade text-sm text-emerald-300 animate-pulse pixel-corners shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            ЗАБРОС ЛЕСКИ В ОКЕАН...
          </div>
        )}

        {/* WAITING for Bite */}
        {stage === 'WAITING' && (
          <div className="flex flex-col items-center gap-3 p-5 bg-[#05110a]/90 border border-emerald-500/60 pixel-corners animate-pulse">
            <div className="flex items-center gap-2 text-cyan-400 font-arcade text-xs tracking-wider">
              <Activity className="w-4 h-4 animate-spin" />
              <span>ОЖИДАНИЕ ПОКЛЕВКИ...</span>
            </div>
            <div className="font-mono text-[11px] text-zinc-400">
              Держи руку наготове перед камерой для резкой подсечки!
            </div>
          </div>
        )}

        {/* BITE Event Alert */}
        {stage === 'BITE' && (
          <div 
            onClick={handleStrike}
            className="pointer-events-auto cursor-pointer p-8 bg-red-950/90 border-4 border-amber-400 text-center animate-bounce shadow-[0_0_50px_rgba(245,158,11,0.7)] pixel-corners space-y-3"
          >
            <div className="font-arcade text-2xl text-amber-300 tracking-widest drop-shadow-[0_2px_4px_black]">
              ! КЛЮЕТ !
            </div>
            <div className="font-arcade text-xs text-white">
              {cameraStatus === 'ACTIVE' 
                ? 'РЕЗКО ВЗМАХНИ РУКОЙ ВВЕРХ ИЛИ НАЖМИ [ПРОБЕЛ]!' 
                : 'ЖМИ [ПРОБЕЛ] ИЛИ КЛИКАЙ ДЛЯ ПОДСЕЧКИ!'}
            </div>
            <div className="inline-block py-2 px-6 bg-amber-400 text-black font-arcade text-xs font-bold border-2 border-white">
              [ ПОДСЕЧЬ РЫБУ ]
            </div>
          </div>
        )}

        {/* REELING Minigame HUD (FISCH / Gravity tension mechanics) */}
        {stage === 'REELING' && (
          <div className="pointer-events-auto flex items-center gap-8 p-6 bg-[#040e08]/95 border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.35)] pixel-corners">
            
            {/* Vertical Tension Track */}
            <div className="relative w-12 h-80 bg-black/90 border-2 border-emerald-500 overflow-hidden shadow-inner flex flex-col justify-end">
              
              {/* Fish Position */}
              <div 
                className="absolute left-1 right-1 h-7 border-2 border-amber-400 bg-amber-500/30 flex items-center justify-center transition-all duration-75 text-xs select-none"
                style={{ bottom: `${fishPos}%` }}
              >
                🐟
              </div>

              {/* Player Tension Green Safe Bar */}
              <div 
                className={`absolute left-0.5 right-0.5 h-16 border-2 transition-all duration-75 ${
                  tensionStatus === 'БЕЗОПАСНО' 
                    ? 'border-emerald-300 bg-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                    : 'border-red-400 bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                }`}
                style={{ bottom: `${barPos}%` }}
              />

              {/* Centroid indicator if camera is active */}
              {cameraStatus === 'ACTIVE' && (
                <div 
                  className="absolute right-0 w-2 h-2 rounded-full bg-cyan-400 shadow-md"
                  style={{ bottom: `${100 - handMotionY}%` }}
                  title="Положение руки"
                />
              )}

            </div>

            {/* Minigame Diagnostics & Catch Progress */}
            <div className="w-56 space-y-4">
              
              <div>
                <div className="font-arcade text-[10px] text-zinc-400">ЦЕЛЬ НА ЛЕСКЕ:</div>
                <div className="font-arcade text-xs text-white truncate">{targetFish.name}</div>
                <div className="font-arcade text-[9px] mt-0.5" style={{ color: targetFish.color }}>
                  {targetFish.rarity} // ШАНС: {targetFish.catchChance}%
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between font-arcade text-[9px]">
                  <span className="text-zinc-400">ПРОГРЕСС ВЫВАЖИВАНИЯ:</span>
                  <span className="text-emerald-400">{Math.round(catchProgress)}%</span>
                </div>
                <div className="w-full h-4 bg-black border border-emerald-500 p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-100"
                    style={{ width: `${catchProgress}%` }}
                  />
                </div>
              </div>

              {/* Status Indicator */}
              <div className={`p-2 font-arcade text-[10px] text-center border ${
                tensionStatus === 'БЕЗОПАСНО'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                  : 'bg-red-950 text-red-300 border-red-500 animate-pulse'
              }`}>
                НАТЯЖЕНИЕ: {tensionStatus}
              </div>

              <div className="font-mono text-[10px] text-zinc-400 space-y-1 bg-[#06100a] p-2 border border-zinc-800">
                {cameraStatus === 'ACTIVE' ? (
                  <div>✋ Поднимай руку выше/ниже или жми <span className="text-emerald-400">[ЛКМ / ПРОБЕЛ]</span></div>
                ) : (
                  <div>🖱 Зажимай <span className="text-emerald-400">[ЛКМ / ПРОБЕЛ]</span> для подъема планки</div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* LOST Fish Alert */}
        {stage === 'LOST' && (
          <div className="p-6 bg-red-950/90 border-2 border-red-500 text-center font-arcade text-red-300 space-y-2 pixel-corners animate-shake">
            <div className="text-lg">РЫБА СОРВАЛАСЬ!</div>
            <div className="text-xs text-zinc-400">Леска не выдержала натяжения или ослабла.</div>
          </div>
        )}

        {/* CATCH SUCCESS Showcase Modal */}
        {stage === 'CATCH_SUCCESS' && lastCaught && (
          <div className="pointer-events-auto p-6 bg-[#08150f]/95 border-2 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.5)] text-center max-w-md w-full space-y-4 pixel-corners animate-in zoom-in-95 duration-200">
            
            <div className="font-arcade text-xs text-amber-400 tracking-wider flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ТРОФЕЙ ВЫЛОВЛЕН!</span>
            </div>

            {/* Fish Card Preview */}
            <div className="relative aspect-[4/3] w-64 mx-auto border-2 border-amber-400 overflow-hidden bg-black shadow-lg">
              <img
                src={lastCaught.fish.cardImage}
                alt={lastCaught.fish.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 right-2 bg-black/80 border border-zinc-800 p-1 flex justify-between items-center font-arcade text-[9px]">
                <span style={{ color: lastCaught.fish.color }}>{lastCaught.fish.rarity}</span>
                <span className="text-cyan-300 font-mono">ШАНС: {lastCaught.fish.catchChance}%</span>
              </div>
            </div>

            <div>
              <h3 className="font-arcade text-sm text-white">{lastCaught.fish.name}</h3>
              <p className="font-mono text-xs text-zinc-300 mt-1">
                Вес: <span className="text-emerald-400 font-bold">{lastCaught.weight} кг</span> · Ценность: <span className="text-amber-400 font-bold">{lastCaught.price.toLocaleString()} C</span>
              </p>
              {lastCaught.expEarned && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-950/80 border border-cyan-400 font-arcade text-[9px] text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.35)]">
                  <Sparkles className="w-3 h-3 text-cyan-300" />
                  <span>+{lastCaught.expEarned} EXP ОПЫТА</span>
                </div>
              )}
            </div>

            {/* Guest notice or Registered Sadok notification */}
            {profile.isRegistered ? (
              <div className="p-2 bg-emerald-950/60 border border-emerald-500/50 text-[10px] text-emerald-300 font-mono text-center">
                ✓ Трофей занесен в инвентарь! Продать его за монеты можно во вкладке «ПРОФИЛЬ».
              </div>
            ) : (
              <div className="p-2.5 bg-amber-950/60 border border-amber-500/50 text-[10px] text-amber-300 font-mono leading-relaxed">
                Вы играете как гость — улов и баланс не сохраняются. Зарегистрируйтесь, чтобы сохранять все виды рыб и счетчик поимок!
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setStage('IDLE')}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs border border-emerald-300 shadow-[0_3px_0_#064e3b]"
              >
                ЕЩЕ ЗАБРОС
              </button>
              
              {!profile.isRegistered && setTab && (
                <button
                  onClick={() => setTab('auth')}
                  className="py-3 px-3 bg-amber-500 hover:bg-amber-400 text-black font-arcade text-xs border border-amber-300 flex items-center justify-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>СОХРАНИТЬ В ПРОФИЛЬ</span>
                </button>
              )}

              <button
                onClick={openBestiary}
                className="py-3 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-arcade text-xs border border-zinc-600"
              >
                КАТАЛОГ
              </button>
            </div>

          </div>
        )}

      </div>

      {/* 4. Bottom Controls, Webcam Feed PiP & Sonar Radar */}
      <div className="relative z-20 px-4 py-3 bg-[#06100a]/90 border-t border-emerald-500/40 flex flex-wrap justify-between items-end gap-4">
        
        {/* Quick Keyboard/Mouse Legend */}
        <div className="hidden lg:flex flex-col gap-1 font-arcade text-[9px] text-zinc-400">
          <div className="text-emerald-400 font-bold">УПРАВЛЕНИЕ:</div>
          <div><span className="text-cyan-400">[КАМЕРА]</span> Взмах рукой для заброса и подсечки, высота руки для планки</div>
          <div><span className="text-amber-400">[КЛАВИШИ]</span> Пробел / Клик мыши, зажатие для подъема</div>
        </div>

        {/* Dual Dock: Live Webcam PiP + Deep Sea Sonar Radar */}
        <div className="flex items-center gap-3 ml-auto">
          
          {/* WEBCAM MOTION PiP WINDOW */}
          {cameraEnabled && (
            <div className="w-36 sm:w-44 p-1.5 bg-[#09150f] border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)] pixel-corners">
              <div className="flex justify-between items-center pb-1 mb-1 border-b border-emerald-500/40 font-arcade text-[7px]">
                <div className="flex items-center gap-1 text-emerald-400">
                  <Camera className="w-2.5 h-2.5" />
                  <span>ВЕБ-КАМЕРА</span>
                </div>
                <div className={cameraStatus === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}>
                  {cameraStatus === 'ACTIVE' ? 'ОНЛАЙН' : 'ПОИСК'}
                </div>
              </div>

              <div className="relative aspect-video bg-black overflow-hidden border border-zinc-800">
                <video
                  ref={webcamVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                {/* Hand Centroid Line */}
                {cameraStatus === 'ACTIVE' && (
                  <>
                    <div 
                      className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                      style={{ top: `${handMotionY}%` }}
                    />
                    <div className="absolute top-1 left-1 px-1 bg-black/80 font-mono text-[7px] text-cyan-300">
                      РУКА: {100 - handMotionY}%
                    </div>
                  </>
                )}

                {cameraStatus === 'DENIED' && (
                  <div className="absolute inset-0 flex items-center justify-center p-2 text-center font-arcade text-[7px] text-red-400 bg-black/90">
                    ДОСТУП ЗАПРЕЩЕН
                  </div>
                )}
              </div>

              <div className="mt-1 flex justify-between font-arcade text-[7px] text-zinc-400">
                <span>ДВИЖЕНИЕ:</span>
                <span className="text-emerald-400">{motionIntensity}%</span>
              </div>
            </div>
          )}

          {/* Deep Sea Sonar Radar */}
          <div className="w-36 sm:w-44 p-1.5 bg-[#09150f] border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)] pixel-corners">
            
            <div className="flex justify-between items-center pb-1 mb-1 border-b border-emerald-500/40 font-arcade text-[7px]">
              <div className="flex items-center gap-1 text-emerald-400">
                <Radio className="w-2.5 h-2.5 animate-spin" />
                <span>ЭХОЛОТ</span>
              </div>
              <div className="text-cyan-400">АКТИВЕН</div>
            </div>

            {/* Radar Screen with sweeping radial animation */}
            <div className="relative aspect-video bg-[#040c08] overflow-hidden border border-emerald-500/40 flex items-center justify-center">
              <div className="absolute inset-1 rounded-full border border-emerald-500/20" />
              <div className="absolute inset-3 rounded-full border border-emerald-500/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />

              {/* Sonar Blip */}
              <div 
                className="absolute w-2 h-2 rounded-full bg-amber-400 animate-ping"
                style={{
                  top: `${40 + Math.sin(fishPos / 10) * 20}%`,
                  left: `${50 + Math.cos(fishPos / 10) * 30}%`
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent pointer-events-none animate-spin origin-center" />
            </div>

            <div className="mt-1 flex justify-between font-arcade text-[7px] text-emerald-300">
              <span>{depth}М</span>
              <span className="text-cyan-400">{targetFish.rarity} ({targetFish.catchChance}%)</span>
            </div>

          </div>

        </div>

      </div>

      {/* 5. HOW TO PLAY GUIDE MODAL */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-[#08150f] border-2 border-emerald-400 p-6 pixel-corners shadow-[0_0_50px_rgba(16,185,129,0.4)] space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-emerald-500/40 pb-3">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-arcade text-sm text-emerald-300 tracking-wider">
                    РУКОВОДСТВО РЫБОЛОВА RODMAX
                  </h3>
                  <p className="font-mono text-[10px] text-zinc-400 mt-0.5">
                    Управление веб-камерой и клавиатурой / Правила вываживания
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="p-1.5 bg-zinc-900 border border-zinc-700 hover:border-red-400 hover:text-red-400 text-zinc-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 5 Step Walkthrough */}
            <div className="space-y-4">
              
              {/* Step 1 */}
              <div className="p-3 bg-black/60 border border-emerald-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-white">ВЕБ-КАМЕРА ИЛИ МЫШЬ</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    Разрешите браузеру доступ к веб-камере для управления жестами рук в реальном времени. В любой момент можно играть кликами мыши или клавишей <strong className="text-emerald-400">[ПРОБЕЛ]</strong>.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3 bg-black/60 border border-emerald-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-white">ЗАБРОС СНАСТИ</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    Сделайте взмах ладонью вверх перед объективом камеры либо нажмите <strong className="text-emerald-400">[ПРОБЕЛ]</strong> или кнопку «Забросить удочку». Блесна отправится на глубину.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3 bg-black/60 border border-amber-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-amber-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-amber-300">ПОДСЕЧКА (! КЛЮЕТ !)</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    Когда эхолот запищит и появится сигнал «! КЛЮЕТ !», резко взмахните рукой вверх перед камерой или быстро нажмите <strong className="text-amber-400">[ПРОБЕЛ]</strong>, чтобы подсечь рыбу.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-3 bg-black/60 border border-cyan-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-cyan-400 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  4
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-cyan-300">ВЫВАЖИВАНИЕ И БАЛАНС</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    Удерживайте зеленую полосу натяжения на рыбе. Поднимайте ладонь выше перед камерой (или зажимайте <strong className="text-cyan-400">[ЛКМ / ПРОБЕЛ]</strong>), чтобы поднимать планку. Опускайте руку, чтобы спускать. Заполните шкалу до 100%!
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="p-3 bg-black/60 border border-emerald-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  5
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-emerald-400">САДОК И МОНЕТЫ</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    Каждая выловленная рыба приносит опыт (EXP), попадает в садок и сохраняется в вашем Личном кабинете (во вкладке «ПРОФИЛЬ»). Там вы можете продать улов за монеты!
                  </p>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-emerald-500/30 flex justify-end">
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs border border-emerald-300 shadow-[0_3px_0_#064e3b]"
              >
                ВСЁ ПОНЯТНО, В БОЙ!
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
