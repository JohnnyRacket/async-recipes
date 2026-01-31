import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RecipeStep } from '@/lib/types';

interface StepsListProps {
  steps: RecipeStep[];
}

export function StepsList({ steps }: StepsListProps) {
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
                <div className="flex flex-wrap gap-1">
                  {step.dependsOn.length === 0 ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Can start immediately
                    </Badge>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground mr-1">Requires:</span>
                      {step.dependsOn.map((depId) => {
                        const depIndex = steps.findIndex((s) => s.id === depId);
                        return (
                          <Badge key={depId} variant="secondary" className="text-xs">
                            Step {depIndex + 1}
                          </Badge>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
