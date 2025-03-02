// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AppError } from '../utils/errorHandling';
import { logError } from '../utils/errorHandling';
import { userApi } from '../lib/apiClient'; // Import our new API client

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    createUser: (email: string, password: string, metadata: any) => Promise<{user: any, temporaryPassword?: string} | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Getting initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        }).catch(error => {
            logError(error, { context: 'Initial session load' });
            setLoading(false);
        });

        // Listening for changes of auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw new AppError('AUTH', error.message, error.status?.toString());
            }
        } catch (error) {
            logError(error, { context: 'Sign in', email });
            throw error;
        }
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                throw new AppError('AUTH', error.message, error.status?.toString());
            }
        } catch (error) {
            logError(error, { context: 'Sign out' });
            throw error;
        }
    };
    
    const createUser = async (email: string, password: string, metadata: any) => {
        try {
            // Instead of using Supabase admin directly, use our API client
            const userData = {
                email,
                fullName: metadata.full_name,
                role: metadata.role,
                workerType: metadata.worker_type,
                // Pass password only if it was provided
                ...(password ? { password } : {})
            };
            
            const token = session?.access_token;
            
            // Call our backend API
            const response = await userApi.createUser(userData , token);
            
            return {
                user: response.data.user,
                temporaryPassword: response.data.temporaryPassword
            };
        } catch (error) {
            logError(error, { context: 'Create user', email });
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signIn, signOut, createUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}