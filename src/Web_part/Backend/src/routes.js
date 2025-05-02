// src/Web_part/Backend/src/routes.js
import express from 'express';
import { userController } from './controllers/userController.js';
import { nfcCardController } from './controllers/nfcCardController.js';
import { assemblyBarcodeController } from './controllers/assemblyBarcodeController.js';
import { assemblyStatusController } from './controllers/assemblyStatusController.js';
import { mobileApiController } from './controllers/mobileApiController.js';
import { mobileLogisticsController } from './controllers/mobileLogisticsController.js'; // Import new controller
import { qualityControlController } from './controllers/qualityControlController.js'; // Import QC controller
import { authenticate, authorize } from './middleware/auth.js';
import {
  validate,
  userValidationRules,
  nfcCardValidationRules,
  assemblyBarcodeValidationRules,
  assemblyStatusValidationRules,
  logisticsBarcodeValidationRules // New validation rules
} from './middleware/validation.js';
import { param, body } from 'express-validator'; // Import param and body for new rules
import { upload } from './middleware/fileUpload.js'; 

// Import mobile authentication middleware
import {
  mobileAuthenticate,
  verifyNfcCard,
  mobileAuthorize,
  logMobileOperation // Import the logging middleware
} from './middleware/mobileAuth.js';

// QC Image validation rules
const qcImageValidationRules = {
  uploadQCImage: [
    param('assemblyId').isUUID().withMessage('Invalid assembly ID'),
    body('qcStatus').optional().isString().withMessage('Invalid QC status'),
    body('notes').optional().isString().withMessage('Invalid notes')
  ],
  getQCImages: [
    param('assemblyId').isUUID().withMessage('Invalid assembly ID')
  ],
  deleteQCImage: [
    param('id').isUUID().withMessage('Invalid QC image ID')
  ]
};


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

// Mobile Logistics API Routes - NEW
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

mobileRouter.post(
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

// Mobile QC image upload endpoint
mobileRouter.post(
  '/assemblies/:assemblyId/qc',
  upload.single('image'), // <-- Moved to BEFORE authentication
  mobileAuthenticate,
  verifyNfcCard,
  validate(qcImageValidationRules.uploadQCImage),
  logMobileOperation('upload_qc_image'),
  qualityControlController.uploadQCImage
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

// Get QC images for an assembly (Web)
router.get(
  '/assemblies/:assemblyId/qc-images',
  authenticate, // Requires standard web authentication
  validate(qcImageValidationRules.getQCImages),
  qualityControlController.getQCImages
);

// Delete QC image (Web - Admin/Manager only)
router.delete(
  '/assemblies/qc-images/:id',
  authenticate,
  authorize(['admin', 'manager']),
  validate(qcImageValidationRules.deleteQCImage),
  qualityControlController.deleteQCImage
);

router.post(
  '/mobile/qc/auth',
  validate(nfcCardValidationRules.validateCard),
  mobileApiController.authenticateForQC  // New controller method
);

export default router;