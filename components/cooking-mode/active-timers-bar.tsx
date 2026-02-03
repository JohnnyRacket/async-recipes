'use client';

import { Play, Pause, RotateCcw } from 'lucide-react';
import { RecipeStep } from '@/lib/types';
import { Timer } from '@/hooks/use-cooking-state';
import { Button } from '@/components/ui/button';

export interface ActiveTimersBarProps {
  timers: Timer[];
  steps: RecipeStep[];
  onPauseTimer: (stepId: string) => void;
  onResumeTimer: (stepId: string) => void;
  onResetTimer: (stepId: string) => void;
}

export function ActiveTimersBar({
  timers,
  steps,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
}: ActiveTimersBarProps) {
  if (timers.length === 0) {
    return null;
  }

  return (
    <div className="shrink-0 px-4 sm:px-6 py-3 border-t bg-blue-50 dark:bg-blue-950/30">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Active Timers
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {timers.map((timer) => {
            const idx = steps.findIndex((s) => s.id === timer.stepId);
            const mins = Math.floor(timer.remaining / 60);
            const secs = timer.remaining % 60;
            const isTimerDone = timer.remaining === 0;

            return (
              <div
                key={timer.stepId}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                  isTimerDone
                    ? 'bg-green-100 dark:bg-green-900/50'
                    : 'bg-white dark:bg-slate-800'
                } shadow-sm`}
              >
                <span className="font-medium">Step {idx + 1}</span>
                <span
                  className={`font-mono text-lg ${
                    isTimerDone ? 'text-green-600 font-bold animate-pulse' : ''
                  }`}
                >
                  {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
                </span>
                {timer.isRunning ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPauseTimer(timer.stepId)}
                    className="h-8 w-8 p-0"
                  >
                    <Pause className="w-4 h-4" />
                  </Button>
                ) : !isTimerDone ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResumeTimer(timer.stepId)}
                    className="h-8 w-8 p-0"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResetTimer(timer.stepId)}
                    className="h-8 w-8 p-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
