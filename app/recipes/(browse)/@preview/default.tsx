import { Card, CardContent } from '@/components/ui/card';

export default function PreviewDefault() {
  return (
    <Card className="h-full min-h-[400px] flex items-center justify-center border-dashed">
      <CardContent className="text-center py-12">
        <div className="text-4xl mb-4">👈</div>
        <h3 className="font-semibold text-lg mb-2">Select a Recipe</h3>
        <p className="text-muted-foreground text-sm max-w-[200px]">
          Click on any recipe card to preview its details and dependency graph here.
        </p>
      </CardContent>
    </Card>
  );
}
