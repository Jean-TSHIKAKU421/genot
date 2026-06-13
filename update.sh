#!/bin/bash

echo "🔄 Mise à jour de GeNot sur GitHub..."
git add .
git commit -m "Mise à jour automatique"
git push
sleep 2
clear

echo "🔄 Mise à jour de GeNot sur serveur distant..."
ssh jtt@ssh-jtt.alwaysdata.net

# Aller dans le dossier du projet
cd ~/www/genot

# Récupérer les dernières modifications depuis GitHub
echo "📥 Téléchargement des mises à jour..."
git pull origin main

# Installer les nouvelles dépendances (si besoin)
echo "📦 Installation des dépendances..."
npm install

# Arrêter l'ancien serveur
echo "🛑 Arrêt de l'ancien serveur..."
pkill -f "node server.js"

# Démarrer le nouveau serveur en arrière-plan
echo "🚀 Démarrage du nouveau serveur..."
nohup node server.js > server.log 2>&1 &

echo "✅ GeNot a été mis à jour avec succès !"
echo "📋 Logs disponibles dans : server.log"
