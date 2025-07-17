import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'info',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  });

// Database connection logging
prisma.$on(
  'query',
  (e: { query: string; params: string; duration: number }) => {
    console.log('🔍 Query: ' + e.query);
    console.log('📊 Params: ' + e.params);
    console.log('⏱️  Duration: ' + e.duration + 'ms');
  }
);

prisma.$on('info', (e: { message: string }) => {
  console.log('ℹ️  Info: ' + e.message);
});

prisma.$on('warn', (e: { message: string }) => {
  console.log('⚠️  Warning: ' + e.message);
});

prisma.$on('error', (e: { message: string }) => {
  console.log('❌ Error: ' + e.message);
});

// Test database connection
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully!');

    // Test query to verify connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('🎯 Database test query result:', result);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

// Call test connection when the module loads
testConnection();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
