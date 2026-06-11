echo "Mise à jour local du projet..."
git add .
git commit -m "Mise à jour du projet"
git push

echo "Mise à jour du projet sur le serveur..."
ssh jtt@ssh-jtt.alwaysdata.net -t "~/update.sh"