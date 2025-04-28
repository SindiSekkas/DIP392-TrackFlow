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

// NFC Card validation rules
export const nfcCardValidationRules = {
  validateCard: [
    body('cardId')
      .notEmpty()
      .withMessage('NFC card ID is required')
      .trim()
  ],
  
  assignCard: [
    body('cardId')
      .notEmpty()
      .withMessage('NFC card ID is required')
      .trim(),
    body('userId')
      .isUUID()
      .withMessage('Valid user ID is required'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('Active status must be a boolean')
  ],
  
  deactivateCard: [
    param('id')
      .isUUID()
      .withMessage('Invalid NFC card ID')
  ]
};

// Assembly Barcode validation rules
export const assemblyBarcodeValidationRules = {
  getAssemblyByBarcode: [
    param('barcode')
      .notEmpty()
      .withMessage('Barcode is required')
      .trim()
  ],
  
  generateBarcode: [
    body('assemblyId')
      .isUUID()
      .withMessage('Valid assembly ID is required'),
    body('customBarcode')
      .optional()
      .isString()
      .withMessage('Custom barcode must be a string')
      .trim()
  ]
};

// Assembly Status validation rules
export const assemblyStatusValidationRules = {
  updateStatus: [
    body('assemblyId')
      .isUUID()
      .withMessage('Valid assembly ID is required'),
    body('status')
      .isIn(['Waiting', 'In Production', 'Welding', 'Painting', 'Completed'])
      .withMessage('Status must be one of: Waiting, In Production, Welding, Painting, Completed'),
    body('userId')
      .isUUID()
      .withMessage('Valid user ID is required'),
    body('deviceInfo')
      .optional()
      .isObject()
      .withMessage('Device info must be an object')
  ],
  
  getStatusHistory: [
    param('assemblyId')
      .isUUID()
      .withMessage('Invalid assembly ID')
  ]
};

// Logistics Barcode validation rules
export const logisticsBarcodeValidationRules = {
  validateBatchBarcode: [
    body('barcode')
      .notEmpty()
      .withMessage('Barcode is required')
      .trim()
  ],
  
  addAssemblyToBatch: [
    body('batchId')
      .isUUID()
      .withMessage('Valid batch ID is required'),
    body('assemblyBarcode')
      .notEmpty()
      .withMessage('Assembly barcode is required')
      .trim(),
    body('userId')
      .isUUID()
      .withMessage('Valid user ID is required')
  ],
  
  getBatchAssemblies: [
    param('batchId')
      .isUUID()
      .withMessage('Invalid batch ID')
  ],
  
  removeAssemblyFromBatch: [
    param('batchAssemblyId')
      .isUUID()
      .withMessage('Invalid batch assembly ID')
  ]
};