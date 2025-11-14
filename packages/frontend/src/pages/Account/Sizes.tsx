import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { endpoints } from '../../lib/api';

interface SizeEntry {
  brand: string;
  size: string;
}

const SizesPage = (): JSX.Element => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [sizes, setSizes] = useState<SizeEntry[]>([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SizeEntry>();

  const { data: sizesData } = useQuery({
    queryKey: ['user-sizes'],
    queryFn: async () => {
      const response = await endpoints.user.sizes.get();
      return response.data.sizes || [];
    }
  });

  useEffect(() => {
    if (sizesData) {
      setSizes(sizesData);
    }
  }, [sizesData]);

  const saveMutation = useMutation({
    mutationFn: async (sizes: SizeEntry[]) => {
      return endpoints.user.sizes.save(sizes);
    },
    onSuccess: () => {
      toast.success('Maten opgeslagen');
      void queryClient.invalidateQueries({ queryKey: ['user-sizes'] });
    }
  });

  const addSize = (data: SizeEntry): void => {
    setSizes((prev) => [...prev, data]);
    reset();
  };

  const removeSize = (index: number): void => {
    setSizes((prev) => prev.filter((_, i) => i !== index));
  };

  const saveSizes = (): void => {
    saveMutation.mutate(sizes);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-extrabold text-[#1E293B] mb-8">{t('account.sizes')}</h1>
      
      <div className="space-y-6">
        <form onSubmit={handleSubmit(addSize)} className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#1E293B] mb-2">{t('account.brand')}</label>
            <Input
              {...register('brand', { required: true })}
              placeholder="Bijv. Nike"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#1E293B] mb-2">{t('account.size')}</label>
            <Input
              {...register('size', { required: true })}
              placeholder="Bijv. 41 of M"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              {t('common.add')}
            </Button>
          </div>
        </form>

        {sizes.length > 0 && (
          <div className="space-y-3">
            {sizes.map((size, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <div>
                  <p className="font-semibold text-[#1E293B]">{size.brand}</p>
                  <p className="text-sm text-[#64748B]">{size.size}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSize(index)}
                  className="p-2 text-[#64748B] hover:text-red-600 transition"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
            <Button onClick={saveSizes} isLoading={saveMutation.isPending}>
              {t('account.save')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SizesPage;

