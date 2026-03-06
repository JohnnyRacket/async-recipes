import type { NextConfig } from "next";
import createWithVercelToolbar from "@vercel/toolbar/plugins/next";
import { withWorkflow } from "@workflow/next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

const withVercelToolbar = createWithVercelToolbar();
export default withWorkflow(withVercelToolbar(nextConfig));
