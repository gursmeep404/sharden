import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='max-w-md w-full space-y-8 text-center'>
        <h2 className='mt-6 text-3xl font-extrabold text-gray-900'>
          Unauthorized Access
        </h2>
        <p className='mt-2 text-sm text-gray-600'>
          You don&apos;t have permission to access this page.
        </p>
        <Link
          href='/'
          className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
