const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const authenticateVendor = async (req, res, next) => {
  try {
    const vendorToken = req.headers['vendor-token'];
    const vendorEmail = req.body.vendorEmail || req.headers['vendor-email'];

    if (!vendorToken || !vendorEmail) {
      return res.status(401).json({
        success: false,
        error: 'Vendor token and email required',
      });
    }

    const vendor = await prisma.verified_vendors.findFirst({
      where: {
        vendor_token: vendorToken,
        vendor_email: vendorEmail,
      },
    });

    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or unverified vendor',
      });
    }

    req.vendor = vendor;
    next();
  } catch (error) {
    console.error('Vendor authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

module.exports = {
  authenticateVendor,
};
