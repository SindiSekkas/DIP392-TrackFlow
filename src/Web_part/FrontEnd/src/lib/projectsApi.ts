// src/lib/projectsApi.ts
import { supabase } from './supabase';

// Types
export interface Project {
  id?: string;
  name: string;
  internal_number: string;
  client: string;
  client_representative?: string;
  project_start: string | Date;
  project_end: string | Date;
  delivery_date?: string | Date | null; 
  delivery_location?: string;
  total_weight?: number;
  status: 'Planning' | 'In Production' | 'Completed' | 'Cancelled';
  responsible_manager: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Assembly {
  id?: string;
  project_id: string;
  name: string;
  weight: number;
  quantity: number;
  width?: number | null;
  height?: number | null;
  length?: number | null;
  painting_spec?: string | null;
  status: 'Waiting' | 'In Production' | 'Welding' | 'Painting' | 'Completed';
  start_date?: string | Date | null;
  end_date?: string | Date | null;
  quality_control_status?: string | null;
  quality_control_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  parent_id?: string | null;  
  is_parent?: boolean;        
  original_quantity?: number; 
  child_number?: number;      
  children?: Assembly[];     
  expanded?: boolean;       
}

export interface AssemblyWithProject extends Assembly {
  project?: Project;
}

export interface AssemblyDrawing {
  id?: string;
  assembly_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  uploaded_at?: string;
  // Fields for inheritance tracking
  inherited_from_parent?: boolean;
  parent_id?: string;
}

export interface ProjectDrawing {
  id?: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  uploaded_at?: string;
}

// API for working with projects
export const projectsApi = {
  // Get all projects
  getProjects: async (): Promise<Project[]> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as Project[];
  },
  
  // Get project by ID
  getProject: async (id: string): Promise<Project> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data as Project;
  },
  
  // Create project
  createProject: async (project: Project): Promise<Project> => {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
      
    if (error) throw error;
    return data as Project;
  },
  
  // Update project
  updateProject: async (id: string, project: Partial<Project>): Promise<Project> => {
    const { data, error } = await supabase
      .from('projects')
      .update(project)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data as Project;
  },
  
  // Delete project
  deleteProject: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },
  
  // Upload project drawing
  uploadProjectDrawing: async (
    projectId: string, 
    file: File
  ): Promise<ProjectDrawing> => {
    const bucketName = 'files'; // Should be created manually in Supabase dashboard
    
    // Generate a unique file path
    const filePath = `project-drawings/${projectId}/${Date.now()}_${file.name}`;
    
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
    
    // Create record in project_drawings table
    const drawingRecord: Omit<ProjectDrawing, 'id'> = {
      project_id: projectId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      content_type: file.type
    };
    
    const { data: recordData, error: recordError } = await supabase
      .from('project_drawings')
      .insert(drawingRecord)
      .select()
      .single();
    
    if (recordError) {
      console.error('Database record error:', recordError);
      throw recordError;
    }
    
    return recordData as ProjectDrawing;
  },
  
  // Get project drawings
  getProjectDrawings: async (projectId: string): Promise<ProjectDrawing[]> => {
    const { data, error } = await supabase
      .from('project_drawings')
      .select('*')
      .eq('project_id', projectId);
      
    if (error) throw error;
    return data as ProjectDrawing[];
  },
  
  // Delete project drawing
  deleteProjectDrawing: async (drawingId: string): Promise<void> => {
    // First get the drawing to get the file path
    const { data: drawing, error: getError } = await supabase
      .from('project_drawings')
      .select('*')
      .eq('id', drawingId)
      .single();
    
    if (getError) throw getError;
    
    // Delete from storage
    const { error: storageError } = await supabase
      .storage
      .from('files')
      .remove([drawing.file_path]);
    
    if (storageError) throw storageError;
    
    // Delete record
    const { error: deleteError } = await supabase
      .from('project_drawings')
      .delete()
      .eq('id', drawingId);
    
    if (deleteError) throw deleteError;
  }
};

// Assemblies API
export const assembliesApi = {
  // Get all assemblies
  getAssemblies: async (): Promise<Assembly[]> => {
    const { data, error } = await supabase
      .from('assemblies')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as Assembly[];
  },
  
  // Get assemblies by project
  getAssembliesByProject: async (projectId: string): Promise<Assembly[]> => {
    const { data, error } = await supabase
      .from('assemblies')
      .select('*')
      .eq('project_id', projectId)
      .is('parent_id', null) // Only get top-level assemblies
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as Assembly[];
  },
  
  // Get assembly with project details
  getAssemblyWithProject: async (id: string): Promise<AssemblyWithProject> => {
    const { data, error } = await supabase
      .from('assemblies')
      .select(`
        *,
        project:project_id (
          id,
          name,
          internal_number
        )
      `)
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data as AssemblyWithProject;
  },
  
  // Get assembly by id
  getAssembly: async (id: string): Promise<Assembly> => {
    const { data, error } = await supabase
      .from('assemblies')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data as Assembly;
  },
  
  // Create assembly
  createAssembly: async (assembly: Assembly): Promise<Assembly> => {
    try {
      // Determine if this should be a parent assembly
      const shouldCreateChildren = assembly.quantity > 1;
      
      if (shouldCreateChildren) {
        // Create parent assembly
        const parentAssembly = {
          ...assembly,
          is_parent: true,
          original_quantity: assembly.quantity, // Store original quantity
          quantity: assembly.quantity // Keep the original quantity for reference
        };
        
        // Create the parent assembly record
        const { data: parentData, error: parentError } = await supabase
          .from('assemblies')
          .insert(parentAssembly)
          .select()
          .single();
          
        if (parentError) throw parentError;
        
        // Create child assemblies
        const childPromises = Array.from({ length: assembly.quantity }).map(async (_, index) => {
          const childNumber = index + 1;
          const childAssembly = {
            project_id: assembly.project_id,
            name: `${assembly.name}-${childNumber}`,
            weight: assembly.weight,
            quantity: 1,  // Child assemblies always have quantity 1
            width: assembly.width,
            height: assembly.height,
            length: assembly.length,
            painting_spec: assembly.painting_spec,
            status: assembly.status,
            start_date: assembly.start_date,
            end_date: assembly.end_date,
            quality_control_status: assembly.quality_control_status,
            quality_control_notes: assembly.quality_control_notes,
            parent_id: parentData.id,
            is_parent: false,
            child_number: childNumber
          };
          
          // Create child assembly
          const { data: childData, error: childError } = await supabase
            .from('assemblies')
            .insert(childAssembly)
            .select()
            .single();
            
          if (childError) throw childError;
          
          // Generate barcode for the child
          try {
            await supabase
              .from('assembly_barcodes')
              .insert({
                assembly_id: childData.id,
                barcode: `ASM-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase()
              });
          } catch (barcodeError) {
            console.error(`Barcode generation failed for child assembly ${childData.id}:`, barcodeError);
            // Continue with other children even if one fails
          }
          
          return childData;
        });
        
        // Wait for all children to be created
        await Promise.all(childPromises);
        
        return parentData as Assembly;
      } else {
        // For single assemblies, just proceed as normal
        const { data, error } = await supabase
          .from('assemblies')
          .insert({
            ...assembly,
            is_parent: false,
            original_quantity: 1
          })
          .select()
          .single();
          
        if (error) throw error;
        
        // Attempt to generate a barcode for single assembly
        if (data.id) {
          try {
            await supabase
              .from('assembly_barcodes')
              .insert({
                assembly_id: data.id,
                barcode: `ASM-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase()
              });
          } catch (barcodeError) {
            console.error('Barcode generation failed, but assembly was created:', barcodeError);
          }
        }
        
        return data as Assembly;
      }
    } catch (error) {
      console.error('Error creating assembly:', error);
      throw error;
    }
  },
  
  // Update assembly
  updateAssembly: async (id: string, assemblyData: Partial<Assembly>): Promise<Assembly> => {
    try {
      // First check if this is a parent assembly
      const { data: existingAssembly, error: fetchError } = await supabase
        .from('assemblies')
        .select('is_parent')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Update the assembly
      const { data, error } = await supabase
        .from('assemblies')
        .update(assemblyData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      // If this is a parent assembly, update all child assemblies with relevant fields
      if (existingAssembly?.is_parent) {
        // Create a safe update object manually
        const childUpdateData: Record<string, any> = {};
        
        // Only include properties we want to propagate to children
        if ('weight' in assemblyData) childUpdateData.weight = assemblyData.weight;
        if ('width' in assemblyData) childUpdateData.width = assemblyData.width;
        if ('height' in assemblyData) childUpdateData.height = assemblyData.height;
        if ('length' in assemblyData) childUpdateData.length = assemblyData.length;
        if ('painting_spec' in assemblyData) childUpdateData.painting_spec = assemblyData.painting_spec;
        
        // Only proceed if there are fields to update
        if (Object.keys(childUpdateData).length > 0) {
          const { error: updateError } = await supabase
            .from('assemblies')
            .update(childUpdateData)
            .eq('parent_id', id);
            
          if (updateError) throw updateError;
        }
      }
      
      return data as Assembly;
    } catch (error) {
      console.error('Error updating assembly:', error);
      throw error;
    }
  },
  
  // Delete assembly
  deleteAssembly: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('assemblies')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },
  
  // Upload assembly drawing
  uploadAssemblyDrawing: async (
    assemblyId: string, 
    file: File
  ): Promise<AssemblyDrawing> => {
    try {
      const bucketName = 'files'; // Should be created manually in Supabase dashboard
      
      // Generate a unique file path - modified to match project pattern
      const filePath = `assembly-drawings/${assemblyId}/${Date.now()}_${file.name}`;
      
      // Upload to Supabase Storage with cacheControl and upsert options
      // matching the project upload pattern
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
      
      // Create record in assembly_drawings table
      const drawingRecord: Omit<AssemblyDrawing, 'id'> = {
        assembly_id: assemblyId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type
      };
      
      const { data: recordData, error: recordError } = await supabase
        .from('assembly_drawings')
        .insert(drawingRecord)
        .select()
        .single();
      
      if (recordError) {
        console.error('Database record error:', recordError);
        throw recordError;
      }
      
      return recordData as AssemblyDrawing;
    } catch (error) {
      console.error('Error uploading assembly drawing:', error);
      throw error;
    }
  },
  
  // Get assembly drawing with parent fallback
  getAssemblyDrawing: async (assemblyId: string): Promise<AssemblyDrawing | null> => {
    try {
      // First try to find assembly's own drawing
      const { data, error } = await supabase
        .from('assembly_drawings')
        .select('*')
        .eq('assembly_id', assemblyId)
        .maybeSingle();
        
      if (error) throw error;
      
      // If drawing found, return it
      if (data) return data as AssemblyDrawing;
      
      // If drawing not found, check if this is a child assembly
      const { data: assembly, error: assemblyError } = await supabase
        .from('assemblies')
        .select('parent_id')
        .eq('id', assemblyId)
        .single();
        
      if (assemblyError || !assembly || !assembly.parent_id) {
        // No parent_id or failed to get assembly data
        return null;
      }
      
      // Get parent assembly drawing
      const { data: parentDrawing, error: parentError } = await supabase
        .from('assembly_drawings')
        .select('*')
        .eq('assembly_id', assembly.parent_id)
        .maybeSingle();
        
      if (parentError) throw parentError;
      
      // If parent has a drawing, add field indicating it's inherited
      if (parentDrawing) {
        return {
          ...parentDrawing,
          inherited_from_parent: true,
          parent_id: assembly.parent_id
        } as AssemblyDrawing;
      }
      
      // No drawing found
      return null;
    } catch (error) {
      console.error('Error fetching assembly drawing with parent fallback:', error);
      throw error;
    }
  },
  
  // Delete assembly drawing
  deleteAssemblyDrawing: async (drawingId: string): Promise<void> => {
    // First get the drawing to get the file path
    const { data: drawing, error: getError } = await supabase
      .from('assembly_drawings')
      .select('*')
      .eq('id', drawingId)
      .single();
    
    if (getError) throw getError;
    
    // Delete from storage
    const { error: storageError } = await supabase
      .storage
      .from('files')
      .remove([drawing.file_path]);
    
    if (storageError) throw storageError;
    
    // Delete record
    const { error: deleteError } = await supabase
      .from('assembly_drawings')
      .delete()
      .eq('id', drawingId);
    
    if (deleteError) throw deleteError;
  },

  // Get barcode for an assembly
  getAssemblyBarcode: async (assemblyId: string): Promise<{id: string, barcode: string} | null> => {
    const { data, error } = await supabase
      .from('assembly_barcodes')
      .select('id, barcode')
      .eq('assembly_id', assemblyId)
      .maybeSingle();
      
    if (error) throw error;
    return data;
  },

  // Generate barcode for an assembly
  generateAssemblyBarcode: async (assemblyId: string): Promise<{id: string, barcode: string}> => {
    const { data, error } = await supabase
      .from('assembly_barcodes')
      .insert({
        assembly_id: assemblyId,
        barcode: `ASM-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase()
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  // Get child assemblies for a parent assembly
  getChildAssemblies: async (parentId: string): Promise<Assembly[]> => {
    try {
      const { data, error } = await supabase
        .from('assemblies')
        .select('*')
        .eq('parent_id', parentId)
        .order('child_number', { ascending: true });
        
      if (error) throw error;
      return data as Assembly[];
    } catch (error) {
      console.error('Error fetching child assemblies:', error);
      throw error;
    }
  },

  // Get a parent assembly with all its child assemblies
  getAssemblyWithChildren: async (assemblyId: string): Promise<Assembly> => {
    try {
      // First get the parent assembly
      const { data: parentData, error: parentError } = await supabase
        .from('assemblies')
        .select(`
          *,
          project:project_id (
            id,
            name,
            internal_number
          )
        `)
        .eq('id', assemblyId)
        .single();
        
      if (parentError) throw parentError;
      
      // If this is a parent assembly, get all its children
      if (parentData.is_parent) {
        const { data: childrenData, error: childrenError } = await supabase
          .from('assemblies')
          .select('*')
          .eq('parent_id', assemblyId)
          .order('child_number', { ascending: true });
          
        if (childrenError) throw childrenError;
        
        // Add children to the parent assembly
        return {
          ...parentData,
          children: childrenData
        } as Assembly;
      }
      
      // If this is not a parent, just return the assembly
      return parentData as Assembly;
    } catch (error) {
      console.error('Error fetching assembly with children:', error);
      throw error;
    }
  },

  // Update all child assemblies with the same data from parent
  // Used when editing a parent assembly to propagate changes to children
  updateChildAssemblies: async (parentId: string, updateData: Partial<Assembly>): Promise<void> => {
    try {
      // Fields that should be propagated to children
      const propagatedFields: (keyof Assembly)[] = [
        'weight', 'width', 'height', 'length', 'painting_spec', 
        'status', 'start_date', 'end_date', 
        'quality_control_status', 'quality_control_notes'
      ];
      
      // Create update object with only the fields that should be propagated
      const childUpdateData = Object.keys(updateData)
        .filter(key => propagatedFields.includes(key as keyof Assembly))
        .reduce((obj, key) => {
          obj[key] = updateData[key as keyof Assembly];
          return obj;
        }, {} as any);
      
      // Only proceed if there are fields to update
      if (Object.keys(childUpdateData).length > 0) {
        const { error } = await supabase
          .from('assemblies')
          .update(childUpdateData)
          .eq('parent_id', parentId);
          
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating child assemblies:', error);
      throw error;
    }
  }
};