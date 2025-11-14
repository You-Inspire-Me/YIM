import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
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
}

const LookCreator = (): JSX.Element => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [imageProducts, setImageProducts] = useState<Record<number, TaggedProduct[]>>({});
  const [tags, setTags] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<LookFormData>({
    defaultValues: {
      title: '',
      description: '',
      published: false
    }
  });

  const { data: existingLook, isLoading: isLoadingLook } = useQuery({
    queryKey: ['host-look', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await endpoints.creator.looks.detail(id);
      return response.data.look;
    },
    enabled: !!id
  });

  useEffect(() => {
    if (existingLook) {
      setValue('title', existingLook.title);
      setValue('description', existingLook.description);
      setValue('published', existingLook.published);
      setImages(existingLook.images || []);
      setTags(existingLook.tags || []);
      
      // Group products by image index (simplified - assign all to first image for now)
      // Note: We need to fetch full product details to convert to TaggedProduct format
      // For now, we'll create a simplified version
      const productsByImage: Record<number, TaggedProduct[]> = {};
      if (existingLook.products && existingLook.products.length > 0) {
        productsByImage[0] = existingLook.products.map((p: any) => ({
          productId: p.productId,
          variantId: p.variantId,
          sku: p.variantId || p.productId,
          title: 'Product', // Will be populated from product data
          price: 0,
          image: '',
          positionX: p.positionX,
          positionY: p.positionY
        }));
      }
      setImageProducts(productsByImage);
    }
  }, [existingLook, setValue]);

  const createMutation = useMutation({
    mutationFn: (data: LookInput) => endpoints.creator.looks.create(data),
    onSuccess: () => {
      toast.success('Look aangemaakt!');
      void queryClient.invalidateQueries({ queryKey: ['host-looks'] });
      navigate('/creator/looks');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Aanmaken mislukt';
      const validationErrors = error?.response?.data?.errors;
      if (validationErrors && Array.isArray(validationErrors)) {
        const errorDetails = validationErrors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        toast.error(`Validatiefout: ${errorDetails}`);
      } else {
        toast.error(errorMessage);
      }
      console.error('Create look error:', error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: LookInput) => endpoints.creator.looks.update(id!, data),
    onSuccess: () => {
      toast.success('Look bijgewerkt!');
      void queryClient.invalidateQueries({ queryKey: ['host-looks'] });
      navigate('/creator/looks');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Bijwerken mislukt';
      const validationErrors = error?.response?.data?.errors;
      if (validationErrors && Array.isArray(validationErrors)) {
        const errorDetails = validationErrors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        toast.error(`Validatiefout: ${errorDetails}`);
      } else {
        toast.error(errorMessage);
      }
      console.error('Update look error:', error);
    }
  });

  const onSubmit = (formData: LookFormData): void => {
    if (images.length === 0) {
      toast.error('Upload minimaal één afbeelding');
      setStep(1);
      return;
    }

    // Combine all products from all images and convert TaggedProduct to LookInput format
    const allProducts: LookInput['products'] = [];
    Object.values(imageProducts).forEach((taggedProducts) => {
      taggedProducts.forEach((tagged) => {
        if (tagged.variantId) {
          allProducts.push({
            productId: tagged.productId,
            variantId: tagged.variantId,
            positionX: tagged.positionX,
            positionY: tagged.positionY
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
      published: formData.published
    };

    if (id) {
      updateMutation.mutate(lookData);
    } else {
      createMutation.mutate(lookData);
    }
  };

  const handleProductAdd = (imageIndex: number, product: TaggedProduct): void => {
    setImageProducts((prev) => ({
      ...prev,
      [imageIndex]: [...(prev[imageIndex] || []), product]
    }));
  };

  const handleProductRemove = (imageIndex: number, productIndex: number): void => {
    setImageProducts((prev) => ({
      ...prev,
      [imageIndex]: (prev[imageIndex] || []).filter((_, i) => i !== productIndex)
    }));
  };

  if (isLoadingLook) {
    return <div className="flex items-center justify-center p-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">{id ? 'Look bewerken' : 'Nieuwe Look'}</h1>
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
        {/* Step 1: Basic Info & Images */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-black dark:text-secondary">Titel *</label>
              <Input
                {...register('title', { required: 'Titel is verplicht' })}
                className="mt-1"
                placeholder="Bijv. Zomer Outfit 2024"
              />
              {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-secondary">Beschrijving *</label>
              <Textarea
                {...register('description', { required: 'Beschrijving is verplicht' })}
                className="mt-1"
                rows={4}
                placeholder="Beschrijf deze look..."
              />
              {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-secondary">Afbeeldingen *</label>
              <ImageUploaderWithReorder images={images} onImagesChange={setImages} maxImages={10} />
            </div>

            <TagSelector tags={tags} onTagsChange={setTags} />

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

        {/* Step 2+: Tag products for each image */}
        {step > 1 && step <= 1 + images.length && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Tag producten in afbeelding {step - 1}</h2>
              <p className="mt-1 text-sm text-muted dark:text-muted">
                Klik op de afbeelding om producten toe te voegen
              </p>
            </div>

            <ProductTagger
              imageUrl={images[step - 2]}
              taggedProducts={imageProducts[step - 2] || []}
              onProductAdd={(product) => handleProductAdd(step - 2, product)}
              onProductRemove={(index) => handleProductRemove(step - 2, index)}
            />

            <div className="flex justify-between">
              <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
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
                      void handleSubmit(onSubmit)();
                    }}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Opslaan als concept
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setValue('published', true);
                      void handleSubmit(onSubmit)();
                    }}
                    disabled={createMutation.isPending || updateMutation.isPending}
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

