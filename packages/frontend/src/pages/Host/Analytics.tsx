import { useQuery } from '@tanstack/react-query';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

import Skeleton from '../../components/ui/Skeleton';
import { endpoints } from '../../lib/api';
import RevenueChart from '../../components/creator/RevenueChart';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AnalyticsPage = (): JSX.Element => {
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['host-analytics'],
    queryFn: async () => {
      const response = await endpoints.creator.dashboard.analytics();
      return response.data;
    }
  });

  const { data: topProducts, isLoading: topProductsLoading } = useQuery({
    queryKey: ['host-top-products'],
    queryFn: async () => {
      const response = await endpoints.creator.dashboard.topProducts({ limit: 10 });
      return response.data.products || [];
    }
  });

  if (analyticsLoading || topProductsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const topProductsData = {
    labels: topProducts?.map((p: any) => p.title) || [],
    datasets: [
      {
        label: 'Verkocht',
        data: topProducts?.map((p: any) => p.totalSold) || [],
        backgroundColor: 'rgba(14, 165, 233, 0.8)'
      }
    ]
  };

  const topProductsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Analytics</h1>
        <p className="mt-2 text-sm text-muted dark:text-muted">
          Inzicht in je winkelprestaties
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-primary">
          <p className="text-sm font-medium text-muted dark:text-muted">Totaal weergaven</p>
          <p className="mt-2 text-3xl font-semibold">{analytics?.totalViews || 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-primary">
          <p className="text-sm font-medium text-muted dark:text-muted">Bestellingen (30d)</p>
          <p className="mt-2 text-3xl font-semibold">{analytics?.totalOrders || 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-primary">
          <p className="text-sm font-medium text-muted dark:text-muted">Conversiepercentage</p>
          <p className="mt-2 text-3xl font-semibold">{analytics?.conversionRate?.toFixed(2) || 0}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-primary">
        <h2 className="mb-4 text-lg font-semibold">Omzet over tijd</h2>
        <RevenueChart />
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-primary">
        <h2 className="mb-4 text-lg font-semibold">Top verkochte producten</h2>
        {topProducts && topProducts.length > 0 ? (
          <div className="h-96">
            <Bar data={topProductsData} options={topProductsOptions} />
          </div>
        ) : (
          <p className="text-sm text-muted dark:text-muted">Nog geen verkoopdata beschikbaar</p>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;

