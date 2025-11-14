import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Footer from './Footer';
import Header from './Header';

const CustomerLayout = (): JSX.Element => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-white transition-colors duration-200 dark:bg-gray-950">
      <Header />
      <main className="flex-1" key={location.pathname}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default CustomerLayout;

