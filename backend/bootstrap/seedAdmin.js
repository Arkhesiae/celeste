import User from '../models/User.js';
import Center from '../models/Center.js';
import bcrypt from 'bcrypt';

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

  };

  if (existingAdmin) {
    // Mettre à jour l'administrateur existant
    Object.assign(existingAdmin, adminData);
    await existingAdmin.save();
    
  } else {
    // Créer un nouvel administrateur
    const admin = new User(adminData);
    await admin.save();
    
  }
  console.log('🔄 Admin account updated');
}

async function createLocalAdmin() {
  // Base secret pour les mots de passe des admins locaux. Sans elle, aucun compte n'est créé
  // ni modifié (pas de mot de passe par défaut devinable).
  const basePassword = process.env.LOCAL_ADMIN_PASSWORD;
  if (!basePassword) {
    console.warn('⚠️  LOCAL_ADMIN_PASSWORD non défini : création des admins locaux ignorée.');
    return;
  }

  const centers = await Center.find({});

  for (const center of centers) {
    const ADMIN_EMAIL = `admin-${center.OACI.toLowerCase()}@celeste-app.fr`;
    // Mot de passe propre à chaque centre, dérivé de la variable d'environnement
    const ADMIN_PASSWORD = `${basePassword}-${center.OACI.toLowerCase()}`;
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

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
    };

    if (existingAdmin) {
      // Mettre à jour l'administrateur existant, sans écraser son mot de passe
      Object.assign(existingAdmin, adminData);
      await existingAdmin.save();
      
    } else {
      // Créer un nouvel administrateur
      const admin = new User({ ...adminData, password: await bcrypt.hash(ADMIN_PASSWORD, 10) });
      await admin.save();
      console.log('🚀 Local Admin account created:', admin.email);
    }


  }
  console.log('🔄 Local admin accounts updated');
}



export { createAdmin, createLocalAdmin };