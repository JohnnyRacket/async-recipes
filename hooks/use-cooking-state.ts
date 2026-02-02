'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { RecipeStep } from '@/lib/types';

export type StepStatus = 'pending' | 'completed';

export interface Timer {
  stepId: string;
  remaining: number; // seconds
  total: number; // seconds
  isRunning: boolean;
}

export interface CookingState {
  stepStatuses: Record<string, StepStatus>;
  timers: Record<string, Timer>;
  selectedStepId: string | null;
}

export interface CookingActions {
  markStep: (stepId: string, status: StepStatus) => void;
  cycleStepStatus: (stepId: string) => void;
  startTimer: (stepId: string, minutes: number) => void;
  pauseTimer: (stepId: string) => void;
  resumeTimer: (stepId: string) => void;
  resetTimer: (stepId: string) => void;
  selectStep: (stepId: string | null) => void;
  getAvailableSteps: (steps: RecipeStep[]) => RecipeStep[];
  getUpcomingSteps: (steps: RecipeStep[]) => RecipeStep[];
  isStepAvailable: (step: RecipeStep) => boolean;
  resetAll: () => void;
}

export function useCookingState(steps: RecipeStep[]): CookingState & CookingActions {
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>(() => {
    const initial: Record<string, StepStatus> = {};
    steps.forEach((step) => {
      initial[step.id] = 'pending';
    });
    return initial;
  });

  const [timers, setTimers] = useState<Record<string, Timer>>({});
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context lazily
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play a beep sound when timer completes
  const playTimerComplete = useCallback(() => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Play three beeps
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 800;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.5);
      }, 600);

      setTimeout(() => {
        const osc3 = audioContext.createOscillator();
        const gain3 = audioContext.createGain();
        osc3.connect(gain3);
        gain3.connect(audioContext.destination);
        osc3.frequency.value = 1000;
        osc3.type = 'sine';
        gain3.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.7);
        osc3.start(audioContext.currentTime);
        osc3.stop(audioContext.currentTime + 0.7);
      }, 1200);
    } catch {
      // Audio not available, fail silently
    }
  }, [getAudioContext]);

  // Timer tick effect
  useEffect(() => {
    const hasRunningTimers = Object.values(timers).some((t) => t.isRunning && t.remaining > 0);

    if (hasRunningTimers && !timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => {
        setTimers((prev) => {
          const updated = { ...prev };
          let shouldPlaySound = false;

          Object.keys(updated).forEach((stepId) => {
            if (updated[stepId].isRunning && updated[stepId].remaining > 0) {
              updated[stepId] = {
                ...updated[stepId],
                remaining: updated[stepId].remaining - 1,
              };
              if (updated[stepId].remaining === 0) {
                shouldPlaySound = true;
              }
            }
          });

          if (shouldPlaySound) {
            playTimerComplete();
          }

          return updated;
        });
      }, 1000);
    } else if (!hasRunningTimers && timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timers, playTimerComplete]);

  const markStep = useCallback((stepId: string, status: StepStatus) => {
    setStepStatuses((prev) => ({
      ...prev,
      [stepId]: status,
    }));
    // Remove timer when step is marked complete
    if (status === 'completed') {
      setTimers((prev) => {
        if (!prev[stepId]) return prev;
        const { [stepId]: removed, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const cycleStepStatus = useCallback((stepId: string) => {
    // Check current status before updating
    const current = stepStatuses[stepId] || 'pending';
    const next: StepStatus = current === 'pending' ? 'completed' : 'pending';
    
    setStepStatuses((prev) => ({
      ...prev,
      [stepId]: next,
    }));
    
    // Remove timer when cycling to completed
    if (next === 'completed') {
      setTimers((prev) => {
        if (!prev[stepId]) return prev;
        const { [stepId]: removed, ...rest } = prev;
        return rest;
      });
    }
  }, [stepStatuses]);

  const startTimer = useCallback((stepId: string, minutes: number) => {
    const totalSeconds = minutes * 60;
    setTimers((prev) => ({
      ...prev,
      [stepId]: {
        stepId,
        remaining: totalSeconds,
        total: totalSeconds,
        isRunning: true,
      },
    }));
  }, []);

  const pauseTimer = useCallback((stepId: string) => {
    setTimers((prev) => {
      if (!prev[stepId]) return prev;
      return {
        ...prev,
        [stepId]: { ...prev[stepId], isRunning: false },
      };
    });
  }, []);

  const resumeTimer = useCallback((stepId: string) => {
    setTimers((prev) => {
      if (!prev[stepId] || prev[stepId].remaining === 0) return prev;
      return {
        ...prev,
        [stepId]: { ...prev[stepId], isRunning: true },
      };
    });
  }, []);

  const resetTimer = useCallback((stepId: string) => {
    setTimers((prev) => {
      if (!prev[stepId]) return prev;
      return {
        ...prev,
        [stepId]: {
          ...prev[stepId],
          remaining: prev[stepId].total,
          isRunning: false,
        },
      };
    });
  }, []);

  const selectStep = useCallback((stepId: string | null) => {
    setSelectedStepId(stepId);
  }, []);

  const isStepAvailable = useCallback(
    (step: RecipeStep): boolean => {
      if (stepStatuses[step.id] === 'completed') return false;
      if (step.dependsOn.length === 0) return true;
      return step.dependsOn.every((depId) => stepStatuses[depId] === 'completed');
    },
    [stepStatuses]
  );

  const getAvailableSteps = useCallback(
    (allSteps: RecipeStep[]): RecipeStep[] => {
      return allSteps.filter(
        (step) => stepStatuses[step.id] !== 'completed' && isStepAvailable(step)
      );
    },
    [stepStatuses, isStepAvailable]
  );

  const getUpcomingSteps = useCallback(
    (allSteps: RecipeStep[]): RecipeStep[] => {
      return allSteps.filter(
        (step) => stepStatuses[step.id] !== 'completed' && !isStepAvailable(step)
      );
    },
    [stepStatuses, isStepAvailable]
  );

  const resetAll = useCallback(() => {
    const initial: Record<string, StepStatus> = {};
    steps.forEach((step) => {
      initial[step.id] = 'pending';
    });
    setStepStatuses(initial);
    setTimers({});
    setSelectedStepId(null);
  }, [steps]);

  return {
    stepStatuses,
    timers,
    selectedStepId,
    markStep,
    cycleStepStatus,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    selectStep,
    getAvailableSteps,
    getUpcomingSteps,
    isStepAvailable,
    resetAll,
  };
}
