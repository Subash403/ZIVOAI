import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SpotlightBackground from '@/components/SpotlightBackground';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://zivo.ai'),
  title: {
    default: 'Zivo AI — Modern AI & Full-Stack Projects Discovery & Delivery Platform',
    template: '%s | Zivo AI',
  },
  description:
    'Discover, benchmark, and deploy production-ready AI agents, computer vision pipelines, full-stack web applications, and verified engineering software with complete source code, architecture documentation, and instant digital delivery.',
  keywords: [
    'Zivo AI',
    'AI projects',
    'production AI code',
    'machine learning pipelines',
    'full stack web applications',
    'custom software architecture',
    'verified source code',
    'instant digital delivery',
  ],
  icons: {
    icon: '/images/zivoai-logo.png',
    shortcut: '/images/zivoai-logo.png',
    apple: '/images/zivoai-logo.png',
  },
  openGraph: {
    title: 'Zivo AI — Modern AI & Full-Stack Projects Platform',
    description: 'Explore verified fixed-price codebases and bespoke custom architectures built for software engineers, startups, researchers, and technical builders.',
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
    title: 'Zivo AI — Modern AI & Full-Stack Projects Platform',
    description: 'Explore verified fixed-price codebases and bespoke custom architectures built for software engineers, startups, researchers, and technical builders.',
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
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white relative min-h-screen">
        <SpotlightBackground />
        <Navbar />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
