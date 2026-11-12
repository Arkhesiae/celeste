// ─── Variables d'environnement : le fichier .env est lu ici, avant l'import des autres modules ──────────────
import 'dotenv/config';

// ─── Imports Node.js ──────────────────────────────────────────────────────────
import mongoose from 'mongoose';
import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { renderMail } from './src/mail/mailRenderer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_PORT, MONGO_MAX_RETRIES, MONGO_RETRY_DELAY_MS } from './config/server.js';
import { REQUEST_BODY_LIMIT } from './config/limits.js';
import { PUBLIC_DIRECTORY, AVATARS_DIRECTORY } from './config/paths.js';

// ─── Import du routeur principal ─────────────────────────────────────────────
import mainRouter from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Création de l'application Express ────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || DEFAULT_PORT;

// ─── Tâches planifiées (cron) ─────────────────────────────────────────────────
import './jobs/index.js';

// ─── Initialisation de l'admin ────────────────────────────────────────────────
import { createAdmin, createLocalAdmin } from './bootstrap/seedAdmin.js';

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
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ limit: REQUEST_BODY_LIMIT, extended: true }));
app.use(cookieParser());

// ─── Fichiers statiques ───────────────────────────────────────────────────────
// Les avatars téléversés ne sont pas suivis par git : le dossier est créé au besoin
fs.mkdirSync(AVATARS_DIRECTORY, { recursive: true });
app.use('/api/avatars', express.static(AVATARS_DIRECTORY));
app.get("/preview/:template", (req, res) => {
  const html = renderMail(req.params.template, {});
  res.send(html);
});

app.use('/', express.static(PUBLIC_DIRECTORY));

// ─── Routes API ───────────────────────────────────────────────────────────────
app.use('/api', mainRouter);

// ─── Route API par défaut ─────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.send('Backend connecté à MongoDB via Docker 🚀');
});

// ─── Catch-all pour les routes SPA (Vue/React) ────────────────────────────────
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIRECTORY, 'index.html'));
});

// Error handler — must be last
app.use(errorHandler);

// ─── Connexion à MongoDB & Lancement du serveur ───────────────────────────────

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
    console.error(`❌ Erreur de connexion à MongoDB (tentative ${attempt}/${MONGO_MAX_RETRIES}) :`, err.message);

    if (attempt >= MONGO_MAX_RETRIES) {
      console.error('🛑 Nombre maximum de tentatives atteint. Arrêt du serveur.');
      process.exit(1);
    }

    console.log(`⏳ Nouvelle tentative dans ${MONGO_RETRY_DELAY_MS / 1000}s...`);
    await new Promise(resolve => setTimeout(resolve, MONGO_RETRY_DELAY_MS));
    await connectWithRetry(attempt + 1);
  }
}

connectWithRetry();