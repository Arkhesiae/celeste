import express from 'express';
const app = express();

// Configuration de la taille maximale du payload
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

export default app; 