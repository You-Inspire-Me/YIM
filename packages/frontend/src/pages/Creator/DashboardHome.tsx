import { useQuery } from '@tanstack/react-query';
import { Package, ShoppingBag, TrendingUp, AlertTriangle } from 'lucide-react';

import Skeleton from '../../components/ui/Skeleton';
import { endpoints } from '../../lib/api';
import RevenueChart from '../../components/creator/RevenueChart';
import RecentOrdersTable from '../../components/creator/RecentOrdersTable';

const DashboardHome = (): JSX.Element => {
  const { data, isLoading } = useQuery({
    queryKey: ['host-dashboard-stats'],
    queryFn: async () => {
      const response = await endpoints.creator.dashboard.stats();
      return response.data;
    },
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const stats = data?.stats || {};
  const recentOrders = data?.recentOrders || [];
  const lowStockProducts = data?.lowStockProducts || [];

  const statCards = [
    {
      title: 'Totaal verkoop',
      value: stats.totalSales || 0,
      icon: ShoppingBag,
      color: 'bg-blue-500'
    },
    {
      title: 'Bestellingen vandaag',
      value: stats.ordersToday || 0,
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      title: 'Totaal omzet',
      value: `€ ${(stats.totalRevenue || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-purple-500'
    },
    {
      title: 'Lage voorraad',
      value: stats.lowStockCount || 0,
      icon: AlertTriangle,
      color: 'bg-[#0EA5E9]'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Overzicht van je winkelprestaties
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                </div>
                <div className={`rounded-lg ${stat.color} p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold">Omzet over tijd</h2>
          <RevenueChart />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold">Lage voorraad</h2>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Geen producten met lage voorraad</p>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((product: { _id: string; title: string; inventory: number }) => (
                <div
                  key={product._id}
                  className="flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50 p-3 dark:border-primary-900/30 dark:bg-primary-900/20"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-[#0EA5E9]" />
                    <span className="text-sm font-medium">{product.title}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary-700 dark:text-primary-400">
                    {product.inventory} op voorraad
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold">Recente bestellingen</h2>
        </div>
        <RecentOrdersTable orders={recentOrders} />
      </div>
    </div>
  );
};

export default DashboardHome;

