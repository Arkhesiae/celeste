import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import User from '../models/User.js'; // adapt path based on your project

dotenv.config();

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.log('✅ Admin already exists.');
    return process.exit(0);
  }

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

createAdmin().catch((err) => {
  console.error('❌ Error creating admin:', err);
  process.exit(1);
});