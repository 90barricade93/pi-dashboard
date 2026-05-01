import PriceTracker from '@/components/price-tracker';
import PricePrediction from '@/components/price-prediction-card';
import NewsFeed from '@/components/news-feed';
import NetworkStats from '@/components/network-stats';
import PiCalculator from '@/components/pi-calculator';

export default function Dashboard() {
  return (
    <main className="container mx-auto p-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Pi Network Dashboard</h1>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <PriceTracker />
        <NetworkStats />
      </div>

      <PricePrediction />

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <NewsFeed />
        </div>
        <div>
          <PiCalculator />
        </div>
      </div>
    </main>
  );
}
