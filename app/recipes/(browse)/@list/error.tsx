'use client';

import { Button } from '@/components/ui/button';

export default function ListError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-3">
      <h2 className="text-lg font-semibold">Failed to load recipe list</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button size="sm" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
