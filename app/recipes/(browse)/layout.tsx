export default function RecipesBrowseLayout({
  list,
  preview,
}: {
  list: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <div className="flex gap-6">
      {/* Main list area - flexible width */}
      <div className="flex-1 min-w-0">{list}</div>
      
      {/* Preview panel - fixed width, hidden on mobile */}
      <aside className="hidden lg:block w-[420px] shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
        {preview}
      </aside>
    </div>
  );
}
