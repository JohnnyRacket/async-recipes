import { Redis } from '@upstash/redis';
import { cacheTag, cacheLife } from 'next/cache';
import { Recipe } from './types';
import { seedRecipes } from './seed';

const RECIPE_PREFIX = 'recipe:';
const RECIPE_IDS_KEY = 'recipe-ids';

// Check if we're in development without Redis configured
const isRedisConfigured = () => {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
};

// Create Redis client with Vercel KV env var names
const redis = isRedisConfigured()
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

// In-memory fallback for development without Redis
let memoryStore: Map<string, Recipe> = new Map();
let initialized = false;

async function initializeStore() {
  if (initialized) return;
  
  if (isRedisConfigured() && redis) {
    // Check if Redis has any recipes, if not, seed it
    const existingIds = await redis.smembers(RECIPE_IDS_KEY);
    if (!existingIds || existingIds.length === 0) {
      console.log('Seeding Redis store with initial recipes...');
      for (const recipe of seedRecipes) {
        await redis.set(`${RECIPE_PREFIX}${recipe.id}`, recipe);
        await redis.sadd(RECIPE_IDS_KEY, recipe.id);
      }
    }
  } else {
    // Use in-memory store for development
    console.log('Redis not configured, using in-memory store with seed data');
    for (const recipe of seedRecipes) {
      memoryStore.set(recipe.id, recipe);
    }
  }
  
  initialized = true;
}

// Get all recipes
export async function getRecipes(): Promise<Recipe[]> {
  await initializeStore();
  
  if (!isRedisConfigured() || !redis) {
    return Array.from(memoryStore.values()).sort((a, b) => b.createdAt - a.createdAt);
  }
  
  const ids = await redis.smembers(RECIPE_IDS_KEY);
  if (!ids || ids.length === 0) return [];
  
  const recipes = await Promise.all(
    ids.map((id) => redis.get<Recipe>(`${RECIPE_PREFIX}${id}`))
  );
  
  return recipes
    .filter((r): r is Recipe => r !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// Cached version of getRecipes for Server Components
// Revalidates hourly as fallback - new recipes may be added
export async function getCachedRecipes(): Promise<Recipe[]> {
  'use cache'
  cacheTag('recipes')
  cacheLife({ revalidate: 3600 })
  return getRecipes()
}

// Get a single recipe by ID
export async function getRecipe(id: string): Promise<Recipe | null> {
  await initializeStore();
  
  if (!isRedisConfigured() || !redis) {
    return memoryStore.get(id) || null;
  }
  
  return redis.get<Recipe>(`${RECIPE_PREFIX}${id}`);
}

// Cached version of getRecipe for Server Components
// Revalidates daily - recipe content rarely changes after creation
export async function getCachedRecipe(id: string): Promise<Recipe | null> {
  'use cache'
  cacheTag('recipes')
  cacheLife({ revalidate: 86400 })
  return getRecipe(id)
}

// Get featured recipes
export async function getFeaturedRecipes(): Promise<Recipe[]> {
  const recipes = await getRecipes();
  return recipes.filter((r) => r.featured);
}

// Cached version for Server Components
// Revalidates hourly as fallback
export async function getCachedFeaturedRecipes(): Promise<Recipe[]> {
  'use cache'
  cacheTag('recipes')
  cacheLife({ revalidate: 3600 })
  return getFeaturedRecipes()
}

// Get most recent recipes
export async function getRecentRecipes(limit: number = 3): Promise<Recipe[]> {
  const recipes = await getRecipes();
  return recipes.slice(0, limit);
}

// Cached version for Server Components
export async function getCachedRecentRecipes(limit: number = 3): Promise<Recipe[]> {
  'use cache'
  cacheTag('recipes')
  cacheLife({ revalidate: 3600 })
  return getRecentRecipes(limit)
}

// Get recipe count
export async function getRecipeCount(): Promise<number> {
  await initializeStore();
  
  if (!isRedisConfigured() || !redis) {
    return memoryStore.size;
  }
  
  const ids = await redis.smembers(RECIPE_IDS_KEY);
  return ids?.length || 0;
}

// Cached version of getRecipeCount for Server Components
// Uses the 'recipes' tag so it's invalidated when recipes are added/deleted
export async function getCachedRecipeCount(): Promise<number> {
  'use cache'
  cacheTag('recipes')
  cacheLife({ revalidate: 3600 })
  return getRecipeCount()
}

// Save a recipe (used by server actions)
export async function saveRecipe(recipe: Recipe): Promise<void> {
  await initializeStore();
  
  if (!isRedisConfigured() || !redis) {
    memoryStore.set(recipe.id, recipe);
    return;
  }
  
  await redis.set(`${RECIPE_PREFIX}${recipe.id}`, recipe);
  await redis.sadd(RECIPE_IDS_KEY, recipe.id);
}

// Delete a recipe
export async function deleteRecipe(id: string): Promise<void> {
  await initializeStore();
  
  if (!isRedisConfigured() || !redis) {
    memoryStore.delete(id);
    return;
  }
  
  await redis.del(`${RECIPE_PREFIX}${id}`);
  await redis.srem(RECIPE_IDS_KEY, id);
}

// Sync recipe IDs set with actual recipe keys in Redis
// Useful when recipes are deleted directly from the database
export async function syncRecipeIds(): Promise<number> {
  await initializeStore();
  
  if (!isRedisConfigured() || !redis) {
    // For memory store, just return the size
    return memoryStore.size;
  }
  
  // Get all keys matching the recipe prefix
  const keys = await redis.keys(`${RECIPE_PREFIX}*`);
  
  // Extract recipe IDs by removing the prefix
  const recipeIds = keys
    .map((key) => key.replace(RECIPE_PREFIX, ''))
    .filter((id) => id.length > 0); // Filter out any empty strings
  
  // Delete the old set and rebuild it
  await redis.del(RECIPE_IDS_KEY);
  if (recipeIds.length > 0) {
    await redis.sadd(RECIPE_IDS_KEY, ...(recipeIds as [string, ...string[]]));
  }
  
  return recipeIds.length;
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
export async function getCachedSearchRecipes(options: {
  query?: string;
  cursor?: string;
  limit?: number;
}): Promise<SearchRecipesResult> {
  'use cache'
  cacheTag('recipes')
  cacheLife({ revalidate: 3600 })
  return searchRecipes(options)
}
