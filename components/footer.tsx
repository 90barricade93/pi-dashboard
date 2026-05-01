import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExternalLink, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Logo and about */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="relative size-8 overflow-hidden rounded-full bg-linear-to-br from-purple-500 to-indigo-600">
                <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
                  π
                </div>
              </div>
              <span className="text-xl font-bold">Pi Dashboard</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              A comprehensive dashboard for tracking Pi cryptocurrency, network statistics, and
              ecosystem news.
            </p>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-3 text-sm font-medium">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/developers"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Developers
                </Link>
              </li>
              <li>
                <Link
                  href="/whitepaper"
                  className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  Pi Whitepaper
                  <ExternalLink className="size-3" />
                </Link>
              </li>
              <li>
                <Link
                  href="/roadmap"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Roadmap
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="mb-3 text-sm font-medium">Connect</h3>
            <div className="mb-4 flex gap-2">
              <Button variant="outline" size="icon" asChild>
                <Link
                  href="https://twitter.com/Vries_de_R"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="size-4" />
                  <span className="sr-only">Twitter</span>
                </Link>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <Link
                  href="https://nl.linkedin.com/in/raymond-de-vries76"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect x="2" y="9" width="4" height="12"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                  <span className="sr-only">LinkedIn</span>
                </Link>
              </Button>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">Created by Raymond de Vries</p>
            <div className="text-sm text-muted-foreground">
              <p>Subscribe to our newsletter for updates</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button size="sm">Subscribe</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t pt-6 md:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} 90barricade93 Pi Dashboard. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/cookies" className="transition-colors hover:text-foreground">
              Cookie Policy
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <p>
            Disclaimer: This dashboard is for informational purposes only and does not constitute
            financial advice. Pi Network and Pi are trademarks of their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
