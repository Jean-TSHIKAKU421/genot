document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) { window.location.href = '/login'; return; }
    loadTrash();
});

async function loadTrash() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    try {
        const response = await fetch(`/api/trash/${user.matricule}`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('trashCount').textContent = 
                `${data.courses.length + data.notes.length} élément(s)`;
            
            displayTrashCourses(data.courses);
            displayTrashNotes(data.notes);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function displayTrashCourses(courses) {
    const container = document.getElementById('trashCourses');
    if (courses.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>Aucun cours dans la corbeille</p></div>';
        return;
    }
    container.innerHTML = courses.map(c => `
        <div class="trash-item">
            <div class="trash-item-info">
                <div class="trash-item-title">📚 ${escapeHtml(c.title)}</div>
                <div class="trash-item-meta">Supprimé le ${new Date(c.deleted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div class="trash-item-actions">
                <button class="btn btn-success btn-sm" onclick="restoreItem('course', ${c.id})">
                    <i class="fas fa-undo"></i> Restaurer
                </button>
                <button class="btn btn-danger btn-sm" onclick="permanentDelete('course', ${c.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function displayTrashNotes(notes) {
    const container = document.getElementById('trashNotes');
    if (notes.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>Aucune note dans la corbeille</p></div>';
        return;
    }
    container.innerHTML = notes.map(n => `
        <div class="trash-item">
            <div class="trash-item-info">
                <div class="trash-item-title">📝 ${escapeHtml(n.title)}</div>
                <div class="trash-item-meta">Cours : ${escapeHtml(n.course_title)} • Supprimé le ${new Date(n.deleted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
            <div class="trash-item-actions">
                <button class="btn btn-success btn-sm" onclick="restoreItem('note', ${n.id})">
                    <i class="fas fa-undo"></i> Restaurer
                </button>
                <button class="btn btn-danger btn-sm" onclick="permanentDelete('note', ${n.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function restoreItem(type, id) {
    try {
        const response = await fetch(`/api/trash/restore/${type}/${id}`, { method: 'POST' });
        const data = await response.json();
        if (data.success) loadTrash();
    } catch (error) { alert('Erreur'); }
}

async function permanentDelete(type, id) {
    if (!confirm('⚠️ Supprimer définitivement ? Cette action est irréversible !')) return;
    try {
        const response = await fetch(`/api/trash/permanent/${type}/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) loadTrash();
    } catch (error) { alert('Erreur'); }
}

async function emptyTrash() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!confirm('⚠️ Vider toute la corbeille ? Cette action est irréversible !')) return;
    try {
        const response = await fetch(`/api/trash/empty/${user.matricule}`, { method: 'POST' });
        const data = await response.json();
        if (data.success) loadTrash();
    } catch (error) { alert('Erreur'); }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}