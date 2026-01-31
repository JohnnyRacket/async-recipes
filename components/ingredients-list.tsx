import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface IngredientsListProps {
  ingredients: string[];
}

export function IngredientsList({ ingredients }: IngredientsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ingredients</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {ingredients.map((ingredient, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{ingredient}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
