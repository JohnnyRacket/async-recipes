import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RecipeStep, IngredientCategory } from '@/lib/types';
import { getIngredientColors } from '@/lib/utils';

interface StepsListProps {
  steps: RecipeStep[];
  ingredientCategories?: Record<string, IngredientCategory>;
}

export function StepsList({ steps, ingredientCategories }: StepsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li key={step.id} className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <div className="flex-1 space-y-2">
                <p>{step.text}</p>
                
                {/* Compact metadata row - combines time, temp, passive, and dependencies */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                  {/* Duration with clock icon */}
                  {step.duration && (
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {step.duration} min
                    </span>
                  )}
                  
                  {/* Temperature with thermometer icon */}
                  {step.temperature && (
                    <span className="inline-flex items-center gap-1 text-orange-600">
                      <ThermometerIcon className="w-3.5 h-3.5" />
                      {step.temperature}
                    </span>
                  )}
                  
                  {/* Passive indicator */}
                  {step.isPassive && (
                    <span className="inline-flex items-center gap-1 text-blue-600">
                      <TimerIcon className="w-3.5 h-3.5" />
                      Passive
                    </span>
                  )}
                  
                  {/* Divider if we have both metadata and dependencies */}
                  {(step.duration || step.temperature || step.isPassive) && (
                    <span className="text-border">|</span>
                  )}
                  
                  {/* Dependencies - compact inline display */}
                  {step.dependsOn.length === 0 ? (
                    <span className="text-green-600 font-medium">Start anytime</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="bg-foreground text-background px-1.5 py-0.5 rounded text-[11px] font-medium">
                        After
                      </span>
                      {step.dependsOn.map((depId, i) => {
                        const depIndex = steps.findIndex((s) => s.id === depId);
                        return (
                          <span key={depId} className="font-medium text-foreground">
                            {i > 0 && <span className="text-muted-foreground">, </span>}
                            Step {depIndex + 1}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </div>

                {/* Ingredient tags with color coding */}
                {step.ingredients && step.ingredients.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {step.ingredients.map((ing, i) => {
                      const colors = getIngredientColors(ing, ingredientCategories);
                      return (
                        <span
                          key={i}
                          className={`text-xs px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}
                        >
                          {ing}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

// Compact icon components
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 6v6l4 2" />
    </svg>
  );
}

function ThermometerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
    </svg>
  );
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="13" r="8" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 9v4l2 2M9 2h6" />
    </svg>
  );
}
