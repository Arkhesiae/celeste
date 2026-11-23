# Composants AppBar

Ce dossier contient les composants modulaires de la barre d'application (AppBar) qui ont été extraits du composant principal `AppBar.vue` pour améliorer la maintenabilité et la lisibilité du code.

## Structure des composants

### `AppBarTitle.vue`
- **Responsabilité** : Affichage du titre de l'application avec la version
- **Props** :
  - `isHomepage` (Boolean) : Indique si l'utilisateur est sur la page d'accueil
  - `isDashboard` (Boolean) : Indique si l'utilisateur est sur le tableau de bord
- **Événements** :
  - `title-click` : Émis lors du clic sur le titre

### `ThemeSwitch.vue`
- **Responsabilité** : Switch pour basculer entre les thèmes clair et sombre
- **Props** :
  - `modelValue` (Boolean) : État actuel du thème
- **Événements** :
  - `update:modelValue` : Émis lors du changement de thème

### `AdminSection.vue`
- **Responsabilité** : Affichage des éléments d'administration (badge admin, boutons de règles et messages)
- **Props** :
  - `isAdmin` (Boolean) : Indique si l'utilisateur est administrateur
  - `adminType` (String) : Type d'administrateur ('master' ou autre)
  - `messageCount` (Number) : Nombre de messages non lus
- **Événements** :
  - `navigate-rules` : Navigation vers la page des règles
  - `navigate-messages` : Navigation vers la page des messages

### `HomeNavigation.vue`
- **Responsabilité** : Navigation pour les utilisateurs non connectés avec liens externes et boutons d'action
- **Props** :
  - `showButtons` (Boolean) : Contrôle l'affichage des boutons d'action
  - `isDarkTheme` (Boolean) : État du thème sombre
- **Événements** :
  - `update-theme` : Mise à jour du thème
  - `navigate-contact` : Navigation vers la page de contact
  - `navigate-get-started` : Navigation vers la page de démarrage
  - `navigate-login` : Navigation vers la page de connexion
  - `open-icnagenda` : Ouverture du lien Icnagenda
  - `open-olafatco` : Ouverture du lien Olafatco

### `UserMenu.vue`
- **Responsabilité** : Menu utilisateur avec avatar, informations, points, équipe et actions
- **Props** :
  - `username` (String) : Nom d'utilisateur
  - `email` (String) : Email de l'utilisateur
  - `avatar` (String) : URL de l'avatar
  - `points` (Number) : Points de l'utilisateur
  - `currentTeam` (Object) : Équipe actuelle de l'utilisateur
- **Événements** :
  - `navigate-profile` : Navigation vers le profil
  - `navigate-parameter` : Navigation vers les paramètres
  - `logout` : Déconnexion
  - `navigate-contact` : Navigation vers la page de contact

## Utilisation

Le composant principal `AppBar.vue` utilise ces sous-composants pour organiser la logique de manière modulaire. Chaque composant a une responsabilité spécifique et communique avec le parent via des props et des événements.

## Avantages de cette approche

1. **Séparation des responsabilités** : Chaque composant a une fonction claire et définie
2. **Réutilisabilité** : Les composants peuvent être réutilisés dans d'autres parties de l'application
3. **Maintenabilité** : Le code est plus facile à maintenir et à déboguer
4. **Testabilité** : Chaque composant peut être testé indépendamment
5. **Lisibilité** : Le code est plus lisible et plus facile à comprendre 