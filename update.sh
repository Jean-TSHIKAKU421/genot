#!/bin/bash

echo "🔄 Mise à jour de GeNot sur GitHub..."
git add .
git commit -m "Mise à jour automatique"
git push
sleep 2
clear

echo "🔄 Mise à jour de GeNot sur serveur distant..."
ssh jtt@ssh-jtt.alwaysdata.net "cd www/genot && git fetch origin && git reset --hard origin/main && pkill -f 'node server.js' && nohup node server.js > server.log 2>&1 &"
# Installer les nouvelles dépendances (si besoin)
echo "📦 Installation des dépendances..."
npm install

# Arrêter l'ancien serveur
echo "🛑 Arrêt de l'ancien serveur..."
pkill -f "node server.js"
sleep 2
clear
# Démarrer le nouveau serveur en arrière-plan
echo "🚀 Démarrage du nouveau serveur..."
nohup node server.js > server.log 2>&1 &
sleep 2
clear
echo "✅ GeNot a été mis à jour avec succès !"
sleep 2
echo "📋 Logs disponibles dans : server.log"
sleep 2
clear