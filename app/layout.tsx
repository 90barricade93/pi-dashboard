import type React from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { MobileHeader } from '@/components/mobile-header';
import { Toaster } from '@/components/ui/sonner';
import { CurrencyProvider } from '@/contexts/currency-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Pi Network Dashboard',
  description: 'Track Pi cryptocurrency prices, news, and network statistics',
  generator: 'v0.dev',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CurrencyProvider>
            <div className="flex min-h-screen flex-col">
              <MobileHeader />
              <div className="hidden md:block">
                <Header />
              </div>
              <div className="flex-1">{children}</div>
              <Footer />
            </div>
            <Toaster />
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
