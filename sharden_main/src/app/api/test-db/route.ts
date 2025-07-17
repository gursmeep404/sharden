import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('🧪 Testing database connection...');

    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Test querying roles
    const roles = await prisma.userRoles.findMany();
    console.log('📋 Roles found:', roles);

    // Test querying users (without passwords)
    const users = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: {
          select: {
            role_name: true,
          },
        },
      },
    });
    console.log('👥 Users found:', users);

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        roles,
        users,
      },
    });
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
