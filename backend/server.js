require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const app = express();
const usersRouter = require('./routes/users');
const rotationsRouter = require('./routes/rotations');
const centerRouter = require('./routes/center');
const teamsRouter = require('./routes/teams');
const substitutionRouter = require('./routes/substitution');
const loginRouter = require('./routes/login');
const notificationRouter = require('./routes/notifications');
require('./cron/processTransactions'); 
require('./cron/processDemands');

app.use(cors({
  origin: ['http://192.168.1.36:30035', 'http://localhost:30035'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir les fichiers statiques
app.use('/avatars', express.static(path.join(__dirname, '/public/avatars'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
}));

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {})
    .then(() => console.log('✅ MongoDB connecté via Docker'))
    .catch((err) => {
        console.error('❌ Erreur de connexion à MongoDB :', err.message);
        process.exit(1);
    });

app.use('/users', usersRouter);
app.use('/login', loginRouter);
app.use('/substitution', substitutionRouter);
app.use('/rotations', rotationsRouter);
app.use('/notifications', notificationRouter);
app.use('/center', centerRouter);
app.use('/teams', teamsRouter);

// Routes par défaut
app.get('/', (req, res) => {
    res.send('Backend connecté à MongoDB via Docker 🚀');
});

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur http://192.168.1.36:${PORT}`);
});