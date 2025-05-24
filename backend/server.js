require('dotenv').config({
    path: process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development'
  });
  
  const mongoose = require('mongoose');
  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  const usersRouter = require('./routes/users');
  const rotationsRouter = require('./routes/rotations');
  const centerRouter = require('./routes/center');
  const teamsRouter = require('./routes/teams');
  const substitutionRouter = require('./routes/substitution');
  const loginRouter = require('./routes/login');
  const notificationRouter = require('./routes/notifications');
  const messageRoutes = require('./routes/messageRoutes');
  const otpRoutes = require('./routes/otpRoutes');
  const authRouter = require('./routes/auth');
  require('./cron/processTransactions');
  require('./cron/processDemands');
  const { createAdmin } = require('./utils/seedAdmin');
  
  // CORS
  app.use(cors({
    origin: ['http://192.168.1.36:30035', 'http://localhost:30035', 'http://167.235.244.249', 'http://celeste-app.fr'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  // Fichiers statiques
  app.use('/api/avatars', express.static(path.join(__dirname, '/public/avatars')));
  app.use('/', express.static(path.join(__dirname, 'public')));
  
  // Routes API
  app.use('/api/users', usersRouter);
  app.use('/api/messages', messageRoutes);
  app.use('/api/login', loginRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/substitution', substitutionRouter);
  app.use('/api/rotations', rotationsRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/center', centerRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api/otp', otpRoutes);
  
  // Routes par défaut
  app.get('/api', (req, res) => {
    res.send('Backend connecté à MongoDB via Docker 🚀');
  });
  
  // Route catch-all pour SPA
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
  });
  
  // Connexion Mongo et lancement serveur
  mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
      console.log('✅ MongoDB connecté via Docker');
  
      await createAdmin(); // Créer l'admin si nécessaire
  
      app.listen(PORT, () => {
        console.log(`🚀 Serveur lancé port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('❌ Erreur de connexion à MongoDB :', err.message);
      process.exit(1);
    });
  