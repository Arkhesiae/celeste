import {User} from '../models/userModel.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

export async function createAdmin() {
 
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
