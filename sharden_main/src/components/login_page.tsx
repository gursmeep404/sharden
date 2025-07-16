import React from 'react';

const LoginPage = () => {
  return (
    <div className='flex justify-center items-center h-screen'>
      <form className='flex flex-col w-80 p-8 shadow-lg rounded-lg'>
        <h2 className='text-2xl font-bold mb-4'>Login</h2>
        <label htmlFor='email' className='mb-2'>
          Email
        </label>
        <input
          type='email'
          id='email'
          name='email'
          className='border rounded-md px-3 py-2 mb-4'
        />
        <label htmlFor='password' className='mb-2'>
          Password
        </label>
        <input
          type='password'
          id='password'
          name='password'
          className='border rounded-md px-3 py-2 mb-6'
        />
        <button
          type='submit'
          className='bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded'
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
