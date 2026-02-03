'use client';

import { useState } from 'react';
import { ChefHat } from 'lucide-react';
import { Recipe } from '@/lib/types';
import { useCookingState } from '@/hooks/use-cooking-state';
import { RecipeGraph } from '@/components/recipe-graph';
import { CookingMode } from '@/components/cooking-mode';
import { Button } from '@/components/ui/button';
import { getStartingSteps } from '@/lib/utils';

interface InteractiveRecipeProps {
  recipe: Recipe;
}

export function InteractiveRecipe({ recipe }: InteractiveRecipeProps) {
  const [showCookingMode, setShowCookingMode] = useState(false);

  const cookingState = useCookingState(recipe.steps);
  
  // Calculate how many steps can start immediately
  const parallelSteps = getStartingSteps(recipe.steps).length;

  return (
    <div className="space-y-6">
      {/* Prominent Start Cooking CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800">
        <div>
          <h2 className="text-xl font-semibold text-green-800 dark:text-green-200">
            Ready to cook?
          </h2>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            {parallelSteps > 1 
              ? `${parallelSteps} steps can start in parallel - perfect for team cooking!`
              : 'Enter cooking mode for step-by-step guidance'}
          </p>
        </div>
        <Button 
          size="lg" 
          onClick={() => setShowCookingMode(true)}
          className="h-14 px-8 text-lg bg-green-600 hover:bg-green-700 text-white shadow-lg"
        >
          <ChefHat className="w-6 h-6 mr-2" />
          Start Cooking
        </Button>
      </div>

      {/* Dependency Graph */}
      <RecipeGraph
        steps={recipe.steps}
        ingredientCategories={recipe.ingredientCategories}
        stepStatuses={cookingState.stepStatuses}
        onStepClick={cookingState.cycleStepStatus}
      />

      {/* Cooking Mode Modal */}
      {showCookingMode && (
        <CookingMode
          recipe={recipe}
          stepStatuses={cookingState.stepStatuses}
          timers={cookingState.timers}
          selectedStepId={cookingState.selectedStepId}
          onStepSelect={cookingState.selectStep}
          onStepStatusChange={cookingState.markStep}
          onCycleStatus={cookingState.cycleStepStatus}
          onStartTimer={cookingState.startTimer}
          onPauseTimer={cookingState.pauseTimer}
          onResumeTimer={cookingState.resumeTimer}
          onResetTimer={cookingState.resetTimer}
          onClose={() => setShowCookingMode(false)}
          getAvailableSteps={cookingState.getAvailableSteps}
          getUpcomingSteps={cookingState.getUpcomingSteps}
        />
      )}
    </div>
  );
}
