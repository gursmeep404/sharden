const jwt = require('jsonwebtoken');
require('dotenv').config();
const SESSION_DURATION = 24 * 60 * 60 * 1000;
const JWT_SECRET = 'thisisanicejwttokentoverify';
const generateSessionToken = (userId, vendorId) => {
  const payload = {
    userId: userId.toString(), // Convert BigInt to string
    vendorId: vendorId.toString(), // Convert BigInt to string
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + SESSION_DURATION) / 1000),
  };
  return jwt.sign(payload, JWT_SECRET);
};
module.exports = {
  generateSessionToken,
};
