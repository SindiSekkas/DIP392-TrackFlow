// Login page component
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { handleError } from '../utils/errorHandling';
import { sanitizeText, sanitizeEmail, validateInput } from '../utils/sanitization';
import { csrfMiddleware } from '../utils/csrfProtection';

export function LoginPage() {
    // State declarations
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();
    const { signIn, loading } = useAuth();

    // Init CSRF protection
    useEffect(() => {
        csrfMiddleware.setupCSRF();
    }, []);

    // Timer cleanup
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Email and password validation
    const validateForm = (): boolean => {
        if (!validateInput(email, 'email')) {
            setError('Please enter a valid email address');
            return false;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return false;
        }
        return true;
    };

    // Form submission handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isSubmitting || loading) return;
        setIsSubmitting(true);
        
        try {
            if (!validateForm()) {
                setIsSubmitting(false);
                return;
            }

            const sanitizedEmail = sanitizeEmail(email);
            const sanitizedPassword = sanitizeText(password);
            
            await signIn(sanitizedEmail, sanitizedPassword);
            navigate('/dashboard');
        } catch (err) {
            const errorResponse = handleError(err);
            setError(errorResponse.message);
        } finally {
            // Debounce to prevent rapid resubmissions
            debounceTimerRef.current = setTimeout(() => {
                setIsSubmitting(false);
            }, 1000);
        }
    };

    return (
        <div className="flex min-h-screen bg-white relative">
            {/* Logo header */}
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center">
                    <img
                        src="/Logo/logo-transparent_notext_blue.png"
                        alt="TrackFlow Logo"
                        className="max-h-full max-w-full object-contain"
                    />
                </div>
                <div className="relative" style={{ userSelect: 'none' }}>
                    <h1 className="font-bold" style={{ 
                        fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', 
                        fontFamily: 'system-ui, sans-serif',
                        background: 'linear-gradient(90deg, #1E40AF 0%, #3B82F6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        TrackFlow
                    </h1>
                </div>
            </div>

            {/* Login form container */}
            <div className="w-full md:w-1/2 lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-10 lg:px-16">
                <div className="w-full max-w-md mx-auto">
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Start your journey</h2>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">Sign In to TrackFlow</h1>
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="mb-4 p-4 rounded bg-red-50 text-red-700">
                            <div className="text-sm">{error}</div>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Email input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                E-mail
                            </label>
                            <div className="relative">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="example@email.com"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Password input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="••••••••"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Submit button */}
                        <div>
                            <button
                                type="submit"
                                disabled={loading || isSubmitting}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {(loading || isSubmitting) ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </div>
                        
                        {/* Help text */}
                        <div className="mt-4 text-center">
                            <p className="text-sm text-gray-600">
                                Forgot password? Please contact your administrator to issue a new password.
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Banner image */}
            <div className="hidden md:block md:w-1/2 lg:w-1/2 relative">
                <div 
                    className="absolute inset-0 w-full h-full bg-center bg-cover"
                    style={{ 
                        backgroundImage: "url('/Logo/pxfuel.jpg')", 
                    }}
                    aria-hidden="true"
                ></div>
            </div>
        </div>
    );
}