import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Recipe } from '@/lib/types';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  // Count how many steps can start immediately (no dependencies)
  const parallelSteps = recipe.steps.filter((s) => s.dependsOn.length === 0).length;
  
  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
        {recipe.imageUrl && (
          <div className="relative w-full h-48">
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}
        <CardHeader>
          <CardTitle className="line-clamp-1">{recipe.title}</CardTitle>
          <CardDescription className="line-clamp-2">
            {recipe.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {recipe.steps.length} steps
            </Badge>
            <Badge variant="outline">
              {recipe.ingredients.length} ingredients
            </Badge>
            {parallelSteps > 1 && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                {parallelSteps} parallel starts
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
