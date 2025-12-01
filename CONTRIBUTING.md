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

- Dans le fichier /backend/.env.development, modifier l'adresse IP locale par localhost (ou votre adresse IP) :
```
MONGO_URI=mongodb://localhost:27017/myDatabase?authSource=admin
ADMIN_EMAIL=admin@celeste.com
ADMIN_PASSWORD=celeste
FRONTEND_URL=https://localhost:30035
MAIL_SERVICE=console
```
- Installer le package dotenv dans /backend/ `npm i dotenv`
- Installer le package vite dans /front/ : `npm i vite`
