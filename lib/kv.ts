import { kv } from '@vercel/kv';
import { unstable_cache } from 'next/cache';
import { Recipe } from './types';
import { seedRecipes } from './seed';

const RECIPE_PREFIX = 'recipe:';
const RECIPE_IDS_KEY = 'recipe-ids';

// Check if we're in development without KV configured
const isKVConfigured = () => {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
};

// In-memory fallback for development without KV
let memoryStore: Map<string, Recipe> = new Map();
let initialized = false;

async function initializeStore() {
  if (initialized) return;
  
  if (isKVConfigured()) {
    // Check if KV has any recipes, if not, seed it
    const existingIds = await kv.smembers(RECIPE_IDS_KEY);
    if (!existingIds || existingIds.length === 0) {
      console.log('Seeding KV store with initial recipes...');
      for (const recipe of seedRecipes) {
        await kv.set(`${RECIPE_PREFIX}${recipe.id}`, recipe);
        await kv.sadd(RECIPE_IDS_KEY, recipe.id);
      }
    }
  } else {
    // Use in-memory store for development
    console.log('KV not configured, using in-memory store with seed data');
    for (const recipe of seedRecipes) {
      memoryStore.set(recipe.id, recipe);
    }
  }
  
  initialized = true;
}

// Get all recipes
export async function getRecipes(): Promise<Recipe[]> {
  await initializeStore();
  
  if (!isKVConfigured()) {
    return Array.from(memoryStore.values()).sort((a, b) => b.createdAt - a.createdAt);
  }
  
  const ids = await kv.smembers(RECIPE_IDS_KEY);
  if (!ids || ids.length === 0) return [];
  
  const recipes = await Promise.all(
    ids.map((id) => kv.get<Recipe>(`${RECIPE_PREFIX}${id}`))
  );
  
  return recipes
    .filter((r): r is Recipe => r !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// Cached version of getRecipes for Server Components
// Revalidates hourly as fallback - new recipes may be added
export const getCachedRecipes = unstable_cache(
  getRecipes,
  ['recipes'],
  { tags: ['recipes'], revalidate: 3600 }
);

// Get a single recipe by ID
export async function getRecipe(id: string): Promise<Recipe | null> {
  await initializeStore();
  
  if (!isKVConfigured()) {
    return memoryStore.get(id) || null;
  }
  
  return kv.get<Recipe>(`${RECIPE_PREFIX}${id}`);
}

// Cached version of getRecipe for Server Components
// Revalidates daily - recipe content rarely changes after creation
export const getCachedRecipe = unstable_cache(
  getRecipe,
  ['recipe'],
  { tags: ['recipes'], revalidate: 86400 }
);

// Get featured recipes
export async function getFeaturedRecipes(): Promise<Recipe[]> {
  const recipes = await getRecipes();
  return recipes.filter((r) => r.featured);
}

// Cached version for Server Components
// Revalidates hourly as fallback
export const getCachedFeaturedRecipes = unstable_cache(
  getFeaturedRecipes,
  ['featured-recipes'],
  { tags: ['recipes'], revalidate: 3600 }
);

// Get recipe count
export async function getRecipeCount(): Promise<number> {
  await initializeStore();
  
  if (!isKVConfigured()) {
    return memoryStore.size;
  }
  
  const ids = await kv.smembers(RECIPE_IDS_KEY);
  return ids?.length || 0;
}

// Save a recipe (used by server actions)
export async function saveRecipe(recipe: Recipe): Promise<void> {
  await initializeStore();
  
  if (!isKVConfigured()) {
    memoryStore.set(recipe.id, recipe);
    return;
  }
  
  await kv.set(`${RECIPE_PREFIX}${recipe.id}`, recipe);
  await kv.sadd(RECIPE_IDS_KEY, recipe.id);
}

// Delete a recipe
export async function deleteRecipe(id: string): Promise<void> {
  await initializeStore();
  
  if (!isKVConfigured()) {
    memoryStore.delete(id);
    return;
  }
  
  await kv.del(`${RECIPE_PREFIX}${id}`);
  await kv.srem(RECIPE_IDS_KEY, id);
}

// Search result type for paginated queries
export interface SearchRecipesResult {
  recipes: Recipe[];
  nextCursor: string | null;
  totalCount: number;
}

// Search and paginate recipes with cursor-based pagination
// Cursor is the createdAt timestamp of the last item (as string)
export async function searchRecipes(options: {
  query?: string;
  cursor?: string;
  limit?: number;
}): Promise<SearchRecipesResult> {
  const { query, cursor, limit = 9 } = options;
  
  // Get all recipes first (we filter and paginate in memory)
  const allRecipes = await getRecipes();
  
  // Filter by search query if provided
  let filteredRecipes = allRecipes;
  if (query && query.trim()) {
    const searchTerm = query.toLowerCase().trim();
    filteredRecipes = allRecipes.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(searchTerm) ||
        recipe.description.toLowerCase().includes(searchTerm) ||
        recipe.ingredients.some((ing) => ing.toLowerCase().includes(searchTerm))
    );
  }
  
  const totalCount = filteredRecipes.length;
  
  // Apply cursor - find items created before the cursor timestamp
  let paginatedRecipes = filteredRecipes;
  if (cursor) {
    const cursorTimestamp = parseInt(cursor, 10);
    paginatedRecipes = filteredRecipes.filter(
      (recipe) => recipe.createdAt < cursorTimestamp
    );
  }
  
  // Take limit + 1 to check if there are more items
  const hasMore = paginatedRecipes.length > limit;
  const recipes = paginatedRecipes.slice(0, limit);
  
  // Next cursor is the createdAt of the last item returned
  const nextCursor = hasMore && recipes.length > 0
    ? recipes[recipes.length - 1].createdAt.toString()
    : null;
  
  return {
    recipes,
    nextCursor,
    totalCount,
  };
}

// Cached version of searchRecipes for Server Components
export const getCachedSearchRecipes = unstable_cache(
  searchRecipes,
  ['search-recipes'],
  { tags: ['recipes'], revalidate: 3600 }
);
