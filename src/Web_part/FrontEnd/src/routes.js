// src/routes.js
import express from 'express';
import { userController } from './controllers/userController.js';
import { mobileApiController } from './controllers/mobileApiController.js';
import { authenticate, authorize } from './middleware/auth.js';
import { validate, userValidationRules } from './middleware/validation.js';
import { body, param } from 'express-validator';

const router = express.Router();

/**
 * Public Health Check endpoint
 * Used to verify the API server is running correctly
 * No authentication required
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * ========================================
 * USER MANAGEMENT ROUTES
 * These routes handle user CRUD operations
 * Require admin or manager role
 * ========================================
 */

/**
 * GET /api/users
 * Returns a list of all users
 * Requires: Authentication + Admin or Manager role
 */
router.get(
  '/users',
  authenticate,
  authorize(['admin', 'manager']),
  userController.getUsers
);

/**
 * POST /api/users
 * Creates a new user in the system
 * Requires: Authentication + Admin or Manager role
 * Body: email, password (optional), fullName, role, workerType (if worker)
 * Returns: The created user and temporary password if generated
 */
router.post(
  '/users',
  authenticate,
  authorize(['admin', 'manager']),
  validate(userValidationRules.createUser),
  userController.createUser
);

/**
 * GET /api/users/:id
 * Returns details for a specific user
 * Requires: Authentication + Admin or Manager role
 */
router.get(
  '/users/:id',
  authenticate,
  authorize(['admin', 'manager']),
  validate(userValidationRules.getUser),
  userController.getUser
);

/**
 * PUT /api/users/:id
 * Updates a specific user
 * Requires: Authentication + Admin or Manager role
 * Body: fullName, role, workerType, active
 */
router.put(
  '/users/:id',
  authenticate,
  authorize(['admin', 'manager']),
  validate(userValidationRules.updateUser),
  userController.updateUser
);

/**
 * DELETE /api/users/:id
 * Deletes a specific user
 * Requires: Authentication + Admin or Manager role
 */
router.delete(
  '/users/:id',
  authenticate,
  authorize(['admin', 'manager']),
  validate(userValidationRules.deleteUser),
  userController.deleteUser
);

/**
 * POST /api/users/:id/reset-password
 * Resets a user's password and optionally returns a temporary password
 * Requires: Authentication + Admin or Manager role
 */
router.post(
  '/users/:id/reset-password',
  authenticate,
  authorize(['admin', 'manager']),
  validate(userValidationRules.getUser),
  userController.resetPassword
);

/**
 * ========================================
 * MOBILE API ROUTES
 * Endpoints for the mobile app to 
 * scan barcodes and update assembly status
 * ========================================
 */

// Mobile API validation rules
const mobileApiValidationRules = {
  nfcAuth: [
    body('cardId').isString().notEmpty().withMessage('NFC card ID is required')
  ],
  updateStatus: [
    param('id').isUUID().withMessage('Invalid assembly ID'),
    body('status').isIn(['Waiting', 'In Production', 'Welding', 'Painting', 'Completed'])
      .withMessage('Invalid status')
  ]
};

/**
 * POST /api/mobile/auth/nfc
 * Authenticates a user with their NFC card ID
 * No prior authentication required
 * Body: cardId
 * Returns: JWT token, user info, expiration time 
 */
router.post(
  '/mobile/auth/nfc',
  validate(mobileApiValidationRules.nfcAuth),
  mobileApiController.authenticateWithNFC
);

/**
 * GET /api/mobile/assemblies/barcode/:barcode
 * Retrieves assembly details by scanning a barcode
 * Requires: Authentication (any role)
 * Returns: Assembly details including project info
 */
router.get(
  '/mobile/assemblies/barcode/:barcode',
  authenticate,
  mobileApiController.getAssemblyByBarcode
);

/**
 * PATCH /api/mobile/assemblies/:id/status
 * Updates an assembly's status
 * Requires: Authentication (any role)
 * Body: status, deviceInfo (optional)
 * Returns: Updated assembly data
 * Also logs the status change with user info
 */
router.patch(
  '/mobile/assemblies/:id/status',
  authenticate,
  validate(mobileApiValidationRules.updateStatus),
  mobileApiController.updateAssemblyStatus
);

/**
 * ========================================
 * NFC CARD MANAGEMENT ROUTES
 * Endpoints for managing NFC cards
 * Admin/Manager access only
 * ========================================
 */

// NFC card validation rules
const nfcCardValidationRules = {
  create: [
    body('cardId').isString().notEmpty().withMessage('NFC card ID is required'),
    body('userId').isUUID().withMessage('Valid user ID is required')
  ],
  update: [
    param('id').isUUID().withMessage('Invalid NFC card ID'),
    body('isActive').isBoolean().optional()
  ]
};

/**
 * POST /api/nfc-cards
 * Registers a new NFC card for a user
 * Requires: Authentication + Admin or Manager role
 * Body: cardId, userId
 */
router.post(
  '/nfc-cards',
  authenticate,
  authorize(['admin', 'manager']),
  validate(nfcCardValidationRules.create),
  mobileApiController.registerNfcCard
);

/**
 * GET /api/nfc-cards
 * Returns all registered NFC cards with user info
 * Requires: Authentication + Admin or Manager role
 */
router.get(
  '/nfc-cards',
  authenticate,
  authorize(['admin', 'manager']),
  mobileApiController.getNfcCards
);

/**
 * PUT /api/nfc-cards/:id
 * Updates an NFC card (activate/deactivate)
 * Requires: Authentication + Admin or Manager role
 * Body: isActive
 */
router.put(
  '/nfc-cards/:id',
  authenticate,
  authorize(['admin', 'manager']),
  validate(nfcCardValidationRules.update),
  mobileApiController.updateNfcCard
);

/**
 * DELETE /api/nfc-cards/:id
 * Deletes an NFC card
 * Requires: Authentication + Admin or Manager role
 */
router.delete(
  '/nfc-cards/:id',
  authenticate,
  authorize(['admin', 'manager']),
  mobileApiController.deleteNfcCard
);

/**
 * ========================================
 * BARCODE MANAGEMENT ROUTES
 * Endpoints for generating & managing barcodes
 * Admin/Manager access only
 * ========================================
 */

// Barcode validation rules
const barcodeValidationRules = {
  generate: [
    body('assemblyId').isUUID().withMessage('Valid assembly ID is required')
  ]
};

/**
 * POST /api/barcodes/generate
 * Generates a new barcode for an assembly
 * Requires: Authentication + Admin or Manager role
 * Body: assemblyId
 * Returns: Generated barcode data ready for printing
 */
router.post(
  '/barcodes/generate',
  authenticate,
  authorize(['admin', 'manager']),
  validate(barcodeValidationRules.generate),
  mobileApiController.generateBarcode
);

/**
 * GET /api/barcodes/assembly/:assemblyId
 * Retrieves barcode for a specific assembly
 * Requires: Authentication + Admin or Manager role
 */
router.get(
  '/barcodes/assembly/:assemblyId',
  authenticate,
  authorize(['admin', 'manager']),
  mobileApiController.getAssemblyBarcode
);

/**
 * ========================================
 * ACTIVITY LOGGING ROUTES
 * For audit trail and monitoring
 * ========================================
 */

/**
 * GET /api/logs/assembly-status/:assemblyId
 * Returns status change history for an assembly
 * Requires: Authentication + Admin or Manager role
 */
router.get(
  '/logs/assembly-status/:assemblyId',
  authenticate,
  authorize(['admin', 'manager']),
  mobileApiController.getAssemblyStatusLogs
);

/**
 * GET /api/logs/nfc-usage/:userId
 * Returns NFC card usage history for a user
 * Requires: Authentication + Admin or Manager role
 */
router.get(
  '/logs/nfc-usage/:userId',
  authenticate,
  authorize(['admin', 'manager']),
  mobileApiController.getNfcUsageLogs
);

export default router;