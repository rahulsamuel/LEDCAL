
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { Space_Mono } from 'next/font/google';

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
});

export const metadata: Metadata = {
  title: 'LEDTools Suite',
  description: 'A comprehensive suite of tools for LED screen technicians and system designers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={spaceMono.variable}>
      <head>
        <link rel="apple-touch-icon" href="https://firebasestorage.googleapis.com/v0/b/ledtools-suite.firebasestorage.app/o/Logo%2Ficon-removebg-preview.png?alt=media&token=63c4b43c-d464-4517-bfb9-01797476714b" />
      </head>
      <body className="min-h-screen bg-background font-mono antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <FirebaseClientProvider>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </FirebaseClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
