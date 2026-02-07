const steps = [
  {
    icon: '🔗',
    title: '1. Paste Any Recipe URL',
    description: 'Found a recipe you love? Just copy the link from any cooking website.',
  },
  {
    icon: '✨',
    title: '2. One Click to Fork',
    description: 'Hit the button and watch AI extract ingredients, steps, timing, and build your dependency graph instantly.',
  },
  {
    icon: '⚡',
    title: '3. Cook in Parallel',
    description: 'See which tasks can run simultaneously. Prep veggies while the oven preheats!',
  },
];

export function HowItWorks() {
  return (
    <section className="space-y-8 py-12 border-t">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          How It Works
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Fork any recipe in one click. Our AI does the heavy lifting so you can cook smarter.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step) => (
          <div key={step.title} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-2xl transform group-hover:scale-105 transition-transform" />
            <div className="relative p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center text-2xl shadow-lg">
                {step.icon}
              </div>
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
