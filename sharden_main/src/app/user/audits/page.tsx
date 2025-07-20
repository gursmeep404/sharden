'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardData {
  id: number;
  email: string;
  vendor_name: string;
  medium: string;
  created_at: string;
}

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'user') {
      router.push('/unauthorized');
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!session?.user?.email) return;

      try {
        setLoading(true);
        const response = await fetch('/api/userdashboard');
        const result = await response.json();

        if (result.success) {
          setDashboardData(result.data);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.email) {
      fetchDashboardData();
    }
  }, [session]);

  if (status === 'loading') return <div>Loading...</div>;

  return (
    <div className='min-h-screen bg-gradient-background'>
      {/* Header */}
      <div className='bg-slate-800/50 backdrop-blur-sm shadow-lg border-b border-white/10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-6'>
            <div>
              <h1 className='text-2xl font-bold'>
                <span className='bg-gradient-to-r from-blue-400 to-amber-400 bg-clip-text text-transparent'>
                  SHARDEN
                </span>
                <span className='text-white ml-2'>- User Portal</span>
              </h1>
              <p className='text-sm text-slate-300 mt-1'>
                Welcome, {session?.user.name} ({session?.user.email})
              </p>
            </div>
            <div className='flex items-center gap-3'>
              <a
                href='/bank-employee'
                className='rounded bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600 text-white transition-colors'
              >
                Dashboard
              </a>
              <button
                onClick={() => signOut()}
                className='rounded bg-red-600 px-4 py-2 text-sm hover:bg-red-700 text-white transition-colors'
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-6'>
          <h2 className='text-xl font-semibold text-white mb-2'>
            Your Dashboard Data
          </h2>
          <p className='text-gray-300'>
            Manage your vendor connections and services
          </p>
        </div>

        {/* Table Container */}
        <div className='bg-white/10 backdrop-blur-sm rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.1)] border border-white/20'>
          {loading ? (
            <div className='p-8 text-center text-white'>
              Loading your dashboard data...
            </div>
          ) : error ? (
            <div className='p-8 text-center text-red-300'>Error: {error}</div>
          ) : dashboardData.length === 0 ? (
            <div className='p-8 text-center text-gray-300'>
              No dashboard data found. Start by connecting with vendors.
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-white/20'>
                    <th className='px-6 py-4 text-left text-sm font-medium text-white uppercase tracking-wider'>
                      Email
                    </th>
                    <th className='px-6 py-4 text-left text-sm font-medium text-white uppercase tracking-wider'>
                      Vendor Name
                    </th>
                    <th className='px-6 py-4 text-left text-sm font-medium text-white uppercase tracking-wider'>
                      Medium
                    </th>
                    <th className='px-6 py-4 text-left text-sm font-medium text-white uppercase tracking-wider'>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-white/10'>
                  {dashboardData.map((item) => (
                    <tr
                      key={item.id}
                      className='hover:bg-white/5 transition-colors duration-200'
                    >
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-200'>
                        {item.email}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-200'>
                        {item.vendor_name}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-200'>
                        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
                          {item.medium}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm'>
                        <button
                          className='bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors duration-200 shadow-sm hover:shadow-md'
                          onClick={() => {
                            // TODO: Add click handler later
                            console.log('Put ticket clicked for:', item.id);
                          }}
                        >
                          Put-Ticket
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        {dashboardData.length > 0 && (
          <div className='mt-6 bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10'>
            <p className='text-sm text-gray-300'>
              Total Entries:{' '}
              <span className='text-white font-medium'>
                {dashboardData.length}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
