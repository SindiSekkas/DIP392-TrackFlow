// src/lib/logisticsApi.ts
import { supabase } from './supabase';
import { Assembly } from './projectsApi';

// Type for shipping company
export interface ShippingCompany {
  id?: string;
  name: string;
  contact_info?: string;
  active?: boolean;
  created_at?: string;
}

// Type for logistics batch
export interface LogisticsBatch {
  id?: string;
  batch_number: string;
  client_id: string;
  project_id: string;
  shipping_company_id: string;
  delivery_address: string;
  total_weight?: number;
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Cancelled';
  shipment_date?: string | Date | null;
  estimated_arrival?: string | Date | null;
  actual_arrival?: string | Date | null;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  
  // Join fields
  client?: {
    company_name: string;
  };
  project?: {
    name: string;
    internal_number: string;
  };
  shipping_company?: {
    name: string;
  };
}

// Type for batch assembly
export interface BatchAssembly {
  id?: string;
  batch_id: string;
  assembly_id: string;
  added_at?: string;
  added_by?: string;
  assembly_status: string;
  
  // Join fields
  assembly?: Assembly;
}

// Type for logistics document
export interface LogisticsDocument {
  id?: string;
  batch_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  uploaded_at?: string;
  uploaded_by?: string;
}

// Helper function to clean batch data before sending to API
const cleanBatchData = (batch: LogisticsBatch): LogisticsBatch => {
  // Ensure dates are properly formatted or null
  return {
    ...batch,
    shipment_date: batch.shipment_date || null,
    estimated_arrival: batch.estimated_arrival || null,
    actual_arrival: batch.actual_arrival || null
  };
};

// API for working with logistics batches
export const logisticsApi = {
  // Get all logistics batches
  getBatches: async (): Promise<LogisticsBatch[]> => {
    const { data, error } = await supabase
      .from('logistics_batches')
      .select(`
        *,
        client:client_id (company_name),
        project:project_id (name, internal_number),
        shipping_company:shipping_company_id (name)
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as LogisticsBatch[];
  },
  
  // Get batch by ID
  getBatch: async (id: string): Promise<LogisticsBatch> => {
    const { data, error } = await supabase
      .from('logistics_batches')
      .select(`
        *,
        client:client_id (company_name),
        project:project_id (name, internal_number),
        shipping_company:shipping_company_id (name)
      `)
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data as LogisticsBatch;
  },
  
  // Create batch
  createBatch: async (batch: LogisticsBatch): Promise<LogisticsBatch> => {
    // Generate a batch number if not provided
    if (!batch.batch_number) {
      batch.batch_number = `B${Date.now().toString(36).toUpperCase()}`;
    }
    
    // Clean the data to ensure proper format
    const cleanedBatch = cleanBatchData(batch);
    
    const { data, error } = await supabase
      .from('logistics_batches')
      .insert(cleanedBatch)
      .select()
      .single();
      
    if (error) throw error;
    return data as LogisticsBatch;
  },
  
  // Update batch
  updateBatch: async (id: string, batch: Partial<LogisticsBatch>): Promise<LogisticsBatch> => {
    // Clean the data to ensure proper format
    const cleanedBatch = cleanBatchData(batch as LogisticsBatch);
    
    const { data, error } = await supabase
      .from('logistics_batches')
      .update(cleanedBatch)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data as LogisticsBatch;
  },
  
  // Delete batch
  deleteBatch: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('logistics_batches')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },
  
  // Get all shipping companies
  getShippingCompanies: async (): Promise<ShippingCompany[]> => {
    const { data, error } = await supabase
      .from('shipping_companies')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) throw error;
    return data as ShippingCompany[];
  },
  
  // Search shipping companies by name (for autocomplete)
  searchShippingCompanies: async (query: string): Promise<ShippingCompany[]> => {
    if (!query || query.length < 2) return [];
    
    const { data, error } = await supabase
      .from('shipping_companies')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });
      
    if (error) throw error;
    return data as ShippingCompany[];
  },
  
  // Create a new shipping company
  createShippingCompany: async (name: string, contact_info?: string): Promise<ShippingCompany> => {
    const { data, error } = await supabase
      .from('shipping_companies')
      .insert({
        name: name.trim(),
        contact_info: contact_info || '',
        active: true
      })
      .select()
      .single();
      
    if (error) throw error;
    return data as ShippingCompany;
  },
  
  // Get assemblies for a batch
  getBatchAssemblies: async (batchId: string): Promise<BatchAssembly[]> => {
    const { data, error } = await supabase
      .from('logistics_batch_assemblies')
      .select(`
        *,
        assembly:assembly_id (
          id, name, weight, quantity, status,
          project_id, width, height, length
        )
      `)
      .eq('batch_id', batchId)
      .order('added_at', { ascending: false });
      
    if (error) throw error;
    return data as BatchAssembly[];
  },
  
  // Add assembly to batch
  addAssemblyToBatch: async (batchAssembly: BatchAssembly): Promise<BatchAssembly> => {
    const { data, error } = await supabase
      .from('logistics_batch_assemblies')
      .insert(batchAssembly)
      .select()
      .single();
      
    if (error) throw error;
    return data as BatchAssembly;
  },
  
  // Remove assembly from batch
  removeAssemblyFromBatch: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('logistics_batch_assemblies')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },
  
  // Update assembly status in batch
  updateAssemblyStatus: async (id: string, status: string): Promise<BatchAssembly> => {
    const { data, error } = await supabase
      .from('logistics_batch_assemblies')
      .update({ assembly_status: status })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data as BatchAssembly;
  },
  
  // Get documents for a batch
  getBatchDocuments: async (batchId: string): Promise<LogisticsDocument[]> => {
    const { data, error } = await supabase
      .from('logistics_documents')
      .select('*')
      .eq('batch_id', batchId)
      .order('uploaded_at', { ascending: false });
      
    if (error) throw error;
    return data as LogisticsDocument[];
  },
  
  // Upload document for a batch
  uploadBatchDocument: async (
    batchId: string,
    file: File
  ): Promise<LogisticsDocument> => {
    const bucketName = 'files';
    
    // Generate a unique file path
    const filePath = `logistics-documents/${batchId}/${Date.now()}_${file.name}`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }
    
    // Create record in logistics_documents table
    const documentRecord = {
      batch_id: batchId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      content_type: file.type
    };
    
    const { data: recordData, error: recordError } = await supabase
      .from('logistics_documents')
      .insert(documentRecord)
      .select()
      .single();
    
    if (recordError) {
      console.error('Database record error:', recordError);
      throw recordError;
    }
    
    return recordData as LogisticsDocument;
  },
  
  // Delete document
  deleteDocument: async (id: string): Promise<void> => {
    // First get the document to get the file path
    const { data: document, error: getError } = await supabase
      .from('logistics_documents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (getError) throw getError;
    
    // Delete from storage
    const { error: storageError } = await supabase
      .storage
      .from('files')
      .remove([document.file_path]);
    
    if (storageError) throw storageError;
    
    // Delete record
    const { error: deleteError } = await supabase
      .from('logistics_documents')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
  },
  
  // Find assemblies by barcode
  findAssemblyByBarcode: async (barcode: string): Promise<Assembly | null> => {
    const { data: barcodeData, error: barcodeError } = await supabase
      .from('assembly_barcodes')
      .select('assembly_id')
      .eq('barcode', barcode)
      .maybeSingle();
    
    if (barcodeError || !barcodeData) return null;
    
    const { data: assembly, error: assemblyError } = await supabase
      .from('assemblies')
      .select(`
        id, name, weight, quantity, status,
        project_id, width, height, length
      `)
      .eq('id', barcodeData.assembly_id)
      .single();
    
    if (assemblyError) return null;
    return assembly as Assembly;
  }
};