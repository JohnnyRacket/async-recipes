export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation for Node.js runtime
    // This hook runs once when the server starts
    console.log('[instrumentation] Node.js runtime initialized');
    
    // Example: Initialize monitoring, tracing, or error tracking
    // await import('./lib/monitoring').then((m) => m.init());
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
    console.log('[instrumentation] Edge runtime initialized');
  }
}

export async function onRequestError(
  error: Error,
  request: {
    path: string;
    method: string;
    headers: Record<string, string>;
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
    renderSource?: 'react-server-components' | 'react-server-components-payload' | 'server-rendering';
    revalidateReason?: 'on-demand' | 'stale';
    renderType?: 'dynamic' | 'dynamic-resume';
  }
) {
  // Log errors for observability
  // This captures unhandled errors in Server Components, Route Handlers, Server Actions, and Middleware
  console.error('[instrumentation] Request error:', {
    error: error.message,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  });

  // Example: Send to error tracking service
  // await reportErrorToService(error, request, context);
}
