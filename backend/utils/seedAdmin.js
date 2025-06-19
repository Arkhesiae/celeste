import User from '../models/User.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
 
  const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
  
  console.log(process.env.ADMIN_PASSWORD);
  console.log(process.env.ADMIN_EMAIL);
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

  const adminData = {
    name: 'Super',
    lastName: 'Admin',
    isAdmin: true,
    isActive: true,
    adminType: 'master',
    registrationStatus: 'verified',
    email: process.env.ADMIN_EMAIL,
    points: Number.MAX_SAFE_INTEGER,
    password: hashedPassword,
    preferences: {
      theme: false,
      notifications: true,
      emailNotifications: true,
    },
  };

  if (existingAdmin) {
    // Mettre à jour l'administrateur existant
    Object.assign(existingAdmin, adminData);
    await existingAdmin.save();
    console.log('🔄 Admin account updated:', existingAdmin.email);
  } else {
    // Créer un nouvel administrateur
    const admin = new User(adminData);
    await admin.save();
    console.log('🚀 Admin account created:', admin.email);
  }
}

export { createAdmin };