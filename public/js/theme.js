// ==========================================
// GESTION DU THÈME
// ==========================================

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
}

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            if (newTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
            else document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', newTheme);
            const user = JSON.parse(sessionStorage.getItem('currentUser'));
            if (user && user.matricule) {
                fetch('/api/save-theme', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ matricule: user.matricule, theme: newTheme })
                }).catch(() => {});
            }
        });
    }
});

// ==========================================
// BOUTONS SCROLL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.scroll-nav')) {
        const scrollNav = document.createElement('div');
        scrollNav.className = 'scroll-nav';
        scrollNav.id = 'scrollNav';
        scrollNav.innerHTML = `
            <button class="scroll-btn" id="scrollUpBtn" title="Haut de page"><i class="fas fa-chevron-up"></i></button>
            <button class="scroll-btn voice-nav-btn-global" id="voiceNavGlobalBtn" title="Commandes vocales"><i class="fas fa-microphone"></i></button>
            <button class="scroll-btn" id="scrollDownBtn" title="Bas de page"><i class="fas fa-chevron-down"></i></button>
        `;
        document.body.appendChild(scrollNav);
    }
    const scrollNav = document.getElementById('scrollNav');
    const scrollUpBtn = document.getElementById('scrollUpBtn');
    const scrollDownBtn = document.getElementById('scrollDownBtn');
    if (!scrollNav || !scrollUpBtn || !scrollDownBtn) return;
    
    scrollUpBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    scrollDownBtn.addEventListener('click', () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    
    let hideTimeout;
    function checkScroll() {
        const st = window.pageYOffset || document.documentElement.scrollTop;
        const wh = window.innerHeight;
        const fh = document.documentElement.scrollHeight;
        const isMobile = window.innerWidth <= 600;
        scrollUpBtn.style.display = st < 30 ? 'none' : 'flex';
        scrollDownBtn.style.display = (st + wh >= fh - 30 || fh <= wh) ? 'none' : 'flex';
        if (isMobile) { scrollNav.style.opacity = '0.8'; clearTimeout(hideTimeout); hideTimeout = setTimeout(() => scrollNav.style.opacity = '0.2', 2500); }
        else scrollNav.style.opacity = '1';
        scrollNav.style.pointerEvents = 'auto';
    }
    window.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    scrollNav.addEventListener('touchstart', () => { scrollNav.style.opacity = '0.8'; clearTimeout(hideTimeout); hideTimeout = setTimeout(() => scrollNav.style.opacity = '0.2', 2500); });
    checkScroll();
});

// ==========================================
// ASSISTANT VOCAL GLOBAL
// ==========================================
let voiceNavRecognition = null;
let isVoiceNavListening = false;
let isVoiceProcessing = false;

const actionKeywords = {
    openCourse: ['ouvre', 'ouvrir', 'affiche', 'montre', 'entre', 'entrer', 'rentre', 'rentrer', 'accède', 'accéder', 'lance', 'lancer', 'démarre', 'démarrer', 'voir', 'afficher', 'montrer', 'va', 'aller'],
    scrollDown: ['défile', 'defile', 'descend', 'descendre', 'descends', 'avance', 'avancer', 'continue', 'scroll', 'scrolle', 'scream', 'bas'],
    scrollUp: ['monte', 'monter', 'remonte', 'remonter', 'recule', 'reculer', 'reviens', 'haut'],
    scrollToTop: ['sommet', 'début', 'debut', 'commencement'],
    scrollToBottom: ['fin', 'pied'],
    goSettings: ['paramètre', 'parametre', 'paramètres', 'parametres', 'réglage', 'reglage', 'réglages', 'reglages', 'configuration', 'config', 'préférences', 'preferences', 'profil', 'profile'],
    goTrash: ['corbeille', 'poubelle', 'supprimés', 'supprimes', 'archives'],
    goHome: ['accueil', 'menu', 'maison'],
    logout: ['déconnecte', 'deconnecte', 'déconnexion', 'deconnexion', 'quitter', 'sortir', 'partir'],
    refresh: ['rafraîchir', 'rafraichir', 'actualiser', 'recharger'],
    goBack: ['retour', 'reculer', 'précédent', 'precedent'],
    help: ['aide', 'help', 'commandes', 'quoi'],
    stopListening: ['arrête', 'arrete', 'stop', 'pause', 'silence', 'tais', 'repos', 'termine', 'ferme', 'coupe', 'désactive', 'desactive', 'éteins', 'eteins', 'fini']
};

const knownPages = {
    'paramètre': '/settings', 'parametre': '/settings', 'paramètres': '/settings', 'parametres': '/settings',
    'réglage': '/settings', 'reglage': '/settings', 'réglages': '/settings', 'reglages': '/settings',
    'configuration': '/settings', 'config': '/settings', 'profil': '/settings', 'profile': '/settings',
    'corbeille': '/trash', 'poubelle': '/trash', 'accueil': '/home', 'menu': '/home', 'maison': '/home'
};

function initGlobalVoiceNav() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    console.log('📱 SpeechRecognition supporté:', !!SpeechRecognition);
    console.log('📱 Protocole:', window.location.protocol);
    
    const voiceBtn = document.getElementById('voiceNavGlobalBtn');
    if (!voiceBtn) return;
    
    if (!SpeechRecognition) {
        voiceBtn.classList.add('offline');
        voiceBtn.querySelector('i').className = 'fas fa-microphone-slash';
        voiceBtn.title = 'Assistant non supporté sur ce navigateur';
        return;
    }
    
    const newBtn = voiceBtn.cloneNode(true);
    voiceBtn.parentNode.replaceChild(newBtn, voiceBtn);
    newBtn.addEventListener('click', () => isVoiceNavListening ? stopGlobalVoiceNav() : startGlobalVoiceNav());
    updateVoiceButtonColor('idle');
    window.addEventListener('online', () => updateVoiceButtonColor(isVoiceNavListening ? 'listening' : 'idle'));
    window.addEventListener('offline', () => updateVoiceButtonColor('offline'));
    if (localStorage.getItem('voiceAssistantActive') === 'true') setTimeout(() => startGlobalVoiceNav(true), 800);
}

function updateVoiceButtonColor(state) {
    const btn = document.getElementById('voiceNavGlobalBtn');
    if (!btn) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { btn.classList.add('offline'); btn.querySelector('i').className = 'fas fa-microphone-slash'; btn.title = 'Non supporté'; return; }
    if (!navigator.onLine) { btn.classList.add('offline'); btn.querySelector('i').className = 'fas fa-microphone-slash'; btn.title = 'Pas de connexion'; return; }
    
    btn.classList.remove('offline', 'listening', 'processing');
    if (state === 'listening') { btn.classList.add('listening'); btn.querySelector('i').className = 'fas fa-microphone-alt'; btn.title = 'Assistant actif - Cliquez pour arrêter'; }
    else if (state === 'processing') { btn.classList.add('processing'); btn.querySelector('i').className = 'fas fa-spinner fa-spin'; btn.title = 'Traitement...'; }
    else { btn.querySelector('i').className = 'fas fa-microphone'; btn.title = 'Commandes vocales - Cliquez pour activer'; }
}

function startGlobalVoiceNav(silent = false) {
    if (!navigator.onLine) { showToast('❌ Pas de connexion Internet', 'error'); return; }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { showToast('❌ Non supporté sur ce navigateur', 'error'); return; }
    
    voiceNavRecognition = new SpeechRecognition();
    voiceNavRecognition.lang = 'fr-FR';
    voiceNavRecognition.continuous = true;
    voiceNavRecognition.interimResults = false;
    
    voiceNavRecognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                const transcript = event.results[i][0].transcript.toLowerCase().trim();
                console.log('🎤:', transcript);
                if (transcript) processCommand(transcript);
            }
        }
    };
    
    voiceNavRecognition.onerror = (e) => {
        console.error('🔴 Erreur reco:', e.error);
        if (e.error === 'not-allowed') {
            showToast('🔇 Veuillez autoriser le microphone dans les paramètres du navigateur', 'error');
            stopGlobalVoiceNav();
        } else if (e.error === 'network') {
            showToast('❌ Erreur réseau', 'error');
        }
    };
    
    voiceNavRecognition.onend = () => {
        if (isVoiceNavListening && !isInputFocused()) {
            setTimeout(() => { if (isVoiceNavListening && !isInputFocused()) try { voiceNavRecognition.start(); } catch(ex) { stopGlobalVoiceNav(); } }, 300);
        } else if (isVoiceNavListening && isInputFocused()) {
            setTimeout(() => { if (isVoiceNavListening && !isInputFocused()) try { voiceNavRecognition.start(); } catch(ex) { stopGlobalVoiceNav(); } }, 1000);
        }
    };
    
    voiceNavRecognition.start();
    isVoiceNavListening = true;
    localStorage.setItem('voiceAssistantActive', 'true');
    updateVoiceButtonColor('listening');
    if (!silent) showToast('🎤 Assistant activé. Dites "aide".', 'success');
}

function stopGlobalVoiceNav() {
    if (voiceNavRecognition) { try { voiceNavRecognition.stop(); voiceNavRecognition.abort(); } catch(e) {} }
    isVoiceNavListening = false;
    isVoiceProcessing = false;
    localStorage.setItem('voiceAssistantActive', 'false');
    updateVoiceButtonColor('idle');
}

function isInputFocused() {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

function findAction(transcript) {
    const words = transcript.split(/\s+/);
    const found = {};
    for (const [action, keywords] of Object.entries(actionKeywords)) {
        for (const word of words) {
            if (keywords.includes(word)) {
                if (!found[action]) found[action] = { action, count: 0 };
                found[action].count++;
            }
        }
    }
    const sorted = Object.values(found).sort((a, b) => b.count - a.count);
    return sorted.length > 0 ? sorted[0].action : null;
}

function extractCourseName(transcript) {
    const words = transcript.split(/\s+/);
    const ignoreWords = new Set([...actionKeywords.openCourse, 'le', 'la', 'les', 'l', 'cours', 'de', 'du', 'des', 'd', 'module', 'formation', 'classe', 'dans', 'sur', 'pour', 'vers', 'tout', 'tous', 'une', 'un', 'est', 'que', 'qui', 'quoi', 'moi', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'veux', 'voudrais', 'peux', 'puis']);
    const relevant = words.filter(w => !ignoreWords.has(w) && w.length > 1);
    if (relevant.length === 0) {
        for (let i = words.length - 1; i >= 0; i--) { if (words[i].length > 2 && !ignoreWords.has(words[i])) return words[i]; }
    }
    return relevant.join(' ');
}

async function processCommand(transcript) {
    if (isVoiceProcessing) return;
    
    const words = transcript.split(/\s+/);
    
    if (words.some(w => actionKeywords.stopListening.includes(w))) {
        stopGlobalVoiceNav();
        showToast('🔇 Assistant désactivé.', 'info');
        return;
    }
    
    if (words.some(w => actionKeywords.help.includes(w))) {
        openHelpModal();
        return;
    }
    
    isVoiceProcessing = true;
    updateVoiceButtonColor('processing');
    
    const action = findAction(transcript);
    console.log('🎯 Action:', action);
    
    if (!action) {
        const word = words.pop();
        if (word && word.length > 2) await searchAndOpen(word);
        isVoiceProcessing = false;
        updateVoiceButtonColor('listening');
        return;
    }
    
    switch (action) {
        case 'openCourse':
            const cn = extractCourseName(transcript);
            if (cn && cn.length >= 2) await searchAndOpen(cn);
            else showToast('🤔 Quel cours ?', 'error');
            break;
        case 'scrollDown': window.scrollBy({ top: extractScrollAmount(transcript), behavior: 'smooth' }); break;
        case 'scrollUp': window.scrollBy({ top: -extractScrollAmount(transcript), behavior: 'smooth' }); break;
        case 'scrollToTop': window.scrollTo({ top: 0, behavior: 'smooth' }); break;
        case 'scrollToBottom': window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); break;
        case 'goSettings': window.location.href = '/settings'; break;
        case 'goTrash': window.location.href = '/trash'; break;
        case 'goHome': window.location.href = '/home'; break;
        case 'logout': localStorage.setItem('voiceAssistantActive', 'false'); sessionStorage.removeItem('currentUser'); window.location.href = '/login'; break;
        case 'refresh': location.reload(); break;
        case 'goBack': history.back(); break;
        default:
            const w = words.pop();
            if (w && w.length > 2) await searchAndOpen(w);
    }
    
    setTimeout(() => { isVoiceProcessing = false; updateVoiceButtonColor('listening'); }, 500);
}

async function searchAndOpen(name) {
    const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    for (const [key, url] of Object.entries(knownPages)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            showToast(`📄 ${key}`, 'success');
            setTimeout(() => window.location.href = url, 400);
            return;
        }
    }
    
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) { showToast('⚠️ Connectez-vous.', 'error'); return; }
    
    try {
        const response = await fetch(`/api/courses/${currentUser.matricule}`);
        const data = await response.json();
        if (!data.success || !data.courses.length) { showToast('⚠️ Aucun cours.', 'error'); return; }
        
        const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const matches = data.courses.filter(c => norm(c.title).includes(normalized));
        
        if (matches.length === 1) {
            showToast(`📖 ${matches[0].title}`, 'success');
            setTimeout(() => window.location.href = `/course?id=${matches[0].id}`, 400);
        } else if (matches.length > 1) {
            showToast(`🤔 Plusieurs : ${matches.map(c => c.title).join(', ')}`, 'error');
        } else {
            let best = null, bestScore = 0;
            data.courses.forEach(c => {
                const score = similarity(norm(c.title), normalized);
                if (score > bestScore && score >= 50) { bestScore = score; best = c; }
            });
            if (best) { showToast(`📖 ${best.title}`, 'success'); setTimeout(() => window.location.href = `/course?id=${best.id}`, 400); }
            else showToast(`❌ "${name}" introuvable.`, 'error');
        }
    } catch (e) { showToast('❌ Erreur.', 'error'); }
}

function extractScrollAmount(transcript) {
    const nums = { 'zéro': 0, 'un': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5, 'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10, 'vingt': 20, 'trente': 30, 'quarante': 40, 'cinquante': 50, 'soixante': 60, 'cent': 100, 'deux cents': 200, 'cinq cents': 500, 'mille': 1000, 'un peu': 150, 'beaucoup': 500 };
    const m = transcript.match(/(\d+)/);
    if (m) return parseInt(m[1]);
    for (const [w, v] of Object.entries(nums)) { if (transcript.includes(w)) return v; }
    return 200;
}

function similarity(a, b) {
    if (!a || !b) return 0;
    const m = [];
    for (let i = 0; i <= a.length; i++) m[i] = [i];
    for (let j = 0; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    const d = m[a.length][b.length], max = Math.max(a.length, b.length);
    return max === 0 ? 100 : Math.round(((max-d)/max)*100);
}

function showToast(message, type) {
    const existing = document.querySelector('.voice-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `voice-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}

// ==========================================
// MODAL AIDE
// ==========================================
function createHelpModal() {
    if (document.getElementById('helpModal')) return;
    const modal = document.createElement('div');
    modal.id = 'helpModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="modal-card help-modal-card">
            <div class="modal-header"><h2>🎤 Commandes Vocales</h2><button class="modal-close" onclick="document.getElementById('helpModal').style.display='none'"><i class="fas fa-times"></i></button></div>
            <div class="modal-body help-modal-body">
                <p class="help-intro">Dites un <strong>mot-clé</strong> :</p>
                <div class="help-section"><h3><i class="fas fa-book-open"></i> Cours</h3><div class="help-cards"><div class="help-card"><code>"ouvre python"</code></div><div class="help-card"><code>"python"</code></div><div class="help-card"><code>"entre dans langage c"</code></div></div></div>
                <div class="help-section"><h3><i class="fas fa-arrows-up-down"></i> Défilement</h3><div class="help-cards"><div class="help-card"><code>"défile"</code></div><div class="help-card"><code>"descend 300"</code></div><div class="help-card"><code>"monte"</code></div><div class="help-card"><code>"haut"</code></div><div class="help-card"><code>"bas"</code></div><div class="help-card"><code>"sommet"</code></div><div class="help-card"><code>"fin"</code></div></div></div>
                <div class="help-section"><h3><i class="fas fa-globe"></i> Navigation</h3><div class="help-cards"><div class="help-card"><code>"paramètres"</code></div><div class="help-card"><code>"profil"</code></div><div class="help-card"><code>"corbeille"</code></div><div class="help-card"><code>"menu"</code></div><div class="help-card"><code>"retour"</code></div><div class="help-card"><code>"rafraîchir"</code></div><div class="help-card"><code>"déconnecte"</code></div></div></div>
                <div class="help-section"><h3><i class="fas fa-microphone-slash"></i> Contrôle</h3><div class="help-cards"><div class="help-card"><code>"aide"</code></div><div class="help-card"><code>"stop"</code></div><div class="help-card"><code>"silence"</code></div></div></div>
                <div class="help-tip"><i class="fas fa-lightbulb"></i><p>Un seul mot suffit ! "python" ouvre le cours Python. "paramètres" va aux paramètres.</p></div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
}

function openHelpModal() {
    createHelpModal();
    document.getElementById('helpModal').style.display = 'flex';
}

setTimeout(initGlobalVoiceNav, 1000);