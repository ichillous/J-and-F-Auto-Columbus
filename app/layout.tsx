import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Manrope } from 'next/font/google';
import './globals.css';

function resolveMetadataBase() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (siteUrl) {
    try {
      return new URL(siteUrl);
    } catch {
      // Fall through to localhost if an invalid URL was provided at build time.
    }
  }

  return new URL('http://localhost:3000');
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: 'J&F Auto — Columbus, Ohio',
  description: 'Quality used cars in Columbus, Ohio. Straight answers, clear prices, no pressure.',
  openGraph: {
    type: 'website',
    siteName: 'J&F Auto Group',
    url: '/',
    locale: 'en_US',
    title: 'J&F Auto — Columbus, Ohio',
    description: 'Quality used cars in Columbus, Ohio. Straight answers, clear prices, no pressure.',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'J&F Auto Group — jfautodeals.com' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'J&F Auto — Columbus, Ohio',
    description: 'Quality used cars in Columbus, Ohio. Straight answers, clear prices, no pressure.',
    images: [{ url: '/twitter-image.png', width: 1200, height: 630, alt: 'J&F Auto Group — jfautodeals.com' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#05070a',
};

const bodyFont = Manrope({
  variable: '--font-body',
  display: 'swap',
  subsets: ['latin'],
});

const displayFont = Barlow_Condensed({
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${displayFont.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
