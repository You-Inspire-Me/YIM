import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2, Search, Package, Link2, Upload, Download, Settings, Barcode, X } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import { IcecatPreviewModal, IcecatProduct } from '../../components/IcecatPreviewModal';
import { endpoints, GlobalProductInput } from '../../lib/api';

interface GlobalProduct {
  _id: string;
  sku: string;
  ean?: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  specs: {
    maat?: string;
    kleur?: string;
    materiaal?: string;
    [key: string]: string | undefined;
  };
  variants: Array<{
    _id: string;
    size: string;
    color: string;
  }>;
}

interface CreatorListing {
  _id: string;
  productId: GlobalProduct;
  variantId: {
    _id: string;
    size: string;
    color: string;
  };
  sku: string;
  priceExclVat: number;
  priceInclVat: number;
  vatRate: number;
  stock: number;
  costPrice?: number;
  supplier?: string;
  active: boolean;
  posSystem: 'lightspeed' | 'vend' | 'shopify' | 'none';
  posSync: boolean;
  lastPosSync?: string;
  posExternalId?: string;
}

const ProductsPage = (): JSX.Element => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pim' | 'listings'>('listings');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
  const [isCreateListingModalOpen, setIsCreateListingModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<GlobalProduct | null>(null);
  const [editingListing, setEditingListing] = useState<CreatorListing | null>(null);

  // Fetch creator's listings
  const { data: listingsData, isLoading: listingsLoading } = useQuery<{ listings: CreatorListing[] }>({
    queryKey: ['creator-listings'],
    queryFn: async () => {
      const response = await endpoints.creatorListings.list();
      return response.data;
    }
  });

  // Fetch global products (for PIM section)
  const { data: productsData, isLoading: productsLoading } = useQuery<{ products: GlobalProduct[] }>({
    queryKey: ['global-products', searchQuery],
    queryFn: async () => {
      const response = await endpoints.globalProducts.list({ search: searchQuery, limit: 50 });
      return response.data;
    },
    enabled: activeTab === 'pim'
  });

  const listings = listingsData?.listings || [];
  const products = productsData?.products || [];

  const handleCreateListing = (product: GlobalProduct): void => {
    if (!product.variants || product.variants.length === 0) {
      toast.error('Product heeft geen varianten. Voeg eerst varianten toe.');
      return;
    }
    setSelectedProduct(product);
    setIsCreateListingModalOpen(true);
  };

  const handleEditListing = (listing: CreatorListing): void => {
    setEditingListing(listing);
    setIsCreateListingModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-black dark:text-secondary">Producten</h1>
          <p className="mt-2 text-sm text-muted dark:text-muted">
            Beheer globale producten (PIM) en je eigen voorraad & prijzen
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border dark:border-border">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('listings')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-semibold transition ${
              activeTab === 'listings'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:border-border hover:text-black dark:text-muted'
            }`}
          >
            Mijn voorraad & prijzen
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pim')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-semibold transition ${
              activeTab === 'pim'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:border-border hover:text-black dark:text-muted'
            }`}
          >
            Producten beheren (PIM)
          </button>
        </nav>
      </div>

      {/* Mijn voorraad & prijzen */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <Input
                  type="text"
                  placeholder="Zoek op product, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setIsPosModalOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                POS koppelen
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsCsvModalOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                CSV importeren
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    // Use MerchantStock export (stock-only, new format)
                    const response = await endpoints.merchantInventory.exportCsv();
                    const blob = new Blob([response.data], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'voorraad-export.csv';
                    a.click();
                    toast.success('Voorraad CSV gedownload (nieuwe formaat)');
                  } catch (error) {
                    toast.error('CSV download mislukt');
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Exporteer voorraad (CSV)
              </Button>
              <Button
                onClick={() => {
                  setActiveTab('pim');
                  setIsCreateProductModalOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nieuw product (PIM)
              </Button>
            </div>
          </div>

          {listingsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-xl border border-border bg-white p-12 text-center dark:border-border dark:bg-primary">
              <Package className="mx-auto h-12 w-12 text-muted" />
              <p className="mt-4 text-lg font-semibold text-black dark:text-secondary">
                Geen listings gevonden
              </p>
              <p className="mt-2 text-sm text-muted dark:text-muted">
                Voeg eerst een product toe in PIM, of importeer via CSV.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-white dark:border-border dark:bg-primary">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[border] dark:divide-gray-800">
                  <thead className="bg-accent dark:bg-primary">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                        Variant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                        Prijs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                        Voorraad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                        POS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                        Status
                      </th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[border] bg-white dark:divide-gray-800 dark:bg-primary">
                    {listings
                      .filter((listing) => {
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          listing.productId.title.toLowerCase().includes(query) ||
                          listing.sku.toLowerCase().includes(query) ||
                          listing.productId.sku.toLowerCase().includes(query)
                        );
                      })
                      .map((listing) => (
                        <tr key={listing._id} className="hover:bg-accent dark:hover:bg-gray-900">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              {listing.productId.images?.[0] && (
                                <img
                                  src={listing.productId.images[0]}
                                  alt={listing.productId.title}
                                  className="h-12 w-12 rounded-lg object-cover"
                                />
                              )}
                              <div>
                                <p className="font-semibold text-black dark:text-secondary">
                                  {listing.productId.title}
                                </p>
                                <p className="text-xs text-muted dark:text-muted">
                                  SKU: {listing.productId.sku}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted dark:text-muted">
                            {listing.variantId.size} / {listing.variantId.color}
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-black dark:text-secondary">
                            {listing.sku}
                          </td>
                          <td className="px-6 py-4 font-semibold text-black dark:text-secondary">
                            € {listing.priceInclVat.toFixed(2)}
                            <span className="ml-1 text-xs font-normal text-muted">
                              (excl. €{listing.priceExclVat.toFixed(2)})
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={
                                listing.stock < 10
                                  ? 'font-semibold text-red-600 dark:text-red-400'
                                  : 'text-black dark:text-secondary'
                              }
                            >
                              {listing.stock}
                            </span>
                            {listing.stock < 10 && (
                              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                Laag
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {listing.posSystem !== 'none' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-primary">
                                  {listing.posSystem}
                                </span>
                                {listing.posSync && (
                                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-primary">
                                    Sync
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingListing(listing);
                                  setIsPosModalOpen(true);
                                }}
                                className="text-xs text-primary hover:underline"
                              >
                                Koppel POS
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                listing.active
                                  ? 'bg-accent text-primary dark:bg-primary/30 dark:text-secondary'
                                  : 'bg-accent text-muted dark:bg-primary dark:text-muted'
                              }`}
                            >
                              {listing.active ? 'Actief' : 'Inactief'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition hover:bg-accent dark:border-border dark:text-secondary dark:hover:bg-primary/90"
                                onClick={() => handleEditListing(listing)}
                                aria-label="Bewerk listing"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Producten beheren (PIM) */}
      {activeTab === 'pim' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <Input
                type="text"
                placeholder="Zoek producten op titel, SKU, EAN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setIsCreateProductModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nieuw product toevoegen
            </Button>
          </div>

          {productsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-border bg-white p-12 text-center dark:border-border dark:bg-primary">
              <Package className="mx-auto h-12 w-12 text-muted" />
              <p className="mt-4 text-lg font-semibold text-black dark:text-secondary">
                Geen producten gevonden
              </p>
              <p className="mt-2 text-sm text-muted dark:text-muted">
                Voeg een nieuw product toe om te beginnen.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <div
                  key={product._id}
                  className="rounded-xl border border-border bg-white p-4 dark:border-border dark:bg-primary"
                >
                  {product.images?.[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="mb-3 h-48 w-full rounded-lg object-cover"
                    />
                  )}
                  <h3 className="font-semibold text-black dark:text-secondary">{product.title}</h3>
                  <p className="mt-1 text-xs text-muted dark:text-muted">
                    SKU: {product.sku} {product.ean && `• EAN: ${product.ean}`}
                  </p>
                  <p className="mt-2 text-sm text-muted dark:text-muted">
                    {product.variants?.length || 0} varianten
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => navigate(`/creator/products/${product._id}`)}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Bewerken
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleCreateListing(product)}
                    >
                      <Link2 className="mr-1 h-3 w-3" />
                      Dit product verkopen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Listing Modal */}
      <Modal
        isOpen={isCreateListingModalOpen}
        onClose={() => {
          setIsCreateListingModalOpen(false);
          setSelectedProduct(null);
          setEditingListing(null);
        }}
        title={editingListing ? 'Listing bewerken' : 'Nieuw product verkopen'}
      >
        <CreateListingForm
          product={selectedProduct || editingListing?.productId || null}
          listing={editingListing}
          onSuccess={() => {
            setIsCreateListingModalOpen(false);
            setSelectedProduct(null);
            setEditingListing(null);
            void queryClient.invalidateQueries({ queryKey: ['creator-listings'] });
          }}
        />
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="CSV importeren"
      >
        <CsvImportForm
          onSuccess={() => {
            setIsCsvModalOpen(false);
            void queryClient.invalidateQueries({ queryKey: ['creator-listings'] });
          }}
        />
      </Modal>

      {/* POS Koppeling Modal */}
      <Modal
        isOpen={isPosModalOpen}
        onClose={() => {
          setIsPosModalOpen(false);
          setEditingListing(null);
        }}
        title={editingListing ? 'POS koppeling bewerken' : 'POS kassasysteem koppelen'}
      >
        <PosConnectionForm
          listing={editingListing}
          onSuccess={() => {
            setIsPosModalOpen(false);
            setEditingListing(null);
            void queryClient.invalidateQueries({ queryKey: ['creator-listings'] });
          }}
        />
      </Modal>

      {/* Create Product Modal with EAN Lookup */}
      <Modal
        isOpen={isCreateProductModalOpen}
        onClose={() => setIsCreateProductModalOpen(false)}
        title="Nieuw product toevoegen"
      >
        <CreateProductForm
          onSuccess={() => {
            setIsCreateProductModalOpen(false);
            void queryClient.invalidateQueries({ queryKey: ['global-products'] });
          }}
        />
      </Modal>
    </div>
  );
};

// Create Listing Form Component
interface CreateListingFormProps {
  product: GlobalProduct | null;
  listing?: CreatorListing | null;
  onSuccess: () => void;
}

const CreateListingForm = ({ product, listing, onSuccess }: CreateListingFormProps): JSX.Element => {
  // Handle variantId - it can be an object with _id or a string
  const getVariantId = (): string => {
    if (!listing?.variantId) return '';
    if (typeof listing.variantId === 'string') return listing.variantId;
    if (listing.variantId._id) return listing.variantId._id;
    return '';
  };
  
  const [variantId, setVariantId] = useState(getVariantId());
  const [priceExclVat, setPriceExclVat] = useState(listing?.priceExclVat.toString() || '');
  const [vatRate, setVatRate] = useState(listing?.vatRate.toString() || '21');
  const [stock, setStock] = useState(listing?.stock.toString() || '0');
  const [costPrice, setCostPrice] = useState(listing?.costPrice?.toString() || '');
  const [supplier, setSupplier] = useState(listing?.supplier || '');
  const [active, setActive] = useState(listing?.active !== false);

  const createMutation = useMutation({
    mutationFn: async (data: {
      productId: string;
      variantId: string;
      priceExclVat: number;
      vatRate: number;
      stock: number;
      costPrice?: number;
      supplier?: string;
      active: boolean;
    }) => {
      if (listing) {
        return endpoints.creatorListings.update(listing._id, data);
      }
      return endpoints.creatorListings.create(data);
    },
    onSuccess: () => {
      toast.success(listing ? 'Listing bijgewerkt' : 'Listing aangemaakt');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Bewerken mislukt');
    }
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!product || !variantId || variantId === '') {
      toast.error('Selecteer een product en variant');
      return;
    }

    // Ensure variantId is a valid string (not "/" or empty)
    if (variantId === '/' || variantId.trim() === '') {
      toast.error('Selecteer een geldige variant');
      return;
    }

    createMutation.mutate({
      productId: product._id,
      variantId: variantId.trim(),
      priceExclVat: parseFloat(priceExclVat),
      vatRate: parseFloat(vatRate),
      stock: parseInt(stock, 10),
      costPrice: costPrice ? parseFloat(costPrice) : undefined,
      supplier: supplier || undefined,
      active
    });
  };

  const priceInclVat = priceExclVat
    ? (parseFloat(priceExclVat) * (1 + parseFloat(vatRate) / 100)).toFixed(2)
    : '0.00';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {product && (
        <div className="rounded-lg border border-border bg-accent p-4 dark:border-border dark:bg-primary">
          <p className="font-semibold text-black dark:text-secondary">{product.title}</p>
          <p className="text-sm text-muted dark:text-muted">SKU: {product.sku}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-black dark:text-secondary">
          Variant *
        </label>
        <select
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 dark:border-border dark:bg-primary"
          required
        >
          <option value="">Selecteer variant</option>
          {product?.variants.map((v) => (
            <option key={v._id} value={v._id}>
              {v.size} / {v.color}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-black dark:text-secondary">
            Prijs excl. BTW *
          </label>
          <Input
            type="number"
            step="0.01"
            value={priceExclVat}
            onChange={(e) => setPriceExclVat(e.target.value)}
            required
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black dark:text-secondary">
            BTW %
          </label>
          <select
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 dark:border-border dark:bg-primary"
          >
            <option value="0">0%</option>
            <option value="9">9%</option>
            <option value="21">21%</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg bg-accent p-3 dark:bg-primary/30">
        <p className="text-sm text-primary dark:text-secondary">
          Prijs incl. BTW: € {priceInclVat}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-black dark:text-secondary">
            Voorraad *
          </label>
          <Input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black dark:text-secondary">
            Inkoopprijs
          </label>
          <Input
            type="number"
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            min="0"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-black dark:text-secondary">
          Leverancier
        </label>
        <Input
          type="text"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <label htmlFor="active" className="text-sm font-medium text-black dark:text-secondary">
          Actief (zichtbaar voor klanten)
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onSuccess()}
        >
          Annuleren
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Opslaan...' : listing ? 'Bijwerken' : 'Aanmaken'}
        </Button>
      </div>
    </form>
  );
};

// CSV Import Form Component
interface CsvImportFormProps {
  onSuccess: () => void;
}

const CsvImportForm = ({ onSuccess }: CsvImportFormProps): JSX.Element => {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useState<HTMLInputElement | null>(null)[0];

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csv', file);
      return endpoints.creatorListings.importCsv(formData);
    },
    onSuccess: (data: any) => {
      const success = data.data.success || 0;
      const errors = data.data.errors || 0;
      if (errors > 0) {
        toast.error(`Import voltooid: ${success} successvol, ${errors} fouten`);
      } else {
        toast.success(`Import voltooid: ${success} listings geïmporteerd`);
      }
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Import mislukt');
    }
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!file) {
      toast.error('Selecteer een CSV bestand');
      return;
    }
    importMutation.mutate(file);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border-2 border-dashed border-border p-8 text-center dark:border-border">
        <Upload className="mx-auto h-12 w-12 text-muted" />
        <p className="mt-4 text-sm font-medium text-black dark:text-secondary">
          Upload CSV bestand
        </p>
        <div className="mt-4 space-y-2 text-left">
          <p className="text-sm font-semibold text-black dark:text-secondary">
            ⚠️ Let op: Deze import is voor LISTINGS (met prijs)
          </p>
          <p className="text-xs text-muted dark:text-muted">
            Voor alleen voorraad import, ga naar de <strong>Voorraad</strong> pagina.
          </p>
          <p className="text-xs font-semibold text-black dark:text-secondary mt-2">
            Vereiste kolommen voor listings:
          </p>
          <code className="block rounded bg-accent p-2 text-xs text-black dark:bg-primary dark:text-secondary">
            sku,variant_size,variant_color,price_excl_vat,stock
          </code>
          <p className="text-xs text-muted dark:text-muted">
            Optioneel: <strong>ean</strong> (voor automatische Icecat lookup), price_incl_vat, vat_rate, cost_price, supplier, active, pos_system, pos_external_id
          </p>
          <p className="text-xs text-blue-600 dark:text-secondary mt-2">
            💡 <strong>Tip:</strong> Voeg een <code className="px-1 py-0.5 bg-blue-100 rounded">ean</code> kolom toe voor automatische productgegevens via Icecat!
          </p>
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-4"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onSuccess()}
        >
          Annuleren
        </Button>
        <Button type="submit" disabled={!file || importMutation.isPending}>
          {importMutation.isPending ? 'Importeren...' : 'Importeren'}
        </Button>
      </div>
    </form>
  );
};

// POS Connection Form Component
interface PosConnectionFormProps {
  listing?: CreatorListing | null;
  onSuccess: () => void;
}

const PosConnectionForm = ({ listing, onSuccess }: PosConnectionFormProps): JSX.Element => {
  const [posSystem, setPosSystem] = useState<'lightspeed' | 'vend' | 'shopify' | 'none'>(
    listing?.posSystem || 'none'
  );
  const [posExternalId, setPosExternalId] = useState(listing?.posExternalId || '');
  const [posSync, setPosSync] = useState(listing?.posSync || false);
  const [apiKey, setApiKey] = useState('');
  const [storeId, setStoreId] = useState('');

  const updateMutation = useMutation({
    mutationFn: async (data: {
      posSystem: 'lightspeed' | 'vend' | 'shopify' | 'none';
      posExternalId?: string;
      posSync: boolean;
    }) => {
      if (!listing) {
        throw new Error('No listing selected');
      }
      return endpoints.creatorListings.update(listing._id, data);
    },
    onSuccess: () => {
      toast.success('POS koppeling bijgewerkt');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Bijwerken mislukt');
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      // TODO: Call POS sync endpoint
      return Promise.resolve({ data: { synced: 0, errors: 0 } });
    },
    onSuccess: () => {
      toast.success('POS sync gestart');
      onSuccess();
    },
    onError: () => {
      toast.error('POS sync mislukt');
    }
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!listing) {
      toast.error('Geen listing geselecteerd');
      return;
    }

    updateMutation.mutate({
      posSystem,
      posExternalId: posExternalId || undefined,
      posSync
    });
  };

  if (!listing) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted dark:text-muted">
          Selecteer eerst een listing om POS te koppelen.
        </p>
        <Button variant="secondary" onClick={onSuccess}>
          Sluiten
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-border bg-accent p-4 dark:border-border dark:bg-primary">
        <p className="font-semibold text-black dark:text-secondary">
          {listing.productId.title}
        </p>
        <p className="text-sm text-muted dark:text-muted">
          {listing.variantId.size} / {listing.variantId.color}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-black dark:text-secondary">
          POS Systeem
        </label>
        <select
          value={posSystem}
          onChange={(e) => setPosSystem(e.target.value as 'lightspeed' | 'vend' | 'shopify' | 'none')}
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 dark:border-border dark:bg-primary"
        >
          <option value="none">Geen</option>
          <option value="lightspeed">Lightspeed</option>
          <option value="vend">Vend</option>
          <option value="shopify">Shopify</option>
        </select>
      </div>

      {posSystem !== 'none' && (
        <>
          <div>
            <label className="block text-sm font-medium text-black dark:text-secondary">
              External ID (bijv. Lightspeed item ID)
            </label>
            <Input
              type="text"
              value={posExternalId}
              onChange={(e) => setPosExternalId(e.target.value)}
              placeholder="Bijv. 12345"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="posSync"
              checked={posSync}
              onChange={(e) => setPosSync(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="posSync" className="text-sm font-medium text-black dark:text-secondary">
              Automatisch synchroniseren (elke 15 minuten)
            </label>
          </div>

          <div className="rounded-lg border border-border bg-accent p-4 dark:border-border dark:bg-primary">
            <p className="text-sm font-semibold text-black dark:text-secondary">
              API Configuratie
            </p>
            <p className="mt-2 text-xs text-muted dark:text-muted">
              Voer je API credentials in om automatisch voorraad te synchroniseren.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-black dark:text-secondary">
                  API Key
                </label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Je API key"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black dark:text-secondary">
                  Store ID
                </label>
                <Input
                  type="text"
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  placeholder="Je store ID"
                />
              </div>
            </div>
          </div>

          {listing.lastPosSync && (
            <div className="text-xs text-muted dark:text-muted">
              Laatste sync: {new Date(listing.lastPosSync).toLocaleString('nl-NL')}
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onSuccess}
        >
          Annuleren
        </Button>
        {posSystem !== 'none' && listing.posSystem !== 'none' && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? 'Synchroniseren...' : 'Nu synchroniseren'}
          </Button>
        )}
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Opslaan...' : 'Opslaan'}
        </Button>
      </div>
    </form>
  );
};

// Create Product Form Component with EAN Lookup
interface CreateProductFormProps {
  onSuccess: () => void;
}

const CreateProductForm = ({ onSuccess }: CreateProductFormProps): JSX.Element => {
  const [ean, setEan] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [icecatProduct, setIcecatProduct] = useState<IcecatProduct | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form fields
  const [sku, setSku] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('all');
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<Array<{ size: string; color: string }>>([]);

  const lookupMutation = useMutation({
    mutationFn: async (eanValue: string) => {
      const response = await endpoints.icecat.lookup(eanValue);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.found && data.product) {
        setIcecatProduct(data.product);
        setShowPreview(true);
        setIsEditing(false);
      } else {
        toast.error('Geen product gevonden – vul handmatig in');
      }
      setIsSearching(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Fout bij opzoeken van product');
      setIsSearching(false);
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: GlobalProductInput) => {
      return endpoints.globalProducts.create(data);
    },
    onSuccess: () => {
      toast.success('Product aangemaakt');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Product aanmaken mislukt');
    }
  });

  const handleEANLookup = (): void => {
    if (!ean.trim()) {
      toast.error('Voer een EAN in');
      return;
    }
    setIsSearching(true);
    lookupMutation.mutate(ean.trim());
  };

  const handleUseProduct = (product: IcecatProduct): void => {
    // Auto-fill form with Icecat data
    setTitle(product.title);
    setDescription(product.description);
    setBrand(product.brand);
    setImages(product.images || []);
    
    // Extract variants from specs
    if (product.specs.size && product.specs.color) {
      setVariants([{
        size: product.specs.size,
        color: product.specs.color
      }]);
    }

    // Generate SKU from brand + EAN
    const skuPrefix = product.brand.substring(0, 3).toUpperCase();
    setSku(`${skuPrefix}-${product.ean.substring(0, 8)}`);

    setShowPreview(false);
    setIsEditing(true);
    toast.success('Productgegevens ingevuld. Controleer en pas aan indien nodig.');
  };

  const handleEditProduct = (product: IcecatProduct): void => {
    // Same as use, but show form immediately
    handleUseProduct(product);
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    
    if (!sku || !title) {
      toast.error('SKU en titel zijn verplicht');
      return;
    }

    createMutation.mutate({
      sku,
      ean: ean || undefined,
      title,
      description,
      category: category as 'dames' | 'heren' | 'kinderen' | 'all',
      images,
      specs: {
        brand,
        ...icecatProduct?.specs
      },
      variants: variants.map(v => ({
        size: v.size,
        color: v.color,
        weight: 0 // Default weight, can be updated later
      }))
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* EAN Lookup */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <label className="block text-sm font-medium text-black dark:text-secondary mb-2">
            <Barcode className="inline mr-2 h-4 w-4" />
            Gratis EAN opzoeken
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Voer EAN in (bijv. 1234567890123)"
              value={ean}
              onChange={(e) => setEan(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleEANLookup();
                }
              }}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleEANLookup}
              disabled={isSearching || !ean.trim()}
            >
              {isSearching ? 'Zoeken...' : 'Zoeken'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted dark:text-muted">
            Automatisch productgegevens ophalen via Icecat (gratis, 1000x/dag)
          </p>
        </div>

        {/* Product Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black dark:text-secondary">
                SKU *
              </label>
              <Input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black dark:text-secondary">
                EAN
              </label>
              <Input
                type="text"
                value={ean}
                onChange={(e) => setEan(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-secondary">
              Titel *
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-secondary">
              Merk
            </label>
            <Input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-secondary">
              Beschrijving
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border px-3 py-2 dark:border-border dark:bg-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-secondary">
              Categorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 dark:border-border dark:bg-primary"
            >
              <option value="all">Alle</option>
              <option value="dames">Dames</option>
              <option value="heren">Heren</option>
              <option value="kinderen">Kinderen</option>
            </select>
          </div>

          {/* Variants */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-secondary mb-2">
              Varianten
            </label>
            {variants.map((variant, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="Maat"
                  value={variant.size}
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[idx].size = e.target.value;
                    setVariants(newVariants);
                  }}
                />
                <Input
                  type="text"
                  placeholder="Kleur"
                  value={variant.color}
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[idx].color = e.target.value;
                    setVariants(newVariants);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setVariants(variants.filter((_, i) => i !== idx));
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setVariants([...variants, { size: '', color: '' }])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Variant toevoegen
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border dark:border-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onSuccess}
          >
            Annuleren
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Aanmaken...' : 'Product aanmaken'}
          </Button>
        </div>
      </form>

      {/* Icecat Preview Modal */}
      {icecatProduct && (
        <IcecatPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          product={icecatProduct}
          onUse={handleUseProduct}
          onEdit={handleEditProduct}
        />
      )}
    </>
  );
};

export default ProductsPage;

