import type { MetadataRoute } from "next";

const ROOT = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "tokenhood.online"}`;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: ROOT, changeFrequency: "daily", priority: 1 },
    { url: `${ROOT}/terminal`, changeFrequency: "weekly", priority: 0.9 },
  ];
}
