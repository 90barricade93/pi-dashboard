'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/currency-context';
import { fetchPiPrice, fallbackPrices } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { currencySymbols } from '@/lib/currency-symbols';
import { PoweredByOkx } from '@/components/powered-by-okx';
import { formatPresetAmount } from '@/lib/format-helpers';

export default function PiCalculator() {
  const { currency } = useCurrency();
  const [piAmount, setPiAmount] = useState<string>('1000');
  const [piPrice, setPiPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current Pi price
  useEffect(() => {
    const getPiPrice = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch current price
        const { price: newPrice, error: priceError } = await fetchPiPrice(currency);

        if (newPrice !== null) {
          setPiPrice(newPrice);
        } else {
          setError(priceError);
          // Fallback to simulated price if API fails
          setPiPrice(fallbackPrices[currency]);
        }
      } catch (error) {
        logger.error('pi_calculator_fetch_failed', { currency, error: String(error) });
        setError('Failed to fetch price data. Using fallback data.');
        setPiPrice(fallbackPrices[currency]);
      } finally {
        setLoading(false);
      }
    };

    getPiPrice();
  }, [currency]);

  // Calculate value based on amount and price
  const calculateValue = () => {
    if (piPrice === null) return '0';

    const amount = Number.parseFloat(piAmount) || 0;
    const value = amount * piPrice;

    // Format based on currency and value size
    if (value < 0.01) {
      return value.toFixed(8);
    } else if (value < 1) {
      return value.toFixed(4);
    } else if (value < 1000) {
      return value.toFixed(2);
    } else {
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
  };

  // Handle input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setPiAmount(value);
    }
  };

  // Preset amount buttons
  const presetAmounts = [100, 1000, 10000, 100000];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pi Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pi-amount">Pi Amount</Label>
            <Input
              id="pi-amount"
              type="text"
              value={piAmount}
              onChange={handleAmountChange}
              placeholder="Enter Pi amount"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {presetAmounts.map(amount => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setPiAmount(amount.toString())}
                className="flex-1"
              >
                {formatPresetAmount(amount)}
              </Button>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="mb-1 text-sm text-muted-foreground">Estimated Value</div>
            <div className="text-3xl font-bold">
              {loading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                <>
                  {currencySymbols[currency]}
                  {calculateValue()}
                </>
              )}
            </div>
            {error && <div className="mt-1 text-xs text-amber-500">{error}</div>}
          </div>

          <PoweredByOkx />
        </div>
      </CardContent>
    </Card>
  );
}
