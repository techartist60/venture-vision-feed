import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    const { AtomLoader } = require('@/components/ui/AtomLoader');
    return <AtomLoader fullScreen size={88} label="Verifying authentication..." />;
  }

  if (!user) {
    // Redirect to auth page with return path
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}