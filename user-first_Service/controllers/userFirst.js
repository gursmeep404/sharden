const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// Controller to fetch bank data records based on header input
const getBankData = async (req, res) => {
  try {
    const recordCount =
      req.headers['record-count'] || req.headers['x-record-count'];

    if (!recordCount) {
      return res.status(400).json({
        error:
          'Record count is required in header (record-count or x-record-count)',
      });
    }

    const limit = parseInt(recordCount);

    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({
        error: 'Record count must be a positive number',
      });
    }

    // Fetch records from BankData table
    const bankData = await prisma.bankData.findMany({
      take: limit,
      omit: {
        password: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      count: bankData.length,
      data: bankData,
    });
  } catch (error) {
    console.error('Error fetching bank data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

module.exports = {
  getBankData,
};
