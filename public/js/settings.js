// ==========================================
// PAGE PARAMÈTRES
// ==========================================

let currentUser = null;
let editType = null;

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) { window.location.href = '/login'; return; }
    loadProfile();
    loadStats(currentUser.matricule);
    checkConnection();
    document.getElementById('editModal').addEventListener('click', function(e) { if (e.target === this) closeEditModal(); });
});

function loadProfile() {
    document.getElementById('profileName').textContent = currentUser.nom || '---';
    document.getElementById('profileMatricule').textContent = currentUser.matricule || '---';
    document.getElementById('infoNom').textContent = currentUser.nom || '---';
    document.getElementById('infoMatricule').textContent = currentUser.matricule || '---';
    document.getElementById('infoEmail').textContent = currentUser.email || 'Non renseigné';
    document.getElementById('infoTheme').textContent = currentUser.theme === 'dark' ? '🌙 Sombre' : '☀️ Clair';
    const avatarEl = document.getElementById('profileAvatar');
    if (currentUser.photo) { avatarEl.innerHTML = `<img src="${currentUser.photo}" alt="Photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`; }
    else { avatarEl.innerHTML = '<i class="fas fa-user" style="font-size:50px;"></i>'; }
}

// ==========================================
// MODAL ÉDITION
// ==========================================
function confirmEdit(type) {
    editType = type;
    const titles = { nom: 'Modifier le nom', email: "Modifier l'email", theme: 'Changer le thème', photo: 'Changer la photo de profil' };
    document.getElementById('editModalTitle').textContent = titles[type] || 'Modifier';
    document.querySelectorAll('.edit-form').forEach(f => f.style.display = 'none');
    if (type === 'nom') { document.getElementById('editFormNom').style.display = 'block'; document.getElementById('editNom').value = currentUser.nom || ''; }
    else if (type === 'email') { document.getElementById('editFormEmail').style.display = 'block'; document.getElementById('editEmail').value = currentUser.email || ''; }
    else if (type === 'theme') { document.getElementById('editFormTheme').style.display = 'block'; document.querySelector(`input[name="themeChoice"][value="${currentUser.theme || 'light'}"]`).checked = true; }
    else if (type === 'photo') { document.getElementById('editFormPhoto').style.display = 'block'; document.getElementById('editPhoto').value = ''; }
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() { document.getElementById('editModal').style.display = 'none'; editType = null; }
function selectTheme(theme) { document.querySelector(`input[name="themeChoice"][value="${theme}"]`).checked = true; }

async function saveEdit() {
    if (!editType) return;
    if (editType === 'nom') {
        const nom = document.getElementById('editNom').value.trim();
        if (!nom) { alert('Le nom est requis.'); return; }
        try { const r = await fetch(`/api/update-profile/${currentUser.matricule}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom }) }); const d = await r.json(); if (d.success) { currentUser = d.user; sessionStorage.setItem('currentUser', JSON.stringify(currentUser)); loadProfile(); closeEditModal(); } else alert(d.message); } catch (e) { alert('Erreur.'); }
    }
    else if (editType === 'email') {
        const email = document.getElementById('editEmail').value.trim();
        try { const r = await fetch(`/api/update-profile/${currentUser.matricule}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); const d = await r.json(); if (d.success) { currentUser = d.user; sessionStorage.setItem('currentUser', JSON.stringify(currentUser)); loadProfile(); closeEditModal(); } else alert(d.message); } catch (e) { alert('Erreur.'); }
    }
    else if (editType === 'theme') {
        const theme = document.querySelector('input[name="themeChoice"]:checked')?.value || 'light';
        if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); else document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', theme);
        try { await fetch('/api/save-theme', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matricule: currentUser.matricule, theme }) }); currentUser.theme = theme; sessionStorage.setItem('currentUser', JSON.stringify(currentUser)); } catch (e) {}
        loadProfile(); closeEditModal();
    }
    else if (editType === 'photo') {
        const file = document.getElementById('editPhoto').files[0];
        if (!file) { alert('Choisissez une photo.'); return; }
        const fd = new FormData(); fd.append('photo', file);
        try { const r = await fetch(`/api/upload-profile-photo/${currentUser.matricule}`, { method: 'POST', body: fd }); const d = await r.json(); if (d.success) { currentUser.photo = d.photoUrl; sessionStorage.setItem('currentUser', JSON.stringify(currentUser)); loadProfile(); closeEditModal(); } else alert(d.message); } catch (e) { alert('Erreur.'); }
    }
}

// ==========================================
// STATISTIQUES
// ==========================================
async function loadStats(matricule) {
    try {
        const r = await fetch(`/api/courses/${matricule}`);
        const d = await r.json();
        if (d.success) {
            let tn = 0, tp = 0, tl = 0;
            for (const c of d.courses) {
                try {
                    const nr = await fetch(`/api/course/${c.id}`);
                    const nd = await nr.json();
                    if (nd.success) {
                        tn += nd.notes.filter(n => n.type === 'note').length;
                        tp += nd.notes.filter(n => n.type === 'support').length;
                        tl += nd.notes.filter(n => n.type === 'link').length;
                    }
                } catch (e) {}
            }
            document.getElementById('statCourses').textContent = d.courses.length;
            document.getElementById('statNotes').textContent = tn;
            document.getElementById('statPdfs').textContent = tp;
            document.getElementById('statLinks').textContent = tl;
        }
    } catch (e) { console.error('Stats error:', e); }
}

// ==========================================
// CONNEXION INTERNET
// ==========================================
function checkConnection() {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    const statusEl = document.getElementById('connectionStatus');
    indicator.className = 'status-indicator checking';
    text.textContent = 'Vérification...';

    const update = (online) => {
        if (online) {
            indicator.className = 'status-indicator online';
            text.textContent = 'Connecté à Internet';
            statusEl.classList.remove('offline');
        } else {
            indicator.className = 'status-indicator offline';
            text.textContent = 'Pas de connexion';
            statusEl.classList.add('offline');
        }
    };

    fetch('/api/ping').then(r => r.ok ? update(true) : update(false)).catch(() => update(false));
    setInterval(() => { fetch('/api/ping').then(r => r.ok ? update(true) : update(false)).catch(() => update(false)); }, 10000);
}