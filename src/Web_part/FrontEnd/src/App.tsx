// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/Login';
import Dashboard from './components/Dashboard';
import Layout from './components/Layout';
import UserManagementPage from './pages/UserManagement';

// Placeholder for future components - replace with actual components when created
const ProjectsComponent = () => <div className="p-4">Projects Component</div>;
const TeamComponent = () => <div className="p-4">Team Component</div>;
const CalendarComponent = () => <div className="p-4">Calendar Component</div>;
const ReportsComponent = () => <div className="p-4">Reports Component</div>;
const SettingsComponent = () => <div className="p-4">Settings Component</div>;
const HelpComponent = () => <div className="p-4">Help Component</div>;

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    
                    {/* Protected dashboard routes */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } />
                    
                    {/* Additional routes for dashboard components */}
                    <Route path="/dashboard/projects" element={
                        <ProtectedRoute>
                            <Layout>
                                <ProjectsComponent />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/dashboard/team" element={
                        <ProtectedRoute>
                            <Layout>
                                <TeamComponent />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/dashboard/calendar" element={
                        <ProtectedRoute>
                            <Layout>
                                <CalendarComponent />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/dashboard/reports" element={
                        <ProtectedRoute>
                            <Layout>
                                <ReportsComponent />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/dashboard/settings" element={
                        <ProtectedRoute>
                            <Layout>
                                <SettingsComponent />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/dashboard/help" element={
                        <ProtectedRoute>
                            <Layout>
                                <HelpComponent />
                            </Layout>
                        </ProtectedRoute>
                    } />
                    
                    {/* User Management route with role requirement */}
                    <Route path="/dashboard/users" element={
                        <ProtectedRoute requiredRole={['admin', 'manager']}>
                            <UserManagementPage />
                        </ProtectedRoute>
                    } />
                    
                    {/* Admin route with role requirement */}
                    <Route path="/admin" element={
                        <ProtectedRoute requiredRole={['admin']}>
                            <div>Admin Panel</div>
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    <Route path="/unauthorized" element={<div>Access Denied</div>} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;