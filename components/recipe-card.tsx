'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { RecipeImage } from '@/components/recipe-image';
import { Recipe } from '@/lib/types';

interface RecipeCardProps {
  recipe: Recipe;
  /** When true, clicking opens preview panel instead of navigating to full page */
  previewMode?: boolean;
}

export function RecipeCard({ recipe, previewMode = false }: RecipeCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile screen size (preview panel is hidden below lg breakpoint)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint is 1024px
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Count how many steps can start immediately (no dependencies)
  const parallelSteps = recipe.steps.filter((s) => s.dependsOn.length === 0).length;
  
  // Calculate total time
  const totalTime = recipe.steps.reduce((sum, step) => sum + (step.duration || 0), 0);

  // Check if this recipe is currently being previewed
  const isActive = pathname === `/recipes/preview/${recipe.id}`;

  // Build URL - use /preview/[id] for preview mode on desktop, /[id] for full page
  // On mobile, always use full page since preview panel is hidden
  const getRecipeUrl = () => {
    // On mobile, always navigate to full recipe page
    if (isMobile) {
      return `/recipes/${recipe.id}`;
    }
    
    if (previewMode) {
      // Use preview route and preserve search query
      const query = searchParams.get('q');
      const baseUrl = `/recipes/preview/${recipe.id}`;
      if (query) {
        return `${baseUrl}?q=${encodeURIComponent(query)}`;
      }
      return baseUrl;
    }
    return `/recipes/${recipe.id}`;
  };

  // In preview mode on large screens, we update the URL to show the preview
  // On small screens (where preview panel is hidden), we navigate to full page
  const handleClick = (e: React.MouseEvent) => {
    // On mobile, always navigate normally (no preview mode)
    if (isMobile) {
      return;
    }
    
    if (previewMode) {
      e.preventDefault();
      router.push(getRecipeUrl(), { scroll: false });
    }
  };
  
  return (
    <Link 
      href={getRecipeUrl()}
      onClick={handleClick}
    >
      <Card className={`h-full hover:shadow-lg transition-all cursor-pointer overflow-hidden pt-0 ${
        isActive && previewMode ? 'ring-2 ring-primary shadow-lg' : ''
      }`}>
        <div className="relative w-full h-48">
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.title}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <CardHeader>
          <CardTitle className="line-clamp-1">{recipe.title}</CardTitle>
          <CardDescription className="line-clamp-2">
            {recipe.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <StepsIcon className="w-4 h-4 text-blue-500" />
              <span>{recipe.steps.length} steps</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IngredientsIcon className="w-4 h-4 text-green-500" />
              <span>{recipe.ingredients.length} ingredients</span>
            </span>
            {totalTime > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="w-4 h-4 text-orange-500" />
                <span>{totalTime} min</span>
              </span>
            )}
            {recipe.calories && (
              <span className="inline-flex items-center gap-1.5">
                <CaloriesIcon className="w-4 h-4 text-red-500" />
                <span>{recipe.calories} cal</span>
              </span>
            )}
            {parallelSteps > 1 && (
              <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
                <ParallelIcon className="w-4 h-4" />
                <span>{parallelSteps} parallel</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

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
