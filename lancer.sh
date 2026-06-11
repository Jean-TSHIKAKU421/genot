clear
echo "Mise à jour local du projet..."
sleep 2
git add .
git commit -m "Mise à jour du projet"
git push
sleep 2
clear

echo "Mise à jour du projet sur le serveur..."
ssh jtt@ssh-jtt.alwaysdata.net -t "~/update.sh"
clear

sleep 2
echo "Mise à jour terminée avec succès !"
sleep 2
clear