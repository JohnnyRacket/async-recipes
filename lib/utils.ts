import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { IngredientCategory, RecipeStep } from "./types"
import { ValidationError, ExternalFetchError } from "./errors"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Color mappings for ingredient categories
 */
const INGREDIENT_CATEGORY_COLORS: Record<IngredientCategory, { bg: string; text: string }> = {
  meat: { bg: 'bg-red-100', text: 'text-red-700' },
  seafood: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  vegetable: { bg: 'bg-green-100', text: 'text-green-700' },
  dairy: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  grain: { bg: 'bg-amber-100', text: 'text-amber-700' },
  sauce: { bg: 'bg-orange-100', text: 'text-orange-700' },
  spice: { bg: 'bg-purple-100', text: 'text-purple-700' },
  chocolate: { bg: 'bg-stone-200', text: 'text-stone-700' },
  other: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

/**
 * Fallback keyword matching for recipes without AI-inferred categories
 */
const CATEGORY_KEYWORDS: Record<Exclude<IngredientCategory, 'other'>, string[]> = {
  meat: ['beef', 'chicken', 'pork', 'steak', 'bacon', 'pancetta', 'guanciale', 'lamb', 'turkey', 'sausage', 'meat', 'ham', 'prosciutto'],
  seafood: ['fish', 'salmon', 'shrimp', 'tuna', 'cod', 'lobster', 'crab', 'scallop', 'mussel', 'clam', 'anchovy'],
  vegetable: ['onion', 'garlic', 'tomato', 'pepper', 'carrot', 'celery', 'potato', 'broccoli', 'spinach', 'lettuce', 'cucumber', 'zucchini', 'mushroom', 'asparagus', 'peas', 'beans', 'corn', 'cabbage', 'kale', 'leek', 'shallot', 'ginger', 'snap peas'],
  dairy: ['butter', 'milk', 'cream', 'cheese', 'parmesan', 'pecorino', 'mozzarella', 'cheddar', 'yogurt', 'egg', 'yolk'],
  grain: ['flour', 'bread', 'pasta', 'rice', 'noodle', 'spaghetti', 'oat', 'quinoa', 'couscous', 'tortilla'],
  sauce: ['sauce', 'soy', 'vinegar', 'oil', 'sesame', 'mayo', 'ketchup', 'mustard', 'dressing', 'broth', 'stock', 'wine'],
  spice: ['salt', 'pepper', 'cumin', 'paprika', 'oregano', 'basil', 'thyme', 'rosemary', 'cinnamon', 'vanilla', 'sugar', 'honey', 'syrup'],
  chocolate: ['chocolate', 'cocoa', 'chips'],
};

/**
 * Infer ingredient category using keyword matching (fallback for recipes without AI-inferred categories)
 */
function inferCategoryFromKeywords(ingredient: string): IngredientCategory {
  const lower = ingredient.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return category as IngredientCategory;
    }
  }
  return 'other';
}

/**
 * Get colors for an ingredient based on its category.
 * Uses AI-inferred category from ingredientCategories map if available,
 * otherwise falls back to keyword matching.
 * 
 * @param ingredient - The ingredient name (short name used in steps)
 * @param ingredientCategories - Optional map of ingredient names to categories (from AI inference)
 */
export function getIngredientColors(
  ingredient: string,
  ingredientCategories?: Record<string, IngredientCategory>
): { bg: string; text: string } {
  // Try to find category from AI-inferred map (case-insensitive lookup)
  if (ingredientCategories) {
    const lower = ingredient.toLowerCase();
    for (const [name, category] of Object.entries(ingredientCategories)) {
      if (name.toLowerCase() === lower) {
        // Validate category exists in our color map (handle invalid AI responses)
        const colors = INGREDIENT_CATEGORY_COLORS[category];
        if (colors) {
          return colors;
        }
        // If category is invalid, fall through to keyword matching
        break;
      }
    }
  }
  
  // Fall back to keyword matching
  const category = inferCategoryFromKeywords(ingredient);
  const colors = INGREDIENT_CATEGORY_COLORS[category];
  // This should always exist since inferCategoryFromKeywords always returns a valid category,
  // but add a safety fallback just in case
  return colors || INGREDIENT_CATEGORY_COLORS.other;
}

/**
 * Validates and sanitizes a URL to prevent SSRF attacks.
 * @throws ValidationError if the URL is invalid or targets a blocked host
 */
export function sanitizeUrl(urlString: string): URL {
  let url: URL;
  
  try {
    url = new URL(urlString);
  } catch {
    throw new ValidationError('Invalid URL format', 'INVALID_URL_FORMAT');
  }

  // Only allow http/https protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ValidationError(
      'Only HTTP and HTTPS URLs are allowed',
      'INVALID_PROTOCOL'
    );
  }

  const hostname = url.hostname.toLowerCase();

  // Block localhost and loopback addresses
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '[::1]'
  ) {
    throw new ValidationError(
      'URLs targeting localhost are not allowed',
      'BLOCKED_HOST'
    );
  }

  // Block private IP ranges (RFC 1918)
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b, c] = ipv4Match.map(Number);
    
    // 10.0.0.0/8 (private)
    if (a === 10) {
      throw new ValidationError('Private IP addresses are not allowed', 'BLOCKED_HOST');
    }
    
    // 172.16.0.0/12 (private)
    if (a === 172 && b >= 16 && b <= 31) {
      throw new ValidationError('Private IP addresses are not allowed', 'BLOCKED_HOST');
    }
    
    // 192.168.0.0/16 (private)
    if (a === 192 && b === 168) {
      throw new ValidationError('Private IP addresses are not allowed', 'BLOCKED_HOST');
    }
    
    // 169.254.0.0/16 (link-local, AWS metadata, etc.)
    if (a === 169 && b === 254) {
      throw new ValidationError('Link-local addresses are not allowed', 'BLOCKED_HOST');
    }
    
    // 100.64.0.0/10 (carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) {
      throw new ValidationError('CGNAT addresses are not allowed', 'BLOCKED_HOST');
    }
  }

  // Block common internal hostnames
  const blockedHostPatterns = [
    /^internal\./i,
    /^intranet\./i,
    /^private\./i,
    /^corp\./i,
    /\.local$/i,
    /\.internal$/i,
    /\.localdomain$/i,
  ];

  for (const pattern of blockedHostPatterns) {
    if (pattern.test(hostname)) {
      throw new ValidationError(
        'Internal hostnames are not allowed',
        'BLOCKED_HOST'
      );
    }
  }

  return url;
}

/**
 * Extracts image URLs from HTML content.
 * Handles modern lazy-loading patterns (data-src, data-lazy-src, srcset) 
 * commonly used by WordPress and other CMS platforms.
 * @param html - The HTML content to parse
 * @param maxImages - Maximum number of images to return (default: 5)
 * @returns Array of image URLs
 */
export function extractImageUrls(html: string, maxImages: number = 5): string[] {
  const imageMatches = html.match(/<img[^>]*>/gi) || [];
  const urls: string[] = [];
  
  for (const img of imageMatches) {
    // Try different attributes in order of preference:
    // 1. data-src (common lazy loading)
    // 2. data-lazy-src (WordPress lazy loading)
    // 3. srcset (responsive images - take the first/smallest URL)
    // 4. src (standard attribute, but might be a placeholder)
    
    let url: string | null = null;
    
    // data-src
    const dataSrcMatch = img.match(/data-src=["']([^"']+)["']/i);
    if (dataSrcMatch && dataSrcMatch[1].startsWith('http')) {
      url = dataSrcMatch[1];
    }
    
    // data-lazy-src
    if (!url) {
      const dataLazySrcMatch = img.match(/data-lazy-src=["']([^"']+)["']/i);
      if (dataLazySrcMatch && dataLazySrcMatch[1].startsWith('http')) {
        url = dataLazySrcMatch[1];
      }
    }
    
    // srcset (extract first URL, which is usually the smallest/default)
    if (!url) {
      const srcsetMatch = img.match(/srcset=["']([^"']+)["']/i);
      if (srcsetMatch) {
        // srcset format: "url1 1x, url2 2x" or "url1 300w, url2 600w"
        const firstUrl = srcsetMatch[1].split(',')[0].trim().split(/\s+/)[0];
        if (firstUrl && firstUrl.startsWith('http')) {
          url = firstUrl;
        }
      }
    }
    
    // Standard src (skip data: URLs which are placeholders)
    if (!url) {
      const srcMatch = img.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1].startsWith('http') && !srcMatch[1].startsWith('data:')) {
        url = srcMatch[1];
      }
    }
    
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
    
    if (urls.length >= maxImages) break;
  }
  
  return urls;
}

/**
 * Strips HTML tags and cleans up text content for AI processing.
 * @param html - The HTML content to clean
 * @param maxLength - Maximum length of the resulting text (default: 15000)
 * @returns Cleaned text content
 */
export function stripHtml(html: string, maxLength: number = 15000): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Fetches HTML content from a URL with proper error handling.
 * @param url - The URL to fetch
 * @returns The HTML content as a string
 * @throws ExternalFetchError if the fetch fails
 */
export async function fetchRecipePage(url: URL): Promise<string> {
  const pageResponse = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AsyncRecipes/1.0)',
    },
  });

  if (!pageResponse.ok) {
    throw new ExternalFetchError(
      `Failed to fetch the recipe page (status: ${pageResponse.status})`,
      'FETCH_FAILED'
    );
  }

  return pageResponse.text();
}

/**
 * Finds steps that can start immediately (have no dependencies).
 * @param steps - Array of recipe steps
 * @returns Array of steps that can start immediately
 */
export function getStartingSteps(steps: RecipeStep[]): RecipeStep[] {
  return steps.filter((step) => step.dependsOn.length === 0);
}

/**
 * Gets the IDs of steps that can start immediately (have no dependencies).
 * @param steps - Array of recipe steps
 * @returns Array of step IDs that can start immediately
 */
export function getStartingStepIds(steps: RecipeStep[]): string[] {
  return steps.filter((step) => step.dependsOn.length === 0).map((step) => step.id);
}

/**
 * Validates that an image URL is accessible and returns an actual image.
 * Uses HEAD request to avoid downloading the full image.
 * @param url - The image URL to validate
 * @param timeoutMs - Timeout in milliseconds (default: 3000)
 * @returns Object with isValid status, contentType, and optional error message
 */
export async function validateImageUrl(
  url: string,
  timeoutMs: number = 3000
): Promise<{ isValid: boolean; contentType?: string; error?: string }> {
  try {
    // Basic URL validation
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, error: 'Invalid protocol - must be HTTP or HTTPS' };
    }

    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AsyncRecipes/1.0)',
      },
    });

    if (!response.ok) {
      return { 
        isValid: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      };
    }

    const contentType = response.headers.get('content-type');
    
    // Check if content-type indicates an image
    if (!contentType?.startsWith('image/')) {
      return { 
        isValid: false, 
        contentType: contentType ?? undefined,
        error: `Not an image - content type is ${contentType || 'unknown'}` 
      };
    }

    return { isValid: true, contentType };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        return { isValid: false, error: 'Request timed out' };
      }
      return { isValid: false, error: error.message };
    }
    return { isValid: false, error: 'Unknown error' };
  }
}
