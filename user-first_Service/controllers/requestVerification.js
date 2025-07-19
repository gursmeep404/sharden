const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/*
POST : Request Vendor Verification
body: {
  vendor_name: string,
  vendor_email: string,
  vendor_password: string,
  vendor_documentation: string
}
*/

const requestverification = async (req, res) => {
  try {
    const { vendor_name, vendor_email, vendor_password, vendor_documentation } =
      req.body;

    if (
      !vendor_name ||
      !vendor_email ||
      !vendor_password ||
      !vendor_documentation
    ) {
      return res.status(400).json({
        success: false,
        message:
          'All fields are required: vendor_name, vendor_email, vendor_password, vendor_documentation',
      });
    }

    const existingRequest = await prisma.vendor_requests.findUnique({
      where: {
        vendor_email: vendor_email,
      },
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: 'Verification request with this email already exists',
      });
    }

    // Insert new vendor request into vendor_requests table
    const newRequest = await prisma.vendor_requests.create({
      data: {
        vendor_name,
        vendor_email,
        vendor_password, // Note: In production, hash the password before storing
        vendor_documentation,
      },
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Vendor verification request submitted successfully',
      data: {
        id: newRequest.id.tostring(),
        vendor_name: newRequest.vendor_name,
        vendor_email: newRequest.vendor_email,
        vendor_documentation: newRequest.vendor_documentation,
        created_at: newRequest.created_at,
      },
    });
  } catch (error) {
    console.error('Error in requestverification:', error);

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Verification request with this email already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  requestverification,
};
