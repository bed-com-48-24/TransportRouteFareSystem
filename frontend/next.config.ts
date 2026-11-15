import type { NextConfig } from "next";

<<<<<<< HEAD
const backendApiUrl = (process.env.BACKEND_API_URL ?? "http://localhost:3001").replace(
  /\/+$/,
  "",
);
=======
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
>>>>>>> feature/integration

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
<<<<<<< HEAD
        source: "/backend-api/:path*",
        destination: `${backendApiUrl}/api/v1/:path*`,
=======
        source: `${apiProxyPath}/:path*`,
        destination: `${backendOrigin}${backendPrefix}/:path*`,
      },
      {
        source: `${rootProxyPath}/:path*`,
        destination: `${backendOrigin}/:path*`,
>>>>>>> feature/integration
      },
    ];
  },
  experimental: {
    agentFeedback: true,
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
