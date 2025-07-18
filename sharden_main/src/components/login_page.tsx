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
    <div className='w-full max-w-md mx-auto'>
      <div className='bg-[hsl(220,30%,8%,0.8)] backdrop-blur-lg border border-[hsl(210,100%,50%,0.2)] rounded-2xl p-8 shadow-2xl'>
        <div className='text-center mb-8'>
          <h2 className='text-3xl font-bold bg-gradient-to-r from-[hsl(210,100%,50%)] to-[hsl(45,93%,47%)] bg-clip-text text-transparent mb-2'>
            SHARDEN
          </h2>
          <p className='text-[hsl(220,10%,60%)] text-sm'>Login</p>
          <div className='w-12 h-1 bg-gradient-to-r from-[hsl(210,100%,50%)] to-[hsl(45,93%,47%)] rounded-full mx-auto mt-3'></div>
        </div>
        <form className='space-y-6' onSubmit={handleSubmit}>
          <div className='space-y-2'>
            <label
              htmlFor='email'
              className='block text-sm font-medium text-[hsl(220,15%,95%)]'
            >
              Email address
            </label>
            <input
              id='email'
              name='email'
              type='email'
              required
              className='w-full px-4 py-3 bg-[hsl(220,25%,12%,0.5)] border border-[hsl(210,100%,50%,0.3)] rounded-lg text-[hsl(220,15%,95%)] placeholder-[hsl(220,10%,60%)] focus:outline-none focus:ring-2 focus:ring-[hsl(210,100%,50%,0.5)] focus:border-[hsl(210,100%,50%)] transition-all duration-200'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='Enter your email'
            />
          </div>
          <div className='space-y-2'>
            <label
              htmlFor='password'
              className='block text-sm font-medium text-[hsl(220,15%,95%)]'
            >
              Password
            </label>
            <input
              id='password'
              name='password'
              type='password'
              required
              className='w-full px-4 py-3 bg-[hsl(220,25%,12%,0.5)] border border-[hsl(210,100%,50%,0.3)] rounded-lg text-[hsl(220,15%,95%)] placeholder-[hsl(220,10%,60%)] focus:outline-none focus:ring-2 focus:ring-[hsl(210,100%,50%,0.5)] focus:border-[hsl(210,100%,50%)] transition-all duration-200'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Enter your password'
            />
          </div>
          {error && (
            <div className='text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg p-3'>
              {error}
            </div>
          )}
          <button
            type='submit'
            disabled={loading}
            className='w-full py-3 px-6 bg-gradient-to-r from-[hsl(210,100%,50%)] to-[hsl(45,93%,47%)] text-[hsl(220,30%,8%)] font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[hsl(210,100%,50%,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
          >
            {loading ? (
              <span className='flex items-center justify-center space-x-2'>
                <div className='w-4 h-4 border-2 border-[hsl(220,30%,8%,0.3)] border-t-[hsl(220,30%,8%)] rounded-full animate-spin'></div>
                <span>Signing in...</span>
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Development helper - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className='mt-6 p-3 bg-[hsl(45,93%,47%,0.1)] border border-[hsl(45,93%,47%,0.2)] rounded-lg'>
            <p className='text-xs text-[hsl(45,93%,47%)]'>
              <strong>Dev Mode:</strong> Expected roles: bank_employee,
              third_party_vendor, user
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
