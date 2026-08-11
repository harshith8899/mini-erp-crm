import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import CustomerListPage from './pages/CustomerListPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import CustomerFormPage from './pages/CustomerFormPage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProductFormPage from './pages/ProductFormPage';
import WarehouseListPage from './pages/WarehouseListPage';
import WarehouseDetailPage from './pages/WarehouseDetailPage';
import WarehouseFormPage from './pages/WarehouseFormPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/customers" replace />} />
            <Route path="/customers" element={<CustomerListPage />} />
            <Route path="/customers/new" element={<CustomerFormPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/new" element={<ProductFormPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/products/:id/edit" element={<ProductFormPage />} />
            <Route path="/warehouses" element={<WarehouseListPage />} />
            <Route path="/warehouses/new" element={<WarehouseFormPage />} />
            <Route path="/warehouses/:id" element={<WarehouseDetailPage />} />
            <Route path="/warehouses/:id/edit" element={<WarehouseFormPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/customers" replace />} />
      </Routes>
    </AuthProvider>
  );
}
