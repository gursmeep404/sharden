'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ThirdPartyVendorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'third_party_vendor') {
      router.push('/unauthorized');
    }
  }, [session, status, router]);

  if (status === 'loading') return <div>Loading...</div>;

  return (
    <div className='min-h-screen bg-gradient-background'>
      {/* Header */}
      <div className='bg-[hsl(220,30%,8%)] shadow'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-6'>
            <div>
              <h1 className='text-2xl font-bold text-[hsl(45,93%,47%)]'>
                <span className='text-2xl font-bold bg-gradient-to-r from-[hsl(210,100%,50%)] to-[hsl(45,93%,47%)] bg-clip-text text-transparent'>
                  SHARDEN
                </span>{' '}
                - Third-Party Vendor Portal
              </h1>
              <p className='text-sm text-gray-600'>
                Welcome, {session?.user?.name} ({session?.user?.email})
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className='bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors'
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          <h2 className='text-3xl font-bold text-white mb-6'>
            Third Party Vendor Dashboard
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <div className='bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow'>
              <div className='p-5'>
                <h3 className='text-lg font-medium text-gray-900'>
                  File Decryption
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  Decrypt received files from banks
                </p>
                <button className='mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors'>
                  <a href='/third-party-vendor/decrypt'> Decrypt Files</a>
                </button>
              </div>
            </div>
            <div className='bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow'>
              <div className='p-5'>
                <h3 className='text-lg font-medium text-gray-900'>
                  API Access
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  Access secure APIs and request data from banks
                </p>
                <button className='mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors'>
                  API Dashboard
                </button>
              </div>
            </div>
            <div className='bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow'>
              <div className='p-5'>
                <h3 className='text-lg font-medium text-gray-900'>
                  Data Requests
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  Submit requests for additional data from banks
                </p>
                <button className='mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors'>
                  Request Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
