import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import '../public/assets/css/style.css'; // Eski loyihaning haqiqiy dizayni

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AISCAN - AI Procurement Analysis',
  description: 'AI powered procurement and compliance analysis',
  icons: {
    icon: '/assets/img/favicon.png',
  },
};

import { Suspense } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
          <link rel="icon" type="image/png" href="/assets/img/favicon.png" />
      </head>
      <body className={outfit.className}>
        <div className="background-watermark"></div>
        <div className="background-blobs">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
        </div>
        <div className="main-content-layout" style={{ position: 'relative', zIndex: 1 }}>
            <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Yuklanmoqda...</div>}>
                {children}
            </Suspense>
        </div>
      </body>
    </html>
  );
}
