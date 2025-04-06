// src/controllers/assemblyBarcodeController.js
import supabase from '../utils/supabase.js';
import { ErrorTypes } from '../utils/errorHandler.js';
import crypto from 'crypto';

// Generate a unique barcode
const generateBarcode = (prefix = 'ASM') => {
  // Create a random code with timestamp to ensure uniqueness
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
};

export const assemblyBarcodeController = {
  // Get assembly details by barcode
  getAssemblyByBarcode: async (req, res, next) => {
    try {
      const { barcode } = req.params;
      
      // Find the assembly linked to this barcode
      const { data: barcodeData, error: barcodeError } = await supabase
        .from('assembly_barcodes')
        .select('assembly_id')
        .eq('barcode', barcode)
        .single();
      
      if (barcodeError || !barcodeData) {
        return next(ErrorTypes.NOT_FOUND('Barcode not found'));
      }
      
      // Get assembly details
      const { data: assembly, error: assemblyError } = await supabase
        .from('assemblies')
        .select(`
          id,
          name,
          project_id,
          weight,
          quantity,
          status,
          painting_spec,
          width,
          height,
          length,
          projects(
            name,
            internal_number,
            client
          )
        `)
        .eq('id', barcodeData.assembly_id)
        .single();
      
      if (assemblyError || !assembly) {
        return next(ErrorTypes.NOT_FOUND('Assembly not found'));
      }
      
      res.json({
        data: {
          id: assembly.id,
          name: assembly.name,
          projectId: assembly.project_id,
          projectName: assembly.projects.name,
          projectNumber: assembly.projects.internal_number,
          client: assembly.projects.client,
          weight: assembly.weight,
          quantity: assembly.quantity,
          status: assembly.status,
          paintingSpec: assembly.painting_spec,
          dimensions: {
            width: assembly.width,
            height: assembly.height,
            length: assembly.length
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  // Generate and assign barcode to assembly
  generateBarcode: async (req, res, next) => {
    try {
      const { assemblyId, customBarcode } = req.body;
      
      // Verify assembly exists
      const { data: assembly, error: assemblyError } = await supabase
        .from('assemblies')
        .select('id, name')
        .eq('id', assemblyId)
        .single();
      
      if (assemblyError || !assembly) {
        return next(ErrorTypes.NOT_FOUND('Assembly not found'));
      }
      
      // Check if assembly already has a barcode
      const { data: existingBarcode } = await supabase
        .from('assembly_barcodes')
        .select('id, barcode')
        .eq('assembly_id', assemblyId)
        .maybeSingle();
      
      if (existingBarcode) {
        return res.json({
          data: existingBarcode,
          message: 'Assembly already has a barcode assigned'
        });
      }
      
      // Generate or use custom barcode
      const barcode = customBarcode || generateBarcode();
      
      // Create barcode record
      const { data: newBarcode, error: barcodeError } = await supabase
        .from('assembly_barcodes')
        .insert({
          assembly_id: assemblyId,
          barcode: barcode
        })
        .select()
        .single();
      
      if (barcodeError) {
        return next(ErrorTypes.SERVER_ERROR(barcodeError.message));
      }
      
      res.status(201).json({
        data: newBarcode,
        message: 'Barcode generated and assigned to assembly'
      });
    } catch (error) {
      next(error);
    }
  },
  
  // Get all barcodes (admin/manager)
  getBarcodes: async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('assembly_barcodes')
        .select(`
          id,
          barcode,
          assembly_id,
          created_at,
          assemblies(
            name,
            project_id,
            projects(
              name
            )
          )
        `);
      
      if (error) {
        return next(ErrorTypes.SERVER_ERROR(error.message));
      }
      
      // Format the response
      const barcodes = data.map(item => ({
        id: item.id,
        barcode: item.barcode,
        assemblyId: item.assembly_id,
        assemblyName: item.assemblies.name,
        projectId: item.assemblies.project_id,
        projectName: item.assemblies.projects.name,
        createdAt: item.created_at
      }));
      
      res.json({ data: barcodes });
    } catch (error) {
      next(error);
    }
  }
};