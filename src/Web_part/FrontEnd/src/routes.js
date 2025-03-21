// Add these routes to src/routes.js

// Import the client controller
import { clientController } from './controllers/clientController.js';
import { validate } from './middleware/validation.js';

// Client validation rules
const clientValidationRules = {
  createClient: [
    body('company_name')
      .isLength({ min: 2 })
      .withMessage('Company name must be at least 2 characters long')
      .trim(),
    body('registration_code')
      .isLength({ min: 1 })
      .withMessage('Registration code is required')
      .trim(),
    body('vat_code')
      .optional()
      .trim(),
    body('contact_person')
      .optional()
      .trim(),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Must be a valid email')
      .normalizeEmail()
      .trim(),
    body('phone')
      .optional()
      .trim(),
    body('address')
      .optional()
      .trim(),
    body('notes')
      .optional()
      .trim()
  ],
  
  updateClient: [
    param('id').isUUID().withMessage('Invalid client ID'),
    body('company_name')
      .optional()
      .isLength({ min: 2 })
      .withMessage('Company name must be at least 2 characters long')
      .trim(),
    body('registration_code')
      .optional()
      .trim(),
    body('vat_code')
      .optional()
      .trim(),
    body('contact_person')
      .optional()
      .trim(),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Must be a valid email')
      .normalizeEmail()
      .trim(),
    body('phone')
      .optional()
      .trim(),
    body('address')
      .optional()
      .trim(),
    body('notes')
      .optional()
      .trim()
  ],
  
  getClient: [
    param('id').isUUID().withMessage('Invalid client ID')
  ],
  
  deleteClient: [
    param('id').isUUID().withMessage('Invalid client ID')
  ]
};

// Add these routes to the router in src/routes.js
router.route('/clients')
  .get(
    authenticate,
    authorize(['admin', 'manager']),
    clientController.getClients
  )
  .post(
    authenticate,
    authorize(['admin', 'manager']),
    validate(clientValidationRules.createClient),
    clientController.createClient
  );

router.route('/clients/:id')
  .get(
    authenticate,
    authorize(['admin', 'manager']),
    validate(clientValidationRules.getClient),
    clientController.getClient
  )
  .put(
    authenticate,
    authorize(['admin', 'manager']),
    validate(clientValidationRules.updateClient),
    clientController.updateClient
  )
  .delete(
    authenticate,
    authorize(['admin', 'manager']),
    validate(clientValidationRules.deleteClient),
    clientController.deleteClient
  );