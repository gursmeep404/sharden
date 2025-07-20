'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AccessLogData {
  user_email: string;
  vendor_name: string;
  facility_used: string;
  access_time: string;
  status: string;
}

interface SessionData {
  session_id: string;
  vendor_id: string; // Changed from number to string since we're converting BigInt to string
  expires_at: string;
  is_active: boolean;
  revoked_by: string | null;
  revoked_at: string | null;
  created_at: string;
}

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [accessLogs, setAccessLogs] = useState<AccessLogData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'bank_employee') {
      router.push('/unauthorized');
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch access logs
        const accessLogsResponse = await fetch('/api/access-logs');
        const accessLogsResult = await accessLogsResponse.json();

        // Fetch sessions
        const sessionsResponse = await fetch('/api/all-sessions');
        const sessionsResult = await sessionsResponse.json();

        if (accessLogsResult.success) {
          setAccessLogs(accessLogsResult.data);
        } else {
          setError(accessLogsResult.error || 'Failed to fetch access logs');
        }

        if (sessionsResult.success) {
          setSessions(sessionsResult.data);
        } else {
          setError(sessionsResult.error || 'Failed to fetch sessions');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.email) {
      fetchData();
    }
  }, [session]);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

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
        {loading ? (
          <div className='text-center text-white'>Loading...</div>
        ) : error ? (
          <div className='text-center text-red-400'>{error}</div>
        ) : (
          <>
            {/* Access Logs Table */}
            <div className='mb-12'>
              <h2 className='text-xl font-semibold text-white mb-6'>
                Access Logs
              </h2>
              <div className='bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 shadow-2xl overflow-hidden'>
                <div className='bg-gradient-to-r from-white/10 to-white/5 p-4'>
                  <h3 className='text-lg font-medium text-white'>
                    Recent Access Activities
                  </h3>
                </div>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-white/5 border-b border-white/10'>
                      <tr>
                        <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          User Email
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          Vendor Name
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          Facility Used
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          Access Time
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-white/10'>
                      {accessLogs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className='px-6 py-8 text-center text-slate-400'
                          >
                            No access logs found
                          </td>
                        </tr>
                      ) : (
                        accessLogs.map((log, index) => (
                          <tr
                            key={index}
                            className='hover:bg-white/5 transition-colors'
                          >
                            <td className='px-6 py-4 text-sm text-white'>
                              {log.user_email}
                            </td>
                            <td className='px-6 py-4 text-sm text-white'>
                              {log.vendor_name}
                            </td>
                            <td className='px-6 py-4 text-sm text-white'>
                              {log.facility_used}
                            </td>
                            <td className='px-6 py-4 text-sm text-white'>
                              {formatDateTime(log.access_time)}
                            </td>
                            <td className='px-6 py-4 text-sm'>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  log.status === 'success'
                                    ? 'bg-green-100/20 text-green-400 border border-green-400/20'
                                    : 'bg-red-100/20 text-red-400 border border-red-400/20'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sessions Table */}
            <div>
              <h2 className='text-xl font-semibold text-white mb-6'>
                Active Sessions
              </h2>
              <div className='bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 shadow-2xl overflow-hidden'>
                <div className='bg-gradient-to-r from-white/10 to-white/5 p-4'>
                  <h3 className='text-lg font-medium text-white'>
                    Session Management
                  </h3>
                </div>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-white/5 border-b border-white/10'>
                      <tr>
                        <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          Session ID
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          Vendor ID
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          Expires At
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          Active
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          Revoked By
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          Revoked At
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider'>
                          Created At
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-white/10'>
                      {sessions.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className='px-6 py-8 text-center text-slate-400'
                          >
                            No sessions found
                          </td>
                        </tr>
                      ) : (
                        sessions.map((sessionData, index) => (
                          <tr
                            key={index}
                            className='hover:bg-white/5 transition-colors'
                          >
                            <td className='px-6 py-4 text-sm text-white font-mono text-xs'>
                              {sessionData.session_id.substring(0, 20)}...
                            </td>
                            <td className='px-6 py-4 text-sm text-white'>
                              {sessionData.vendor_id}
                            </td>
                            <td className='px-6 py-4 text-sm text-white'>
                              {formatDateTime(sessionData.expires_at)}
                            </td>
                            <td className='px-6 py-4 text-sm'>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  sessionData.is_active
                                    ? 'bg-green-100/20 text-green-400 border border-green-400/20'
                                    : 'bg-red-100/20 text-red-400 border border-red-400/20'
                                }`}
                              >
                                {sessionData.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className='px-6 py-4 text-sm text-white'>
                              {sessionData.revoked_by || '-'}
                            </td>
                            <td className='px-6 py-4 text-sm text-white'>
                              {sessionData.revoked_at
                                ? formatDateTime(sessionData.revoked_at)
                                : '-'}
                            </td>
                            <td className='px-6 py-4 text-sm text-white'>
                              {formatDateTime(sessionData.created_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
