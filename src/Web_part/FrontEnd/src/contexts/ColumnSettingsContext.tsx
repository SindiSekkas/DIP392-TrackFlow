// src/contexts/ColumnSettingsContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { 
  ColumnPreference, 
  preferencesApi, 
  getDefaultAssemblyColumns, 
  getDefaultProjectColumns,
  getDefaultClientColumns 
} from '../lib/preferencesApi';
import { useAuth } from './AuthContext';

interface ColumnSettingsContextType {
  assemblyColumns: ColumnPreference[];
  projectColumns: ColumnPreference[];
  clientColumns: ColumnPreference[];
  loadingPreferences: boolean;
  saveAssemblyColumns: (columns: ColumnPreference[]) => Promise<void>;
  saveProjectColumns: (columns: ColumnPreference[]) => Promise<void>;
  saveClientColumns: (columns: ColumnPreference[]) => Promise<void>;
  resetAssemblyColumnsToDefault: () => Promise<void>;
  resetProjectColumnsToDefault: () => Promise<void>;
  resetClientColumnsToDefault: () => Promise<void>;
}

const ColumnSettingsContext = createContext<ColumnSettingsContextType | undefined>(undefined);

export const ColumnSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [assemblyColumns, setAssemblyColumns] = useState<ColumnPreference[]>(getDefaultAssemblyColumns());
  const [projectColumns, setProjectColumns] = useState<ColumnPreference[]>(getDefaultProjectColumns());
  const [clientColumns, setClientColumns] = useState<ColumnPreference[]>(getDefaultClientColumns());
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const { user } = useAuth(); // Get authenticated user

  // Load column preferences when user changes or on initial load
  useEffect(() => {
    const loadColumnPreferences = async () => {
      if (!user) {
        // If no user is authenticated, use defaults and don't attempt to load
        setAssemblyColumns(getDefaultAssemblyColumns());
        setProjectColumns(getDefaultProjectColumns());
        setClientColumns(getDefaultClientColumns());
        setLoadingPreferences(false);
        return;
      }
      
      try {
        setLoadingPreferences(true);
        
        // Load assembly column preferences
        const assemblyPreferences = await preferencesApi.getAssemblyColumnPreferences();
        if (assemblyPreferences && assemblyPreferences.length > 0) {
          setAssemblyColumns(assemblyPreferences);
        } else {
          setAssemblyColumns(getDefaultAssemblyColumns());
        }
        
        // Load project column preferences
        const projectPreferences = await preferencesApi.getProjectColumnPreferences();
        if (projectPreferences && projectPreferences.length > 0) {
          setProjectColumns(projectPreferences);
        } else {
          setProjectColumns(getDefaultProjectColumns());
        }
        
        // Load client column preferences
        const clientPreferences = await preferencesApi.getClientColumnPreferences();
        if (clientPreferences && clientPreferences.length > 0) {
          setClientColumns(clientPreferences);
        } else {
          setClientColumns(getDefaultClientColumns());
        }
      } catch (error) {
        console.error('Error loading column preferences:', error);
        // In case of error, reset to defaults
        setAssemblyColumns(getDefaultAssemblyColumns());
        setProjectColumns(getDefaultProjectColumns());
        setClientColumns(getDefaultClientColumns());
      } finally {
        setLoadingPreferences(false);
      }
    };

    // Call the function and use cleanup to avoid race conditions
    let isMounted = true;
    loadColumnPreferences().then(() => {
      if (!isMounted) return;
    });
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Save assembly column preferences
  const saveAssemblyColumns = async (columns: ColumnPreference[]) => {
    if (!user) return; // Don't save if user is not authenticated
    
    try {
      setAssemblyColumns(columns);
      await preferencesApi.saveAssemblyColumnPreferences(columns);
    } catch (error) {
      console.error('Error saving assembly column preferences:', error);
      throw error;
    }
  };

  // Save project column preferences
  const saveProjectColumns = async (columns: ColumnPreference[]) => {
    if (!user) return; // Don't save if user is not authenticated
    
    try {
      setProjectColumns(columns);
      await preferencesApi.saveProjectColumnPreferences(columns);
    } catch (error) {
      console.error('Error saving project column preferences:', error);
      throw error;
    }
  };

  // Save client column preferences
  const saveClientColumns = async (columns: ColumnPreference[]) => {
    if (!user) return; // Don't save if user is not authenticated
    
    try {
      setClientColumns(columns);
      await preferencesApi.saveClientColumnPreferences(columns);
    } catch (error) {
      console.error('Error saving client column preferences:', error);
      throw error;
    }
  };

  // Reset to default assembly column preferences
  const resetAssemblyColumnsToDefault = async () => {
    try {
      const defaultColumns = getDefaultAssemblyColumns();
      setAssemblyColumns(defaultColumns);
      
      if (user) {
        await preferencesApi.saveAssemblyColumnPreferences(defaultColumns);
      }
    } catch (error) {
      console.error('Error resetting assembly column preferences:', error);
      throw error;
    }
  };

  // Reset to default project column preferences
  const resetProjectColumnsToDefault = async () => {
    try {
      const defaultColumns = getDefaultProjectColumns();
      setProjectColumns(defaultColumns);
      
      if (user) {
        await preferencesApi.saveProjectColumnPreferences(defaultColumns);
      }
    } catch (error) {
      console.error('Error resetting project column preferences:', error);
      throw error;
    }
  };

  // Reset to default client column preferences
  const resetClientColumnsToDefault = async () => {
    try {
      const defaultColumns = getDefaultClientColumns();
      setClientColumns(defaultColumns);
      
      if (user) {
        await preferencesApi.saveClientColumnPreferences(defaultColumns);
      }
    } catch (error) {
      console.error('Error resetting client column preferences:', error);
      throw error;
    }
  };

  return (
    <ColumnSettingsContext.Provider
      value={{
        assemblyColumns,
        projectColumns,
        clientColumns,
        loadingPreferences,
        saveAssemblyColumns,
        saveProjectColumns,
        saveClientColumns,
        resetAssemblyColumnsToDefault,
        resetProjectColumnsToDefault,
        resetClientColumnsToDefault,
      }}
    >
      {children}
    </ColumnSettingsContext.Provider>
  );
};

// Custom hook to use the column settings context
export const useColumnSettings = () => {
  const context = useContext(ColumnSettingsContext);
  if (context === undefined) {
    throw new Error('useColumnSettings must be used within a ColumnSettingsProvider');
  }
  return context;
};