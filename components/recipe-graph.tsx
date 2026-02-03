'use client';

import dynamic from 'next/dynamic';
import { GraphSkeleton } from '@/components/graph-skeleton';
import type { RecipeStep, IngredientCategory } from '@/lib/types';
import type { StepStatus } from '@/hooks/use-cooking-state';

// Dynamically import the heavy recipe graph component (includes @xyflow/react and dagre)
// This significantly reduces the initial bundle size
const RecipeGraphContent = dynamic(
  () => import('./recipe-graph-content').then((mod) => ({ default: mod.RecipeGraph })),
  {
    ssr: false,
    loading: () => <GraphSkeleton />,
  }
);

// Re-export with the same interface for backwards compatibility
export interface RecipeGraphProps {
  steps: RecipeStep[];
  compact?: boolean;
  ingredientCategories?: Record<string, IngredientCategory>;
  stepStatuses?: Record<string, StepStatus>;
  onStepClick?: (stepId: string) => void;
}

export function RecipeGraph(props: RecipeGraphProps) {
  // For compact mode, use a compact skeleton
  if (props.compact) {
    return (
      <RecipeGraphCompact {...props} />
    );
  }
  
  return <RecipeGraphContent {...props} />;
}

// Separate component for compact mode with compact skeleton
const RecipeGraphCompact = dynamic(
  () => import('./recipe-graph-content').then((mod) => ({ default: mod.RecipeGraph })),
  {
    ssr: false,
    loading: () => <GraphSkeleton compact />,
  }
);
