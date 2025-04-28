// src/Web_part/Backend/src/controllers/mobileApiController.js
import supabase from '../utils/supabase.js';
import { ErrorTypes } from '../utils/errorHandler.js';

export const mobileApiController = {
  // Authenticate with NFC card
  authenticateWithNFC: async (req, res, next) => {
    try {
      const { cardId } = req.body;
      
      if (!cardId) {
        return next(ErrorTypes.VALIDATION('NFC card ID is required'));
      }
      
      // Get user associated with NFC card
      const { data: nfcCard, error: nfcError } = await supabase
        .from('nfc_cards')
        .select('user_id, is_active')
        .eq('card_id', cardId)
        .single();
      
      if (nfcError || !nfcCard) {
        return next(ErrorTypes.UNAUTHORIZED('Invalid NFC card'));
      }
      
      if (!nfcCard.is_active) {
        return next(ErrorTypes.FORBIDDEN('NFC card is inactive'));
      }
      
      // Get user details
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(nfcCard.user_id);
      
      if (userError || !userData.user) {
        return next(ErrorTypes.SERVER_ERROR('Error retrieving user data'));
      }
      
      // Create a session token
      const { data: session, error: sessionError } = await supabase.auth.admin.createSession({
        userId: nfcCard.user_id
      });
      
      if (sessionError) {
        return next(ErrorTypes.SERVER_ERROR('Failed to create session'));
      }
      
      // Update last_used timestamp
      await supabase
        .from('nfc_cards')
        .update({ last_used: new Date().toISOString() })
        .eq('card_id', cardId);
      
      res.json({
        token: session.access_token,
        expires_at: session.expires_at,
        user: {
          id: userData.user.id,
          email: userData.user.email,
          role: userData.user.user_metadata.role,
          fullName: userData.user.user_metadata.full_name
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  // Get assembly by barcode
  getAssemblyByBarcode: async (req, res, next) => {
    try {
      const { barcode } = req.params;
      
      // Get assembly ID from barcode
      const { data: barcodeData, error: barcodeError } = await supabase
        .from('assembly_barcodes')
        .select('assembly_id')
        .eq('barcode', barcode)
        .single();
      
      if (barcodeError || !barcodeData) {
        return next(ErrorTypes.NOT_FOUND('Assembly barcode not found'));
      }
      
      // Get assembly details
      const { data: assembly, error: assemblyError } = await supabase
        .from('assemblies')
        .select(`
          id, name, status, weight, quantity, 
          width, height, length, painting_spec,
          projects(id, name, internal_number)
        `)
        .eq('id', barcodeData.assembly_id)
        .single();
      
      if (assemblyError || !assembly) {
        return next(ErrorTypes.NOT_FOUND('Assembly not found'));
      }
      
      res.json({ data: assembly });
    } catch (error) {
      next(error);
    }
  },
  
  // Update assembly status
  updateAssemblyStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;
      const deviceInfo = req.body.deviceInfo || {};
      
      // Validate status
      const validStatuses = ['Waiting', 'In Production', 'Welding', 'Painting', 'Completed'];
      if (!validStatuses.includes(status)) {
        return next(ErrorTypes.VALIDATION('Invalid status'));
      }
      
      // Get current assembly status
      const { data: assembly, error: assemblyError } = await supabase
        .from('assemblies')
        .select('status')
        .eq('id', id)
        .single();
      
      if (assemblyError || !assembly) {
        return next(ErrorTypes.NOT_FOUND('Assembly not found'));
      }
      
      const previousStatus = assembly.status;
      
      // Update assembly status
      const { data: updatedAssembly, error: updateError } = await supabase
        .from('assemblies')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) {
        return next(ErrorTypes.SERVER_ERROR('Failed to update assembly status'));
      }
      
      // Log the status change
      await supabase
        .from('assembly_status_logs')
        .insert({
          assembly_id: id,
          previous_status: previousStatus,
          new_status: status,
          updated_by: userId,
          device_info: deviceInfo
        });
      
      res.json({
        data: updatedAssembly,
        message: 'Assembly status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};