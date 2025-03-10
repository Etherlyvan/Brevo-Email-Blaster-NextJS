// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { NextAuthProvider } from './providers';
import ImagePreloader from '@/components/ImagePreloader';

// Gunakan subset Latin saja untuk mengurangi kompleksitas
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'Brevo Email App',
  description: 'Email management with Brevo integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <NextAuthProvider>
          <ImagePreloader />
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}