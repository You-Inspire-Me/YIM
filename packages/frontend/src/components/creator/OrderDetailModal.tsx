import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import Select from '../ui/Select';
import Skeleton from '../ui/Skeleton';
import { endpoints } from '../../lib/api';

interface OrderDetailModalProps {
  orderId: string;
  onClose: () => void;
  onStatusUpdate: (id: string, status: string) => void;
}

const OrderDetailModal = ({ orderId, onClose, onStatusUpdate }: OrderDetailModalProps): JSX.Element | null => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['host-order', orderId],
    queryFn: async () => {
      const response = await endpoints.creator.orders.detail(orderId);
      return response.data.order;
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => endpoints.creator.orders.updateStatus(orderId, status),
    onSuccess: () => {
      toast.success('Status bijgewerkt');
      void queryClient.invalidateQueries({ queryKey: ['host-order', orderId] });
      void queryClient.invalidateQueries({ queryKey: ['host-orders'] });
      onStatusUpdate(orderId, data?.status || '');
    },
    onError: () => {
      toast.error('Status bijwerken mislukt');
    }
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/50 p-4">
        <div className="w-full max-w-2xl rounded-xl bg-white p-6 dark:bg-primary">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 dark:bg-primary">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Bestelling {data.orderNumber}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-accent dark:hover:bg-primary/90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Klantgegevens
            </h3>
            <div className="rounded-lg border border-border p-4 dark:border-border">
              <p className="font-medium">{data.customer.name}</p>
              <p className="text-sm text-muted dark:text-muted">{data.customer.email}</p>
              {data.customer.address && (
                <p className="mt-2 text-sm text-muted dark:text-muted">{data.customer.address}</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Producten</h3>
            <div className="space-y-3">
              {data.items.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-4 rounded-lg border border-border p-4 dark:border-border"
                >
                  {item.image && (
                    <img src={item.image} alt={item.title} className="h-16 w-16 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted dark:text-muted">
                      € {item.price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">€ {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4 dark:border-border">
            <span className="text-lg font-semibold">Totaal</span>
            <span className="text-xl font-bold">€ {data.total.toFixed(2)}</span>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-muted">
              Status
            </label>
            <Select
              value={data.status}
              onChange={(e) => updateStatusMutation.mutate(e.target.value)}
              className="w-full"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Sluiten
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;

