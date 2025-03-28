// src/lib/nfcCardApi.ts
import { supabase } from './supabase';

// NFC Card interface
export interface NFCCard {
  id?: string;
  card_id: string;
  user_id: string;
  is_active: boolean;
  last_used?: string | null;
  created_at?: string;
  user?: {
    fullName: string;
    email: string;
  };
}

// API for working with NFC cards
export const nfcCardApi = {
  // Get all NFC cards
  getCards: async (): Promise<NFCCard[]> => {
    const { data: cards, error } = await supabase
      .from('nfc_cards')
      .select(`
        id,
        card_id,
        user_id,
        is_active,
        last_used,
        created_at
      `);
      
    if (error) throw error;
    
    // Fetch user details separately to join with cards
    const cardsWithUserInfo = await Promise.all(
      cards.map(async (card) => {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('auth_user_id', card.user_id)
          .single();
        
        const { data: userData } = await supabase.auth
          .admin.getUserById(card.user_id);
        
        return {
          ...card,
          user: {
            fullName: profile?.full_name || 'Unknown User',
            email: userData?.user?.email || 'Unknown Email'
          }
        };
      })
    );
    
    return cardsWithUserInfo as NFCCard[];
  },
  
  // Assign NFC card to user
  assignCard: async (cardId: string, userId: string, isActive: boolean = true): Promise<NFCCard> => {
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
        
      if (error) throw error;
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
        
      if (error) throw error;
      result = data;
    }
    
    return result as NFCCard;
  },
  
  // Activate/deactivate NFC card
  toggleCardActive: async (id: string, isActive: boolean): Promise<NFCCard> => {
    const { data, error } = await supabase
      .from('nfc_cards')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data as NFCCard;
  },
  
  // Delete NFC card
  deleteCard: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('nfc_cards')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};