import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import ImageUploaderWithReorder from '../../components/looks/ImageUploaderWithReorder';
import ProductTagger from '../../components/looks/ProductTagger';
import TagSelector from '../../components/looks/TagSelector';
import { endpoints, LookInput } from '../../lib/api';

interface TaggedProduct {
  productId: string;
  variantId?: string;
  sku: string;
  title: string;
  price: number;
  image: string;
  positionX?: number;
  positionY?: number;
}

interface LookFormData {
  title: string;
  description: string;
  published: boolean;
  category: 'dames' | 'heren' | 'kinderen' | 'all';
}

const LookCreator = (): JSX.Element => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [imageProducts, setImageProducts] = useState<Record<number, TaggedProduct[]>>({});
  const [tags, setTags] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<LookFormData>({
    defaultValues: {
      title: '',
      description: '',
      published: false,
      category: 'all'
    }
  });

  // -------------------------------------------------
  // 🔍 Fetch existing look
  // -------------------------------------------------
  const lookQuery = useQuery({
    queryKey: ['host-look', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await endpoints.creator.looks.detail(id);
      return response.data.look;
    },
    enabled: !!id
  });

  const existingLook = lookQuery.data;

  // -------------------------------------------------
  // 🛠 Sync fetched look into form + state
  // -------------------------------------------------
  useEffect(() => {
    if (!existingLook) return;
  
    // ✅ Veilig instellen van strings met fallback
    setValue('title', existingLook.title ?? '');
    setValue('description', existingLook.description ?? '');
    setValue('published', existingLook.published ?? false);
  
    // ✅ Category: altijd geldige string
    const validCategories = ['dames', 'heren', 'kinderen', 'all'] as const;
    const category = (existingLook.category ?? 'all') as 'dames' | 'heren' | 'kinderen' | 'all';
    setValue('category', validCategories.includes(category) ? category : 'all');
  
    // Afbeeldingen en tags
    setImages(existingLook.images ?? []);
    setTags(existingLook.tags ?? []);
  
    // Producten per afbeelding
    const productsByImage: Record<number, TaggedProduct[]> = {};
  
    if (existingLook.products?.length) {
      existingLook.products.forEach((p: any) => {
        const idx = p.imageIndex ?? 0;
        if (!productsByImage[idx]) productsByImage[idx] = [];
        productsByImage[idx].push({
          productId: p.productId,
          variantId: p.variantId,
          sku: p.variantId ?? p.productId,
          title: p.title ?? 'Product',
          price: p.price ?? 0,
          image: p.image ?? '',
          positionX: p.positionX,
          positionY: p.positionY
        });
      });
    }
  
    setImageProducts(productsByImage);
  }, [existingLook, setValue]);
  
  // -------------------------------------------------
  // 📌 Mutations
  // -------------------------------------------------
  const createMutation = useMutation({
    mutationFn: (data: LookInput) => endpoints.creator.looks.create(data),
    onSuccess: () => {
      toast.success('Look aangemaakt!');
      queryClient.invalidateQueries({ queryKey: ['host-looks'] });
      queryClient.invalidateQueries({ queryKey: ['public-looks'] });
      navigate('/creator/looks');
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Aanmaken mislukt';
      toast.error(msg);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: LookInput) => endpoints.creator.looks.update(id!, data),
    onSuccess: () => {
      toast.success('Look bijgewerkt!');
      queryClient.invalidateQueries({ queryKey: ['host-looks'] });
      queryClient.invalidateQueries({ queryKey: ['public-looks'] });
      queryClient.invalidateQueries({ queryKey: ['public-look', id] });
      navigate('/creator/looks');
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Bijwerken mislukt';
      toast.error(msg);
    }
  });

  // -------------------------------------------------
  // 📤 Submit
  // -------------------------------------------------
  const onSubmit = (formData: LookFormData): void => {
    if (images.length === 0) {
      toast.error('Upload minimaal één afbeelding');
      setStep(1);
      return;
    }

    const allProducts: LookInput['products'] = [];

    Object.values(imageProducts).forEach((taggedList) => {
      taggedList.forEach((p) => {
        // Only include products with a variantId (required by API)
        if (p.variantId) {
          allProducts.push({
            productId: p.productId,
            variantId: p.variantId,
            positionX: p.positionX,
            positionY: p.positionY
          });
        }
      });
    });

    const lookData: LookInput = {
      title: formData.title,
      description: formData.description,
      images,
      products: allProducts,
      tags,
      published: formData.published,
      category: formData.category
    };

    if (id) updateMutation.mutate(lookData);
    else createMutation.mutate(lookData);
  };

  // -------------------------------------------------
  // UI helpers
  // -------------------------------------------------
  const handleProductAdd = (imgIndex: number, product: TaggedProduct): void => {
    setImageProducts((prev) => ({
      ...prev,
      [imgIndex]: [...(prev[imgIndex] || []), product]
    }));
  };

  const handleProductRemove = (imgIndex: number, productIndex: number): void => {
    setImageProducts((prev) => ({
      ...prev,
      [imgIndex]: (prev[imgIndex] || []).filter((_, i) => i !== productIndex)
    }));
  };

  if (lookQuery.isLoading) {
    return <div className="flex items-center justify-center p-12">Loading...</div>;
  }

  // -------------------------------------------------
  // Render
  // -------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">
            {id ? 'Look bewerken' : 'Nieuwe Look'}
          </h1>
          <p className="mt-2 text-sm text-muted dark:text-muted">
            Stap {step} van {images.length > 0 ? 2 + images.length : 2}
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/creator/looks')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Annuleren
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium">Titel *</label>
              <Input
                {...register('title', { required: 'Titel is verplicht' })}
                placeholder="Bijv. Zomer Outfit 2024"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">Beschrijving *</label>
              <Textarea
                {...register('description', { required: 'Beschrijving is verplicht' })}
                rows={4}
                placeholder="Beschrijf deze look..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Afbeeldingen *</label>
              <ImageUploaderWithReorder
                images={images}
                onImagesChange={setImages}
                maxImages={10}
              />
            </div>

            <TagSelector tags={tags} onTagsChange={setTags} />

            <div>
              <label className="block text-sm font-medium mb-2">Categorie *</label>
              <Select {...register('category', { required: 'Categorie is verplicht' })}>
                <option value="all">Alle categorieën</option>
                <option value="dames">Dames</option>
                <option value="heren">Heren</option>
                <option value="kinderen">Kinderen</option>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => images.length > 0 && setStep(2)}
                disabled={images.length === 0}
              >
                Volgende: Tag producten
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step > 1 && step <= 1 + images.length && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">
              Tag producten in afbeelding {step - 1}
            </h2>

            <ProductTagger
              imageUrl={images[step - 2]}
              taggedProducts={imageProducts[step - 2] || []}
              onProductAdd={(p) => handleProductAdd(step - 2, p)}
              onProductRemove={(i) => handleProductRemove(step - 2, i)}
            />

            <div className="flex justify-between">
              <Button variant="secondary" type="button" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Vorige
              </Button>

              {step < 1 + images.length ? (
                <Button type="button" onClick={() => setStep(step + 1)}>
                  Volgende afbeelding
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <div className="space-x-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setValue('published', false);
                      handleSubmit(onSubmit)();
                    }}
                  >
                    Opslaan als concept
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      setValue('published', true);
                      handleSubmit(onSubmit)();
                    }}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Publiceren
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default LookCreator;
