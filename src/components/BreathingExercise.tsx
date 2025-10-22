import { useEffect, useState } from 'react';
import { Wind } from 'lucide-react';

// Fix 1: Mark props as read-only
interface BreathingExerciseProps {
  readonly duration?: number;
  readonly onComplete?: () => void;
}

export default function BreathingExercise({ duration = 30, onComplete }: BreathingExerciseProps) {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [timeLeft, setTimeLeft] = useState(duration);
  const [cycleCount, setCycleCount] = useState(0);

  // Fix 2: Extract timer logic to reduce nesting
  useEffect(() => {
    const handleTimerTick = () => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    };

    const timer = setInterval(handleTimerTick, 1000);
    return () => clearInterval(timer);
  }, [onComplete]);

  // Fix 3: Extract cycle logic to reduce nesting
  const handleCycleTransition = (current: 'inhale' | 'hold' | 'exhale') => {
    if (current === 'inhale') return 'hold';
    if (current === 'hold') return 'exhale';
    setCycleCount((c) => c + 1);
    return 'inhale';
  };

  useEffect(() => {
    const cycleTimer = setInterval(() => {
      setPhase(handleCycleTransition);
    }, 4000);

    return () => clearInterval(cycleTimer);
  }, []);

  // Fix 4: Extract scale calculation
  const getScale = (): number => {
    switch (phase) {
      case 'inhale':
        return 1.4;
      case 'hold':
        return 1.4;
      case 'exhale':
        return 0.8;
      default:
        return 1;
    }
  };

  // Fix 5: Extract phase text
  const getPhaseText = (): string => {
    switch (phase) {
      case 'inhale':
        return 'Breathe In...';
      case 'hold':
        return 'Hold...';
      case 'exhale':
        return 'Breathe Out...';
      default:
        return 'Breathe...';
    }
  };

  // Fix 6: Extract progress calculation
  const getProgressPercentage = (): number => {
    return ((duration - timeLeft) / duration) * 100;
  };

  const scale = getScale();
  const phaseText = getPhaseText();
  const progressPercentage = getProgressPercentage();

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-light text-white">{phaseText}</h2>
        <p className="text-white/70 text-lg">Follow the circle</p>
      </div>

      <div className="relative w-80 h-80 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full transition-all duration-4000 ease-in-out"
          style={{
            transform: `scale(${scale})`,
            background: 'radial-gradient(circle, rgba(152, 216, 200, 0.4), rgba(107, 207, 127, 0.2))',
            filter: 'blur(40px)',
          }}
        />

        <div
          className="absolute rounded-full transition-all duration-4000 ease-in-out"
          style={{
            width: '200px',
            height: '200px',
            transform: `scale(${scale})`,
            background: 'linear-gradient(135deg, #98D8C8, #6BCF7F)',
            boxShadow: '0 0 80px rgba(152, 216, 200, 0.6), inset 0 0 40px rgba(255,255,255,0.2)',
          }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Wind className="w-16 h-16 text-white/90" />
          </div>
        </div>

        <div className="absolute -bottom-4 text-white/50 text-sm">
          Cycle: {cycleCount}
        </div>
      </div>

      <div className="text-center space-y-2">
        <div className="text-4xl font-light text-white">{timeLeft}s</div>
        <p className="text-white/60">Time remaining</p>
      </div>

      <div className="w-full max-w-md h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal-400 to-green-400 transition-all duration-1000 ease-linear"
          style={{
            width: `${progressPercentage}%`,
          }}
        />
      </div>
    </div>
  );
}