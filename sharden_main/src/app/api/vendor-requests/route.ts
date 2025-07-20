// app/api/vendor-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route'; // Adjust path as needed

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and has bank_employee role
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'bank_employee') {
      return NextResponse.json(
        { error: 'Unauthorized. Bank employee access required.' },
        { status: 401 }
      );
    }

    // Fetch all pending vendor requests
    const vendorRequests = await prisma.vendor_requests.findMany({
      select: {
        id: true,
        vendor_name: true,
        vendor_email: true,
        vendor_documentation: true,
        created_at: true,
        updated_at: true,
        // Include password for verification process (you might want to exclude this based on security requirements)
        vendor_password: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Convert BigInt id to string for JSON serialization
    const serializedRequests = vendorRequests.map((request) => ({
      ...request,
      id: request.id.toString(),
    }));

    return NextResponse.json({
      success: true,
      data: serializedRequests,
      count: serializedRequests.length,
    });
  } catch (error) {
    console.error('Error fetching vendor requests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch vendor requests',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
