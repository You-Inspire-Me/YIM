import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Trash2, Store, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useCart } from '../../context/CartContext';
import { endpoints } from '../../lib/api';

interface ListingDetail {
  listing: {
    _id: string;
    creatorId: {
      _id: string;
      name?: string;
      avatarUrl?: string;
    };
    priceInclVat: number;
    stock: number;
  };
  productTitle: string;
  productImage: string;
  price: number;
  creatorName?: string;
}

const CartPage = (): JSX.Element => {
  const { items, total, removeItem, updateQuantity, clearCart, toCheckoutPayload } = useCart();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [listingDetails, setListingDetails] = useState<Record<string, ListingDetail>>({});

  // Fetch available listings for all cart items
  const { data: listingsData, isLoading: listingsLoading } = useQuery<{ listings: ListingDetail[] }>({
    queryKey: ['checkout-listings', items.map((i) => `${i.productId}-${i.variantId || ''}`).join(',')],
    queryFn: async () => {
      const payload = toCheckoutPayload();
      if (payload.length === 0) return { listings: [] };

      const listings = await Promise.all(
        payload.map(async (item) => {
          try {
            const response = await endpoints.payments.getListings({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity
            });
            return { item, listings: response.data.listings || [] };
          } catch (error) {
            console.error('Error fetching listings for item:', item, error);
            return { item, listings: [] };
          }
        })
      );

      const details: ListingDetail[] = [];
      listings.forEach(({ item, listings: itemListings }) => {
        if (itemListings.length > 0) {
          details.push(itemListings[0]); // Use first (best) listing
        }
      });

      return { listings: details };
    },
    enabled: items.length > 0 && items.every((i) => i.variantId)
  });

  useEffect(() => {
    if (listingsData?.listings) {
      const detailsMap: Record<string, ListingDetail> = {};
      listingsData.listings.forEach((detail, index) => {
        const item = items[index];
        if (item && item.variantId) {
          detailsMap[`${item.productId}-${item.variantId}`] = detail;
        }
      });
      setListingDetails(detailsMap);
    }
  }, [listingsData, items]);

  const checkoutMutation = useMutation({
    mutationFn: () => {
      const payload = toCheckoutPayload();
      if (payload.length === 0) {
        throw new Error('Winkelwagen is leeg');
      }
      return endpoints.payments.checkout({ items: payload });
    },
    onSuccess: async ({ data }) => {
      if (data.url) {
        setIsRedirecting(true);
        window.location.href = data.url;
      } else {
        toast.error('Geen betaal-URL ontvangen.');
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Betaling starten mislukt.');
    }
  });

  const itemsWithListings = items.filter((item) => item.variantId);

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-[#1E293B] dark:text-white">Je winkelwagen</h1>
      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#E2E8F0] p-12 text-center text-sm text-[#64748B] dark:border-gray-700 dark:text-gray-400">
          Je winkelwagen is leeg.
        </div>
      ) : (
        <div className="mt-8 grid gap-10 md:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            {itemsWithListings.map((item) => {
              const listingKey = `${item.productId}-${item.variantId}`;
              const listingDetail = listingDetails[listingKey];
              const hasListing = !!listingDetail;
              const isAvailable = hasListing && listingDetail.listing.stock >= item.quantity;

              return (
                <div
                  key={listingKey}
                  className={`rounded-2xl border p-6 shadow-sm ${
                    !isAvailable
                      ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/10'
                      : 'border-[#E2E8F0] bg-white dark:border-gray-800 dark:bg-gray-900'
                  }`}
                >
                  <div className="flex items-start gap-6">
                    <img src={item.image} alt={item.title} className="h-24 w-24 rounded-xl object-cover" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#1E293B] dark:text-white">{item.title}</h3>
                      {hasListing && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-[#64748B] dark:text-gray-400">
                          <Store className="h-4 w-4" />
                          <span>
                            Beschikbaar bij{' '}
                            <span className="font-medium text-[#0EA5E9]">
                              {listingDetail.creatorName || 'Creator'}
                            </span>
                          </span>
                        </div>
                      )}
                      {hasListing && (
                        <p className="mt-1 text-sm font-semibold text-[#1E293B] dark:text-white">
                          € {listingDetail.price.toFixed(2)}
                        </p>
                      )}
                      {!hasListing && listingsLoading && (
                        <p className="mt-1 text-sm text-[#64748B] dark:text-gray-400">Beschikbaarheid controleren...</p>
                      )}
                      {!hasListing && !listingsLoading && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          <span>Niet beschikbaar</span>
                        </div>
                      )}
                      {hasListing && !isAvailable && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            Onvoldoende voorraad (beschikbaar: {listingDetail.listing.stock})
                          </span>
                        </div>
                      )}
                      <div className="mt-4 flex items-center gap-3">
                        <label
                          htmlFor={`quantity-${listingKey}`}
                          className="text-xs uppercase tracking-wide text-[#64748B] dark:text-gray-400"
                        >
                          Aantal
                        </label>
                        <Input
                          id={`quantity-${listingKey}`}
                          type="number"
                          min={1}
                          max={hasListing ? listingDetail.listing.stock : undefined}
                          value={item.quantity}
                          onChange={(event) =>
                            updateQuantity(item.productId, Number(event.target.value), item.variantId)
                          }
                          className="w-24"
                          disabled={!isAvailable}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-[#64748B] transition hover:text-red-500 dark:text-gray-400"
                      onClick={() => removeItem(item.productId, item.variantId)}
                      aria-label="Verwijder item"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {items.filter((item) => !item.variantId).length > 0 && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/10">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Sommige items hebben geen variant geselecteerd. Verwijder deze items en voeg ze opnieuw toe met een
                  variant.
                </p>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-semibold text-[#1E293B] dark:text-white">Overzicht</h2>
            <div className="mt-4 space-y-3 text-sm text-[#64748B] dark:text-gray-400">
              <div className="flex justify-between">
                <span>Subtotaal</span>
                <span className="text-[#1E293B] dark:text-white">€ {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Verzending</span>
                <span className="text-[#1E293B] dark:text-white">Gratis</span>
              </div>
            </div>
            <div className="mt-6 flex justify-between text-lg font-semibold text-[#1E293B] dark:text-white">
              <span>Totaal</span>
              <span>€ {total.toFixed(2)}</span>
            </div>
            <Button
              className="mt-6 w-full"
              onClick={() => checkoutMutation.mutate()}
              isLoading={checkoutMutation.isPending || isRedirecting}
              disabled={
                itemsWithListings.length === 0 ||
                !itemsWithListings.every((item) => {
                  const listingKey = `${item.productId}-${item.variantId}`;
                  const listingDetail = listingDetails[listingKey];
                  return listingDetail && listingDetail.listing.stock >= item.quantity;
                })
              }
            >
              Afrekenen met Stripe
            </Button>
            <Button className="mt-3 w-full" variant="ghost" onClick={() => clearCart()}>
              Winkelwagen legen
            </Button>
            {itemsWithListings.some((item) => {
              const listingKey = `${item.productId}-${item.variantId}`;
              const listingDetail = listingDetails[listingKey];
              return !listingDetail || listingDetail.listing.stock < item.quantity;
            }) && (
              <p className="mt-4 text-xs text-red-600 dark:text-red-400">
                Sommige items zijn niet beschikbaar in de gevraagde hoeveelheid.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default CartPage;
