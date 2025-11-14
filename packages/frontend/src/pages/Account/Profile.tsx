import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { endpoints } from '../../lib/api';

const ProfilePage = (): JSX.Element => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const { data: user } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await endpoints.auth.current();
      return response.data.user;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // TODO: Implement update profile endpoint
      return Promise.resolve(data);
    },
    onSuccess: () => {
      toast.success('Profiel bijgewerkt');
      void queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    }
  });

  const onSubmit = (data: any): void => {
    updateMutation.mutate(data);
  };

  if (!user) {
    return <div className="p-12 text-center">{t('common.loading')}</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-extrabold text-black mb-8">{t('account.profile')}</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-black mb-2">Naam</label>
          <Input
            defaultValue={user.name}
            {...register('name', { required: true })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Email</label>
          <Input
            type="email"
            defaultValue={user.email}
            {...register('email', { required: true })}
          />
        </div>

        <Button type="submit" isLoading={updateMutation.isPending}>
          {t('account.save')}
        </Button>
      </form>
    </div>
  );
};

export default ProfilePage;

