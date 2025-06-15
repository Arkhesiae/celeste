# Couleurs pour les messages
$Green = [System.ConsoleColor]::Green
$Red = [System.ConsoleColor]::Red

# Fonction pour gérer les erreurs
function Handle-Error {
    Write-Host "Erreur lors de l'exécution de la commande précédente" -ForegroundColor $Red
    exit 1
}

# Vérification des arguments
if ($args.Count -ne 1) {
    Write-Host "Usage: .\deploy.ps1 <message_de_commit>" -ForegroundColor $Red
    exit 1
}

$CommitMessage = $args[0]

Write-Host "Début du déploiement..." -ForegroundColor $Green

# Connexion SSH et exécution des commandes sur le serveur distant
$sshCommands = @'
set -e

# Ajout des fichiers modifiés
echo -e "\033[0;32mAjout des fichiers modifiés...\033[0m"
git add . || { echo "Erreur lors de l''ajout des fichiers" >&2; exit 1; }

# Commit des changements
echo -e "\033[0;32mCommit des changements...\033[0m"
git commit -m "'$CommitMessage'" || { echo "Erreur lors du commit" >&2; exit 1; }

# Push des changements
echo -e "\033[0;32mPush des changements...\033[0m"
git push || { echo "Erreur lors du push" >&2; exit 1; }

# Changement vers le répertoire du projet
cd celeste || { echo "Erreur lors du changement de répertoire" >&2; exit 1; }

# Récupération des derniers changements
echo -e "\033[0;32mPull des derniers changements...\033[0m"
git pull || { echo "Erreur lors du pull" >&2; exit 1; }

# Arrêt des conteneurs Docker
echo -e "\033[0;32mArrêt des conteneurs Docker...\033[0m"
docker-compose down || { echo "Erreur lors de l''arrêt des conteneurs" >&2; exit 1; }

# Démarrage des conteneurs Docker
echo -e "\033[0;32mDémarrage des conteneurs Docker...\033[0m"
docker-compose up -d || { echo "Erreur lors du démarrage des conteneurs" >&2; exit 1; }

echo -e "\033[0;32mDéploiement terminé avec succès !\033[0m"
'@

try {
    # Conversion des fins de ligne Windows vers Unix
    $sshCommands = $sshCommands -replace "`r`n", "`n"
    
    # Exécution des commandes SSH
    $sshCommands | ssh root@91.99.120.203
    if ($LASTEXITCODE -ne 0) {
        throw "Erreur lors de l'exécution des commandes SSH"
    }
}
catch {
    Write-Host $_.Exception.Message -ForegroundColor $Red
    exit 1
} 