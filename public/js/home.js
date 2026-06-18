// ==========================================
// PAGE D'ACCUEIL - GESTION DES COURS (optimisé)
// ==========================================

let coursesData = [];
let currentCourseId = null;

(function() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) { window.location.href = '/login'; return; }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(currentUser));
    else init(currentUser);
})();

function init(currentUser) {
    displayUserProfile(currentUser);
    showWelcomeMessage(currentUser);
    document.getElementById('logout-btn').addEventListener('click', () => { sessionStorage.removeItem('currentUser'); window.location.href = '/login'; });
    loadCourses();
    setupAddCourseForm();
    setupHomeSearch();
    document.addEventListener('click', function(e) { if (e.target.id === 'add-course-modal') closeAddCourseModal(); if (e.target.id === 'courseDetailModal') closeCourseDetail(); });
}

function displayUserProfile(user) {
    const headerProfile = document.getElementById('header-profile');
    if (headerProfile) { headerProfile.innerHTML = user.photo ? `<img src="${user.photo}" alt="Photo" class="user-photo-header">` : `<div class="user-avatar-header"><i class="fas fa-user"></i></div>`; }
    const headerUserName = document.getElementById('header-user-name');
    if (headerUserName) { const words = (user.nom || user.matricule || 'Utilisateur').trim().split(/\s+/); headerUserName.textContent = words.length > 1 ? words[words.length - 1] : words[0]; }
}

function showWelcomeMessage(user) {
    const hour = new Date().getHours();
    let greeting = hour >= 5 && hour < 12 ? 'Bonjour' : hour >= 12 && hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    let icon = hour >= 5 && hour < 12 ? '☀️' : hour >= 12 && hour < 18 ? '🌤️' : '🌙';
    const words = (user.nom || user.matricule || 'Utilisateur').trim().split(/\s+/);
    document.getElementById('toastText').textContent = `${greeting} cher(e) ${words.length > 1 ? words[words.length - 1] : words[0]}, bienvenue sur GeNot !`;
    document.querySelector('.toast-icon').textContent = icon;
    setTimeout(() => { const toast = document.getElementById('welcomeToast'); if (toast) toast.remove(); }, 4200);
}

// ==========================================
// CHARGEMENT OPTIMISÉ : 1 seule requête (noteCount déjà inclus)
// ==========================================
async function loadCourses() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) return;
    try {
        const response = await fetch(`/api/courses/${currentUser.matricule}`);
        const data = await response.json();
        if (data.success) { coursesData = data.courses; displayCourses(coursesData); }
    } catch (error) { console.error('Erreur chargement cours:', error); }
}

function displayCourses(courses) {
    const coursesGrid = document.getElementById('courses-grid');
    const noCourses = document.getElementById('no-courses');
    const addCourseBottom = document.getElementById('add-course-bottom');
    if (!courses || courses.length === 0) { coursesGrid.innerHTML = ''; noCourses.style.display = 'block'; noCourses.innerHTML = `<div class="empty-icon">📖</div><h2>Aucun cours pour le moment</h2><p>Commencez par ajouter votre premier cours !</p><button onclick="showAddCourseModal()" class="btn btn-submit btn-large"><i class="fas fa-plus"></i> Ajouter un cours</button>`; addCourseBottom.style.display = 'none'; return; }
    noCourses.style.display = 'none'; addCourseBottom.style.display = 'block';
    coursesGrid.innerHTML = courses.map(course => `<div class="course-card" onclick="openCourseDetail(${course.id})">${course.image_url ? `<img src="${course.image_url}" alt="${escapeHtml(course.title)}" class="course-card-image">` : `<div class="course-card-image no-image">📚</div>`}<div class="course-card-body"><h3 class="course-card-title">${escapeHtml(course.title)}</h3><div class="course-card-professor"><i class="fas fa-user-tie"></i> ${course.professor ? escapeHtml(course.professor) : '---------'}</div><div class="course-card-meta">📝 ${course.noteCount || 0} donnée(s)</div><div class="course-card-date">📅 ${new Date(course.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div><div class="course-card-actions" onclick="event.stopPropagation()"><a href="/course?id=${course.id}" class="btn-enter">📖 Voir le cours</a><button onclick="deleteCourse(${course.id})" class="btn-danger">🗑️</button></div></div></div>`).join('');
}

function setupHomeSearch() {
    const homeSearchInput = document.getElementById('homeSearchInput');
    const homeClearBtn = document.getElementById('homeClearSearch');
    if (!homeSearchInput) return;
    addMicButtonToHomeSearch(homeSearchInput);
    homeSearchInput.addEventListener('input', () => { const term = homeSearchInput.value.trim(); homeClearBtn.style.display = term ? 'block' : 'none'; searchHomeCourses(term); });
    homeSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') clearHomeSearch(); });
}

function searchHomeCourses(term) {
    if (!term || term.length === 0) { displayCourses(coursesData); return; }
    const t = term.toLowerCase().trim();
    const results = coursesData.map(course => { const title = (course.title||'').toLowerCase(); const professor = (course.professor||'').toLowerCase(); const description = (course.description||'').toLowerCase(); const maxSim = Math.max(similarity(title, t), similarity(professor, t), similarity(description, t)); return { course, score: maxSim }; }).filter(r => r.score >= 50).sort((a, b) => b.score - a.score);
    if (results.length === 0) { displayNoResults(term); return; }
    const coursesGrid = document.getElementById('courses-grid'); document.getElementById('no-courses').style.display = 'none'; document.getElementById('add-course-bottom').style.display = 'block';
    coursesGrid.innerHTML = results.map(r => { const course = r.course; const badge = r.score < 100 ? `<span style="font-size:0.7em;color:var(--warning);margin-left:6px;">~${r.score}%</span>` : ''; return `<div class="course-card" onclick="openCourseDetail(${course.id})">${course.image_url ? `<img src="${course.image_url}" alt="${escapeHtml(course.title)}" class="course-card-image">` : `<div class="course-card-image no-image">📚</div>`}<div class="course-card-body"><h3 class="course-card-title">${highlightMatchHome(escapeHtml(course.title), term)}${badge}</h3><div class="course-card-professor"><i class="fas fa-user-tie"></i> ${highlightMatchHome(course.professor ? escapeHtml(course.professor) : '---------', term)}</div><div class="course-card-meta">📝 ${course.noteCount || 0} donnée(s) • 📅 ${new Date(course.created_at).toLocaleDateString('fr-FR')}</div><div class="course-card-actions" onclick="event.stopPropagation()"><a href="/course?id=${course.id}" class="btn-enter">📖 Voir le cours</a><button onclick="deleteCourse(${course.id})" class="btn-danger">🗑️</button></div></div></div>`; }).join('');
}

function displayNoResults(term) { document.getElementById('no-courses').style.display = 'block'; document.getElementById('no-courses').innerHTML = `<div class="empty-icon">🔍</div><h2>Aucun cours trouvé pour "${term}"</h2><p>Essayez avec d'autres mots-clés</p>`; document.getElementById('add-course-bottom').style.display = 'block'; document.getElementById('courses-grid').innerHTML = ''; }
function clearHomeSearch() { document.getElementById('homeSearchInput').value = ''; document.getElementById('homeClearSearch').style.display = 'none'; displayCourses(coursesData); }
function highlightMatchHome(text, term) { if (!text || !term) return text; const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); return text.replace(regex, '<mark style="background:rgba(245,158,11,0.3);padding:2px 4px;border-radius:3px;">$1</mark>'); }

function addMicButtonToHomeSearch(inputElement) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const micBtn = document.createElement('button'); micBtn.type = 'button'; micBtn.className = 'mic-btn'; micBtn.innerHTML = '<i class="fas fa-microphone"></i>'; micBtn.title = 'Dicter votre recherche'; micBtn.style.cssText = 'position:absolute;right:40px;top:50%;transform:translateY(-50%);background:var(--input-bg);border:1px solid var(--border);cursor:pointer;font-size:1em;padding:6px 10px;border-radius:20px;z-index:10;color:var(--text-muted);display:flex;align-items:center;';
    inputElement.parentElement.style.position = 'relative'; inputElement.parentElement.appendChild(micBtn);
    let recognition = null, listening = false;
    micBtn.addEventListener('click', () => {
        if (listening) { if (recognition) recognition.stop(); listening = false; micBtn.classList.remove('listening'); micBtn.innerHTML = '<i class="fas fa-microphone"></i>'; micBtn.style.background = 'var(--input-bg)'; micBtn.style.color = 'var(--text-muted)'; return; }
        recognition = new SpeechRecognition(); recognition.lang = 'fr-FR'; recognition.continuous = false; recognition.interimResults = true;
        recognition.onresult = (e) => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; inputElement.value = t; inputElement.dispatchEvent(new Event('input')); };
        recognition.onerror = () => { listening = false; micBtn.classList.remove('listening'); micBtn.innerHTML = '<i class="fas fa-microphone"></i>'; micBtn.style.background = 'var(--input-bg)'; micBtn.style.color = 'var(--text-muted)'; };
        recognition.onend = () => { listening = false; micBtn.classList.remove('listening'); micBtn.innerHTML = '<i class="fas fa-microphone"></i>'; micBtn.style.background = 'var(--input-bg)'; micBtn.style.color = 'var(--text-muted)'; };
        recognition.start(); listening = true; micBtn.classList.add('listening'); micBtn.innerHTML = '<i class="fas fa-microphone-alt"></i>'; micBtn.style.background = '#ef4444'; micBtn.style.color = '#fff';
    });
}

function similarity(a, b) { if (!a || !b) return 0; const m = []; for (let i = 0; i <= a.length; i++) m[i] = [i]; for (let j = 0; j <= b.length; j++) m[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); const d = m[a.length][b.length], max = Math.max(a.length, b.length); return max === 0 ? 100 : Math.round(((max-d)/max)*100); }

function showAddCourseModal() { document.getElementById('add-course-modal').style.display = 'flex'; }
function closeAddCourseModal() { document.getElementById('add-course-modal').style.display = 'none'; document.getElementById('add-course-form').reset(); }

function setupAddCourseForm() {
    document.getElementById('add-course-form').addEventListener('submit', async (e) => {
        e.preventDefault(); const currentUser = JSON.parse(sessionStorage.getItem('currentUser')); const title = document.getElementById('course-title').value.trim(); const professor = document.getElementById('course-professor').value.trim(); const description = document.getElementById('course-description').value.trim(); const imageFile = document.getElementById('course-image').files[0];
        if (!title) { alert('Titre requis.'); return; }
        const formData = new FormData(); formData.append('title', title); formData.append('user_matricule', currentUser.matricule); if (professor) formData.append('professor', professor); if (description) formData.append('description', description); if (imageFile) formData.append('image', imageFile);
        try { const res = await fetch('/api/courses', { method: 'POST', body: formData }); const data = await res.json(); if (data.success) { closeAddCourseModal(); loadCourses(); } else alert(data.message); } catch (e) { alert('Erreur.'); }
    });
}

function deleteCourse(courseId) { event.stopPropagation(); if (!confirm('Mettre ce cours dans la corbeille ?')) return; fetch(`/api/courses/${courseId}`, { method: 'DELETE' }).then(r => r.json()).then(d => { if (d.success) loadCourses(); }); }
async function deleteCourseFromDetail() { if (!currentCourseId || !confirm('Mettre dans la corbeille ?')) return; try { const res = await fetch(`/api/courses/${currentCourseId}`, { method: 'DELETE' }); const data = await res.json(); if (data.success) { closeCourseDetail(); loadCourses(); } } catch (e) {} }

function openCourseDetail(courseId) {
    const course = coursesData.find(c => c.id === courseId); if (!course) return; currentCourseId = courseId;
    document.getElementById('modalCourseTitle').textContent = course.title; document.getElementById('detailTitle').textContent = course.title; document.getElementById('detailProfessor').textContent = course.professor || '---------'; document.getElementById('detailDate').textContent = new Date(course.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }); document.getElementById('detailDescription').textContent = course.description || 'Aucune description.';
    const img = document.getElementById('detailCourseImage'), noImg = document.getElementById('detailNoImage');
    if (course.image_url) { img.src = course.image_url; img.style.display = 'block'; noImg.style.display = 'none'; } else { img.style.display = 'none'; noImg.style.display = 'flex'; }
    switchToViewMode(); document.getElementById('courseDetailModal').style.display = 'flex';
}

function closeCourseDetail() { document.getElementById('courseDetailModal').style.display = 'none'; currentCourseId = null; }
function switchToViewMode() { document.getElementById('viewMode').style.display = 'block'; document.getElementById('editMode').style.display = 'none'; }
function switchToEditMode() { const course = coursesData.find(c => c.id === currentCourseId); if (!course) return; document.getElementById('editCourseTitle').value = course.title; document.getElementById('editProfessor').value = course.professor || ''; document.getElementById('editDescription').value = course.description || ''; document.getElementById('editCourseImage').value = ''; document.getElementById('viewMode').style.display = 'none'; document.getElementById('editMode').style.display = 'block'; }

async function saveCourseChanges() {
    const title = document.getElementById('editCourseTitle').value.trim(); const professor = document.getElementById('editProfessor').value.trim(); const description = document.getElementById('editDescription').value.trim(); const imageFile = document.getElementById('editCourseImage').files[0];
    if (!title) { alert('Titre requis.'); return; }
    const formData = new FormData(); formData.append('title', title); formData.append('professor', professor); formData.append('description', description); if (imageFile) formData.append('image', imageFile);
    try { const res = await fetch(`/api/courses/${currentCourseId}`, { method: 'PUT', body: formData }); const data = await res.json(); if (data.success) { closeCourseDetail(); loadCourses(); } } catch (e) {}
}

function escapeHtml(text) { if (!text) return ''; const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }