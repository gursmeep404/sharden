const { PrismaClient } = require('@prisma/client');
const { deleteVendorRequest } = require('./verifyvendor');

const deleteRequest = async (req, res) => {
  const { emailtoDelete } = req.body;
  try {
    await deleteRequest(emailtoDelete);
    console.log('Deleted Vendor:', DeleteVendor);
  } catch (error) {
    console.log('Note: No vendor request found to delete');
  }
};
const deleteVerifiedRequest = async (req, res) => {
  const { verifiedemailtoDelete } = req.body;
  try {
    const DeleteVendor = await prisma.verified_vendors.delete({
      where: {
        vendor_email: verifiedemailtoDelete,
      },
    });
    console.log('Deleted Vendor:', DeleteVendor);
  } catch (error) {
    console.log('Note: No vendor request found to delete');
  }
};
module.exports = {
  deleteRequest,
  deleteVerifiedRequest,
};
