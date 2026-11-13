import type { MetadataRoute } from "next";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "tokenhood.online";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }], sitemap: `https://${ROOT}/sitemap.xml` };
}
