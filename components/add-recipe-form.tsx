'use client';

import { useState, useTransition, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { Clock, Thermometer, Timer } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { RecipeSchema, IngestResultSchema } from '@/lib/schemas';
import { saveRecipeAction } from '@/lib/actions';
import { getIngredientColors } from '@/lib/utils';
import type { IngredientCategory } from '@/lib/types';

interface AddRecipeFormProps {
  onReset?: () => void;
}

function AddRecipeForm({ onReset }: AddRecipeFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasAttemptedExtraction, setHasAttemptedExtraction] = useState(false);

  // Initial extraction with validation
  const { 
    object: ingestResult, 
    submit: submitExtract, 
    isLoading: isExtracting, 
    error: extractError, 
    stop: stopExtract 
  } = useObject({
    api: '/api/ingest',
    schema: IngestResultSchema,
  });

  // Derive extracted recipe from ingest result
  const extractedObject = ingestResult?.recipe;
  
  // Check for validation failure (AI determined content is not a valid recipe)
  const isInvalidRecipe = !isExtracting && ingestResult?.isValidRecipe === false;
  const invalidReason = ingestResult?.invalidReason;
  
  // Check for empty response (200 but no data)
  // Only show this error if we've actually attempted an extraction
  const isEmptyResponse = hasAttemptedExtraction && !isExtracting && !extractError && ingestResult === undefined;
  // Also check if isValidRecipe is true but recipe is missing/empty
  const isValidButNoRecipe = hasAttemptedExtraction && !isExtracting && !extractError && ingestResult?.isValidRecipe === true && !extractedObject;

  // Enhancement pass
  const { 
    object: enhancedObject, 
    submit: submitEnhance, 
    isLoading: isEnhancing, 
    error: enhanceError, 
    stop: stopEnhance 
  } = useObject({
    api: '/api/enhance',
    schema: RecipeSchema,
  });

  // Merge enhanced data with extracted data to prevent field loss during streaming
  // This ensures we never lose imageUrl or other fields when enhancing
  // BUT: Enhancement can ADD steps that were missing, so we prefer enhanced steps when available
  const mergedObject = useMemo(() => {
    if (!isEnhanced || !extractedObject) return extractedObject;
    if (!enhancedObject) return extractedObject;
    
    // For steps: Enhancement may find MISSING steps, so prefer enhanced if it has more complete data
    // During streaming, enhanced might be incomplete, so we need smart fallback
    const enhancedStepsCount = enhancedObject.steps?.filter(s => s?.id && s?.text).length ?? 0;
    const extractedStepsCount = extractedObject.steps?.filter(s => s?.id && s?.text).length ?? 0;
    
    let mergedSteps;
    if (enhancedStepsCount >= extractedStepsCount) {
      // Enhanced has same or more steps - use enhanced steps (may have found missing ones)
      // But fill in any missing metadata from extracted during streaming
      mergedSteps = enhancedObject.steps?.map((enhancedStep) => {
        if (!enhancedStep?.id) return enhancedStep;
        // Try to find matching step in extracted by ID
        const extractedStep = extractedObject.steps?.find(s => s?.id === enhancedStep.id);
        
        return {
          id: enhancedStep.id,
          text: enhancedStep.text ?? extractedStep?.text,
          // For dependencies: prefer enhanced (may have re-analyzed them)
          dependsOn: enhancedStep.dependsOn ?? extractedStep?.dependsOn ?? [],
          duration: enhancedStep.duration ?? extractedStep?.duration,
          isPassive: enhancedStep.isPassive ?? extractedStep?.isPassive,
          needsTimer: enhancedStep.needsTimer ?? extractedStep?.needsTimer,
          ingredients: enhancedStep.ingredients ?? extractedStep?.ingredients,
          temperature: enhancedStep.temperature ?? extractedStep?.temperature,
        };
      });
    } else {
      // Enhanced is still streaming and has fewer steps - show extracted while streaming continues
      // But merge in any enhanced metadata for steps that are present
      mergedSteps = extractedObject.steps?.map((extractedStep) => {
        if (!extractedStep?.id) return extractedStep;
        const enhancedStep = enhancedObject.steps?.find(s => s?.id === extractedStep.id);
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

    // Merge ingredient categories
    const mergedIngredientCategories = {
      ...(extractedObject.ingredientCategories || {}),
      ...(enhancedObject.ingredientCategories || {}),
    };

    // For ingredients: prefer enhanced if it has more (may have found missing ones)
    const enhancedIngredientsCount = enhancedObject.ingredients?.filter(i => i).length ?? 0;
    const extractedIngredientsCount = extractedObject.ingredients?.filter(i => i).length ?? 0;

    return {
      // For each field: prefer enhanced if it has a meaningful value, otherwise keep extracted
      title: enhancedObject.title || extractedObject.title,
      description: enhancedObject.description || extractedObject.description,
      // CRITICAL: Preserve imageUrl - only replace if enhanced has a non-empty value
      imageUrl: enhancedObject.imageUrl || extractedObject.imageUrl,
      // Prefer enhanced ingredients if they have more items (may have found missing ones)
      ingredients: enhancedIngredientsCount >= extractedIngredientsCount 
        ? enhancedObject.ingredients 
        : extractedObject.ingredients,
      ingredientCategories: Object.keys(mergedIngredientCategories).length > 0 
        ? mergedIngredientCategories 
        : undefined,
      steps: mergedSteps,
      // Prefer enhanced calories if available, otherwise use extracted
      calories: enhancedObject.calories ?? extractedObject.calories,
    };
  }, [isEnhanced, extractedObject, enhancedObject]);

  // Use the merged object for display
  const object = mergedObject;
  const isLoading = isExtracting || isEnhancing;
  const error = isEnhanced ? enhanceError : extractError;

  // Validate imageUrl is a valid URL before using it
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

  // Check completeness - the merged object should have all required fields
  const objectIsComplete = object?.title && object?.ingredients?.length && object?.steps?.length;
  // Also track if we had complete data before enhancement (for fallback purposes)
  const extractedIsComplete = extractedObject?.title && extractedObject?.ingredients?.length && extractedObject?.steps?.length;

  // Detect extraction failure (completed but no useful data)
  useEffect(() => {
    // Derive extractedObject inside effect to avoid dependency issues
    const extractedObjectFromResult = ingestResult?.recipe;
    
    if (!isExtracting && !extractError && hasAttemptedExtraction) {
      // Check if extraction completed but returned nothing useful
      // Case 1: ingestResult is undefined (empty response)
      // Case 2: extractedObject exists but has no useful data
      if (ingestResult === undefined && url.trim()) {
        setExtractionFailed(true);
      } else if (extractedObjectFromResult !== undefined) {
        const hasUsefulData = extractedObjectFromResult?.title || extractedObjectFromResult?.steps?.length;
        if (!hasUsefulData && url.trim()) {
          setExtractionFailed(true);
        } else {
          setExtractionFailed(false);
        }
      } else if (ingestResult?.isValidRecipe === true && !extractedObjectFromResult && url.trim()) {
        // Valid recipe flag but no recipe data
        setExtractionFailed(true);
      } else {
        setExtractionFailed(false);
      }
    } else if (extractError) {
      setExtractionFailed(false);
    }
  }, [isExtracting, extractError, url, ingestResult, hasAttemptedExtraction]);

  const handleReset = useCallback(() => {
    // Reset extraction attempt tracking
    setHasAttemptedExtraction(false);
    // Call the onReset callback to regenerate the wrapper's key
    // This will remount the form with fresh state
    if (onReset) {
      onReset();
    }
  }, [onReset]);

  const handleExtract = useCallback(() => {
    if (!url.trim()) return;
    setSaveError(null);
    setIsEnhanced(false);
    setExtractionFailed(false);
    setHasAttemptedExtraction(true);
    submitExtract({ url: url.trim() });
  }, [url, submitExtract]);

  const handleRetry = useCallback(() => {
    if (!url.trim()) return;
    setRetryCount(prev => prev + 1);
    setExtractionFailed(false);
    setSaveError(null);
    setIsEnhanced(false);
    setHasAttemptedExtraction(true);
    submitExtract({ url: url.trim() });
  }, [url, submitExtract]);

  const handleEnhance = () => {
    if (!url.trim() || !extractedObject) return;
    setSaveError(null);
    setIsEnhanced(true);
    submitEnhance({ url: url.trim(), existingRecipe: extractedObject });
  };

  const handleStop = () => {
    if (isEnhancing) {
      stopEnhance();
    } else {
      stopExtract();
    }
  };

  const handleSave = () => {
    if (!object?.title || !object?.steps?.length) return;

    startTransition(async () => {
      try {
        // Filter out any undefined values from streaming partial objects
        const ingredients = (object.ingredients || []).filter((i): i is string => 
          i !== undefined && i !== null && typeof i === 'string' && i.trim().length > 0
        );
        
        // Validate we have at least one ingredient
        if (ingredients.length === 0) {
          setSaveError('Recipe must have at least one ingredient');
          return;
        }
        
        const steps = (object.steps || [])
          .filter((s): s is NonNullable<typeof s> & { id: string; text: string } => 
            s !== undefined && 
            s !== null &&
            s.id !== undefined && 
            s.id !== null &&
            typeof s.id === 'string' &&
            s.text !== undefined && 
            s.text !== null &&
            typeof s.text === 'string' &&
            s.text.trim().length > 0
          )
          .map(s => ({
            id: s.id,
            text: s.text,
            // Ensure dependsOn is always a valid array of strings
            dependsOn: Array.isArray(s.dependsOn) 
              ? s.dependsOn.filter((d): d is string => 
                  d !== undefined && d !== null && typeof d === 'string'
                )
              : [],
            // Preserve the new metadata fields
            duration: typeof s.duration === 'number' ? s.duration : undefined,
            isPassive: typeof s.isPassive === 'boolean' ? s.isPassive : undefined,
            needsTimer: typeof s.needsTimer === 'boolean' ? s.needsTimer : undefined,
            ingredients: Array.isArray(s.ingredients) 
              ? s.ingredients.filter((i): i is string => 
                  i !== undefined && i !== null && typeof i === 'string'
                )
              : undefined,
            temperature: typeof s.temperature === 'string' ? s.temperature : undefined,
          }));
        
        // Validate we have at least one valid step
        if (steps.length === 0) {
          setSaveError('Recipe must have at least one valid cooking step');
          return;
        }

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
          calories: typeof object.calories === 'number' ? object.calories : undefined,
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

  // Show save button if the merged object has all required data
  const isComplete = objectIsComplete;

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
              <Button variant="outline" onClick={handleStop}>
                Stop
              </Button>
            ) : (
              <Button onClick={handleExtract} disabled={!url.trim()}>
                Extract Recipe
              </Button>
            )}
          </div>
          {error && (
            <div className="flex items-center justify-between bg-destructive/10 p-3 rounded-md">
              <p className="text-sm text-destructive">
                Error: {error.message || 'Failed to extract recipe'}
              </p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          )}
          {(extractionFailed || isEmptyResponse || isValidButNoRecipe) && !error && !isInvalidRecipe && (
            <div className="flex items-center justify-between bg-amber-100 dark:bg-amber-950 p-3 rounded-md">
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {isEmptyResponse || isValidButNoRecipe 
                    ? 'Received empty response from server'
                    : 'Extraction returned no data'}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {isEmptyResponse || isValidButNoRecipe
                    ? 'The server returned a successful response but no recipe data. This may be a temporary issue.'
                    : 'The AI couldn&apos;t extract a recipe from this page. This can happen with some websites.'}
                  {retryCount > 0 && ` (Attempt ${retryCount + 1})`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRetry} className="ml-4">
                Retry
              </Button>
            </div>
          )}
          {isInvalidRecipe && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive font-medium">This doesn&apos;t appear to be a recipe</p>
              <p className="text-sm text-muted-foreground mt-1">
                {invalidReason || 'The page content could not be identified as a cooking recipe.'}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Paste any recipe URL and our AI will extract the ingredients, steps, and analyze which steps can run in parallel.
          </p>
        </CardContent>
      </Card>

      {/* Streaming Results Section */}
      {(isLoading || object) && !isInvalidRecipe && !isEmptyResponse && !isValidButNoRecipe && (
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
                  {isEnhancing ? 'Enhancing...' : 'Extracting...'}
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
                                // Safety check: ensure colors object exists (shouldn't happen after fix, but defensive)
                                if (!colors || !colors.bg || !colors.text) {
                                  return null;
                                }
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
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    {isEnhanced 
                      ? 'Recipe enhanced! Save it to view the dependency graph.'
                      : isComplete
                        ? 'Recipe extracted. Enhance to fill in missing details, or save now.'
                        : 'Recipe extraction incomplete. Enhance to fill in missing details.'}
                  </p>
                  <div className="flex gap-2">
                    {!isEnhanced && (
                      <Button variant="outline" onClick={handleEnhance} disabled={isPending}>
                        Enhance Recipe
                      </Button>
                    )}
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
                {enhanceError && (
                  <p className="text-sm text-destructive">
                    Enhancement failed: {enhanceError.message || 'Unknown error'}
                  </p>
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
// This ensures the form is reset when returning from other pages
export function AddRecipeFormWrapper() {
  const pathname = usePathname();
  const [mountKey, setMountKey] = useState(() => Date.now());

  // Generate a new key when pathname changes to /add to force remount
  useEffect(() => {
    if (pathname === '/add') {
      setMountKey(Date.now());
    }
  }, [pathname]);

  const handleReset = useCallback(() => {
    setMountKey(Date.now());
  }, []);

  return <AddRecipeForm key={mountKey} onReset={handleReset} />;
}
