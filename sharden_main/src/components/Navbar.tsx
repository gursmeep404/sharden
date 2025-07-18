'use client';

import { Zap } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className='relative z-50 bg-[hsl(220,30%,8%)] backdrop-blur-md border-b border-[hsl(220,25%,15%)]'>
      <div className='max-w-7xl mx-auto px-6 sm:px-8'>
        <div className='flex justify-between items-center h-16'>
          {/* Logo */}
          <div className='flex items-center space-x-2'>
            <div className='relative'>
              <Zap className='h-8 w-8 text-[hsl(45,93%,47%)] drop-shadow-[0_0_10px_hsl(45,93%,47%)]' />
              <div className='absolute inset-0 bg-[hsl(45,93%,47%,0.2)] blur-xl rounded-full'></div>
            </div>
            <span className='text-2xl font-bold bg-gradient-to-r from-[hsl(210,100%,50%)] to-[hsl(45,93%,47%)] bg-clip-text text-transparent'>
              Sharden
            </span>
          </div>

          {/* Navigation Links */}
          <div className='hidden md:flex items-center space-x-8'>
            <a
              href='/'
              className='text-[hsl(220,15%,95%)] hover:text-[hsl(45,93%,47%)] transition-colors duration-300 font-medium relative group'
            >
              Home
              <span className='absolute -bottom-1 left-0 w-0 h-0.5 bg-[hsl(45,93%,47%)] transition-all duration-300 group-hover:w-full'></span>
            </a>
            <a
              href='/about'
              className='text-[hsl(220,10%,60%)] hover:text-[hsl(45,93%,47%)] transition-colors duration-300 font-medium relative group'
            >
              About
              <span className='absolute -bottom-1 left-0 w-0 h-0.5 bg-[hsl(45,93%,47%)] transition-all duration-300 group-hover:w-full'></span>
            </a>
            <a
              href='/contact'
              className='text-[hsl(220,10%,60%)] hover:text-[hsl(45,93%,47%)] transition-colors duration-300 font-medium relative group'
            >
              Contact Us
              <span className='absolute -bottom-1 left-0 w-0 h-0.5 bg-[hsl(45,93%,47%)] transition-all duration-300 group-hover:w-full'></span>
            </a>
          </div>

          {/* Mobile menu button */}
          <div className='md:hidden'>
            <button className='text-[hsl(220,15%,95%)] hover:text-[hsl(45,93%,47%)] transition-colors'>
              <svg
                className='h-6 w-6'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M4 6h16M4 12h16M4 18h16'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
