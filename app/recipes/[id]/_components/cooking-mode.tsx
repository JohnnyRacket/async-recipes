'use client';

import { useEffect, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { RecipeStep, Recipe } from '@/lib/types';
import { StepStatus, Timer } from '../_hooks/use-cooking-state';
import { Button } from '@/components/ui/button';
import { StepCard, UpNextCard, ActiveTimersBar } from './cooking-mode/index';

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
          <X className="w-5 h-5 sm:mr-2" />
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
                  <ChevronDown
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
      <ActiveTimersBar
        timers={activeTimers}
        steps={steps}
        onPauseTimer={onPauseTimer}
        onResumeTimer={onResumeTimer}
        onResetTimer={onResetTimer}
      />

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
