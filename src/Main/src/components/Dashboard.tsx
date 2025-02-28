// src/components/Dashboard.tsx
import React from 'react';
import Layout from './Layout';

const Dashboard: React.FC = () => {
  return (
    <Layout>
      {/* Dashboard specific content */}
      <div className="bg-white p-8 rounded-lg shadow text-center max-w-lg w-full mx-auto">
        <h2 className="text-2xl font-bold text-blue-900 mb-4">
          Welcome to TrackFlow
        </h2>
        <p className="text-gray-700 mb-6">
          This is the main dashboard content. You can now easily add more components 
          using the same layout structure.
        </p>
        
        {/* Embedded Rickroll video */}
        <div className="mt-4">
          <iframe 
            width="100%" 
            height="315" 
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&start=43" 
            title="Never Gonna Give You Up" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
            className="rounded-lg shadow-lg"
          ></iframe>
        </div>
      </div>
    </Layout>
  );
};
export default Dashboard;