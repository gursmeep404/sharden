import LoginPage from './login_page';

const HeroSection = () => {
  return (
    <section
      className='min-h-screen relative flex items-center justify-center bg-gradient-background'
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)),`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Animated background elements */}
      <div className='absolute inset-0 overflow-hidden'>
        <div className='absolute top-1/4 left-1/4 w-64 h-64 bg-electric-blue/10 rounded-full blur-3xl animate-pulse'></div>
        <div className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-bright-yellow/10 rounded-full blur-3xl animate-pulse delay-1000'></div>
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-electric-blue/20 rounded-full blur-2xl animate-ping'></div>
      </div>

      <div className='relative z-10 max-w-7xl mx-auto px-6 sm:px-8 w-full'>
        <div className='grid md:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[80vh]'>
          {/* Left Column - Hero Text */}
          <div className='space-y-8'>
            <div className='space-y-6'>
              <h1 className='text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight'>
                <span className='block text-foreground'>Welcome to</span>
                <span className='block bg-gradient-primary bg-clip-text text-transparent drop-shadow-lg'>
                  Sharden
                </span>
              </h1>
              <p className='text-lg sm:text-xl lg:text-2xl text-muted-foreground leading-relaxed'>
                Experience the future of digital innovation with our
                cutting-edge platform designed for tomorrow&apos;s challenges.
              </p>
            </div>

            <div className='flex flex-wrap gap-4'>
              <div className='flex items-center space-x-2 text-electric-blue'>
                <div className='w-2 h-2 bg-electric-blue rounded-full animate-pulse'></div>
                <span className='text-sm font-medium'>Secure</span>
              </div>
              <div className='flex items-center space-x-2 text-bright-yellow'>
                <div className='w-2 h-2 bg-bright-yellow rounded-full animate-pulse delay-300'></div>
                <span className='text-sm font-medium'>Fast</span>
              </div>
              <div className='flex items-center space-x-2 text-electric-blue'>
                <div className='w-2 h-2 bg-electric-blue rounded-full animate-pulse delay-700'></div>
                <span className='text-sm font-medium'>Innovative</span>
              </div>
            </div>

            {/* Floating elements for visual appeal */}
            <div className='hidden lg:block absolute -left-10 top-20 w-20 h-20 border border-electric-blue/30 rounded-lg rotate-45 animate-spin'></div>
            <div className='hidden lg:block absolute -left-6 bottom-20 w-12 h-12 border border-bright-yellow/30 rounded-full animate-bounce'></div>
          </div>

          {/* Right Column - Login Form */}
          <div className='flex justify-center'>
            <LoginPage />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className='absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce'>
        <div className='w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center'>
          <div className='w-1 h-3 bg-electric-blue rounded-full mt-2 animate-pulse'></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
