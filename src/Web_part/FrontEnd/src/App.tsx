// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/Login';
import Dashboard from './components/Dashboard';
import Layout from './components/Layout';
import UserManagementPage from './pages/UserManagement';
import NotFoundPage from './pages/Errors/404';
import ForbiddenPage from './pages/Errors/403';
import ServerErrorPage from './pages/Errors/500';
import { useAuth } from './contexts/AuthContext';

// Placeholder for future components - replace with actual components when created
const ProjectsComponent = () => <div className="p-4">Projects Component</div>;
const TeamComponent = () => <div className="p-4">Team Component</div>;
const CalendarComponent = () => <div className="p-4">Calendar Component</div>;
const ReportsComponent = () => <div className="p-4">Reports Component</div>;
const SettingsComponent = () => <div className="p-4">Settings Component</div>;
const HelpComponent = () => <div className="p-4">Help Component</div>;

// Root level authentication checker component
const AuthChecker = () => {
  const { user, loading } = useAuth();
  
  // Show loading while checking authentication
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // If not authenticated, always redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If authenticated, render the child routes
  return <Outlet />;
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    {/* Public routes - accessible without authentication */}
                    <Route path="/login" element={<LoginPage />} />
                    
                    {/* All other routes require authentication */}
                    <Route element={<AuthChecker />}>
                        {/* Dashboard and dashboard related routes */}
                        <Route path="/dashboard" element={<Dashboard />} />
                        
                        <Route path="/dashboard/projects" element={
                            <Layout>
                                <ProjectsComponent />
                            </Layout>
                        } />
                        
                        <Route path="/dashboard/team" element={
                            <Layout>
                                <TeamComponent />
                            </Layout>
                        } />
                        
                        <Route path="/dashboard/calendar" element={
                            <Layout>
                                <CalendarComponent />
                            </Layout>
                        } />
                        
                        <Route path="/dashboard/reports" element={
                            <Layout>
                                <ReportsComponent />
                            </Layout>
                        } />
                        
                        <Route path="/dashboard/settings" element={
                            <Layout>
                                <SettingsComponent />
                            </Layout>
                        } />
                        
                        <Route path="/dashboard/help" element={
                            <Layout>
                                <HelpComponent />
                            </Layout>
                        } />
                        
                        {/* Role-protected routes */}
                        <Route path="/dashboard/users" element={
                            <ProtectedRoute requiredRole={['admin', 'manager']}>
                                <UserManagementPage />
                            </ProtectedRoute>
                        } />
                        
                        <Route path="/admin" element={
                            <ProtectedRoute requiredRole={['admin']}>
                                <div>Admin Panel</div>
                            </ProtectedRoute>
                        } />
                        
                        {/* Error routes */}
                        <Route path="/forbidden" element={<ForbiddenPage />} /> {/* 403 - User authenticated but lacks permission */}
                        <Route path="/server-error" element={<ServerErrorPage />} /> {/* 500 - Server error */}
                        
                        {/* 404 route */}
                        <Route path="*" element={<NotFoundPage />} />
                    </Route>
                    
                    {/* Root path redirect */}
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    
                    {/* Catch any other public route and redirect to login */}
                    <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;