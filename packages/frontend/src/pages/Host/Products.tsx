import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { endpoints } from '../../lib/api';
import { Product } from '../../types';

const ProductsPage = (): JSX.Element => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['host-products'],
    queryFn: async () => {
      const response = await endpoints.creatorProducts.list();
      return response.data.items as Product[];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => endpoints.creatorProducts.remove(id),
    onSuccess: () => {
      toast.success('Product verwijderd');
      void queryClient.invalidateQueries({ queryKey: ['host-products'] });
      setSelectedIds(new Set());
    },
    onError: () => {
      toast.error('Verwijderen mislukt');
    }
  });

  const toggleSelect = (id: string): void => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = (): void => {
    if (selectedIds.size === data?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data?.map((p) => p._id) || []));
    }
  };

  const handleBulkDelete = (): void => {
    if (selectedIds.size === 0) {
      return;
    }
    if (confirm(`Weet je zeker dat je ${selectedIds.size} product(en) wilt verwijderen?`)) {
      Promise.all(Array.from(selectedIds).map((id) => deleteMutation.mutateAsync(id))).then(() => {
        setSelectedIds(new Set());
      });
    }
  };

  const products = data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Producten</h1>
          <p className="mt-2 text-sm text-muted dark:text-muted">
            Beheer al je producten op één plek
          </p>
        </div>
        <Button onClick={() => navigate('/host/upload')} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nieuw product
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="rounded-lg border border-border bg-white p-4 dark:border-border dark:bg-primary">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedIds.size} product(en) geselecteerd
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedIds(new Set())}>
                Deselecteren
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkDelete}
                className="text-red-600 hover:bg-red-50 dark:text-red-400"
              >
                Verwijderen
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-white dark:border-border dark:bg-primary">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-accent dark:bg-primary">
            <tr>
              <th className="w-12 px-6 py-4">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-muted hover:text-muted"
                >
                  {selectedIds.size === products.length && products.length > 0 ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Product
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Prijs
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Voorraad
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Status
              </th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-primary">
            {isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={index}>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-5" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-48" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-16" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-12" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-20" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-24" />
                  </td>
                </tr>
              ))}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted dark:text-muted">
                  Je hebt nog geen producten.{' '}
                  <button
                    className="font-medium text-primary underline"
                    onClick={() => navigate('/host/upload')}
                  >
                    Upload het eerste product.
                  </button>
                </td>
              </tr>
            )}
            {!isLoading &&
              products.map((product) => (
                <tr
                  key={product._id}
                  className={`hover:bg-accent dark:hover:bg-gray-900 ${
                    product.inventory < 10 ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => toggleSelect(product._id)}
                      className="text-muted hover:text-muted"
                    >
                      {selectedIds.has(product._id) ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                      <div>
                        <p className="font-semibold">{product.title}</p>
                        <p className="text-xs text-muted">{product.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">€ {product.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={product.inventory < 10 ? 'font-semibold text-red-600 dark:text-red-400' : ''}
                    >
                      {product.inventory}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        product.isPublished
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-accent text-black dark:bg-primary dark:text-muted'
                      }`}
                    >
                      {product.isPublished ? 'Gepubliceerd' : 'Concept'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition hover:bg-accent dark:border-border dark:text-secondary dark:hover:bg-primary/90"
                        onClick={() => navigate(`/host/upload?id=${product._id}`)}
                        aria-label="Bewerk product"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-red-500 transition hover:bg-red-50 dark:border-border dark:hover:bg-gray-900"
                        onClick={() => {
                          if (confirm('Weet je zeker dat je dit product wilt verwijderen?')) {
                            deleteMutation.mutate(product._id);
                          }
                        }}
                        aria-label="Verwijder product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsPage;

