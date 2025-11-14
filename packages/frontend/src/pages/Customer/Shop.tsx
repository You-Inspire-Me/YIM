import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';

import ProductCard from '../../components/ProductCard';
import ProductCardSkeleton from '../../components/ProductCardSkeleton';
import Input from '../../components/ui/Input';
import { endpoints } from '../../lib/api';
import { PaginatedProducts } from '../../types';

const categories = ['Alle', 'Schoenen', 'Kleding', 'Accessoires', 'Activewear'];

const ShopPage = (): JSX.Element => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Alle');
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const query: Record<string, unknown> = { page };
    if (search.trim()) {
      query.search = search.trim();
    }
    if (category !== 'Alle') {
      query.category = category;
    }
    return query;
  }, [search, category, page]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const response = await endpoints.products.list(params);
      return response.data as PaginatedProducts;
    }
  });

  const totalPages = data?.pages ?? 1;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Shop</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Zoek op categorie of trefwoord om je volgende favoriete item te vinden.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Zoek op items"
              className="pl-9"
              aria-label="Zoek producten"
            />
          </div>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm transition focus:border-[#0EA5E9] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] dark:border-gray-700 dark:bg-gray-900 md:w-48"
            value={category}
            onChange={(event) => {
              setPage(1);
              setCategory(event.target.value);
            }}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)}
        {!isLoading && data?.items.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-gray-200 p-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Geen producten gevonden. Probeer een andere zoekopdracht.
          </div>
        )}
        {!isLoading && data?.items.map((product) => <ProductCard key={product._id} product={product} />)}
      </div>

      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700"
          >
            Vorige
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Pagina {page} van {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700"
          >
            Volgende
          </button>
        </div>
      )}
    </section>
  );
};

export default ShopPage;
