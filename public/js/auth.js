// ==========================================
// AUTHENTIFICATION
// ==========================================

const isLoginPage = !!document.getElementById('login-form');
const isRegisterPage = !!document.getElementById('register-form');

// --- Helper message ---
function showMessage(text, type) {
    const messageEl = document.getElementById('form-message');
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.className = 'form-message ' + type;
    }
    
    if (type === 'error') {
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + text;
            errorEl.classList.add('show');
            errorEl.className = 'alert alert-error show';
        }
    }
    if (type === 'success') {
        const successEl = document.getElementById('successMessage');
        if (successEl) {
            successEl.innerHTML = '<i class="fas fa-check-circle"></i> ' + text;
            successEl.classList.add('show');
            successEl.className = 'alert alert-success show';
        }
    }
}

function hideAlerts() {
    const errorEl = document.getElementById('errorMessage');
    const successEl = document.getElementById('successMessage');
    if (errorEl) errorEl.classList.remove('show');
    if (successEl) successEl.classList.remove('show');
}

// ==========================================
// INSCRIPTION
// ==========================================
if (isRegisterPage) {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const requirementsBox = document.getElementById('passwordRequirements');
    const strengthDiv = document.getElementById('passwordStrength');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    const matchDiv = document.getElementById('passwordMatch');
    const matchBar = document.getElementById('matchBar');
    const matchText = document.getElementById('matchText');
    
    const requirements = {
        length: { regex: /.{8,}/, el: document.querySelector('[data-req="length"]') },
        lowercase: { regex: /[a-z]/, el: document.querySelector('[data-req="lowercase"]') },
        uppercase: { regex: /[A-Z]/, el: document.querySelector('[data-req="uppercase"]') },
        number: { regex: /[0-9]/, el: document.querySelector('[data-req="number"]') },
        special: { regex: /[^a-zA-Z0-9]/, el: document.querySelector('[data-req="special"]') }
    };
    
    passwordInput.addEventListener('focus', () => { requirementsBox.style.display = 'block'; if (passwordInput.value) strengthDiv.style.display = 'block'; });
    passwordInput.addEventListener('blur', () => { if (!passwordInput.value) setTimeout(() => { if (!passwordInput.value) strengthDiv.style.display = 'none'; }, 200); });
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        let validCount = 0;
        Object.values(requirements).forEach(req => {
            if (req.regex.test(password)) { req.el.classList.add('valid'); req.el.classList.remove('invalid'); validCount++; }
            else if (password.length > 0) { req.el.classList.add('invalid'); req.el.classList.remove('valid'); }
            else { req.el.classList.remove('valid', 'invalid'); }
        });
        if (password.length === 0) { strengthDiv.style.display = 'none'; strengthBar.className = 'strength-bar'; strengthBar.style.width = '0'; strengthText.textContent = ''; strengthText.className = 'strength-text'; }
        else {
            strengthDiv.style.display = 'block';
            let strengthClass = '', strengthLabel = '';
            switch (validCount) {
                case 0: case 1: strengthClass = 'very-weak'; strengthLabel = 'Très faible'; break;
                case 2: strengthClass = 'weak'; strengthLabel = 'Faible'; break;
                case 3: strengthClass = 'medium'; strengthLabel = 'Moyen'; break;
                case 4: strengthClass = 'good'; strengthLabel = 'Bon'; break;
                case 5: strengthClass = 'strong'; strengthLabel = 'Fort'; break;
            }
            strengthBar.className = 'strength-bar ' + strengthClass;
            strengthText.textContent = 'Force : ' + strengthLabel;
            strengthText.className = 'strength-text ' + strengthClass;
        }
        if (confirmPasswordInput.value) checkPasswordMatch();
    });
    
    function checkPasswordMatch() {
        const password = passwordInput.value, confirm = confirmPasswordInput.value;
        if (confirm.length === 0) { matchDiv.style.display = 'none'; matchBar.className = 'match-bar'; matchBar.style.width = '0'; matchText.innerHTML = ''; matchText.className = 'match-text'; return; }
        matchDiv.style.display = 'block';
        if (password === confirm) { matchBar.className = 'match-bar match'; matchText.className = 'match-text match'; matchText.innerHTML = '<span class="match-icon">✅</span> Les mots de passe correspondent (100%)'; }
        else {
            const similarityPercent = calculateSimilarity(password, confirm);
            let matchClass = '', icon = '', message = '';
            if (similarityPercent < 30) { matchClass = 'mismatch'; icon = '❌'; message = `Valeurs incompatibles (${similarityPercent}%)`; }
            else if (similarityPercent < 60) { matchClass = 'partial'; icon = '⚠️'; message = `Partiellement similaire (${similarityPercent}%)`; }
            else { matchClass = 'almost'; icon = '🟡'; message = `Presque identique (${similarityPercent}%)`; }
            matchBar.className = 'match-bar ' + matchClass; matchText.className = 'match-text ' + matchClass;
            matchText.innerHTML = `<span class="match-icon">${icon}</span> ${message}`;
        }
    }
    
    function calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        const maxLen = Math.max(str1.length, str2.length); if (maxLen === 0) return 100;
        let matches = 0; const minLen = Math.min(str1.length, str2.length);
        for (let i = 0; i < minLen; i++) { if (str1[i] === str2[i]) matches++; }
        const lengthDiff = Math.abs(str1.length - str2.length), lengthScore = (maxLen - lengthDiff) / maxLen;
        return Math.round(((matches / maxLen) * 0.7 + lengthScore * 0.3) * 100);
    }
    
    confirmPasswordInput.addEventListener('focus', () => { if (confirmPasswordInput.value) { matchDiv.style.display = 'block'; checkPasswordMatch(); } });
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault(); hideAlerts();
        const nom = document.getElementById('nom').value.trim(), matricule = document.getElementById('matricule').value.trim(), email = document.getElementById('email').value.trim();
        const password = passwordInput.value, confirmPassword = confirmPasswordInput.value;
        const question1 = document.getElementById('question1').value, reponse1 = document.getElementById('reponse1').value.trim();
        const question2 = document.getElementById('question2').value, reponse2 = document.getElementById('reponse2').value.trim();
        if (!nom || !matricule || !password || !question1 || !reponse1 || !question2 || !reponse2) { showMessage('Tous les champs obligatoires doivent être remplis.', 'error'); return; }
        if (password !== confirmPassword) { showMessage('Les mots de passe ne correspondent pas.', 'error'); return; }
        if (password.length < 8) { showMessage('Le mot de passe doit contenir au moins 8 caractères.', 'error'); return; }
        try {
            const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom, matricule, email, password, question1, reponse1, question2, reponse2 }) });
            const data = await response.json();
            if (data.success) { showMessage('✅ Compte créé avec succès ! Redirection...', 'success'); setTimeout(() => { window.location.href = '/login'; }, 1500); }
            else showMessage(data.message, 'error');
        } catch (error) { showMessage('Impossible de contacter le serveur.', 'error'); }
    });
}

// ==========================================
// CONNEXION
// ==========================================
if (isLoginPage) {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault(); hideAlerts();
        const matricule = document.getElementById('matricule').value.trim();
        const password = document.getElementById('password').value;
        if (!matricule || !password) { showMessage('Matricule et mot de passe sont obligatoires.', 'error'); return; }

        // ==========================================
        // VÉRIFICATION ADMIN
        // ==========================================
        if (matricule === '24AD421SI' && password === 'tikiplugg') {
            sessionStorage.setItem('currentUser', JSON.stringify({ matricule: '24AD421SI', nom: 'Admin', admin: true }));
            showMessage('✅ Connexion admin. Redirection...', 'success');
            setTimeout(() => { window.location.href = 'admin'; }, 800);
            return;
        }

        try {
            const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matricule, password }) });
            const data = await response.json();
            if (data.success) {
                sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                const userTheme = data.user.theme || 'light';
                if (userTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
                else document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', userTheme);
                showMessage('✅ Connexion réussie. Redirection...', 'success');
                setTimeout(() => { window.location.href = '/home'; }, 1000);
            } else { showMessage(data.message, 'error'); }
        } catch (error) { showMessage('Impossible de contacter le serveur.', 'error'); }
    });
}

// ==========================================
// TOGGLE MOT DE PASSE
// ==========================================
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function () {
        const targetId = this.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        const icon = this.querySelector('i');
        if (icon) icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
});

// ==========================================
// RÉINITIALISATION MOT DE PASSE
// ==========================================
let resetMatricule = '';

function openResetModal() { document.getElementById('resetModal').style.display = 'flex'; resetToStep1(); }
function closeResetModal() { document.getElementById('resetModal').style.display = 'none'; resetToStep1(); }

function resetToStep1() {
    document.getElementById('resetStep1').style.display = 'block'; document.getElementById('resetStep1').classList.add('active');
    document.getElementById('resetStep2').style.display = 'none'; document.getElementById('resetStep2').classList.remove('active');
    document.getElementById('resetStep3').style.display = 'none'; document.getElementById('resetStep3').classList.remove('active');
    document.getElementById('securityQuestions').style.display = 'none';
    document.getElementById('loadQuestionsBtn').style.display = 'inline-flex'; document.getElementById('verifyAnswersBtn').style.display = 'none';
    document.getElementById('resetMatricule').value = ''; document.getElementById('resetReponse1').value = ''; document.getElementById('resetReponse2').value = '';
    document.getElementById('newPassword').value = ''; document.getElementById('confirmNewPassword').value = '';
    const msg1 = document.getElementById('resetMessage1'), msg2 = document.getElementById('resetMessage2');
    if (msg1) { msg1.classList.remove('show'); msg1.className = 'alert alert-error'; }
    if (msg2) { msg2.classList.remove('show'); msg2.className = 'alert alert-error'; }
}

document.addEventListener('click', function(e) { const modal = document.getElementById('resetModal'); if (modal && e.target === modal) closeResetModal(); });

async function loadSecurityQuestions() {
    const matricule = document.getElementById('resetMatricule').value.trim();
    const messageEl = document.getElementById('resetMessage1');
    if (!matricule) { messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Veuillez entrer votre matricule.'; messageEl.className = 'alert alert-error show'; return; }
    resetMatricule = matricule;
    try {
        const response = await fetch(`/api/security-questions/${matricule}`); const data = await response.json();
        if (data.success) {
            document.getElementById('question1Label').textContent = data.question1; document.getElementById('question2Label').textContent = data.question2;
            document.getElementById('securityQuestions').style.display = 'block'; document.getElementById('loadQuestionsBtn').style.display = 'none'; document.getElementById('verifyAnswersBtn').style.display = 'inline-flex';
            messageEl.classList.remove('show'); messageEl.className = 'alert alert-error';
        } else { messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + data.message; messageEl.className = 'alert alert-error show'; }
    } catch (error) { messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Erreur de connexion.'; messageEl.className = 'alert alert-error show'; }
}

async function verifyAnswers() {
    const reponse1 = document.getElementById('resetReponse1').value.trim(), reponse2 = document.getElementById('resetReponse2').value.trim();
    const messageEl = document.getElementById('resetMessage1');
    if (!reponse1 || !reponse2) { messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Veuillez répondre aux deux questions.'; messageEl.className = 'alert alert-error show'; return; }
    try {
        const response = await fetch('/api/verify-security-answers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matricule: resetMatricule, reponse1, reponse2 }) });
        const data = await response.json();
        if (data.success) { document.getElementById('resetStep1').style.display = 'none'; document.getElementById('resetStep1').classList.remove('active'); document.getElementById('resetStep2').style.display = 'block'; document.getElementById('resetStep2').classList.add('active'); }
        else { messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + data.message; messageEl.className = 'alert alert-error show'; }
    } catch (error) { messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Erreur de connexion.'; messageEl.className = 'alert alert-error show'; }
}

async function resetPassword() {
    const newPassword = document.getElementById('newPassword').value, confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const messageEl = document.getElementById('resetMessage2');
    if (!newPassword || !confirmNewPassword) { messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Tous les champs sont requis.'; messageEl.className = 'alert alert-error show'; return; }
    if (newPassword.length < 8) { messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Minimum 8 caractères.'; messageEl.className = 'alert alert-error show'; return; }
    if (newPassword !== confirmNewPassword) { messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Les mots de passe ne correspondent pas.'; messageEl.className = 'alert alert-error show'; return; }
    try {
        const response = await fetch('/api/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matricule: resetMatricule, newPassword }) });
        const data = await response.json();
        if (data.success) { document.getElementById('resetStep2').style.display = 'none'; document.getElementById('resetStep2').classList.remove('active'); document.getElementById('resetStep3').style.display = 'block'; document.getElementById('resetStep3').classList.add('active'); }
        else { messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + data.message; messageEl.className = 'alert alert-error show'; }
    } catch (error) { messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Erreur de connexion.'; messageEl.className = 'alert alert-error show'; }
}