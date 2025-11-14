import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
  role: 'customer' | 'host' | 'creator';
}

export interface ProductInput {
  title: string;
  description: string;
  price: number;
  category: string;
  inventory?: number;
  sizes?: string[];
  tags?: string[];
  isPublished?: boolean;
  images?: File[];
}

export interface CheckoutItem {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface GlobalProductInput {
  sku: string;
  ean?: string;
  title: string;
  description: string;
  category: 'dames' | 'heren' | 'kinderen' | 'all';
  images?: string[];
  specs?: Record<string, string>;
  variants?: Array<{
    size: string;
    color: string;
    images?: string[];
    weight: number;
    barcode?: string;
  }>;
}

export interface CreatorListingInput {
  productId: string;
  variantId: string;
  sku?: string;
  priceExclVat: number;
  priceInclVat?: number;
  vatRate?: number;
  stock: number;
  costPrice?: number;
  supplier?: string;
  active?: boolean;
  posSystem?: 'lightspeed' | 'vend' | 'shopify' | 'none';
  posSync?: boolean;
  posExternalId?: string;
}

export interface LookInput {
  title: string;
  description: string;
  images: string[];
  products: Array<{
    productId: string;
    variantId: string; // Now required - ObjectId as string
    positionX?: number;
    positionY?: number;
  }>;
  tags: string[];
  published: boolean;
  category?: 'dames' | 'heren' | 'kinderen' | 'all';
}

export const endpoints = {
  auth: {
    login: (payload: LoginPayload) => api.post('/auth/login', payload),
    register: (payload: RegisterPayload) => api.post('/auth/register', payload),
    logout: () => api.post('/auth/logout'),
    current: () => api.get('/auth/me')
  },
      public: {
        looks: (params?: { category?: string }) => api.get('/public/looks', { params }),
        look: (id: string) => api.get(`/public/looks/${id}`)
      },
  products: {
    list: (params?: Record<string, unknown>) => api.get('/products', { params }),
    detail: (id: string) => api.get(`/products/${id}`),
    search: (query: string) => api.get('/products', { params: { search: query } })
  },
  creatorProducts: {
    list: () => api.get('/host/products'),
    search: (query: string) => api.get('/host/products/search', { params: { search: query } }),
    create: (data: ProductInput) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }

        if (key === 'images' && Array.isArray(value)) {
          value.forEach((file) => formData.append('images', file));
        } else if (Array.isArray(value)) {
          value.forEach((item) => formData.append(key, item));
        } else {
          formData.append(key, value.toString());
        }
      });

      return api.post('/host/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    update: (id: string, data: ProductInput) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }

        if (key === 'images' && Array.isArray(value)) {
          value.forEach((file) => formData.append('images', file));
        } else if (Array.isArray(value)) {
          value.forEach((item) => formData.append(key, item));
        } else {
          formData.append(key, value.toString());
        }
      });

      return api.patch(`/host/products/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    remove: (id: string) => api.delete(`/host/products/${id}`)
  },
  payments: {
    checkout: (data: { items: CheckoutItem[]; discountCode?: string; shippingAddress?: any }) =>
      api.post('/payments/checkout', data),
    getListings: (params: { productId: string; variantId: string; quantity?: number }) =>
      api.get('/payments/listings', { params })
  },
  // New multi-vendor endpoints
  globalProducts: {
    list: (params?: { category?: string; search?: string; limit?: number; skip?: number }) =>
      api.get('/creator/products', { params }),
    get: (id: string) => api.get(`/creator/products/${id}`),
    search: (params: { sku?: string; ean?: string }) => api.get('/creator/products/search', { params }),
    create: (data: GlobalProductInput) => api.post('/creator/products', data),
    update: (id: string, data: Partial<GlobalProductInput>) => api.put(`/creator/products/${id}`, data)
  },
  creatorListings: {
    list: (params?: { productId?: string; variantId?: string; active?: boolean; search?: string }) =>
      api.get('/creator/listings', { params }),
    get: (id: string) => api.get(`/creator/listings/${id}`),
    create: (data: CreatorListingInput) => api.post('/creator/listings', data),
    update: (id: string, data: Partial<CreatorListingInput>) => api.put(`/creator/listings/${id}`, data),
    delete: (id: string) => api.delete(`/creator/listings/${id}`),
    importCsv: (formData: FormData) => {
      return api.post('/creator/listings/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    exportCsv: () => api.get('/creator/listings/export', { responseType: 'blob' }),
    getAvailable: (params: { productId: string; variantId: string; quantity?: number }) =>
      api.get('/creator/listings/available', { params })
  },
  icecat: {
    lookup: (ean: string) => api.get('/creator/icecat/lookup', { params: { ean } })
  },
  merchantOffers: {
    list: (params?: { status?: string; variantId?: string }) =>
      api.get('/merchant/offers', { params }),
    get: (id: string) => api.get(`/merchant/offers/${id}`),
    create: (data: { variantId: string; merchantSku: string; listingCountries?: string[]; basePrice?: number; stock?: number; locationId?: string }) =>
      api.post('/merchant/offers', data),
    update: (id: string, data: { status?: 'active' | 'paused'; merchantSku?: string; listingCountries?: string[] }) =>
      api.put(`/merchant/offers/${id}`, data),
    getAvailable: (params: { variantId: string; country?: string; quantity?: number }) =>
      api.get('/merchant/offers/available', { params })
  },
  merchantInventory: {
    importCsv: (formData: FormData) => {
      return api.post('/merchant/inventory/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    exportCsv: () => api.get('/merchant/inventory/export', { responseType: 'blob' })
  },
  creator: {
    dashboard: {
      stats: () => api.get('/host/dashboard/stats'),
      revenue: (params?: { days?: number }) => api.get('/host/dashboard/revenue', { params }),
      topProducts: (params?: { limit?: number }) => api.get('/host/dashboard/top-products', { params }),
      analytics: () => api.get('/host/analytics')
    },
    orders: {
      list: (params?: { status?: string; page?: number; limit?: number }) =>
        api.get('/host/orders', { params }),
      recent: (params?: { limit?: number; since?: string }) => api.get('/host/orders/recent', { params }),
      detail: (id: string) => api.get(`/host/orders/${id}`),
      updateStatus: (id: string, status: string) => api.patch(`/host/orders/${id}/status`, { status })
    },
    looks: {
      list: (params?: { published?: boolean }) => api.get('/host/looks', { params }),
      detail: (id: string) => api.get(`/host/looks/${id}`),
      create: (data: LookInput) => api.post('/host/looks', data),
      update: (id: string, data: Partial<LookInput>) => api.put(`/host/looks/${id}`, data),
      delete: (id: string) => api.delete(`/host/looks/${id}`),
      togglePublished: (id: string) => api.patch(`/host/looks/${id}/toggle-published`)
    },
    inventory: {
      list: (params?: { search?: string; category?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) =>
        api.get('/host/inventory', { params }),
      exportCsv: () => api.get('/merchant/inventory/export', { responseType: 'blob' }),
      importCsv: (file: File) => {
        const formData = new FormData();
        formData.append('csv', file);
        return api.post('/merchant/inventory/import', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      },
      updateStock: (variantId: string, data: { stock?: number; priceExclVat?: number; priceInclVat?: number; vatRate?: number; active?: boolean }) =>
        api.patch(`/host/inventory/${variantId}`, data),
      bulkUpdate: (variantIds: string[], updates: { priceExclVat?: number; priceInclVat?: number; active?: boolean }) =>
        api.post('/host/inventory/bulk-update', { variantIds, updates })
    },
    // New multi-vendor inventory (uses CreatorListings)
    listings: {
      list: (params?: { productId?: string; variantId?: string; active?: boolean; search?: string }) =>
        api.get('/creator/listings', { params }),
      exportCsv: () => api.get('/creator/listings/export', { responseType: 'blob' }),
      importCsv: (file: File) => {
        const formData = new FormData();
        formData.append('csv', file);
        return api.post('/creator/listings/import', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      },
      update: (id: string, data: Partial<CreatorListingInput>) => api.put(`/creator/listings/${id}`, data),
      delete: (id: string) => api.delete(`/creator/listings/${id}`)
    }
  },
  // Legacy host endpoint (for backwards compatibility)
  host: {
    dashboard: {
      stats: () => api.get('/host/dashboard/stats'),
      revenue: (params?: { days?: number }) => api.get('/host/dashboard/revenue', { params }),
      topProducts: (params?: { limit?: number }) => api.get('/host/dashboard/top-products', { params }),
      analytics: () => api.get('/host/analytics')
    },
    orders: {
      list: (params?: { status?: string; page?: number; limit?: number }) =>
        api.get('/host/orders', { params }),
      recent: (params?: { limit?: number; since?: string }) => api.get('/host/orders/recent', { params }),
      detail: (id: string) => api.get(`/host/orders/${id}`),
      updateStatus: (id: string, status: string) => api.patch(`/host/orders/${id}/status`, { status })
    },
    looks: {
      list: (params?: { published?: boolean }) => api.get('/host/looks', { params }),
      detail: (id: string) => api.get(`/host/looks/${id}`),
      create: (data: LookInput) => api.post('/host/looks', data),
      update: (id: string, data: Partial<LookInput>) => api.put(`/host/looks/${id}`, data),
      delete: (id: string) => api.delete(`/host/looks/${id}`),
      togglePublished: (id: string) => api.patch(`/host/looks/${id}/toggle-published`)
    },
    inventory: {
      list: (params?: { search?: string; category?: string }) => api.get('/host/inventory', { params }),
      exportCsv: () => api.get('/merchant/inventory/export', { responseType: 'blob' })
    }
  },
  user: {
    wishlist: {
      get: () => api.get('/user/wishlist'),
      toggle: (data: { type: 'Look' | 'Product' | 'Creator'; id: string }) => api.post('/user/wishlist/toggle', data)
    },
    sizes: {
      get: () => api.get('/user/sizes'),
      save: (sizes: Array<{ brand: string; size: string }>) => api.post('/user/sizes', { sizes })
    },
    returns: {
      get: () => api.get('/user/returns'),
      create: (data: { orderId: string; items: Array<{ productId: string; variantId: string; quantity: number }> }) => api.post('/user/returns', data)
    },
    orders: {
      get: () => api.get('/user/orders')
    }
  }
};
