#!/bin/bash

# Script de connexion SSH au serveur Celeste
# Utilise la configuration SSH existante dans ssh_config

echo "🔌 Connexion au serveur Celeste..."
echo "📍 Serveur: 91.99.120.203"
echo "👤 Utilisateur: root"
echo ""

# Vérifier si la clé SSH existe
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "❌ Erreur: Clé SSH ~/.ssh/id_rsa introuvable"
    echo "💡 Assurez-vous que votre clé SSH est correctement configurée"
    exit 1
fi

# Vérifier les permissions de la clé SSH
if [ "$(stat -c %a ~/.ssh/id_rsa)" != "600" ]; then
    echo "⚠️  Attention: Permissions de la clé SSH incorrectes"
    echo "🔧 Correction des permissions..."
    chmod 600 ~/.ssh/id_rsa
fi

echo "✅ Connexion en cours..."
echo ""

# Se connecter au serveur
ssh celeste-server

echo ""
echo "👋 Déconnexion du serveur"
