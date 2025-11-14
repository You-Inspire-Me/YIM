import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';

const profileSchema = z.object({
  storeName: z.string().min(2),
  description: z.string().min(10),
  openingHours: z.string().optional(),
  instagram: z.string().url().optional().or(z.literal('')),
  tiktok: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal(''))
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const ProfilePage = (): JSX.Element => {
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      storeName: '',
      description: '',
      openingHours: '',
      instagram: '',
      tiktok: '',
      website: ''
    }
  });

  const onSubmit = async (values: ProfileFormValues): Promise<void> => {
    try {
      // TODO: Implement API call to update store profile
      toast.success('Winkelprofiel bijgewerkt');
    } catch (error) {
      toast.error('Bijwerken mislukt');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Winkelprofiel</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Pas je winkelgegevens en branding aan
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold">Banner & Logo</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Banner afbeelding</label>
              <input
                type="file"
                accept="image/*"
                className="w-full rounded-lg border border-gray-200 p-2 text-sm dark:border-gray-700"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setBannerPreview(URL.createObjectURL(file));
                  }
                }}
              />
              {bannerPreview && (
                <img src={bannerPreview} alt="Banner preview" className="mt-4 h-32 w-full rounded-lg object-cover" />
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Logo</label>
              <input
                type="file"
                accept="image/*"
                className="w-full rounded-lg border border-gray-200 p-2 text-sm dark:border-gray-700"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoPreview(URL.createObjectURL(file));
                  }
                }}
              />
              {logoPreview && (
                <img src={logoPreview} alt="Logo preview" className="mt-4 h-32 w-32 rounded-lg object-cover" />
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold">Basisinformatie</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="storeName" className="mb-2 block text-sm font-medium">
                Winkennaam
              </label>
              <Input id="storeName" {...register('storeName')} />
              {errors.storeName && (
                <p className="mt-1 text-sm text-red-500">{errors.storeName.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="description" className="mb-2 block text-sm font-medium">
                Beschrijving
              </label>
              <Textarea id="description" rows={5} {...register('description')} />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="openingHours" className="mb-2 block text-sm font-medium">
                Openingstijden
              </label>
              <Input id="openingHours" placeholder="Ma-Vr: 9:00-18:00" {...register('openingHours')} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold">Sociale media</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="instagram" className="mb-2 block text-sm font-medium">
                Instagram URL
              </label>
              <Input id="instagram" type="url" placeholder="https://instagram.com/..." {...register('instagram')} />
            </div>
            <div>
              <label htmlFor="tiktok" className="mb-2 block text-sm font-medium">
                TikTok URL
              </label>
              <Input id="tiktok" type="url" placeholder="https://tiktok.com/..." {...register('tiktok')} />
            </div>
            <div>
              <label htmlFor="website" className="mb-2 block text-sm font-medium">
                Website URL
              </label>
              <Input id="website" type="url" placeholder="https://..." {...register('website')} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" isLoading={isSubmitting}>
            Opslaan
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;

