const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const saveTouserTable = async (
  email,
  password,
  vendor_name,
  vendor_email,
  medium
) => {
  try {
    console.log('saveTouserTable called with:', {
      email: email,
      password: password ? '***masked***' : password,
      vendor_name: vendor_name,
      vendor_email: vendor_email,
      medium: medium,
    });
    // Validate required fields
    if (!email || !password || !vendor_name || !vendor_email || !medium) {
      throw new Error('All fields are required');
    }

    // Validate email format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    if (!emailRegex.test(vendor_email)) {
      throw new Error('Invalid vendor email format');
    }

    const data = await prisma.user_dashboard.create({
      data: {
        email,
        password, // Note: In production, hash the password before storing
        vendor_name,
        vendor_email,
        medium,
      },
    });

    return {
      success: true,
      data: {
        id: data.id,
        email: data.email,
        vendor_name: data.vendor_name,
        vendor_email: data.vendor_email,
        medium: data.medium,
        created_at: data.created_at,
      },
    };
  } catch (error) {
    console.error('Error saving to user_dashboard:', error);

    // Handle unique constraint violation (duplicate email)
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return {
        success: false,
        error: 'Email already exists',
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to save user data',
    };
  }
};
module.exports = {
  saveTouserTable,
};
