const { PrismaClient } = require('@prisma/client');
const { deleteVendorRequest } = require('./verifyvendor');
const prisma = new PrismaClient();
const deleteRequest = async (req, res) => {
  const { emailtoDelete } = req.body;

  // Input validation
  if (!emailtoDelete) {
    return res.status(400).json({
      success: false,
      message: 'Email is required',
    });
  }

  try {
    const DeleteVendor = await prisma.vendor_requests.delete({
      where: {
        vendor_email: emailtoDelete,
      },
    });

    console.log('Deleted Vendor Request:', DeleteVendor);

    // Send success response with converted BigInt
    return res.status(200).json({
      success: true,
      message: 'Vendor request deleted successfully',
      deletedRequest: {
        id: DeleteVendor.id.toString(), // Convert BigInt to string
        vendor_email: DeleteVendor.vendor_email,
        vendor_name: DeleteVendor.vendor_name,
      },
    });
  } catch (error) {
    console.error('Error deleting vendor request:', error);

    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: `No vendor request found to delete for: ${emailtoDelete}`,
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred while deleting vendor request',
    });
  }
};
const deleteVerifiedRequest = async (req, res) => {
  const { verifiedemailtoDelete } = req.body;

  // Input validation
  if (!verifiedemailtoDelete) {
    return res.status(400).json({
      success: false,
      message: 'Email is required',
    });
  }

  try {
    const DeleteVendor = await prisma.verified_vendors.delete({
      where: {
        vendor_email: verifiedemailtoDelete,
      },
    });

    console.log('Deleted Vendor:', DeleteVendor);

    // Send success response
    return res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully',
      deletedVendor: {
        id: DeleteVendor.id.toString(),
        vendor_email: DeleteVendor.vendor_email,
        vendor_name: DeleteVendor.vendor_name,
      },
    });
  } catch (error) {
    console.error('Error deleting vendor:', error);

    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found with the provided email',
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred while deleting vendor',
    });
  }
};
module.exports = {
  deleteRequest,
  deleteVerifiedRequest,
};
