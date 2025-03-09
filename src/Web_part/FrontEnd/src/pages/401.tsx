// src/pages/401.tsx
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-5 text-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="mb-6 text-blue-900">
            <div className="text-9xl font-bold mb-2">401</div>
            <h1 className="text-2xl font-semibold">Unauthorized</h1>
          </div>

          <div className="mb-8 text-gray-600">
            <p>Sorry, you need to be logged in to access this page.</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">          
              <button
                onClick={() => navigate('/login')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md shadow-sm hover:bg-gray-50 transition-colors duration-200"
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UnauthorizedPage;