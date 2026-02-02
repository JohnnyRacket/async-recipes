'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { RecipeSchema } from '@/lib/schemas';
import { saveRecipeAction } from '@/lib/actions';
import { getIngredientColors } from '@/lib/utils';
import type { IngredientCategory } from '@/lib/types';

export function AddRecipeForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { object, submit, isLoading, error, stop } = useObject({
    api: '/api/ingest',
    schema: RecipeSchema,
  });

  const handleExtract = () => {
    if (!url.trim()) return;
    setSaveError(null);
    submit({ url: url.trim() });
  };

  const handleSave = () => {
    if (!object?.title || !object?.steps?.length) return;

    startTransition(async () => {
      try {
        // Filter out any undefined values from streaming partial objects
        const ingredients = (object.ingredients || []).filter((i): i is string => i !== undefined);
        const steps = (object.steps || [])
          .filter((s): s is NonNullable<typeof s> & { id: string; text: string } => 
            s !== undefined && s.id !== undefined && s.text !== undefined
          )
          .map(s => ({
            id: s.id,
            text: s.text,
            dependsOn: (s.dependsOn || []).filter((d): d is string => d !== undefined),
            // Preserve the new metadata fields
            duration: s.duration,
            isPassive: s.isPassive,
            needsTimer: s.needsTimer,
            ingredients: s.ingredients?.filter((i): i is string => i !== undefined),
            temperature: s.temperature,
          }));

        // Clean up ingredientCategories (filter out undefined values from streaming)
        const ingredientCategories = object.ingredientCategories 
          ? Object.fromEntries(
              Object.entries(object.ingredientCategories).filter(
                ([k, v]) => k !== undefined && v !== undefined
              )
            ) as Record<string, IngredientCategory>
          : undefined;

        const result = await saveRecipeAction({
          title: object.title!,
          description: object.description || '',
          imageUrl: object.imageUrl,
          ingredients,
          ingredientCategories,
          steps,
          sourceUrl: url,
        });

        if (result.success && result.id) {
          router.push(`/recipes/${result.id}`);
        } else {
          setSaveError(result.error || 'Failed to save recipe');
        }
      } catch (err) {
        setSaveError('An unexpected error occurred');
      }
    });
  };

  const isComplete = object?.title && object?.ingredients?.length && object?.steps?.length;

  return (
    <div className="space-y-8">
      {/* URL Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Extract Recipe from URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              type="url"
              placeholder="Paste a recipe URL (e.g., https://example.com/recipe)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            {isLoading ? (
              <Button variant="outline" onClick={stop}>
                Stop
              </Button>
            ) : (
              <Button onClick={handleExtract} disabled={!url.trim()}>
                Extract Recipe
              </Button>
            )}
          </div>
          {error && (
            <p className="text-sm text-destructive">
              Error: {error.message || 'Failed to extract recipe'}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Paste any recipe URL and our AI will extract the ingredients, steps, and analyze which steps can run in parallel.
          </p>
        </CardContent>
      </Card>

      {/* Streaming Results Section */}
      {(isLoading || object) && (
        <Card className="overflow-hidden pt-0">
          {/* Hero Image */}
          <div className="relative w-full h-56 bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-950 dark:to-amber-900">
            {object?.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={object.imageUrl} 
                  alt={object.title || 'Recipe'} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 mx-auto text-orange-300 dark:text-orange-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-orange-400 dark:text-orange-600">
                    {isLoading ? 'Looking for recipe image...' : 'No image found'}
                  </p>
                </div>
              </div>
            )}
            {/* Status badge */}
            <div className="absolute top-3 right-3">
              {isLoading ? (
                <Badge variant="secondary" className="animate-pulse bg-white/90 dark:bg-black/70">
                  Extracting...
                </Badge>
              ) : (
                <Badge className="bg-green-600">Ready to save</Badge>
              )}
            </div>
          </div>

          <CardContent className="space-y-6 pt-6">
            {/* Title & Description */}
            <div className="space-y-2">
              {object?.title ? (
                <h2 className="text-2xl font-bold">{object.title}</h2>
              ) : (
                <Skeleton className="h-8 w-3/4" />
              )}
              {object?.description ? (
                <p className="text-muted-foreground">{object.description}</p>
              ) : (
                <Skeleton className="h-5 w-full" />
              )}
            </div>

            <Separator />

            {/* Ingredients */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Ingredients {object?.ingredients?.length ? `(${object.ingredients.length})` : ''}
              </label>
              {object?.ingredients?.length ? (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {object.ingredients.map((ingredient, i) => {
                    if (!ingredient) return null;
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground">•</span>
                        <span>{ingredient}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Steps */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Steps {object?.steps?.length ? `(${object.steps.length})` : ''}
              </label>
              {object?.steps?.length ? (
                <ol className="space-y-4">
                  {object.steps.map((step, i) => {
                    if (!step) return null;
                    return (
                      <li key={step.id || i} className="flex gap-4">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                          {i + 1}
                        </span>
                        <div className="flex-1 space-y-2">
                          <p className="text-sm">{step.text}</p>
                          
                          {/* Compact metadata row */}
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                            {step.duration && (
                              <span className="inline-flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                {step.duration} min
                              </span>
                            )}
                            {step.temperature && (
                              <span className="inline-flex items-center gap-1 text-orange-600">
                                <ThermometerIcon className="w-3 h-3" />
                                {step.temperature}
                              </span>
                            )}
                            {step.isPassive && (
                              <span className="text-blue-600">Passive</span>
                            )}
                            {step.needsTimer && (
                              <span className="inline-flex items-center gap-1 text-purple-600">
                                <TimerIcon className="w-3 h-3" />
                                Timer
                              </span>
                            )}
                            {(step.duration || step.temperature || step.isPassive || step.needsTimer) && (
                              <span className="text-border">|</span>
                            )}
                            {!step.dependsOn?.length ? (
                              <span className="text-green-600 font-medium">Start anytime</span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <span className="bg-foreground text-background px-1.5 py-0.5 rounded text-[10px] font-medium">
                                  After
                                </span>
                                {step.dependsOn.filter(Boolean).map((dep, idx) => {
                                  if (!dep) return null;
                                  const depIndex = object.steps?.findIndex((s) => s?.id === dep);
                                  return (
                                    <span key={dep} className="font-medium text-foreground">
                                      {idx > 0 && ', '}
                                      Step {depIndex !== undefined && depIndex >= 0 ? depIndex + 1 : dep}
                                    </span>
                                  );
                                })}
                              </span>
                            )}
                          </div>

                          {/* Ingredient tags with color coding */}
                          {step.ingredients && step.ingredients.filter(Boolean).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {step.ingredients.filter(Boolean).map((ing, idx) => {
                                if (!ing) return null;
                                const colors = getIngredientColors(ing, object?.ingredientCategories as Record<string, IngredientCategory> | undefined);
                                return (
                                  <span
                                    key={idx}
                                    className={`text-[10px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
                                  >
                                    {ing}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            {!isLoading && isComplete && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Recipe extracted successfully. Save it to view the dependency graph.
                  </p>
                  <Button onClick={handleSave} disabled={isPending}>
                    {isPending ? 'Saving...' : 'Save Recipe'}
                  </Button>
                </div>
                {saveError && (
                  <p className="text-sm text-destructive">{saveError}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Compact icon components for step metadata
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
      <path strokeWidth="2" strokeLinecap="round" d="M12 9v4l2 2" />
      <path strokeWidth="2" strokeLinecap="round" d="M9 2h6" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 2v2" />
    </svg>
  );
}
