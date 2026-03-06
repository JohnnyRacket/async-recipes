import { createUIMessageStreamResponse } from 'ai';
import { getRun } from 'workflow/api';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const { searchParams } = new URL(req.url);
  const startIndex = parseInt(searchParams.get('startIndex') ?? '0', 10);

  const run = getRun(runId);
  const readable = run.getReadable({ startIndex });
  return createUIMessageStreamResponse({ stream: readable });
}
