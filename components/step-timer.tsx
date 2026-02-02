'use client';

import { Timer } from '@/hooks/use-cooking-state';
import { Button } from '@/components/ui/button';

interface StepTimerProps {
  timer: Timer | undefined;
  duration?: number; // default duration in minutes
  onStart: (minutes: number) => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  size?: 'default' | 'large';
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function StepTimer({
  timer,
  duration,
  onStart,
  onPause,
  onResume,
  onReset,
  size = 'default',
}: StepTimerProps) {
  const isLarge = size === 'large';
  const hasTimer = timer !== undefined;
  const isRunning = timer?.isRunning ?? false;
  const isComplete = timer?.remaining === 0;
  const remaining = timer?.remaining ?? 0;
  const total = timer?.total ?? 0;
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;

  if (!hasTimer && duration) {
    // Show start timer button
    return (
      <Button
        variant="outline"
        size={isLarge ? 'lg' : 'default'}
        onClick={() => onStart(duration)}
        className={isLarge ? 'text-lg px-6 py-4' : ''}
      >
        <TimerIcon className={isLarge ? 'w-5 h-5 mr-2' : 'w-4 h-4 mr-2'} />
        Start {duration}m Timer
      </Button>
    );
  }

  if (!hasTimer) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-2 ${isLarge ? 'items-center' : ''}`}>
      {/* Timer display */}
      <div
        className={`font-mono font-bold ${
          isLarge ? 'text-5xl' : 'text-2xl'
        } ${isComplete ? 'text-green-600 animate-pulse' : ''}`}
      >
        {formatTime(remaining)}
      </div>

      {/* Progress bar */}
      <div className={`w-full bg-muted rounded-full ${isLarge ? 'h-3' : 'h-2'}`}>
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isComplete ? 'bg-green-500' : 'bg-primary'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className={`flex gap-2 ${isLarge ? 'mt-2' : ''}`}>
        {isComplete ? (
          <Button
            variant="outline"
            size={isLarge ? 'lg' : 'sm'}
            onClick={onReset}
          >
            <RefreshIcon className="w-4 h-4 mr-1" />
            Reset
          </Button>
        ) : isRunning ? (
          <Button
            variant="outline"
            size={isLarge ? 'lg' : 'sm'}
            onClick={onPause}
          >
            <PauseIcon className="w-4 h-4 mr-1" />
            Pause
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size={isLarge ? 'lg' : 'sm'}
              onClick={onResume}
            >
              <PlayIcon className="w-4 h-4 mr-1" />
              Resume
            </Button>
            <Button
              variant="ghost"
              size={isLarge ? 'lg' : 'sm'}
              onClick={onReset}
            >
              <RefreshIcon className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// Simple icon components
function TimerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="13" r="8" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 9v4l2 2" />
      <path strokeWidth="2" strokeLinecap="round" d="M9 2h6" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 2v2" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
