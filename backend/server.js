// ─── Imports Node.js ──────────────────────────────────────────────────────────
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuration de l'environnement ─────────────────────────────────────────
dotenv.config({
  path: process.env.NODE_ENV === 'production'
    ? path.resolve(__dirname, '../.env.prod')
    : '.env.development',
});



// ─── Création de l'application Express ────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// ─── Imports des routes ───────────────────────────────────────────────────────
import usersRouter from './routes/users.js';
import rotationsRouter from './routes/rotations.js';
import centerRouter from './routes/center.js';
import teamsRouter from './routes/teams.js';
import substitutionRouter from './routes/substitution.js';
import loginRouter from './routes/login.js';
import notificationRouter from './routes/notifications.js';
import messageRoutes from './routes/messageRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import authRouter from './routes/auth.js';
import devRouter from './routes/dev.js';
import rulesRouter from './routes/rules.js';
import accountRecoveryRouter from './routes/accountRecovery.js';
import announcementRoutes from './routes/announcementRoutes.js';
import planningModificationsRouter from './routes/planningModifications.js';


// ─── Tâches planifiées (cron) ─────────────────────────────────────────────────
import './cron/processTransactions.js';
import './cron/processDemands.js';

// ─── Initialisation de l'admin ────────────────────────────────────────────────
import { createAdmin, createLocalAdmin } from './utils/seedAdmin.js';

// ─── Middleware CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://192.168.1.36:30035',
    'http://localhost:30035',
    'http://167.235.244.249',
    'http://celeste-app.fr',
    'https://celeste-app.fr',
    'capacitor://localhost',
    'capacitor://192.168.1.36:30035',
    'capacitor://localhost:30035',
    'capacitor://167.235.244.249',
    'capacitor://celeste-app.fr',
    'capacitor://https://celeste-app.fr',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Middlewares Express ──────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── Fichiers statiques ───────────────────────────────────────────────────────
app.use('/api/avatars', express.static(path.join(__dirname, 'public/avatars')));
app.use('/', express.static(path.join(__dirname, 'public')));

// ─── Routes API ───────────────────────────────────────────────────────────────
app.use('/api/users', usersRouter);
app.use('/api/messages', messageRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/login', loginRouter);
app.use('/api/auth', authRouter);
app.use('/api/substitution', substitutionRouter);
app.use('/api/rotations', rotationsRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/center', centerRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/otp', otpRoutes);
app.use('/api/dev', devRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/account-recovery', accountRecoveryRouter);
app.use('/api/announcements', announcementRoutes);
app.use('/api/planning-modifications', planningModificationsRouter);

// ─── Route API par défaut ─────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.send('Backend connecté à MongoDB via Docker 🚀');
});

// ─── Catch-all pour les routes SPA (Vue/React) ────────────────────────────────
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ─── Connexion à MongoDB & Lancement du serveur ───────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connecté via Docker');

    await createAdmin(); // Créer l'admin si nécessaire
    await createLocalAdmin(); // Créer les admins locaux si nécessaire
    
    app.listen(PORT, () => {
      console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Erreur de connexion à MongoDB :', err.message);
    process.exit(1);
  });
