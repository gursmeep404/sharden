const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/*
POST : Verify Vendor
headers{
NAME:
EMAIL:
PASSWORD:
vendor_token:
}
*/

const verifyvendor = async (req, res) => {};

module.exports = {
  verifyvendor,
};
