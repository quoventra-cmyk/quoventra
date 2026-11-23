import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const disallowed = ["/dashboard/", "/admin/", "/api/"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowed,
      },
      {
        userAgent: [
          "OAI-SearchBot",
          "ChatGPT-User",
          "GPTBot",
          "PerplexityBot",
          "ClaudeBot",
          "Googlebot",
          "Bingbot",
        ],
        allow: ["/", "/llms.txt"],
        disallow: disallowed,
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
