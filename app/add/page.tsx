import { Metadata } from 'next';
import { AddRecipeForm } from '@/components/add-recipe-form';

export const metadata: Metadata = {
  title: 'Add Recipe | Async Recipes',
  description: 'Extract a recipe from any URL using AI.',
};

export default function AddPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Add Recipe from URL</h1>
        <p className="text-muted-foreground">
          Paste any recipe URL and our AI will extract the ingredients, steps, and analyze which steps can run in parallel.
        </p>
      </div>
      <AddRecipeForm />
    </div>
  );
}
