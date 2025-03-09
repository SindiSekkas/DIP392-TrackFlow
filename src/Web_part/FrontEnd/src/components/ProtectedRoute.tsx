// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: string[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { user } = useAuth();

    // If specific role is required and user doesn't have it
    if (requiredRole && user?.user_metadata?.role && !requiredRole.includes(user.user_metadata.role)) {
        // Redirect to 403 Forbidden page
        return <Navigate to="/forbidden" />;
    }

    // If role check passes, render the protected content
    return <>{children}</>; 
}