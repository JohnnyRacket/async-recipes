'use client';

import { Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { Timer as TimerType } from '@/hooks/use-cooking-state';
import { Button } from '@/components/ui/button';

interface StepTimerProps {
  timer: TimerType | undefined;
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
        <Timer className={isLarge ? 'w-5 h-5 mr-2' : 'w-4 h-4 mr-2'} />
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
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        ) : isRunning ? (
          <Button
            variant="outline"
            size={isLarge ? 'lg' : 'sm'}
            onClick={onPause}
          >
            <Pause className="w-4 h-4 mr-1" />
            Pause
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size={isLarge ? 'lg' : 'sm'}
              onClick={onResume}
            >
              <Play className="w-4 h-4 mr-1" />
              Resume
            </Button>
            <Button
              variant="ghost"
              size={isLarge ? 'lg' : 'sm'}
              onClick={onReset}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
