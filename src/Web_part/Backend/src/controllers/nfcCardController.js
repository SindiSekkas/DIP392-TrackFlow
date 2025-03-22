// src/controllers/nfcCardController.js
import supabase from '../utils/supabase.js';
import { ErrorTypes } from '../utils/errorHandler.js';

export const nfcCardController = {
  // Validate an NFC card and return user info
  validateCard: async (req, res, next) => {
    try {
      const { cardId } = req.body;
      
      console.log(`Validating NFC card: ${cardId}`);
      
      // Find the NFC card first
      const { data: nfcCard, error: nfcError } = await supabase
        .from('nfc_cards')
        .select('card_id, is_active, user_id')
        .eq('card_id', cardId)
        .eq('is_active', true)
        .single();
      
      if (nfcError || !nfcCard) {
        console.error('NFC card error:', nfcError);
        return next(ErrorTypes.NOT_FOUND('NFC card not found or inactive'));
      }
      
      console.log(`Found NFC card for user ID: ${nfcCard.user_id}`);
      
      // Then get user profile separately
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          role,
          worker_type_id,
          worker_types(type_name)
        `)
        .eq('auth_user_id', nfcCard.user_id)
        .single();
      
      if (profileError || !profile) {
        console.error('Profile error:', profileError);
        return next(ErrorTypes.NOT_FOUND('User profile not found'));
      }
      
      // Update last_used timestamp
      await supabase
        .from('nfc_cards')
        .update({ last_used: new Date().toISOString() })
        .eq('card_id', cardId);
      
      // Return user data
      res.json({
        data: {
          userId: nfcCard.user_id,
          profileId: profile.id,
          fullName: profile.full_name,
          role: profile.role,
          workerType: profile.worker_types?.type_name,
          cardId: nfcCard.card_id
        }
      });
    } catch (error) {
      console.error('Unexpected error in validateCard:', error);
      next(error);
    }
  },
  
  // Get all NFC cards (admin/manager)
  getCards: async (req, res, next) => {
    try {
      // Get cards and join with profiles
      const { data, error } = await supabase
        .from('nfc_cards')
        .select(`
          id,
          card_id,
          user_id,
          is_active,
          last_used,
          created_at
        `);
      
      if (error) {
        return next(ErrorTypes.SERVER_ERROR(error.message));
      }
      
      // Fetch user names separately
      const cardsWithNames = await Promise.all(
        data.map(async (card) => {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('auth_user_id', card.user_id)
            .single();
          
          return {
            id: card.id,
            cardId: card.card_id,
            userId: card.user_id,
            userName: profile?.full_name || 'Unknown User',
            isActive: card.is_active,
            lastUsed: card.last_used,
            createdAt: card.created_at
          };
        })
      );
      
      res.json({ data: cardsWithNames });
    } catch (error) {
      next(error);
    }
  },
  
  // Assign NFC card to user
  assignCard: async (req, res, next) => {
    try {
      const { cardId, userId, isActive = true } = req.body;
      
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', userId)
        .single();
      
      if (userError || !user) {
        return next(ErrorTypes.NOT_FOUND('User not found'));
      }
      
      // Check if card already exists
      const { data: existingCard } = await supabase
        .from('nfc_cards')
        .select('id')
        .eq('card_id', cardId)
        .maybeSingle();
      
      let result;
      
      if (existingCard) {
        // Update existing card
        const { data, error } = await supabase
          .from('nfc_cards')
          .update({
            user_id: userId,
            is_active: isActive
          })
          .eq('card_id', cardId)
          .select()
          .single();
          
        if (error) {
          return next(ErrorTypes.SERVER_ERROR(error.message));
        }
        
        result = data;
      } else {
        // Create new card
        const { data, error } = await supabase
          .from('nfc_cards')
          .insert({
            card_id: cardId,
            user_id: userId,
            is_active: isActive
          })
          .select()
          .single();
          
        if (error) {
          return next(ErrorTypes.SERVER_ERROR(error.message));
        }
        
        result = data;
      }
      
      res.status(existingCard ? 200 : 201).json({
        data: result,
        message: existingCard ? 'NFC card updated' : 'NFC card assigned'
      });
    } catch (error) {
      next(error);
    }
  },
  
  // Deactivate NFC card
  deactivateCard: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Update the card
      const { data, error } = await supabase
        .from('nfc_cards')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return next(ErrorTypes.SERVER_ERROR(error.message));
      }
      
      if (!data) {
        return next(ErrorTypes.NOT_FOUND('NFC card not found'));
      }
      
      res.json({
        data,
        message: 'NFC card deactivated'
      });
    } catch (error) {
      next(error);
    }
  }
};