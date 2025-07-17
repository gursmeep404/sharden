'use client';
import { signIn, getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in and redirect appropriately
    const checkSession = async () => {
      const session = await getSession();
      if (session?.user) {
        redirectUserBasedOnRole(session.user.role);
      }
    };
    checkSession();
  }, []);

  const redirectUserBasedOnRole = (role: string) => {
    console.log('🔀 Redirecting user with role:', role);

    switch (role) {
      case 'bank_employee':
        router.push('/bank-employee');
        break;
      case 'third_party_vendor':
        router.push('/third-party-vendor');
        break;
      case 'user':
        router.push('/user');
        break;
      default:
        console.log('❌ Unknown role:', role);
        router.push('/unauthorized');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔐 Attempting login for:', email);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      console.log('🔐 Login result:', result);

      if (result?.error) {
        console.log('❌ Login failed:', result.error);
        setError('Invalid credentials');
      } else if (result?.ok) {
        console.log('✅ Login successful, checking session...');

        // Small delay to ensure session is updated
        setTimeout(async () => {
          const session = await getSession();
          console.log('🎫 Session after login:', session);

          if (session?.user?.role) {
            redirectUserBasedOnRole(session.user.role);
          } else {
            console.log('❌ No role found in session');
            setError('Role not found. Please contact administrator.');
          }
        }, 100);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='max-w-md w-full space-y-8'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
            SHARDEN - Secure File Transfer
          </h2>
          <p className='mt-2 text-center text-sm text-gray-600'>
            Sign in to your account
          </p>
        </div>
        <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor='email'
              className='block text-sm font-medium text-gray-700'
            >
              Email address
            </label>
            <input
              id='email'
              name='email'
              type='email'
              required
              className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor='password'
              className='block text-sm font-medium text-gray-700'
            >
              Password
            </label>
            <input
              id='password'
              name='password'
              type='password'
              required
              className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className='text-red-600 text-sm text-center'>{error}</div>
          )}
          <button
            type='submit'
            disabled={loading}
            className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50'
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Development helper - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className='mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md'>
            <p className='text-xs text-yellow-800'>
              <strong>Dev Mode:</strong> Expected roles: bank_employee,
              third_party_vendor, user
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
