import { RecipeStep } from '@/lib/types';
import { StepStatus } from '@/hooks/use-cooking-state';

export interface UpNextCardProps {
  step: RecipeStep;
  stepIndex: number;
  allSteps: RecipeStep[];
  stepStatuses: Record<string, StepStatus>;
}

export function UpNextCard({ step, stepIndex, allSteps, stepStatuses }: UpNextCardProps) {
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
