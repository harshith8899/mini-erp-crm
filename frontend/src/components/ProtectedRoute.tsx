import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function ProtectedRoute() {
  const { token, loading } = useAuth();

  if (loading) return <div className="page-status">Loading…</div>;
  if (!token) return <Navigate to="/login" replace />;

  return <Outlet />;
}
