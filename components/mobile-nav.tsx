'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import * as React from 'react';
import { ThemeToggleSwitch } from '@/components/theme-toggle';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <MenuIcon className="size-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <SheetDescription className="sr-only">
          Mobile navigation menu for Pi Dashboard
        </SheetDescription>
        <div className="flex items-center justify-between border-b pb-4">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <div className="relative size-8 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-indigo-600">
              <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
                π
              </div>
            </div>
            <span className="text-xl font-bold">Pi Dashboard</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <CloseIcon className="size-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium">Dark Mode</span>
            <ThemeToggleSwitch />
          </div>

          <div className="space-y-1">
            <Link
              href="/"
              className="block px-2 py-1 text-lg hover:underline"
              onClick={() => setOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/news"
              className="block px-2 py-1 text-lg hover:underline"
              onClick={() => setOpen(false)}
            >
              News
            </Link>
            <Link
              href="/calculator"
              className="block px-2 py-1 text-lg hover:underline"
              onClick={() => setOpen(false)}
            >
              Pi Calculator
            </Link>
          </div>
        </div>

        <div className="mt-auto border-t pt-4">
          <div className="text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} 90barricade93 Pi Dashboard</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Local icons to avoid lucide-react named export issues across versions
function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
