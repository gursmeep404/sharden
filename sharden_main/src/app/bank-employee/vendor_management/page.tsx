'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Prisma } from '@prisma/client';

export default function VendorManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [verifiedVendors, setVerifiedVendors] = useState([]);
  const [vendorRequests, setVendorRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'bank_employee') {
      router.push('/unauthorized');
    } else {
      fetchData();
    }
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch verified vendors
      const verifiedResponse = await fetch('/api/verified-vendors');
      if (verifiedResponse.ok) {
        const verifiedData = await verifiedResponse.json();
        setVerifiedVendors(verifiedData.data || []);
      }

      // Fetch vendor requests
      const requestsResponse = await fetch('/api/vendor-requests');
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setVendorRequests(requestsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (vendorId, vendorData) => {
    try {
      setActionLoading(`accept-${vendorId}`);

      // Make sure we have all required fields
      if (
        !vendorData.vendor_name ||
        !vendorData.vendor_email ||
        !vendorData.vendor_password
      ) {
        console.error('Missing required vendor data fields');
        alert('Missing required vendor information');
        return;
      }

      const response = await fetch('http://localhost:3000/verifyvendor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendor_name: vendorData.vendor_name,
          vendor_email: vendorData.vendor_email,
          vendor_password: vendorData.vendor_password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Vendor verified successfully:', result);
        await fetchData(); // Refresh data
        // Optional: Show success message
        alert('Vendor verified successfully!');
      } else {
        console.error('Error accepting vendor:', result.message);
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error accepting vendor:', error);
      alert('Network error occurred while accepting vendor');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (vendorId) => {
    try {
      setActionLoading(`reject-${vendorId}`);

      const response = await fetch(`/api/vendor-requests/${vendorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchData(); // Refresh data
      } else {
        console.error('Error rejecting vendor');
      }
    } catch (error) {
      console.error('Error rejecting vendor:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveVerified = async (vendorId, vendorEmail) => {
    try {
      setActionLoading(`remove-${vendorId}`);

      const response = await fetch('http://localhost:3000/deleteverified', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verifiedemailtoDelete: vendorEmail,
        }),
      });

      if (response.ok) {
        await fetchData(); // Refresh data
        console.log(`Vendor ${vendorEmail} removed successfully`);
      } else {
        console.error('Error removing verified vendor');
      }
    } catch (error) {
      console.error('Error removing verified vendor:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className='min-h-screen bg-gradient-background flex items-center justify-center'>
        <div className='text-white text-xl'>Loading...</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-background'>
      <header className='bg-[hsl(220,30%,8%)] shadow'>
        <div className='mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8'>
          <div>
            <h1 className='text-2xl font-bold text-[hsl(45,93%,47%)]'>
              <span className='bg-gradient-to-r from-[hsl(210,100%,50%)] to-[hsl(45,93%,47%)] bg-clip-text text-transparent'>
                SHARDEN
              </span>{' '}
              Manage Vendors
            </h1>
            <p className='text-sm text-gray-300'>
              Logged in as {session.user.name ?? 'Bank Employee'} (
              {session.user.email})
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
      </header>

      <main className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8'>
        {/* Verified Vendors Table */}
        <section>
          <div className='mb-6'>
            <h2 className='text-2xl font-bold text-white mb-2'>
              Verified Vendors
            </h2>
            <p className='text-gray-300'>
              Currently verified and active vendors
            </p>
          </div>

          <div className='overflow-hidden rounded-xl border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] backdrop-blur-sm'>
            <table className='w-full'>
              <thead>
                <tr className='bg-white/5 border-b border-white/10'>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-white'>
                    Vendor Name
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-white'>
                    Email
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-white'>
                    Created At
                  </th>
                  <th className='px-6 py-4 text-center text-sm font-semibold text-white'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-white/10'>
                {verifiedVendors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className='px-6 py-8 text-center text-gray-400'
                    >
                      No verified vendors found
                    </td>
                  </tr>
                ) : (
                  verifiedVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className='hover:bg-white/5 transition-colors'
                    >
                      <td className='px-6 py-4 text-sm text-white font-medium'>
                        {vendor.vendor_name}
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-300'>
                        {vendor.vendor_email}
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-300'>
                        {formatDate(vendor.created_at)}
                      </td>
                      <td className='px-6 py-4 text-center'>
                        <button
                          onClick={() =>
                            handleRemoveVerified(vendor.id, vendor.vendor_email)
                          }
                          disabled={actionLoading === `remove-${vendor.id}`}
                          className='inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                          {actionLoading === `remove-${vendor.id}` ? (
                            <>
                              <div className='w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin mr-1'></div>
                              Removing...
                            </>
                          ) : (
                            'Remove'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Vendor Requests Table */}
        <section>
          <div className='mb-6'>
            <h2 className='text-2xl font-bold text-white mb-2'>
              Pending Vendor Requests
            </h2>
            <p className='text-gray-300'>
              Vendors awaiting verification approval
            </p>
          </div>

          <div className='overflow-hidden rounded-xl border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] backdrop-blur-sm'>
            <table className='w-full'>
              <thead>
                <tr className='bg-white/5 border-b border-white/10'>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-white'>
                    Vendor Name
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-white'>
                    Email
                  </th>
                  <th className='px-6 py-4 text-left text-sm font-semibold text-white'>
                    Created At
                  </th>
                  <th className='px-6 py-4 text-center text-sm font-semibold text-white'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-white/10'>
                {vendorRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className='px-6 py-8 text-center text-gray-400'
                    >
                      No pending requests found
                    </td>
                  </tr>
                ) : (
                  vendorRequests.map((request) => (
                    <tr
                      key={request.id}
                      className='hover:bg-white/5 transition-colors'
                    >
                      <td className='px-6 py-4 text-sm text-white font-medium'>
                        {request.vendor_name}
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-300'>
                        {request.vendor_email}
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-300'>
                        {formatDate(request.created_at)}
                      </td>
                      <td className='px-6 py-4 text-center'>
                        <div className='flex justify-center gap-2'>
                          <button
                            onClick={() => handleAccept(request.id, request)}
                            disabled={actionLoading === `accept-${request.id}`}
                            className='inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            {actionLoading === `accept-${request.id}` ? (
                              <>
                                <div className='w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin mr-1'></div>
                                Accepting...
                              </>
                            ) : (
                              'Accept'
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            disabled={actionLoading === `reject-${request.id}`}
                            className='inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            {actionLoading === `reject-${request.id}` ? (
                              <>
                                <div className='w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin mr-1'></div>
                                Rejecting...
                              </>
                            ) : (
                              'Reject'
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
