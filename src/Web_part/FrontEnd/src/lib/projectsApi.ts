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
    const { data, error } = await supabase
      .from('assemblies')
      .insert(assembly)
      .select()
      .single();
      
    if (error) throw error;
    return data as Assembly;
  },
  
  // Update assembly
  updateAssembly: async (id: string, assembly: Partial<Assembly>): Promise<Assembly> => {
    const { data, error } = await supabase
      .from('assemblies')
      .update(assembly)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data as Assembly;
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
  
  // Get assembly drawing
  getAssemblyDrawing: async (assemblyId: string): Promise<AssemblyDrawing | null> => {
    const { data, error } = await supabase
      .from('assembly_drawings')
      .select('*')
      .eq('assembly_id', assemblyId)
      .maybeSingle();
      
    if (error) throw error;
    return data as AssemblyDrawing | null;
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
  }
};