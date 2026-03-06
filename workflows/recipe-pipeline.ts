import { getWritable, FatalError, RetryableError, createHook } from 'workflow';
import { streamObject } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import type { UIMessageChunk } from 'ai';
import { IngestResultSchema, RecipeSchema } from '@/lib/schemas';
import { buildIngestPrompt, buildEnhancePrompt } from '@/lib/prompts';
import { sanitizeUrl, fetchRecipePage, extractImageUrls, stripHtml } from '@/lib/utils';

export type WorkflowInput = {
  url?: string;
  text?: string;
};

type PreparedContent = {
  textContent: string;
  imageUrls: string[];
  sourceUrl?: string;
};

export async function recipeWorkflow(input: WorkflowInput): Promise<void> {
  'use workflow';

  const prepared = await fetchStep(input);
  const extracted = await extractStep(prepared);

  if (input.url && extracted?.isValidRecipe && extracted?.recipe) {
    const hook = createHook<{ decision: 'enhance' | 'skip' }>();
    await writeDecisionChunk(hook.token);
    const { decision } = await hook;
    if (decision === 'enhance') {
      await enhanceStep({ url: input.url, existingRecipe: extracted.recipe, prepared });
    }
  }

  await finishStep();
}

// ─── Step 1: Fetch & Prepare ──────────────────────────────────────────────────

async function fetchStep(input: WorkflowInput): Promise<PreparedContent> {
  'use step';

  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  await writer.write({ type: 'start' });
  await writer.write({ type: 'data-status', data: { message: 'Fetching recipe page...' } });
  writer.releaseLock();

  if (input.text) {
    return { textContent: input.text.trim().substring(0, 15000), imageUrls: [], sourceUrl: undefined };
  }

  if (!input.url) throw new FatalError('URL or text is required');

  let safeUrl: URL;
  try {
    safeUrl = sanitizeUrl(input.url.trim());
  } catch {
    throw new FatalError('URL failed SSRF validation');
  }

  let html: string;
  try {
    html = await fetchRecipePage(safeUrl);
  } catch (err) {
    throw new RetryableError(`Failed to fetch page: ${String(err)}`, { retryAfter: '5s' });
  }

  return {
    textContent: stripHtml(html).substring(0, 15000),
    imageUrls: extractImageUrls(html, 10),
    sourceUrl: safeUrl.toString(),
  };
}

// ─── Step 2: Extract Recipe ───────────────────────────────────────────────────

async function extractStep(prepared: PreparedContent) {
  'use step';

  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  await writer.write({ type: 'data-status', data: { message: 'Extracting recipe...' } });
  writer.releaseLock();

  const stream = streamObject({
    model: gateway('deepseek/deepseek-v3.2'),
    schema: IngestResultSchema,
    prompt: buildIngestPrompt({ textContent: prepared.textContent, imageUrls: prepared.imageUrls }),
    abortSignal: AbortSignal.timeout(100_000),
  });

  const chunkWriter = writable.getWriter();
  try {
    for await (const partial of stream.partialObjectStream) {
      await chunkWriter.write({ type: 'data-recipe-partial', data: partial });
    }
    const finalObject = await stream.object;
    await chunkWriter.write({ type: 'data-recipe-partial', data: finalObject });
    return finalObject;
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new RetryableError('Extract step timed out after 100s', { retryAfter: '5s' });
    }
    throw err;
  } finally {
    chunkWriter.releaseLock();
  }
}

// ─── Step 3: Write Decision Chunk ─────────────────────────────────────────────

async function writeDecisionChunk(token: string): Promise<void> {
  'use step';

  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  await writer.write({ type: 'data-status', data: { message: 'Recipe extracted! Enhance or save as-is?' } });
  await writer.write({ type: 'data-enhance-decision', data: { token } });
  writer.releaseLock();
}

// ─── Step 4: Enhance Recipe ───────────────────────────────────────────────────

async function enhanceStep({
  url,
  existingRecipe,
  prepared,
}: {
  url: string;
  existingRecipe: object;
  prepared: PreparedContent;
}) {
  'use step';

  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  await writer.write({ type: 'data-status', data: { message: 'Enhancing recipe...' } });
  writer.releaseLock();

  const stream = streamObject({
    model: gateway('deepseek/deepseek-v3.2'),
    schema: RecipeSchema,
    prompt: buildEnhancePrompt({
      url,
      existingRecipe,
      textContent: prepared.textContent,
      imageUrls: prepared.imageUrls,
    }),
    abortSignal: AbortSignal.timeout(100_000),
  });

  const chunkWriter = writable.getWriter();
  try {
    for await (const partial of stream.partialObjectStream) {
      await chunkWriter.write({ type: 'data-recipe-enhanced', data: partial });
    }
    const finalObject = await stream.object;
    await chunkWriter.write({ type: 'data-recipe-enhanced', data: finalObject });
    return finalObject;
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new RetryableError('Enhance step timed out after 100s', { retryAfter: '5s' });
    }
    throw err;
  } finally {
    chunkWriter.releaseLock();
  }
}

// ─── Finish ───────────────────────────────────────────────────────────────────

async function finishStep() {
  'use step';

  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  await writer.write({ type: 'finish', finishReason: 'stop' });
  await writer.close();
}
