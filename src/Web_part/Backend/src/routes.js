// src/routes.js
import express from 'express';
import { userController } from './controllers/userController.js';
import { nfcCardController } from './controllers/nfcCardController.js';
import { assemblyBarcodeController } from './controllers/assemblyBarcodeController.js';
import { assemblyStatusController } from './controllers/assemblyStatusController.js';
import { authenticate, authorize } from './middleware/auth.js';
import { 
  validate, 
  userValidationRules,
  nfcCardValidationRules,
  assemblyBarcodeValidationRules,
  assemblyStatusValidationRules
} from './middleware/validation.js';

const router = express.Router();

// Public health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User management routes
router.route('/users')
  // Get all users - requires admin or manager role
  .get(
    authenticate,
    authorize(['admin', 'manager']),
    userController.getUsers
  )
  // Create new user 
  .post(
    authenticate,  
    authorize(['admin', 'manager']),  
    validate(userValidationRules.createUser),
    userController.createUser
  );

router.route('/users/:id')
  // Get a single user - requires admin or manager role
  .get(
    authenticate,
    authorize(['admin', 'manager']),
    validate(userValidationRules.getUser),
    userController.getUser
  )
  // Update a user - requires admin or manager role
  .put(
    authenticate,
    authorize(['admin', 'manager']),
    validate(userValidationRules.updateUser),
    userController.updateUser
  )
  // Delete a user - requires admin or manager role
  .delete(
    authenticate,
    authorize(['admin', 'manager']),
    validate(userValidationRules.deleteUser),
    userController.deleteUser
  );

// Reset user password - requires admin or manager role
router.post(
  '/users/:id/reset-password',
  authenticate,
  authorize(['admin', 'manager']),
  validate(userValidationRules.getUser),
  userController.resetPassword
);

// Import mobile authentication middleware
import { mobileAuthenticate, verifyNfcCard, mobileAuthorize } from './middleware/mobileAuth.js';

// NFC Card Routes
// Validate an NFC card (for mobile app - no auth required for initial validation)
router.post(
  '/nfc/validate',
  validate(nfcCardValidationRules.validateCard),
  nfcCardController.validateCard
);

// NFC card management (admin/manager)
router.route('/nfc/cards')
  .get(
    authenticate,
    authorize(['admin', 'manager']),
    nfcCardController.getCards
  )
  .post(
    authenticate,
    authorize(['admin', 'manager']),
    validate(nfcCardValidationRules.assignCard),
    nfcCardController.assignCard
  );

router.put(
  '/nfc/cards/:id/deactivate',
  authenticate,
  authorize(['admin', 'manager']),
  validate(nfcCardValidationRules.deactivateCard),
  nfcCardController.deactivateCard
);

// Mobile API routes
// Namespace for mobile app endpoints
const mobileRouter = express.Router();
router.use('/mobile', mobileRouter);

// Get assembly by barcode (mobile app - requires NFC validation)
mobileRouter.get(
  '/assemblies/barcode/:barcode',
  mobileAuthenticate,
  validate(assemblyBarcodeValidationRules.getAssemblyByBarcode),
  assemblyBarcodeController.getAssemblyByBarcode
);

// Update assembly status (mobile app - requires NFC validation)
mobileRouter.post(
  '/assemblies/status',
  mobileAuthenticate,
  verifyNfcCard,
  validate(assemblyStatusValidationRules.updateStatus),
  assemblyStatusController.updateStatus
);

// Web API routes for barcode/status management
// Get assembly by barcode (web app - no auth required for scanning via web)
router.get(
  '/assemblies/barcode/:barcode',
  validate(assemblyBarcodeValidationRules.getAssemblyByBarcode),
  assemblyBarcodeController.getAssemblyByBarcode
);

// Generate barcode for assembly (admin/manager)
router.post(
  '/assemblies/barcode',
  authenticate,
  authorize(['admin', 'manager']),
  validate(assemblyBarcodeValidationRules.generateBarcode),
  assemblyBarcodeController.generateBarcode
);

// Get all barcodes (admin/manager)
router.get(
  '/assemblies/barcodes',
  authenticate,
  authorize(['admin', 'manager']),
  assemblyBarcodeController.getBarcodes
);

// Update assembly status (web app - requires authentication)
router.post(
  '/assemblies/status',
  authenticate,
  validate(assemblyStatusValidationRules.updateStatus),
  assemblyStatusController.updateStatus
);

// Get status history for an assembly
router.get(
  '/assemblies/:assemblyId/status-history',
  authenticate,
  authorize(['admin', 'manager']),
  validate(assemblyStatusValidationRules.getStatusHistory),
  assemblyStatusController.getStatusHistory
);

export default router;