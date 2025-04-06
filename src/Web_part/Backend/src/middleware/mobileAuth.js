// src/middleware/mobileAuth.js
import { ErrorTypes } from '../utils/errorHandler.js';
import supabase from '../utils/supabase.js';

/**
 * Simplified authentication for mobile apps
 * This allows mobile apps to authenticate with a user ID from NFC validation
 */
export const mobileAuthenticate = async (req, res, next) => {
  try {
    // Get user ID from the request
    const userId = req.body.userId || req.query.userId;
    
    if (!userId) {
      return next(ErrorTypes.UNAUTHORIZED('User ID is required'));
    }
    
    // Verify the user exists and is active
    const { data, error } = await supabase
      .from('user_profiles')
      .select('auth_user_id, role, active')
      .eq('auth_user_id', userId)
      .eq('active', true)
      .single();
    
    if (error || !data) {
      return next(ErrorTypes.UNAUTHORIZED('Invalid or inactive user'));
    }
    
    // Add user info to the request
    req.user = {
      id: data.auth_user_id,
      role: data.role
    };
    
    next();
  } catch (error) {
    next(ErrorTypes.UNAUTHORIZED());
  }
};

/**
 * Verify that the NFC card is valid for the user
 * Use this for mobile endpoints that require NFC authentication
 */
export const verifyNfcCard = async (req, res, next) => {
  try {
    const { userId, cardId } = req.body;
    
    if (!userId || !cardId) {
      return next(ErrorTypes.UNAUTHORIZED('User ID and Card ID are required'));
    }
    
    // Verify the NFC card is linked to this user and is active
    const { data, error } = await supabase
      .from('nfc_cards')
      .select('user_id')
      .eq('card_id', cardId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return next(ErrorTypes.UNAUTHORIZED('Invalid NFC card for this user'));
    }
    
    next();
  } catch (error) {
    next(ErrorTypes.UNAUTHORIZED());
  }
};

/**
 * Role-based authorization for mobile apps
 * @param {string[]} allowedRoles - Array of roles that have access
 */
export const mobileAuthorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ErrorTypes.UNAUTHORIZED());
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return next(ErrorTypes.FORBIDDEN('Insufficient permissions'));
    }
    
    next();
  };
};