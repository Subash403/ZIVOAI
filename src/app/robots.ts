import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zivo.ai';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/projects',
          '/projects/*',
          '/projects/custom',
          '/projects/finder',
          '/policies',
        ],
        disallow: [
          '/admin',
          '/admin/*',
          '/account',
          '/account/*',
          '/checkout',
          '/checkout/*',
          '/api/*',
          '/orders/confirmation/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
