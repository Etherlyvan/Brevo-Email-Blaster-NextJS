// app/layout.tsx
import './globals.css';
import { NextAuthProvider } from './providers';
import ImagePreloader from '@/components/ImagePreloader';

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
      <body className="font-sans">
        <NextAuthProvider>
          <ImagePreloader />
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}