'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BankEmployeeDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    console.log('🏦 Bank Employee Dashboard - Session:', session);
    console.log('🏦 User role:', session?.user?.role);

    if (!session) {
      console.log('❌ No session found, redirecting to login');
      router.push('/');
      return;
    }

    if (session.user.role !== 'bank_employee') {
      console.log('❌ Unauthorized role:', session.user.role);
      router.push('/unauthorized');
      return;
    }

    console.log('✅ Access granted to bank employee dashboard');
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-lg'>Loading...</div>
      </div>
    );
  }

  if (!session || session.user.role !== 'bank_employee') {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-lg'>Checking permissions...</div>
      </div>
    );
  }

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
                - Bank Employee Portal
              </h1>
              <p className='text-sm text-white'>
                Welcome, {session.user.name} ({session.user.email})
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
            Bank Employee Dashboard
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <div className='bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow'>
              <div className='p-5'>
                <h3 className='text-lg font-medium text-gray-900'>
                  File Encryption
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  Encrypt files for secure transfer to third-party vendors
                </p>
                <button className='mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors'>
                  <a href='/bank-employee/fencrypt'>Encrypt Files</a>
                </button>
              </div>
            </div>

            <div className='bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow'>
              <div className='p-5'>
                <h3 className='text-lg font-medium text-gray-900'>
                  Data Management
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  Manage all shared data and access permissions
                </p>
                <button className='mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors'>
                  <a href='/bank-employee/data-management'>Manage Data</a>
                </button>
              </div>
            </div>

            <div className='bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow'>
              <div className='p-5'>
                <h3 className='text-lg font-medium text-gray-900'>
                  File Transer Dashboard
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  View history and statistics of all file transfers
                </p>
                <button className='mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors'>
                  <a href='/bank-employee/dashboard'>View Dashboard</a>
                </button>
              </div>
            </div>

            <div className='bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow'>
              <div className='p-5'>
                <h3 className='text-lg font-medium text-gray-900'>
                  Vendor Management
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  Manage third-party vendor access and permissions
                </p>
                <button className='mt-4 bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors'>
                  <a href='/bank-employee/vendor_management'>Manage Vendors</a>
                </button>
              </div>
            </div>

            <div className='bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow'>
              <div className='p-5'>
                <h3 className='text-lg font-medium text-gray-900'>
                  Security Audit
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  Review security logs and audit trails
                </p>
                <button className='mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors'>
                  View Audit
                </button>
              </div>
            </div>

            <div className='bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow'>
              <div className='p-5'>
                <h3 className='text-lg font-medium text-gray-900'>
                  System Status
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  Monitor system health and performance
                </p>
                <button className='mt-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors'>
                  View Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
