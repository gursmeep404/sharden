'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Decrypt() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'bank_employee') {
      router.push('/unauthorized');
    }
  }, [session, status, router]);

  if (status === 'loading') return <div>Loading....</div>;

  return (
    <div className='min-h-screen bg-gradient-background'>
      <div className='bg-[hsl(220,30%,8%)] shadow'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-6'>
            <div>
              <h1 className='text-2xl font-bold text-[hsl(45,93%,47%)]'>
                <span className='text-2xl font-bold bg-gradient-to-r from-[hsl(210,100%,50%)] to-[hsl(45,93%,47%)] bg-clip-text text-transparent'>
                  SHARDEN
                </span>{' '}
                - File-Decryption
              </h1>
              <p className='text-sm text-gray-600'>
                Welcome, {session?.user?.name} ({session?.user?.email})
              </p>
            </div>
            <div className='flex justify-between items-center py-10 gap-6'>
              <button className='bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors'>
                <a href='/bank-employee'>Dashboard</a>
              </button>
              <button
                onClick={() => signOut()}
                className='bg-red-600 text-white px-10 py-2 rounded hover:bg-red-700 transition-colors'
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
