import { streamObject } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { RecipeSchema, RecipeInput } from '@/lib/schemas';

// Note: Edge runtime removed as it's incompatible with cacheComponents.
// Node.js runtime still provides good streaming performance.

export async function POST(req: Request) {
  try {
    const { url, existingRecipe } = await req.json() as { 
      url: string; 
      existingRecipe: Partial<RecipeInput>;
    };

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!existingRecipe) {
      return new Response(JSON.stringify({ error: 'Existing recipe data is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the recipe page content (server-side to avoid CORS)
    // Use no-store to always fetch fresh content from external recipe pages
    const pageResponse = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AsyncRecipes/1.0)',
      },
    });

    if (!pageResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch URL: ${pageResponse.status}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const html = await pageResponse.text();

    // Extract potential image URLs before stripping HTML
    const imageMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
    const imageUrls = imageMatches
      .map((img) => {
        const match = img.match(/src=["']([^"']+)["']/i);
        return match ? match[1] : null;
      })
      .filter((imgUrl): imgUrl is string => imgUrl !== null && imgUrl.startsWith('http'))
      .slice(0, 10); // Keep top 10 potential images for enhancement pass

    // Strip HTML tags for cleaner input (basic cleanup)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000); // Limit to avoid token limits

    // Use AI SDK to stream structured recipe enhancement
    const result = streamObject({
      model: gateway('openai/gpt-oss-20b'),
      schema: RecipeSchema,
      prompt: `You are FIXING and IMPROVING an existing recipe extraction. The initial extraction often has problems:
- Missing steps (only captured some of the instructions)
- Wrong or missing step dependencies
- Missing ingredients
- Missing metadata (duration, temperature, etc.)

EXISTING RECIPE DATA (starting point - may have errors):
${JSON.stringify(existingRecipe, null, 2)}

YOUR TASK: Compare the existing data against the ORIGINAL WEBPAGE and fix any issues.

=== FIELDS TO PRESERVE (keep unless clearly wrong) ===

TITLE: "${existingRecipe.title || ''}" - Keep this exact title.

IMAGE URL: ${existingRecipe.imageUrl ? `KEEP "${existingRecipe.imageUrl}" - This is already set and MUST appear in your output.` : 'MISSING - Find the main recipe photo below.'}
Available images: ${imageUrls.join(', ')}

DESCRIPTION: ${existingRecipe.description && existingRecipe.description.length >= 20 ? `Keep: "${existingRecipe.description}"` : 'MISSING - Write a 1-2 sentence description.'}

=== FIELDS TO ACTIVELY FIX AND IMPROVE ===

INGREDIENTS - Check the webpage for the COMPLETE ingredient list:
- Current extraction has ${existingRecipe.ingredients?.length || 0} ingredients
- Look for ANY missing ingredients in the webpage
- Include exact quantities (e.g., "2 cups flour", "1 lb chicken")

STEPS - THIS IS CRITICAL - The initial extraction often misses steps:
- Current extraction has ${existingRecipe.steps?.length || 0} steps
- Read the webpage carefully and extract ALL cooking steps
- Common issues: steps merged together, prep steps skipped, final steps omitted
- If the webpage has more steps than the current extraction, ADD THEM
- Number steps sequentially: step1, step2, step3, etc.

STEP DEPENDENCIES - Re-analyze from scratch:
- Don't just copy existing dependsOn - evaluate what makes sense
- Steps that can start immediately = empty dependsOn []
- Steps requiring previous completion = list those step IDs
- Look for parallel opportunities: prep work, preheating, boiling water
- Look for sequences: can't add to pan before heating it

For EACH step, include metadata:
1. DURATION (minutes): Explicit times or infer (chopping: 2-5, sautéing: 5-8, baking: as stated)
2. IS PASSIVE: true = hands-off (simmering, baking), false = active (chopping, stirring)  
3. NEEDS TIMER: true = precise timing needed ("bake 25 min"), false = visual cues ("until golden")
4. INGREDIENTS: Short names for THIS step (e.g., ["chicken", "salt"])
5. TEMPERATURE: If mentioned (e.g., "375°F", "medium-high heat")

INGREDIENT CATEGORIES: Map each short ingredient name to:
- "meat": beef, chicken, pork, bacon, lamb, turkey, sausage
- "seafood": fish, salmon, shrimp, tuna, lobster
- "vegetable": onion, garlic, tomato, pepper, carrot, potato, mushroom
- "dairy": butter, milk, cream, cheese, egg
- "grain": flour, bread, pasta, rice, noodle
- "sauce": sauce, soy sauce, vinegar, oil, broth, wine
- "spice": salt, pepper, cumin, paprika, oregano, basil, sugar, honey
- "chocolate": chocolate, cocoa
- "other": anything else

CALORIES (REQUIRED - always provide):
You MUST always provide a calories estimate. This is a required field.
- FIRST: Look for explicit calorie information on the page (e.g., "350 calories", "450 kcal per serving", "nutrition facts", "calories per serving")
- If found, use that exact number
- If NOT found, estimate based on ingredients and typical serving sizes:
  * Main ingredients (meat/protein: ~200-300 cal, carbs/grains: ~150-200 cal, vegetables: ~50-100 cal per serving)
  * Cooking method (fried adds more calories than baked/grilled)
  * Typical serving sizes
  * Dish type: pasta dishes: 400-600, salads: 200-400, desserts: 300-500, meat dishes: 500-800, soups: 150-300, sandwiches: 400-600
- ALWAYS provide a reasonable estimate even if not explicitly stated (aim for accuracy within 100-200 calories)
- Round to the nearest 10-50 calories (e.g., 425, 350, 580)

=== FINAL VALIDATION ===
Before outputting, verify:
✓ title is set
✓ imageUrl is set (use "${existingRecipe.imageUrl || 'NONE'}" if nothing better)
✓ description is set
✓ ingredients array has ALL ingredients from webpage
✓ steps array has ALL steps from webpage (not just what was in existing data)
✓ each step has: id, text, dependsOn (array)
✓ calories is set (extract from webpage or estimate based on ingredients)

ORIGINAL WEBPAGE CONTENT (source of truth for steps and ingredients):
${textContent}`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Enhance error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to enhance recipe' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
