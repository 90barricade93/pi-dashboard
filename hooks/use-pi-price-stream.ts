'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchPiPrice } from '@/lib/api-client';
import { OKXTickerStream, type StreamStatus, type TickerUpdate } from '@/lib/okx-stream';
import type { Currency } from '@/contexts/currency-context';

const CURRENCY_PAIRS: Record<Currency, string | null> = {
  USD: null,
  EUR: 'EUR-USDT',
  GBP: 'GBP-USDT',
  JPY: 'JPY-USDT',
  RUB: 'RUB-USDT',
};

export interface PiPriceStreamState {
  price: number | null;
  status: StreamStatus;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Streams PI-USDT ticks from the OKX public WebSocket and converts to the
 * requested currency on the fly. For non-USD targets we also subscribe to the
 * matching fiat-USDT pair so the conversion follows live rates. Falls back to
 * a single REST fetch on mount and on stream errors.
 */
export function usePiPriceStream(currency: Currency): PiPriceStreamState {
  const [price, setPrice] = useState<number | null>(null);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const piUsdtRef = useRef<number | null>(null);
  const fiatUsdtRef = useRef<number>(1);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    piUsdtRef.current = null;
    fiatUsdtRef.current = 1;
    setPrice(null);
    setError(null);
    setStatus('connecting');

    fetchPiPrice(currency).then(({ price: initial, error: fetchError }) => {
      if (cancelled) return;
      if (initial !== null) {
        setPrice(initial);
        setLastUpdated(new Date());
      }
      if (fetchError) setError(fetchError);
    });

    const fiatPair = CURRENCY_PAIRS[currency];
    const instIds = fiatPair ? ['PI-USDT', fiatPair] : ['PI-USDT'];
    const recompute = () => {
      const piUsdt = piUsdtRef.current;
      if (piUsdt === null) return;
      const next = currency === 'USD' ? piUsdt : piUsdt * fiatUsdtRef.current;
      setPrice(next);
      setLastUpdated(new Date());
    };

    const stream = new OKXTickerStream();
    stream.subscribe(instIds, (update: TickerUpdate) => {
      if (cancelled) return;
      if (update.instId === 'PI-USDT') {
        piUsdtRef.current = update.last;
        recompute();
      } else if (update.instId === fiatPair) {
        fiatUsdtRef.current = update.last;
        recompute();
      }
    });
    stream.onStatus(next => {
      if (!cancelled) setStatus(next);
    });
    stream.connect();

    return () => {
      cancelled = true;
      stream.close();
    };
  }, [currency]);

  return { price, status, error, lastUpdated };
}
