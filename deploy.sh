#!/bin/bash

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour gérer les erreurs
handle_error() {
    echo -e "${RED}Erreur lors de l'exécution de la commande précédente${NC}"
    exit 1
}

# Vérification des arguments
if [ "$#" -ne 1 ]; then
    echo -e "${RED}Usage: $0 <message_de_commit>${NC}"
    exit 1
fi

COMMIT_MESSAGE=$1

echo -e "${GREEN}Début du déploiement...${NC}"

# Connexion SSH et exécution des commandes sur le serveur distant
ssh root@167.114.1.100 << "EOF"
    set -e  # Arrête le script en cas d'erreur
    
    # Ajout des fichiers modifiés
    echo -e "\033[0;32mAjout des fichiers modifiés...\033[0m"
    git add . || handle_error

    # Commit des changements
    echo -e "\033[0;32mCommit des changements...\033[0m"
    git commit -m "${COMMIT_MESSAGE}" || handle_error

    # Push des changements
    echo -e "\033[0;32mPush des changements...\033[0m"
    git push || handle_error

    # Changement vers le répertoire du projet
    cd celeste || handle_error

    # Récupération des derniers changements
    echo -e "\033[0;32mPull des derniers changements...\033[0m"
    git pull || handle_error

    # Arrêt des conteneurs Docker
    echo -e "\033[0;32mArrêt des conteneurs Docker...\033[0m"
    docker-compose down || handle_error

    # Démarrage des conteneurs Docker
    echo -e "\033[0;32mDémarrage des conteneurs Docker...\033[0m"
    docker-compose up -d || handle_error

    echo -e "\033[0;32mDéploiement terminé avec succès !\033[0m"
EOF 