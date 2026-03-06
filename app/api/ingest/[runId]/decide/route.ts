import { resumeHook } from 'workflow/api';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  await params;
  const { token, decision } = await req.json() as { token: string; decision: 'enhance' | 'skip' };
  await resumeHook(token, { decision });
  return Response.json({ ok: true });
}
