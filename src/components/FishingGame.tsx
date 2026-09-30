import React, { useState, useEffect, useRef } from 'react';
import { AnglerProfile, FishItem, CaughtFish, TabType, RarityType } from '../types';
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
  Hand,
  Volume2,
  AlertTriangle,
  Target,
  Crosshair,
  Lightbulb,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getFishName, getFishDescription, getRarityName } from '../i18n/translations';

interface FishingGameProps {
  profile: AnglerProfile;
  onCatchFish: (c: CaughtFish) => void;
  openBestiary: () => void;
  setTab?: (tab: TabType) => void;
}

type GameStage = 'IDLE' | 'CASTING' | 'WAITING' | 'BITE' | 'REELING' | 'LANDING' | 'CATCH_SUCCESS' | 'LOST';

interface Position2D {
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
}

// Module-level cache flag so preloading only happens once per session
let isGlobalAssetsPreloaded = false;

const ASSETS_TO_PRELOAD = [
  { type: 'video', url: '/assets/video_reeling_idle.mp4', label: 'Океан' },
  { type: 'video', url: '/assets/video_catch_boot.mp4', label: 'Старый сапог' },
  { type: 'video', url: '/assets/video_catch_salmon.mp4', label: 'Серебристый лосось' },
  { type: 'video', url: '/assets/video_catch_fish.mp4', label: 'Золотой карась' },
  { type: 'video', url: '/assets/video_catch_generic.mp4', label: 'Глубинный удильщик' },
  { type: 'video', url: '/assets/video_catch_megalodon.mp4', label: 'Доисторический мегалодон' },
  { type: 'video', url: '/assets/video_catch_sea_serpent.mp4', label: 'Левиафан бездны' },
  { type: 'video', url: '/assets/video_catch_celestial_whale.mp4', label: 'Солнечный кит' },
  { type: 'video', url: '/assets/video_jellyfish_emerge.mp4', label: 'Арканная медуза' },
  { type: 'image', url: '/assets/card_boot.jpg', label: 'Карточка: Сапог' },
  { type: 'image', url: '/assets/card_salmon.jpg', label: 'Карточка: Лосось' },
  { type: 'image', url: '/assets/card_goldfish.jpg', label: 'Карточка: Карась' },
  { type: 'image', url: '/assets/card_anglerfish.jpg', label: 'Карточка: Удильщик' },
  { type: 'image', url: '/assets/card_megalodon.jpg', label: 'Карточка: Мегалодон' },
  { type: 'image', url: '/assets/card_sea_serpent.jpg', label: 'Карточка: Левиафан' },
  { type: 'image', url: '/assets/card_celestial_whale.jpg', label: 'Карточка: Солнечный кит' },
  { type: 'image', url: '/assets/card_arcane_jellyfish.jpg', label: 'Карточка: Медуза' }
];

export const FishingGame: React.FC<FishingGameProps> = ({ profile, onCatchFish, openBestiary, setTab }) => {
  const { language, t } = useLanguage();
  const [stage, setStage] = useState<GameStage>('IDLE');
  const stageRef = useRef<GameStage>('IDLE');
  const [targetFish, setTargetFish] = useState<FishItem>(FISH_DATABASE[1]);
  const targetFishRef = useRef<FishItem>(FISH_DATABASE[1]);
  const [lastCaught, setLastCaught] = useState<CaughtFish | null>(null);
  const [isCatchCardRevealed, setIsCatchCardRevealed] = useState(false);
  const catchCinematicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Asset Preloader State
  const [isPreloading, setIsPreloading] = useState(!isGlobalAssetsPreloaded);
  const [preloadProgress, setPreloadProgress] = useState(isGlobalAssetsPreloaded ? 100 : 0);
  const [preloadStatus, setPreloadStatus] = useState('Загрузка ресурсов...');

  // Guide modal state
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [controlWarning, setControlWarning] = useState<string | null>(null);

  // Webcam Motion Tracking State
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraStatus, setCameraStatus] = useState<'ACTIVE' | 'CONNECTING' | 'DENIED' | 'OFF'>('CONNECTING');
  const [motionIntensity, setMotionIntensity] = useState(0);

  // 2D Coordinates for Fish & Player Hand inside the Camera Catch Arena
  const [fishPos, setFishPos] = useState<Position2D>({ x: 50, y: 50 });
  const [handPos, setHandPos] = useState<Position2D>({ x: 50, y: 50 });
  const [isLockedOn, setIsLockedOn] = useState(false);
  const [catchProgress, setCatchProgress] = useState(50);
  const [offTargetMs, setOffTargetMs] = useState(0); // Cumulative off-target ms (max 2500)
  const [lostReason, setLostReason] = useState<string | null>(null);

  // Performance & Video refs
  const arenaVideoRef = useRef<HTMLVideoElement>(null);
  const lastReelClickTimeRef = useRef(0);
  const lastReportedMotionRef = useRef(0);
  const isLockedOnRef = useRef(false);
  const lastReportedProgressRef = useRef(0);
  const lastCastTimeRef = useRef(0);

  // Thumbs Up (👍) Gesture Detection & Cast Charge State
  const [isThumbsUp, setIsThumbsUp] = useState(false);
  const [isWrongGesture, setIsWrongGesture] = useState(false);
  const [thumbsUpHoldProgress, setThumbsUpHoldProgress] = useState(0);
  const thumbsUpCounterRef = useRef(0);
  const wrongGestureCounterRef = useRef(0);
  const thumbsUpHoldCountRef = useRef(0);
  const idleEnterTimeRef = useRef(Date.now());

  // Assistance & Hints State (idle hint and consecutive fails assistance)
  const [showIdleHint, setShowIdleHint] = useState(false);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const consecutiveFailsRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // False Start / Early Twitch Penalty State (Fault Mode)
  const [isFoul, setIsFoul] = useState(false);
  const [foulTimeLeft, setFoulTimeLeft] = useState(2.0);
  const foulIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFoulTimeRef = useRef(0);

  // 1.10s Strike Window State
  const [biteTimeLeft, setBiteTimeLeft] = useState(1.10);
  const biteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1.0s Rapid Acceptance Window State
  const [landingTimeLeft, setLandingTimeLeft] = useState(1.0);
  const landingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Guard refs to prevent duplicate catch bug!
  const isRoundFinishedRef = useRef(false);
  const hasAwardedRef = useRef(false);
  const biteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cumulative Off-Target Timeout: snaps if total off-target time reaches 2500ms
  const cumulativeOffTargetMsRef = useRef(0);
  const lastTickTimeRef = useRef(Date.now());

  // Physics refs
  const fishPosRef = useRef<Position2D>({ x: 50, y: 50 });
  const fishTargetRef = useRef<Position2D>({ x: 50, y: 50 });
  const fishTimerRef = useRef(0);
  const handPosRef = useRef<Position2D>({ x: 50, y: 50 });
  const handAnchorRef = useRef<Position2D>({ x: 64, y: 60 }); // Localized canvas anchor (0..128, 0..96) to isolate hand from face
  const lastWarningSoundTime = useRef(0);
  const currentProgressRef = useRef(50);

  // Camera & Canvas refs
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgBufferRef = useRef<Float32Array | null>(null); // Running background model for static object rejection
  const activityMapRef = useRef<Uint8Array | null>(null); // Motion History Image (MHI) to isolate dynamic hand from room objects
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);

  // Direct DOM refs for 60 FPS Reeling & Optical HUD (Zero React re-renders)
  const fishRingRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const hudReticleRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);
  const offTargetBarRef = useRef<HTMLDivElement>(null);
  const offTargetTextRef = useRef<HTMLSpanElement>(null);
  const offTargetToleranceRef = useRef<HTMLSpanElement>(null);
  const motionIntensityTextRef = useRef<HTMLSpanElement>(null);

  // Simulated depth
  const [depth, setDepth] = useState(45);

  // Initial progress by rarity tier (High base progress for fast, snappy reeling)
  const getInitialProgress = (rarity: RarityType) => {
    switch (rarity) {
      case 'COMMON': return 60;
      case 'UNCOMMON': return 55;
      case 'RARE': return 50;
      case 'EPIC': return 48;
      case 'MYTHIC': return 45;
      case 'SECRET': return 42;
      case 'GODLY': return 40;
      case 'ARCANE': return 38;
      default: return 45;
    }
  };

  // Scaled Difficulty Parameters: Fast arcade reeling (2 - 3.5 seconds total hold time)
  // Balanced to be responsive, fair, and achievable with optical webcam tracking
  const getFishDifficultyParams = (fish: FishItem) => {
    switch (fish.rarity) {
      case 'COMMON':
        // Fast catch (~1.5s - 2.0s)
        return { targetRadius: 28, swimSpeed: 0.10, gain: 2.6, loss: 0.28, changeInterval: 45, evasion: 0.0 };
      case 'UNCOMMON':
        // Snappy catch (~1.8s - 2.2s)
        return { targetRadius: 24, swimSpeed: 0.13, gain: 2.2, loss: 0.32, changeInterval: 32, evasion: 0.04 };
      case 'RARE':
        // Dynamic (~2.0s - 2.5s)
        return { targetRadius: 21, swimSpeed: 0.17, gain: 2.0, loss: 0.36, changeInterval: 24, evasion: 0.06 };
      case 'EPIC':
        // Lively (~2.2s - 2.8s)
        return { targetRadius: 19, swimSpeed: 0.20, gain: 1.8, loss: 0.40, changeInterval: 20, evasion: 0.08 };
      case 'MYTHIC':
        // Agile (~2.5s - 3.0s)
        return { targetRadius: 17, swimSpeed: 0.24, gain: 1.7, loss: 0.42, changeInterval: 16, evasion: 0.10 };
      case 'SECRET':
        // Evasive (~2.8s - 3.2s)
        return { targetRadius: 16, swimSpeed: 0.27, gain: 1.6, loss: 0.45, changeInterval: 14, evasion: 0.12 };
      case 'GODLY':
        // Elite (~3.0s - 3.4s)
        return { targetRadius: 15, swimSpeed: 0.30, gain: 1.5, loss: 0.48, changeInterval: 12, evasion: 0.14 };
      case 'ARCANE':
        // Boss tier (~3.2s - 3.6s)
        return { targetRadius: 14, swimSpeed: 0.33, gain: 1.4, loss: 0.50, changeInterval: 10, evasion: 0.15 };
      default:
        return { targetRadius: 18, swimSpeed: 0.18, gain: 1.8, loss: 0.38, changeInterval: 22, evasion: 0.08 };
    }
  };

  const diffParams = getFishDifficultyParams(targetFish);


  // 1. Initialize Webcam Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (cameraEnabled) {
      setCameraStatus('CONNECTING');
      navigator.mediaDevices?.getUserMedia({ 
        video: { 
          width: { ideal: 480 }, 
          height: { ideal: 360 }, 
          frameRate: { ideal: 60, min: 30 },
          facingMode: 'user' 
        }
      })
      .then((s) => {
        stream = s;
        mediaStreamRef.current = s;
        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = s;
          webcamVideoRef.current.play().catch(() => {});
        }
        setCameraStatus('ACTIVE');
      })
      .catch(() => {
        setCameraStatus('DENIED');
      });
    } else {
      setCameraStatus('OFF');
      mediaStreamRef.current = null;
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

  // Keep stageRef always synchronized with current stage
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // Ensure webcam video elements get the stream attached as soon as they mount
  useEffect(() => {
    if (webcamVideoRef.current && mediaStreamRef.current && webcamVideoRef.current.srcObject !== mediaStreamRef.current) {
      webcamVideoRef.current.srcObject = mediaStreamRef.current;
      webcamVideoRef.current.play().catch(() => {});
    }
    if (arenaVideoRef.current && mediaStreamRef.current && arenaVideoRef.current.srcObject !== mediaStreamRef.current) {
      arenaVideoRef.current.srcObject = mediaStreamRef.current;
      arenaVideoRef.current.play().catch(() => {});
    }
  }, [cameraStatus, cameraEnabled, stage]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (biteTimeoutRef.current) clearTimeout(biteTimeoutRef.current);
      if (landingIntervalRef.current) clearInterval(landingIntervalRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
      if (foulIntervalRef.current) clearInterval(foulIntervalRef.current);
      if (biteIntervalRef.current) clearInterval(biteIntervalRef.current);
      if (catchCinematicTimerRef.current) clearTimeout(catchCinematicTimerRef.current);
    };
  }, []);

  // Concurrent Asset Preloader (Buffers all 17 videos and cards into memory/browser disk cache)
  useEffect(() => {
    if (isGlobalAssetsPreloaded) {
      setIsPreloading(false);
      return;
    }

    let isMounted = true;
    let completed = 0;
    const total = ASSETS_TO_PRELOAD.length;

    const onAssetLoaded = (label: string) => {
      completed++;
      if (!isMounted) return;
      const pct = Math.min(100, Math.round((completed / total) * 100));
      setPreloadProgress(pct);
      setPreloadStatus(label);

      if (completed >= total) {
        setTimeout(() => {
          if (isMounted) {
            isGlobalAssetsPreloaded = true;
            setIsPreloading(false);
            sound.playReelClick();
          }
        }, 350);
      }
    };

    // Preload each asset concurrently:
    ASSETS_TO_PRELOAD.forEach(async (asset) => {
      try {
        if (asset.type === 'video') {
          // Fetch into browser cache so it's instantly available without network delay
          const res = await fetch(asset.url);
          if (res.ok) {
            await res.blob();
          }
        } else {
          // Image preload
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.src = asset.url;
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 3000);
          });
        }
      } catch {
        // Continue even if an individual asset fails
      }
      onAssetLoaded(asset.label);
    });

    // Safety fallback: if anything hangs, guarantee game starts within 5s
    const timeout = setTimeout(() => {
      if (isMounted && !isGlobalAssetsPreloaded) {
        isGlobalAssetsPreloaded = true;
        setPreloadProgress(100);
        setIsPreloading(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, []);

  // Idle Hint Timer & Grace Period Tracker
  useEffect(() => {
    if (stage === 'IDLE') {
      idleEnterTimeRef.current = Date.now();
      thumbsUpHoldCountRef.current = 0;
      setThumbsUpHoldProgress(0);
      setIsThumbsUp(false);
      setIsWrongGesture(false);
      thumbsUpCounterRef.current = 0;
      wrongGestureCounterRef.current = 0;
      idleTimerRef.current = setTimeout(() => {
        setShowIdleHint(true);
      }, 6500);
    } else {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      setShowIdleHint(false);
      thumbsUpHoldCountRef.current = 0;
      setThumbsUpHoldProgress(0);
      setIsThumbsUp(false);
      setIsWrongGesture(false);
      thumbsUpCounterRef.current = 0;
      wrongGestureCounterRef.current = 0;
    }

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [stage]);

  // 2. Optical Motion & Fingertip Direction Tracking Loop (Direct DOM + Extremity Apex)
  useEffect(() => {
    if (cameraStatus !== 'ACTIVE') return;

    let prevPixels: Uint8ClampedArray | null = null;
    const interval = setInterval(() => {
      const video = webcamVideoRef.current;
      const canvas = motionCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      if (canvas.width !== 128) canvas.width = 128;
      if (canvas.height !== 96) canvas.height = 96;
      ctx.drawImage(video, 0, 0, 128, 96);

      const frame = ctx.getImageData(0, 0, 128, 96);
      const data = frame.data;

      // Initialize background model and motion history buffer
      if (!bgBufferRef.current || bgBufferRef.current.length !== 128 * 96 * 3) {
        bgBufferRef.current = new Float32Array(128 * 96 * 3);
        for (let i = 0; i < data.length; i++) {
          bgBufferRef.current[i] = data[i];
        }
      }
      if (!activityMapRef.current || activityMapRef.current.length !== 128 * 96) {
        activityMapRef.current = new Uint8Array(128 * 96);
      }

      const bg = bgBufferRef.current;
      const activityMap = activityMapRef.current;

      if (prevPixels) {
        let diffSum = 0;
        let motionWeightedX = 0;
        let motionWeightedY = 0;
        let motionPoints = 0;

        const rawSkinMask = new Uint8Array(128 * 96);
        const skinMask = new Uint8Array(128 * 96);
        const isFaceZone = new Uint8Array(128 * 96);

        // --- PASS 1: Background Subtraction, MHI & Human Skin Chromaticity ---
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];

          const lumNow = (r + g + b) / 3;
          const lumPrev = (prevPixels[i] + prevPixels[i+1] + prevPixels[i+2]) / 3;
          const diff = Math.abs(lumNow - lumPrev);

          const pixelIdx = i / 4;

          // 1. Strict Human Skin Chromaticity Filter in Normalized (r, g) Space
          // Rejects wood frames, brown paint, yellow light, beige wallpaper, and posters
          let isChromaSkin = false;
          const sum = r + g + b;
          if (sum > 90 && sum < 680) {
            const normR = r / sum;
            const normG = g / sum;

            isChromaSkin = (normR >= 0.36 && normR <= 0.58) &&
                           (normG >= 0.25 && normG <= 0.38) &&
                           (normR > normG) &&
                           (r > g && g > b) &&
                           (r - g >= 12) &&
                           (r - b >= 22) &&
                           ((r - g) < 85);
          }

          // 2. Running Background Subtraction (Foreground vs Background Wall/Painting)
          const bgR = bg[i];
          const bgG = bg[i+1];
          const bgB = bg[i+2];
          const fgDiff = (Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB)) / 3;

          // Background adapts ONLY to stationary NON-SKIN pixels (wall/posters)
          // NEVER absorbs skin pixels into the background model so hand never fades out!
          if (diff <= 6 && !isChromaSkin) {
            bg[i] += (r - bgR) * 0.025;
            bg[i+1] += (g - bgG) * 0.025;
            bg[i+2] += (b - bgB) * 0.025;
          }

          // 3. Motion History Image (MHI): Tracks recent activity for 45 ticks (~1.5s)
          if (diff > 12) {
            activityMap[pixelIdx] = 45;
          } else if (activityMap[pixelIdx] > 0) {
            activityMap[pixelIdx]--;
          }

          // A pixel is candidate skin if it matches chromaticity AND is foreground (or recent motion)
          if (isChromaSkin && (fgDiff > 12 || activityMap[pixelIdx] > 0 || diff > 6)) {
            rawSkinMask[pixelIdx] = 1;
          }
        }

        // --- PASS 2: Face & Head Zone Detection & Absolute Suppression ---
        // Locate user's head/face cluster in the upper frame (y <= 48, x in [16, 112])
        let faceSkinCount = 0;
        let faceMinX = 128, faceMaxX = 0, faceMinY = 96, faceMaxY = 0;
        for (let y = 0; y <= 48; y++) {
          const rowOffset = y * 128;
          for (let x = 16; x <= 112; x++) {
            if (rawSkinMask[rowOffset + x] === 1) {
              faceSkinCount++;
              if (x < faceMinX) faceMinX = x;
              if (x > faceMaxX) faceMaxX = x;
              if (y < faceMinY) faceMinY = y;
              if (y > faceMaxY) faceMaxY = y;
            }
          }
        }

        // A face is a large, wide cluster (>= 40px area, width >= 16px).
        // If detected, create an exclusion safety bounding box that covers head, chin and neck!
        if (faceSkinCount >= 40 && (faceMaxX - faceMinX) >= 16) {
          const faceBoxMinX = Math.max(0, faceMinX - 5);
          const faceBoxMaxX = Math.min(127, faceMaxX + 5);
          const faceBoxMinY = Math.max(0, faceMinY - 4);
          const faceBoxMaxY = Math.min(95, faceMaxY + 12); // Extends downward over chin/neck

          for (let fy = faceBoxMinY; fy <= faceBoxMaxY; fy++) {
            const rowOffset = fy * 128;
            for (let fx = faceBoxMinX; fx <= faceBoxMaxX; fx++) {
              isFaceZone[rowOffset + fx] = 1;
            }
          }
        }

        // --- PASS 3: Filtered Hand Skin Mask & Hand-Only Motion Extraction ---
        for (let y = 0; y < 96; y++) {
          const rowOffset = y * 128;
          for (let x = 0; x < 128; x++) {
            const pixelIdx = rowOffset + x;

            // Only pixels OUTSIDE the face zone and below the upper hair line can be hand
            if (rawSkinMask[pixelIdx] === 1 && isFaceZone[pixelIdx] === 0 && y >= 16) {
              skinMask[pixelIdx] = 1;
            }

            // Gated Hand Motion: ONLY moving hand skin pixels count toward motion & gestures!
            // Head/face movements, clothing movements, background sway are 100% IGNORED!
            const i = pixelIdx * 4;
            const lumNow = (data[i] + data[i+1] + data[i+2]) / 3;
            const lumPrev = (prevPixels[i] + prevPixels[i+1] + prevPixels[i+2]) / 3;
            const diff = Math.abs(lumNow - lumPrev);

            if (diff > 13 && skinMask[pixelIdx] === 1 && y >= 20) {
              diffSum += diff;
              motionWeightedX += x;
              motionWeightedY += y;
              motionPoints++;
            }
          }
        }

        const avgMotion = Math.min(100, Math.floor(diffSum / 480));
        // Direct DOM update for motion percentage in HUD
        if (motionIntensityTextRef.current && Math.abs(avgMotion - lastReportedMotionRef.current) >= 2) {
          lastReportedMotionRef.current = avgMotion;
          motionIntensityTextRef.current.textContent = `${avgMotion}%`;
          motionIntensityTextRef.current.className = avgMotion > 20 ? 'text-emerald-400 font-bold' : 'text-zinc-500';
        }

        // =========================================================================================
        // STRICT INDEX FINGERTIP TRACKER (Zero Palm, Zero Wrist, Zero Forearm, Zero Body)
        // =========================================================================================
        let handSkinCount = 0;
        let handMinX = 128, handMaxX = 0, handMinY = 96, handMaxY = 0;
        let handSumX = 0, handSumY = 0;

        // 1. Scan clean hand skin mask (outside face zone, y >= 16) to find hand bounding box and centroid
        for (let y = 16; y <= 95; y++) {
          const rowOffset = y * 128;
          for (let x = 0; x < 128; x++) {
            if (skinMask[rowOffset + x] === 1) {
              handSkinCount++;
              handSumX += x;
              handSumY += y;
              if (x < handMinX) handMinX = x;
              if (x > handMaxX) handMaxX = x;
              if (y < handMinY) handMinY = y;
              if (y > handMaxY) handMaxY = y;
            }
          }
        }

        let rawTargetX: number | null = null;
        let rawTargetY: number | null = null;

        // 2. Only proceed if there is a real hand presence
        if (handSkinCount >= 10) {
          // The true fingertip apex is strictly the topmost row of the hand cluster: handMinY
          const tipY = handMinY;

          // Find the exact horizontal subpixel center of the fingertip at handMinY (and handMinY + 1)
          let tipSumX = 0;
          let tipPixels = 0;
          const maxRow = Math.min(handMinY + 1, handMaxY);

          for (let y = handMinY; y <= maxRow; y++) {
            const rowOffset = y * 128;
            for (let x = handMinX; x <= handMaxX; x++) {
              if (skinMask[rowOffset + x] === 1) {
                tipSumX += x;
                tipPixels++;
              }
            }
          }

          if (tipPixels > 0) {
            const tipX = tipSumX / tipPixels;

            // Mirrored X for natural mirror orientation
            rawTargetX = (1 - tipX / 128) * 100;
            rawTargetY = (tipY / 96) * 100;

            handAnchorRef.current.x = tipX;
            handAnchorRef.current.y = tipY;
          }
        }

        if (rawTargetX !== null && rawTargetY !== null) {
          const currentX = handPosRef.current.x;
          const currentY = handPosRef.current.y;

          const dx = rawTargetX - currentX;
          const dy = rawTargetY - currentY;
          const distance = Math.hypot(dx, dy);

          // Fast 60 FPS responsive filter with ZERO lag:
          // Low latency: 0.70 for micro-adjustments, up to 0.96 for fast movements
          let alpha = 0.75;
          if (distance <= 0.3) {
            alpha = 0.50; // Jitter suppression when resting
          } else if (distance > 2.0) {
            alpha = 0.96; // Instant 1:1 snap on movement
          } else {
            alpha = 0.50 + ((distance - 0.3) / 1.7) * 0.46;
          }

          handPosRef.current.x += dx * alpha;
          handPosRef.current.y += dy * alpha;

          // Clamped strictly within arena boundaries
          handPosRef.current.x = Math.max(3, Math.min(97, handPosRef.current.x));
          handPosRef.current.y = Math.max(3, Math.min(97, handPosRef.current.y));

          // Direct DOM updates: ZERO React re-renders!
          const posX = handPosRef.current.x.toFixed(1);
          const posY = handPosRef.current.y.toFixed(1);

          if (reticleRef.current) {
            reticleRef.current.style.left = `${posX}%`;
            reticleRef.current.style.top = `${posY}%`;
          }
          if (hudReticleRef.current) {
            hudReticleRef.current.style.left = `${posX}%`;
            hudReticleRef.current.style.top = `${posY}%`;
          }
        }

        // 1. FAULT TRIGGER: Early twitch in WAITING stage scares fish
        if (stage === 'WAITING' && avgMotion > 16) {
          triggerEarlyFoul();
        }
        // 2. STRIKE: Ultra-low latency strike trigger in BITE stage
        else if (stage === 'BITE' && avgMotion > 12) {
          handleStrike();
        }
        // 3. LANDING: Quick gesture in LANDING stage
        else if (stage === 'LANDING' && avgMotion > 16) {
          handleAcceptCatch();
        }

        // LOW-THRESHOLD THUMBS UP (👍) GESTURE DETECTOR
        // Runs in IDLE, CATCH_SUCCESS, LOST using isolated hand cluster
        if (stage === 'IDLE' || stage === 'CATCH_SUCCESS' || stage === 'LOST') {
          let isThumbsUpCandidate = false;
          let isWrongGestureCandidate = false;

          if (handSkinCount >= 20 && (handMaxY - handMinY) >= 12 && (handMaxX - handMinX) >= 10) {
            const handH = handMaxY - handMinY + 1;
            const handW = handMaxX - handMinX + 1;
            const topBoundary = handMinY + Math.max(4, Math.floor(handH * 0.40));

            let topPixels = 0;
            let bottomPixels = 0;
            let topMinX = 128, topMaxX = 0;
            let bottomMinX = 128, bottomMaxX = 0;

            for (let y = handMinY; y <= handMaxY; y++) {
              const rowOffset = y * 128;
              for (let x = handMinX; x <= handMaxX; x++) {
                if (skinMask[rowOffset + x] === 1) {
                  if (y <= topBoundary) {
                    topPixels++;
                    if (x < topMinX) topMinX = x;
                    if (x > topMaxX) topMaxX = x;
                  } else {
                    bottomPixels++;
                    if (x < bottomMinX) bottomMinX = x;
                    if (x > bottomMaxX) bottomMaxX = x;
                  }
                }
              }
            }

            const topW = topMaxX >= topMinX ? (topMaxX - topMinX + 1) : 0;
            const bottomW = bottomMaxX >= bottomMinX ? (bottomMaxX - bottomMinX + 1) : 0;

            const isNarrowThumb = topW > 0 && bottomW > 0 && topW <= Math.max(5, Math.floor(bottomW * 0.70));
            const isSolidFist = bottomPixels >= Math.max(12, Math.floor(topPixels * 1.25));
            const isVerticalHand = handH >= handW * 0.55 && handH <= handW * 2.6;
            const hasThumbProtrusion = topPixels >= 4;

            if (isNarrowThumb && isSolidFist && isVerticalHand && hasThumbProtrusion) {
              isThumbsUpCandidate = true;
            } else {
              isWrongGestureCandidate = true;
            }
          }

          if (isThumbsUpCandidate) {
            thumbsUpCounterRef.current = Math.min(6, thumbsUpCounterRef.current + 2);
            wrongGestureCounterRef.current = Math.max(0, wrongGestureCounterRef.current - 2);
          } else {
            thumbsUpCounterRef.current = Math.max(0, thumbsUpCounterRef.current - 1);
          }

          const thumbsUpActive = thumbsUpCounterRef.current >= 2;
          setIsThumbsUp(thumbsUpActive);

          if (isWrongGestureCandidate && !thumbsUpActive) {
            wrongGestureCounterRef.current = Math.min(6, wrongGestureCounterRef.current + 2);
          } else {
            wrongGestureCounterRef.current = Math.max(0, wrongGestureCounterRef.current - 1);
          }

          const wrongGestureActive = !thumbsUpActive && wrongGestureCounterRef.current >= 2;
          setIsWrongGesture(wrongGestureActive);

          const now = Date.now();
          const isEligibleToCast = stage === 'IDLE' && (now - idleEnterTimeRef.current >= 1200);

          if (isEligibleToCast) {
            if (thumbsUpActive) {
              thumbsUpHoldCountRef.current = Math.min(10, thumbsUpHoldCountRef.current + 1);
            } else {
              thumbsUpHoldCountRef.current = Math.max(0, thumbsUpHoldCountRef.current - 2);
            }

            const progress = Math.round((thumbsUpHoldCountRef.current / 10) * 100);
            setThumbsUpHoldProgress(progress);

            if (progress >= 100) {
              handleCast();
              thumbsUpHoldCountRef.current = 0;
              setThumbsUpHoldProgress(0);
            }
          } else {
            thumbsUpHoldCountRef.current = 0;
            setThumbsUpHoldProgress(0);
          }
        } else {
          thumbsUpCounterRef.current = 0;
          wrongGestureCounterRef.current = 0;
          thumbsUpHoldCountRef.current = 0;
          setIsThumbsUp(false);
          setIsWrongGesture(false);
          setThumbsUpHoldProgress(0);
        }
      }

      prevPixels = new Uint8ClampedArray(data);
    }, 16);

    return () => clearInterval(interval);
  }, [cameraStatus, stage]);

  // Cast Handler (Triggered exclusively by mouse click / hotkey)
  const handleCast = () => {
    if (stage !== 'IDLE' && stage !== 'CATCH_SUCCESS' && stage !== 'LOST') return;

    const now = Date.now();
    if (now - lastCastTimeRef.current < 400) return;
    lastCastTimeRef.current = now;

    // Reset round guards completely
    isRoundFinishedRef.current = false;
    hasAwardedRef.current = false;
    setLostReason(null);
    setControlWarning(null);
    setIsFoul(false);
    setFoulTimeLeft(2.0);
    setShowIdleHint(false);
    thumbsUpHoldCountRef.current = 0;
    setThumbsUpHoldProgress(0);
    setIsThumbsUp(false);
    setIsWrongGesture(false);
    thumbsUpCounterRef.current = 0;
    wrongGestureCounterRef.current = 0;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    // Clear any timers
    if (biteIntervalRef.current) {
      clearInterval(biteIntervalRef.current);
      biteIntervalRef.current = null;
    }
    if (biteTimeoutRef.current) {
      clearTimeout(biteTimeoutRef.current);
      biteTimeoutRef.current = null;
    }
    if (landingIntervalRef.current) {
      clearInterval(landingIntervalRef.current);
      landingIntervalRef.current = null;
    }
    if (foulIntervalRef.current) {
      clearInterval(foulIntervalRef.current);
      foulIntervalRef.current = null;
    }
    if (waitingTimerRef.current) {
      clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }
    if (catchCinematicTimerRef.current) {
      clearTimeout(catchCinematicTimerRef.current);
      catchCinematicTimerRef.current = null;
    }
    setIsCatchCardRevealed(false);

    sound.playCast();
    setStage('CASTING');
    stageRef.current = 'CASTING';
    setDepth(30 + Math.floor(Math.random() * 220));

    setTimeout(() => {
      sound.playSplash();
      setStage('WAITING');
      stageRef.current = 'WAITING';
      const biteDelay = 2600 + Math.random() * 3200; // 2.6s to 5.8s realistic suspense
      scheduleBite(biteDelay);
    }, 900);
  };

  const scheduleBite = (delayMs: number) => {
    if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
    waitingTimerRef.current = setTimeout(() => {
      triggerBiteSequence();
    }, delayMs);
  };

  const triggerBiteSequence = () => {
    if (stageRef.current !== 'WAITING' || isRoundFinishedRef.current) return;

    if (foulIntervalRef.current) {
      clearInterval(foulIntervalRef.current);
      foulIntervalRef.current = null;
    }
    setIsFoul(false);

    sound.playBite();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([120, 60, 120]);
    }
    const rolled = rollFish();
    targetFishRef.current = rolled;
    setTargetFish(rolled);
    setStage('BITE');
    stageRef.current = 'BITE';

    // Strike window: 1.10s for fair reaction time with optical camera
    setBiteTimeLeft(1.10);
    if (biteIntervalRef.current) clearInterval(biteIntervalRef.current);
    const biteStart = Date.now();
    const biteDuration = 1100; // 1.10s!

    biteIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, (biteDuration - (Date.now() - biteStart)) / 1000);
      setBiteTimeLeft(Math.round(remaining * 100) / 100);

      if (remaining <= 0) {
        if (biteIntervalRef.current) {
          clearInterval(biteIntervalRef.current);
          biteIntervalRef.current = null;
        }
        isRoundFinishedRef.current = true;
        sound.playSnap();
        triggerLost('ВЫ НЕ УСПЕЛИ РЕЗКО ПОДВИНУТЬ ПАЛЕЦ В КАМЕРУ ЗА 1.1 СЕК! Рыба сорвалась с крючка!');
      }
    }, 20);
  };

  // Fault Mode: Early twitch / false movement penalty during WAITING stage
  const triggerEarlyFoul = () => {
    if (stageRef.current !== 'WAITING') return;

    const now = Date.now();
    if (now - lastFoulTimeRef.current > 400) {
      sound.playSnap();
      lastFoulTimeRef.current = now;
    }

    setIsFoul(true);
    setFoulTimeLeft(2.0);

    // Push back bite by adding 2.0s penalty + 2.5s to 4.5s calm-down delay
    if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
    const penaltyDelay = 2000 + 2500 + Math.random() * 2000;
    waitingTimerRef.current = setTimeout(() => {
      triggerBiteSequence();
    }, penaltyDelay);

    // Reset or start 2.0s countdown
    if (foulIntervalRef.current) clearInterval(foulIntervalRef.current);
    const foulStart = Date.now();
    foulIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - foulStart;
      const left = Math.max(0, (2000 - elapsed) / 1000);
      setFoulTimeLeft(Math.round(left * 10) / 10);

      if (left <= 0) {
        if (foulIntervalRef.current) {
          clearInterval(foulIntervalRef.current);
          foulIntervalRef.current = null;
        }
        setIsFoul(false);
      }
    }, 100);
  };

  // Strike Handler: Enters the Reeling Phase where player holds their finger on the moving target area!
  const handleStrike = () => {
    if (stageRef.current !== 'BITE') return;
    if (biteIntervalRef.current) {
      clearInterval(biteIntervalRef.current);
      biteIntervalRef.current = null;
    }
    if (biteTimeoutRef.current) {
      clearTimeout(biteTimeoutRef.current);
      biteTimeoutRef.current = null;
    }
    sound.playReelClick();
    
    // Reset round guards to prevent duplicate catches!
    isRoundFinishedRef.current = false;
    hasAwardedRef.current = false;

    // Reset positions to center
    fishPosRef.current = { x: 50, y: 50 };
    fishTargetRef.current = { x: 50, y: 50 };
    fishTimerRef.current = 0;

    // Dynamic starting progress by rarity tier
    const startProgress = getInitialProgress(targetFish.rarity);
    currentProgressRef.current = startProgress;
    setCatchProgress(startProgress);

    // Reset cumulative off-target timer (2.8s tolerance)
    cumulativeOffTargetMsRef.current = 0;
    setOffTargetMs(0);
    lastTickTimeRef.current = Date.now();

    setFishPos({ x: 50, y: 50 });
    setIsLockedOn(false);
    setControlWarning(null);
    setStage('REELING');
    stageRef.current = 'REELING';
  };

  // 3. REELING TICK LOOP: Direct "Finger on Fish" Mechanic with Active Evasion & 1.5s Cumulative Snap!
  useEffect(() => {
    if (stage !== 'REELING') return;

    lastTickTimeRef.current = Date.now();

    const loop = setInterval(() => {
      if (isRoundFinishedRef.current) return;

      const now = Date.now();
      const deltaMs = Math.min(100, Math.max(10, now - lastTickTimeRef.current));
      lastTickTimeRef.current = now;

      // 1. LIVELY FISH SWIMMING MOVEMENT INSIDE EXPANDED ARENA BOUNDS
      fishTimerRef.current--;
      if (fishTimerRef.current <= 0) {
        // Broad roaming arena: [8%, 92%] horizontally, [10%, 90%] vertically
        fishTargetRef.current = {
          x: 8 + Math.random() * 84,
          y: 10 + Math.random() * 80
        };
        fishTimerRef.current = diffParams.changeInterval + Math.floor(Math.random() * 6);
      }

      // Fast responsive vector movement towards target
      const dx = fishTargetRef.current.x - fishPosRef.current.x;
      const dy = fishTargetRef.current.y - fishPosRef.current.y;
      const distToTarget = Math.hypot(dx, dy);

      // Real velocity step with speed multiplier
      const moveStep = Math.min(distToTarget, diffParams.swimSpeed * 11);
      const angle = Math.atan2(dy, dx);

      const waveX = Math.sin(now / 200) * (diffParams.swimSpeed * 3.5);
      const waveY = Math.cos(now / 230) * (diffParams.swimSpeed * 3.5);

      // Base swimming velocity:
      let vx = Math.cos(angle) * moveStep + waveX;
      let vy = Math.sin(angle) * moveStep + waveY;

      // 2. ACTIVE PLAYER POSITION (Exclusively Webcam Fingertip Tracking)
      const activePlayerPos: Position2D = handPosRef.current;

      // 3. LOCK-ON DISTANCE CHECK WITH HYSTERESIS (Eliminates high-frequency boundary chatter)
      const distX = activePlayerPos.x - fishPosRef.current.x;
      const distY = activePlayerPos.y - fishPosRef.current.y;
      const distance = Math.hypot(distX, distY);

      const enterRadius = diffParams.targetRadius;
      const exitRadius = diffParams.targetRadius + 3.5;
      const isLocked = isLockedOnRef.current ? (distance <= exitRadius) : (distance <= enterRadius);
      isLockedOnRef.current = isLocked;

      // 4. EVASION BEHAVIOR: Continuous escape velocity (Smooth acceleration, ZERO teleport jitter)
      if (isLocked && diffParams.evasion > 0) {
        const safeDist = distance || 1;
        const escapeSpeed = diffParams.swimSpeed * 2.2 * diffParams.evasion;
        vx -= (distX / safeDist) * escapeSpeed;
        vy -= (distY / safeDist) * escapeSpeed;

        // Occasional agile feint towards a new target
        if (diffParams.evasion >= 0.15 && Math.random() < 0.05) {
          fishTargetRef.current = {
            x: 8 + Math.random() * 84,
            y: 10 + Math.random() * 80
          };
        }
      }

      // Apply dynamic velocity with arena boundary protection
      const nextX = fishPosRef.current.x + vx;
      const nextY = fishPosRef.current.y + vy;

      fishPosRef.current.x = Math.max(6, Math.min(94, nextX));
      fishPosRef.current.y = Math.max(8, Math.min(92, nextY));

      // Direct DOM update for swimming fish target zone (zero React re-renders)
      if (fishRingRef.current) {
        fishRingRef.current.style.left = `${fishPosRef.current.x.toFixed(1)}%`;
        fishRingRef.current.style.top = `${fishPosRef.current.y.toFixed(1)}%`;
      }

      // Discrete lock status update only on actual transition
      if (isLocked !== isLockedOnRef.current) {
        isLockedOnRef.current = isLocked;
        setIsLockedOn(isLocked);
      }

      // 5. CUMULATIVE OFF-TARGET TIMEOUT & ACTIVE TENSION RELIEF (2.5s tolerance)
      if (!isLocked) {
        cumulativeOffTargetMsRef.current += deltaMs;
        const ms = cumulativeOffTargetMsRef.current;

        // Direct DOM update for off-target gauge
        if (offTargetBarRef.current) {
          offTargetBarRef.current.style.width = `${Math.min(100, (ms / 2500) * 100).toFixed(1)}%`;
          offTargetBarRef.current.className = `h-full transition-none ${
            ms > 1700 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : ms > 800 ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-500'
          }`;
        }
        if (offTargetTextRef.current) {
          offTargetTextRef.current.className = ms > 1200 ? 'text-red-400 font-bold animate-pulse' : 'text-zinc-400';
          offTargetTextRef.current.textContent = ms > 0 
            ? (language === 'ru' ? `⚠️ СХОД ЦЕЛИ: ${(ms / 1000).toFixed(2)}с / 2.50с` : `⚠️ OFF-TARGET: ${(ms / 1000).toFixed(2)}s / 2.50s`) 
            : (language === 'ru' ? '✓ ПРИЦЕЛ СТАБИЛЕН (0.00с / 2.50с)' : '✓ TARGET LOCKED (0.00s / 2.50s)');
        }
        if (offTargetToleranceRef.current) {
          offTargetToleranceRef.current.className = ms > 1700 ? 'text-red-400 font-bold' : ms > 800 ? 'text-amber-400' : 'text-emerald-400';
          offTargetToleranceRef.current.textContent = `${language === 'ru' ? 'ЗАПАС' : 'TOLERANCE'}: ${Math.max(0, (2500 - ms) / 1000).toFixed(2)}s`;
        }

        if (cumulativeOffTargetMsRef.current >= 2500) {
          isRoundFinishedRef.current = true;
          clearInterval(loop);
          sound.playSnap();
          triggerLost('ЛЕСКА ПОРВАНА: палец был вне рыбы суммарно более 2.5 секунды!');
          return;
        }
      } else {
        // Active tension relief: line strain cools down while holding target!
        if (cumulativeOffTargetMsRef.current > 0) {
          cumulativeOffTargetMsRef.current = Math.max(0, cumulativeOffTargetMsRef.current - deltaMs * 0.75);
          const ms = cumulativeOffTargetMsRef.current;
          if (offTargetBarRef.current) {
            offTargetBarRef.current.style.width = `${Math.min(100, (ms / 2500) * 100).toFixed(1)}%`;
            offTargetBarRef.current.className = `h-full transition-none ${
              ms > 1700 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : ms > 800 ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-500'
            }`;
          }
          if (offTargetTextRef.current) {
            offTargetTextRef.current.className = ms > 1200 ? 'text-red-400 font-bold animate-pulse' : 'text-zinc-400';
            offTargetTextRef.current.textContent = ms > 0 
              ? (language === 'ru' ? `⚠️ СХОД ЦЕЛИ: ${(ms / 1000).toFixed(2)}с / 2.50с` : `⚠️ OFF-TARGET: ${(ms / 1000).toFixed(2)}s / 2.50s`) 
              : (language === 'ru' ? '✓ ПРИЦЕЛ СТАБИЛЕН (0.00с / 2.50с)' : '✓ TARGET LOCKED (0.00s / 2.50s)');
          }
          if (offTargetToleranceRef.current) {
            offTargetToleranceRef.current.className = ms > 1700 ? 'text-red-400 font-bold' : ms > 800 ? 'text-amber-400' : 'text-emerald-400';
            offTargetToleranceRef.current.textContent = `${language === 'ru' ? 'ЗАПАС' : 'TOLERANCE'}: ${Math.max(0, (2500 - ms) / 1000).toFixed(2)}s`;
          }
        }
      }

      // 6. PROGRESS CALCULATION
      if (isLocked) {
        if (now - lastReelClickTimeRef.current >= 180) {
          sound.playReelClick();
          lastReelClickTimeRef.current = now;
        }
        currentProgressRef.current = Math.min(100, currentProgressRef.current + diffParams.gain);
      } else {
        if (now - lastWarningSoundTime.current > 420) {
          sound.playWarning();
          lastWarningSoundTime.current = now;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20);
          }
        }
        currentProgressRef.current = Math.max(0, currentProgressRef.current - diffParams.loss);
      }

      // Direct DOM update for progress bar and percentage text
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${Math.min(100, Math.max(0, currentProgressRef.current)).toFixed(1)}%`;
      }
      if (progressTextRef.current) {
        const rounded = Math.round(currentProgressRef.current);
        progressTextRef.current.textContent = `${rounded}% / 100%`;
        progressTextRef.current.className = rounded > 30 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold';
      }

      // 7. CATCH SUCCESS: Reaching 100% progress immediately secures the catch!
      if (currentProgressRef.current >= 100) {
        isRoundFinishedRef.current = true;
        clearInterval(loop);
        triggerCatchSuccess();
      } else if (currentProgressRef.current <= 0) {
        isRoundFinishedRef.current = true;
        clearInterval(loop);
        sound.playSnap();
        triggerLost('ОБРЫВ: натяжение лески упало до 0%!');
      }

    }, 35);

    return () => clearInterval(loop);
  }, [stage, targetFish, diffParams]);

  // Direct Catch Handlers (Smoothly awards the catch directly)
  const triggerLandingPhase = () => {
    triggerCatchSuccess();
  };

  const handleAcceptCatch = () => {
    triggerCatchSuccess();
  };

  const revealCatchCard = () => {
    if (catchCinematicTimerRef.current) {
      clearTimeout(catchCinematicTimerRef.current);
      catchCinematicTimerRef.current = null;
    }
    if (mainVideoRef.current) {
      mainVideoRef.current.pause();
    }
    setIsCatchCardRevealed(true);

    const currentFish = targetFishRef.current || targetFish;
    const isArcane = currentFish.rarity === 'ARCANE';
    sound.playCatch(isArcane);

    confetti({
      particleCount: isArcane ? 180 : 80,
      spread: 85,
      origin: { y: 0.6 }
    });
  };

  // NO KEYBOARD REELING: Block keyboard during reeling and show prompt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stage === 'IDLE' && e.code === 'Space') {
        e.preventDefault();
        handleCast();
      } else if (stage === 'CATCH_SUCCESS' && e.code === 'Space') {
        e.preventDefault();
        if (!isCatchCardRevealed) {
          revealCatchCard();
        } else {
          handleCast();
        }
      } else if (stage === 'WAITING' && e.code === 'Space') {
        e.preventDefault();
        triggerEarlyFoul();
      } else if (stage === 'BITE' && e.code === 'Space') {
        e.preventDefault();
        handleStrike();
      } else if (stage === 'LANDING' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        handleAcceptCatch();
      } else if (stage === 'REELING') {
        // Remind player that reeling is physical (pointing finger in camera)
        if (['Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
          setControlWarning('☝️ КЛАВИАТУРА ОТКЛЮЧЕНА! НАВЕДИТЕ УКАЗАТЕЛЬНЫЙ ПАЛЕЦ НА РЫБУ В КАМЕРЕ!');
          setTimeout(() => setControlWarning(null), 2500);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage]);

  // Pointer Handlers: ONLY allow touch/pen for screen drag
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stage === 'CATCH_SUCCESS' && !isCatchCardRevealed) {
      revealCatchCard();
      return;
    }
    if (stage === 'WAITING') {
      triggerEarlyFoul();
      return;
    }
    if (stage === 'BITE') {
      handleStrike();
      return;
    }
    if (stage === 'LANDING') {
      handleAcceptCatch();
      return;
    }
    if (stage === 'REELING') {
      // Screen tapped or clicked: remind player that controls are 100% via camera gestures
      setControlWarning('☝️ УПРАВЛЕНИЕ ТОЛЬКО ЧЕРЕЗ КАМЕРУ! НАВЕДИТЕ УКАЗАТЕЛЬНЫЙ ПАЛЕЦ НА РЫБУ В ОБЪЕКТИВЕ!');
      setTimeout(() => setControlWarning(null), 2500);
    }
  };

  // Catch Success (Strictly once per round!)
  const triggerCatchSuccess = () => {
    if (hasAwardedRef.current) return;
    hasAwardedRef.current = true;
    isRoundFinishedRef.current = true;

    if (biteIntervalRef.current) {
      clearInterval(biteIntervalRef.current);
      biteIntervalRef.current = null;
    }
    if (biteTimeoutRef.current) {
      clearTimeout(biteTimeoutRef.current);
      biteTimeoutRef.current = null;
    }
    if (landingIntervalRef.current) {
      clearInterval(landingIntervalRef.current);
      landingIntervalRef.current = null;
    }

    const currentFish = targetFishRef.current || targetFish;
    const isShiny = Math.random() < 0.10; // Exactly 10% Shiny chance!
    const weight = +(currentFish.weightMin + Math.random() * (currentFish.weightMax - currentFish.weightMin)).toFixed(1);
    const baseCalculatedPrice = Math.round(currentFish.basePrice * (weight / currentFish.weightMin));
    const price = isShiny ? baseCalculatedPrice * 2 : baseCalculatedPrice;

    const baseExpMap: Record<string, number> = {
      COMMON: 30,
      UNCOMMON: 65,
      RARE: 140,
      EPIC: 320,
      MYTHIC: 550,
      SECRET: 950,
      GODLY: 1800,
      ARCANE: 4500
    };
    const rawExp = Math.round(
      (baseExpMap[currentFish.rarity] || 40) * 
      (1 + ((weight - currentFish.weightMin) / (currentFish.weightMax - currentFish.weightMin || 1)) * 0.5)
    );
    const expEarned = isShiny ? Math.round(rawExp * 1.5) : rawExp;

    const caughtRecord: CaughtFish = {
      id: `caught_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      fish: currentFish,
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

    // Reset consecutive failures counter on successful catch
    consecutiveFailsRef.current = 0;
    setConsecutiveFails(0);

    // 1. Enter CATCH_SUCCESS in video animation mode (card NOT yet revealed)
    setIsCatchCardRevealed(false);
    setStage('CATCH_SUCCESS');
    stageRef.current = 'CATCH_SUCCESS';

    // Audio: water splash & reel click
    sound.playSplash();
    sound.playReelClick();

    // 2. Clear old timer and set fallback safety timer (7.5s) in case onEnded event does not fire
    if (catchCinematicTimerRef.current) clearTimeout(catchCinematicTimerRef.current);
    catchCinematicTimerRef.current = setTimeout(() => {
      revealCatchCard();
    }, 7500);
  };

  const triggerLost = (reason?: string) => {
    // Guard: Never allow lost sequence to overwrite a successful catch!
    if (hasAwardedRef.current || stage === 'CATCH_SUCCESS') return;
    isRoundFinishedRef.current = true;
    consecutiveFailsRef.current += 1;
    setConsecutiveFails(consecutiveFailsRef.current);

    if (biteIntervalRef.current) {
      clearInterval(biteIntervalRef.current);
      biteIntervalRef.current = null;
    }
    if (biteTimeoutRef.current) {
      clearTimeout(biteTimeoutRef.current);
      biteTimeoutRef.current = null;
    }
    if (landingIntervalRef.current) {
      clearInterval(landingIntervalRef.current);
      landingIntervalRef.current = null;
    }
    if (foulIntervalRef.current) {
      clearInterval(foulIntervalRef.current);
      foulIntervalRef.current = null;
    }
    if (waitingTimerRef.current) {
      clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }
    setIsFoul(false);
    setLostReason(reason || 'Леска сорвалась. В следующий раз держите палец точнее над рыбой!');
    setStage('LOST');
    setTimeout(() => {
      setStage('IDLE');
    }, consecutiveFailsRef.current >= 2 ? 3200 : 2400);
  };

  return (
    <div 
      className="relative w-full h-[calc(100vh-65px)] bg-black overflow-hidden select-none flex flex-col justify-between"
    >
      {/* Hidden Motion Detection Canvas */}
      <canvas ref={motionCanvasRef} className="hidden" />

      {/* ASSET PRELOADER */}
      {isPreloading && (
        <div className="absolute inset-0 z-50 bg-[#09090b] flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-zinc-900/90 border border-white/10 p-6 rounded-md backdrop-blur-md space-y-4 shadow-2xl">
            {/* Header: Title and Percentage */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold tracking-tight text-white uppercase font-mono">
                  RODMAX
                </span>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {language === 'ru' ? 'Подготовка ресурсов' : 'Loading assets'}
                </p>
              </div>
              <span className="text-xs font-mono font-medium text-emerald-400 tabular-nums">
                {preloadProgress}%
              </span>
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 transition-all duration-150 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, preloadProgress))}%` }}
              />
            </div>

            {/* Current Item Status */}
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-0.5">
              <span className="truncate max-w-[220px]">
                {preloadStatus}
              </span>
              <span className="text-zinc-600 tabular-nums">
                {Math.round((preloadProgress / 100) * ASSETS_TO_PRELOAD.length)} / {ASSETS_TO_PRELOAD.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 1. Main Viewport Video Background */}
      <div className="absolute inset-0 z-0 bg-black">
        {stage === 'CATCH_SUCCESS' && (lastCaught?.fish?.catchVideo || targetFish.catchVideo) ? (
          <video
            key={lastCaught?.id || `catch_${targetFish.id}`}
            ref={mainVideoRef}
            src={lastCaught?.fish?.catchVideo || targetFish.catchVideo}
            autoPlay
            loop={false}
            muted
            playsInline
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration;
              if (dur && !isNaN(dur) && isFinite(dur)) {
                if (catchCinematicTimerRef.current) clearTimeout(catchCinematicTimerRef.current);
                catchCinematicTimerRef.current = setTimeout(() => {
                  revealCatchCard();
                }, (dur + 0.5) * 1000);
              }
            }}
            onEnded={() => {
              if (catchCinematicTimerRef.current) {
                clearTimeout(catchCinematicTimerRef.current);
                catchCinematicTimerRef.current = null;
              }
              if (mainVideoRef.current) {
                mainVideoRef.current.pause();
              }
              revealCatchCard();
            }}
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

      {stage !== 'CATCH_SUCCESS' && (
        <div className="absolute inset-0 scanlines pointer-events-none z-10" />
      )}

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
          <div className="pointer-events-auto p-5 sm:p-6 bg-[#06120b]/95 border-2 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.35)] text-center max-w-md w-full space-y-4 pixel-corners">
            <div className="font-arcade text-emerald-400 text-xs sm:text-sm tracking-wider">
              {language === 'ru' ? 'ГОТОВНОСТЬ К ЗАБРОСУ' : 'READY TO CAST'}
            </div>

            {/* Assistance Hint if player waited > 6.5s in IDLE */}
            {showIdleHint && (
              <div className="p-3 bg-amber-950/90 border border-amber-400 text-amber-200 pixel-corners shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse space-y-1">
                <div className="font-arcade text-xs flex items-center justify-center gap-1.5 text-amber-300">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>{language === 'ru' ? 'ПОДСКАЗКА: КАК НАЧАТЬ ИГРУ' : 'TIP: HOW TO START THE GAME'}</span>
                </div>
                <div className="font-mono text-[9px] text-zinc-300">
                  {language === 'ru' ? (
                    <>Кликните зеленую кнопку <span className="text-emerald-400 font-bold">[ЗАБРОСИТЬ УДОЧКУ]</span> ниже или нажмите клавишу <span className="text-amber-300 font-bold">[Пробел]</span>!</>
                  ) : (
                    <>Click the green <span className="text-emerald-400 font-bold">[CAST LINE]</span> button below or press <span className="text-amber-300 font-bold">[Space]</span>!</>
                  )}
                </div>
              </div>
            )}

            {/* Assistance Guide if player failed >= 2 times in a row */}
            {consecutiveFails >= 2 && (
              <div className="p-3.5 bg-cyan-950/90 border border-cyan-400 pixel-corners text-left space-y-2 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                <div className="font-arcade text-xs text-cyan-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-cyan-400" />
                    <span>
                      {language === 'ru' 
                        ? `СОВЕТЫ ПО ВЫВАЖИВАНИЮ (НЕ УДАЛОСЬ ${consecutiveFails}x):` 
                        : `REELING TIPS (FAILED ${consecutiveFails}x):`}
                    </span>
                  </div>
                  <button 
                    onClick={() => setIsGuideOpen(true)}
                    className="text-[8px] font-arcade text-cyan-400 underline hover:text-white cursor-pointer"
                  >
                    {language === 'ru' ? 'ПОЛНЫЙ ГАЙД' : 'FULL GUIDE'}
                  </button>
                </div>
                
                <div className="space-y-1 font-mono text-[9px] text-zinc-200">
                  <div>• <span className="text-amber-300 font-bold">{language === 'ru' ? 'Не двигайте рукой' : 'Do not move hand'}</span> {language === 'ru' ? 'до поклевки (иначе штраф за фальшстарт).' : 'before bite (false start penalty).'}</div>
                  <div>• <span className="text-amber-300 font-bold">{language === 'ru' ? 'При надписи «КЛЮЕТ!»' : 'When «FISH ON!» appears'}</span> {language === 'ru' ? 'резко дерните пальцем в камеру (окно 1.1с).' : 'rapidly thrust finger toward camera (1.1s).'}</div>
                  <div>• <span className="text-emerald-400 font-bold">{language === 'ru' ? 'Ведите пальцем за рыбой:' : 'Steer finger over fish:'}</span> {language === 'ru' ? 'следите за бирюзовым прицелом ☝️ в окне камеры справа внизу.' : 'track the cyan reticle ☝️ in bottom-right camera view.'}</div>
                </div>
              </div>
            )}

            {/* Gesture Thumbs Up Charge Widget */}
            <div className={`p-3 border transition-all duration-150 pixel-corners ${
              thumbsUpHoldProgress > 0 
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.7)]' 
                : isThumbsUp 
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                : isWrongGesture
                ? 'bg-amber-950/85 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse'
                : 'bg-black/60 border-zinc-700/80 text-zinc-300'
            }`}>
              <div className="font-arcade text-xs flex items-center justify-center gap-2">
                <span className={`text-xl ${thumbsUpHoldProgress > 0 ? 'animate-bounce' : isWrongGesture ? 'animate-bounce' : ''}`}>
                  {isWrongGesture ? '⚠️' : '👍'}
                </span>
                <span>
                  {thumbsUpHoldProgress >= 100
                    ? t('fishing.casting')
                    : thumbsUpHoldProgress > 0
                    ? t('fishing.holdTitle', { progress: thumbsUpHoldProgress })
                    : isWrongGesture
                    ? t('fishing.wrongGesture')
                    : t('fishing.readyTitle')}
                </span>
              </div>

              {/* Charge Progress Bar */}
              <div className="w-full bg-zinc-800 h-2 mt-2 rounded-full overflow-hidden border border-zinc-700">
                <div 
                  className={`h-full transition-all duration-75 ${
                    isWrongGesture
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_8px_#f59e0b]'
                      : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_8px_#10b981]'
                  }`}
                  style={{ width: `${thumbsUpHoldProgress}%` }}
                />
              </div>

              {isWrongGesture ? (
                <div className="mt-2 py-1 px-2 bg-amber-500/20 border border-amber-400/30 rounded text-center">
                  <div className="font-mono text-[9px] text-amber-200 font-semibold">
                    {t('fishing.wrongGestureTip')}
                  </div>
                </div>
              ) : (
                <div className="font-mono text-[8px] text-zinc-400 mt-1 flex justify-between items-center">
                  <span>{t('fishing.holdTime')}</span>
                  <span>{t('fishing.orClick')}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleCast}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs tracking-wider border-2 border-emerald-300 shadow-[0_3px_0_#064e3b] transition-all cursor-pointer"
            >
              {t('fishing.castBtn')}
            </button>
            
            <div className="text-[9px] font-arcade text-cyan-300">
              {t('fishing.reticleTip')}
            </div>
          </div>
        )}

        {/* CASTING Animation phase */}
        {stage === 'CASTING' && (
          <div className="p-4 bg-black/85 border-2 border-emerald-400 font-arcade text-xs sm:text-sm text-emerald-300 animate-pulse pixel-corners shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            {language === 'ru' ? 'ЗАБРОС ЛЕСКИ В ОКЕАН...' : 'CASTING LINE INTO THE ABYSS...'}
          </div>
        )}

        {/* WAITING for Bite with Early Twitch / Foul Mode */}
        {stage === 'WAITING' && (
          <div className="flex flex-col items-center gap-3 max-w-md w-full">
            {isFoul ? (
              <div className="p-4 sm:p-5 bg-red-950/95 border-2 border-red-500 pixel-corners text-center space-y-2 animate-shake shadow-[0_0_35px_rgba(239,68,68,0.7)] w-full">
                <div className="font-arcade text-xs sm:text-sm text-red-300 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                  <span>{t('fishing.foulAlert')}</span>
                </div>
                <div className="font-arcade text-[10px] text-amber-300">
                  {language === 'ru' ? 'ВЫ ДЕРНУЛИ ПАЛЬЦЕМ РАНЬШЕ ПОКЛЕВКИ!' : 'PREMATURE MOTION DETECTED!'}
                </div>
                <div className="font-mono text-[9px] text-zinc-300">
                  {language === 'ru' ? (
                    <>Рыба испугалась! Штрафная пауза: <span className="text-red-400 font-bold">{foulTimeLeft.toFixed(1)}с</span>.<br />Не двигайтесь, замрите!</>
                  ) : (
                    <>Fish startled! Penalty cooldown: <span className="text-red-400 font-bold">{foulTimeLeft.toFixed(1)}s</span>.<br />Do not move, stay still!</>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-5 bg-[#05110a]/90 border border-emerald-500/60 pixel-corners animate-pulse w-full text-center">
                <div className="flex items-center justify-center gap-2 text-cyan-400 font-arcade text-xs tracking-wider">
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>{t('fishing.waitingTitle')}</span>
                </div>
                <div className="font-mono text-[10px] text-zinc-400">
                  {t('fishing.waitingSub')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BITE Event Alert: 1.10s Rapid Strike QTE */}
        {stage === 'BITE' && (
          <div 
            onClick={handleStrike}
            className="pointer-events-auto cursor-pointer p-6 sm:p-8 bg-red-950/95 border-4 border-amber-400 text-center animate-bounce shadow-[0_0_60px_rgba(239,68,68,0.8)] pixel-corners space-y-3 max-w-md w-full"
          >
            <div className="font-arcade text-xl sm:text-2xl text-amber-300 tracking-widest drop-shadow-[0_2px_4px_black] animate-pulse">
              {language === 'ru' ? '! КЛЮЕТ !' : '! FISH ON !'}
            </div>
            <div className="font-arcade text-[10px] sm:text-xs text-white">
              {t('fishing.biteAlert')}
            </div>

            {/* Live 1.10s Strike Timer Bar */}
            <div className="space-y-1">
              <div className="flex justify-between font-arcade text-[10px]">
                <span className="text-red-400 font-bold animate-pulse">
                  {language === 'ru' ? 'ОКНО НА ПОДСЕЧКУ:' : 'STRIKE WINDOW:'}
                </span>
                <span className="text-amber-300 font-bold text-xs">{biteTimeLeft.toFixed(2)}s / 1.10s</span>
              </div>
              <div className="w-full h-3 bg-black border border-amber-400 p-0.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.max(0, Math.min(100, (biteTimeLeft / 1.10) * 100))}%` }}
                />
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStrike();
              }}
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-arcade text-xs font-bold border-2 border-white shadow-[0_0_20px_rgba(245,158,11,0.8)] cursor-pointer"
            >
              {t('fishing.strikeBtn')}
            </button>
          </div>
        )}

        {/* LANDING Phase: 1.0s Rapid Accept QTE */}
        {stage === 'LANDING' && (
          <div 
            onClick={handleAcceptCatch}
            className="pointer-events-auto cursor-pointer p-6 sm:p-8 bg-[#04120a]/95 border-4 border-amber-400 text-center shadow-[0_0_60px_rgba(245,158,11,0.8)] pixel-corners space-y-4 max-w-lg w-full animate-bounce"
          >
            <div className="font-arcade text-lg sm:text-xl text-amber-300 tracking-wider flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
              <span>{language === 'ru' ? '! РЫБА НА ПОВЕРХНОСТИ !' : '! FISH AT SURFACE !'}</span>
            </div>

            <div className="font-arcade text-xs text-emerald-300">
              {t('fishing.landingTitle')}
            </div>

            {/* 1.0s Live Shrinking Bar */}
            <div className="space-y-1">
              <div className="flex justify-between font-arcade text-[10px]">
                <span className="text-red-400 font-bold animate-pulse">
                  {language === 'ru' ? 'ОКНО ПРИЕМА ТРОФЕЯ:' : 'LANDING WINDOW:'}
                </span>
                <span className="text-amber-300 font-bold text-xs">{landingTimeLeft.toFixed(2)}s / 1.00s</span>
              </div>
              <div className="w-full h-3 bg-black border border-amber-400 p-0.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.max(0, Math.min(100, (landingTimeLeft / 1.0) * 100))}%` }}
                />
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptCatch();
              }}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black font-arcade text-xs sm:text-sm font-bold border-2 border-white shadow-[0_0_30px_rgba(16,185,129,0.9)] animate-pulse tracking-widest cursor-pointer"
            >
              {t('fishing.acceptCatchBtn')}
            </button>

            <div className="text-[9px] font-arcade text-zinc-400">
              {language === 'ru' ? '💡 Кликните кнопку, нажмите пробел или сделайте рывок пальцем!' : '💡 Click button, press space, or thrust finger in camera!'}
            </div>
          </div>
        )}

        {/* REELING Minigame: Direct "Finger on Fish" Arena! */}
        {stage === 'REELING' && (
          <div className="pointer-events-auto flex flex-col items-center gap-3 w-full max-w-2xl px-2 sm:px-4">
            
            {/* Catch Arena Card */}
            <div className="w-full bg-[#040e08]/95 border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.35)] pixel-corners p-3 sm:p-4 space-y-3">
              
              {/* Header Telemetry */}
              <div className="flex justify-between items-center border-b border-emerald-500/30 pb-2">
                <div>
                  <div className="font-arcade text-[9px] text-zinc-400">
                    {language === 'ru' ? 'ДОБЫЧА НА КРЮЧКЕ:' : 'HOOKED PREY:'}
                  </div>
                  <div className="font-arcade text-xs text-emerald-300 tracking-wider animate-pulse">
                    {language === 'ru' ? '??? НЕИЗВЕСТНЫЙ ТРОФЕЙ' : '??? UNIDENTIFIED TROPHY'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-arcade text-[9px] text-zinc-400">
                    {language === 'ru' ? 'ЗОНА ЗАХВАТА:' : 'TARGET ZONE:'}
                  </div>
                  <div className="font-arcade text-xs text-emerald-400">
                    {language === 'ru' ? 'РАДИУС' : 'RADIUS'}: {diffParams.targetRadius}%
                  </div>
                </div>
              </div>

              {/* Progress Bar & Stability Tension Meter */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between font-arcade text-[9px]">
                    <span className="text-zinc-400">
                      {language === 'ru' ? 'ПРОГРЕСС ВЫВАЖИВАНИЯ:' : 'REELING PROGRESS:'}
                    </span>
                    <span 
                      ref={progressTextRef}
                      className={catchProgress > 30 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}
                    >
                      {Math.round(catchProgress)}% / 100%
                    </span>
                  </div>
                  <div className="w-full h-3.5 bg-black border border-emerald-500 p-0.5 overflow-hidden">
                    <div 
                      ref={progressBarRef}
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.5)] transition-none"
                      style={{ width: `${Math.min(100, Math.max(0, catchProgress)).toFixed(1)}%` }}
                    />
                  </div>
                </div>

                {/* Cumulative 2.5s Off-Target Tolerance Gauge */}
                <div className="space-y-1 pt-1 border-t border-emerald-500/20">
                  <div className="flex justify-between font-arcade text-[8px]">
                    <span 
                      ref={offTargetTextRef}
                      className={offTargetMs > 1200 ? 'text-red-400 font-bold animate-pulse' : 'text-zinc-400'}
                    >
                      {offTargetMs > 0 
                        ? (language === 'ru' ? `⚠️ СХОД ЦЕЛИ: ${(offTargetMs / 1000).toFixed(2)}с / 2.50с` : `⚠️ OFF-TARGET: ${(offTargetMs / 1000).toFixed(2)}s / 2.50s`) 
                        : (language === 'ru' ? '✓ ПРИЦЕЛ СТАБИЛЕН (0.00с / 2.50с)' : '✓ TARGET LOCKED (0.00s / 2.50s)')}
                    </span>
                    <span 
                      ref={offTargetToleranceRef}
                      className={offTargetMs > 1700 ? 'text-red-400 font-bold' : offTargetMs > 800 ? 'text-amber-400' : 'text-emerald-400'}
                    >
                      {language === 'ru' ? 'ЗАПАС' : 'TOLERANCE'}: {Math.max(0, (2500 - offTargetMs) / 1000).toFixed(2)}s
                    </span>
                  </div>
                  <div className="w-full h-2 bg-black border border-zinc-700 p-0.5 overflow-hidden">
                    <div 
                      ref={offTargetBarRef}
                      className={`h-full transition-none ${
                        offTargetMs > 1700 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : offTargetMs > 800 ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (offTargetMs / 2500) * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* TECHNIQUE INSTRUCTION BADGE */}
              <div className={`p-2 font-arcade text-[9px] sm:text-[10px] text-center border transition-colors duration-150 ${
                isLockedOn 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                  : 'bg-amber-950/80 text-amber-300 border-amber-500 animate-pulse'
              }`}>
                {isLockedOn ? (
                  <span>{language === 'ru' ? '🎯 ТОЧНЫЙ ЗАХВАТ! УДЕРЖИВАЙТЕ ПАЛЕЦ НА РЫБЕ! (+100%)' : '🎯 TARGET LOCKED! KEEP FINGER OVER FISH! (+100%)'}</span>
                ) : (
                  <span>{language === 'ru' ? '☝️ НАВЕДИТЕ УКАЗАТЕЛЬНЫЙ ПАЛЕЦ НА РЫБУ В КАМЕРЕ!' : '☝️ STEER YOUR INDEX FINGER OVER THE FISH!'}</span>
                )}
              </div>

              {/* ===================== THE CAMERA REELING ARENA ===================== */}
              <div 
                ref={arenaRef}
                onPointerDown={handlePointerDown}
                className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black border-2 border-emerald-500 overflow-hidden shadow-inner select-none touch-none"
                style={{ touchAction: 'none' }}
              >
                {/* 1. Live Webcam Feed in the Arena (Mirrored) */}
                {cameraEnabled && cameraStatus === 'ACTIVE' ? (
                  <video
                    ref={arenaVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-60 pointer-events-none"
                  />
                ) : (
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none"
                    style={{ backgroundImage: `url('/assets/bg_underwater.jpg')` }}
                  />
                )}

                {/* Radar grid overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(16,185,129,0.15)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
                <div className="absolute inset-0 border border-emerald-500/20 pointer-events-none" />

                {/* 2. SWIMMING FISH WITH CATCH TARGET ZONE */}
                <div 
                  ref={fishRingRef}
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10 will-change-transform"
                  style={{
                    left: `${fishPos.x}%`,
                    top: `${fishPos.y}%`,
                    width: `${diffParams.targetRadius * 2}%`,
                    height: `${diffParams.targetRadius * 2}%`
                  }}
                >
                  {/* Glowing Capture Ring */}
                  <div 
                    className={`absolute inset-0 rounded-full border-2 transition-colors duration-150 ${
                      isLockedOn 
                        ? 'border-emerald-400 bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.5)]' 
                        : 'border-amber-400 border-dashed bg-amber-500/10 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    }`}
                  />

                  {/* Corner Targeting Brackets */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
                    <Crosshair className={`w-full h-full stroke-[1] ${isLockedOn ? 'text-emerald-300' : 'text-amber-400'}`} />
                  </div>

                  {/* Sonar Beacon Target */}
                  <div className="w-4 h-4 rounded-full bg-cyan-400/80 border border-white shadow-[0_0_12px_#22d3ee] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>

                  {/* Target Label */}
                  <div className={`absolute -bottom-5 px-1.5 py-0.2 bg-black/90 border font-arcade text-[7px] truncate ${
                    isLockedOn ? 'border-emerald-400 text-emerald-300' : 'border-amber-400 text-amber-300'
                  }`}>
                    {isLockedOn ? (language === 'ru' ? 'ЗАХВАТ 100%' : 'LOCKED 100%') : (language === 'ru' ? 'ЦЕЛЬ ДЛЯ ПАЛЬЦА' : 'FINGER TARGET')}
                  </div>
                </div>

                {/* 3. PLAYER'S FINGERTIP RETICLE (Webcam optical tracker - Maximum Emphasis on Index Fingertip) */}
                {cameraStatus === 'ACTIVE' && (
                  <div 
                    ref={reticleRef}
                    className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20 will-change-transform"
                    style={{
                      left: `${handPos.x}%`,
                      top: `${handPos.y}%`
                    }}
                  >
                    <div className="relative flex items-center justify-center">
                      {/* Spinning outer tactical crosshair ring */}
                      <div className={`w-14 h-14 rounded-full border-2 border-dashed animate-[spin_8s_linear_infinite] transition-colors duration-150 ${
                        isLockedOn 
                          ? 'border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.9)]' 
                          : 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.7)]'
                      }`} />

                      {/* Precise Center Fingertip Beacon */}
                      <div className={`absolute w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        isLockedOn 
                          ? 'border-emerald-300 bg-emerald-400/35 ring-2 ring-emerald-400/80 shadow-[0_0_15px_#10b981]' 
                          : 'border-cyan-300 bg-cyan-400/30 ring-1 ring-cyan-400/60 shadow-[0_0_10px_#06b6d4]'
                      }`}>
                        <span className="text-xl filter drop-shadow-[0_0_8px_rgba(34,211,238,1)]">☝️</span>
                      </div>

                      {/* Laser Apex Targeting Dot directly on the fingertip */}
                      <div className="absolute -top-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-black animate-ping" />
                      <div className="absolute -top-1 w-2 h-2 bg-amber-300 rounded-full border border-black shadow-[0_0_8px_#fbbf24]" />
                    </div>

                    <div className={`px-2 py-0.5 bg-black/95 border font-arcade text-[8px] mt-1.5 shadow-md flex items-center gap-1 ${
                      isLockedOn ? 'border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/60' : 'border-cyan-400 text-cyan-300'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span>{isLockedOn ? (language === 'ru' ? '☝️ ПАЛЕЦ В ЦЕЛИ!' : '☝️ FINGER ON TARGET!') : (language === 'ru' ? '☝️ КОНЧИК ПАЛЬЦА' : '☝️ FINGERTIP APEX')}</span>
                    </div>
                  </div>
                )}

              </div>

              {/* Arena Footer Info */}
              <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono text-zinc-400 pt-1">
                <div>
                  <span>💡 <strong className="text-white">{language === 'ru' ? 'Совет:' : 'Tip:'}</strong> {language === 'ru' ? 'направьте указательный палец в камеру и ведите его за рыбой.' : 'aim your index finger at the camera and track the fish.'}</span>
                </div>
                <div className={`px-2 py-0.5 font-arcade ${
                  isLockedOn ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {isLockedOn ? (language === 'ru' ? '● СВЯЗЬ АКТИВНА' : '● SIGNAL ACTIVE') : (language === 'ru' ? '○ ПОИСК ЦЕЛИ' : '○ SEEKING TARGET')}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* LOST Fish Alert */}
        {stage === 'LOST' && (
          <div className="p-6 bg-red-950/90 border-2 border-red-500 text-center font-arcade text-red-300 space-y-3 pixel-corners animate-shake shadow-[0_0_40px_rgba(239,68,68,0.6)] max-w-md w-full">
            <div className="text-lg">{t('fishing.lostTitle')}</div>
            <div className="text-xs text-zinc-300 font-mono">
              {lostReason || (language === 'ru' ? 'Леска сорвалась. В следующий раз держите палец точнее над рыбой!' : 'Line snapped. Keep your finger accurately over the fish next time!')}
            </div>
            {consecutiveFails >= 2 && (
              <div className="p-2.5 bg-black/80 border border-amber-400 text-[9px] text-amber-200 font-mono text-left space-y-1">
                <div className="font-arcade text-[10px] text-amber-300 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {language === 'ru' 
                      ? `ПОДСКАЗКА (НЕ УДАЛОСЬ ВЫЛОВИТЬ ${consecutiveFails} РАЗА):` 
                      : `HINT (FAILED TO CATCH ${consecutiveFails} TIMES):`}
                  </span>
                </div>
                <div>• {language === 'ru' ? 'Не двигайте рукой до сигнала «КЛЮЕТ!» (иначе фальшстарт).' : 'Do not move hand before «FISH ON!» (or false start).'}</div>
                <div>• {language === 'ru' ? 'При поклевке резко двиньте палец в камеру за 1.1с.' : 'When bite occurs, rapidly thrust finger towards camera within 1.1s.'}</div>
                <div>• {language === 'ru' ? 'В вываживании держите бирюзовый прицел ☝️ на рыбе.' : 'During reeling, keep the cyan reticle ☝️ over the fish.'}</div>
              </div>
            )}
          </div>
        )}

        {/* Sleek, non-intrusive skip button while the catch animation video plays */}
        {stage === 'CATCH_SUCCESS' && lastCaught && !isCatchCardRevealed && (
          <div className="absolute bottom-6 right-6 z-30 pointer-events-auto">
            <button
              onClick={revealCatchCard}
              className="py-1 px-3 bg-black/60 hover:bg-black/90 text-zinc-400 hover:text-emerald-300 font-arcade text-[8px] sm:text-[9px] border border-white/10 hover:border-emerald-500/50 backdrop-blur-sm transition-all shadow-md"
            >
              [ {language === 'ru' ? 'ПРОПУСТИТЬ: ПРОБЕЛ' : 'SKIP: SPACE'} ]
            </button>
          </div>
        )}

        {/* CATCH SUCCESS Showcase Modal (REVEAL ONLY AFTER CATCH ANIMATION!) */}
        {stage === 'CATCH_SUCCESS' && lastCaught && isCatchCardRevealed && (
          <div className="pointer-events-auto p-5 sm:p-6 bg-[#08150f]/95 border-2 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.5)] text-center max-w-md w-full space-y-4 pixel-corners animate-in zoom-in-95 duration-300">
            
            <div className="font-arcade text-xs text-amber-400 tracking-wider flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('fishing.successTitle')}</span>
            </div>

            {/* Rare SHINY Badge if rolled */}
            {lastCaught.isShiny && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-amber-500/30 via-yellow-400/30 to-amber-500/30 border-2 border-amber-300 font-arcade text-[10px] text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>{language === 'ru' ? '✨ РЕДКАЯ МУТАЦИЯ: SHINY (+100% К ЦЕНЕ!) ✨' : '✨ RARE MUTATION: SHINY (+100% VALUE!) ✨'}</span>
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
                alt={getFishName(lastCaught.fish, language)}
                decoding="async"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black/80 border border-zinc-800 px-2 py-0.5 font-arcade text-[9px]">
                <span className="text-cyan-300 font-mono">{language === 'ru' ? 'ШАНС' : 'CHANCE'}: {lastCaught.fish.catchChance}%</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5">
                {lastCaught.isShiny && <Sparkles className="w-4 h-4 text-amber-300" />}
                <h3 className={`font-arcade text-sm ${lastCaught.isShiny ? 'text-amber-200 font-bold' : 'text-white'}`}>
                  {getFishName(lastCaught.fish, language)} {lastCaught.isShiny ? '[SHINY]' : ''}
                </h3>
              </div>
              <p className="font-mono text-xs text-zinc-300 mt-1">
                {t('fishing.weight')}: <span className="text-emerald-400 font-bold">{lastCaught.weight} {t('bestiary.kg')}</span> · {t('fishing.price')}: <span className="text-amber-400 font-bold">+{lastCaught.price.toLocaleString()} C</span>
              </p>
              {lastCaught.expEarned && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-950/80 border border-cyan-400 font-arcade text-[9px] text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.35)]">
                  <Sparkles className="w-3 h-3 text-cyan-300" />
                  <span>+{lastCaught.expEarned} {t('fishing.exp')}</span>
                </div>
              )}
            </div>

            {/* Guest notice or Registered Sadok notification */}
            {profile.isRegistered ? (
              <div className="p-2 bg-emerald-950/60 border border-emerald-500/50 text-[10px] text-emerald-300 font-mono text-center">
                {language === 'ru' ? '✓ 1 экземпляр добавлен в садок! Продать его можно во вкладке «ПРОФИЛЬ».' : '✓ 1 fish added to basket! Sell it in «PROFILE» tab.'}
              </div>
            ) : (
              <div className="p-2.5 bg-amber-950/60 border border-amber-500/50 text-[10px] text-amber-300 font-mono leading-relaxed">
                {language === 'ru' ? 'Вы играете как гость — улов и баланс не сохраняются. Зарегистрируйтесь, чтобы сохранять все виды рыб и счетчик поимок!' : 'Playing as guest — catches and wallet are not persisted. Register to save all fish species and records!'}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleCast}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs border border-emerald-300 shadow-[0_3px_0_#064e3b] transition-all cursor-pointer"
              >
                [ {language === 'ru' ? 'ЕЩЕ ЗАБРОС' : 'CAST AGAIN'} ]
              </button>
              
              {!profile.isRegistered && setTab && (
                <button
                  onClick={() => setTab('auth')}
                  className="py-3 px-3 bg-amber-500 hover:bg-amber-400 text-black font-arcade text-xs border border-amber-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('fishing.saveToProfile')}</span>
                </button>
              )}

              <button
                onClick={openBestiary}
                className="py-3 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-arcade text-xs border border-zinc-600 cursor-pointer"
              >
                {t('nav.bestiary')}
              </button>
            </div>

          </div>
        )}

      </div>

      {/* 4. Bottom Controls & Persistent Live Camera Viewfinder HUD */}
      <div className="relative z-20 px-3 sm:px-4 py-2 bg-[#06100a]/95 border-t border-emerald-500/50 backdrop-blur-md flex flex-wrap justify-between items-center gap-3">
        
        {/* Left: Scheme and controls info */}
        <div className="flex flex-col gap-0.5 font-arcade text-[8px] sm:text-[9px] text-zinc-300">
          <div className="text-emerald-400 font-bold flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'ru' ? 'ОПТИЧЕСКИЙ ТРЕКИНГ ЖЕСТОВ:' : 'OPTICAL GESTURE CONTROLS:'}</span>
          </div>
          <div>{t('fishing.hudCast')}</div>
          <div>{t('fishing.hudStrike')}</div>
          <div>{t('fishing.hudFoul')}</div>
          <div>{t('fishing.hudReel')}</div>
          <div>{t('fishing.hudAccept')}</div>
        </div>

        {/* Right: Persistent Live Camera Viewfinder Window */}
        {cameraEnabled && (
          <div className="relative bg-black border-2 border-emerald-400 p-1 pixel-corners shadow-[0_0_20px_rgba(16,185,129,0.35)] w-40 sm:w-52 ml-auto">
            <div className="flex items-center justify-between text-[7px] font-arcade text-zinc-300 mb-1 px-1">
              <div className="flex items-center gap-1 text-emerald-300">
                <div className={`w-1.5 h-1.5 rounded-full ${cameraStatus === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{t('fishing.webcamTitle')}</span>
              </div>
              <div className={
                isThumbsUp 
                  ? 'text-emerald-400 font-bold animate-pulse' 
                  : isWrongGesture 
                  ? 'text-amber-400 font-bold animate-pulse' 
                  : cameraStatus === 'ACTIVE' 
                  ? 'text-zinc-300' 
                  : 'text-amber-400'
              }>
                {isThumbsUp 
                  ? t('fishing.webcamThumbsUp')
                  : isWrongGesture 
                  ? t('fishing.webcamWrong')
                  : cameraStatus === 'ACTIVE' 
                  ? t('fishing.webcamActive')
                  : cameraStatus === 'CONNECTING' 
                  ? t('fishing.webcamConnecting')
                  : t('fishing.webcamOff')}
              </div>
            </div>

            <div className="relative aspect-[4/3] bg-black overflow-hidden border border-zinc-800">
              <video
                ref={webcamVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Thumbs Up / Wrong Gesture Detected Badge Overlay */}
              {isThumbsUp ? (
                <div className="absolute top-1 left-1 bg-emerald-950/90 border border-emerald-400 px-1.5 py-0.5 rounded font-arcade text-[8px] text-emerald-300 animate-pulse shadow-[0_0_10px_#10b981] z-20 flex items-center gap-1">
                  <span>👍</span>
                  <span>{language === 'ru' ? 'ЛАЙК' : 'LIKE'}</span>
                </div>
              ) : isWrongGesture ? (
                <div className="absolute top-1 left-1 bg-amber-950/90 border border-amber-400 px-1.5 py-0.5 rounded font-arcade text-[7px] text-amber-300 animate-pulse shadow-[0_0_10px_#f59e0b] z-20 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{t('fishing.webcamWrongBadge')}</span>
                </div>
              ) : null}

              {/* Fingertip Tracking Reticle inside Camera Viewfinder */}
              {cameraStatus === 'ACTIVE' && (
                <div 
                  ref={hudReticleRef}
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10 will-change-transform"
                  style={{
                    left: `${handPos.x}%`,
                    top: `${handPos.y}%`
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border border-cyan-400 bg-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.9)] flex items-center justify-center text-[10px]">
                      ☝️
                    </div>
                    {/* Glowing apex point directly on fingertip */}
                    <div className="absolute -top-1 w-2 h-2 rounded-full bg-amber-300 border border-black shadow-[0_0_6px_#f59e0b]" />
                  </div>
                </div>
              )}

              {/* Camera Status Overlays */}
              {cameraStatus === 'CONNECTING' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center font-arcade text-[7px] text-amber-300 bg-black/85">
                  <Activity className="w-3.5 h-3.5 animate-spin mb-1 text-amber-400" />
                  <span>ПОДКЛЮЧЕНИЕ КАМЕРЫ...</span>
                </div>
              )}

              {cameraStatus === 'DENIED' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-1.5 text-center font-arcade text-[7px] text-red-400 bg-black/90">
                  <CameraOff className="w-3.5 h-3.5 mb-0.5 text-red-400" />
                  <span>ДОСТУП ЗАПРЕЩЕН</span>
                  <span className="text-[6px] text-zinc-400 mt-0.5">РАЗРЕШИТЕ В БРАУЗЕРЕ</span>
                </div>
              )}

              <div className="absolute inset-0 border border-emerald-500/20 pointer-events-none" />
            </div>

            {/* Bottom Camera Telemetry */}
            <div className="mt-1 flex justify-between font-arcade text-[7px] text-zinc-400 px-1">
              <span>ДВИЖЕНИЕ:</span>
              <span 
                ref={motionIntensityTextRef}
                className={motionIntensity > 20 ? 'text-emerald-400 font-bold' : 'text-zinc-500'}
              >
                {motionIntensity}%
              </span>
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
                    Оптический трекинг указательного пальца / Механика вываживания и уклонения
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
                  <h4 className="font-arcade text-xs text-white">ВЕБ-КАМЕРА (60 FPS)</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    RODMAX управляется оптическим трекингом веб-камеры. Разрешите доступ к камере в браузере, чтобы наводить палец на рыбу. Мышь и клавиатура для вываживания отключены.
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
                    Сделайте взмах рукой вверх перед камерой или нажмите кнопку «Забросить удочку». Снасть опустится в океан на случайную глубину.
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
                    При сигнале «! КЛЮЕТ !» у вас есть ровно 3 секунды, чтобы резко взмахнуть рукой вверх перед камерой или нажать кнопку подсечки. Если опоздать — рыба сорвет наживку.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-black/60 border border-cyan-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-cyan-400 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  4
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-cyan-300">ВЫВАЖИВАНИЕ: «ПАЛЕЦ НА РЫБЕ»</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    Направьте указательный палец в объектив камеры и удерживайте прицел <strong className="text-cyan-300">☝️</strong> прямо внутри круга рыбы. При удержании шкала быстро растет до 100% за 1–2 секунды!
                  </p>
                </div>
              </div>

              <div className="p-3 bg-black/60 border border-emerald-500/40 flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-500 text-black font-arcade text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  5
                </div>
                <div className="space-y-1">
                  <h4 className="font-arcade text-xs text-emerald-400">ЗОНЫ РЕДКОСТИ И УКЛОНЕНИЕ</h4>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    Чем круче рыба, тем меньше радиус захвата (Common — 36%, Arcane — 10%) и тем активнее она уклоняется от вашего пальца! Легендарные виды делают резкие рывки по всей арене.
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
