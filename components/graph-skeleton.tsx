import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function GraphSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dependency Graph</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] flex items-center justify-center bg-muted/50 rounded-lg">
          <div className="text-center space-y-4">
            <Skeleton className="h-8 w-8 rounded-full mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
            <p className="text-sm text-muted-foreground">Loading graph...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
