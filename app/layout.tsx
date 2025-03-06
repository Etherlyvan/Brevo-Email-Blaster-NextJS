// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { NextAuthProvider } from './providers';
import ImagePreloader from '@/components/ImagePreloader';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en">
      <body className={inter.className}>
        <NextAuthProvider>
          <ImagePreloader />
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}