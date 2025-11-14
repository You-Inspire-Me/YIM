import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Wachtwoorden komen niet overeen',
    path: ['confirmPassword']
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const SettingsPage = (): JSX.Element => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [orderNotifications, setOrderNotifications] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema)
  });

  const onSubmitPassword = async (values: PasswordFormValues): Promise<void> => {
    try {
      // TODO: Implement API call to change password
      toast.success('Wachtwoord gewijzigd');
      reset();
    } catch (error) {
      toast.error('Wachtwoord wijzigen mislukt');
    }
  };

  const handleExportCSV = (): void => {
    // TODO: Implement CSV export
    toast.success('CSV export gestart');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Instellingen</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Beheer je accountinstellingen en voorkeuren
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold">Wachtwoord wijzigen</h2>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmitPassword)}>
          <div>
            <label htmlFor="currentPassword" className="mb-2 block text-sm font-medium">
              Huidig wachtwoord
            </label>
            <Input id="currentPassword" type="password" {...register('currentPassword')} />
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-500">{errors.currentPassword.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="newPassword" className="mb-2 block text-sm font-medium">
              Nieuw wachtwoord
            </label>
            <Input id="newPassword" type="password" {...register('newPassword')} />
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-500">{errors.newPassword.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">
              Bevestig nieuw wachtwoord
            </label>
            <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" isLoading={isSubmitting}>
            Wachtwoord wijzigen
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold">Notificaties</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium">E-mail notificaties</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ontvang updates via e-mail
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-[#0EA5E9] focus:ring-[#0EA5E9]"
            />
          </label>
          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium">Nieuwe bestelling notificaties</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Krijg een melding bij nieuwe bestellingen
              </p>
            </div>
            <input
              type="checkbox"
              checked={orderNotifications}
              onChange={(e) => setOrderNotifications(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-[#0EA5E9] focus:ring-[#0EA5E9]"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold">Data export</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Exporteer je producten als CSV-bestand
        </p>
        <Button variant="secondary" onClick={handleExportCSV} className="inline-flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exporteer producten CSV
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;

