import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { MobileNav } from "@/components/mobile-nav"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Pi Network Dashboard",
  description: "Track Pi cryptocurrency prices, news, and network statistics",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="flex min-h-screen flex-col">
            <div className="flex items-center md:hidden px-4 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <MobileNav />
              <div className="flex-1 flex justify-center">
                <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-indigo-600">
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
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
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'