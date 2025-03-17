// src/Web_part/FrontEnd/src/contexts/ColumnSettingsContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ColumnPreference, preferencesApi, getDefaultAssemblyColumns } from '../lib/preferencesApi';

interface ColumnSettingsContextType {
  assemblyColumns: ColumnPreference[];
  loadingPreferences: boolean;
  saveAssemblyColumns: (columns: ColumnPreference[]) => Promise<void>;
  resetAssemblyColumnsToDefault: () => Promise<void>;
}

const ColumnSettingsContext = createContext<ColumnSettingsContextType | undefined>(undefined);

export const ColumnSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [assemblyColumns, setAssemblyColumns] = useState<ColumnPreference[]>(getDefaultAssemblyColumns());
  const [loadingPreferences, setLoadingPreferences] = useState(true);

  // Load column preferences on component mount
  useEffect(() => {
    const loadColumnPreferences = async () => {
      try {
        setLoadingPreferences(true);
        const preferences = await preferencesApi.getAssemblyColumnPreferences();
        if (preferences) {
          setAssemblyColumns(preferences);
        }
      } catch (error) {
        console.error('Error loading column preferences:', error);
      } finally {
        setLoadingPreferences(false);
      }
    };

    loadColumnPreferences();
  }, []);

  // Save column preferences
  const saveAssemblyColumns = async (columns: ColumnPreference[]) => {
    try {
      setAssemblyColumns(columns);
      await preferencesApi.saveAssemblyColumnPreferences(columns);
    } catch (error) {
      console.error('Error saving column preferences:', error);
      throw error;
    }
  };

  // Reset to default column preferences
  const resetAssemblyColumnsToDefault = async () => {
    try {
      const defaultColumns = getDefaultAssemblyColumns();
      setAssemblyColumns(defaultColumns);
      await preferencesApi.saveAssemblyColumnPreferences(defaultColumns);
    } catch (error) {
      console.error('Error resetting column preferences:', error);
      throw error;
    }
  };

  return (
    <ColumnSettingsContext.Provider
      value={{
        assemblyColumns,
        loadingPreferences,
        saveAssemblyColumns,
        resetAssemblyColumnsToDefault,
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