// src/routes.js
import express from 'express';
import { userController } from './controllers/userController.js';
import { authenticate, authorize } from './middleware/auth.js';
import { validate, userValidationRules } from './middleware/validation.js';

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

export default router;