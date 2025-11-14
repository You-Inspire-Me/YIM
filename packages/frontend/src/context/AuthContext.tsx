import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { endpoints, LoginPayload, RegisterPayload } from '../lib/api';

export type UserRole = 'customer' | 'host' | 'creator';

export interface User {
  _id: string;
  name?: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (): Promise<void> => {
    try {
      const { data } = await endpoints.auth.current();
      setUser(data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchCurrentUser();
  }, []);

  const login = async (payload: LoginPayload): Promise<void> => {
    setIsLoading(true);
    try {
      const { data } = await endpoints.auth.login(payload);
      setUser(data.user);
      toast.success('Welkom terug!');
    } catch (error) {
      toast.error('Inloggen mislukt. Controleer je gegevens.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload): Promise<void> => {
    setIsLoading(true);
    try {
      const { data } = await endpoints.auth.register(payload);
      setUser(data.user);
      toast.success('Account aangemaakt!');
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Registratie mislukt. Probeer het opnieuw.';
      console.error('Registration error:', error);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await endpoints.auth.logout();
      setUser(null);
      toast.success('Je bent uitgelogd.');
    } catch (error) {
      toast.error('Uitloggen mislukt.');
      throw error;
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      refresh: fetchCurrentUser
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
