import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Upload, Search, Edit2, Check, X, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import { endpoints } from '../../lib/api';

interface MerchantOffer {
  _id: string;
  offerId: string;
  merchantSku: string;
  status: 'active' | 'paused';
  variantId: {
    _id: string;
    size: string;
    colorCode: string;
    masterId: {
      _id: string;
      title: string;
      modelId: string;
      brandId: string;
    };
  };
  price?: {
    effectivePrice: number;
    basePrice: number;
    salePrice?: number;
    currency: string;
  };
  stocks?: Array<{
    _id: string;
    availableQty: number;
    status: 'in_stock' | 'backorder' | 'out_of_stock';
    locationId: {
      name: string;
      type: 'store' | 'warehouse' | '3pl';
    };
  }>;
  totalStock: number;
}

interface CsvPreviewRow {
  merchantSku: string;
  variant_size: string;
  variant_color: string;
  stock: number;
  location_type?: 'store' | 'warehouse' | '3pl';
  pos_system?: 'lightspeed' | 'vend' | 'shopify' | 'none';
  pos_external_id?: string;
  error?: string;
}

const InventoryPage = (): JSX.Element => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingStock, setEditingStock] = useState<{ offerId: string; stockId: string; value: number } | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ offers: MerchantOffer[] }>({
    queryKey: ['merchant-offers', search],
    queryFn: async () => {
      const response = await endpoints.merchantOffers.list({
        status: undefined
      });
      return response.data;
    }
  });

  const offers = data?.offers || [];

  // Filter and sort offers
  const sortedOffers = [...offers]
    .filter((offer) => {
      if (!search) return true;
      const query = search.toLowerCase();
      return (
        offer.variantId.masterId.title.toLowerCase().includes(query) ||
        offer.merchantSku.toLowerCase().includes(query) ||
        offer.variantId.masterId.modelId.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      if (sortBy === 'title') {
        aVal = a.variantId.masterId.title;
        bVal = b.variantId.masterId.title;
      } else if (sortBy === 'stock') {
        aVal = a.totalStock;
        bVal = b.totalStock;
      } else if (sortBy === 'price') {
        aVal = a.price?.effectivePrice || 0;
        bVal = b.price?.effectivePrice || 0;
      } else if (sortBy === 'sku') {
        aVal = a.merchantSku;
        bVal = b.merchantSku;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  const updateStockMutation = useMutation({
    mutationFn: async ({ stockId, qty }: { stockId: string; qty: number }) => {
      // TODO: Update stock via API endpoint
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      toast.success('Voorraad bijgewerkt');
      void queryClient.invalidateQueries({ queryKey: ['merchant-offers'] });
      setEditingStock(null);
    },
    onError: () => {
      toast.error('Bijwerken mislukt');
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Remove BOM and trim whitespace
        const cleaned = header.replace(/^\uFEFF/, '').trim();
        const normalized = cleaned.toLowerCase();
        const headerMap: Record<string, string> = {
          merchant_sku: 'merchantSku',
          merchantsku: 'merchantSku',
          'merchant sku': 'merchantSku',
          sku: 'merchantSku', // Legacy support
          creator_sku: 'merchantSku', // Legacy support
          'creator sku': 'merchantSku',
          variant_size: 'variant_size',
          'variant size': 'variant_size',
          size: 'variant_size',
          variant_color: 'variant_color',
          'variant color': 'variant_color',
          color: 'variant_color',
          stock: 'stock',
          voorraad: 'stock',
          quantity: 'stock',
          location_type: 'location_type',
          'location type': 'location_type',
          location: 'location_type',
          pos_system: 'pos_system',
          'pos system': 'pos_system',
          pos_external_id: 'pos_external_id',
          'pos external id': 'pos_external_id',
          // Ignore old price/product fields (not used in stock-only import)
          price_excl_vat: '__ignore__',
          'price excl vat': '__ignore__',
          price_incl_vat: '__ignore__',
          'price incl vat': '__ignore__',
          vat_rate: '__ignore__',
          'vat rate': '__ignore__',
          cost_price: '__ignore__',
          'cost price': '__ignore__',
          supplier: '__ignore__',
          active: '__ignore__',
          ean: '__ignore__',
          title: '__ignore__',
          description: '__ignore__',
          category: '__ignore__',
          weight_grams: '__ignore__',
          'weight grams': '__ignore__',
          weight: '__ignore__',
          barcode: '__ignore__'
        };
        const mapped = headerMap[normalized];
        // If not in map and contains ignored keywords, ignore it
        if (!mapped) {
          const ignoredKeywords = ['price', 'vat', 'cost', 'supplier', 'active', 'ean', 'title', 'description', 'category', 'weight', 'barcode'];
          if (ignoredKeywords.some(keyword => normalized.includes(keyword))) {
            return '__ignore__';
          }
        }
        // Preserve original case for known headers, otherwise return mapped or original
        if (mapped) {
          return mapped;
        }
        // If header looks like merchantSku (case-insensitive), return merchantSku
        if (normalized.includes('merchant') && normalized.includes('sku')) {
          return 'merchantSku';
        }
        return cleaned; // Return cleaned original if not mapped
      },
      complete: (results) => {
        // Filter out ignored columns from parsed data
        const filteredData = results.data
          .filter((row: any) => row && typeof row === 'object')
          .map((row: any) => {
            const filtered: any = {};
            Object.keys(row).forEach(key => {
              if (key && !key.startsWith('__ignore__')) {
                filtered[key] = row[key];
              }
            });
            return filtered;
          })
          .filter((row: any) => Object.keys(row).length > 0);

        const rows: CsvPreviewRow[] = filteredData.map((row: any, index: number) => {
          try {
            // Support both new and old CSV formats - check all possible key variations
            const merchantSku = (
              row.merchantSku || 
              row.merchant_sku || 
              row.merchantsku ||
              row['merchantSku'] ||
              row['merchant_sku'] ||
              row['merchantsku'] ||
              row.sku || 
              row['sku'] ||
              row.creator_sku || 
              row['creator_sku'] ||
              ''
            ).toString().trim();

            const variant_size = (row.variant_size || row.size || '').trim();
            const variant_color = (row.variant_color || row.color || '').trim();
            const stock = parseInt((row.stock || row.voorraad || '0').toString().replace(',', '.'), 10);

            // Validate required fields
            if (!merchantSku) {
              return {
                merchantSku: '',
                variant_size,
                variant_color,
                stock: 0,
                error: 'Missing merchantSku (or sku/creator_sku)'
              };
            }

            if (!variant_size) {
              return {
                merchantSku,
                variant_size: '',
                variant_color,
                stock: 0,
                error: 'Missing variant_size (or size)'
              };
            }

            if (!variant_color) {
              return {
                merchantSku,
                variant_size,
                variant_color: '',
                stock: 0,
                error: 'Missing variant_color (or color)'
              };
            }

            if (isNaN(stock) || stock < 0) {
              return {
                merchantSku,
                variant_size,
                variant_color,
                stock: 0,
                error: `Invalid stock: ${row.stock}`
              };
            }

            return {
              merchantSku,
              variant_size,
              variant_color,
              stock,
              location_type: (row.location_type || row.location || 'warehouse').trim() as 'store' | 'warehouse' | '3pl',
              pos_system: (row.pos_system || 'none').trim().toLowerCase() as 'lightspeed' | 'vend' | 'shopify' | 'none',
              pos_external_id: (row.pos_external_id || '').trim() || undefined
            };
          } catch (error) {
            return {
              merchantSku: '',
              variant_size: '',
              variant_color: '',
              stock: 0,
              error: error instanceof Error ? error.message : 'Parse error'
            };
          }
        });

        setCsvPreview(rows);
      },
      error: (error) => {
        toast.error(`CSV parse error: ${error.message}`);
      }
    });
  };

  const importCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csv', file);
      return endpoints.merchantInventory.importCsv(formData);
    },
    onSuccess: (data: any) => {
      const success = data.data.success || 0;
      const errors = data.data.errors || [];
      const errorCount = Array.isArray(errors) ? errors.length : (typeof errors === 'number' ? errors : 0);
      
      if (errorCount > 0) {
        const errorMessage = Array.isArray(errors) && errors.length > 0 
          ? errors.slice(0, 3).map((e: any) => `Rij ${e.row}: ${e.error}`).join(', ')
          : `${errorCount} fouten`;
        toast.error(`Import voltooid: ${success} successvol, ${errorCount} fouten. ${errorMessage}${Array.isArray(errors) && errors.length > 3 ? '...' : ''}`);
      } else {
        toast.success(`Import voltooid: ${success} voorraden bijgewerkt`);
      }
      setIsCsvModalOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      void queryClient.invalidateQueries({ queryKey: ['merchant-offers'] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Import mislukt';
      const errorDetails = error?.response?.data?.errors;
      if (errorDetails && Array.isArray(errorDetails) && errorDetails.length > 0) {
        const details = errorDetails.slice(0, 3).map((e: any) => `Rij ${e.row}: ${e.error}`).join(', ');
        toast.error(`${errorMessage}. ${details}${errorDetails.length > 3 ? '...' : ''}`, { duration: 6000 });
      } else {
        toast.error(errorMessage, { duration: 5000 });
      }
      console.error('CSV import error:', error);
    }
  });

  const handleImportCsv = (): void => {
    if (!csvFile) {
      toast.error('Selecteer een CSV bestand');
      return;
    }
    importCsvMutation.mutate(csvFile);
  };

  const handleExportCsv = async (): Promise<void> => {
    try {
      const response = await endpoints.merchantInventory.exportCsv();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merchant-stock.csv';
      a.click();
      toast.success('CSV gedownload');
    } catch (error) {
      toast.error('CSV download mislukt');
    }
  };

  const handleDownloadTemplate = (): void => {
    // Create example CSV with correct headers
    const template = `merchantSku,variant_size,variant_color,stock,location_type,pos_system,pos_external_id
SKU-001,42,blauw,10,warehouse,none,
SKU-002,M,rood,5,store,none,
SKU-003,L,groen,20,warehouse,lightspeed,LS-12345`;

    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voorraad-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template gedownload');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1E293B] dark:text-white">Voorraad</h1>
          <p className="mt-2 text-sm text-[#64748B] dark:text-gray-400">
            Beheer je voorraad per locatie (Zalando-grade)
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" />
            CSV exporteren
          </Button>
          <Button variant="secondary" onClick={() => setIsCsvModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            CSV importeren
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748B]" />
          <Input
            type="text"
            placeholder="Zoek op product, SKU, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-48"
        >
          <option value="title">Sorteer op titel</option>
          <option value="sku">Sorteer op SKU</option>
          <option value="stock">Sorteer op voorraad</option>
          <option value="price">Sorteer op prijs</option>
        </Select>
        <Button
          variant="secondary"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : sortedOffers.length === 0 ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <Package className="mx-auto h-12 w-12 text-[#64748B]" />
          <p className="mt-4 text-lg font-semibold text-[#1E293B] dark:text-white">
            Geen voorraad gevonden
          </p>
          <p className="mt-2 text-sm text-[#64748B] dark:text-gray-400">
            Begin met het importeren van je voorraad via CSV of maak een listing aan in Producten.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E2E8F0] dark:divide-gray-800">
              <thead className="bg-[#F8FAFC] dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Variant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Merchant SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Prijs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Voorraad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Status
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white dark:divide-gray-800 dark:bg-gray-900">
                {sortedOffers.map((offer) => (
                  <tr key={offer._id} className="hover:bg-[#F8FAFC] dark:hover:bg-gray-900">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-[#1E293B] dark:text-white">
                          {offer.variantId.masterId.title}
                        </p>
                        <p className="text-xs text-[#64748B] dark:text-gray-400">
                          {offer.variantId.masterId.brandId} • {offer.variantId.masterId.modelId}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#64748B] dark:text-gray-400">
                      {offer.variantId.size} / {offer.variantId.colorCode}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-[#1E293B] dark:text-white">
                      {offer.merchantSku}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#1E293B] dark:text-white">
                      {offer.price ? (
                        <>
                          € {offer.price.effectivePrice.toFixed(2)}
                          {offer.price.salePrice && (
                            <span className="ml-2 text-xs font-normal text-[#64748B] line-through">
                              € {offer.price.basePrice.toFixed(2)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[#64748B]">Geen prijs</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {offer.stocks && offer.stocks.length > 0 ? (
                        <div className="space-y-1">
                          {offer.stocks.map((stock) => (
                            <div key={stock._id} className="flex items-center gap-2">
                              <span
                                className={
                                  stock.availableQty < 10
                                    ? 'font-semibold text-red-600 dark:text-red-400'
                                    : 'text-[#1E293B] dark:text-white'
                                }
                              >
                                {stock.availableQty}
                              </span>
                              <span className="text-xs text-[#64748B]">
                                ({stock.locationId.name})
                              </span>
                              {stock.status === 'out_of_stock' && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                  Uitverkocht
                                </span>
                              )}
                            </div>
                          ))}
                          <div className="mt-1 text-xs font-semibold text-[#1E293B] dark:text-white">
                            Totaal: {offer.totalStock}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#64748B]">Geen voorraad</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          offer.status === 'active'
                            ? 'bg-[#E0F2FE] text-[#0EA5E9] dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {offer.status === 'active' ? 'Actief' : 'Gepauzeerd'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          // TODO: Open edit modal
                          toast('Bewerken via Producten tab');
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => {
          setIsCsvModalOpen(false);
          setCsvFile(null);
          setCsvPreview([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        title="CSV importeren (voorraad alleen)"
      >
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-[#E2E8F0] p-8 text-center dark:border-gray-700">
            <Upload className="mx-auto h-12 w-12 text-[#64748B]" />
            <p className="mt-4 text-sm font-medium text-[#1E293B] dark:text-white">
              Upload CSV bestand
            </p>
            <div className="mt-4 space-y-2 text-left">
              <p className="text-sm font-semibold text-[#1E293B] dark:text-white">
                Vereiste kolommen (nieuwe formaat):
              </p>
              <code className="block rounded bg-[#F8FAFC] p-2 text-xs text-[#1E293B] dark:bg-gray-800 dark:text-white">
                merchantSku,variant_size,variant_color,stock
              </code>
              <p className="text-xs text-[#64748B] dark:text-gray-400">
                Optioneel: location_type, pos_system, pos_external_id
              </p>
              <p className="mt-2 text-xs font-semibold text-[#0EA5E9]">
                ⚠️ Let op: CSV bevat alleen voorraad, geen prijs! Prijs wordt in de UI ingesteld.
              </p>
              <p className="text-xs text-[#64748B] dark:text-gray-400">
                Gebruik <code className="px-1 py-0.5 bg-[#F8FAFC] rounded">location_type</code> om voorraad op te geven voor fysieke winkel (store), magazijn (warehouse) of 3PL (3pl).
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDownloadTemplate}
                className="mt-3"
              >
                <Download className="mr-2 h-3 w-3" />
                Download voorbeeld template
              </Button>
            </div>
            <div className="mt-6">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#64748B] transition-colors hover:border-[#0EA5E9] hover:bg-[#F0F9FF] hover:text-[#0EA5E9] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-[#0EA5E9] dark:hover:bg-gray-800"
              >
                <Upload className="h-4 w-4" />
                {csvFile ? csvFile.name : 'Selecteer CSV bestand'}
              </label>
            </div>
          </div>

          {csvPreview.length > 0 && (
            <div className="overflow-auto rounded-lg border border-[#E2E8F0] dark:border-gray-700 max-h-96">
              <table className="min-w-full divide-y divide-[#E2E8F0] dark:divide-gray-700 text-xs">
                <thead className="bg-[#F8FAFC] dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-[#64748B]">Merchant SKU</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-[#64748B]">Maat</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-[#64748B]">Kleur</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-[#64748B]">Voorraad</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-[#64748B]">Locatie</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-[#64748B]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {csvPreview.map((row, index) => (
                    <tr key={index} className={row.error ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                      <td className="px-2 py-2 text-[#1E293B] dark:text-white font-mono text-xs">{row.merchantSku}</td>
                      <td className="px-2 py-2 text-[#64748B] text-xs">{row.variant_size || ''}</td>
                      <td className="px-2 py-2 text-[#64748B] text-xs">{row.variant_color || ''}</td>
                      <td className="px-2 py-2 text-right text-[#1E293B] dark:text-white text-xs">{row.stock}</td>
                      <td className="px-2 py-2 text-[#64748B] text-xs">{row.location_type || 'warehouse'}</td>
                      <td className="px-2 py-2">
                        {row.error ? (
                          <span className="text-red-600 text-xs">{row.error}</span>
                        ) : (
                          <span className="text-[#10B981] text-xs">✓ OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCsvModalOpen(false);
                setCsvFile(null);
                setCsvPreview([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              Annuleren
            </Button>
            <Button
              onClick={handleImportCsv}
              disabled={!csvFile || csvPreview.some((row) => row.error) || importCsvMutation.isPending}
            >
              {importCsvMutation.isPending ? 'Importeren...' : 'Importeer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryPage;
