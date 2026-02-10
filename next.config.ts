import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import createWithVercelToolbar from "@vercel/toolbar/plugins/next";

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
export default withBotId(withVercelToolbar(nextConfig));
