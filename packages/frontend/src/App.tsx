import { Navigate, Route, Routes } from 'react-router-dom';

import CustomerLayout from './components/CustomerLayout';
import CreatorLayout from './components/CreatorLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import CartPage from './pages/Customer/Cart';
import HomePage from './pages/Customer/Home';
import LookDetail from './pages/Customer/LookDetail';
import ProductDetailPage from './pages/Customer/ProductDetail';
import ShopPage from './pages/Customer/Shop';
import AccountProfilePage from './pages/Account/Profile';
import AccountOrdersPage from './pages/Account/Orders';
import SizesPage from './pages/Account/Sizes';
import WishlistPage from './pages/Account/Wishlist';
import AnalyticsPage from './pages/Creator/Analytics';
import DashboardHome from './pages/Creator/DashboardHome';
import InventoryPage from './pages/Creator/Inventory';
import LookCreator from './pages/Creator/LookCreator';
import LooksPage from './pages/Looks';
import CreatorLooksPage from './pages/Creator/Looks';
import CreatorOrdersPage from './pages/Creator/Orders';
import ProductsPage from './pages/Creator/Products';
import CreatorProfilePage from './pages/Creator/Profile';
import SettingsPage from './pages/Creator/Settings';
import UploadProductPage from './pages/Creator/UploadProduct';
import LoginPage from './pages/Auth/Login';
import RegisterPage from './pages/Auth/Register';

const App = (): JSX.Element => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Customer routes - accessible to everyone */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/looks" element={<LooksPage />} />
        <Route path="/looks/:id" element={<LookDetail />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/dames" element={<ShopPage />} />
        <Route path="/heren" element={<ShopPage />} />
        <Route path="/kinderen" element={<ShopPage />} />
        <Route
          path="/auth/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/auth/register"
          element={user ? <Navigate to="/" replace /> : <RegisterPage />}
        />
        {/* Account routes - protected */}
        <Route
          path="/account/profile"
          element={
            <ProtectedRoute allowedRoles={['customer', 'host', 'creator']}>
              <AccountProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/orders"
          element={
            <ProtectedRoute allowedRoles={['customer', 'host', 'creator']}>
              <AccountOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/sizes"
          element={
            <ProtectedRoute allowedRoles={['customer', 'host', 'creator']}>
              <SizesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/wishlist"
          element={
            <ProtectedRoute allowedRoles={['customer', 'host', 'creator']}>
              <WishlistPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Creator routes - protected, only accessible to creators (host role is legacy) */}
      <Route
        path="/creator"
        element={
          <ProtectedRoute allowedRoles={['host', 'creator']}>
            <CreatorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="looks" element={<CreatorLooksPage />} />
        <Route path="looks/create" element={<LookCreator />} />
        <Route path="looks/edit/:id" element={<LookCreator />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<CreatorOrdersPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="profile" element={<CreatorProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="upload" element={<UploadProductPage />} />
      </Route>

      {/* Legacy host routes - redirect to creator */}
      <Route path="/creator/*" element={<Navigate to="/creator" replace />} />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
