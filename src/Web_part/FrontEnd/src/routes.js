// src/routes.js
import express from 'express';
import { userController } from './controllers/userController.js';
import { mobileApiController } from './controllers/mobileApiController.js';
import { qualityControlController } from './controllers/qualityControlController.js';
import { mobileLogisticsController } from './controllers/mobileLogisticsController.js';
import { nfcCardController } from './controllers/nfcCardController.js';
import { authenticate, authorize } from './middleware/auth.js';
import { validate, userValidationRules } from './middleware/validation.js';
import { body, param } from 'express-validator';
import { upload } from './middleware/fileUpload.js';
import {
  mobileAuthenticate,
  verifyNfcCard,
  mobileAuthorize,
  logMobileOperation
} from './middleware/mobileAuth.js';
import {
  logisticsBarcodeValidationRules,
  qcImageValidationRules,
  nfcCardValidationRules as mobileNfcValidationRules // Alias to avoid conflict
} from './middleware/validation.js';

const router = express.Router();
const mobileRouter = express.Router();

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
 * NFC CARD MANAGEMENT ROUTES
 * Endpoints for managing NFC cards
 * Admin/Manager access only
 * ========================================
 */

// Add this section for NFC card validation - required for mobile app
router.post(
  '/nfc/validate',
  validate(mobileNfcValidationRules.validateCard), // Use aliased validation rules
  nfcCardController.validateCard
);

/**
 * ========================================
 * MOBILE API ROUTES
 * Endpoints for the mobile app to
 * scan barcodes and update assembly status
 * ========================================
 */

/**
 * POST /api/mobile/auth/nfc
 * Authenticates a user with their NFC card ID
 * No prior authentication required
 * Body: cardId
 * Returns: JWT token, user info, expiration time
 */
mobileRouter.post(
  '/auth/nfc',
  validate(mobileApiValidationRules.nfcAuth),
  mobileApiController.authenticateWithNFC
);

/**
 * GET /api/mobile/assemblies/barcode/:barcode
 * Retrieves assembly details by scanning a barcode
 * Requires: Authentication (any role)
 * Returns: Assembly details including project info
 */
mobileRouter.get(
  '/assemblies/barcode/:barcode',
  mobileAuthenticate, // Use mobile specific auth if needed, or keep general authenticate
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
mobileRouter.patch(
  '/assemblies/:id/status',
  mobileAuthenticate, // Use mobile specific auth
  verifyNfcCard,      // Add NFC card verification
  validate(mobileApiValidationRules.updateStatus),
  logMobileOperation('update_assembly_status'), // Add logging
  mobileApiController.updateAssemblyStatus
);

// Add the QC image upload endpoint WITH CORRECT MIDDLEWARE ORDER
// Note: upload.single('image') MUST come before authentication middleware
mobileRouter.post(
  '/assemblies/:assemblyId/qc',
  upload.single('image'), // File upload middleware first!
  mobileAuthenticate,
  verifyNfcCard,
  validate(qcImageValidationRules.uploadQCImage),
  logMobileOperation('upload_qc_image'),
  qualityControlController.uploadQCImage
);

// Mobile Logistics API Routes
mobileRouter.post(
  '/logistics/batches/validate',
  mobileAuthenticate,
  validate(logisticsBarcodeValidationRules.validateBatchBarcode),
  logMobileOperation('batch_barcode_validation'),
  mobileLogisticsController.validateBatchBarcode
);

mobileRouter.post(
  '/logistics/batches/add-assembly',
  mobileAuthenticate,
  verifyNfcCard,
  validate(logisticsBarcodeValidationRules.addAssemblyToBatch),
  logMobileOperation('add_assembly_to_batch'),
  mobileLogisticsController.addAssemblyToBatch
);

// Note: Changed to GET as it retrieves data, adjusted route param
mobileRouter.get(
  '/logistics/batches/:batchId/assemblies',
  mobileAuthenticate,
  validate(logisticsBarcodeValidationRules.getBatchAssemblies),
  logMobileOperation('get_batch_assemblies'),
  mobileLogisticsController.getBatchAssemblies
);

mobileRouter.delete(
  '/logistics/batch-assemblies/:batchAssemblyId',
  mobileAuthenticate,
  verifyNfcCard,
  validate(logisticsBarcodeValidationRules.removeAssemblyFromBatch),
  logMobileOperation('remove_assembly_from_batch'),
  mobileLogisticsController.removeAssemblyFromBatch
);

// Mount the mobile router under the /mobile path
router.use('/mobile', mobileRouter);

/**
 * ========================================
 * NFC CARD MANAGEMENT ROUTES (Web/Admin)
 * Endpoints for managing NFC cards
 * Admin/Manager access only
 * ========================================
 */

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
  nfcCardController.registerNfcCard // Use nfcCardController
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
  nfcCardController.getNfcCards // Use nfcCardController
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
  nfcCardController.updateNfcCard // Use nfcCardController
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
  // Add validation for delete if needed, e.g., param('id').isUUID()
  nfcCardController.deleteNfcCard // Use nfcCardController
);


/**
 * ========================================
 * BARCODE MANAGEMENT ROUTES (Web/Admin)
 * Endpoints for generating & managing barcodes
 * Admin/Manager access only
 * ========================================
 */

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
 * QUALITY CONTROL ROUTES (Web/Admin)
 * Endpoints for viewing/managing QC data
 * ========================================
 */

// Get QC images for an assembly (Web/Admin access)
router.get(
  '/assemblies/:assemblyId/qc-images',
  authenticate, // General auth for web access
  validate(qcImageValidationRules.getQCImages),
  qualityControlController.getQCImages
);

// Delete QC image (Web/Admin access)
router.delete(
  '/assemblies/qc-images/:id',
  authenticate,
  validate(qcImageValidationRules.deleteQCImage),
  qualityControlController.deleteQCImage
);


/**
 * ========================================
 * ACTIVITY LOGGING ROUTES (Web/Admin)
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