// app/api/user-dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route'; // Adjust path to your auth options
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      );
    }

    // Fetch user dashboard data for the logged-in user
    const userDashboardData = await prisma.user_dashboard.findMany({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        email: true,
        vendor_name: true,
        medium: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: userDashboardData,
    });
  } catch (error) {
    console.error('Error fetching user dashboard data:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
