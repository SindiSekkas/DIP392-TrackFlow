// src/controllers/clientController.js
import supabase from '../utils/supabase.js';
import { ErrorTypes } from '../utils/errorHandler.js';

export const clientController = {
  // Get all clients
  getClients: async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('company_name', { ascending: true });
      
      if (error) {
        return next(ErrorTypes.SERVER_ERROR(error.message));
      }
      
      res.json({ data });
    } catch (error) {
      next(error);
    }
  },
  
  // Get a single client by ID
  getClient: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        return next(ErrorTypes.NOT_FOUND('Client not found'));
      }
      
      res.json({ data });
    } catch (error) {
      next(error);
    }
  },
  
  // Create a new client
  createClient: async (req, res, next) => {
    try {
      const { 
        company_name, 
        registration_code, 
        vat_code,
        contact_person,
        email,
        phone,
        address,
        notes
      } = req.body;
      
      // Basic validation
      if (!company_name || !registration_code) {
        return next(ErrorTypes.VALIDATION('Company name and registration code are required'));
      }
      
      // Check if client with same company name or registration code already exists
      const { data: existingClient, error: checkError } = await supabase
        .from('clients')
        .select('id')
        .or(`company_name.eq.${company_name},registration_code.eq.${registration_code}`);
      
      if (checkError) {
        return next(ErrorTypes.SERVER_ERROR(checkError.message));
      }
      
      if (existingClient && existingClient.length > 0) {
        return next(ErrorTypes.CONFLICT('Client with this company name or registration code already exists'));
      }
      
      // Create the client
      const { data, error } = await supabase
        .from('clients')
        .insert({
          company_name,
          registration_code,
          vat_code,
          contact_person,
          email,
          phone,
          address,
          notes
        })
        .select()
        .single();
      
      if (error) {
        return next(ErrorTypes.SERVER_ERROR(error.message));
      }
      
      res.status(201).json({
        data,
        message: 'Client created successfully'
      });
    } catch (error) {
      next(error);
    }
  },
  
  // Update a client
  updateClient: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { 
        company_name, 
        registration_code, 
        vat_code,
        contact_person,
        email,
        phone,
        address,
        notes
      } = req.body;
      
      // Check if client exists
      const { data: existingClient, error: checkError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', id)
        .single();
      
      if (checkError || !existingClient) {
        return next(ErrorTypes.NOT_FOUND('Client not found'));
      }
      
      // Update the client
      const { data, error } = await supabase
        .from('clients')
        .update({
          company_name,
          registration_code,
          vat_code,
          contact_person,
          email,
          phone,
          address,
          notes
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return next(ErrorTypes.SERVER_ERROR(error.message));
      }
      
      res.json({
        data,
        message: 'Client updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },
  
  // Delete a client
  deleteClient: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Check if client is associated with any projects
      const { data: relatedProjects, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', id);
      
      if (checkError) {
        return next(ErrorTypes.SERVER_ERROR(checkError.message));
      }
      
      if (relatedProjects && relatedProjects.length > 0) {
        return next(ErrorTypes.CONFLICT('Cannot delete client that is associated with projects'));
      }
      
      // Delete the client
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) {
        return next(ErrorTypes.SERVER_ERROR(error.message));
      }
      
      res.json({
        message: 'Client deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};