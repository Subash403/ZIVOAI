import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SpotlightBackground from '@/components/SpotlightBackground';

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
    icon: '/images/zivoai-logo.png',
    shortcut: '/images/zivoai-logo.png',
    apple: '/images/zivoai-logo.png',
  },
  openGraph: {
    title: 'Zivo AI — Ready-to-Run AI & Full-Stack Software Marketplace',
    description:
      'Explore fixed-price ready-to-run codebases and bespoke custom software architectures with verified source code and guided setup.',
    type: 'website',
    images: [
      {
        url: '/images/zivoai-logo.png',
        width: 1774,
        height: 887,
        alt: 'Zivo AI Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zivo AI — Ready-to-Run AI & Full-Stack Software Marketplace',
    description:
      'Explore fixed-price ready-to-run codebases and bespoke custom software architectures with verified source code and guided setup.',
    images: ['/images/zivoai-logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="relative isolate min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-indigo-600 focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-white focus:shadow-lg"
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
