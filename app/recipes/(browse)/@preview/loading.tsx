import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function PreviewLoading() {
  return (
    <Card className="overflow-hidden">
      {/* Image */}
      <Skeleton className="h-48 w-full" />

      <CardHeader className="pb-3">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full mt-2" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Ingredients */}
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <div className="space-y-1">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>

        <Separator />

        {/* Graph */}
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-[250px] w-full" />
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}
