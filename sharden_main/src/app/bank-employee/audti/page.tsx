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
          <h2 className='text-3xl font-bold text-white mb-6'>Sessions</h2>
        </div>
      </div>
    </div>
  );
}
