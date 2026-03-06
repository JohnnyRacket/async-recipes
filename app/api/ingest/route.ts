import { createUIMessageStreamResponse } from 'ai';
import { start } from 'workflow/api';
import { recipeWorkflow } from '@/workflows/recipe-pipeline';
import { ValidationError, isAppError, errorResponse } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // useChat sends { messages: [...], ...extra body fields }
    // We pass url/text as extra body fields from the client
    const { url, text } = body as { url?: string; text?: string; messages?: unknown[] };

    if (!url && !text) {
      throw new ValidationError('URL or text required', 'MISSING_INPUT');
    }

    // start() is non-blocking — returns a Run immediately, workflow runs durably in background
    const run = await start(recipeWorkflow, [{ url, text }]);

    // run.readable is connected to getWritable() inside the workflow
    // createUIMessageStreamResponse serializes UIMessageChunk objects to SSE for useChat
    return createUIMessageStreamResponse({
      stream: run.readable,
      headers: { 'x-workflow-run-id': run.runId },
    });
  } catch (error) {
    if (isAppError(error)) return errorResponse(error);
    console.error('Workflow start error:', error);
    return Response.json({ error: 'Failed to start workflow' }, { status: 500 });
  }
}
