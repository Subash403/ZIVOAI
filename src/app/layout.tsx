import type { Metadata } from 'next';
import { Montserrat, Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SpotlightBackground from '@/components/SpotlightBackground';
import { BRAND_ASSETS } from '@/lib/brand';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://zivo.ai'),
  title: {
    default: 'Zivo AI — Ready-to-Run AI & Full-Stack Software Marketplace',
    template: '%s | Zivo AI',
  },
  description:
    'Discover and purchase ready-to-run AI agents, machine learning pipelines, full-stack web applications, and custom software architectures with source code, documentation, and guided setup.',
  keywords: [
    'Zivo AI',
    'AI projects',
    'production AI code',
    'machine learning pipelines',
    'full stack web applications',
    'custom software architecture',
    'source code marketplace',
  ],
  icons: {
    icon: [{ url: BRAND_ASSETS.mark, type: 'image/png' }],
    shortcut: BRAND_ASSETS.mark,
    apple: BRAND_ASSETS.mark,
  },
  openGraph: {
    title: 'Zivo AI — Ready-to-Run AI & Full-Stack Software Marketplace',
    description:
      'Explore fixed-price ready-to-run codebases and bespoke custom software architectures with verified source code and guided setup.',
    type: 'website',
    images: [
      {
        url: BRAND_ASSETS.ogImage,
        width: 1200,
        height: 630,
        alt: 'Zivo AI — Technology Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zivo AI — Ready-to-Run AI & Full-Stack Software Marketplace',
    description:
      'Explore fixed-price ready-to-run codebases and bespoke custom software architectures with verified source code and guided setup.',
    images: [BRAND_ASSETS.ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${inter.variable}`}>
      <body className="relative isolate min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] antialiased selection:bg-[#0089CF]/20 selection:text-[#0A0A0A]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[#ED1C24] focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <SpotlightBackground />
        <div className="relative z-10 flex min-h-screen flex-col">
          <Navbar />
          <div id="main-content" className="flex-grow">
            {children}
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
