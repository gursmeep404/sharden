const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

/*
POST : Verify Vendor
body: {
  vendor_name: string,
  vendor_email: string,
  vendor_password: string
}
*/

const verifyvendor = async (req, res) => {
  try {
    const { vendor_name, vendor_email, vendor_password } = req.body;

    // Validate required fields
    if (!vendor_name || !vendor_email || !vendor_password) {
      return res.status(400).json({
        success: false,
        message:
          'All fields are required: vendor_name, vendor_email, vendor_password',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(vendor_email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Check if vendor email already exists in verified_vendors
    const existingVendor = await prisma.verified_vendors.findUnique({
      where: {
        vendor_email: vendor_email,
      },
    });

    if (existingVendor) {
      return res.status(409).json({
        success: false,
        message: 'Vendor with this email is already verified',
      });
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(vendor_password, 12);

    // Create JWT token using vendor email, password, and secret
    const JWT_SECRET =
      process.env.JWT_SECRET ||
      'your-super-secure-secret-key-change-this-in-production';

    const tokenPayload = {
      vendor_email: vendor_email,
      vendor_name: vendor_name,
    };

    const vendor_token = jwt.sign(tokenPayload, JWT_SECRET, {
      issuer: 'vendor-verification-system',
    });

    // Insert new verified vendor into verified_vendors table
    const newVerifiedVendor = await prisma.verified_vendors.create({
      data: {
        vendor_name,
        vendor_email,
        vendor_password: hashedPassword,
        vendor_token,
      },
    });

    const emailtoDelete = vendor_email;
    async function deleteVendorRequest(email) {
      try {
        const DeleteVendor = await prisma.vendor_requests.delete({
          where: {
            vendor_email: email,
          },
        });
        console.log('Deleted Vendor:', DeleteVendor);
      } catch (error) {
        console.log(
          'Note: No vendor request found to delete for:',
          vendor_email
        );
      }
    }
    await deleteVendorRequest(emailtoDelete);

    // Return success response (exclude password from response)
    res.status(201).json({
      success: true,
      message: 'Vendor verified successfully',
      data: {
        id: newVerifiedVendor.id.toString(), // Convert BigInt to string
        vendor_name: newVerifiedVendor.vendor_name,
        vendor_email: newVerifiedVendor.vendor_email,
        vendor_token: newVerifiedVendor.vendor_token,
        created_at: newVerifiedVendor.created_at,
      },
    });
  } catch (error) {
    console.error('Error in verifyvendor:', error);

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.includes('vendor_email')
        ? 'email'
        : 'token';
      return res.status(409).json({
        success: false,
        message: `Vendor with this ${field} already exists`,
      });
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(500).json({
        success: false,
        message: 'Error generating verification token',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  verifyvendor,
};
