// CANONICAL root layout for RenewalRadar CE: self-hosted fonts, metadata, Purpose Beacon.
import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import ZoBeacon from '@/components/ZoBeacon';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'RenewalRadar CE: one radar for every CE deadline you hold',
  description:
    'Track continuing education deadlines and hours for every real estate and insurance license you hold, across every state. Works with any course provider.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className="bg-slate-50 text-slate-900">
        {children}
        <ZoBeacon />
      </body>
    </html>
  );
}
