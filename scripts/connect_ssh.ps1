# Script de connexion SSH au serveur Celeste (PowerShell)
# Utilise la configuration SSH existante dans ssh_config

Write-Host "Connexion au serveur Celeste..." -ForegroundColor Cyan
Write-Host "Serveur: 91.99.120.203" -ForegroundColor Yellow
Write-Host "Utilisateur: root" -ForegroundColor Yellow
# Write-Host ""

# # Vérifier si la clé SSH existe
# $sshKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
# if (-not (Test-Path $sshKeyPath)) {
#     Write-Host "Erreur: Clé SSH $sshKeyPath introuvable" -ForegroundColor Red
#     Write-Host "Assurez-vous que votre clé SSH est correctement configurée" -ForegroundColor Yellow
#     exit 1
# }

# # Vérifier si OpenSSH est installé
# try {
#     $sshVersion = ssh -V 2>&1
#     if ($LASTEXITCODE -ne 0) {
#         throw "SSH non disponible"
#     }
# } catch {
#     Write-Host "Erreur: OpenSSH n'est pas installé ou accessible" -ForegroundColor Red
#     Write-Host "Installez OpenSSH via: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor Yellow
#     exit 1
# }

Write-Host "Connexion en cours..." -ForegroundColor Green
Write-Host ""

# Se connecter au serveur
try {
    ssh root@91.99.120.203   
} catch {
    Write-Host "Erreur lors de la connexion SSH" -ForegroundColor Red
    Write-Host "Vérifiez votre configuration SSH et votre clé privée" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Déconnexion du serveur" -ForegroundColor Cyan
