// src/controllers/userController.js
import supabase from '../utils/supabase.js';
import { ErrorTypes } from '../utils/errorHandler.js';

// Generate a secure random password
const generateTemporaryPassword = (length = 12) => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+[]{}|;:,.<>?';
  const allChars = lowercase + uppercase + numbers + special;
  
  // Ensure at least one of each type
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
};

// Get worker type ID by name
const getWorkerTypeId = async (typeName) => {
  const { data, error } = await supabase
    .from('worker_types')
    .select('id')
    .eq('type_name', typeName)
    .single();
  
  if (error || !data) {
    throw ErrorTypes.NOT_FOUND(`Worker type '${typeName}' not found`);
  }
  
  return data.id;
};

export const userController = {
  // Create a new user
  createUser: async (req, res, next) => {
    try {
      const { email, password, fullName, role, workerType } = req.body;
      
      // Use provided password or generate a random one
      const userPassword = password || generateTemporaryPassword();
      
      // 1. Create the auth user
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password: userPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role
        }
      });
      
      if (userError) {
        return next(ErrorTypes.CONFLICT(userError.message));
      }
      
      // For workers, we need to assign worker type
      if (role === 'worker' && workerType) {
        try {
          // Get the worker type ID
          const workerTypeId = await getWorkerTypeId(workerType);
          
          // Update the user profile with worker type
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ worker_type_id: workerTypeId })
            .eq('auth_user_id', userData.user.id);
            
          if (profileError) {
            console.error('Error updating worker type:', profileError);
            // Continue anyway - the user was created
          }
        } catch (workerTypeError) {
          console.error('Worker type error:', workerTypeError);
          // Continue anyway - the user was created
        }
      }
      
      // Return created user with temporary password if generated
      res.status(201).json({
        data: {
          user: userData.user,
          temporaryPassword: password ? undefined : userPassword
        },
        message: 'User created successfully'
      });
    } catch (error) {
      next(error);
    }
  },
  
  // Get all users
  getUsers: async (req, res, next) => {
    try {
      // Get user profiles with auth user data
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          auth_user_id,
          full_name,
          role,
          active,
          created_at,
          updated_at,
          worker_types(type_name)
        `);
      
      if (error) {
        return next(ErrorTypes.SERVER_ERROR(error.message));
      }
      
      // Format the response
      const users = data.map(profile => ({
        id: profile.auth_user_id,
        profileId: profile.id,
        fullName: profile.full_name,
        role: profile.role,
        workerType: profile.worker_types?.type_name,
        active: profile.active,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      }));
      
      res.json({ data: users });
    } catch (error) {
      next(error);
    }
  },
  
  // Get a single user by ID
  getUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          auth_user_id,
          full_name,
          role,
          active,
          created_at,
          updated_at,
          worker_types(type_name)
        `)
        .eq('auth_user_id', id)
        .single();
      
      if (profileError || !profile) {
        return next(ErrorTypes.NOT_FOUND('User not found'));
      }
      
      // Get auth user data
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(id);
      
      if (authError) {
        return next(ErrorTypes.SERVER_ERROR(authError.message));
      }
      
      const user = {
        id: profile.auth_user_id,
        profileId: profile.id,
        email: authData.user.email,
        fullName: profile.full_name,
        role: profile.role,
        workerType: profile.worker_types?.type_name,
        active: profile.active,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      };
      
      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  },
  
  // Update a user
  updateUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { fullName, role, workerType, active } = req.body;
      
      // Check if user exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, auth_user_id, role')
        .eq('auth_user_id', id)
        .single();
      
      if (profileError || !existingProfile) {
        return next(ErrorTypes.NOT_FOUND('User not found'));
      }
      
      // Start building the update data
      const profileUpdateData = {};
      
      if (fullName !== undefined) {
        profileUpdateData.full_name = fullName;
      }
      
      if (role !== undefined) {
        profileUpdateData.role = role;
      }
      
      if (active !== undefined) {
        profileUpdateData.active = active;
      }
      
      // If role is changing to or is worker, and worker type is provided
      if (role === 'worker' || (role === undefined && existingProfile.role === 'worker')) {
        if (workerType) {
          try {
            const workerTypeId = await getWorkerTypeId(workerType);
            profileUpdateData.worker_type_id = workerTypeId;
          } catch (workerTypeError) {
            return next(workerTypeError);
          }
        }
      } else if (role !== undefined && role !== 'worker') {
        // If changing to a non-worker role, remove worker_type
        profileUpdateData.worker_type_id = null;
      }
      
      // Update metadata in auth if role is changing
      if (role !== undefined) {
        const { error: authError } = await supabase.auth.admin.updateUserById(id, {
          user_metadata: { role }
        });
        
        if (authError) {
          return next(ErrorTypes.SERVER_ERROR(authError.message));
        }
      }
      
      // Update the profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_profiles')
        .update(profileUpdateData)
        .eq('id', existingProfile.id)
        .select(`
          id,
          auth_user_id,
          full_name,
          role,
          active,
          created_at,
          updated_at,
          worker_types(type_name)
        `)
        .single();
      
      if (updateError) {
        return next(ErrorTypes.SERVER_ERROR(updateError.message));
      }
      
      res.json({
        data: {
          id: updatedProfile.auth_user_id,
          profileId: updatedProfile.id,
          fullName: updatedProfile.full_name,
          role: updatedProfile.role,
          workerType: updatedProfile.worker_types?.type_name,
          active: updatedProfile.active,
          updatedAt: updatedProfile.updated_at
        },
        message: 'User updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },
  
  // Delete a user
  deleteUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Delete the user (cascade will handle the profile)
      const { error } = await supabase.auth.admin.deleteUser(id);
      
      if (error) {
        return next(ErrorTypes.SERVER_ERROR(error.message));
      }
      
      res.json({
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },
  
  // Reset user password
  resetPassword: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Generate new password or use provided one
      const newPassword = req.body.password || generateTemporaryPassword();
      
      // Update user password
      const { error } = await supabase.auth.admin.updateUserById(id, {
        password: newPassword
      });
      
      if (error) {
        return next(ErrorTypes.SERVER_ERROR(error.message));
      }
      
      res.json({
        data: {
          temporaryPassword: req.body.password ? undefined : newPassword
        },
        message: 'Password reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};