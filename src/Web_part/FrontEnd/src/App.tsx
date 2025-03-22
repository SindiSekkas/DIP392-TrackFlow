// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ColumnSettingsProvider } from './contexts/ColumnSettingsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/Login';
import { useAuth } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import Layout from './components/Layout';
import UserManagementPage from './pages/UserManagement';
import NotFoundPage from './pages/Errors/404';
import ForbiddenPage from './pages/Errors/403';
import ServerErrorPage from './pages/Errors/500';
import ProjectsPage from './pages/Projects/ProjectsPage';
import ProjectDetailsPage from './pages/Projects/ProjectDetailsPage';
import CreateProjectPage from './pages/Projects/CreateProjectPage';
import EditProjectPage from './pages/Projects/EditProjectPage';
import AssembliesPage from './pages/Assemblies/AssembliesPage';
import AssemblyDetailsPage from './pages/Assemblies/AssemblyDetailsPage';
import CreateAssemblyPage from './pages/Assemblies/CreateAssemblyPage';
import EditAssemblyPage from './pages/Assemblies/EditAssemblyPage';
import CreateMultipleAssembliesPage from './pages/Assemblies/CreateMultipleAssembliesPage';
import ClientsPage from './pages/Clients/ClientsPage';
import ClientDetailsPage from './pages/Clients/ClientDetailsPage';
import CreateClientPage from './pages/Clients/CreateClientPage';
import EditClientPage from './pages/Clients/EditClientPage';
import NFCCardManagement from './pages/NFCCards/NFCCardManagement';
import BarcodeManagementPage from './pages/Assemblies/BarcodeManagementPage';

// Placeholder for future components - replace with actual components when created
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
                <ColumnSettingsProvider>
                    <Routes>
                        {/* Public routes - accessible without authentication */}
                        <Route path="/login" element={<LoginPage />} />
                        
                        {/* All other routes require authentication */}
                        <Route element={<AuthChecker />}>
                            {/* Dashboard and dashboard related routes */}
                            <Route path="/dashboard" element={<Dashboard />} />
                            
                            <Route path="/dashboard/projects" element={
                                <Layout>
                                    <ProjectsPage />
                                </Layout>
                            } />
                            
                            <Route path="/dashboard/projects/create" element={
                                <Layout>
                                    <CreateProjectPage />
                                </Layout>
                            } />

                            <Route path="/dashboard/projects/:id" element={
                                <Layout>
                                    <ProjectDetailsPage />
                                </Layout>
                            } />

                            <Route path="/dashboard/projects/:id/edit" element={
                                <Layout>
                                    <EditProjectPage />
                                </Layout>
                            } />
                            
                            <Route path="/dashboard/assemblies" element={
                                <Layout>
                                    <AssembliesPage />
                                </Layout>
                            } />

                            <Route path="/dashboard/assemblies/upload" element={
                                <Layout>
                                    <CreateMultipleAssembliesPage />
                                </Layout>
                            } />

                            <Route path="/dashboard/assemblies/create-multiple" element={
                                <Layout>
                                    <CreateMultipleAssembliesPage />
                                </Layout>
                            } />
                            
                            <Route path="/dashboard/assemblies/create" element={
                                <Layout>
                                    <CreateAssemblyPage />
                                </Layout>
                            } />

                            <Route path="/dashboard/assemblies/:id" element={
                                <Layout>
                                    <AssemblyDetailsPage />
                                </Layout>
                            } />

                            <Route path="/dashboard/assemblies/:id/edit" element={
                                <Layout>
                                    <EditAssemblyPage />
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
                            
                            {/* Client routes */}
                            <Route path="/dashboard/clients" element={
                                <Layout>
                                    <ClientsPage />
                                </Layout>
                            } />

                            <Route path="/dashboard/clients/create" element={
                                <Layout>
                                    <CreateClientPage />
                                </Layout>
                            } />

                            <Route path="/dashboard/clients/:id" element={
                                <Layout>
                                    <ClientDetailsPage />
                                </Layout>
                            } />

                            <Route path="/dashboard/clients/:id/edit" element={
                                <Layout>
                                    <EditClientPage />
                                </Layout>
                            } />
                            
                            {/* Role-protected routes */}
                            <Route path="/dashboard/users" element={
                                <ProtectedRoute requiredRole={['admin', 'manager']}>
                                    <UserManagementPage />
                                </ProtectedRoute>
                            } />
                            
                            <Route path="/dashboard/nfc-cards" element={
                                <ProtectedRoute requiredRole={['admin', 'manager']}>
                                    <NFCCardManagement />
                                </ProtectedRoute>
                            } />

                            <Route path="/dashboard/barcodes" element={
                                <Layout>
                                    <BarcodeManagementPage />
                                </Layout>
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
                </ColumnSettingsProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;