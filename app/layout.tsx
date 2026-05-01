import type React from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { MobileNav } from '@/components/mobile-nav';
import { Toaster } from '@/components/ui/sonner';

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
          <div className="flex min-h-screen flex-col">
            <div className="flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
              <MobileNav />
              <div className="flex flex-1 justify-center">
                <div className="relative size-8 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-indigo-600">
                  <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
                    π
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <Header />
            </div>
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
