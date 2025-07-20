'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'user') {
      router.push('/unauthorized');
    }
  }, [session, status, router]);

  if (status === 'loading') return <div>Loading...</div>;

  return (
    <div className='min-h-screen bg-gradient-background'>
      {/* Header */}
      <div className='bg-white shadow'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-6'>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>
                SHARDEN - User Portal
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
          <h2 className='text-3xl font-bold text-gray-900 mb-6'>
            User Dashboard
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow'>
              <div className='p-5'>
                <h3 className='text-lg font-medium text-gray-900'>
                  Data Sharing Overview
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  View which third-party services have access to your data
                </p>
                <button className='mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors'>
                  <a href='user/audits'>View Data Sharing</a>
                </button>
              </div>
            </div>
            <div className='bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow'>
              <div className='p-5'>
                <h3 className='text-lg font-medium text-gray-900'>
                  Submit Complaint
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  Submit a ticket or complaint about data usage
                </p>
                <button className='mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors'>
                  Submit Complaint
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
