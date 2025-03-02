// src/middleware/validation.js
import { body, param, validationResult } from 'express-validator';
import { ErrorTypes } from '../utils/errorHandler.js';

// Validation middleware
export const validate = (validations) => {
  return async (req, res, next) => {
    // Execute all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ErrorTypes.VALIDATION(errors.array()));
    }
    
    next();
  };
};

// User validation rules
export const userValidationRules = {
  createUser: [
    body('email')
      .isEmail()
      .withMessage('Must be a valid email')
      .normalizeEmail()
      .trim(),
    body('password')
      .optional() // Make password optional
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('fullName')
      .isLength({ min: 2 })
      .withMessage('Full name must be at least 2 characters long')
      .trim(),
    body('role')
      .isIn(['admin', 'manager', 'worker'])
      .withMessage('Role must be one of: admin, manager, worker'),
    body('workerType')
      .optional({ nullable: true })
      .isString()
      .withMessage('Worker type must be a string')
      .custom((value, { req }) => {
        // Worker type is required only for worker role
        if (req.body.role === 'worker' && !value) {
          throw new Error('Worker type is required for worker role');
        }
        return true;
      })
  ],
  
  updateUser: [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('fullName')
      .optional()
      .isLength({ min: 2 })
      .withMessage('Full name must be at least 2 characters long')
      .trim(),
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'worker'])
      .withMessage('Role must be one of: admin, manager, worker'),
    body('workerType')
      .optional({ nullable: true })
      .isString()
      .withMessage('Worker type must be a string')
      .custom((value, { req }) => {
        // Worker type is required only for worker role
        if (req.body.role === 'worker' && !value) {
          throw new Error('Worker type is required for worker role');
        }
        return true;
      }),
    body('active')
      .optional()
      .isBoolean()
      .withMessage('Active status must be a boolean')
  ],
  
  getUser: [
    param('id').isUUID().withMessage('Invalid user ID')
  ],
  
  deleteUser: [
    param('id').isUUID().withMessage('Invalid user ID')
  ]
};