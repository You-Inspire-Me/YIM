import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';

const registerSchema = z
  .object({
    name: z.string().min(2, { message: 'Naam is verplicht' }),
    email: z.string().email({ message: 'Voer een geldig e-mailadres in' }),
    password: z.string().min(8, { message: 'Minimaal 8 tekens' }),
    confirmPassword: z.string().min(8),
    role: z.enum(['customer', 'host', 'creator'])
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Wachtwoorden komen niet overeen'
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage = (): JSX.Element => {
  const { register: registerUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'customer'
    }
  });

  const onSubmit = async ({ confirmPassword, ...values }: RegisterFormValues): Promise<void> => {
    try {
      await registerUser(values);
    } catch {
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-between gap-12 px-4 py-12">
      <div className="flex-1 rounded-3xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold">Maak een account</h1>
        <p className="mt-2 text-sm text-gray-500">
          Al een account?{' '}
          <Link to="/auth/login" className="font-semibold text-[#0EA5E9]">
            Log in
          </Link>
        </p>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Naam
            </label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              E-mailadres
            </label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Wachtwoord
              </label>
              <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium">
                Bevestig wachtwoord
              </label>
              <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium">
              Accounttype
            </label>
            <Select id="role" {...register('role')}>
              <option value="customer">Klant</option>
              <option value="creator">Creator</option>
              <option value="host">Host (legacy)</option>
            </Select>
            {errors.role && <p className="mt-1 text-sm text-red-500">{errors.role.message}</p>}
          </div>
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Registreren
          </Button>
        </form>
      </div>
      <div className="hidden flex-1 rounded-3xl bg-gradient-to-br from-gray-900 to-primary-600 p-10 text-white shadow-elevated md:block">
        <h2 className="text-3xl font-extrabold">Verkoop of koop met vertrouwen</h2>
        <p className="mt-4 text-sm text-white/80">
          Word onderdeel van onze community en beheer eenvoudig je collectie of je favoriete items.
        </p>
      </div>
    </section>
  );
};

export default RegisterPage;
