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

dotenv.config();

// ─── Création de l'application Express ────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// ─── Tâches planifiées (cron) ─────────────────────────────────────────────────
import './jobs/index.js';

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
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5_000;

async function connectWithRetry(attempt = 1) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connecté via Docker');

    await initializeRules();
    await createAdmin();
    await createLocalAdmin();

    app.listen(PORT, () => {
      console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    });

  } catch (err) {
    console.error(`❌ Erreur de connexion à MongoDB (tentative ${attempt}/${MAX_RETRIES}) :`, err.message);

    if (attempt >= MAX_RETRIES) {
      console.error('🛑 Nombre maximum de tentatives atteint. Arrêt du serveur.');
      process.exit(1);
    }

    console.log(`⏳ Nouvelle tentative dans ${RETRY_DELAY_MS / 1000}s...`);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    await connectWithRetry(attempt + 1);
  }
}

connectWithRetry();