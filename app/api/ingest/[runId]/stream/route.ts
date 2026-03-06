import { createUIMessageStreamResponse } from 'ai';
import { getRun } from 'workflow/api';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const { searchParams } = new URL(req.url);
  const startIndex = Math.max(0, parseInt(searchParams.get('startIndex') ?? '0', 10));

  try {
    const run = getRun(runId);
    const readable = run.getReadable({ startIndex });
    return createUIMessageStreamResponse({ stream: readable });
  } catch {
    return Response.json({ error: 'Workflow run not found or expired' }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  try {
    const run = getRun(runId);
    await run.cancel();
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: 'Workflow run not found or expired' }, { status: 404 });
  }
}
