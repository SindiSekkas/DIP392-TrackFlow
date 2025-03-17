// src/Web_part/FrontEnd/src/lib/preferencesApi.ts
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
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preference_data')
        .eq('preference_type', module)
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
      const { error: upsertError } = await supabase
        .from('user_preferences')
        .upsert({
          preference_type: module,
          preference_data: preferences
        },
        { onConflict: 'user_id,preference_type' });
      
      if (upsertError) throw upsertError;
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