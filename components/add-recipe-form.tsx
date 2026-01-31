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
import { RecipeSchema, RecipeInput } from '@/lib/schemas';
import { saveRecipeAction } from '@/lib/actions';

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
          .filter((s): s is { id: string; text: string; dependsOn: string[] } => 
            s !== undefined && s.id !== undefined && s.text !== undefined
          )
          .map(s => ({
            id: s.id,
            text: s.text,
            dependsOn: (s.dependsOn || []).filter((d): d is string => d !== undefined),
          }));

        const result = await saveRecipeAction({
          title: object.title!,
          description: object.description || '',
          ingredients,
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {isLoading ? 'Extracting Recipe...' : 'Extracted Recipe'}
              </span>
              {isLoading && (
                <Badge variant="secondary" className="animate-pulse">
                  Streaming
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              {object?.title ? (
                <p className="text-lg font-semibold">{object.title}</p>
              ) : (
                <Skeleton className="h-7 w-64" />
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
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
                        <div className="flex-1 space-y-1">
                          <p className="text-sm">{step.text}</p>
                          <div className="flex gap-1">
                            {!step.dependsOn?.length ? (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                Can start immediately
                              </Badge>
                            ) : (
                              <>
                                <span className="text-xs text-muted-foreground">Requires:</span>
                                {step.dependsOn.map((dep) => {
                                  if (!dep) return null;
                                  const depIndex = object.steps?.findIndex((s) => s?.id === dep);
                                  return (
                                    <Badge key={dep} variant="secondary" className="text-xs">
                                      Step {depIndex !== undefined && depIndex >= 0 ? depIndex + 1 : dep}
                                    </Badge>
                                  );
                                })}
                              </>
                            )}
                          </div>
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
