import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const ForbiddenPage = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-5 text-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="mb-6 text-blue-900">
            <div className="text-9xl font-bold mb-2">403</div>
            <h1 className="text-2xl font-semibold">Access Forbidden</h1>
          </div>

          <div className="mb-8 text-gray-600">
            <p>Sorry, you don't have permission to access this page.</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">          
              <button 
                onClick={() => navigate(-1)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 shadow-sm hover:bg-gray-50 transition-colors duration-200"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ForbiddenPage;