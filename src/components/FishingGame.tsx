import React, { useState, useEffect, useRef } from 'react';
import { AnglerProfile, FishItem, CaughtFish, TabType } from '../types';
import { FISH_DATABASE, rollFish } from '../data/fishDatabase';
import { sound } from '../audio';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  UserPlus, 
  Camera, 
  CameraOff, 
  HelpCircle, 
  X, 
  Activity, 
  Smartphone, 
  Monitor, 
  Hand,
  Volume2,
  AlertTriangle,
  Target
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

  // Layout Orientation: 'horizontal' for PC/desktop, 'vertical' for mobile/phone
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || window.innerHeight > window.innerWidth;
  });
  const [layoutMode, setLayoutMode] = useState<'auto' | 'horizontal' | 'vertical'>('auto');
  const activeLayout = layoutMode === 'auto' ? (isMobile ? 'vertical' : 'horizontal') : layoutMode;

  // Guide modal state
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [controlWarning, setControlWarning] = useState<string | null>(null);

  // Webcam Motion Tracking State
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraStatus, setCameraStatus] = useState<'ACTIVE' | 'CONNECTING' | 'DENIED' | 'OFF'>('CONNECTING');
  const [handMotionY, setHandMotionY] = useState(50); // 0 to 100
  const [motionIntensity, setMotionIntensity] = useState(0);

  // Minigame variables (Intuitive, fair & rewarding)
  const [fishPos, setFishPos] = useState(50); // 0 to 100
  const [barPos, setBarPos] = useState(50);   // 0 to 100
  const [catchProgress, setCatchProgress] = useState(50); // Balanced starting progress (50%)
  const [tensionStatus, setTensionStatus] = useState<'БЕЗОПАСНО' | 'ОПАСНО'>('БЕЗОПАСНО');
  const [screenShake, setScreenShake] = useState(false);

  // Touch / Finger Direct Control State (for phone/touch)
  const [fingerPos, setFingerPos] = useState<number | null>(null);
  const [touchActive, setTouchActive] = useState(false);

  // Physics refs
  const barPosRef = useRef(50);
  const fishPosRef = useRef(50);
  const fishTargetRef = useRef(50);
  const fishTimerRef = useRef(0);
  const touchPosRef = useRef<number | null>(null);
  const lastWarningSoundTime = useRef(0);

  // Camera & Canvas refs
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Simulated depth
  const [depth, setDepth] = useState(45);

  // Balanced, fair safe bar size based on difficulty
  const getSafeBarSize = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 34; // Common Boot (very comfortable)
      case 2: return 28; // Salmon, Goldfish
      case 3: return 24; // Anglerfish
      case 4: return 20; // Megalodon
      case 5: return 16; // Leviathan, Celestial Whale, Arcane Jellyfish (fair challenge)
      default: return 24;
    }
  };

  const safeBarSize = getSafeBarSize(targetFish.catchDifficulty);

  // Detect orientation / resize
  useEffect(() => {
    const handleResize = () => {
      const mobileNow = window.innerWidth < 768 || window.innerHeight > window.innerWidth;
      setIsMobile(mobileNow);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

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
        }
      }

      prevPixels = new Uint8ClampedArray(data);
    }, 50);

    return () => clearInterval(interval);
  }, [cameraStatus, stage]);

  // Cast Handler
  const handleCast = () => {
    if (stage !== 'IDLE') return;
    sound.playCast();
    setStage('CASTING');
    setDepth(30 + Math.floor(Math.random() * 220));

    setTimeout(() => {
      sound.playSplash();
      setStage('WAITING');
      
      const biteDelay = 2000 + Math.random() * 2500;
      setTimeout(() => {
        sound.playBite();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([120, 60, 120]);
        }
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
    fishTargetRef.current = 50;
    fishTimerRef.current = 0;
    touchPosRef.current = null;
    setBarPos(50);
    setFishPos(50);
    setCatchProgress(50); // Starts comfortably at 50%
    setFingerPos(null);
    setTouchActive(false);
    setControlWarning(null);
    setStage('REELING');
  };

  // 3. Clear, Intuitive & Fair Physics Reeling Loop
  // STRICTLY: Webcam hand gestures on PC, Touch finger drag on Phone
  useEffect(() => {
    if (stage !== 'REELING') return;

    const difficultyFactor = targetFish.catchDifficulty;

    const loop = setInterval(() => {
      // 1. POSITIONING GREEN SAFE BAR
      if (touchPosRef.current !== null) {
        // Mode A: Smartphone Finger Touch Drag (direct 1:1 control)
        barPosRef.current += (touchPosRef.current - barPosRef.current) * 0.45;
      } else if (cameraStatus === 'ACTIVE') {
        // Mode B: PC Webcam Motion Hand Control (hand height sets position!)
        // handMotionY: 0 is top of camera, 100 is bottom.
        // Invert: hand higher up = bar higher/right (100%), hand down = bar lower/left (0%)
        const targetHandPos = Math.max(8, Math.min(92, 100 - handMotionY));
        barPosRef.current += (targetHandPos - barPosRef.current) * 0.28;
      }

      // Clamp player bar
      barPosRef.current = Math.max(6, Math.min(94, barPosRef.current));
      setBarPos(barPosRef.current);

      // 2. ORGANIC FISH SWIMMING PHYSICS (Smooth, predictable glide, no crazy teleports)
      fishTimerRef.current--;
      if (fishTimerRef.current <= 0) {
        // Pick new swim destination with natural spread
        const spread = difficultyFactor >= 4 ? 65 : 45;
        const newTarget = 20 + Math.random() * spread;
        fishTargetRef.current = Math.max(12, Math.min(88, newTarget));
        // Changes direction every 1.5 - 2.5 seconds so player can follow naturally
        fishTimerRef.current = Math.max(22, 45 - difficultyFactor * 4 + Math.floor(Math.random() * 12));
      }

      // Smooth cruise towards target destination
      const dist = fishTargetRef.current - fishPosRef.current;
      const cruiseSpeed = 0.045 + difficultyFactor * 0.015;
      const gentleWave = Math.sin(Date.now() / 380) * 0.7;
      fishPosRef.current = Math.max(10, Math.min(90, fishPosRef.current + dist * cruiseSpeed + gentleWave));
      setFishPos(fishPosRef.current);

      // 3. TENSION & FAIR PROGRESS CALCULATION
      const safeThreshold = safeBarSize / 2;
      const distance = Math.abs(barPosRef.current - fishPosRef.current);
      const inSafeZone = distance <= safeThreshold;

      setTensionStatus(inSafeZone ? 'БЕЗОПАСНО' : 'ОПАСНО');

      if (!inSafeZone) {
        setScreenShake(true);
        const now = Date.now();
        if (now - lastWarningSoundTime.current > 550) {
          sound.playWarning();
          lastWarningSoundTime.current = now;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
          }
        }
      } else {
        setScreenShake(false);
        sound.playReelClick();
      }

      setCatchProgress((prev) => {
        // Balanced progression:
        // Inside safe zone: +1.35% (rewards steady tracking)
        // Outside safe zone: -0.65% (gives player 3.5 - 5 seconds of buffer to adjust, never snaps in 1 sec!)
        const delta = inSafeZone ? 1.35 : -0.65;
        const next = prev + delta;

        if (next >= 100) {
          clearInterval(loop);
          triggerCatchSuccess();
          return 100;
        }
        if (next <= 0) {
          clearInterval(loop);
          sound.playSnap();
          triggerLost();
          return 0;
        }
        return next;
      });

    }, 45);

    return () => clearInterval(loop);
  }, [stage, targetFish, safeBarSize, handMotionY, cameraStatus]);

  // NO KEYBOARD REELING: Block keyboard during reeling and show prompt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stage === 'IDLE' && e.code === 'Space') {
        e.preventDefault();
        handleCast();
      } else if (stage === 'BITE' && e.code === 'Space') {
        e.preventDefault();
        handleStrike();
      } else if (stage === 'REELING') {
        // If user presses keys during reeling, remind them that keyboard is disabled!
        if (['Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
          setControlWarning('✋ КЛАВИАТУРА ОТКЛЮЧЕНА! УПРАВЛЯЙТЕ ДВИЖЕНИЕМ ЛАДОНИ ПЕРЕД ВЕБ-КАМЕРОЙ!');
          setTimeout(() => setControlWarning(null), 2500);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage]);

  // Pointer Handlers: ONLY allow touch/pen for screen drag (mouse drag disabled on PC to preserve core camera USP!)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stage === 'BITE') {
      handleStrike();
      return;
    }
    if (stage === 'REELING') {
      // Check if real touch or pen
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        updateTouchPosition(e.clientX, e.clientY);
      } else {
        // Mouse clicked on PC: remind player to use webcam hand gesture
        setControlWarning('✋ МЫШЬ ОТКЛЮЧЕНА! ПОДНИМАЙТЕ И ОПУСКАЙТЕ РУКУ ПЕРЕД ВЕБ-КАМЕРОЙ!');
        setTimeout(() => setControlWarning(null), 2500);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stage === 'REELING' && touchActive && (e.pointerType === 'touch' || e.pointerType === 'pen')) {
      updateTouchPosition(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stage === 'REELING') {
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
      touchPosRef.current = null;
      setFingerPos(null);
      setTouchActive(false);
    }
  };

  const updateTouchPosition = (clientX: number, clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();

    let percent = 50;
    if (activeLayout === 'vertical') {
      // In vertical: bottom is 0%, top is 100%
      const relativeY = clientY - rect.top;
      percent = 100 - (relativeY / rect.height) * 100;
    } else {
      // In horizontal: left is 0%, right is 100%
      const relativeX = clientX - rect.left;
      percent = (relativeX / rect.width) * 100;
    }

    const clamped = Math.max(8, Math.min(92, percent));
    touchPosRef.current = clamped;
    setFingerPos(clamped);
    setTouchActive(true);
  };

  // Catch Success
  const triggerCatchSuccess = () => {
    const isArcane = targetFish.rarity === 'ARCANE';
    sound.playCatch(isArcane);
    sound.playCoin();

    const weight = +(targetFish.weightMin + Math.random() * (targetFish.weightMax - targetFish.weightMin)).toFixed(1);
    const price = Math.round(targetFish.basePrice * (weight / targetFish.weightMin));

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
    }, 2200);
  };

  return (
    <div 
      className={`relative w-full h-[calc(100vh-65px)] bg-black overflow-hidden select-none flex flex-col justify-between ${
        screenShake ? 'animate-shake' : ''
      }`}
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
      <div className="relative z-20 px-3 sm:px-4 py-2 bg-[#06100a]/90 border-b border-emerald-500/50 backdrop-blur-md flex flex-wrap justify-between items-center gap-2 text-xs font-arcade">
        
        {/* Left: Location, Depth & Guide Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-emerald-400 text-[10px] sm:text-xs">
            ИЗУМРУДНЫЙ АТОЛЛ
          </div>
          <div className="text-zinc-500">|</div>
          <div className="text-cyan-300 text-[10px] sm:text-xs">
            {depth} М
          </div>

          {/* Guide Button */}
          <button
            onClick={() => { sound.playReelClick(); setIsGuideOpen(true); }}
            className="py-1 px-2.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-400 font-arcade text-[8px] sm:text-[9px] flex items-center gap-1 transition-all shadow-[0_0_10px_rgba(251,191,36,0.3)] animate-pulse"
          >
            <HelpCircle className="w-3 h-3" />
            <span className="hidden sm:inline">КАК ИГРАТЬ?</span>
            <span className="sm:hidden">ГАЙД</span>
          </button>
        </div>

        {/* Right: Layout Switcher, Camera Toggle & Angler Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Layout Orientation Toggle */}
          <button
            onClick={() => {
              sound.playReelClick();
              setLayoutMode(activeLayout === 'horizontal' ? 'vertical' : 'horizontal');
            }}
            className="py-1 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-arcade text-[8px] sm:text-[9px] flex items-center gap-1 transition-colors"
            title="Переключить горизонтальный режим (ПК) / вертикальный режим (Телефон)"
          >
            {activeLayout === 'horizontal' ? (
              <>
                <Monitor className="w-3 h-3 text-cyan-400" />
                <span>РЕЖИМ: ПК (КАМЕРА)</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3 h-3 text-emerald-400" />
                <span>РЕЖИМ: ТЕЛЕФОН (ТАЧ)</span>
              </>
            )}
          </button>

          {/* Camera Toggle Button */}
          <button
            onClick={() => {
              sound.playReelClick();
              setCameraEnabled(!cameraEnabled);
            }}
            className={`py-1 px-2 border font-arcade text-[8px] sm:text-[9px] flex items-center gap-1 transition-all ${
              cameraEnabled && cameraStatus === 'ACTIVE'
                ? 'bg-emerald-500 text-black border-emerald-300 font-bold'
                : cameraEnabled && cameraStatus === 'CONNECTING'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 animate-pulse'
                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
            }`}
            title="Включить или отключить веб-камеру"
          >
            {cameraEnabled && cameraStatus === 'ACTIVE' ? (
              <Camera className="w-3 h-3" />
            ) : (
              <CameraOff className="w-3 h-3 text-zinc-500" />
            )}
            <span className="hidden sm:inline">
              {cameraEnabled && cameraStatus === 'ACTIVE' ? 'КАМЕРА: ВКЛ' : 'КАМЕРА: ВЫКЛ'}
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
      <div className="relative z-20 flex-1 flex items-center justify-center pointer-events-none p-3">
        
        {/* Warning Toast (if user tries keyboard or mouse during reeling) */}
        {controlWarning && (
          <div className="fixed top-16 z-50 px-4 py-2 bg-amber-950/95 border-2 border-amber-400 text-amber-300 font-arcade text-xs shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-bounce pixel-corners">
            {controlWarning}
          </div>
        )}

        {/* IDLE Prompt */}
        {stage === 'IDLE' && (
          <div className="pointer-events-auto p-5 sm:p-6 bg-[#06120b]/95 border-2 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.35)] text-center max-w-md w-full space-y-4 pixel-corners animate-pulse">
            <div className="font-arcade text-emerald-400 text-xs sm:text-sm tracking-wider">
              ГОТОВНОСТЬ К ЗАБРОСУ
            </div>
            
            <p className="font-mono text-xs text-zinc-300 leading-relaxed">
              {cameraStatus === 'ACTIVE' ? (
                <>Сделайте <strong className="text-emerald-400">взмах ладонью вверх</strong> перед камерой или нажмите кнопку ниже, чтобы забросить снасть.</>
              ) : (
                <>Нажмите кнопку ниже, чтобы отправить снасть в глубоководный океан.</>
              )}
            </p>

            <button
              onClick={handleCast}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs tracking-wider border-2 border-emerald-300 shadow-[0_3px_0_#064e3b] transition-all"
            >
              [ ЗАБРОСИТЬ УДОЧКУ ]
            </button>
            
            <div className="text-[9px] font-arcade text-cyan-300">
              {activeLayout === 'vertical' ? '📱 ТЕЛЕФОН: УПРАВЛЕНИЕ ПАЛЬЦЕМ' : '✋ ПК: УПРАВЛЕНИЕ ДВИЖЕНИЕМ РУК ЧЕРЕЗ ВЕБ-КАМЕРУ'}
            </div>
          </div>
        )}

        {/* CASTING Animation phase */}
        {stage === 'CASTING' && (
          <div className="p-4 bg-black/85 border-2 border-emerald-400 font-arcade text-xs sm:text-sm text-emerald-300 animate-pulse pixel-corners shadow-[0_0_20px_rgba(16,185,129,0.4)]">
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
            <div className="font-mono text-[10px] sm:text-[11px] text-zinc-400 text-center">
              Приготовьтесь к резкому взмаху рукой или нажатию кнопки при поклевке!
            </div>
          </div>
        )}

        {/* BITE Event Alert */}
        {stage === 'BITE' && (
          <div 
            onClick={handleStrike}
            className="pointer-events-auto cursor-pointer p-6 sm:p-8 bg-red-950/90 border-4 border-amber-400 text-center animate-bounce shadow-[0_0_50px_rgba(245,158,11,0.7)] pixel-corners space-y-3"
          >
            <div className="font-arcade text-xl sm:text-2xl text-amber-300 tracking-widest drop-shadow-[0_2px_4px_black]">
              ! КЛЮЕТ !
            </div>
            <div className="font-arcade text-[10px] sm:text-xs text-white">
              {cameraStatus === 'ACTIVE' 
                ? 'РЕЗКО ВЗМАХНИТЕ РУКОЙ ВВЕРХ ПЕРЕД КАМЕРОЙ!' 
                : 'НАЖМИТЕ КНОПКУ «ПОДСЕЧЬ»!'}
            </div>
            <div className="inline-block py-2.5 px-6 bg-amber-400 text-black font-arcade text-xs font-bold border-2 border-white">
              [ ПОДСЕЧЬ РЫБУ ]
            </div>
          </div>
        )}

        {/* REELING Minigame HUD */}
        {stage === 'REELING' && (
          activeLayout === 'horizontal' ? (
            /* =================== HORIZONTAL MODE (PC / DESKTOP WEBCAM CONTROL) =================== */
            <div className="pointer-events-auto w-full max-w-2xl p-5 bg-[#040e08]/95 border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.35)] pixel-corners space-y-4">
              
              {/* Telemetry Header: HIDDEN TARGET (NO SPOILERS!) */}
              <div className="flex justify-between items-center border-b border-emerald-500/30 pb-2">
                <div>
                  <div className="font-arcade text-[9px] text-zinc-400">ДОБЫЧА НА КРЮЧКЕ:</div>
                  <div className="font-arcade text-xs text-emerald-300 tracking-wider animate-pulse">
                    ??? НЕИЗВЕСТНЫЙ ТРОФЕЙ
                  </div>
                </div>

                {/* Real-time Reeling Instruction Banner */}
                <div className="text-right">
                  <div className="font-arcade text-[9px] text-cyan-400 flex items-center justify-end gap-1">
                    <Hand className="w-3 h-3 text-cyan-300" />
                    <span>УПРАВЛЕНИЕ ВЕБ-КАМЕРОЙ:</span>
                  </div>
                  <div className="font-arcade text-[9px] text-zinc-300">
                    ПОДНИМАЙТЕ / ОПУСКАЙТЕ ЛАДОНЬ
                  </div>
                </div>
              </div>

              {/* Progress Bar (Balanced and Fair) */}
              <div className="space-y-1">
                <div className="flex justify-between font-arcade text-[9px]">
                  <span className="text-zinc-400">ПРОГРЕСС ВЫВАЖИВАНИЯ:</span>
                  <span className={catchProgress > 30 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {Math.round(catchProgress)}% / 100%
                  </span>
                </div>
                <div className="w-full h-4 bg-black border border-emerald-500 p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-100 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                    style={{ width: `${catchProgress}%` }}
                  />
                </div>
              </div>

              {/* HORIZONTAL TENSION TRACK */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-arcade text-[8px]">
                  <span className="text-zinc-400">ШКАЛА УДЕРЖАНИЯ ДОБЫЧИ:</span>
                  <span className={tensionStatus === 'БЕЗОПАСНО' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold animate-pulse'}>
                    {tensionStatus === 'БЕЗОПАСНО' ? '✓ ЗАХВАТ: ИДЕТ ВЫВАЖИВАНИЕ' : '⚠ ВЫРАВНЯЙТЕ ЛАДОНЬ С РЫБОЙ'}
                  </span>
                </div>

                <div 
                  ref={trackRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative w-full h-16 bg-black/95 border-2 border-emerald-500 overflow-hidden shadow-inner select-none"
                  style={{ touchAction: 'none' }}
                >
                  {/* Subtle Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:40px_100%]" />

                  {/* Fish Position Icon */}
                  <div 
                    className="absolute top-1 bottom-1 w-10 border-2 border-amber-400 bg-amber-500/40 flex items-center justify-center transition-all duration-100 text-base select-none z-10 shadow-md"
                    style={{ left: `calc(${fishPos}% - 20px)` }}
                  >
                    🐟
                  </div>

                  {/* Player Safe Bar (Horizontal) */}
                  <div 
                    className={`absolute top-0.5 bottom-0.5 border-2 transition-all duration-100 z-0 ${
                      tensionStatus === 'БЕЗОПАСНО' 
                        ? 'border-emerald-300 bg-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.7)]' 
                        : 'border-amber-400 bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    }`}
                    style={{ 
                      width: `${safeBarSize}%`,
                      left: `calc(${barPos}% - ${safeBarSize / 2}%)` 
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center font-arcade text-[8px] text-emerald-200 opacity-75">
                      {tensionStatus === 'БЕЗОПАСНО' ? '🎯 ЗАХВАТ' : ''}
                    </div>
                  </div>

                  {/* Live Hand Height Tracking Marker from Webcam */}
                  {cameraStatus === 'ACTIVE' && (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_12px_#22d3ee] pointer-events-none z-20 flex flex-col items-center justify-between"
                      style={{ left: `${Math.max(8, Math.min(92, 100 - handMotionY))}%` }}
                    >
                      <div className="text-[10px] -mt-1">✋</div>
                      <div className="text-[8px] font-arcade text-cyan-200 bg-black/80 px-1 border border-cyan-400 -mb-1">
                        РУКА
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status and Technique Explainer Footer */}
              <div className="flex justify-between items-center text-[9px] font-mono text-zinc-300 pt-1 border-t border-emerald-500/20">
                <div className="flex items-center gap-1.5 text-cyan-300 font-arcade text-[8px]">
                  <Hand className="w-3.5 h-3.5" />
                  <span>ТЕХНИКА: ДВИГАЙТЕ РУКОЙ В КАДРЕ ВЫШЕ ИЛИ НИЖЕ ДЛЯ ПЕРЕМЕЩЕНИЯ ПЛАНКИ</span>
                </div>
                <div className={`px-2.5 py-0.5 border font-arcade text-[9px] ${
                  tensionStatus === 'БЕЗОПАСНО' ? 'bg-emerald-950 text-emerald-300 border-emerald-500' : 'bg-amber-950 text-amber-300 border-amber-500'
                }`}>
                  {tensionStatus === 'БЕЗОПАСНО' ? '✓ В ЗОНЕ' : '⚠ ВЫРАВНЯЙТЕ'}
                </div>
              </div>

            </div>
          ) : (
            /* =================== VERTICAL MODE (MOBILE / PHONE FINGER CONTROL) =================== */
            <div className="pointer-events-auto flex items-center justify-center gap-4 sm:gap-6 p-4 sm:p-6 bg-[#040e08]/95 border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.35)] pixel-corners max-h-[85vh]">
              
              {/* VERTICAL TENSION TRACK (FOR FINGER DRAG) */}
              <div className="flex flex-col items-center gap-2">
                <div className="font-arcade text-[8px] sm:text-[9px] text-cyan-300 animate-pulse">
                  ВЕДИ ПАЛЬЦЕМ 👆
                </div>

                <div 
                  ref={trackRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative w-16 sm:w-20 h-[50vh] sm:h-[58vh] bg-black/95 border-2 border-emerald-500 overflow-hidden shadow-inner select-none touch-none flex flex-col justify-end"
                  style={{ touchAction: 'none' }}
                >
                  {/* Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:100%_40px]" />

                  {/* Fish Position */}
                  <div 
                    className="absolute left-1 right-1 h-10 border-2 border-amber-400 bg-amber-500/40 flex items-center justify-center transition-all duration-100 text-base select-none z-10 shadow-md"
                    style={{ bottom: `calc(${fishPos}% - 20px)` }}
                  >
                    🐟
                  </div>

                  {/* Player Tension Green Safe Bar */}
                  <div 
                    className={`absolute left-0.5 right-0.5 border-2 transition-all duration-100 z-0 ${
                      tensionStatus === 'БЕЗОПАСНО' 
                        ? 'border-emerald-300 bg-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.7)]' 
                        : 'border-amber-400 bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    }`}
                    style={{ 
                      height: `${safeBarSize}%`,
                      bottom: `calc(${barPos}% - ${safeBarSize / 2}%)` 
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center font-arcade text-[8px] text-emerald-200 opacity-75">
                      {tensionStatus === 'БЕЗОПАСНО' ? '🎯' : ''}
                    </div>
                  </div>

                  {/* Finger indicator ring */}
                  {touchActive && fingerPos !== null && (
                    <div 
                      className="absolute left-1 right-1 h-10 rounded-lg border-2 border-cyan-400 bg-cyan-400/30 flex items-center justify-center pointer-events-none z-20 shadow-[0_0_15px_#22d3ee]"
                      style={{ bottom: `calc(${fingerPos}% - 20px)` }}
                    >
                      <span className="font-arcade text-[8px] text-cyan-200">👆 ПАЛЕЦ</span>
                    </div>
                  )}

                  {/* Webcam centroid marker fallback */}
                  {cameraStatus === 'ACTIVE' && touchPosRef.current === null && (
                    <div 
                      className="absolute right-0 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-md"
                      style={{ bottom: `${Math.max(8, Math.min(92, 100 - handMotionY))}%` }}
                      title="Положение руки"
                    />
                  )}

                </div>

                <div className="font-arcade text-[8px] text-zinc-400">
                  {tensionStatus === 'БЕЗОПАСНО' ? '✓ ЗАХВАТ' : '⚠ СОВМЕСТИТЕ'}
                </div>
              </div>

              {/* Vertical Mode Side Telemetry */}
              <div className="w-44 sm:w-52 space-y-4">
                
                {/* Unknown Fish Telemetry */}
                <div className="p-2.5 bg-black/60 border border-emerald-500/40 space-y-1">
                  <div className="font-arcade text-[8px] text-zinc-400">ДОБЫЧА НА КРЮЧКЕ:</div>
                  <div className="font-arcade text-xs text-emerald-300 tracking-wider animate-pulse">
                    ??? НЕИЗВЕСТНО
                  </div>
                  <div className="font-mono text-[9px] text-zinc-400">
                    Статус: <span className="text-cyan-300">ВЫВАЖИВАНИЕ</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between font-arcade text-[9px]">
                    <span className="text-zinc-400">ПРОГРЕСС:</span>
                    <span className={catchProgress > 30 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {Math.round(catchProgress)}%
                    </span>
                  </div>
                  <div className="w-full h-4 bg-black border border-emerald-500 p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-100"
                      style={{ width: `${catchProgress}%` }}
                    />
                  </div>
                </div>

                {/* Tension Status Indicator */}
                <div className={`p-2 font-arcade text-[10px] text-center border ${
                  tensionStatus === 'БЕЗОПАСНО'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                    : 'bg-amber-950 text-amber-300 border-amber-500'
                }`}>
                  {tensionStatus === 'БЕЗОПАСНО' ? '✓ В ЗЕЛЕНОЙ ЗОНЕ' : '⚠ ВЫРАВНЯЙТЕ ПАЛЕЦ'}
                </div>

                {/* Mobile Finger Control Instructions */}
                <div className="font-mono text-[10px] text-zinc-300 space-y-1.5 bg-[#06100a] p-2.5 border border-zinc-800 leading-tight">
                  <div className="text-cyan-300 font-bold font-arcade text-[8px]">ТЕХНИКА:</div>
                  <div>👆 Прижмите палец к шкале и ведите вверх/вниз прямо за рыбой.</div>
                  <div className="text-[9px] text-emerald-400">Держите рыбу в зеленой зоне до 100%!</div>
                </div>

              </div>

            </div>
          )
        )}

        {/* LOST Fish Alert */}
        {stage === 'LOST' && (
          <div className="p-6 bg-red-950/90 border-2 border-red-500 text-center font-arcade text-red-300 space-y-2 pixel-corners animate-shake shadow-[0_0_40px_rgba(239,68,68,0.6)]">
            <div className="text-lg">РЫБА СОРВАЛАСЬ!</div>
            <div className="text-xs text-zinc-300">Леска сорвалась. Внимательнее держите рыбу в зеленой зоне!</div>
          </div>
        )}

        {/* CATCH SUCCESS Showcase Modal (REVEAL ONLY AFTER CATCH!) */}
        {stage === 'CATCH_SUCCESS' && lastCaught && (
          <div className="pointer-events-auto p-5 sm:p-6 bg-[#08150f]/95 border-2 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.5)] text-center max-w-md w-full space-y-4 pixel-corners animate-in zoom-in-95 duration-200">
            
            <div className="font-arcade text-xs text-amber-400 tracking-wider flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ТРОФЕЙ ВЫЛОВЛЕН!</span>
            </div>

            {/* Fish Card Preview (REVEALED!) */}
            <div className="relative aspect-[4/3] w-56 sm:w-64 mx-auto border-2 border-amber-400 overflow-hidden bg-black shadow-lg">
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

      {/* 4. Bottom Controls & Live Camera Feed PiP */}
      <div className="relative z-20 px-3 sm:px-4 py-2.5 bg-[#06100a]/90 border-t border-emerald-500/40 flex flex-wrap justify-between items-center gap-3">
        
        {/* Real Unique Identity: Camera on PC, Touch on Phone */}
        <div className="flex flex-col gap-0.5 font-arcade text-[8px] sm:text-[9px] text-zinc-300">
          <div className="text-emerald-400 font-bold">СХЕМА УПРАВЛЕНИЯ:</div>
          <div><span className="text-cyan-400">[ПК]</span> Поднимайте / опускайте ладонь перед веб-камерой</div>
          <div><span className="text-amber-400">[ТЕЛЕФОН]</span> Ведите пальцем по экрану вверх и вниз</div>
        </div>

        {/* Live Camera Feed PiP */}
        {cameraEnabled && (
          <div className="w-32 sm:w-40 p-1 bg-[#09150f] border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] pixel-corners ml-auto">
            <div className="flex justify-between items-center pb-0.5 mb-0.5 border-b border-emerald-500/40 font-arcade text-[7px]">
              <div className="flex items-center gap-1 text-emerald-400">
                <Camera className="w-2 h-2" />
                <span>ВЕБ-КАМЕРА</span>
              </div>
              <div className={cameraStatus === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}>
                {cameraStatus === 'ACTIVE' ? 'АКТИВНА' : 'ПОИСК'}
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

            <div className="mt-0.5 flex justify-between font-arcade text-[7px] text-zinc-400">
              <span>ДВИЖЕНИЕ:</span>
              <span className="text-emerald-400">{motionIntensity}%</span>
            </div>
          </div>
        )}

      </div>

      {/* 5. HOW TO PLAY GUIDE MODAL */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-[#08150f] border-2 border-emerald-400 p-5 sm:p-6 pixel-corners shadow-[0_0_50px_rgba(16,185,129,0.4)] space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-emerald-500/40 pb-3">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-arcade text-sm text-emerald-300 tracking-wider">
                    РУКОВОДСТВО РЫБОЛОВА RODMAX
                  </h3>
                  <p className="font-mono text-[10px] text-zinc-400 mt-0.5">
                    Управление жестами веб-камеры и сенсорным экраном (без клавиатуры и мыши)
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
            <div className="space-y-3.5">
              
              {/* Step 1 */}
              <div className="p-3 bg-black/60 border border-emerald-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-white">ВЕБ-КАМЕРА НА ПК ИЛИ ПАЛЕЦ НА ТЕЛЕФОНЕ</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    RODMAX полностью управляется движениями тела: на компьютере используется оптический трекинг вашей ладони перед веб-камерой, а на смартфоне — прямое ведение пальцем по экрану.
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
                    Сделайте взмах рукой вверх перед камерой или нажмите экранную кнопку «Забросить удочку». Снасть уйдет на океанскую глубину.
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
                    Когда раздастся резкий сигнал и появится «! КЛЮЕТ !», мгновенно сделайте резкий взмах рукой вверх перед камерой или нажмите экранную кнопку подсечки.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-3 bg-black/60 border border-cyan-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-cyan-400 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  4
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-cyan-300">ТЕХНИКА ВЫВАЖИВАНИЯ</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    <strong className="text-white">На ПК:</strong> поднимайте или опускайте ладонь перед камерой — зеленая планка натяжения в реальном времени следует за высотой вашей руки. <strong className="text-white">На телефоне:</strong> ведите пальцем по экрану прямо за рыбой. Удерживайте рыбу в зеленой зоне до 100%!
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="p-3 bg-black/60 border border-emerald-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  5
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-emerald-400">ТАЙНА УЛОВА И САДОК</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    Рыба сопротивляется непредсказуемо, а ее вид остается в тайне до победного вылова. При заполнении шкалы до 100% открывается видеоролик трофея, начисляется EXP и монеты в ваш Личный кабинет!
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
