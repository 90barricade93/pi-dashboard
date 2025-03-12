import { CurrencyProvider } from '@/contexts/currency-context';
import PriceTracker from '@/components/price-tracker';
import PricePrediction from '@/components/price-prediction';
import NewsFeed from '@/components/news-feed';
import NetworkStats from '@/components/network-stats';
import PiCalculator from '@/components/pi-calculator';

export default function Dashboard() {
  return (
    <main className="container mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Pi Network Dashboard</h1>

      <CurrencyProvider>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <PriceTracker />
          <NetworkStats />
        </div>

        <PricePrediction />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <NewsFeed />
          </div>
          <div>
            <PiCalculator />
          </div>
        </div>
      </CurrencyProvider>
    </main>
  );
}
