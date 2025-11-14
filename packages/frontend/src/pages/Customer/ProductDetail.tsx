import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { useCart } from '../../context/CartContext';
import { endpoints } from '../../lib/api';
import { Product } from '../../types';

const ProductDetailPage = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const [selectedImage, setSelectedImage] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await endpoints.products.detail(id!);
      return response.data.product as Product;
    }
  });

  if (isLoading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2">
          <Skeleton className="aspect-[4/5] w-full" />
          <div className="space-y-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Product niet gevonden.
        </div>
      </section>
    );
  }

  const handleAddToCart = (): void => {
    addItem({
      productId: data._id,
      title: data.title,
      price: data.price,
      image: data.images[0],
      quantity: 1
    });
    toast.success('Toegevoegd aan winkelwagen');
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800">
            <img src={data.images[selectedImage]} alt={data.title} className="h-full w-full object-cover" />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {data.images.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setSelectedImage(index)}
                className={`overflow-hidden rounded-xl border ${
                  selectedImage === index
                    ? 'border-[#0EA5E9]'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <img src={image} alt={`${data.title} ${index + 1}`} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-400">{data.category}</p>
            <h1 className="mt-2 text-3xl font-bold">{data.title}</h1>
            <p className="mt-4 text-gray-600 dark:text-gray-300">{data.description}</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-[#0EA5E9]">€ {data.price.toFixed(2)}</p>
            <p className="mt-1 text-sm text-gray-500">
              {data.inventory > 0 ? `${data.inventory} op voorraad` : 'Niet op voorraad'}
            </p>
          </div>
          {data.sizes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Beschikbare maten
              </h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {data.sizes.map((size) => (
                  <span
                    key={size}
                    className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wider dark:border-gray-700"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>
          )}
          <Button onClick={handleAddToCart} disabled={data.inventory === 0} className="w-full">
            Voeg toe aan winkelwagen
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProductDetailPage;
