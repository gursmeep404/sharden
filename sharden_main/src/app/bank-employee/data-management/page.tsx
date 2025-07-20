'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BankEmployeeDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Static services data
  const activeServices = [
    {
      id: 1,
      name: 'getBalance',
      method: 'GET',
      status: 'Active',
    },
    {
      id: 2,
      name: 'updateLimit',
      method: 'UPDATE',
      status: 'Active',
    },
  ];

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
    fetchActiveSessions();
  }, [session, status, router]);

  const fetchActiveSessions = async () => {
    try {
      const response = await fetch('http://localhost:3000/sessions');
      const data = await response.json();

      if (data.success) {
        setSessions(data.data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading') {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'>
        <div className='text-lg text-white'>Loading...</div>
      </div>
    );
  }

  if (!session || session.user.role !== 'bank_employee') {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'>
        <div className='text-lg text-white'>Checking permissions...</div>
      </div>
    );
  }

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
                <span className='text-white ml-2'>- Bank Employee Portal</span>
              </h1>
              <p className='text-sm text-slate-300 mt-1'>
                Welcome, {session.user.name} ({session.user.email})
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className='bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all duration-200 backdrop-blur-sm border border-red-400/30'
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8'>
        {/* Page Title */}
        <div className='mb-8'>
          <h2 className='text-3xl font-bold text-white mb-2'>
            System Overview
          </h2>
          <p className='text-slate-300'>
            Monitor active services and user sessions
          </p>
        </div>

        {/* Tables Container */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Active Services Table */}
          <div className='space-y-4'>
            <h3 className='text-xl font-semibold text-white flex items-center gap-2'>
              <div className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></div>
              Active Services
            </h3>

            <div
              className='bg-transparent backdrop-blur-sm rounded-xl border border-white/20 shadow-2xl overflow-hidden'
              style={{ boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}
            >
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='bg-white/5'>
                    <tr>
                      <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                        Service Name
                      </th>
                      <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                        Method
                      </th>
                      <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-white/10'>
                    {activeServices.map((service, index) => (
                      <tr
                        key={service.id}
                        className='hover:bg-white/5 transition-colors duration-200'
                      >
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='text-sm font-medium text-white'>
                            {service.name}
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              service.method === 'GET'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                            }`}
                          >
                            {service.method}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span className='inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-300 border border-green-400/30'>
                            <div className='w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse'></div>
                            {service.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Active Sessions Table */}
          <div className='space-y-4'>
            <h3 className='text-xl font-semibold text-white flex items-center gap-2'>
              <div className='w-2 h-2 bg-blue-400 rounded-full animate-pulse'></div>
              Active Sessions
              <span className='text-sm font-normal text-slate-400'>
                ({sessions.length})
              </span>
            </h3>

            <div
              className='bg-transparent backdrop-blur-sm rounded-xl border border-white/20 shadow-2xl overflow-hidden max-h-96'
              style={{ boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}
            >
              {loading ? (
                <div className='flex items-center justify-center py-8'>
                  <div className='text-slate-300'>Loading sessions...</div>
                </div>
              ) : (
                <div className='overflow-x-auto overflow-y-auto max-h-96'>
                  <table className='w-full'>
                    <thead className='bg-white/5 sticky top-0'>
                      <tr>
                        <th className='px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          User
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          Vendor
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          Expires
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-white/10'>
                      {sessions.length === 0 ? (
                        <tr>
                          <td
                            colSpan='3'
                            className='px-6 py-8 text-center text-slate-400'
                          >
                            No active sessions found
                          </td>
                        </tr>
                      ) : (
                        sessions.map((session, index) => (
                          <tr
                            key={session.sessionId}
                            className='hover:bg-white/5 transition-colors duration-200'
                          >
                            <td className='px-4 py-3 whitespace-nowrap'>
                              <div className='flex flex-col'>
                                <div className='text-sm font-medium text-white'>
                                  {session.user?.name || 'Unknown User'}
                                </div>
                                <div className='text-xs text-slate-400'>
                                  {session.user?.email || 'No email'}
                                </div>
                              </div>
                            </td>
                            <td className='px-4 py-3 whitespace-nowrap'>
                              <div className='flex flex-col'>
                                <div className='text-sm text-white'>
                                  {session.vendor?.vendor_name ||
                                    'Unknown Vendor'}
                                </div>
                                <div className='text-xs text-slate-400'>
                                  {session.vendor?.vendor_email || 'No email'}
                                </div>
                              </div>
                            </td>
                            <td className='px-4 py-3 whitespace-nowrap'>
                              <div className='text-sm text-slate-300'>
                                {formatDate(session.expiresAt)}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className='mt-8 grid grid-cols-1 md:grid-cols-3 gap-6'>
          <div
            className='bg-transparent backdrop-blur-sm rounded-xl border border-white/20 p-6 text-center'
            style={{ boxShadow: '0 0 15px rgba(255, 255, 255, 0.05)' }}
          >
            <div className='text-2xl font-bold text-green-400'>
              {activeServices.length}
            </div>
            <div className='text-sm text-slate-300'>Active Services</div>
          </div>

          <div
            className='bg-transparent backdrop-blur-sm rounded-xl border border-white/20 p-6 text-center'
            style={{ boxShadow: '0 0 15px rgba(255, 255, 255, 0.05)' }}
          >
            <div className='text-2xl font-bold text-blue-400'>
              {sessions.length}
            </div>
            <div className='text-sm text-slate-300'>Active Sessions</div>
          </div>

          <div
            className='bg-transparent backdrop-blur-sm rounded-xl border border-white/20 p-6 text-center'
            style={{ boxShadow: '0 0 15px rgba(255, 255, 255, 0.05)' }}
          >
            <div className='text-2xl font-bold text-purple-400'>
              {sessions.filter((s) => s.user?.name).length}
            </div>
            <div className='text-sm text-slate-300'>Verified Users</div>
          </div>
        </div>
      </div>
    </div>
  );
}
