import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Storefront pages are indexable
        userAgent: "*",
        allow: ["/", "/home", "/storefront", "/login", "/register"],
        // Auth-gated / staff pages should not be indexed
        disallow: ["/admin", "/admin-login", "/trade", "/wallet", "/api/"],
      },
    ],
    sitemap: "https://blockexchange.buzz/sitemap.xml",
    host: "https://blockexchange.buzz",
  };
}
