'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { saveRecipe } from './kv';
import { Recipe } from './types';
import { RecipeInput } from './schemas';

// Generate a URL-friendly slug from a title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}

interface SaveRecipeResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function saveRecipeAction(
  input: RecipeInput & { sourceUrl?: string }
): Promise<SaveRecipeResult> {
  try {
    // Validate input
    if (!input.title?.trim()) {
      return { success: false, error: 'Title is required' };
    }

    if (!input.steps?.length) {
      return { success: false, error: 'At least one step is required' };
    }

    // Generate unique ID from title
    const baseSlug = generateSlug(input.title);
    const id = `${baseSlug}-${Date.now().toString(36)}`;

    // Create the recipe object
    const recipe: Recipe = {
      id,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      sourceUrl: input.sourceUrl,
      ingredients: input.ingredients || [],
      steps: input.steps.map((step, index) => ({
        id: step.id || `step${index + 1}`,
        text: step.text,
        dependsOn: step.dependsOn || [],
      })),
      createdAt: Date.now(),
      featured: false,
    };

    // Save to KV
    await saveRecipe(recipe);

    // Revalidate caches - Next.js 16 requires second 'max' argument for stale-while-revalidate
    revalidateTag('recipes', 'max');
    revalidatePath('/');
    revalidatePath('/recipes');
    revalidatePath(`/recipes/${id}`);

    return { success: true, id };
  } catch (error) {
    console.error('Failed to save recipe:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save recipe' 
    };
  }
}

export async function deleteRecipeAction(id: string): Promise<SaveRecipeResult> {
  try {
    const { deleteRecipe } = await import('./kv');
    await deleteRecipe(id);

    // Revalidate caches - Next.js 16 requires second 'max' argument for stale-while-revalidate
    revalidateTag('recipes', 'max');
    revalidatePath('/');
    revalidatePath('/recipes');
    revalidatePath(`/recipes/${id}`);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete recipe:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete recipe' 
    };
  }
}
