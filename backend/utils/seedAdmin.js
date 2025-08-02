import User from '../models/User.js';
import Center from '../models/Center.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
  const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
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

async function createLocalAdmin() {
  const centers = await Center.find({});

  for (const center of centers) {
    const ADMIN_EMAIL = `admin-${center.OACI.toLowerCase()}@celeste-app.fr`;
    const ADMIN_PASSWORD = `admin-${center.OACI.toLowerCase()}`;
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const adminData = {
      name: center.OACI.charAt(0).toUpperCase() + center.OACI.slice(1),
      lastName: 'Admin',
      isAdmin: true,
      isActive: true,
      adminType: 'local',
      centerId: center._id,
      registrationStatus: 'verified',
      email: ADMIN_EMAIL,
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
      console.log('🔄 Local admin account updated:', existingAdmin.email);
    } else {
      // Créer un nouvel administrateur
      const admin = new User(adminData);
      await admin.save();
      console.log('🚀 Local Admin account created:', admin.email);
    }
  }
}



export { createAdmin, createLocalAdmin };