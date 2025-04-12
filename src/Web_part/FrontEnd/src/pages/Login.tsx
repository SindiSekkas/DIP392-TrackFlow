// src/pages/Login.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { handleError } from '../utils/errorHandling';
import { sanitizeText, sanitizeEmail, validateInput } from '../utils/sanitization';
import { csrfMiddleware } from '../utils/csrfProtection';
import logo from '../../Logo/logo-transparent_notext_Navi.png';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { signIn, loading } = useAuth();

    // Setup CSRF protection
    useEffect(() => {
        csrfMiddleware.setupCSRF();
    }, []);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!validateForm()) return;

            const sanitizedEmail = sanitizeEmail(email);
            const sanitizedPassword = sanitizeText(password);
            
            await signIn(sanitizedEmail, sanitizedPassword);
            navigate('/dashboard');
        } catch (err) {
            const errorResponse = handleError(err);
            setError(errorResponse.message);
        }
    };

    return (
        <div 
  className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" 
  style={{ backgroundColor: '#f9f9f9' }}
>
  <div className="max-w-md w-full space-y-8 p-8 rounded-xl shadow-lg" style={{ backgroundColor: '#c8d9e6' }}>
    <div>
      <img
        className="mx-auto h-20 w-auto"
        src={logo}
        alt="Your Company Logo"
      />
      <h2 className="mt-6 text-center text-3xl font-extrabold" style={{ color: '#567c8d' }}>
        Sign in to your account
      </h2>
    </div>
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}
      <div className="rounded-md shadow-sm -space-y-px">
        <div>
          <label htmlFor="email-address" className="sr-only">
            Email address
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-400 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ color: '#567c8d', '::placeholder': { color: '#567c8d' } }}
          />
        </div>
        <div>
        <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-400 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ color: '#567c8d', '::placeholder': { color: '#567c8d' } }}
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-lg font-bold rounded-md bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          style={{ backgroundColor: '#2F4156', color: '#c8d9e6' }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </form>
  </div>
</div>
    );
}