# 🔌 Connexion SSH au Serveur Celeste

Ce dossier contient les scripts pour se connecter au serveur via SSH.

## 📋 Prérequis

1. **Clé SSH** : Assurez-vous d'avoir une clé SSH dans `~/.ssh/id_rsa`
2. **OpenSSH** : Client SSH installé sur votre système
3. **Configuration** : Le fichier `ssh_config` à la racine du projet doit être configuré

## 🚀 Utilisation

### Avec npm (recommandé)

```bash
# Connexion SSH (PowerShell)
npm run ssh:connect

# Connexion SSH (Bash - si disponible)
npm run ssh:connect:bash

# Installer OpenSSH sur Windows
npm run ssh:install

# Vérifier le statut OpenSSH
npm run ssh:status
```

### Directement

```bash
# PowerShell
powershell -ExecutionPolicy Bypass -File scripts/connect_ssh.ps1

# Bash
bash scripts/connect_ssh.sh

# SSH direct
ssh celeste-server
```

## ⚙️ Configuration

Le fichier `ssh_config` contient la configuration suivante :

```
Host celeste-server
    HostName 91.99.120.203
    User root
    IdentityFile ~/.ssh/id_rsa
    StrictHostKeyChecking no
```

## 🔧 Dépannage

### Erreur "Clé SSH introuvable"
- Vérifiez que votre clé SSH existe dans `~/.ssh/id_rsa`
- Assurez-vous que les permissions sont correctes (600)

### Erreur "OpenSSH non installé"
- Exécutez : `npm run ssh:install`
- Ou manuellement : `Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0`

### Problèmes de connexion
- Vérifiez votre connexion internet
- Assurez-vous que le serveur est accessible
- Vérifiez que votre clé SSH est autorisée sur le serveur

## 📱 Informations du serveur

- **IP** : 91.99.120.203
- **Utilisateur** : root
- **Port** : 22 (par défaut)
- **Nom d'hôte** : celeste-server

## 🛡️ Sécurité

- Ne partagez jamais votre clé SSH privée
- Utilisez des clés SSH fortes (RSA 4096 bits recommandé)
- Désactivez l'authentification par mot de passe si possible
- Gardez votre clé SSH sécurisée avec des permissions 600
