// app/api/all-sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const sessions = await prisma.sessions.findMany({
      select: {
        session_id: true,
        vendor_id: true,
        expires_at: true,
        is_active: true,
        revoked_by: true,
        revoked_at: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Convert BigInt values to strings and dates to ISO strings
    const serializedSessions = sessions.map((session) => ({
      ...session,
      vendor_id: session.vendor_id.toString(), // Convert BigInt to string
      expires_at: session.expires_at.toISOString(),
      revoked_at: session.revoked_at ? session.revoked_at.toISOString() : null,
      created_at: session.created_at.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: serializedSessions,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sessions',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
