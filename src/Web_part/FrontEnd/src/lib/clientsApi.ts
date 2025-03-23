// src/lib/clientsApi.ts
import { supabase } from './supabase';

// Updated Client interface with proper null handling
export interface Client {
  id?: string;
  company_name: string;
  registration_code: string;
  vat_code?: string | null;  // Modified to allow null values
  contact_person?: string;
  email?: string | null;     // Also modified to allow null
  phone?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// API for working with clients
export const clientsApi = {
  // Get all clients
  getClients: async (): Promise<Client[]> => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('company_name', { ascending: true });
      
    if (error) throw error;
    return data as Client[];
  },
  
  // Get client by ID
  getClient: async (id: string): Promise<Client> => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data as Client;
  },
  
  // Create client
  createClient: async (client: Client): Promise<Client> => {
    // Clean empty strings to null for unique fields
    const cleanedClient = {
      ...client,
      vat_code: client.vat_code?.trim() || null,
      email: client.email?.trim() || null
    };

    const { data, error } = await supabase
      .from('clients')
      .insert(cleanedClient)
      .select()
      .single();
      
    if (error) throw error;
    return data as Client;
  },
  
  // Update client
  updateClient: async (id: string, client: Partial<Client>): Promise<Client> => {
    // Clean empty strings to null for unique fields
    const cleanedClient = {
      ...client,
      vat_code: client.vat_code?.trim() || null,
      email: client.email?.trim() || null
    };

    const { data, error } = await supabase
      .from('clients')
      .update(cleanedClient)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data as Client;
  },
  
  // Delete client
  deleteClient: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },
  
  // Check if client can be safely deleted (no related projects)
  canDeleteClient: async (id: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('client_id', id);
      
    if (error) throw error;
    return data.length === 0;
  }
};