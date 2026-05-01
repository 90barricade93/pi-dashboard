'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileNav } from '@/components/mobile-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { useCurrency, type Currency } from '@/contexts/currency-context';
import { currencySymbols } from '@/lib/currency-symbols';

const TOUCH_TARGET = 'min-h-11 min-w-11';

function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`${TOUCH_TARGET} text-base font-medium`}
          aria-label={`Change currency, current ${currency}`}
        >
          {currencySymbols[currency]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(Object.keys(currencySymbols) as Currency[]).map(c => (
          <DropdownMenuItem key={c} onClick={() => setCurrency(c)}>
            <span className="mr-2 w-4 text-center">{currencySymbols[c]}</span>
            {c}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MobileHeader() {
  return (
    <div className="flex h-16 items-center gap-1 border-b bg-background/95 px-2 backdrop-blur-sm supports-backdrop-filter:bg-background/60 md:hidden">
      <MobileNav />
      <CurrencyToggle />
      <Link href="/" className="flex flex-1 justify-center">
        <div className="relative size-8 overflow-hidden rounded-full bg-linear-to-br from-purple-500 to-indigo-600">
          <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
            π
          </div>
        </div>
      </Link>
      <div className={TOUCH_TARGET}>
        <ThemeToggle />
      </div>
    </div>
  );
}
