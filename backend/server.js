// ─── Imports Node.js ──────────────────────────────────────────────────────────
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { renderMail } from './src/mail/mailRenderer.js';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Import du routeur principal ─────────────────────────────────────────────
import mainRouter from './routes/index.js';

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

// ─── Tâches planifiées (cron) ─────────────────────────────────────────────────
import './jobs/transactionJob.js';
import './jobs/demandJob.js';

// ─── Initialisation de l'admin ────────────────────────────────────────────────
import { createAdmin, createLocalAdmin } from './utils/seedAdmin.js';

// ─── Initialisation des règles ────────────────────────────────────────────────
import { initializeRules } from './services/rules/initializeRules.js';

// ─── Middleware CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONT_URL,
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
app.use(cookieParser());

// ─── Fichiers statiques ───────────────────────────────────────────────────────
app.use('/api/avatars', express.static(path.join(__dirname, 'public/avatars')));
app.get("/preview/:template", (req, res) => {
    const html = renderMail(req.params.template, {});
  res.send(html);
});

app.use('/', express.static(path.join(__dirname, 'public')));

// ─── Routes API ───────────────────────────────────────────────────────────────
app.use('/api', mainRouter);

// ─── Route API par défaut ─────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.send('Backend connecté à MongoDB via Docker 🚀');
});

// ─── Catch-all pour les routes SPA (Vue/React) ────────────────────────────────
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});


// Error handler — must be last
app.use(errorHandler);

// ─── Connexion à MongoDB & Lancement du serveur ───────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connecté via Docker');
    await initializeRules();  
    await createAdmin(); // Créer l'admin si nécessaire
    await createLocalAdmin(); // Créer les admins locaux si nécessaire
    
    app.listen(PORT, () => {
      console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(process.env.MONGO_URI);
    console.error('❌ Erreur de connexion à MongoDB :', err.message);
    process.exit(1);
  });
