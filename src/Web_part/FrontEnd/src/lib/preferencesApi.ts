// src/lib/preferencesApi.ts
import { supabase } from './supabase';

export interface ColumnPreference {
  id: string;
  label: string;
  visible: boolean;
}

export interface UserPreferences {
  columns: Record<string, ColumnPreference[]>;
}

export const preferencesApi = {
  /**
   * Get user preferences for a specific module
   * @param module The module name (e.g., 'assemblies')
   * @returns The user preferences for that module
   */
  getPreferences: async (module: string): Promise<any> => {
    try {
      // Get current user session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        console.warn('No authenticated user found when getting preferences');
        return null;
      }
      
      const userId = sessionData.session.user.id;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preference_data')
        .eq('preference_type', module)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      return data?.preference_data || null;
    } catch (error) {
      console.error(`Error fetching ${module} preferences:`, error);
      return null;
    }
  },

  /**
   * Save user preferences for a specific module
   * @param module The module name (e.g., 'assemblies')
   * @param preferences The preferences to save
   */
  savePreferences: async (module: string, preferences: any): Promise<void> => {
    try {
      // Get current user session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        console.warn('No authenticated user found when saving preferences');
        return;
      }
      
      const userId = sessionData.session.user.id;
      
      // First check if the record exists
      const { data: existingData } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('preference_type', module)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existingData) {
        // If it exists, update it
        const { error: updateError } = await supabase
          .from('user_preferences')
          .update({
            preference_data: preferences,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id);
        
        if (updateError) throw updateError;
      } else {
        // If it doesn't exist, insert it
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            preference_type: module,
            preference_data: preferences
          });
        
        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error(`Error saving ${module} preferences:`, error);
      throw error;
    }
  },

  /**
   * Get column preferences for assemblies
   * @returns The column preferences for assemblies
   */
  getAssemblyColumnPreferences: async (): Promise<ColumnPreference[]> => {
    try {
      const preferences = await preferencesApi.getPreferences('assemblies');
      return preferences?.columns || getDefaultAssemblyColumns();
    } catch (error) {
      console.error('Error fetching assembly column preferences:', error);
      return getDefaultAssemblyColumns();
    }
  },

  /**
   * Save column preferences for assemblies
   * @param columns The column preferences to save
   */
  saveAssemblyColumnPreferences: async (columns: ColumnPreference[]): Promise<void> => {
    try {
      await preferencesApi.savePreferences('assemblies', { columns });
    } catch (error) {
      console.error('Error saving assembly column preferences:', error);
      throw error;
    }
  },

  /**
   * Get column preferences for projects
   * @returns The column preferences for projects
   */
  getProjectColumnPreferences: async (): Promise<ColumnPreference[]> => {
    try {
      const preferences = await preferencesApi.getPreferences('projects');
      return preferences?.columns || getDefaultProjectColumns();
    } catch (error) {
      console.error('Error fetching project column preferences:', error);
      return getDefaultProjectColumns();
    }
  },

  /**
   * Save column preferences for projects
   * @param columns The column preferences to save
   */
  saveProjectColumnPreferences: async (columns: ColumnPreference[]): Promise<void> => {
    try {
      await preferencesApi.savePreferences('projects', { columns });
    } catch (error) {
      console.error('Error saving project column preferences:', error);
      throw error;
    }
  },

  /**
   * Get column preferences for clients
   * @returns The column preferences for clients
   */
  getClientColumnPreferences: async (): Promise<ColumnPreference[]> => {
    try {
      const preferences = await preferencesApi.getPreferences('clients');
      return preferences?.columns || getDefaultClientColumns();
    } catch (error) {
      console.error('Error fetching client column preferences:', error);
      return getDefaultClientColumns();
    }
  },

  /**
   * Save column preferences for clients
   * @param columns The column preferences to save
   */
  saveClientColumnPreferences: async (columns: ColumnPreference[]): Promise<void> => {
    try {
      await preferencesApi.savePreferences('clients', { columns });
    } catch (error) {
      console.error('Error saving client column preferences:', error);
      throw error;
    }
  }
};

/**
 * Get default column preferences for assemblies
 */
export const getDefaultAssemblyColumns = (): ColumnPreference[] => [
  { id: 'name', label: 'Name', visible: true },
  { id: 'weight', label: 'Weight', visible: true },
  { id: 'quantity', label: 'Quantity', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'width', label: 'Width', visible: false },
  { id: 'height', label: 'Height', visible: false },
  { id: 'length', label: 'Length', visible: false },
  { id: 'painting_spec', label: 'Painting Spec', visible: false },
  { id: 'start_date', label: 'Start Date', visible: true },
  { id: 'end_date', label: 'End Date', visible: true },
  { id: 'quality_control_status', label: 'QC Status', visible: false }
];  

/**
 * Get default column preferences for projects
 */
export const getDefaultProjectColumns = (): ColumnPreference[] => [
  { id: 'internal_number', label: 'Internal #', visible: true },
  { id: 'name', label: 'Name', visible: true },
  { id: 'client', label: 'Client', visible: true },
  { id: 'project_start', label: 'Start Date', visible: true },
  { id: 'project_end', label: 'End Date', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'responsible_manager', label: 'Manager', visible: false },
  { id: 'delivery_date', label: 'Delivery Date', visible: false },
  { id: 'delivery_location', label: 'Delivery Location', visible: false },
  { id: 'total_weight', label: 'Total Weight', visible: false }
];

/**
 * Get default column preferences for clients
 */
export const getDefaultClientColumns = (): ColumnPreference[] => [
  { id: 'company_name', label: 'Company Name', visible: true },
  { id: 'registration_code', label: 'Registration Code', visible: true },
  { id: 'vat_code', label: 'VAT Code', visible: true },
  { id: 'contact_person', label: 'Contact Person', visible: true },
  { id: 'email', label: 'Email', visible: false },
  { id: 'phone', label: 'Phone', visible: false },
  { id: 'address', label: 'Address', visible: false }
];