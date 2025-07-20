// app/api/access-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const accessLogs = await prisma.access_logs.findMany({
      select: {
        user_email: true,
        vendor_name: true,
        facility_used: true,
        access_time: true,
        status: true,
      },
      orderBy: {
        access_time: 'desc',
      },
    });

    // Convert any potential BigInt values to strings
    const serializedAccessLogs = accessLogs.map((log) => ({
      ...log,
      access_time: log.access_time.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: serializedAccessLogs,
    });
  } catch (error) {
    console.error('Error fetching access logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch access logs',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
