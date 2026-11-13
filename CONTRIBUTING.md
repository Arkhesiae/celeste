-- Peut être incomplet --

- Clone le repo

# Modifs locales uniquement ? A confirmer

- Créer un fichier .env.local dans /front/
```
VITE_API_URL=http://localhost:3000/api
VITE_NODE_ENV=development
VITE_ADMIN_MAIL=admin@celeste.com
VITE_ADMIN_PASS=celeste
# Connexions rapides (boutons de développement) : le compte admin local créé par le seed est admin-<oaci>@celeste-app.fr, avec le
# mot de passe <LOCAL_ADMIN_PASSWORD de backend/.env>-<oaci> (ex. LFBB : admin-lfbb@celeste-app.fr / <secret>-lfbb). Sans
# VITE_LOCAL_ADMIN_PASS le bouton affiche « Identifiants manquants » : il n'y a pas de mot de passe par défaut.
VITE_LOCAL_ADMIN_MAIL=admin-lfbb@celeste-app.fr
VITE_LOCAL_ADMIN_PASS=<LOCAL_ADMIN_PASSWORD>-lfbb
VITE_USER_PASS=user
```

- Copier `/backend/.env.example` en `/backend/.env` (le seul fichier lu par le backend) et remplir les valeurs ; chaque variable y est
  expliquée. Au minimum : `MONGO_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONT_URL`.
- Démarrer MongoDB en replica set (les transactions l'exigent) : `docker compose -f backend/docker-compose.dev.yml up -d`
- Installer le package dotenv dans /backend/ `npm i dotenv`
- Installer le package vite dans /front/ : `npm i vite`
