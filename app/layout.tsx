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
  title: 'J&F Auto',
  description: 'Precision-selected inventory, concierge acquisition, and premium dealership service.',
  icons: {
    icon: '/jfautologo.png',
    apple: '/jfautologo.png',
  },
  openGraph: {
    type: 'website',
    title: 'J&F Auto',
    description: 'Precision-selected inventory, concierge acquisition, and premium dealership service.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'J&F Auto',
    description: 'Precision-selected inventory, concierge acquisition, and premium dealership service.',
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
