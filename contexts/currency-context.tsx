'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { withViewTransition } from '@/lib/view-transition';

export type Currency = 'EUR' | 'USD' | 'GBP' | 'JPY' | 'RUB';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('EUR');

  const setCurrency = useCallback((next: Currency) => {
    withViewTransition(() => setCurrencyState(next));
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
