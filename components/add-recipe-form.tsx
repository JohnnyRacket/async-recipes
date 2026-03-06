'use client';

import { useState, useTransition, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useChat } from '@ai-sdk/react';
import { WorkflowChatTransport } from '@workflow/ai';
import { Clock, Thermometer, Timer } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { saveRecipeAction } from '@/lib/actions';
import { getIngredientColors } from '@/lib/utils';
import type { IngredientCategory } from '@/lib/types';
import type { DeepPartial } from 'ai';
import type { IngestResult, RecipeInput } from '@/lib/schemas';

const STORAGE_KEY = 'recipe-workflow-run-id';

type InputMode = 'url' | 'text';

interface AddRecipeFormProps {
  onReset?: () => void;
  textInputEnabled?: boolean;
}

function AddRecipeForm({ onReset, textInputEnabled = false }: AddRecipeFormProps) {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [url, setUrl] = useState('');
  const [recipeText, setRecipeText] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [storedRunId] = useState(() => localStorage.getItem(STORAGE_KEY));

  // Mark extraction as attempted when resuming a prior run
  const [hasAttemptedExtraction, setHasAttemptedExtraction] = useState(() =>
    !!localStorage.getItem(STORAGE_KEY)
  );

  // WorkflowChatTransport only sends { messages } by default — use a ref to
  // inject url/text into the body via prepareSendMessagesRequest
  const pendingBodyRef = useRef<{ url?: string; text?: string }>({});

  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    transport: new WorkflowChatTransport({
      api: '/api/ingest',
      prepareSendMessagesRequest: ({ messages: msgs }) => ({
        body: { messages: msgs, ...pendingBodyRef.current },
      }),
      onChatSendMessage: (response) => {
        const runId = response.headers.get('x-workflow-run-id');
        if (runId) localStorage.setItem(STORAGE_KEY, runId);
      },
    }),
    ...(storedRunId ? { id: storedRunId, resume: true } : {}),
  });


  const isLoading = status === 'submitted' || status === 'streaming';
  const hasError = status === 'error' || !!error;

  // Extract data parts from the latest assistant message
  const lastAssistantMessage = useMemo(
    () => messages.findLast(m => m.role === 'assistant'),
    [messages]
  );

  const parts = useMemo(() => lastAssistantMessage?.parts ?? [], [lastAssistantMessage]);

  // Get latest ingest result partial (streaming extract data)
  const ingestResult = useMemo(() => {
    const latest = [...parts].reverse().find(p => p.type === 'data-recipe-partial');
    return (latest as { type: string; data: DeepPartial<IngestResult> } | undefined)?.data ?? null;
  }, [parts]);

  // Get latest enhanced recipe partial
  const enhancedRecipe = useMemo(() => {
    const latest = [...parts].reverse().find(p => p.type === 'data-recipe-enhanced');
    return (latest as { type: string; data: DeepPartial<RecipeInput> } | undefined)?.data ?? null;
  }, [parts]);

  // Get current status message
  const statusMessage = useMemo(() => {
    const latest = [...parts].reverse().find(p => p.type === 'data-status');
    return (latest as { type: string; data: { message: string } } | undefined)?.data?.message ?? null;
  }, [parts]);

  const extractedObject = ingestResult?.recipe ?? null;
  const isInvalidRecipe = !isLoading && ingestResult?.isValidRecipe === false;
  const invalidReason = ingestResult?.invalidReason;

  // Merge enhanced data with extracted data (same logic as before)
  const mergedObject = useMemo(() => {
    if (!extractedObject) return extractedObject;
    if (!enhancedRecipe) return extractedObject;

    const enhancedStepsCount = enhancedRecipe.steps?.filter(s => s?.id && s?.text).length ?? 0;
    const extractedStepsCount = extractedObject.steps?.filter(s => s?.id && s?.text).length ?? 0;

    let mergedSteps;
    if (enhancedStepsCount >= extractedStepsCount) {
      mergedSteps = enhancedRecipe.steps?.map((enhancedStep) => {
        if (!enhancedStep?.id) return enhancedStep;
        const extractedStep = extractedObject.steps?.find(s => s?.id === enhancedStep.id);
        return {
          id: enhancedStep.id,
          text: enhancedStep.text ?? extractedStep?.text,
          dependsOn: enhancedStep.dependsOn ?? extractedStep?.dependsOn ?? [],
          duration: enhancedStep.duration ?? extractedStep?.duration,
          isPassive: enhancedStep.isPassive ?? extractedStep?.isPassive,
          needsTimer: enhancedStep.needsTimer ?? extractedStep?.needsTimer,
          ingredients: enhancedStep.ingredients ?? extractedStep?.ingredients,
          temperature: enhancedStep.temperature ?? extractedStep?.temperature,
        };
      });
    } else {
      mergedSteps = extractedObject.steps?.map((extractedStep) => {
        if (!extractedStep?.id) return extractedStep;
        const enhancedStep = enhancedRecipe.steps?.find(s => s?.id === extractedStep.id);
        if (!enhancedStep) return extractedStep;
        return {
          id: extractedStep.id,
          text: extractedStep.text,
          dependsOn: enhancedStep.dependsOn ?? extractedStep.dependsOn ?? [],
          duration: enhancedStep.duration ?? extractedStep.duration,
          isPassive: enhancedStep.isPassive ?? extractedStep.isPassive,
          needsTimer: enhancedStep.needsTimer ?? extractedStep.needsTimer,
          ingredients: enhancedStep.ingredients ?? extractedStep.ingredients,
          temperature: enhancedStep.temperature ?? extractedStep.temperature,
        };
      });
    }

    const mergedIngredientCategories = {
      ...(extractedObject.ingredientCategories || {}),
      ...(enhancedRecipe.ingredientCategories || {}),
    };

    const enhancedIngredientsCount = enhancedRecipe.ingredients?.filter(i => i).length ?? 0;
    const extractedIngredientsCount = extractedObject.ingredients?.filter(i => i).length ?? 0;

    return {
      title: enhancedRecipe.title || extractedObject.title,
      description: enhancedRecipe.description || extractedObject.description,
      imageUrl: enhancedRecipe.imageUrl || extractedObject.imageUrl,
      ingredients: enhancedIngredientsCount >= extractedIngredientsCount
        ? enhancedRecipe.ingredients
        : extractedObject.ingredients,
      ingredientCategories: Object.keys(mergedIngredientCategories).length > 0
        ? mergedIngredientCategories
        : undefined,
      steps: mergedSteps,
      calories: enhancedRecipe.calories ?? extractedObject.calories,
    };
  }, [extractedObject, enhancedRecipe]);

  const object = mergedObject;
  const isEnhanced = !!enhancedRecipe;

  const isValidImageUrl = useMemo(() => {
    if (!object?.imageUrl || typeof object.imageUrl !== 'string') return false;
    const urlString = object.imageUrl.trim();
    if (!urlString) return false;
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }, [object?.imageUrl]);

  const objectIsComplete = object?.title && object?.ingredients?.length && object?.steps?.length;
  const hasInput = inputMode === 'url' ? url.trim() : recipeText.trim();

  const handleReset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasAttemptedExtraction(false);
    setMessages([]);
    if (onReset) onReset();
  }, [onReset, setMessages]);

  const submitExtraction = useCallback((isRetry = false) => {
    if (!hasInput) return;
    setSaveError(null);
    setHasAttemptedExtraction(true);
    setMessages([]);
    pendingBodyRef.current = {
      url: inputMode === 'url' ? url.trim() : undefined,
      text: inputMode === 'text' ? recipeText.trim() : undefined,
    };
    sendMessage({ text: inputMode === 'url' ? url : recipeText });
  }, [hasInput, inputMode, url, recipeText, sendMessage, setMessages]);

  const handleExtract = useCallback(() => submitExtraction(false), [submitExtraction]);
  const handleRetry = useCallback(() => submitExtraction(true), [submitExtraction]);
  const handleStop = useCallback(() => {
    const runId = localStorage.getItem(STORAGE_KEY);
    if (runId) {
      fetch(`/api/ingest/${runId}/stream`, { method: 'DELETE' });
    }
    stop();
    handleReset();
  }, [stop, handleReset]);

  const handleSave = () => {
    if (!object?.title || !object?.steps?.length) return;

    startTransition(async () => {
      try {
        const ingredients = (object.ingredients || []).filter((i): i is string =>
          i !== undefined && i !== null && typeof i === 'string' && i.trim().length > 0
        );

        if (ingredients.length === 0) {
          setSaveError('Recipe must have at least one ingredient');
          return;
        }

        const steps = (object.steps || [])
          .filter((s): s is NonNullable<typeof s> & { id: string; text: string } =>
            s !== undefined &&
            s !== null &&
            typeof s.id === 'string' &&
            typeof s.text === 'string' &&
            s.text.trim().length > 0
          )
          .map(s => ({
            id: s.id,
            text: s.text,
            dependsOn: Array.isArray(s.dependsOn)
              ? s.dependsOn.filter((d): d is string => d !== undefined && d !== null && typeof d === 'string')
              : [],
            duration: typeof s.duration === 'number' ? s.duration : undefined,
            isPassive: typeof s.isPassive === 'boolean' ? s.isPassive : undefined,
            needsTimer: typeof s.needsTimer === 'boolean' ? s.needsTimer : undefined,
            ingredients: Array.isArray(s.ingredients)
              ? s.ingredients.filter((i): i is string => i !== undefined && i !== null && typeof i === 'string')
              : undefined,
            temperature: typeof s.temperature === 'string' ? s.temperature : undefined,
          }));

        if (steps.length === 0) {
          setSaveError('Recipe must have at least one valid cooking step');
          return;
        }

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
          calories: typeof object.calories === 'number' ? object.calories : undefined,
          sourceUrl: inputMode === 'url' ? url : undefined,
        });

        if (result.success && result.id) {
          localStorage.removeItem(STORAGE_KEY);
          router.push(`/recipes/${result.id}`);
        } else {
          setSaveError(result.error || 'Failed to save recipe');
        }
      } catch {
        setSaveError('An unexpected error occurred');
      }
    });
  };

  const isComplete = objectIsComplete;

  // Badge label based on workflow status
  const statusBadgeLabel = useMemo(() => {
    if (!isLoading) return null;
    if (statusMessage) return statusMessage;
    return status === 'submitted' ? 'Starting...' : 'Processing...';
  }, [isLoading, statusMessage, status]);

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            {inputMode === 'text' ? 'Paste Recipe Text' : 'Extract Recipe from URL'}
          </CardTitle>
          {textInputEnabled && (
            <div className="flex gap-1 mt-2">
              <Button
                variant={inputMode === 'url' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setInputMode('url')}
                disabled={isLoading}
              >
                From URL
              </Button>
              <Button
                variant={inputMode === 'text' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setInputMode('text')}
                disabled={isLoading}
              >
                From Text
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {inputMode === 'text' ? (
            <div className="space-y-3">
              <textarea
                placeholder="Paste your recipe here — include ingredients, steps, and any other details..."
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
                disabled={isLoading}
                rows={8}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              />
              <div className="flex justify-end">
                {isLoading ? (
                  <Button variant="outline" onClick={handleStop}>
                    Stop
                  </Button>
                ) : (
                  <Button onClick={handleExtract} disabled={!recipeText.trim()}>
                    Extract Recipe
                  </Button>
                )}
              </div>
            </div>
          ) : (
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
                <Button variant="outline" onClick={handleStop}>
                  Stop
                </Button>
              ) : (
                <Button onClick={handleExtract} disabled={!url.trim()}>
                  Extract Recipe
                </Button>
              )}
            </div>
          )}
          {hasError && (
            <div className="flex items-center justify-between bg-destructive/10 p-3 rounded-md">
              <p className="text-sm text-destructive">
                Failed to extract recipe. Please try again.
              </p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          )}
          {isInvalidRecipe && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive font-medium">This doesn&apos;t appear to be a recipe</p>
              <p className="text-sm text-muted-foreground mt-1">
                {invalidReason || 'The content could not be identified as a cooking recipe.'}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {inputMode === 'text'
              ? 'Paste a recipe from any source and our AI will extract the ingredients, steps, and analyze which steps can run in parallel.'
              : 'Paste any recipe URL and our AI will extract and enhance the ingredients, steps, and analyze which steps can run in parallel.'}
          </p>
        </CardContent>
      </Card>

      {/* Streaming Results Section */}
      {(isLoading || object) && !isInvalidRecipe && (
        <Card className="overflow-hidden pt-0">
          {/* Hero Image */}
          <div className="relative w-full h-56 bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-950 dark:to-amber-900">
            {isValidImageUrl && object ? (
              <>
                <Image
                  src={object.imageUrl!}
                  alt={object.title || 'Recipe'}
                  fill
                  unoptimized
                  className="object-cover"
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
            <div className="absolute top-3 right-3 flex gap-2">
              {!isLoading && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleReset}
                  className="bg-white/90 dark:bg-black/70 hover:bg-white dark:hover:bg-black/90"
                >
                  Start Over
                </Button>
              )}
              {isLoading ? (
                <Badge variant="secondary" className="animate-pulse bg-white/90 dark:bg-black/70">
                  {statusBadgeLabel}
                </Badge>
              ) : isEnhanced ? (
                <Badge className="bg-purple-600">Enhanced</Badge>
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
                                <Clock className="w-3 h-3" />
                                {step.duration} min
                              </span>
                            )}
                            {step.temperature && (
                              <span className="inline-flex items-center gap-1 text-orange-600">
                                <Thermometer className="w-3 h-3" />
                                {step.temperature}
                              </span>
                            )}
                            {step.isPassive && (
                              <span className="text-blue-600">Passive</span>
                            )}
                            {step.needsTimer && (
                              <span className="inline-flex items-center gap-1 text-purple-600">
                                <Timer className="w-3 h-3" />
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
                                if (!colors || !colors.bg || !colors.text) return null;
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

            {/* Action Buttons */}
            {!isLoading && extractedObject && (
              <>
                <Separator />
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {isEnhanced
                      ? 'Recipe extracted and enhanced! Save it to view the dependency graph.'
                      : isComplete
                        ? 'Recipe extracted. Save it to view the dependency graph.'
                        : 'Recipe extraction incomplete. Try extracting again.'}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {isComplete && (
                      <Button onClick={handleSave} disabled={isPending}>
                        {isPending ? 'Saving...' : 'Save Recipe'}
                      </Button>
                    )}
                  </div>
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

// Wrapper component that forces remount when navigating to the add page
export function AddRecipeFormWrapper({ textInputEnabled }: { textInputEnabled?: boolean }) {
  const pathname = usePathname();
  const [mountKey, setMountKey] = useState(() => Date.now());

  useEffect(() => {
    if (pathname === '/add') {
      // Don't reset if there's a workflow run to resume
      if (!localStorage.getItem(STORAGE_KEY)) {
        setMountKey(Date.now());
      }
    }
  }, [pathname]);

  const handleReset = useCallback(() => {
    setMountKey(Date.now());
  }, []);

  return <AddRecipeForm key={mountKey} onReset={handleReset} textInputEnabled={textInputEnabled} />;
}
