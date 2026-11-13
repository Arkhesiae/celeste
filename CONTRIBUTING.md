-- Peut être incomplet --

- Clone le repo

# Modifs locales uniquement ? A confirmer

- Créer un fichier .env.local dans /front/
```
VITE_API_URL=http://localhost:3000/api
VITE_NODE_ENV=development
VITE_ADMIN_MAIL=admin@celeste.com
VITE_ADMIN_PASS=celeste
```

- Copier `/backend/.env.example` en `/backend/.env` (le seul fichier lu par le backend) et remplir les valeurs ; chaque variable y est
  expliquée. Au minimum : `MONGO_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONT_URL`.
- Démarrer MongoDB en replica set (les transactions l'exigent) : `docker compose -f backend/docker-compose.dev.yml up -d`
- Installer le package dotenv dans /backend/ `npm i dotenv`
- Installer le package vite dans /front/ : `npm i vite`
