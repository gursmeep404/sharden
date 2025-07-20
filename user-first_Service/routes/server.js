const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');
// Import controller
const { getBankData } = require('../controllers/userFirst');
const { verifyvendor } = require('../controllers/verifyvendor');
const { requestverification } = require('../controllers/requestVerification');
const {
  deleteRequest,
  deleteVerifiedRequest,
} = require('../controllers/deleterequest');

const { authenticateVendor } = require('../controllers/vendorAuthentication');

const { generateSessionToken } = require('../controllers/generateSessionToken');
const SESSION_DURATION = 24 * 60 * 60 * 1000;
// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Direct route using controller
app.get('/bank-data', getBankData);
app.post('/verifyvendor', verifyvendor);

app.post('/reqverification', requestverification);
app.delete('/deleterequest', deleteRequest);
app.delete('/deleteverified', deleteVerifiedRequest);

app.post('/get_balance', authenticateVendor, async (req, res) => {
  try {
    const { email, password, accountNumber } = req.body;
    const vendor = req.vendor;

    // Validate required fields
    if (!email || !password || !accountNumber) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and account number are required',
      });
    }

    // Find and authenticate user
    const user = await prisma.bankData.findFirst({
      where: {
        email: email,
        accountNumber: accountNumber,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check for existing active session
    let session = await prisma.sessions.findFirst({
      where: {
        user_id: user.userId,
        vendor_id: vendor.id,
        is_active: true,
        expires_at: {
          gt: new Date(),
        },
      },
    });

    // Create new session if none exists
    if (!session) {
      const sessionId = uuidv4();
      const sessionToken = generateSessionToken(user.userId, vendor.id);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      session = await prisma.sessions.create({
        data: {
          session_id: sessionId,
          user_id: user.userId,
          vendor_id: vendor.id,
          session_token: sessionToken,
          expires_at: expiresAt,
          is_active: true,
        },
      });
    }

    // Log the access
    await prisma.access_logs.create({
      data: {
        session_id: session.session_id,
        user_email: user.email,
        vendor_name: vendor.vendor_name,
        facility_used: 'get_balance',
        status: 'success',
      },
    });

    // Return balance information
    res.json({
      success: true,
      data: {
        sessionId: session.session_id,
        user: {
          name: user.name,
          email: user.email,
          accountNumber: user.accountNumber,
          balance: parseFloat(user.balance),
        },
        vendor: {
          name: vendor.vendor_name,
          email: vendor.vendor_email,
        },
        sessionExpiresAt: session.expires_at,
        facilityUsed: 'get_balance',
      },
    });
  } catch (error) {
    console.error('Get balance error:', error);

    // Log failed access
    if (req.body.email && req.vendor) {
      await prisma.access_logs
        .create({
          data: {
            session_id: 'failed',
            user_email: req.body.email,
            vendor_name: req.vendor.vendor_name,
            facility_used: 'get_balance',
            status: 'failed',
          },
        })
        .catch((logError) => console.error('Logging error:', logError));
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

app.post('/revoke-session', async (req, res) => {
  try {
    const { sessionId, revokedBy = 'Bank Employee' } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required',
      });
    }

    const updatedSession = await prisma.sessions.update({
      where: { session_id: sessionId },
      data: {
        is_active: false,
        revoked_by: revokedBy,
        revoked_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Session revoked successfully',
      data: {
        sessionId: updatedSession.session_id,
        revokedBy: revokedBy,
        revokedAt: updatedSession.revoked_at,
      },
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      success: false,
      error: 'Session not found or already revoked',
    });
  }
});

app.get('/sessions', async (req, res) => {
  try {
    const sessions = await prisma.sessions.findMany({
      where: {
        is_active: true,
        expires_at: {
          gt: new Date(),
        },
      },
      include: {
        verified_vendors: {
          select: {
            vendor_name: true,
            vendor_email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Get user details for each session
    const sessionsWithUserData = await Promise.all(
      sessions.map(async (session) => {
        const user = await prisma.bankData.findFirst({
          where: { userId: session.user_id },
          select: {
            name: true,
            email: true,
            accountNumber: true,
          },
        });

        return {
          sessionId: session.session_id,
          user: user || null,
          vendor: session.verified_vendors,
          createdAt: session.created_at,
          expiresAt: session.expires_at,
          isActive: session.is_active,
        };
      })
    );

    res.json({
      success: true,
      data: sessionsWithUserData,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

//---------------------------------------------------------------------------------------------------------------

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Bank Data API Server is running!',
    status: 'healthy',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`Bank data endpoint: http://localhost:${PORT}/bank-data`);
});

module.exports = app;
