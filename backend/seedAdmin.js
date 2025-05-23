const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const {User} = require('./models/userModel.js');

dotenv.config();

export async function createAdmin() {

  console.log(process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI);
 
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
    registrationStatus: 'approved',
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
