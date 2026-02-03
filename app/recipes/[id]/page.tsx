import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCachedRecipe, getCachedRecipes } from '@/lib/kv';
import { IngredientsList } from '@/components/ingredients-list';
import { StepsList } from '@/components/steps-list';
import { InteractiveRecipe } from '@/components/interactive-recipe';
import { GraphSkeleton } from '@/components/graph-skeleton';
import { RecipeImage } from '@/components/recipe-image';
import { Button } from '@/components/ui/button';

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

// Generate static params for pre-rendering seeded recipes
export async function generateStaticParams() {
  const recipes = await getCachedRecipes();
  return recipes.map((recipe) => ({
    id: recipe.id,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getCachedRecipe(id);
  
  if (!recipe) {
    return { title: 'Recipe Not Found | Forked Recipes' };
  }

  return {
    title: `${recipe.title} | Forked Recipes`,
    description: recipe.description,
  };
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getCachedRecipe(id);

  if (!recipe) {
    notFound();
  }

  // Count parallel steps (no dependencies)
  const parallelSteps = recipe.steps.filter((s) => s.dependsOn.length === 0).length;
  
  // Calculate total estimated time
  const totalTime = recipe.steps.reduce((sum, step) => sum + (step.duration || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/recipes">← Back to recipes</Link>
        </Button>
        
        {/* Hero Image */}
        <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden">
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.title}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            priority
          />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">{recipe.title}</h1>
          <p className="text-lg text-muted-foreground">{recipe.description}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <StepsIcon className="w-4 h-4 text-blue-500" />
              <span>{recipe.steps.length} steps</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <IngredientsIcon className="w-4 h-4 text-green-500" />
              <span>{recipe.ingredients.length} ingredients</span>
            </span>
            {totalTime > 0 && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <ClockIcon className="w-4 h-4 text-orange-500" />
                <span>~{totalTime} min total</span>
              </span>
            )}
            {recipe.calories && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CaloriesIcon className="w-4 h-4 text-red-500" />
                <span>{recipe.calories} cal</span>
              </span>
            )}
            {parallelSteps > 1 && (
              <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
                <ParallelIcon className="w-4 h-4" />
                <span>{parallelSteps} steps can start in parallel</span>
              </span>
            )}
            {recipe.sourceUrl && (
              <a 
                href={recipe.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                <span>View source</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ingredients - Sidebar on large screens */}
        <div className="lg:col-span-1">
          <IngredientsList ingredients={recipe.ingredients} />
        </div>

        {/* Steps - Main content */}
        <div className="lg:col-span-2">
          <StepsList steps={recipe.steps} ingredientCategories={recipe.ingredientCategories} />
        </div>
      </div>

      {/* Interactive Dependency Graph - Full width with Suspense boundary */}
      <Suspense fallback={<GraphSkeleton />}>
        <InteractiveRecipe recipe={recipe} />
      </Suspense>
    </div>
  );
}

// Icon components
function StepsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function IngredientsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 6v6l4 2" />
    </svg>
  );
}

function CaloriesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  );
}

function ParallelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
