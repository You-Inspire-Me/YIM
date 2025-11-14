import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, Location } from 'react-router-dom';
import { z } from 'zod';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';

const loginSchema = z.object({
  email: z.string().email({ message: 'Voer een geldig e-mailadres in' }),
  password: z.string().min(8, { message: 'Minimaal 8 tekens' })
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = (): JSX.Element => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: Location } };
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    try {
      await login(values);
    } catch {
      return;
    }
    const redirectTo = location.state?.from?.pathname ?? '/';
    navigate(redirectTo, { replace: true });
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-between gap-12 px-4 py-12">
      <div className="hidden flex-1 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 p-10 text-white shadow-elevated md:block">
        <h2 className="text-3xl font-extrabold">Welkom terug bij YIM</h2>
        <p className="mt-4 text-sm text-white/80">
          Ontdek exclusieve collecties, beheer je bestellingen en blijf op de hoogte van de laatste trends.
        </p>
      </div>
      <div className="flex-1 rounded-3xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold">Log in</h1>
        <p className="mt-2 text-sm text-gray-500">
          Nog geen account?{' '}
          <Link to="/auth/register" className="font-semibold text-[#0EA5E9]">
            Registreer je hier
          </Link>
        </p>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              E-mailadres
            </label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Wachtwoord
            </label>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Inloggen
          </Button>
        </form>
      </div>
    </section>
  );
};

export default LoginPage;
