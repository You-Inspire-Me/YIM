import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Search, ChevronDown, ChevronRight, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import { endpoints } from '../../lib/api';

interface InventoryVariant {
  size: string;
  sku: string;
  available: number;
  reserved: number;
  unavailable: number;
}

interface InventoryItem {
  _id: string;
  title: string;
  image: string;
  category: string;
  sku: string;
  tags: string[];
  variants: InventoryVariant[];
  totalAvailable: number;
}

const InventoryPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<{ inventory: InventoryItem[] }>({
    queryKey: ['host-inventory', search, category],
    queryFn: async () => {
      const response = await endpoints.creator.inventory.list({ search, category: category !== 'all' ? category : undefined });
      return response.data;
    }
  });

  const exportCsv = async (): Promise<void> => {
    try {
      // Use new MerchantStock export (stock-only, new format)
      const response = await endpoints.merchantInventory.exportCsv();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'voorraad-export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Voorraad CSV geëxporteerd (nieuwe formaat)');
    } catch (error) {
      toast.error('Export mislukt');
    }
  };

  const importStockCsvMutation = useMutation({
    mutationFn: (file: File) => endpoints.host.inventory.importStockCsv(file),
    onSuccess: (data) => {
      toast.success(data.data.message || `Stock updated: ${data.data.success} items`);
      void queryClient.invalidateQueries({ queryKey: ['host-inventory'] });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Import mislukt');
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      importStockCsvMutation.mutate(file);
    }
  };

  const toggleExpand = (id: string): void => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Voorraad</h1>
          <p className="mt-2 text-sm text-muted dark:text-muted">
            Overzicht van alle producten en varianten
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <Button
              variant="secondary"
              className="inline-flex items-center gap-2"
              disabled={importStockCsvMutation.isPending}
              type="button"
            >
              <Upload className="h-4 w-4" />
              {importStockCsvMutation.isPending ? 'Importeren...' : 'Import CSV'}
            </Button>
          </label>
          <Button onClick={exportCsv} variant="secondary" className="inline-flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <Input
            type="text"
            placeholder="Zoek op product, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="md:w-48">
          <option value="all">Alle categorieën</option>
          <option value="clothing">Kleding</option>
          <option value="shoes">Schoenen</option>
          <option value="accessories">Accessoires</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : data && data.inventory.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-white dark:border-border dark:bg-primary">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-accent dark:bg-primary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Niet beschikbaar
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Gereserveerd
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Beschikbaar
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Op voorraad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-primary">
                {data.inventory.map((item) => {
                  const isExpanded = expandedProducts.has(item._id);
                  const hasVariants = item.variants.length > 1;

                  return (
                    <>
                      <tr
                        key={item._id}
                        className="cursor-pointer transition hover:bg-accent dark:hover:bg-gray-900"
                        onClick={() => hasVariants && toggleExpand(item._id)}
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-4">
                            {hasVariants && (
                              <button type="button" className="text-muted">
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5" />
                                ) : (
                                  <ChevronRight className="h-5 w-5" />
                                )}
                              </button>
                            )}
                            <img
                              src={item.image}
                              alt={item.title}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-medium text-black dark:text-secondary">{item.title}</p>
                              <p className="text-sm text-muted dark:text-muted">{item.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted dark:text-muted">
                          {item.sku}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-muted dark:text-muted">
                          {item.variants.reduce((sum, v) => sum + v.unavailable, 0)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-muted dark:text-muted">
                          {item.variants.reduce((sum, v) => sum + v.reserved, 0)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-muted dark:text-muted">
                          {item.variants.reduce((sum, v) => sum + v.available, 0)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-black dark:text-secondary">
                          {item.totalAvailable}
                        </td>
                      </tr>
                      {isExpanded &&
                        item.variants.map((variant, idx) => (
                          <tr key={`${item._id}-${idx}`} className="bg-accent/50 dark:bg-primary/50">
                            <td className="px-6 py-3 pl-20">
                              <span className="text-sm text-muted dark:text-muted">Maat: {variant.size}</span>
                            </td>
                            <td className="px-6 py-3 text-sm text-muted dark:text-muted">{variant.sku}</td>
                            <td className="px-6 py-3 text-right text-sm text-muted dark:text-muted">
                              {variant.unavailable}
                            </td>
                            <td className="px-6 py-3 text-right text-sm text-muted dark:text-muted">
                              {variant.reserved}
                            </td>
                            <td className="px-6 py-3 text-right text-sm text-muted dark:text-muted">
                              {variant.available}
                            </td>
                            <td className="px-6 py-3 text-right text-sm font-medium text-black dark:text-secondary">
                              {variant.available}
                            </td>
                          </tr>
                        ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white p-12 text-center dark:border-border dark:bg-primary">
          <p className="text-muted dark:text-muted">Geen producten gevonden.</p>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;

