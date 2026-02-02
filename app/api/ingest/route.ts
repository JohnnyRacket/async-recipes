import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { RecipeSchema } from '@/lib/schemas';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the recipe page content (server-side to avoid CORS)
    const pageResponse = await fetch(url, {
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
      .filter((url): url is string => url !== null && url.startsWith('http'))
      .slice(0, 5); // Keep top 5 potential images

    // Strip HTML tags for cleaner input (basic cleanup)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000); // Limit to avoid token limits

    // Use AI SDK to stream structured recipe extraction
    const result = streamObject({
      model: openai('gpt-4o-mini'),
      schema: RecipeSchema,
      prompt: `Extract a recipe from the following webpage content. 
      
IMPORTANT: Analyze the cooking steps carefully to identify dependencies:
- Steps that can start immediately (like prep work, preheating) should have empty dependsOn arrays
- Steps that require other steps to complete first should list those step IDs in dependsOn
- Look for phrases like "once the X is done", "after", "when", "while" to identify dependencies
- Parallel opportunities: prep work, preheating, marinating can often happen simultaneously
- Sequential requirements: you can't add ingredients to a pan before heating it

Generate step IDs as "step1", "step2", etc.

Example dependency patterns:
- Boiling water (step1) and chopping vegetables (step2) can happen in parallel: both have empty dependsOn
- Adding pasta to boiling water (step3) depends on step1: dependsOn: ["step1"]
- Combining prepped vegetables with cooked pasta (step4) depends on both: dependsOn: ["step2", "step3"]

IMAGE: If any of these image URLs appears to be the main recipe photo (not an ad, logo, or unrelated image), include it as imageUrl:
${imageUrls.join('\n')}

Webpage content:
${textContent}`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Ingest error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process recipe' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
