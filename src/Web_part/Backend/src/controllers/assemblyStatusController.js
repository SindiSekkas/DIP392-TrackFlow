// src/controllers/assemblyStatusController.js
import supabase from '../utils/supabase.js';
import { ErrorTypes } from '../utils/errorHandler.js';

export const assemblyStatusController = {
  // Update assembly status
  updateStatus: async (req, res, next) => {
    try {
      const { assemblyId, status, userId, deviceInfo } = req.body;
      
      // Verify assembly exists
      const { data: assembly, error: assemblyError } = await supabase
        .from('assemblies')
        .select('id, status')
        .eq('id', assemblyId)
        .single();
      
      if (assemblyError || !assembly) {
        return next(ErrorTypes.NOT_FOUND('Assembly not found'));
      }
      
      // Begin a transaction to update status and log the change
      // Supabase doesn't directly support transactions, so we'll do our best
      
      // 1. Log the status change
      const { error: logError } = await supabase
        .from('assembly_status_logs')
        .insert({
          assembly_id: assemblyId,
          previous_status: assembly.status,
          new_status: status,
          updated_by: userId,
          device_info: deviceInfo || {}
        });
      
      if (logError) {
        return next(ErrorTypes.SERVER_ERROR(logError.message));
      }
      
      // 2. Update assembly status
      const { data: updatedAssembly, error: updateError } = await supabase
        .from('assemblies')
        .update({ status })
        .eq('id', assemblyId)
        .select()
        .single();
      
      if (updateError) {
        return next(ErrorTypes.SERVER_ERROR(updateError.message));
      }
      
      res.json({
        data: updatedAssembly,
        message: `Assembly status updated to ${status}`
      });
    } catch (error) {
      next(error);
    }
  },
  
  // Get status history for an assembly
  getStatusHistory: async (req, res, next) => {
    try {
      const { assemblyId } = req.params;
      
      // Verify assembly exists
      const { data: assembly, error: assemblyError } = await supabase
        .from('assemblies')
        .select('id, name')
        .eq('id', assemblyId)
        .single();
      
      if (assemblyError || !assembly) {
        return next(ErrorTypes.NOT_FOUND('Assembly not found'));
      }
      
      // Get status logs without using direct joins
      const { data: logs, error: logsError } = await supabase
        .from('assembly_status_logs')
        .select(`
          id,
          assembly_id,
          previous_status,
          new_status,
          updated_by,
          device_info,
          created_at
        `)
        .eq('assembly_id', assemblyId)
        .order('created_at', { ascending: false });
      
      if (logsError) {
        return next(ErrorTypes.SERVER_ERROR(logsError.message));
      }
      
      // Get user info for each log separately
      const statusLogs = await Promise.all(logs.map(async (log) => {
        // Get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('auth_user_id', log.updated_by)
          .maybeSingle();
          
        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(log.updated_by);
        
        return {
          id: log.id,
          assemblyId: log.assembly_id,
          previousStatus: log.previous_status,
          newStatus: log.new_status,
          updatedBy: {
            id: log.updated_by,
            email: userData?.user?.email || 'Unknown',
            fullName: profile?.full_name || 'Unknown User'
          },
          deviceInfo: log.device_info,
          timestamp: log.created_at
        };
      }));
      
      res.json({
        data: {
          assembly: {
            id: assembly.id,
            name: assembly.name
          },
          statusLogs
        }
      });
    } catch (error) {
      next(error);
    }
  }
};