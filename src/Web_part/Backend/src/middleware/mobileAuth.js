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
      return next(ErrorTypes.UNAUTHORIZED('User ID is required for mobile authentication'));
    }
    
    // Verify the user exists and is active
    const { data, error } = await supabase
      .from('user_profiles')
      .select('auth_user_id, role, active, worker_type_id, worker_types(type_name)')
      .eq('auth_user_id', userId)
      .eq('active', true)
      .single();
    
    if (error || !data) {
      return next(ErrorTypes.UNAUTHORIZED('Invalid or inactive user'));
    }
    
    // Add user info to the request
    req.user = {
      id: data.auth_user_id,
      role: data.role,
      workerType: data.worker_types?.type_name || null,
      isLogistics: data.worker_types?.type_name === 'logistics'
    };
    
    // Remove worker type check to allow all roles to access logistics functionality
    // Original check was:
    /* if (req.path.includes('/logistics/') && !req.user.isLogistics && data.role !== 'admin' && data.role !== 'manager') {
      return next(ErrorTypes.FORBIDDEN('Only logistics workers, managers, or admins can perform logistics operations'));
    } */
    
    next();
  } catch (error) {
    console.error('Mobile authentication error:', error);
    next(ErrorTypes.UNAUTHORIZED('Authentication failed'));
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
      return next(ErrorTypes.UNAUTHORIZED('User ID and Card ID are required for NFC verification'));
    }
    
    // Verify the NFC card is linked to this user and is active
    const { data, error } = await supabase
      .from('nfc_cards')
      .select('user_id, last_used')
      .eq('card_id', cardId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return next(ErrorTypes.UNAUTHORIZED('Invalid or inactive NFC card for this user'));
    }
    
    // Update the last_used timestamp for the NFC card
    await supabase
      .from('nfc_cards')
      .update({ last_used: new Date().toISOString() })
      .eq('card_id', cardId);
    
    // Add card info to the request
    req.nfcCard = {
      cardId,
      userId: data.user_id,
      lastUsed: data.last_used
    };
    
    next();
  } catch (error) {
    console.error('NFC verification error:', error);
    next(ErrorTypes.UNAUTHORIZED('NFC verification failed'));
  }
};

/**
 * Role-based authorization for mobile apps
 * @param {string[]} allowedRoles - Array of roles that have access
 */
export const mobileAuthorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ErrorTypes.UNAUTHORIZED('User information not available'));
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return next(ErrorTypes.FORBIDDEN(`User with role '${req.user.role}' is not authorized for this operation`));
    }
    
    next();
  };
};

/**
 * Enhanced logging middleware for mobile operations
 * Records details about the mobile operation for audit purposes
 */
export const logMobileOperation = (operationType) => {
  return async (req, res, next) => {
    // Store the original send function
    const originalSend = res.send;
    
    // Override the send function to log activity after response is sent
    res.send = function(body) {
      // Call the original send function
      originalSend.call(this, body);
      
      // Log the operation asynchronously (don't wait for it)
      try {
        const logData = {
          operation_type: operationType,
          user_id: req.user?.id,
          device_info: req.body?.deviceInfo || {},
          request_details: {
            path: req.path,
            method: req.method,
            ip: req.ip,
            body: { ...req.body, cardId: undefined, password: undefined } // Exclude sensitive data
          },
          status_code: res.statusCode,
          timestamp: new Date().toISOString()
        };
        
        // Insert into operations log table
        supabase
          .from('mobile_operations_log')
          .insert(logData)
          .then(() => {})
          .catch(err => console.error('Error logging mobile operation:', err));
      } catch (error) {
        console.error('Error in mobile operation logger:', error);
      }
    };
    
    next();
  };
};