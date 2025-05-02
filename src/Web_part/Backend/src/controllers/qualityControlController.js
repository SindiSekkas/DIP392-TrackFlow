// src/controllers/qualityControlController.js
import supabase from '../utils/supabase.js';
import { ErrorTypes } from '../utils/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

export const qualityControlController = {
  // Upload QC image and update QC status
  uploadQCImage: async (req, res, next) => {
    try {
      const { assemblyId } = req.params;
      const { qcStatus, notes } = req.body;
      const userId = req.user.id;
      const deviceInfo = req.body.deviceInfo || {};
      const image = req.file;
      
      if (!assemblyId) {
        return next(ErrorTypes.VALIDATION('Assembly ID is required'));
      }
      
      // Verify assembly exists
      const { data: assembly, error: assemblyError } = await supabase
        .from('assemblies')
        .select('id, status')
        .eq('id', assemblyId)
        .single();
      
      if (assemblyError || !assembly) {
        return next(ErrorTypes.NOT_FOUND('Assembly not found'));
      }
      
      // Start a transaction
      let qcImageRecord = null;
      
      // If there's an image, upload it first
      if (image) {
        const bucketName = 'files';
        const filePath = `qc-images/${assemblyId}/${Date.now()}_${image.originalname}`;
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase
          .storage
          .from(bucketName)
          .upload(filePath, image.buffer, {
            contentType: image.mimetype,
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          return next(ErrorTypes.SERVER_ERROR('Failed to upload image: ' + uploadError.message));
        }
        
        // Create QC image record
        const { data: qcImage, error: qcImageError } = await supabase
          .from('assembly_qc_images')
          .insert({
            assembly_id: assemblyId,
            image_path: filePath,
            file_name: image.originalname,
            file_size: image.size,
            content_type: image.mimetype,
            notes: notes,
            qc_status: qcStatus,
            created_by: userId
          })
          .select()
          .single();
          
        if (qcImageError) {
          return next(ErrorTypes.SERVER_ERROR('Failed to create QC image record: ' + qcImageError.message));
        }
        
        qcImageRecord = qcImage;
      }
      
      // Important: We no longer update assembly QC status based on image upload
      // This keeps the overall assembly QC notes separate from individual image notes
      
      // Log the quality control check
      await supabase
        .from('mobile_operations_log')
        .insert({
          operation_type: 'quality_control',
          user_id: userId,
          device_info: deviceInfo,
          request_details: {
            assembly_id: assemblyId,
            qc_status: qcStatus,
            has_image: !!image
          },
          assembly_id: assemblyId,
          status_code: 200
        });
      
      res.status(201).json({
        data: {
          assembly_id: assemblyId,
          qc_status: qcStatus,
          qc_image: qcImageRecord,
          message: 'QC image uploaded successfully'
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  // New method to update assembly QC notes and status
  updateAssemblyQCNotes: async (req, res, next) => {
    try {
      const { assemblyId } = req.params;
      const { qcStatus, notes } = req.body;
      const userId = req.user.id;
      
      if (!assemblyId) {
        return next(ErrorTypes.VALIDATION('Assembly ID is required'));
      }
      
      // Verify assembly exists
      const { data: assembly, error: assemblyError } = await supabase
        .from('assemblies')
        .select('id, status, quality_control_status, quality_control_notes')
        .eq('id', assemblyId)
        .single();
      
      if (assemblyError || !assembly) {
        return next(ErrorTypes.NOT_FOUND('Assembly not found'));
      }
      
      // Update assembly QC notes and status
      const { data: updatedAssembly, error: updateError } = await supabase
        .from('assemblies')
        .update({
          quality_control_status: qcStatus,
          quality_control_notes: notes
        })
        .eq('id', assemblyId)
        .select()
        .single();
        
      if (updateError) {
        return next(ErrorTypes.SERVER_ERROR('Failed to update QC notes: ' + updateError.message));
      }
      
      // Log the quality control update
      await supabase
        .from('mobile_operations_log')
        .insert({
          operation_type: 'update_qc_notes',
          user_id: userId,
          request_details: {
            assembly_id: assemblyId,
            previous_qc_status: assembly.quality_control_status,
            new_qc_status: qcStatus
          },
          assembly_id: assemblyId,
          status_code: 200
        });
      
      res.json({
        data: {
          assembly_id: assemblyId,
          quality_control_status: updatedAssembly.quality_control_status,
          quality_control_notes: updatedAssembly.quality_control_notes,
          message: 'Quality control notes updated successfully'
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  // Get QC images for an assembly
  getQCImages: async (req, res, next) => {
    try {
      const { assemblyId } = req.params;
      
      // Get all QC images for this assembly
      const { data: qcImages, error: qcImagesError } = await supabase
        .from('assembly_qc_images')
        .select(`
          id,
          assembly_id,
          image_path,
          file_name,
          file_size,
          content_type,
          notes,
          qc_status,
          created_by,
          created_at
        `)
        .eq('assembly_id', assemblyId)
        .order('created_at', { ascending: false });
        
      if (qcImagesError) {
        return next(ErrorTypes.SERVER_ERROR('Failed to fetch QC images: ' + qcImagesError.message));
      }
      
      // Generate URLs for the images
      const imagesWithUrls = await Promise.all(qcImages.map(async (image) => {
        const { data: urlData } = supabase
          .storage
          .from('files')
          .getPublicUrl(image.image_path);
          
        // Get user info
        const { data: userData } = await supabase.auth.admin.getUserById(image.created_by);
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('auth_user_id', image.created_by)
          .maybeSingle();
          
        return {
          ...image,
          image_url: urlData.publicUrl,
          created_by_info: {
            id: image.created_by,
            email: userData?.user?.email || 'Unknown',
            name: profile?.full_name || 'Unknown User'
          }
        };
      }));
      
      res.json({
        data: imagesWithUrls
      });
    } catch (error) {
      next(error);
    }
  },
  
  // Delete a QC image
  deleteQCImage: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Get the image record first
      const { data: image, error: getError } = await supabase
        .from('assembly_qc_images')
        .select('*')
        .eq('id', id)
        .single();
        
      if (getError || !image) {
        return next(ErrorTypes.NOT_FOUND('QC image not found'));
      }
      
      // Delete from storage
      const { error: storageError } = await supabase
        .storage
        .from('files')
        .remove([image.image_path]);
        
      if (storageError) {
        return next(ErrorTypes.SERVER_ERROR('Failed to delete image file: ' + storageError.message));
      }
      
      // Delete the record
      const { error: deleteError } = await supabase
        .from('assembly_qc_images')
        .delete()
        .eq('id', id);
        
      if (deleteError) {
        return next(ErrorTypes.SERVER_ERROR('Failed to delete QC image record: ' + deleteError.message));
      }
      
      res.json({
        message: 'QC image deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};