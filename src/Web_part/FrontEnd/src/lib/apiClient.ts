// src/lib/apiClient.ts
import { AppError } from '../utils/errorHandling';

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Generic API request function with token handling
 */
async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  token?: string
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add auth token if provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    const responseData = await response.json();

    if (!response.ok) {
      // Handle error response from API
      throw new AppError(
        response.status >= 500 ? 'SERVER' : 'VALIDATION',
        responseData.error?.message || 'Request failed',
        response.status.toString()
      );
    }

    return responseData as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    // Handle network errors
    if (error instanceof Error) {
      throw new AppError('NETWORK', error.message);
    }
    
    throw new AppError('UNKNOWN', 'An unexpected error occurred');
  }
}

/**
 * User API Functions
 */
export const userApi = {
  // Create a new user
  createUser: async (userData: {
    email: string;
    fullName: string;
    role: string;
    workerType?: string;
    password?: string;
  }, token?: string) => {
    return apiRequest<{
      data: {
        user: any;
        temporaryPassword?: string;
      };
      message: string;
    }>('/users', 'POST', userData, token);
  },

  // Get all users
  getUsers: async (token: string) => {
    return apiRequest<{ data: any[] }>('/users', 'GET', undefined, token);
  },

  // Get a single user
  getUser: async (id: string, token: string) => {
    return apiRequest<{ data: any }>(`/users/${id}`, 'GET', undefined, token);
  },

  // Update a user
  updateUser: async (id: string, userData: any, token: string) => {
    return apiRequest<{ data: any; message: string }>(
      `/users/${id}`,
      'PUT',
      userData,
      token
    );
  },

  // Delete a user
  deleteUser: async (id: string, token: string) => {
    return apiRequest<{ message: string }>(
      `/users/${id}`,
      'DELETE',
      undefined,
      token
    );
  },

  // Reset user password
  resetPassword: async (id: string, token: string) => {
    return apiRequest<{ data: { temporaryPassword?: string }; message: string }>(
      `/users/${id}/reset-password`,
      'POST',
      undefined,
      token
    );
  },
};