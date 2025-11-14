import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Package, Check } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import { endpoints } from '../../lib/api';

const OrdersPage = (): JSX.Element => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});

  const { data: ordersData } = useQuery<{ orders: any[] }>({
    queryKey: ['user-orders'],
    queryFn: async () => {
      const response = await endpoints.user.orders.get();
      return response.data;
    }
  });

  const orders: any[] = ordersData?.orders || [];

  const toggleItem = (orderId: string, itemId: string): void => {
    setSelectedItems((prev) => {
      const orderItems = prev[orderId] || [];
      if (orderItems.includes(itemId)) {
        return { ...prev, [orderId]: orderItems.filter((id) => id !== itemId) };
      }
      return { ...prev, [orderId]: [...orderItems, itemId] };
    });
  };

  const createReturnMutation = useMutation({
    mutationFn: async ({ orderId, items }: { orderId: string; items: string[] }) => {
      // Get order details to map item indices to return items
      const order = orders.find((o: any) => o._id === orderId);
      const returnItems = order?.items
        ?.filter((item: any, index: number) => items.includes(String(index)))
        .map((item: any) => ({
          productId: item.listingId?.productId?._id || item.productId,
          variantId: item.listingId?.variantId?._id || item.variantId,
          quantity: item.quantity
        })) || [];
      
      return endpoints.user.returns.create({ orderId, items: returnItems });
    },
    onSuccess: () => {
      toast.success('Retour aangemaakt');
      setSelectedItems({});
      void queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    }
  });

  const createReturn = async (orderId: string): Promise<void> => {
    const items = selectedItems[orderId] || [];
    if (items.length === 0) {
      toast.error('Selecteer minimaal één item');
      return;
    }
    createReturnMutation.mutate({ orderId, items });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-extrabold text-[#1E293B] mb-8">{t('account.orders')}</h1>
      
      {!orders || orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-[#64748B] mx-auto mb-4" />
          <p className="text-[#64748B]">Geen bestellingen gevonden</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order: any) => (
            <div key={order._id} className="border border-[#E2E8F0] rounded-lg p-6 bg-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-semibold text-[#1E293B]">Bestelling #{order._id.slice(-8)}</p>
                  <p className="text-sm text-[#64748B]">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm bg-[#E0F2FE] text-[#0EA5E9]">
                  {order.status}
                </span>
              </div>
              
              <div className="space-y-3">
                {order.items?.map((item: any, index: number) => {
                  const listing = item.listingId;
                  const product = listing?.productId;
                  const variant = listing?.variantId;
                  const creator = listing?.creatorId;
                  
                  return (
                    <div key={index} className="flex items-center gap-4 p-3 bg-[#F8FAFC] rounded-lg">
                      <input
                        type="checkbox"
                        checked={selectedItems[order._id]?.includes(String(index)) || false}
                        onChange={() => toggleItem(order._id, String(index))}
                        className="h-5 w-5 text-[#0EA5E9] border-[#E2E8F0] rounded focus:ring-[#0EA5E9]"
                      />
                      <img 
                        src={variant?.images?.[0] || product?.images?.[0] || 'https://via.placeholder.com/64'} 
                        alt={product?.title || 'Product'} 
                        className="h-16 w-16 object-cover rounded" 
                      />
                      <div className="flex-1">
                        <p className="font-medium text-[#1E293B]">{product?.title || 'Product'}</p>
                        <p className="text-sm text-[#64748B]">
                          {variant?.size && variant?.color && `${variant.size} / ${variant.color} • `}
                          Aantal: {item.quantity}
                        </p>
                        {creator && (
                          <p className="text-xs text-[#64748B] mt-1">
                            Verkoper: {creator.name || 'Creator'}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-[#1E293B]">€ {item.priceAtPurchase?.toFixed(2) || '0.00'}</p>
                    </div>
                  );
                })}
              </div>

              {selectedItems[order._id]?.length > 0 && (
                <Button
                  onClick={() => createReturn(order._id)}
                  className="mt-4"
                >
                  {t('account.createReturn')}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;

