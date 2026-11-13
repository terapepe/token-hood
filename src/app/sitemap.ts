import type { MetadataRoute } from "next";
import { listPages } from "@/lib/db";

const ROOT = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "tokenhood.online"}`;

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await listPages().catch(() => []);
  return [
    { url: ROOT, changeFrequency: "hourly", priority: 1 },
    { url: `${ROOT}/builder`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${ROOT}/feed`, changeFrequency: "hourly", priority: 0.7 },
    ...pages.map((p) => ({ url: `${ROOT}/${p.slug}`, lastModified: p.createdAt ? new Date(p.createdAt) : undefined, priority: 0.5 })),
  ];
}
