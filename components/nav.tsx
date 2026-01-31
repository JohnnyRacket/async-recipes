import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export function Nav() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🍳</span>
            <span className="text-xl font-bold">Async Recipes</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link 
              href="/recipes" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              All Recipes
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <Link 
              href="/add" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Add Recipe
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
