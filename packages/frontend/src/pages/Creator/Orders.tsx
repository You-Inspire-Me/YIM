import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Eye } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import { endpoints } from '../../lib/api';
import OrderDetailModal from '../../components/creator/OrderDetailModal';

const OrdersPage = (): JSX.Element => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['host-orders', statusFilter, page],
    queryFn: async () => {
      const response = await endpoints.creator.orders.list({
        status: statusFilter || undefined,
        page,
        limit: 20
      });
      return response.data;
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      endpoints.creator.orders.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Status bijgewerkt');
      void queryClient.invalidateQueries({ queryKey: ['host-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['host-dashboard-stats'] });
    },
    onError: () => {
      toast.error('Status bijwerken mislukt');
    }
  });

  const orders = data?.items || [];
  const totalPages = data?.pages || 1;

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-secondary',
    shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Bestellingen</h1>
          <p className="mt-2 text-sm text-muted dark:text-muted">
            Beheer en volg alle bestellingen
          </p>
        </div>
        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-48"
          >
            <option value="">Alle statussen</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white dark:border-border dark:bg-primary">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-accent dark:bg-primary">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Bestelnummer
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Klant
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Totaal
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Datum
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-primary">
            {isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-32" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-40" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-20" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-24" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-28" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-20" />
                  </td>
                </tr>
              ))}
            {!isLoading && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted dark:text-muted">
                  Geen bestellingen gevonden
                </td>
              </tr>
            )}
            {!isLoading &&
              orders.map((order: any) => (
                <tr key={order._id} className="hover:bg-accent dark:hover:bg-gray-900">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    {order.orderNumber}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div>
                      <div className="font-medium">{order.customer.name}</div>
                      <div className="text-muted dark:text-muted">{order.customer.email}</div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold">
                    € {order.total.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Select
                      value={order.status}
                      onChange={(e) => updateStatusMutation.mutate({ id: order._id, status: e.target.value })}
                      className={`w-32 text-xs ${statusColors[order.status] || ''}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </Select>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted dark:text-muted">
                    {format(new Date(order.createdAt), 'd MMM yyyy', { locale: nl })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => setSelectedOrderId(order._id)}
                      className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                    >
                      <Eye className="h-4 w-4" />
                      Bekijk
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Vorige
          </Button>
          <span className="text-sm text-muted dark:text-muted">
            Pagina {page} van {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Volgende
          </Button>
        </div>
      )}

      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onStatusUpdate={(id, status) => updateStatusMutation.mutate({ id, status })}
        />
      )}
    </div>
  );
};

export default OrdersPage;

