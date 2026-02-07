import { Metadata } from 'next';
import { AddRecipeFormWrapper } from '@/components/add-recipe-form';
import { textInputEnabled } from '@/flags';

export const metadata: Metadata = {
  title: 'Fork a Recipe | Forked Recipes',
  description: 'Extract a recipe from any URL using AI.',
};

export default async function AddPage() {
  const showTextInput = await textInputEnabled();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">✨ Fork a Recipe</h1>
        <p className="text-muted-foreground">
          Paste any recipe URL and our AI will extract the ingredients, steps, and analyze which steps can run in parallel.
        </p>
      </div>
      <AddRecipeFormWrapper textInputEnabled={showTextInput} />
    </div>
  );
}
