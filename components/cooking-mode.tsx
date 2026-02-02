'use client';

import { useEffect, useState } from 'react';
import { RecipeStep, Recipe } from '@/lib/types';
import { StepStatus, Timer } from '@/hooks/use-cooking-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getIngredientColors } from '@/lib/utils';

interface CookingModeProps {
  recipe: Recipe;
  stepStatuses: Record<string, StepStatus>;
  timers: Record<string, Timer>;
  selectedStepId: string | null;
  onStepSelect: (stepId: string | null) => void;
  onStepStatusChange: (stepId: string, status: StepStatus) => void;
  onCycleStatus: (stepId: string) => void;
  onStartTimer: (stepId: string, minutes: number) => void;
  onPauseTimer: (stepId: string) => void;
  onResumeTimer: (stepId: string) => void;
  onResetTimer: (stepId: string) => void;
  onClose: () => void;
  getAvailableSteps: (steps: RecipeStep[]) => RecipeStep[];
  getUpcomingSteps: (steps: RecipeStep[]) => RecipeStep[];
}

// StepCard component - tap anywhere to mark done
interface StepCardProps {
  step: RecipeStep;
  stepIndex: number;
  timer: Timer | undefined;
  ingredientCategories?: Record<string, import('@/lib/types').IngredientCategory>;
  onMarkDone: () => void;
  onStartTimer: (minutes: number) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onResetTimer: () => void;
}

function StepCard({
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
              <PassiveIcon className="w-3.5 h-3.5 mr-1" />
              Passive
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600">
          <CheckIcon className="w-6 h-6" />
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
            <ThermometerIcon className="w-4 h-4 mr-1" />
            {step.temperature}
          </Badge>
        )}
        {step.duration && !showTimer && (
          <Badge variant="outline" className="text-sm px-3 py-1.5">
            <ClockIcon className="w-4 h-4 mr-1" />
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
              <TimerIcon className="w-5 h-5 mr-2" />
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
                      <RefreshIcon className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  ) : isTimerRunning ? (
                    <Button variant="outline" size="sm" onClick={onPauseTimer} className="h-10 px-4">
                      <PauseIcon className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={onResumeTimer} className="h-10 px-4">
                        <PlayIcon className="w-4 h-4 mr-1" />
                        Resume
                      </Button>
                      <Button variant="ghost" size="sm" onClick={onResetTimer} className="h-10 px-4">
                        <RefreshIcon className="w-4 h-4" />
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

// Up Next Card for blocked steps
interface UpNextCardProps {
  step: RecipeStep;
  stepIndex: number;
  allSteps: RecipeStep[];
  stepStatuses: Record<string, StepStatus>;
}

function UpNextCard({ step, stepIndex, allSteps, stepStatuses }: UpNextCardProps) {
  const waitingFor = step.dependsOn.filter(
    (depId) => stepStatuses[depId] !== 'completed'
  );

  return (
    <div className="p-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">Step {stepIndex + 1}</span>
        {step.duration && (
          <span className="text-sm text-muted-foreground">~{step.duration} min</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{step.text}</p>
      <p className="text-xs text-muted-foreground">
        <span className="text-yellow-600 dark:text-yellow-500">Waiting for: </span>
        {waitingFor
          .map((depId) => {
            const depIdx = allSteps.findIndex((s) => s.id === depId);
            return `Step ${depIdx + 1}`;
          })
          .join(', ')}
      </p>
    </div>
  );
}

export function CookingMode({
  recipe,
  stepStatuses,
  timers,
  onStepStatusChange,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
  onClose,
  getAvailableSteps,
  getUpcomingSteps,
}: CookingModeProps) {
  const { steps } = recipe;
  const availableSteps = getAvailableSteps(steps);
  const upcomingSteps = getUpcomingSteps(steps);
  const completedCount = Object.values(stepStatuses).filter(
    (s) => s === 'completed'
  ).length;
  const progress = (completedCount / steps.length) * 100;
  const [showUpNext, setShowUpNext] = useState(true);

  // Get active timers for the sticky bar
  const activeTimers = Object.values(timers).filter(
    (t) => t.isRunning || t.remaining < t.total
  );

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleMarkDone = (stepId: string) => {
    onStepStatusChange(stepId, 'completed');
  };

  const isComplete = completedCount === steps.length;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b bg-card shrink-0">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-10 px-3">
          <CloseIcon className="w-5 h-5 sm:mr-2" />
          <span className="hidden sm:inline">Exit</span>
        </Button>
        <h1 className="text-lg sm:text-xl font-semibold truncate max-w-[200px] sm:max-w-md">
          {recipe.title}
        </h1>
        <div className="w-16 sm:w-20" /> {/* Spacer for centering */}
      </header>

      {/* Main content - scrollable */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {isComplete ? (
          /* Recipe Complete State */
          <div className="flex flex-col items-center justify-center min-h-full text-center">
            <div className="text-7xl mb-6">🎉</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Recipe Complete!
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              All {steps.length} steps finished. Enjoy your meal!
            </p>
            <Button size="lg" onClick={onClose} className="h-14 px-8 text-lg">
              Exit Cooking Mode
            </Button>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Available Steps Section */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-green-600 dark:text-green-500 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                Available Now ({availableSteps.length})
              </h2>

              {availableSteps.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg">Waiting for steps to complete...</p>
                  <p className="text-sm mt-2">
                    Check the active timers below.
                  </p>
                </div>
              ) : (
                /* Step Cards Grid - responsive columns */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {availableSteps.map((step) => {
                    const idx = steps.findIndex((s) => s.id === step.id);
                    return (
                      <StepCard
                        key={step.id}
                        step={step}
                        stepIndex={idx}
                        timer={timers[step.id]}
                        ingredientCategories={recipe.ingredientCategories}
                        onMarkDone={() => handleMarkDone(step.id)}
                        onStartTimer={(mins) => onStartTimer(step.id, mins)}
                        onPauseTimer={() => onPauseTimer(step.id)}
                        onResumeTimer={() => onResumeTimer(step.id)}
                        onResetTimer={() => onResetTimer(step.id)}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* Up Next Section - Collapsible */}
            {upcomingSteps.length > 0 && (
              <section>
                <button
                  onClick={() => setShowUpNext(!showUpNext)}
                  className="w-full flex items-center justify-between py-3 text-left"
                >
                  <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    Up Next ({upcomingSteps.length})
                  </h2>
                  <ChevronIcon
                    className={`w-5 h-5 text-muted-foreground transition-transform ${
                      showUpNext ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showUpNext && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-2">
                    {upcomingSteps.map((step) => {
                      const idx = steps.findIndex((s) => s.id === step.id);
                      return (
                        <UpNextCard
                          key={step.id}
                          step={step}
                          stepIndex={idx}
                          allSteps={steps}
                          stepStatuses={stepStatuses}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      {/* Active Timers Bar - sticky above footer */}
      {activeTimers.length > 0 && (
        <div className="shrink-0 px-4 sm:px-6 py-3 border-t bg-blue-50 dark:bg-blue-950/30">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Active Timers
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {activeTimers.map((timer) => {
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
                        <PauseIcon className="w-4 h-4" />
                      </Button>
                    ) : !isTimerDone ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onResumeTimer(timer.stepId)}
                        className="h-8 w-8 p-0"
                      >
                        <PlayIcon className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onResetTimer(timer.stepId)}
                        className="h-8 w-8 p-0"
                      >
                        <RefreshIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar footer */}
      <footer className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t bg-card">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="flex-1">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium whitespace-nowrap">
            {completedCount} / {steps.length} steps
          </span>
        </div>
      </footer>
    </div>
  );
}

// Icon components
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function PassiveIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 7v5l3 3" />
    </svg>
  );
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="13" r="8" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 9v4l2 2" />
      <path strokeWidth="2" strokeLinecap="round" d="M9 2h6" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 2v2" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 6v6l4 2" />
    </svg>
  );
}

function ThermometerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"
      />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
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

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}
