import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Map path-style URLs to the single / route with a ?view= param.
  // The storefront lives at / (and /storefront, /home); the staff portal at /admin.
  async rewrites() {
    return [
      { source: "/storefront", destination: "/?view=home" },
      { source: "/home", destination: "/?view=home" },
      { source: "/admin", destination: "/?view=admin" },
      { source: "/admin-login", destination: "/?view=admin-login" },
      { source: "/login", destination: "/?view=login" },
      { source: "/register", destination: "/?view=register" },
      { source: "/trade", destination: "/?view=trade" },
      { source: "/wallet", destination: "/?view=wallet" },
    ];
  },
};

export default nextConfig;
