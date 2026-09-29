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
  Lightbulb
} from 'lucide-react';

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

export const FishingGame: React.FC<FishingGameProps> = ({ profile, onCatchFish, openBestiary, setTab }) => {
  const [stage, setStage] = useState<GameStage>('IDLE');
  const [targetFish, setTargetFish] = useState<FishItem>(FISH_DATABASE[1]);
  const [lastCaught, setLastCaught] = useState<CaughtFish | null>(null);

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
  const [offTargetMs, setOffTargetMs] = useState(0); // Cumulative off-target ms (max 1500)
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
  const [thumbsUpHoldProgress, setThumbsUpHoldProgress] = useState(0);
  const thumbsUpCounterRef = useRef(0);
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

  // 0.75s Fast Bite/Strike Window State
  const [biteTimeLeft, setBiteTimeLeft] = useState(0.75);
  const biteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1.0s Rapid Acceptance Window State
  const [landingTimeLeft, setLandingTimeLeft] = useState(1.0);
  const landingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Guard refs to prevent duplicate catch bug!
  const isRoundFinishedRef = useRef(false);
  const hasAwardedRef = useRef(false);
  const biteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cumulative Off-Target Timeout: snaps if total off-target time reaches 1500ms
  const cumulativeOffTargetMsRef = useRef(0);
  const lastTickTimeRef = useRef(Date.now());

  // Physics refs
  const fishPosRef = useRef<Position2D>({ x: 50, y: 50 });
  const fishTargetRef = useRef<Position2D>({ x: 50, y: 50 });
  const fishTimerRef = useRef(0);
  const handPosRef = useRef<Position2D>({ x: 50, y: 50 });
  const lastWarningSoundTime = useRef(0);
  const currentProgressRef = useRef(50);

  // Camera & Canvas refs
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);

  // Simulated depth
  const [depth, setDepth] = useState(45);

  // Initial progress by rarity tier (High base progress for fast, snappy reeling)
  const getInitialProgress = (rarity: RarityType) => {
    switch (rarity) {
      case 'COMMON': return 55;
      case 'UNCOMMON': return 50;
      case 'RARE': return 45;
      case 'EPIC': return 40;
      case 'MYTHIC': return 35;
      case 'SECRET': return 30;
      case 'GODLY': return 28;
      case 'ARCANE': return 25;
      default: return 40;
    }
  };

  // Scaled Difficulty Parameters: Fast arcade reeling (2 - 3.5 seconds total hold time)
  const getFishDifficultyParams = (fish: FishItem) => {
    switch (fish.rarity) {
      case 'COMMON':
        // Fast catch (~1.5s - 2.0s)
        return { targetRadius: 26, swimSpeed: 0.12, gain: 2.2, loss: 0.40, changeInterval: 42, evasion: 0.04 };
      case 'UNCOMMON':
        // Snappy catch (~2.0s - 2.5s)
        return { targetRadius: 20, swimSpeed: 0.18, gain: 1.9, loss: 0.45, changeInterval: 24, evasion: 0.08 };
      case 'RARE':
        // Dynamic (~2.5s - 2.8s)
        return { targetRadius: 17, swimSpeed: 0.23, gain: 1.7, loss: 0.50, changeInterval: 18, evasion: 0.12 };
      case 'EPIC':
        // Lively (~2.8s - 3.2s)
        return { targetRadius: 15, swimSpeed: 0.28, gain: 1.5, loss: 0.55, changeInterval: 14, evasion: 0.16 };
      case 'MYTHIC':
        // Agile (~3.2s - 3.5s)
        return { targetRadius: 13, swimSpeed: 0.34, gain: 1.4, loss: 0.60, changeInterval: 11, evasion: 0.20 };
      case 'SECRET':
        // Evasive (~3.5s - 3.8s)
        return { targetRadius: 11, swimSpeed: 0.40, gain: 1.3, loss: 0.65, changeInterval: 9, evasion: 0.24 };
      case 'GODLY':
        // Elite (~3.8s - 4.0s)
        return { targetRadius: 9.5, swimSpeed: 0.46, gain: 1.2, loss: 0.70, changeInterval: 7, evasion: 0.28 };
      case 'ARCANE':
        // Boss tier (~4.0s - 4.5s)
        return { targetRadius: 8.5, swimSpeed: 0.52, gain: 1.1, loss: 0.75, changeInterval: 6, evasion: 0.32 };
      default:
        return { targetRadius: 16, swimSpeed: 0.22, gain: 1.6, loss: 0.50, changeInterval: 20, evasion: 0.14 };
    }
  };

  const diffParams = getFishDifficultyParams(targetFish);


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
      if (biteTimeoutRef.current) {
        clearTimeout(biteTimeoutRef.current);
      }
      if (landingIntervalRef.current) {
        clearInterval(landingIntervalRef.current);
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  // Idle Hint Timer & Grace Period Tracker
  useEffect(() => {
    if (stage === 'IDLE') {
      idleEnterTimeRef.current = Date.now();
      thumbsUpHoldCountRef.current = 0;
      setThumbsUpHoldProgress(0);
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
    }

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [stage]);

  // 2. Optical Motion & Fingertip Direction Tracking Loop
  useEffect(() => {
    if (cameraStatus !== 'ACTIVE') return;

    let prevPixels: Uint8ClampedArray | null = null;
    const interval = setInterval(() => {
      const video = webcamVideoRef.current;
      const canvas = motionCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (canvas.width !== 64) canvas.width = 64;
      if (canvas.height !== 48) canvas.height = 48;
      ctx.drawImage(video, 0, 0, 64, 48);

      const frame = ctx.getImageData(0, 0, 64, 48);
      const data = frame.data;

      if (prevPixels) {
        let diffSum = 0;
        let weightedX = 0;
        let weightedY = 0;
        let motionPoints = 0;

        // Fingertip detection: track topmost active motion cluster (fast single pass, zero skin noise)
        let minY = 48;
        let tipMotionSumX = 0;
        let tipMotionCount = 0;

        for (let i = 0; i < data.length; i += 4) {
          const lumNow = (data[i] + data[i+1] + data[i+2]) / 3;
          const lumPrev = (prevPixels[i] + prevPixels[i+1] + prevPixels[i+2]) / 3;
          const diff = Math.abs(lumNow - lumPrev);

          // Responsive differential motion threshold
          if (diff > 15) {
            diffSum += diff;
            const pixelIdx = i / 4;
            const x = pixelIdx % 64;
            const y = Math.floor(pixelIdx / 64);
            weightedX += x;
            weightedY += y;
            motionPoints++;

            // Detect top-most finger points (index fingertip apex pointing towards camera)
            if (y < minY) {
              minY = y;
              tipMotionSumX = x;
              tipMotionCount = 1;
            } else if (y <= minY + 1.5) {
              tipMotionSumX += x;
              tipMotionCount++;
            }
          }
        }

        const avgMotion = Math.min(100, Math.floor(diffSum / 120));
        if (Math.abs(avgMotion - lastReportedMotionRef.current) >= 4) {
          lastReportedMotionRef.current = avgMotion;
          setMotionIntensity(avgMotion);
        }

        if (motionPoints > 6) {
          // Centroid coordinates (mirrored X)
          const centroidX = (1 - (weightedX / motionPoints) / 64) * 100;
          const centroidY = ((weightedY / motionPoints) / 48) * 100;

          let rawX = centroidX;
          let rawY = centroidY;

          // MAXIMUM EMPHASIS ON INDEX FINGERTIP APEX (98% tip + 2% anchor: zero knuckle pull!)
          if (tipMotionCount > 0) {
            const tipX = (1 - (tipMotionSumX / tipMotionCount) / 64) * 100;
            const tipY = ((minY + 0.3) / 48) * 100;
            rawX = tipX * 0.98 + centroidX * 0.02;
            rawY = tipY * 0.98 + centroidY * 0.02;
          }

          // Ultra-low latency tracking filter (0.85 response rate = instant real-time reaction)
          handPosRef.current.x += (rawX - handPosRef.current.x) * 0.85;
          handPosRef.current.y += (rawY - handPosRef.current.y) * 0.85;

          setHandPos({
            x: Math.round(handPosRef.current.x),
            y: Math.round(handPosRef.current.y)
          });

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
        }

        // LOW-THRESHOLD THUMBS UP (👍) GESTURE DETECTOR
        // Runs in IDLE, CATCH_SUCCESS, LOST (lightweight, highly forgiving threshold)
        if (stage === 'IDLE' || stage === 'CATCH_SUCCESS' || stage === 'LOST') {
          let skinMinX = 64, skinMaxX = 0, skinMinY = 48, skinMaxY = 0;
          let skinCount = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            // Highly tolerant skin/hand detector across pale/tan/deep skin and diverse webcams
            const isSkin = (r > 35 && g > 15 && b > 10 && r > b && (r >= g - 12)) ||
                           (prevPixels && Math.abs((r+g+b)/3 - ((prevPixels[i]+prevPixels[i+1]+prevPixels[i+2])/3)) > 14 && (r + g + b) > 80);

            if (isSkin) {
              const px = (i / 4) % 64;
              const py = Math.floor((i / 4) / 64);
              if (px < skinMinX) skinMinX = px;
              if (px > skinMaxX) skinMaxX = px;
              if (py < skinMinY) skinMinY = py;
              if (py > skinMaxY) skinMaxY = py;
              skinCount++;
            }
          }

          let isCandidate = false;

          // Forgiving threshold: hand has at least 8 pixels (works at standard desktop distance)
          if (skinCount >= 8 && (skinMaxY - skinMinY) >= 5 && (skinMaxX - skinMinX) >= 4) {
            const handH = skinMaxY - skinMinY + 1;
            const handW = skinMaxX - skinMinX + 1;
            const topBoundary = skinMinY + Math.max(2, Math.floor(handH * 0.40));

            let topPixels = 0;
            let bottomPixels = 0;
            let topMinX = 64, topMaxX = 0;
            let bottomMinX = 64, bottomMaxX = 0;

            for (let y = skinMinY; y <= skinMaxY; y++) {
              for (let x = skinMinX; x <= skinMaxX; x++) {
                const idx = (y * 64 + x) * 4;
                const r = data[idx], g = data[idx+1], b = data[idx+2];
                const isSkin = (r > 35 && g > 15 && b > 10 && r > b && (r >= g - 12)) ||
                               (prevPixels && Math.abs((r+g+b)/3 - ((prevPixels[idx]+prevPixels[idx+1]+prevPixels[idx+2])/3)) > 14 && (r + g + b) > 80);
                if (isSkin) {
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

            // Low-threshold Thumbs Up Criteria:
            // Upright or compact hand with top thumb protrusion and bottom palm/fist mass
            if (topPixels >= 2 && bottomPixels >= 4 && handH >= handW * 0.50 && topW <= (bottomW * 1.35 + 2)) {
              isCandidate = true;
            }
          }

          // Leaky integrator: fast attack (+2), slow decay (-1) -> instant trigger, zero flicker
          if (isCandidate) {
            thumbsUpCounterRef.current = Math.min(4, thumbsUpCounterRef.current + 2);
          } else {
            thumbsUpCounterRef.current = Math.max(0, thumbsUpCounterRef.current - 1);
          }

          const thumbsUpActive = thumbsUpCounterRef.current >= 2;
          setIsThumbsUp(thumbsUpActive);

          // Hold-to-Cast with Thumbs Up (👍) in IDLE stage
          // 1.2s grace period on entry prevents immediate accidental bite on load
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

            // Cast triggers when held for 0.3s (10 frames)
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
          thumbsUpHoldCountRef.current = 0;
          setIsThumbsUp(false);
          setThumbsUpHoldProgress(0);
        }
      }

      prevPixels = new Uint8ClampedArray(data);
    }, 30);

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

    sound.playCast();
    setStage('CASTING');
    setDepth(30 + Math.floor(Math.random() * 220));

    setTimeout(() => {
      sound.playSplash();
      setStage('WAITING');
      const biteDelay = 3500 + Math.random() * 4000; // 3.5s to 7.5s realistic suspense
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
    if (stage !== 'WAITING' || isRoundFinishedRef.current) return;

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
    setTargetFish(rolled);
    setStage('BITE');

    // Strict 0.75s fast strike window:
    setBiteTimeLeft(0.75);
    if (biteIntervalRef.current) clearInterval(biteIntervalRef.current);
    const biteStart = Date.now();
    const biteDuration = 750; // 0.75s!

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
        triggerLost('ВЫ НЕ УСПЕЛИ РЕЗКО ПОДВИНУТЬ ПАЛЕЦ В КАМЕРУ ЗА 0.75 СЕК! Рыба сорвалась с крючка!');
      }
    }, 20);
  };

  // Fault Mode: Early twitch / false movement penalty during WAITING stage
  const triggerEarlyFoul = () => {
    if (stage !== 'WAITING') return;

    const now = Date.now();
    if (now - lastFoulTimeRef.current > 400) {
      sound.playSnap();
      lastFoulTimeRef.current = now;
    }

    setIsFoul(true);
    setFoulTimeLeft(2.0);

    // Push back bite by adding 2.0s penalty + 3.5s to 6.5s calm-down delay
    if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
    const penaltyDelay = 2000 + 3500 + Math.random() * 3000;
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

  // Strike Handler
  const handleStrike = () => {
    if (stage !== 'BITE') return;
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

    // Reset cumulative off-target timer (1.5s tolerance)
    cumulativeOffTargetMsRef.current = 0;
    setOffTargetMs(0);
    lastTickTimeRef.current = Date.now();

    setFishPos({ x: 50, y: 50 });
    setIsLockedOn(false);
    setControlWarning(null);
    setStage('REELING');
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
      const exitRadius = diffParams.targetRadius + 2.0;
      const isLocked = isLockedOnRef.current ? (distance <= exitRadius) : (distance <= enterRadius);
      isLockedOnRef.current = isLocked;

      // 4. EVASION BEHAVIOR: Continuous escape velocity (Smooth acceleration, ZERO teleport jitter)
      if (isLocked && diffParams.evasion > 0) {
        const safeDist = distance || 1;
        const escapeSpeed = diffParams.swimSpeed * 5 * diffParams.evasion;
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

      setFishPos({
        x: Math.round(fishPosRef.current.x * 10) / 10,
        y: Math.round(fishPosRef.current.y * 10) / 10
      });

      setIsLockedOn((prev) => (prev !== isLocked ? isLocked : prev));

      // 5. CUMULATIVE OFF-TARGET TIMEOUT (User Requirement: 1.5s cumulative across the round)
      if (!isLocked) {
        cumulativeOffTargetMsRef.current += deltaMs;
        setOffTargetMs(Math.min(1500, cumulativeOffTargetMsRef.current));

        if (cumulativeOffTargetMsRef.current >= 1500) {
          isRoundFinishedRef.current = true;
          clearInterval(loop);
          sound.playSnap();
          triggerLost('ЛЕСКА ПОРВАНА: палец был вне рыбы суммарно более 1.5 секунды!');
          return;
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

      // Keep integer percentage in state to prevent redundant micro-renders
      const roundedProgress = Math.round(currentProgressRef.current);
      if (roundedProgress !== lastReportedProgressRef.current) {
        lastReportedProgressRef.current = roundedProgress;
        setCatchProgress(roundedProgress);
      }

      // 7. CATCH LANDING (1.0s acceptance window) OR ZERO-PROGRESS LOST TRIGGER
      if (currentProgressRef.current >= 100) {
        isRoundFinishedRef.current = true;
        clearInterval(loop);
        triggerLandingPhase();
      } else if (currentProgressRef.current <= 0) {
        isRoundFinishedRef.current = true;
        clearInterval(loop);
        sound.playSnap();
        triggerLost('ОБРЫВ: натяжение лески упало до 0%!');
      }

    }, 35);

    return () => clearInterval(loop);
  }, [stage, targetFish, diffParams]);

  // 1.0-Second Landing Acceptance Window (User Requirement: must accept within 1s or lose fish!)
  const triggerLandingPhase = () => {
    sound.playReelClick();
    setStage('LANDING');
    setLandingTimeLeft(1.0);

    const deadline = Date.now() + 1000;
    if (landingIntervalRef.current) clearInterval(landingIntervalRef.current);

    landingIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, (deadline - Date.now()) / 1000);
      setLandingTimeLeft(Math.round(remaining * 100) / 100);

      if (remaining <= 0) {
        if (landingIntervalRef.current) {
          clearInterval(landingIntervalRef.current);
          landingIntervalRef.current = null;
        }
        if (!hasAwardedRef.current) {
          isRoundFinishedRef.current = true;
          sound.playSnap();
          triggerLost('ВЫ НЕ УСПЕЛИ ПРИНЯТЬ РЫБУ ЗА 1 СЕКУНДУ! Добыча выскользнула из рук в океан!');
        }
      }
    }, 20);
  };

  const handleAcceptCatch = () => {
    if (stage !== 'LANDING' || hasAwardedRef.current) return;
    if (landingIntervalRef.current) {
      clearInterval(landingIntervalRef.current);
      landingIntervalRef.current = null;
    }
    triggerCatchSuccess();
  };

  // NO KEYBOARD REELING: Block keyboard during reeling and show prompt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((stage === 'IDLE' || stage === 'CATCH_SUCCESS') && e.code === 'Space') {
        e.preventDefault();
        handleCast();
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
      MYTHIC: 550,
      SECRET: 950,
      GODLY: 1800,
      ARCANE: 4500
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

    // Reset consecutive failures counter on successful catch
    consecutiveFailsRef.current = 0;
    setConsecutiveFails(0);

    setStage('CATCH_SUCCESS');

    confetti({
      particleCount: isArcane ? 180 : 70,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  const triggerLost = (reason?: string) => {
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
              ГОТОВНОСТЬ К ЗАБРОСУ
            </div>

            {/* Assistance Hint if player waited > 6.5s in IDLE */}
            {showIdleHint && (
              <div className="p-3 bg-amber-950/90 border border-amber-400 text-amber-200 pixel-corners shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse space-y-1">
                <div className="font-arcade text-xs flex items-center justify-center gap-1.5 text-amber-300">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>ПОДСКАЗКА: КАК НАЧАТЬ ИГРУ</span>
                </div>
                <div className="font-mono text-[9px] text-zinc-300">
                  Кликните зеленую кнопку <span className="text-emerald-400 font-bold">[ЗАБРОСИТЬ УДОЧКУ]</span> ниже или нажмите клавишу <span className="text-amber-300 font-bold">[Пробел]</span>!
                </div>
              </div>
            )}

            {/* Assistance Guide if player failed >= 2 times in a row */}
            {consecutiveFails >= 2 && (
              <div className="p-3.5 bg-cyan-950/90 border border-cyan-400 pixel-corners text-left space-y-2 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                <div className="font-arcade text-xs text-cyan-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-cyan-400" />
                    <span>СОВЕТЫ ПО ВЫВАЖИВАНИЮ (НЕ УДАЛОСЬ {consecutiveFails}x):</span>
                  </div>
                  <button 
                    onClick={() => setIsGuideOpen(true)}
                    className="text-[8px] font-arcade text-cyan-400 underline hover:text-white"
                  >
                    ПОЛНЫЙ ГАЙД
                  </button>
                </div>
                
                <div className="space-y-1 font-mono text-[9px] text-zinc-200">
                  <div>• <span className="text-amber-300 font-bold">Не двигайте рукой</span> до поклевки (иначе штраф за фальстарт).</div>
                  <div>• <span className="text-amber-300 font-bold">При надписи «КЛЮЕТ!»</span> резко дерните пальцем в камеру (окно 0.75с).</div>
                  <div>• <span className="text-emerald-400 font-bold">Ведите пальцем за рыбой:</span> следите за бирюзовым прицелом ☝️ в окне камеры справа внизу.</div>
                </div>
              </div>
            )}



            {/* Gesture Thumbs Up Charge Widget */}
            <div className={`p-3 border transition-all duration-150 pixel-corners ${
              thumbsUpHoldProgress > 0 
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.7)]' 
                : isThumbsUp 
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                : 'bg-black/60 border-zinc-700/80 text-zinc-300'
            }`}>
              <div className="font-arcade text-xs flex items-center justify-center gap-2">
                <span className={`text-xl ${thumbsUpHoldProgress > 0 ? 'animate-bounce' : ''}`}>👍</span>
                <span>
                  {thumbsUpHoldProgress >= 100
                    ? 'ЗАБРОС УДОЧКИ!'
                    : thumbsUpHoldProgress > 0
                    ? `УДЕРЖИВАЙТЕ ЛАЙК: ${thumbsUpHoldProgress}%`
                    : 'ПОКАЖИТЕ ЖЕСТ «ЛАЙК» (👍) ДЛЯ СТАРТА'}
                </span>
              </div>

              {/* Charge Progress Bar */}
              <div className="w-full bg-zinc-800 h-2 mt-2 rounded-full overflow-hidden border border-zinc-700">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-75 shadow-[0_0_8px_#10b981]"
                  style={{ width: `${thumbsUpHoldProgress}%` }}
                />
              </div>

              <div className="font-mono text-[8px] text-zinc-400 mt-1 flex justify-between items-center">
                <span>Удерживайте 0.3 сек</span>
                <span>Или кликните кнопку ниже</span>
              </div>
            </div>

            <button
              onClick={handleCast}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs tracking-wider border-2 border-emerald-300 shadow-[0_3px_0_#064e3b] transition-all cursor-pointer"
            >
              [ ЗАБРОСИТЬ УДОЧКУ ]
            </button>
            
            <div className="text-[9px] font-arcade text-cyan-300">
              ☝️ УПРАВЛЕНИЕ ОПТИЧЕСКИМ ПРИЦЕЛОМ ПАЛЬЦА ПЕРЕД ВЕБ-КАМЕРОЙ
            </div>
          </div>
        )}

        {/* CASTING Animation phase */}
        {stage === 'CASTING' && (
          <div className="p-4 bg-black/85 border-2 border-emerald-400 font-arcade text-xs sm:text-sm text-emerald-300 animate-pulse pixel-corners shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            ЗАБРОС ЛЕСКИ В ОКЕАН...
          </div>
        )}

        {/* WAITING for Bite with Early Twitch / Foul Mode */}
        {stage === 'WAITING' && (
          <div className="flex flex-col items-center gap-3 max-w-md w-full">
            {isFoul ? (
              <div className="p-4 sm:p-5 bg-red-950/95 border-2 border-red-500 pixel-corners text-center space-y-2 animate-shake shadow-[0_0_35px_rgba(239,68,68,0.7)] w-full">
                <div className="font-arcade text-xs sm:text-sm text-red-300 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                  <span>⚠️ ОШИБКА: ФАЛЬСТАРТ!</span>
                </div>
                <div className="font-arcade text-[10px] text-amber-300">
                  ВЫ ДЕРНУЛИ ПАЛЬЦЕМ РАНЬШЕ ПОКЛЕВКИ!
                </div>
                <div className="font-mono text-[9px] text-zinc-300">
                  Рыба испугалась! Штрафная пауза: <span className="text-red-400 font-bold">{foulTimeLeft.toFixed(1)}с</span>.
                  <br />Не спамьте, держите руку неподвижно!
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-5 bg-[#05110a]/90 border border-emerald-500/60 pixel-corners animate-pulse w-full text-center">
                <div className="flex items-center justify-center gap-2 text-cyan-400 font-arcade text-xs tracking-wider">
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>ОЖИДАНИЕ ПОКЛЕВКИ...</span>
                </div>
                <div className="font-mono text-[10px] text-zinc-400">
                  Держите руку неподвижно! При поклевке резко подвиньте палец в камеру.
                </div>
              </div>
            )}
          </div>
        )}

        {/* BITE Event Alert: 0.5s Rapid Strike QTE */}
        {stage === 'BITE' && (
          <div 
            onClick={handleStrike}
            className="pointer-events-auto cursor-pointer p-6 sm:p-8 bg-red-950/95 border-4 border-amber-400 text-center animate-bounce shadow-[0_0_60px_rgba(239,68,68,0.8)] pixel-corners space-y-3 max-w-md w-full"
          >
            <div className="font-arcade text-xl sm:text-2xl text-amber-300 tracking-widest drop-shadow-[0_2px_4px_black] animate-pulse">
              ! КЛЮЕТ !
            </div>
            <div className="font-arcade text-[10px] sm:text-xs text-white">
              ☝️ РЕЗКО ПОДВИНЬТЕ ПАЛЕЦ В КАМЕРУ! (ОКНО: 0.75 СЕК)
            </div>

            {/* Live 0.75s Fast Shrinking Timer Bar */}
            <div className="space-y-1">
              <div className="flex justify-between font-arcade text-[10px]">
                <span className="text-red-400 font-bold animate-pulse">ОКНО НА ПОДСЕЧКУ:</span>
                <span className="text-amber-300 font-bold text-xs">{biteTimeLeft.toFixed(2)}с / 0.75с</span>
              </div>
              <div className="w-full h-3 bg-black border border-amber-400 p-0.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.max(0, Math.min(100, (biteTimeLeft / 0.75) * 100))}%` }}
                />
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStrike();
              }}
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-arcade text-xs font-bold border-2 border-white shadow-[0_0_20px_rgba(245,158,11,0.8)]"
            >
              [ ПОДСЕЧЬ ПАЛЬЦЕМ / КЛИК ]
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
              <span>! РЫБА НА ПОВЕРХНОСТИ !</span>
            </div>

            <div className="font-arcade text-xs text-emerald-300">
              БЫСТРО ПРИМИТЕ РЫБУ, ИНАЧЕ ОНА ВЫСКОЛЬЗНЕТ!
            </div>

            {/* 1.0s Live Shrinking Bar */}
            <div className="space-y-1">
              <div className="flex justify-between font-arcade text-[10px]">
                <span className="text-red-400 font-bold animate-pulse">ОКНО ПРИЕМА ТРОФЕЯ:</span>
                <span className="text-amber-300 font-bold text-xs">{landingTimeLeft.toFixed(2)}с / 1.00с</span>
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
              className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black font-arcade text-xs sm:text-sm font-bold border-2 border-white shadow-[0_0_30px_rgba(16,185,129,0.9)] animate-pulse tracking-widest"
            >
              [ ПРИНЯТЬ РЫБУ В САДОК ]
            </button>

            <div className="text-[9px] font-arcade text-zinc-400">
              💡 Нажмите кнопку, пробел или сделайте взмах рукой в камере!
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
                  <div className="font-arcade text-[9px] text-zinc-400">ДОБЫЧА НА КРЮЧКЕ:</div>
                  <div className="font-arcade text-xs text-emerald-300 tracking-wider animate-pulse">
                    ??? НЕИЗВЕСТНЫЙ ТРОФЕЙ
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-arcade text-[9px] text-zinc-400">ЗОНА ЗАХВАТА:</div>
                  <div className="font-arcade text-xs text-emerald-400">
                    РАДИУС: {diffParams.targetRadius}%
                  </div>
                </div>
              </div>

              {/* Progress Bar & Stability Tension Meter */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between font-arcade text-[9px]">
                    <span className="text-zinc-400">ПРОГРЕСС ВЫВАЖИВАНИЯ:</span>
                    <span className={catchProgress > 30 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {Math.round(catchProgress)}% / 100%
                    </span>
                  </div>
                  <div className="w-full h-3.5 bg-black border border-emerald-500 p-0.5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.5)] transition-none"
                      style={{ width: `${Math.min(100, Math.max(0, catchProgress)).toFixed(1)}%` }}
                    />
                  </div>
                </div>

                {/* Cumulative 1.5s Off-Target Tolerance Gauge */}
                <div className="space-y-1 pt-1 border-t border-emerald-500/20">
                  <div className="flex justify-between font-arcade text-[8px]">
                    <span className={offTargetMs > 750 ? 'text-red-400 font-bold animate-pulse' : 'text-zinc-400'}>
                      {offTargetMs > 0 ? `⚠️ СХОД ЦЕЛИ (НАКОПЛЕНИЕ): ${(offTargetMs / 1000).toFixed(2)}с / 1.50с` : '✓ ПРИЦЕЛ СТАБИЛЕН (0.00с / 1.50с)'}
                    </span>
                    <span className={offTargetMs > 1000 ? 'text-red-400 font-bold' : offTargetMs > 500 ? 'text-amber-400' : 'text-emerald-400'}>
                      ЗАПАС: {Math.max(0, (1500 - offTargetMs) / 1000).toFixed(2)}с
                    </span>
                  </div>
                  <div className="w-full h-2 bg-black border border-zinc-700 p-0.5 overflow-hidden">
                    <div 
                      className={`h-full transition-none ${
                        offTargetMs > 1000 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : offTargetMs > 500 ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (offTargetMs / 1500) * 100).toFixed(1)}%` }}
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
                  <span>🎯 ТОЧНЫЙ ЗАХВАТ! УДЕРЖИВАЙТЕ ПАЛЕЦ НА РЫБЕ! (+100%)</span>
                ) : (
                  <span>☝️ НАВЕДИТЕ УКАЗАТЕЛЬНЫЙ ПАЛЕЦ НА РЫБУ В КАМЕРЕ!</span>
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

                  {/* Swimming Fish Icon */}
                  <div className="text-xl sm:text-2xl filter drop-shadow-[0_2px_8px_black] animate-wiggle select-none">
                    🐟
                  </div>

                  {/* Target Label */}
                  <div className={`absolute -bottom-5 px-1.5 py-0.2 bg-black/90 border font-arcade text-[7px] truncate ${
                    isLockedOn ? 'border-emerald-400 text-emerald-300' : 'border-amber-400 text-amber-300'
                  }`}>
                    {isLockedOn ? 'ЗАХВАТ 100%' : 'ЦЕЛЬ ДЛЯ ПАЛЬЦА'}
                  </div>
                </div>

                {/* 3. PLAYER'S FINGERTIP RETICLE (Webcam optical tracker - Maximum Emphasis on Index Fingertip) */}
                {cameraStatus === 'ACTIVE' && (
                  <div 
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
                      <span>{isLockedOn ? '☝️ ПАЛЕЦ В ЦЕЛИ!' : '☝️ КОНЧИК ПАЛЬЦА'}</span>
                    </div>
                  </div>
                )}

              </div>

              {/* Arena Footer Info */}
              <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono text-zinc-400 pt-1">
                <div>
                  <span>💡 <strong className="text-white">Совет:</strong> направьте указательный палец в камеру и ведите его за рыбой.</span>
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
          <div className="p-6 bg-red-950/90 border-2 border-red-500 text-center font-arcade text-red-300 space-y-3 pixel-corners animate-shake shadow-[0_0_40px_rgba(239,68,68,0.6)] max-w-md w-full">
            <div className="text-lg">РЫБА СОРВАЛАСЬ!</div>
            <div className="text-xs text-zinc-300 font-mono">
              {lostReason || 'Леска сорвалась. В следующий раз держите палец точнее над рыбой!'}
            </div>
            {consecutiveFails >= 2 && (
              <div className="p-2.5 bg-black/80 border border-amber-400 text-[9px] text-amber-200 font-mono text-left space-y-1">
                <div className="font-arcade text-[10px] text-amber-300 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>ПОДСКАЗКА (НЕ УДАЛОСЬ ВЫЛОВИТЬ {consecutiveFails} РАЗА):</span>
                </div>
                <div>• Не двигайте рукой до сигнала «КЛЮЕТ!» (иначе фальстарт).</div>
                <div>• При поклевке резко двиньте палец в камеру за 0.75с.</div>
                <div>• В вываживании держите бирюзовый прицел ☝️ на рыбе.</div>
              </div>
            )}
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
              <div className="absolute bottom-2 right-2 bg-black/80 border border-zinc-800 px-2 py-0.5 font-arcade text-[9px]">
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
                onClick={handleCast}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-arcade text-xs border border-emerald-300 shadow-[0_3px_0_#064e3b] transition-all cursor-pointer"
              >
                [ ЕЩЕ ЗАБРОС ]
              </button>
              
              {!profile.isRegistered && setTab && (
                <button
                  onClick={() => setTab('auth')}
                  className="py-3 px-3 bg-amber-500 hover:bg-amber-400 text-black font-arcade text-xs border border-amber-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>СОХРАНИТЬ В ПРОФИЛЬ</span>
                </button>
              )}

              <button
                onClick={openBestiary}
                className="py-3 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-arcade text-xs border border-zinc-600 cursor-pointer"
              >
                КАТАЛОГ
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
            <span>ОПТИЧЕСКИЙ ТРЕКИНГ ЖЕСТОВ:</span>
          </div>
          <div><span className="text-cyan-400">[ЗАБРОС]</span> Жест «Лайк» (👍) в камеру (0.3с) или кнопка мышью</div>
          <div><span className="text-amber-400">[ПОДСЕЧКА]</span> Резко подвиньте палец в камеру (окно 0.75 сек)</div>
          <div><span className="text-red-400">[ОШИБКА]</span> Рывок раньше поклевки = фальстарт (штраф 2 сек)</div>
          <div><span className="text-emerald-400">[ВЫВАЖИВАНИЕ]</span> Держите указательный палец на рыбе (срыв при потере 1.5с)</div>
          <div><span className="text-rose-400">[ПРИЕМ]</span> Быстро подтвердите улов (окно ровно 1.0 сек, иначе срыв!)</div>
        </div>

        {/* Right: Persistent Live Camera Viewfinder Window */}
        {cameraEnabled && (
          <div className="relative bg-black border-2 border-emerald-400 p-1 pixel-corners shadow-[0_0_20px_rgba(16,185,129,0.35)] w-40 sm:w-52 ml-auto">
            <div className="flex items-center justify-between text-[7px] font-arcade text-zinc-300 mb-1 px-1">
              <div className="flex items-center gap-1 text-emerald-300">
                <div className={`w-1.5 h-1.5 rounded-full ${cameraStatus === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>ВЕБ-КАМЕРА</span>
              </div>
              <div className={isThumbsUp ? 'text-emerald-400 font-bold animate-pulse' : cameraStatus === 'ACTIVE' ? 'text-zinc-300' : 'text-amber-400'}>
                {isThumbsUp ? '👍 ЛАЙК' : cameraStatus === 'ACTIVE' ? '60 FPS' : cameraStatus === 'CONNECTING' ? 'ЗАПУСК...' : 'ОТКЛ'}
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

              {/* Thumbs Up Detected Badge Overlay */}
              {isThumbsUp && (
                <div className="absolute top-1 left-1 bg-emerald-950/90 border border-emerald-400 px-1.5 py-0.5 rounded font-arcade text-[8px] text-emerald-300 animate-pulse shadow-[0_0_10px_#10b981] z-20 flex items-center gap-1">
                  <span>👍</span>
                  <span>ЛАЙК</span>
                </div>
              )}

              {/* Fingertip Tracking Reticle inside Camera Viewfinder */}
              {cameraStatus === 'ACTIVE' && (
                <div 
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
              <span className={motionIntensity > 20 ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
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
