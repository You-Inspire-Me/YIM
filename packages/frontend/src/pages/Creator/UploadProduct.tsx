import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { endpoints } from '../../lib/api';
import { Product } from '../../types';

const productSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  price: z.coerce.number().positive(),
  category: z.string().min(2),
  inventory: z.coerce.number().int().min(0),
  sizes: z.string().optional(),
  tags: z.string().optional(),
  images: z
    .any()
    .optional()
    .refine((files) => !files || files.length <= 5, 'Maximaal 5 afbeeldingen'),
  isPublished: z.boolean().default(true)
});

type ProductFormValues = z.infer<typeof productSchema>;

const UploadProductPage = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const productId = searchParams.get('id');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      isPublished: true
    }
  });

  const [previews, setPreviews] = useState<string[]>([]);

  const imagesRegister = register('images');

  const productQuery = useQuery({
    queryKey: ['host-product', productId],
    enabled: Boolean(productId),
    queryFn: async () => {
      const response = await endpoints.products.detail(productId!);
      return response.data.product as Product;
    }
  });

  const createMutation = useMutation({
    mutationFn: endpoints.creatorProducts.create,
    onSuccess: () => {
      toast.success('Product aangemaakt');
      void queryClient.invalidateQueries({ queryKey: ['host-products'] });
      navigate('/creator/dashboard');
    },
    onError: () => {
      toast.error('Opslaan mislukt');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof endpoints.creatorProducts.update>[1] }) =>
      endpoints.creatorProducts.update(id, data),
    onSuccess: () => {
      toast.success('Product bijgewerkt');
      void queryClient.invalidateQueries({ queryKey: ['host-products'] });
      navigate('/creator/dashboard');
    },
    onError: () => {
      toast.error('Bijwerken mislukt');
    }
  });

  useEffect(() => {
    if (productQuery.data) {
      const product = productQuery.data;
      reset({
        title: product.title,
        description: product.description,
        price: product.price,
        category: product.category,
        inventory: product.inventory,
        sizes: product.sizes.join(', '),
        tags: product.tags.join(', '),
        isPublished: product.isPublished
      });
      setPreviews(product.images);
    }
  }, [productQuery.data, reset]);

  const images = watch('images');

  useEffect(() => {
    if (!images || images.length === 0) {
      return;
    }
    const nextPreviews = Array.from(images as FileList).map((file) => URL.createObjectURL(file));
    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const onSubmit = (values: ProductFormValues): void => {
    const payload = {
      title: values.title,
      description: values.description,
      price: values.price,
      category: values.category,
      inventory: values.inventory,
      sizes: values.sizes ? values.sizes.split(',').map((size) => size.trim()).filter(Boolean) : [],
      tags: values.tags ? values.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
      isPublished: values.isPublished,
      images: values.images ? Array.from(values.images as FileList) : undefined
    };

    if (productId) {
      updateMutation.mutate({ id: productId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">{productId ? 'Product bewerken' : 'Nieuw product uploaden'}</h1>
          <p className="mt-2 text-sm text-muted">
            Vul de productdetails in en upload hoogwaardige foto’s.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/creator/dashboard')}>
          Terug naar dashboard
        </Button>
      </div>

      <form className="mt-10 space-y-8" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="title">
              Titel
            </label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="category">
              Categorie
            </label>
            <Input id="category" {...register('category')} />
            {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="price">
              Prijs (EUR)
            </label>
            <Input id="price" type="number" step="0.01" {...register('price')} />
            {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="inventory">
              Voorraad
            </label>
            <Input id="inventory" type="number" {...register('inventory')} />
            {errors.inventory && <p className="mt-1 text-sm text-red-500">{errors.inventory.message}</p>}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="description">
            Beschrijving
          </label>
          <Textarea id="description" rows={5} {...register('description')} />
          {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="sizes">
              Maten (comma gescheiden)
            </label>
            <Input id="sizes" placeholder="S, M, L" {...register('sizes')} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="tags">
              Tags (comma gescheiden)
            </label>
            <Input id="tags" placeholder="minimal, zomer" {...register('tags')} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="images">
            Afbeeldingen (max 5)
          </label>
          <input
            id="images"
            type="file"
            accept="image/*"
            multiple
            className="mt-2 w-full rounded-lg border border-dashed border-border bg-accent p-6 text-sm text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-border dark:bg-primary"
            {...imagesRegister}
            onChange={(event) => {
              imagesRegister.onChange(event);
              setValue('images', event.target.files as unknown as FileList, { shouldValidate: true });
            }}
          />
          {errors.images && <p className="mt-1 text-sm text-red-500">{errors.images.message as string}</p>}
          {previews.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4">
              {previews.map((src) => (
                <img key={src} src={src} alt="Preview" className="h-24 w-24 rounded-xl object-cover" />
              ))}
            </div>
          )}
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" {...register('isPublished')} /> Publiceer product direct
        </label>
        <Button type="submit" className="w-full md:w-auto" isLoading={isSubmitting}>
          {productId ? 'Product bijwerken' : 'Product uploaden'}
        </Button>
      </form>
    </section>
  );
};

export default UploadProductPage;
