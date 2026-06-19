#!/bin/bash

echo "🔄 Mise à jour de GeNot sur votre machine locale..."
sleep 2
clear
echo "🔄 Mise à jour de GeNot sur GitHub..."
git add .
git commit -m "Mise à jour automatique"
git push
sleep 2
clear


echo "🔄 Mise à jour de GeNot sur serveur distant..."
ssh jtt@ssh-jtt.alwaysdata.net "./update.sh"
clear