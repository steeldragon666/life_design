import type { MetadataRoute } from 'next';

/**
 * Next.js robots.txt generation.
 * Allows crawling of public marketing pages while blocking all
 * authenticated app routes, API routes, and checkout flows.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/mentor', '/settings', '/api', '/checkout'],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || 'https://lifedesign.app'}/sitemap.xml`,
  };
}
