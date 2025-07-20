// app/api/verified-vendors/route.ts
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

    // Fetch all verified vendors
    const verifiedVendors = await prisma.verified_vendors.findMany({
      select: {
        id: true,
        vendor_name: true,
        vendor_email: true,
        vendor_token: true,
        created_at: true,
        updated_at: true,
        // Exclude password from response for security
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Convert BigInt id to string for JSON serialization
    const serializedVendors = verifiedVendors.map((vendor) => ({
      ...vendor,
      id: vendor.id.toString(),
    }));

    return NextResponse.json({
      success: true,
      data: serializedVendors,
      count: serializedVendors.length,
    });
  } catch (error) {
    console.error('Error fetching verified vendors:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch verified vendors',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
