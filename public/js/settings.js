// ==========================================
// PAGE PARAMÈTRES
// ==========================================

let currentUser = null;
let editType = null;

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = '/login';
        return;
    }
    
    loadProfile();
    loadStats(currentUser.matricule);
    
    // Fermer le modal au clic extérieur
    document.getElementById('editModal').addEventListener('click', function(e) {
        if (e.target === this) closeEditModal();
    });
});

function loadProfile() {
    // Nom et matricule
    document.getElementById('profileName').textContent = currentUser.nom || '---';
    document.getElementById('profileMatricule').textContent = currentUser.matricule || '---';
    
    // Infos
    document.getElementById('infoNom').textContent = currentUser.nom || '---';
    document.getElementById('infoMatricule').textContent = currentUser.matricule || '---';
    document.getElementById('infoEmail').textContent = currentUser.email || 'Non renseigné';
    document.getElementById('infoDate').textContent = currentUser.created_at 
        ? new Date(currentUser.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : '---';
    document.getElementById('infoTheme').textContent = currentUser.theme === 'dark' ? '🌙 Sombre' : '☀️ Clair';
    
    const avatarEl = document.getElementById('profileAvatar');
    if (currentUser.photo) {
        avatarEl.innerHTML = `<img src="${currentUser.photo}" alt="Photo de profil" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
        avatarEl.innerHTML = '<i class="fas fa-user" style="font-size:50px;"></i>';
    }
}

// ==========================================
// CONFIRMATION AVANT MODIFICATION
// ==========================================
function confirmEdit(type) {
    editType = type;
    
    const titles = {
        'nom': 'Modifier le nom',
        'email': 'Modifier l\'email',
        'theme': 'Changer le thème',
        'photo': 'Changer la photo de profil'
    };
    
    document.getElementById('editModalTitle').textContent = titles[type] || 'Modifier';
    
    // Cacher tous les formulaires
    document.querySelectorAll('.edit-form').forEach(f => f.style.display = 'none');
    
    // Afficher le bon formulaire
    if (type === 'nom') {
        document.getElementById('editFormNom').style.display = 'block';
        document.getElementById('editNom').value = currentUser.nom || '';
    } else if (type === 'email') {
        document.getElementById('editFormEmail').style.display = 'block';
        document.getElementById('editEmail').value = currentUser.email || '';
    } else if (type === 'theme') {
        document.getElementById('editFormTheme').style.display = 'block';
        // Cocher le thème actuel
        const currentTheme = currentUser.theme || 'light';
        document.querySelector(`input[name="themeChoice"][value="${currentTheme}"]`).checked = true;
    } else if (type === 'photo') {
        document.getElementById('editFormPhoto').style.display = 'block';
        document.getElementById('editPhoto').value = '';
    }
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    editType = null;
}

function selectTheme(theme) {
    document.querySelector(`input[name="themeChoice"][value="${theme}"]`).checked = true;
}

// ==========================================
// SAUVEGARDER LES MODIFICATIONS
// ==========================================
async function saveEdit() {
    if (!editType) return;
    
    if (editType === 'nom') {
        const nom = document.getElementById('editNom').value.trim();
        if (!nom) { alert('Le nom est requis.'); return; }
        
        try {
            const res = await fetch(`/api/update-profile/${currentUser.matricule}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom })
            });
            const data = await res.json();
            if (data.success) {
                currentUser = data.user;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                loadProfile();
                closeEditModal();
            } else {
                alert(data.message);
            }
        } catch (e) { alert('Erreur.'); }
    }
    
    else if (editType === 'email') {
        const email = document.getElementById('editEmail').value.trim();
        
        try {
            const res = await fetch(`/api/update-profile/${currentUser.matricule}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (data.success) {
                currentUser = data.user;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                loadProfile();
                closeEditModal();
            } else {
                alert(data.message);
            }
        } catch (e) { alert('Erreur.'); }
    }
    
    else if (editType === 'theme') {
        const theme = document.querySelector('input[name="themeChoice"]:checked')?.value || 'light';
        
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem('theme', theme);
        
        try {
            await fetch('/api/save-theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricule: currentUser.matricule, theme })
            });
            currentUser.theme = theme;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        } catch (e) {}
        
        loadProfile();
        closeEditModal();
    }
    
    else if (editType === 'photo') {
        const file = document.getElementById('editPhoto').files[0];
        if (!file) { alert('Veuillez choisir une photo.'); return; }
        
        const formData = new FormData();
        formData.append('photo', file);
        
        try {
            const res = await fetch(`/api/upload-profile-photo/${currentUser.matricule}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                currentUser.photo = data.photoUrl;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                loadProfile();
                closeEditModal();
            } else {
                alert(data.message);
            }
        } catch (e) { alert('Erreur.'); }
    }
}

// ==========================================
// STATISTIQUES
// ==========================================
async function loadStats(matricule) {
    try {
        const response = await fetch(`/api/courses/${matricule}`);
        const data = await response.json();
        
        if (data.success) {
            const courses = data.courses;
            document.getElementById('statCourses').textContent = courses.length;
            
            let totalNotes = 0, totalPdfs = 0, totalLinks = 0;
            
            for (const course of courses) {
                try {
                    const noteResponse = await fetch(`/api/course/${course.id}`);
                    const noteData = await noteResponse.json();
                    
                    if (noteData.success) {
                        totalNotes += noteData.notes.filter(n => n.type === 'note').length;
                        totalPdfs += noteData.notes.filter(n => n.type === 'support').length;
                        totalLinks += noteData.notes.filter(n => n.type === 'link').length;
                    }
                } catch (e) {}
            }
            
            document.getElementById('statNotes').textContent = totalNotes;
            document.getElementById('statPdfs').textContent = totalPdfs;
            document.getElementById('statLinks').textContent = totalLinks;
        }
    } catch (error) {
        console.error('Erreur chargement stats:', error);
    }
}

// ==========================================
// DÉTECTION CONNEXION INTERNET
// ==========================================
function checkConnection() {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    
    // État initial : vérification
    indicator.className = 'status-indicator checking';
    text.textContent = 'Vérification de la connexion...';
    text.className = 'status-text checking';
    
    // Vérifier avec une requête légère
    fetch('/api/ping')
        .then(response => {
            if (response.ok) {
                indicator.className = 'status-indicator online';
                text.textContent = '✅ Vous avez accès à Internet';
                text.className = 'status-text online';
            } else {
                setOffline();
            }
        })
        .catch(() => {
            setOffline();
        });
    
    // Vérification périodique toutes les 10 secondes
    setInterval(() => {
        fetch('/api/ping')
            .then(response => {
                if (response.ok) {
                    indicator.className = 'status-indicator online';
                    text.textContent = '✅ Vous avez accès à Internet';
                    text.className = 'status-text online';
                } else {
                    setOffline();
                }
            })
            .catch(() => {
                setOffline();
            });
    }, 10000);
    
    function setOffline() {
        indicator.className = 'status-indicator offline';
        text.textContent = '❌ Pas d\'accès à Internet';
        text.className = 'status-text offline';
    }
}

// Appeler au chargement
document.addEventListener('DOMContentLoaded', () => {
    checkConnection();
});