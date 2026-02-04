'use client';

import { Button } from '@/components/ui/button';

export default function PreviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 space-y-3">
      <h2 className="text-lg font-semibold">Failed to load preview</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button size="sm" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
