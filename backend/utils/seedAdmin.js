const {User} = require('../models/userModel.js');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

async function createAdmin() {
 
  const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (existingAdmin) {
    console.log('✅ Admin already exists.');
    return process.exit(0);
  }
  console.log(process.env.ADMIN_PASSWORD);
  console.log(process.env.ADMIN_EMAIL);
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

  const admin = new User({
    name: 'Super',
    lastName: 'Admin',
    isAdmin: true,
    isActive: true,
    adminType: 'master',
    registrationStatus: 'verified',
    email: process.env.ADMIN_EMAIL,
    password: hashedPassword,
    preferences: {
      theme: false,
      notifications: true,
      emailNotifications: true,
    },
  });

  await admin.save();
  console.log('🚀 Admin account created:', admin.email);

  process.exit(0);
}

module.exports = { createAdmin };