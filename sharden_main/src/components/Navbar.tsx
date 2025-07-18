'use client';

import { Zap } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className='relative z-50 bg-dark-surface/90 backdrop-blur-md border-b border-border'>
      <div className='max-w-7xl mx-auto px-6 sm:px-8'>
        <div className='flex justify-between items-center h-16'>
          {/* Logo */}
          <div className='flex items-center space-x-2'>
            <div className='relative'>
              <Zap className='h-8 w-8 text-bright-yellow drop-shadow-[0_0_10px_hsl(var(--bright-yellow))]' />
              <div className='absolute inset-0 bg-bright-yellow/20 blur-xl rounded-full'></div>
            </div>
            <span className='text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent'>
              Sharden
            </span>
          </div>

          {/* Navigation Links */}
          <div className='hidden md:flex items-center space-x-8'>
            <a
              href='/'
              className='text-foreground hover:text-bright-yellow transition-colors duration-300 font-medium relative group'
            >
              Home
              <span className='absolute -bottom-1 left-0 w-0 h-0.5 bg-bright-yellow transition-all duration-300 group-hover:w-full'></span>
            </a>
            <a
              href='/about'
              className='text-muted-foreground hover:text-bright-yellow transition-colors duration-300 font-medium relative group'
            >
              About
              <span className='absolute -bottom-1 left-0 w-0 h-0.5 bg-bright-yellow transition-all duration-300 group-hover:w-full'></span>
            </a>
            <a
              href='/contact'
              className='text-muted-foreground hover:text-bright-yellow transition-colors duration-300 font-medium relative group'
            >
              Contact Us
              <span className='absolute -bottom-1 left-0 w-0 h-0.5 bg-bright-yellow transition-all duration-300 group-hover:w-full'></span>
            </a>
          </div>

          {/* Mobile menu button */}
          <div className='md:hidden'>
            <button className='text-foreground hover:text-bright-yellow transition-colors'>
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
