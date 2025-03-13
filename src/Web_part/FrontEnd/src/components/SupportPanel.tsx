// src/Web_part/FrontEnd/src/components/SupportPanel.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SupportPanelProps {
  onClose: () => void;
}

const SupportPanel: React.FC<SupportPanelProps> = ({ onClose }) => {
  const [supabaseStatus, setSupabaseStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const navigate = useNavigate();

  // Check Supabase connection status
  useEffect(() => {
    const checkSupabaseStatus = async () => {
      try {
        // Simple query to test connection
        const { error } = await supabase.from('worker_types').select('count').limit(1);
        setSupabaseStatus(error ? 'offline' : 'online');
      } catch (error) {
        setSupabaseStatus('offline');
      }
    };

    checkSupabaseStatus();
  }, []);

  const handleDocsClick = () => {
    navigate('/dashboard/help');
    onClose();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 z-50 w-80">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Need help with your project?</h3>
        <p className="text-sm text-gray-600 mb-4">
        For inquiries, please refer to our documentation; if the databases are down, contact the administrator.
        </p>
        
        {/* Docs and Status */}
        <div className="flex justify-center items-center space-x-4 overflow-x-auto">
          <button 
            onClick={handleDocsClick}
            className="flex items-center text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md transition-colors select-none whitespace-nowrap border border-gray-200"
          >
            <BookOpen size={16} className="mr-2" />
            Docs
          </button>
          
          <button 
            className="flex items-center text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md transition-colors select-none cursor-default whitespace-nowrap border border-gray-200"
          >
            <Activity size={16} className="mr-2" />
            <span className="mr-2">Database Status</span>
            {supabaseStatus === 'checking' && (
              <span className="w-2 h-2 rounded-full bg-yellow-500" title="Checking connection..."></span>
            )}
            {supabaseStatus === 'online' && (
              <span className="w-2 h-2 rounded-full bg-green-500" title="Connected"></span>
            )}
            {supabaseStatus === 'offline' && (
              <span className="w-2 h-2 rounded-full bg-red-500" title="Disconnected"></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportPanel;