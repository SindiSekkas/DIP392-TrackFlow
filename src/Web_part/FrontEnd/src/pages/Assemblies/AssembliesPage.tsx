// src/pages/Assemblies/AssembliesPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

const AssembliesPage: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Assemblies</h2>
        <Link
          to="/dashboard/assemblies/create"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} className="mr-2 text-white" />
          <span className="text-white">Add Assembly</span>
        </Link>
      </div>

      <div className="text-center py-10 bg-gray-50 rounded-md">
        <p className="text-gray-500">Assembly management functionality is under development.</p>
        <p className="text-gray-400 mt-1">Check back soon!</p>
      </div>
    </div>
  );
};

export default AssembliesPage;