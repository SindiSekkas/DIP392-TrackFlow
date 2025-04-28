// src/Web_part/Backend/src/controllers/mobileLogisticsController.js
import supabase from '../utils/supabase.js';
import { ErrorTypes } from '../utils/errorHandler.js';

// Helper function to log specific logistics operations
const logLogisticsOperation = async (operationData) => {
  try {
    const { data, error } = await supabase
      .from('mobile_operations_log')
      .insert(operationData);
    
    if (error) {
      console.error('Error logging logistics operation:', error);
    }
    
    return data;
  } catch (err) {
    console.error('Exception in logistics operation logging:', err);
    // Don't throw - this is non-critical functionality
    return null;
  }
};

export const mobileLogisticsController = {
  // Validate batch barcode
  validateBatchBarcode: async (req, res, next) => {
    const startTime = Date.now();
    const { barcode, deviceInfo } = req.body;
    const userId = req.user?.id;
    
    try {
      console.log(`[Mobile Logistics] Validating batch barcode: ${barcode} by user: ${userId}`);
      
      if (!barcode) {
        return next(ErrorTypes.VALIDATION('Barcode is required'));
      }
      
      // Find the batch linked to this barcode
      const { data: barcodeData, error: barcodeError } = await supabase
        .from('logistics_batch_barcodes')
        .select('batch_id')
        .eq('barcode', barcode)
        .single();
      
      if (barcodeError || !barcodeData) {
        console.log(`[Mobile Logistics] Barcode not found: ${barcode}`);
        
        // Log the failed validation attempt
        await logLogisticsOperation({
          operation_type: 'batch_barcode_validation_failed',
          user_id: userId,
          device_info: deviceInfo || {},
          request_details: {
            barcode,
            error: 'Batch barcode not found'
          },
          status_code: 404
        });
        
        return next(ErrorTypes.NOT_FOUND('Batch barcode not found'));
      }
      
      // Get batch details
      const { data: batch, error: batchError } = await supabase
        .from('logistics_batches')
        .select(`
          id,
          batch_number,
          status,
          client_id,
          project_id,
          delivery_address,
          total_weight,
          shipment_date,
          clients:client_id (company_name),
          projects:project_id (name, internal_number)
        `)
        .eq('id', barcodeData.batch_id)
        .single();
      
      if (batchError || !batch) {
        console.log(`[Mobile Logistics] Batch not found for barcode: ${barcode}`);
        
        // Log the error
        await logLogisticsOperation({
          operation_type: 'batch_not_found',
          user_id: userId,
          device_info: deviceInfo || {},
          request_details: {
            barcode,
            batch_id: barcodeData.batch_id,
            error: 'Batch not found'
          },
          status_code: 404
        });
        
        return next(ErrorTypes.NOT_FOUND('Batch not found'));
      }
      
      // Check if the batch is in a valid status for adding assemblies
      if (batch.status === 'Delivered' || batch.status === 'Cancelled') {
        console.log(`[Mobile Logistics] Invalid batch status: ${batch.status} for barcode: ${barcode}`);
        
        // Log the validation error
        await logLogisticsOperation({
          operation_type: 'batch_invalid_status',
          user_id: userId,
          device_info: deviceInfo || {},
          request_details: {
            barcode,
            batch_id: batch.id,
            batch_status: batch.status,
            error: `Cannot add assemblies to a batch with status: ${batch.status}`
          },
          batch_id: batch.id,
          status_code: 400
        });
        
        return next(ErrorTypes.VALIDATION(`Cannot add assemblies to a batch with status: ${batch.status}`));
      }
      
      // Log successful validation
      await logLogisticsOperation({
        operation_type: 'batch_barcode_validation_success',
        user_id: userId,
        device_info: deviceInfo || {},
        request_details: {
          barcode,
          batch_id: batch.id,
          duration_ms: Date.now() - startTime
        },
        batch_id: batch.id,
        status_code: 200
      });
      
      console.log(`[Mobile Logistics] Successfully validated batch barcode: ${barcode} for batch: ${batch.batch_number}`);
      
      // Get assembly count
      const { count, error: countError } = await supabase
        .from('logistics_batch_assemblies')
        .select('id', { count: 'exact', head: true })
        .eq('batch_id', batch.id);
      
      const assemblyCount = countError ? 0 : (count || 0);
      
      // Return batch details
      res.json({
        data: {
          id: batch.id,
          batch_number: batch.batch_number,
          status: batch.status,
          client: batch.clients?.company_name || 'Unknown Client',
          project: batch.projects ? `${batch.projects.internal_number} - ${batch.projects.name}` : 'Unknown Project',
          project_id: batch.project_id,
          delivery_address: batch.delivery_address,
          total_weight: batch.total_weight,
          assembly_count: assemblyCount
        }
      });
    } catch (error) {
      console.error(`[Mobile Logistics] Error validating batch barcode:`, error);
      
      // Log the unexpected error
      await logLogisticsOperation({
        operation_type: 'batch_barcode_validation_error',
        user_id: userId,
        device_info: deviceInfo || {},
        request_details: {
          barcode,
          error: error.message || 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        status_code: 500
      });
      
      next(error);
    }
  },
  

  
  // Add assembly to batch via barcode
  addAssemblyToBatch: async (req, res, next) => {
    const startTime = Date.now();
    const { batchId, assemblyBarcode, userId, deviceInfo, cardId } = req.body;
    
    try {
      console.log(`[Mobile Logistics] Adding assembly with barcode: ${assemblyBarcode} to batch: ${batchId} by user: ${userId}`);
      
      if (!batchId || !assemblyBarcode || !userId) {
        return next(ErrorTypes.VALIDATION('Batch ID, assembly barcode, and user ID are required'));
      }
      
      // First, verify the batch exists and is in valid status
      const { data: batch, error: batchError } = await supabase
        .from('logistics_batches')
        .select('id, batch_number, status, project_id')
        .eq('id', batchId)
        .single();
      
      if (batchError || !batch) {
        console.log(`[Mobile Logistics] Batch not found: ${batchId}`);
        
        // Log the error
        await logLogisticsOperation({
          operation_type: 'batch_not_found_for_assembly_add',
          user_id: userId,
          device_info: deviceInfo || {},
          request_details: {
            batch_id: batchId,
            assembly_barcode: assemblyBarcode,
            error: 'Batch not found'
          },
          status_code: 404
        });
        
        return next(ErrorTypes.NOT_FOUND('Batch not found'));
      }
      
      if (batch.status === 'Delivered' || batch.status === 'Cancelled') {
        console.log(`[Mobile Logistics] Invalid batch status: ${batch.status} for batch: ${batchId}`);
        
        // Log the validation error
        await logLogisticsOperation({
          operation_type: 'batch_invalid_status_for_assembly_add',
          user_id: userId,
          device_info: deviceInfo || {},
          request_details: {
            batch_id: batchId,
            assembly_barcode: assemblyBarcode,
            batch_status: batch.status,
            error: `Cannot add assemblies to a batch with status: ${batch.status}`
          },
          batch_id: batchId,
          status_code: 400
        });
        
        return next(ErrorTypes.VALIDATION(`Cannot add assemblies to a batch with status: ${batch.status}`));
      }
      
      // Find the assembly using the barcode
      const { data: barcodeData, error: barcodeError } = await supabase
        .from('assembly_barcodes')
        .select('assembly_id')
        .eq('barcode', assemblyBarcode)
        .single();
      
      if (barcodeError || !barcodeData) {
        console.log(`[Mobile Logistics] Assembly barcode not found: ${assemblyBarcode}`);
        
        // Log the error
        await logLogisticsOperation({
          operation_type: 'assembly_barcode_not_found',
          user_id: userId,
          device_info: deviceInfo || {},
          request_details: {
            batch_id: batchId,
            assembly_barcode: assemblyBarcode,
            error: 'Assembly barcode not found'
          },
          batch_id: batchId,
          status_code: 404
        });
        
        return next(ErrorTypes.NOT_FOUND('Assembly barcode not found'));
      }
      
      // Get assembly details
      const { data: assembly, error: assemblyError } = await supabase
        .from('assemblies')
        .select('id, name, status, project_id, weight, quantity')
        .eq('id', barcodeData.assembly_id)
        .single();
      
      if (assemblyError || !assembly) {
        console.log(`[Mobile Logistics] Assembly not found for barcode: ${assemblyBarcode}`);
        
        // Log the error
        await logLogisticsOperation({
          operation_type: 'assembly_not_found',
          user_id: userId,
          device_info: deviceInfo || {},
          request_details: {
            batch_id: batchId,
            assembly_barcode: assemblyBarcode,
            assembly_id: barcodeData.assembly_id,
            error: 'Assembly not found'
          },
          batch_id: batchId,
          status_code: 404
        });
        
        return next(ErrorTypes.NOT_FOUND('Assembly not found'));
      }
      
      // Verify the assembly belongs to the same project as the batch
      if (assembly.project_id !== batch.project_id) {
        console.log(`[Mobile Logistics] Project mismatch: Assembly project ${assembly.project_id} does not match batch project ${batch.project_id}`);
        
        // Log the validation error
        await logLogisticsOperation({
          operation_type: 'assembly_project_mismatch',
          user_id: userId,
          device_info: deviceInfo || {},
          request_details: {
            batch_id: batchId,
            assembly_id: assembly.id,
            assembly_project_id: assembly.project_id,
            batch_project_id: batch.project_id,
            error: 'Assembly belongs to a different project than the batch'
          },
          batch_id: batchId,
          assembly_id: assembly.id,
          status_code: 400
        });
        
        return next(ErrorTypes.VALIDATION('Assembly belongs to a different project than the batch'));
      }
      
      // Check if the assembly is already in this batch
      const { data: existingBatchAssembly, error: existingError } = await supabase
        .from('logistics_batch_assemblies')
        .select('id')
        .eq('batch_id', batchId)
        .eq('assembly_id', assembly.id)
        .maybeSingle();
      
      if (existingBatchAssembly) {
        console.log(`[Mobile Logistics] Assembly ${assembly.id} already in batch ${batchId}`);
        
        // Since this is a fairly common case, we'll return a more informative response
        // rather than treating it as an error
        res.status(200).json({
          data: {
            id: existingBatchAssembly.id,
            assembly_id: assembly.id,
            assembly_name: assembly.name,
            batch_id: batchId,
            status: 'Completed',
            already_added: true,
            message: 'Assembly was already in this batch'
          }
        });
        
        // Still log this as an event
        await logLogisticsOperation({
          operation_type: 'assembly_already_in_batch',
          user_id: userId,
          device_info: deviceInfo || {},
          request_details: {
            batch_id: batchId,
            assembly_id: assembly.id,
            assembly_name: assembly.name
          },
          batch_id: batchId,
          assembly_id: assembly.id,
          status_code: 200
        });
        
        return;
      }
      
      // Create recovery points in case any step fails
      let operationStep = 'starting';
      let batchAssembly = null;
      
      try {
        // Step 1: Add the assembly to the batch
        operationStep = 'adding_assembly_to_batch';
        const { data: newBatchAssembly, error: addError } = await supabase
          .from('logistics_batch_assemblies')
          .insert({
            batch_id: batchId,
            assembly_id: assembly.id,
            added_by: userId,
            assembly_status: 'Completed'
          })
          .select()
          .single();
        
        if (addError) {
          throw new Error(`Failed to add assembly to batch: ${addError.message}`);
        }
        
        batchAssembly = newBatchAssembly;
        
        // Step 2: Update the assembly status to 'Completed' if it's not already
        operationStep = 'updating_assembly_status';
        if (assembly.status !== 'Completed') {
          // Log the status change
          await supabase
            .from('assembly_status_logs')
            .insert({
              assembly_id: assembly.id,
              previous_status: assembly.status,
              new_status: 'Completed',
              updated_by: userId,
              device_info: deviceInfo || { 
                source: 'mobile',
                operation: 'logistics_scan',
                nfc_card: cardId
              }
            });
          
          // Update the status
          const { error: updateError } = await supabase
            .from('assemblies')
            .update({ status: 'Completed' })
            .eq('id', assembly.id);
          
          if (updateError) {
            console.warn(`[Mobile Logistics] Failed to update assembly status, but continuing: ${updateError.message}`);
          }
        }
        
        // Step 3: Recalculate batch total weight
        operationStep = 'recalculating_total_weight';
        const { data: assemblies } = await supabase
          .from('logistics_batch_assemblies')
          .select(`
            assembly_id,
            assemblies:assembly_id (weight, quantity)
          `)
          .eq('batch_id', batchId);
        
        if (assemblies && assemblies.length > 0) {
          const totalWeight = assemblies.reduce((sum, item) => {
            const weight = item.assemblies ? item.assemblies.weight || 0 : 0;
            const quantity = item.assemblies ? item.assemblies.quantity || 1 : 1;
            return sum + (weight * quantity);
          }, 0);
          
          // Update batch total weight
          const { error: weightError } = await supabase
            .from('logistics_batches')
            .update({ total_weight: totalWeight })
            .eq('id', batchId);
          
          if (weightError) {
            console.warn(`[Mobile Logistics] Failed to update total weight, but continuing: ${weightError.message}`);
          }
        }
        
        // Log the successful operation
        await logLogisticsOperation({
          operation_type: 'assembly_added_to_batch_success',
          user_id: userId,
          device_info: deviceInfo || {},
          request_details: {
            batch_id: batchId,
            batch_number: batch.batch_number,
            assembly_id: assembly.id,
            assembly_name: assembly.name,
            assembly_barcode: assemblyBarcode,
            duration_ms: Date.now() - startTime
          },
          batch_id: batchId,
          assembly_id: assembly.id,
          status_code: 200
        });
        
        console.log(`[Mobile Logistics] Successfully added assembly ${assembly.name} to batch ${batch.batch_number}`);
        
        // Return success response with assembly details
        res.status(201).json({
          data: {
            id: batchAssembly.id,
            assembly_id: assembly.id,
            assembly_name: assembly.name,
            batch_id: batchId,
            status: 'Completed',
            message: 'Assembly added to batch successfully'
          }
        });
      } catch (innerError) {
        console.error(`[Mobile Logistics] Error during operation step '${operationStep}':`, innerError);
        
        // Log the error for this specific step
        await logLogisticsOperation({
          operation_type: 'assembly_add_step_failure',
          user_id: userId,
          device_info: deviceInfo || {},
          request_details: {
            batch_id: batchId,
            assembly_id: assembly.id,
            operation_step: operationStep,
            error: innerError.message || 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? innerError.stack : undefined
          },
          batch_id: batchId,
          assembly_id: assembly.id,
          status_code: 500
        });
        
        // If we managed to add the assembly but a later step failed, return partial success
        if (operationStep !== 'adding_assembly_to_batch' && batchAssembly) {
          res.status(207).json({
            data: {
              id: batchAssembly.id,
              assembly_id: assembly.id,
              assembly_name: assembly.name,
              batch_id: batchId,
              status: 'Completed',
              partial_success: true,
              message: 'Assembly added to batch, but some processing steps failed'
            },
            warning: `Operation partially successful. Step '${operationStep}' failed: ${innerError.message}`
          });
        } else {
          // Otherwise, treat it as a full failure
          throw innerError; // Re-throw to be caught by the outer catch block
        }
      }
    } catch (error) {
      console.error(`[Mobile Logistics] Error adding assembly to batch:`, error);
      
      // Log the unexpected error
      await logLogisticsOperation({
        operation_type: 'assembly_add_to_batch_error',
        user_id: userId,
        device_info: deviceInfo || {},
        request_details: {
          batch_id: batchId,
          assembly_barcode: assemblyBarcode,
          error: error.message || 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        status_code: 500
      });
      
      next(error);
    }
  },
  
  // Get all assemblies in a batch
    getBatchAssemblies: async (req, res, next) => {
    const startTime = Date.now();
    const { batchId } = req.params;
    const userId = req.user?.id;
    // For GET requests, only use query parameters to avoid body parsing issues
    const deviceInfo = req.method === 'GET' ? req.query?.deviceInfo || {} : req.body?.deviceInfo || req.query?.deviceInfo || {};
    
    try {
        console.log(`[Mobile Logistics] Getting assemblies for batch: ${batchId} by user: ${userId}`);
        
        // Verify batch exists with a simplified query
        const { data: batch, error: batchError } = await supabase
        .from('logistics_batches')
        .select('id, batch_number, status, project_id, total_weight')
        .eq('id', batchId)
        .single();
        
        if (batchError || !batch) {
        console.log(`[Mobile Logistics] Batch not found: ${batchId}`);
        
        // Log the error
        await logLogisticsOperation({
            operation_type: 'batch_not_found_for_list',
            user_id: userId,
            device_info: deviceInfo,
            request_details: {
            batch_id: batchId,
            error: 'Batch not found'
            },
            status_code: 404
        });
        
        return next(ErrorTypes.NOT_FOUND('Batch not found'));
        }
        
        // Get client info separately if needed
        let clientName = 'Unknown Client';
        try {
        if (batch.client_id) {
            const { data: client } = await supabase
            .from('clients')
            .select('company_name')
            .eq('id', batch.client_id)
            .single();
            
            if (client) {
            clientName = client.company_name;
            }
        }
        } catch (clientError) {
        console.warn(`[Mobile Logistics] Error fetching client info:`, clientError);
        // Non-critical, continue with default
        }
        
        // Get batch assemblies with a simple query (no joins)
        const { data: batchAssemblies, error: assembliesError } = await supabase
        .from('logistics_batch_assemblies')
        .select('id, assembly_id, added_at, added_by')
        .eq('batch_id', batchId)
        .order('added_at', { ascending: false });
        
        if (assembliesError) {
        console.error(`[Mobile Logistics] Error fetching assemblies:`, assembliesError);
        
        // Log the error
        await logLogisticsOperation({
            operation_type: 'error_fetching_batch_assemblies',
            user_id: userId,
            device_info: deviceInfo,
            request_details: {
            batch_id: batchId,
            error: assembliesError.message || 'Error fetching batch assemblies'
            },
            batch_id: batchId,
            status_code: 500
        });
        
        return next(ErrorTypes.SERVER_ERROR(assembliesError.message));
        }
        
        // Default to empty array if null or undefined
        const formattedAssemblies = [];
        
        // Only process if we have assemblies
        if (batchAssemblies && batchAssemblies.length > 0) {
        // Fetch assembly details one by one to isolate errors
        for (const item of batchAssemblies) {
            try {
            const { data: assembly } = await supabase
                .from('assemblies')
                .select('name, weight, quantity, width, height, length, painting_spec, parent_id, child_number')
                .eq('id', item.assembly_id)
                .single();
            
            // Default values for user info
            let userName = 'Unknown User';
            
            // Only try to get user info if we have an added_by id
            if (item.added_by) {
                try {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('full_name')
                    .eq('auth_user_id', item.added_by)
                    .single();
                
                if (profile && profile.full_name) {
                    userName = profile.full_name;
                }
                } catch (userError) {
                // Non-critical, continue with default
                console.warn(`[Mobile Logistics] Error fetching user info:`, userError);
                }
            }
            
            // Add to formatted list with safe defaults
            formattedAssemblies.push({
                id: item.id,
                assembly_id: item.assembly_id,
                name: assembly?.name || 'Unknown Assembly',
                weight: assembly?.weight || 0,
                quantity: assembly?.quantity || 1,
                dimensions: {
                width: assembly?.width || null,
                height: assembly?.height || null,
                length: assembly?.length || null
                },
                painting_spec: assembly?.painting_spec || null,
                is_child: assembly?.parent_id ? true : false,
                child_number: assembly?.child_number || null,
                status: 'Completed', // Default status
                added_at: item.added_at,
                added_by: {
                id: item.added_by,
                name: userName
                }
            });
            } catch (assemblyError) {
            console.warn(`[Mobile Logistics] Error processing assembly ${item.assembly_id}:`, assemblyError);
            // Skip this assembly but continue with others
            }
        }
        }
        
        // Log successful retrieval
        await logLogisticsOperation({
        operation_type: 'batch_assemblies_listed_success',
        user_id: userId,
        device_info: deviceInfo,
        request_details: {
            batch_id: batchId,
            batch_number: batch.batch_number,
            assembly_count: formattedAssemblies.length,
            duration_ms: Date.now() - startTime
        },
        batch_id: batchId,
        status_code: 200
        });
        
        console.log(`[Mobile Logistics] Successfully retrieved ${formattedAssemblies.length} assemblies for batch: ${batch.batch_number}`);
        
        // Return response
        res.json({
        data: {
            batch_id: batchId,
            batch_number: batch.batch_number,
            client: clientName,
            status: batch.status,
            total_weight: batch.total_weight || 0,
            assembly_count: formattedAssemblies.length,
            assemblies: formattedAssemblies
        }
        });
    } catch (error) {
        console.error(`[Mobile Logistics] Error getting batch assemblies:`, error);
        
        // Log the unexpected error
        await logLogisticsOperation({
        operation_type: 'get_batch_assemblies_error',
        user_id: userId,
        device_info: deviceInfo,
        request_details: {
            batch_id: batchId,
            error: error.message || 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        status_code: 500
        });
        
        next(error);
    }
    },
  
  // Remove assembly from batch
  removeAssemblyFromBatch: async (req, res, next) => {
    const startTime = Date.now();
    const { batchAssemblyId } = req.params;
    const userId = req.user?.id;
    const deviceInfo = req.body?.deviceInfo || {};
    
    try {
      console.log(`[Mobile Logistics] Removing batch assembly: ${batchAssemblyId} by user: ${userId}`);
      
      // Verify batch assembly exists and get related information
      const { data: batchAssembly, error: getError } = await supabase
        .from('logistics_batch_assemblies')
        .select(`
          id, 
          batch_id, 
          assembly_id,
          logistics_batches:batch_id (batch_number, status),
          assemblies:assembly_id (name)
        `)
        .eq('id', batchAssemblyId)
        .single();
      
      if (getError || !batchAssembly) {
        console.log(`[Mobile Logistics] Batch assembly not found: ${batchAssemblyId}`);
        
        // Log the error
        await logLogisticsOperation({
          operation_type: 'batch_assembly_not_found',
          user_id: userId,
          device_info: deviceInfo,
          request_details: {
            batch_assembly_id: batchAssemblyId,
            error: 'Batch assembly not found'
          },
          status_code: 404
        });
        
        return next(ErrorTypes.NOT_FOUND('Batch assembly not found'));
      }
      
      // Check if the batch is in a valid status for removing assemblies
      const batchStatus = batchAssembly.logistics_batches?.status;
      if (batchStatus === 'Delivered' || batchStatus === 'Cancelled') {
        console.log(`[Mobile Logistics] Cannot remove assembly from batch with status: ${batchStatus}`);
        
        // Log the validation error
        await logLogisticsOperation({
          operation_type: 'batch_invalid_status_for_remove',
          user_id: userId,
          device_info: deviceInfo,
          request_details: {
            batch_assembly_id: batchAssemblyId,
            batch_id: batchAssembly.batch_id,
            batch_status: batchStatus,
            error: `Cannot remove assemblies from a batch with status: ${batchStatus}`
          },
          batch_id: batchAssembly.batch_id,
          assembly_id: batchAssembly.assembly_id,
          status_code: 400
        });
        
        return next(ErrorTypes.VALIDATION(`Cannot remove assemblies from a batch with status: ${batchStatus}`));
      }
      
      // Create recovery points in case any step fails
      let operationStep = 'starting';
      
      try {
        // Step 1: Remove the assembly from the batch
        operationStep = 'removing_assembly_from_batch';
        const { error: removeError } = await supabase
          .from('logistics_batch_assemblies')
          .delete()
          .eq('id', batchAssemblyId);
        
        if (removeError) {
          throw new Error(`Failed to remove assembly from batch: ${removeError.message}`);
        }
        
        // Step 2: Recalculate batch total weight
        operationStep = 'recalculating_total_weight';
        const { data: assemblies } = await supabase
          .from('logistics_batch_assemblies')
          .select(`
            assembly_id,
            assemblies:assembly_id (weight, quantity)
          `)
          .eq('batch_id', batchAssembly.batch_id);
        
        const totalWeight = (assemblies && assemblies.length > 0) 
          ? assemblies.reduce((sum, item) => {
              const weight = item.assemblies ? item.assemblies.weight || 0 : 0;
              const quantity = item.assemblies ? item.assemblies.quantity || 1 : 1;
              return sum + (weight * quantity);
            }, 0)
          : 0;
        
        // Update batch total weight
        const { error: weightError } = await supabase
          .from('logistics_batches')
          .update({ total_weight: totalWeight })
          .eq('id', batchAssembly.batch_id);
        
        if (weightError) {
          console.warn(`[Mobile Logistics] Failed to update total weight, but continuing: ${weightError.message}`);
        }
        
        // Log the successful operation
        await logLogisticsOperation({
          operation_type: 'assembly_removed_from_batch_success',
          user_id: userId,
          device_info: deviceInfo,
          request_details: {
            batch_assembly_id: batchAssemblyId,
            batch_id: batchAssembly.batch_id,
            batch_number: batchAssembly.logistics_batches?.batch_number,
            assembly_id: batchAssembly.assembly_id,
            assembly_name: batchAssembly.assemblies?.name,
            duration_ms: Date.now() - startTime
          },
          batch_id: batchAssembly.batch_id,
          assembly_id: batchAssembly.assembly_id,
          status_code: 200
        });
        
        console.log(`[Mobile Logistics] Successfully removed assembly ${batchAssembly.assemblies?.name} from batch ${batchAssembly.logistics_batches?.batch_number}`);
        
        // Return success response
        res.json({
          data: {
            id: batchAssemblyId,
            batch_id: batchAssembly.batch_id,
            assembly_id: batchAssembly.assembly_id,
            assembly_name: batchAssembly.assemblies?.name,
            message: 'Assembly removed from batch successfully',
            assemblies_remaining: assemblies ? assemblies.length : 0
          }
        });
      } catch (innerError) {
        console.error(`[Mobile Logistics] Error during operation step '${operationStep}':`, innerError);
        
        // Log the error for this specific step
        await logLogisticsOperation({
          operation_type: 'assembly_remove_step_failure',
          user_id: userId,
          device_info: deviceInfo,
          request_details: {
            batch_assembly_id: batchAssemblyId,
            batch_id: batchAssembly.batch_id,
            assembly_id: batchAssembly.assembly_id,
            operation_step: operationStep,
            error: innerError.message || 'Unknown error'
          },
          batch_id: batchAssembly.batch_id,
          assembly_id: batchAssembly.assembly_id,
          status_code: 500
        });
        
        throw innerError;
      }
    } catch (error) {
      console.error(`[Mobile Logistics] Error removing assembly from batch:`, error);
      
      // Log the unexpected error
      await logLogisticsOperation({
        operation_type: 'remove_assembly_from_batch_error',
        user_id: userId,
        device_info: deviceInfo,
        request_details: {
          batch_assembly_id: batchAssemblyId,
          error: error.message || 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        status_code: 500
      });
      
      next(error);
    }
  }
};