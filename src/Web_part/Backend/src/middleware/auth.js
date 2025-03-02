// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import supabase from '../utils/supabase.js';
import { ErrorTypes } from '../utils/errorHandler.js';

/**
 * Middleware to authenticate the JWT token from Supabase
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ErrorTypes.UNAUTHORIZED());
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(ErrorTypes.UNAUTHORIZED());
    }

    // Verify JWT token using the Supabase JWT secret
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      console.error('Auth error:', error);
      return next(ErrorTypes.UNAUTHORIZED());
    }

    // Add user to request
    req.user = data.user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    next(ErrorTypes.UNAUTHORIZED());
  }
};

/**
 * Middleware to check if the user has the required role
 * @param {string[]} allowedRoles - Array of roles that have access
 */
export const authorize = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(ErrorTypes.UNAUTHORIZED());
      }
      
      // Get the user's profile to check their role
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('auth_user_id', req.user.id)
        .single();
      
      if (error || !profile) {
        console.error('Role check error:', error);
        return next(ErrorTypes.FORBIDDEN());
      }

      // Check if user has an allowed role
      if (!allowedRoles.includes(profile.role)) {
        return next(ErrorTypes.FORBIDDEN());
      }

      // Add user role to request for convenience
      req.userRole = profile.role;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      next(ErrorTypes.SERVER_ERROR());
    }
  };
};