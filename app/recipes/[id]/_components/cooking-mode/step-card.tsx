'use client';

import {
  Check,
  Clock,
  Timer,
  Thermometer,
  Play,
  Pause,
  RotateCcw,
  Hourglass,
} from 'lucide-react';
import { RecipeStep, IngredientCategory } from '@/lib/types';
import { Timer as TimerType } from '../../_hooks/use-cooking-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getIngredientColors } from '@/lib/utils';

export interface StepCardProps {
  step: RecipeStep;
  stepIndex: number;
  timer: TimerType | undefined;
  ingredientCategories?: Record<string, IngredientCategory>;
  onMarkDone: () => void;
  onStartTimer: (minutes: number) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onResetTimer: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function StepCard({
  step,
  stepIndex,
  timer,
  ingredientCategories,
  onMarkDone,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
}: StepCardProps) {
  const hasTimer = timer !== undefined;
  const isTimerRunning = timer?.isRunning ?? false;
  const isTimerComplete = timer?.remaining === 0;
  const timerRemaining = timer?.remaining ?? 0;
  const timerTotal = timer?.total ?? 0;
  const timerProgress = timerTotal > 0 ? ((timerTotal - timerRemaining) / timerTotal) * 100 : 0;
  
  // Only show timer UI for steps that need precise timing
  const showTimer = step.needsTimer && step.duration;

  // Handle card click - mark done, but not if clicking timer controls
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't mark done if clicking on timer controls
    if ((e.target as HTMLElement).closest('[data-timer-control]')) {
      return;
    }
    onMarkDone();
  };

  return (
    <div
      onClick={handleCardClick}
      className="flex flex-col p-5 rounded-xl border-2 border-green-500/50 hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20 transition-all bg-card cursor-pointer active:scale-[0.98] active:bg-green-100 dark:active:bg-green-900/30"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">Step {stepIndex + 1}</span>
          {step.isPassive && (
            <Badge variant="secondary" className="text-sm px-2 py-0.5">
              <Hourglass className="w-3.5 h-3.5 mr-1" />
              Passive
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600">
          <Check className="w-6 h-6" />
        </div>
      </div>

      {/* Step text */}
      <p className="text-lg leading-relaxed mb-4 flex-1">{step.text}</p>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {step.temperature && (
          <Badge
            variant="outline"
            className="text-sm px-3 py-1.5 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800"
          >
            <Thermometer className="w-4 h-4 mr-1" />
            {step.temperature}
          </Badge>
        )}
        {step.duration && !showTimer && (
          <Badge variant="outline" className="text-sm px-3 py-1.5">
            <Clock className="w-4 h-4 mr-1" />
            ~{step.duration} min
          </Badge>
        )}
      </div>

      {/* Ingredient tags */}
      {step.ingredients && step.ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {step.ingredients.map((ing, i) => {
            const colors = getIngredientColors(ing, ingredientCategories);
            return (
              <span
                key={i}
                className={`text-sm px-2.5 py-1 rounded-md ${colors.bg} ${colors.text}`}
              >
                {ing}
              </span>
            );
          })}
        </div>
      )}

      {/* Timer section - only for steps that need precise timing */}
      {showTimer && (
        <div 
          className="mb-2 p-4 bg-muted/50 rounded-lg"
          data-timer-control
          onClick={(e) => e.stopPropagation()}
        >
          {!hasTimer ? (
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => onStartTimer(step.duration!)}
            >
              <Timer className="w-5 h-5 mr-2" />
              Start {step.duration}m Timer
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Timer display */}
              <div className="flex items-center justify-between">
                <span
                  className={`font-mono text-3xl font-bold ${
                    isTimerComplete ? 'text-green-600 animate-pulse' : ''
                  }`}
                >
                  {formatTime(timerRemaining)}
                </span>
                <div className="flex gap-2">
                  {isTimerComplete ? (
                    <Button variant="outline" size="sm" onClick={onResetTimer} className="h-10 px-4">
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  ) : isTimerRunning ? (
                    <Button variant="outline" size="sm" onClick={onPauseTimer} className="h-10 px-4">
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={onResumeTimer} className="h-10 px-4">
                        <Play className="w-4 h-4 mr-1" />
                        Resume
                      </Button>
                      <Button variant="ghost" size="sm" onClick={onResetTimer} className="h-10 px-4">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    isTimerComplete ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${timerProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tap to complete hint */}
      <div className="text-center text-sm text-muted-foreground mt-auto pt-2">
        Tap card when done
      </div>
    </div>
  );
}
