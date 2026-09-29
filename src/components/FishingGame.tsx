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
  Target,
  Crosshair
} from 'lucide-react';

interface FishingGameProps {
  profile: AnglerProfile;
  onCatchFish: (c: CaughtFish) => void;
  openBestiary: () => void;
  setTab?: (tab: TabType) => void;
}

type GameStage = 'IDLE' | 'CASTING' | 'WAITING' | 'BITE' | 'REELING' | 'CATCH_SUCCESS' | 'LOST';

interface Position2D {
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
}

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
  const [motionIntensity, setMotionIntensity] = useState(0);

  // 2D Coordinates for Fish & Player Hand / Finger inside the Camera Catch Arena
  const [fishPos, setFishPos] = useState<Position2D>({ x: 50, y: 50 });
  const [handPos, setHandPos] = useState<Position2D>({ x: 50, y: 50 });
  const [isLockedOn, setIsLockedOn] = useState(false);
  const [catchProgress, setCatchProgress] = useState(50); // Starts midway (50%)
  const [screenShake, setScreenShake] = useState(false);

  // Touch / Finger Direct Control State (for phone/touch)
  const [touchPos, setTouchPos] = useState<Position2D | null>(null);
  const [touchActive, setTouchActive] = useState(false);

  // Guard refs to prevent duplicate catch bug!
  const isRoundFinishedRef = useRef(false);
  const hasAwardedRef = useRef(false);

  // Physics refs
  const fishPosRef = useRef<Position2D>({ x: 50, y: 50 });
  const fishTargetRef = useRef<Position2D>({ x: 50, y: 50 });
  const fishTimerRef = useRef(0);
  const handPosRef = useRef<Position2D>({ x: 50, y: 50 });
  const touchPosRef = useRef<Position2D | null>(null);
  const lastWarningSoundTime = useRef(0);
  const currentProgressRef = useRef(50);

  // Camera & Canvas refs
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);

  // Simulated depth
  const [depth, setDepth] = useState(45);

  // Scaled Difficulty Parameters based on Fish Rarity
  const getFishDifficultyParams = (fish: FishItem) => {
    switch (fish.rarity) {
      case 'COMMON':
        // Boot: very easy, large target, slow wander
        return { targetRadius: 28, swimSpeed: 0.035, gain: 1.5, loss: 0.35, changeInterval: 50 };
      case 'UNCOMMON':
        // Salmon: steady swim, good radius
        return { targetRadius: 24, swimSpeed: 0.05, gain: 1.35, loss: 0.42, changeInterval: 42 };
      case 'RARE':
        // Goldfish: slightly faster, moderate radius
        return { targetRadius: 20, swimSpeed: 0.07, gain: 1.2, loss: 0.48, changeInterval: 35 };
      case 'EPIC':
        // Anglerfish, Megalodon: swift turns, tighter radius
        return { targetRadius: 16, swimSpeed: 0.095, gain: 1.05, loss: 0.55, changeInterval: 28 };
      case 'SECRET':
      case 'GODLY':
      case 'ARCANE':
        // Supreme Leviathans: high precision, agile feints
        return { targetRadius: 13, swimSpeed: 0.125, gain: 0.9, loss: 0.65, changeInterval: 22 };
      default:
        return { targetRadius: 20, swimSpeed: 0.06, gain: 1.2, loss: 0.45, changeInterval: 35 };
    }
  };

  const diffParams = getFishDifficultyParams(targetFish);

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
        video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' } 
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

  // 2. Optical Motion & 2D Hand Centroid Tracking Loop
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
        let weightedX = 0;
        let weightedY = 0;
        let motionPoints = 0;

        for (let i = 0; i < data.length; i += 4) {
          const lumNow = (data[i] + data[i+1] + data[i+2]) / 3;
          const lumPrev = (prevPixels[i] + prevPixels[i+1] + prevPixels[i+2]) / 3;
          const diff = Math.abs(lumNow - lumPrev);

          if (diff > 24) {
            diffSum += diff;
            const pixelIdx = i / 4;
            const x = pixelIdx % 64;
            const y = Math.floor(pixelIdx / 64);
            weightedX += x;
            weightedY += y;
            motionPoints++;
          }
        }

        const avgMotion = Math.min(100, Math.floor(diffSum / 120));
        setMotionIntensity(avgMotion);

        if (motionPoints > 12) {
          // Mirrored screen coordinate: user moving their hand to the right on screen
          const rawX = (1 - (weightedX / motionPoints) / 64) * 100;
          const rawY = ((weightedY / motionPoints) / 48) * 100;

          // Smooth low-pass filter
          handPosRef.current.x += (rawX - handPosRef.current.x) * 0.38;
          handPosRef.current.y += (rawY - handPosRef.current.y) * 0.38;

          setHandPos({
            x: Math.round(handPosRef.current.x),
            y: Math.round(handPosRef.current.y)
          });

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
    }, 45);

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
    
    // Reset round guards to prevent duplicate catches!
    isRoundFinishedRef.current = false;
    hasAwardedRef.current = false;

    // Reset positions to center
    fishPosRef.current = { x: 50, y: 50 };
    fishTargetRef.current = { x: 50, y: 50 };
    fishTimerRef.current = 0;
    touchPosRef.current = null;
    currentProgressRef.current = 50;

    setFishPos({ x: 50, y: 50 });
    setCatchProgress(50); // Starts comfortably midway at 50%
    setTouchPos(null);
    setTouchActive(false);
    setIsLockedOn(false);
    setControlWarning(null);
    setStage('REELING');
  };

  // 3. REELING TICK LOOP: Direct "Hand on Fish" / "Finger on Fish" Mechanic!
  useEffect(() => {
    if (stage !== 'REELING') return;

    const loop = setInterval(() => {
      if (isRoundFinishedRef.current) return;

      // 1. ORGANIC FISH SWIMMING MOVEMENT INSIDE ARENA
      fishTimerRef.current--;
      if (fishTimerRef.current <= 0) {
        // Pick new random destination inside safe margins [18%, 82%]
        fishTargetRef.current = {
          x: 18 + Math.random() * 64,
          y: 20 + Math.random() * 60
        };
        fishTimerRef.current = diffParams.changeInterval + Math.floor(Math.random() * 10);
      }

      // Smooth glide towards destination with subtle water wave
      const dx = fishTargetRef.current.x - fishPosRef.current.x;
      const dy = fishTargetRef.current.y - fishPosRef.current.y;
      const waveX = Math.sin(Date.now() / 360) * 0.6;
      const waveY = Math.cos(Date.now() / 420) * 0.6;

      fishPosRef.current.x = Math.max(12, Math.min(88, fishPosRef.current.x + dx * diffParams.swimSpeed + waveX));
      fishPosRef.current.y = Math.max(14, Math.min(86, fishPosRef.current.y + dy * diffParams.swimSpeed + waveY));

      setFishPos({
        x: Math.round(fishPosRef.current.x * 10) / 10,
        y: Math.round(fishPosRef.current.y * 10) / 10
      });

      // 2. ACTIVE PLAYER POSITION (Hand from Camera on PC, or Touch Finger on Phone)
      let activePlayerPos: Position2D;
      if (touchPosRef.current !== null) {
        // Touch on screen takes priority if user is using finger
        activePlayerPos = touchPosRef.current;
      } else {
        // Otherwise Webcam Hand Tracking
        activePlayerPos = handPosRef.current;
      }

      // 3. LOCK-ON DISTANCE CHECK
      const distX = activePlayerPos.x - fishPosRef.current.x;
      const distY = activePlayerPos.y - fishPosRef.current.y;
      const distance = Math.hypot(distX, distY);
      const isLocked = distance <= diffParams.targetRadius;

      setIsLockedOn(isLocked);

      // 4. PROGRESS CALCULATION (Never drops in 1 sec, fair buffer!)
      if (isLocked) {
        setScreenShake(false);
        sound.playReelClick();
        currentProgressRef.current = Math.min(100, currentProgressRef.current + diffParams.gain);
      } else {
        setScreenShake(true);
        const now = Date.now();
        if (now - lastWarningSoundTime.current > 550) {
          sound.playWarning();
          lastWarningSoundTime.current = now;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
          }
        }
        currentProgressRef.current = Math.max(0, currentProgressRef.current - diffParams.loss);
      }

      setCatchProgress(Math.round(currentProgressRef.current));

      // 5. CATCH SUCCESS OR LOST TRIGGER (Guarded outside state updaters!)
      if (currentProgressRef.current >= 100) {
        isRoundFinishedRef.current = true;
        clearInterval(loop);
        triggerCatchSuccess();
      } else if (currentProgressRef.current <= 0) {
        isRoundFinishedRef.current = true;
        clearInterval(loop);
        sound.playSnap();
        triggerLost();
      }

    }, 45);

    return () => clearInterval(loop);
  }, [stage, targetFish, diffParams]);

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
        // Remind player that reeling is physical (hand in camera / finger on screen)
        if (['Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
          setControlWarning('✋ КЛАВИАТУРА ОТКЛЮЧЕНА! НАВЕДИТЕ РУКУ НА РЫБУ В КАМЕРЕ!');
          setTimeout(() => setControlWarning(null), 2500);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage]);

  // Pointer Handlers: ONLY allow touch/pen for screen drag
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stage === 'BITE') {
      handleStrike();
      return;
    }
    if (stage === 'REELING') {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        updateTouchCoords(e.clientX, e.clientY);
      } else {
        // Mouse clicked on PC: remind player to put hand in front of the camera
        setControlWarning('✋ МЫШЬ ОТКЛЮЧЕНА! ПОМЕСТИТЕ РУКУ В КАМЕРУ И ДЕРЖИТЕ НА РЫБЕ!');
        setTimeout(() => setControlWarning(null), 2500);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stage === 'REELING' && touchActive && (e.pointerType === 'touch' || e.pointerType === 'pen')) {
      updateTouchCoords(e.clientX, e.clientY);
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
      setTouchPos(null);
      setTouchActive(false);
    }
  };

  const updateTouchCoords = (clientX: number, clientY: number) => {
    if (!arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100));
    const pos = { x: Math.round(x), y: Math.round(y) };
    touchPosRef.current = pos;
    setTouchPos(pos);
    setTouchActive(true);
  };

  // Catch Success (Strictly once per round!)
  const triggerCatchSuccess = () => {
    if (hasAwardedRef.current) return;
    hasAwardedRef.current = true;

    const isArcane = targetFish.rarity === 'ARCANE';
    sound.playCatch(isArcane);
    const isShiny = Math.random() < 0.10; // Exactly 10% Shiny chance!
    const weight = +(targetFish.weightMin + Math.random() * (targetFish.weightMax - targetFish.weightMin)).toFixed(1);
    const baseCalculatedPrice = Math.round(targetFish.basePrice * (weight / targetFish.weightMin));
    const price = isShiny ? baseCalculatedPrice * 2 : baseCalculatedPrice;

    const baseExpMap: Record<string, number> = {
      COMMON: 30,
      UNCOMMON: 65,
      RARE: 140,
      EPIC: 320,
      SECRET: 800,
      GODLY: 1600,
      ARCANE: 4000
    };
    const rawExp = Math.round(
      (baseExpMap[targetFish.rarity] || 40) * 
      (1 + ((weight - targetFish.weightMin) / (targetFish.weightMax - targetFish.weightMin || 1)) * 0.5)
    );
    const expEarned = isShiny ? Math.round(rawExp * 1.5) : rawExp;

    const caughtRecord: CaughtFish = {
      id: `caught_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      fish: targetFish,
      weight,
      price,
      caughtAt: new Date().toLocaleTimeString(),
      expEarned,
      isShiny
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
          
          {/* Mode Switcher */}
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

      {/* 3. Center Game Stage Alerts & Reeling Mini-Game */}
      <div className="relative z-20 flex-1 flex items-center justify-center pointer-events-none p-3">
        
        {/* Warning Toast */}
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
                <>Нажмите кнопку ниже, чтобы забросить снасть в глубоководный океан.</>
              )}
            </p>

            <button
              onClick={handleCast}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs tracking-wider border-2 border-emerald-300 shadow-[0_3px_0_#064e3b] transition-all"
            >
              [ ЗАБРОСИТЬ УДОЧКУ ]
            </button>
            
            <div className="text-[9px] font-arcade text-cyan-300">
              {activeLayout === 'vertical' ? '📱 ТЕЛЕФОН: УПРАВЛЕНИЕ ПАЛЬЦЕМ' : '✋ ПК: УПРАВЛЕНИЕ ДВИЖЕНИЕМ РУКИ ПЕРЕД ВЕБ-КАМЕРОЙ'}
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

        {/* REELING Minigame: Direct "Hand in Camera" / "Finger on Fish" Arena! */}
        {stage === 'REELING' && (
          <div className="pointer-events-auto flex flex-col items-center gap-3 w-full max-w-2xl px-2 sm:px-4">
            
            {/* Catch Arena Card */}
            <div className="w-full bg-[#040e08]/95 border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.35)] pixel-corners p-3 sm:p-4 space-y-3">
              
              {/* Header Telemetry */}
              <div className="flex justify-between items-center border-b border-emerald-500/30 pb-2">
                <div>
                  <div className="font-arcade text-[9px] text-zinc-400">ДОБЫЧА НА КРЮЧКЕ:</div>
                  <div className="font-arcade text-xs text-emerald-300 tracking-wider animate-pulse">
                    ??? НЕИЗВЕСТНЫЙ ТРОФЕЙ
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-arcade text-[9px] text-zinc-400">СЛОЖНОСТЬ ВЫВАЖИВАНИЯ:</div>
                  <div className="font-arcade text-xs text-amber-400">
                    ТИР: {targetFish.rarity} // ШАНС: {targetFish.catchChance}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between font-arcade text-[9px]">
                  <span className="text-zinc-400">ПРОГРЕСС ВЫВАЖИВАНИЯ:</span>
                  <span className={catchProgress > 30 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {catchProgress}% / 100%
                  </span>
                </div>
                <div className="w-full h-3.5 bg-black border border-emerald-500 p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-100 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                    style={{ width: `${catchProgress}%` }}
                  />
                </div>
              </div>

              {/* TECHNIQUE INSTRUCTION BADGE */}
              <div className={`p-2 font-arcade text-[9px] sm:text-[10px] text-center border transition-all ${
                isLockedOn 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                  : 'bg-amber-950/80 text-amber-300 border-amber-500 animate-pulse'
              }`}>
                {activeLayout === 'horizontal' ? (
                  isLockedOn ? (
                    <span>🎯 ЗАХВАТ! ДЕРЖИТЕ РУКУ НА РЫБЕ В КАДРЕ (+100%)</span>
                  ) : (
                    <span>✋ ПОМЕСТИТЕ РУКУ В КАМЕРУ И НАВЕДИТЕ ЕЁ НА РЫБУ!</span>
                  )
                ) : (
                  isLockedOn ? (
                    <span>🎯 ЗАХВАТ! ВЕДИТЕ ПАЛЬЦЕМ ПРЯМО ЗА РЫБОЙ (+100%)</span>
                  ) : (
                    <span>👆 ПРИЖМИТЕ ПАЛЕЦ К ЭКРАНУ И НАВЕДИТЕ НА РЫБУ!</span>
                  )
                )}
              </div>

              {/* ===================== THE CAMERA REELING ARENA ===================== */}
              <div 
                ref={arenaRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black border-2 border-emerald-500 overflow-hidden shadow-inner select-none touch-none"
                style={{ touchAction: 'none' }}
              >
                {/* 1. Live Webcam Feed in the Arena (Mirrored) */}
                {cameraEnabled && cameraStatus === 'ACTIVE' ? (
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-60"
                  />
                ) : (
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-40"
                    style={{ backgroundImage: `url('/assets/bg_underwater.jpg')` }}
                  />
                )}

                {/* Radar grid overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(16,185,129,0.15)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
                <div className="absolute inset-0 border border-emerald-500/20 pointer-events-none" />

                {/* 2. SWIMMING FISH WITH CATCH TARGET ZONE */}
                <div 
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-100 flex items-center justify-center z-10"
                  style={{
                    left: `${fishPos.x}%`,
                    top: `${fishPos.y}%`,
                    width: `${diffParams.targetRadius * 2}%`,
                    height: `${diffParams.targetRadius * 2}%`
                  }}
                >
                  {/* Glowing Capture Ring */}
                  <div 
                    className={`absolute inset-0 rounded-full border-2 transition-all duration-100 ${
                      isLockedOn 
                        ? 'border-emerald-400 bg-emerald-500/30 shadow-[0_0_30px_#10b981]' 
                        : 'border-amber-400 border-dashed bg-amber-500/10 shadow-[0_0_15px_#f59e0b]'
                    }`}
                  />

                  {/* Corner Targeting Brackets */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
                    <Crosshair className={`w-full h-full stroke-[1] ${isLockedOn ? 'text-emerald-300' : 'text-amber-400'}`} />
                  </div>

                  {/* Swimming Fish Icon */}
                  <div className="text-xl sm:text-2xl filter drop-shadow-[0_2px_8px_black] animate-wiggle select-none">
                    🐟
                  </div>

                  {/* Target Label */}
                  <div className={`absolute -bottom-5 px-1.5 py-0.2 bg-black/90 border font-arcade text-[7px] truncate ${
                    isLockedOn ? 'border-emerald-400 text-emerald-300' : 'border-amber-400 text-amber-300'
                  }`}>
                    {isLockedOn ? 'ЗАХВАТ 100%' : 'ДЕРЖИ РУКУ ЗДЕСЬ'}
                  </div>
                </div>

                {/* 3. PLAYER'S HAND RETICLE (Calculated from Webcam optical tracker) */}
                {cameraStatus === 'ACTIVE' && touchPos === null && (
                  <div 
                    className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-75 flex flex-col items-center justify-center z-20"
                    style={{
                      left: `${handPos.x}%`,
                      top: `${handPos.y}%`
                    }}
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-cyan-400 bg-cyan-400/20 shadow-[0_0_15px_#22d3ee] flex items-center justify-center">
                      <Hand className="w-5 h-5 text-cyan-300 animate-pulse" />
                    </div>
                    <div className="px-1.5 py-0.5 bg-black/90 border border-cyan-400 font-arcade text-[7px] text-cyan-300 mt-1">
                      ВАША РУКА
                    </div>
                  </div>
                )}

                {/* 4. PLAYER'S FINGER RETICLE (On mobile touch screens) */}
                {touchPos !== null && (
                  <div 
                    className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-75 flex flex-col items-center justify-center z-20"
                    style={{
                      left: `${touchPos.x}%`,
                      top: `${touchPos.y}%`
                    }}
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-cyan-400 bg-cyan-400/30 shadow-[0_0_20px_#22d3ee] flex items-center justify-center text-sm">
                      👆
                    </div>
                    <div className="px-1.5 py-0.5 bg-black/90 border border-cyan-400 font-arcade text-[7px] text-cyan-300 mt-1">
                      ПАЛЕЦ
                    </div>
                  </div>
                )}

              </div>

              {/* Arena Footer Info */}
              <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono text-zinc-400 pt-1">
                <div>
                  {activeLayout === 'horizontal' ? (
                    <span>💡 <strong className="text-white">Совет:</strong> держите ладонь в поле зрения камеры и перемещайте прямо за кругом рыбы.</span>
                  ) : (
                    <span>💡 <strong className="text-white">Совет:</strong> коснитесь пальцем круга рыбы и ведите им следом за ней.</span>
                  )}
                </div>
                <div className={`px-2 py-0.5 font-arcade ${
                  isLockedOn ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {isLockedOn ? '● СВЯЗЬ АКТИВНА' : '○ ПОИСК ЦЕЛИ'}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* LOST Fish Alert */}
        {stage === 'LOST' && (
          <div className="p-6 bg-red-950/90 border-2 border-red-500 text-center font-arcade text-red-300 space-y-2 pixel-corners animate-shake shadow-[0_0_40px_rgba(239,68,68,0.6)]">
            <div className="text-lg">РЫБА СОРВАЛАСЬ!</div>
            <div className="text-xs text-zinc-300">Леска сорвалась. В следующий раз держите руку точнее над рыбой!</div>
          </div>
        )}

        {/* CATCH SUCCESS Showcase Modal (REVEAL ONLY AFTER CATCH!) */}
        {stage === 'CATCH_SUCCESS' && lastCaught && (
          <div className="pointer-events-auto p-5 sm:p-6 bg-[#08150f]/95 border-2 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.5)] text-center max-w-md w-full space-y-4 pixel-corners animate-in zoom-in-95 duration-200">
            
            <div className="font-arcade text-xs text-amber-400 tracking-wider flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ТРОФЕЙ ВЫЛОВЛЕН!</span>
            </div>

            {/* Rare SHINY Badge if rolled */}
            {lastCaught.isShiny && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-amber-500/30 via-yellow-400/30 to-amber-500/30 border-2 border-amber-300 font-arcade text-[10px] text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>✨ РЕДКАЯ МУТАЦИЯ: SHINY (+100% К ЦЕНЕ!) ✨</span>
              </div>
            )}

            {/* Fish Card Preview (REVEALED!) */}
            <div className={`relative aspect-[4/3] w-56 sm:w-64 mx-auto overflow-hidden bg-black shadow-lg transition-all ${
              lastCaught.isShiny 
                ? 'border-2 border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.7)] ring-2 ring-yellow-400/60' 
                : 'border-2 border-amber-400'
            }`}>
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
              <div className="flex items-center justify-center gap-1.5">
                {lastCaught.isShiny && <Sparkles className="w-4 h-4 text-amber-300" />}
                <h3 className={`font-arcade text-sm ${lastCaught.isShiny ? 'text-amber-200 font-bold' : 'text-white'}`}>
                  {lastCaught.fish.name} {lastCaught.isShiny ? '[SHINY]' : ''}
                </h3>
              </div>
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
                ✓ 1 экземпляр добавлен в садок! Продать его можно во вкладке «ПРОФИЛЬ».
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

      {/* 4. Bottom Controls */}
      <div className="relative z-20 px-3 sm:px-4 py-2 bg-[#06100a]/90 border-t border-emerald-500/40 flex flex-wrap justify-between items-center gap-3">
        
        <div className="flex flex-col gap-0.5 font-arcade text-[8px] sm:text-[9px] text-zinc-300">
          <div className="text-emerald-400 font-bold">СХЕМА УПРАВЛЕНИЯ:</div>
          <div><span className="text-cyan-400">[ПК]</span> Наводите физическую ладонь на рыбу прямо в окне камеры</div>
          <div><span className="text-amber-400">[ТЕЛЕФОН]</span> Прижимайте палец к рыбе на экране и ведите за ней</div>
        </div>

        <div className="font-arcade text-[8px] sm:text-[9px] text-emerald-400 ml-auto">
          {cameraStatus === 'ACTIVE' ? '● ВЕБ-КАМЕРА: 60 FPS' : '○ ОЖИДАНИЕ КАМЕРЫ'}
        </div>

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
                    Управление «Рука на рыбе»: веб-камера на ПК и палец на смартфоне
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
              
              <div className="p-3 bg-black/60 border border-emerald-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-white">ВЕБ-КАМЕРА НА ПК ИЛИ ПАЛЕЦ НА ТЕЛЕФОНЕ</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    RODMAX работает через прямое физическое взаимодействие. На компьютере вы управляете положением своей ладони в окне веб-камеры, а на телефоне — пальцем по экрану.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-black/60 border border-emerald-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-white">ЗАБРОС СНАСТИ</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    Сделайте взмах рукой вверх перед камерой или нажмите кнопку «Забросить удочку». Снасть уйдет на океанскую глубину.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-black/60 border border-amber-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-amber-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-amber-300">ПОДСЕЧКА (! КЛЮЕТ !)</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    Когда раздастся резкий сигнал и появится «! КЛЮЕТ !», резко взмахните рукой вверх перед камерой или нажмите кнопку «Подсечь рыбу».
                  </p>
                </div>
              </div>

              <div className="p-3 bg-black/60 border border-cyan-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-cyan-400 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  4
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-cyan-300">ВЫВАЖИВАНИЕ: «РУКА НА РЫБЕ»</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    В окне арены плавает рыба в круге цели. <strong className="text-white">На ПК:</strong> поместите ладонь в кадр камеры и держите маркер ладони прямо на рыбе. <strong className="text-white">На смартфоне:</strong> прижмите палец к рыбе и ведите за ней. Шкала вываживания будет быстро расти до 100%!
                  </p>
                </div>
              </div>

              <div className="p-3 bg-black/60 border border-emerald-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  5
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-emerald-400">СЛОЖНОСТЬ И ТРОФЕИ</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    Чем круче и реже рыба — тем меньше круг захвата и тем быстрее она маневрирует. Поймайте редчайшую Неоновую Медузу (0.2%) или Небесного Кита!
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
