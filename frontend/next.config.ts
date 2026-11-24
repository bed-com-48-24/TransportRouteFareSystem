import type { NextConfig } from "next";

const backendOrigin = (process.env.BACKEND_API_URL ?? "http://localhost:3001").replace(
  /\/+$/,
  "",
);
const backendPrefix = (process.env.BACKEND_API_PREFIX ?? "/api/v1").replace(/\/+$/, "");

// The backend sends no CORS headers, so the browser calls these same-origin
// paths and Next.js forwards them. Most controllers sit under BACKEND_API_PREFIX;
// payments and notifications are mounted at the server root.
const apiProxyPath = process.env.NEXT_PUBLIC_API_PROXY_PATH ?? "/backend-api";
const rootProxyPath = process.env.NEXT_PUBLIC_API_ROOT_PROXY_PATH ?? "/backend-root";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: `${apiProxyPath}/:path*`,
        destination: `${backendOrigin}${backendPrefix}/:path*`,
      },
      {
        source: `${rootProxyPath}/:path*`,
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
  experimental: {
    agentFeedback: true,
    turbopackFileSystemCacheForDev: false,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
