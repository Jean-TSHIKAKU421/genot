// ==========================================
// modal.js — Système de modal réutilisable
// ==========================================
function showConfirmModal(message, callback) {
    const existing = document.getElementById('confirmModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header"><h2>⚠️ Confirmation</h2></div>
            <div class="modal-body"><p style="color:var(--text-secondary);font-size:14px;">${message}</p></div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="confirmCancel">Annuler</button>
                <button class="btn btn-danger" id="confirmOk">Confirmer</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    document.getElementById('confirmCancel').addEventListener('click', () => { modal.remove(); });
    document.getElementById('confirmOk').addEventListener('click', () => { modal.remove(); callback(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function showPromptModal(message, inputType, callback) {
    const existing = document.getElementById('promptModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'promptModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header"><h2>✏️ Saisie</h2><button class="modal-close" id="promptClose"><i class="fas fa-times"></i></button></div>
            <div class="modal-body">
                <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px;">${message}</p>
                <div class="input-wrapper"><i class="fas fa-pen input-icon"></i><input type="${inputType||'text'}" id="promptInput" placeholder="Saisissez..."></div>
                <div id="promptError" class="alert alert-error" style="display:none;"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="promptCancel">Annuler</button>
                <button class="btn btn-submit" id="promptOk">Valider</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    document.getElementById('promptClose').addEventListener('click', close);
    document.getElementById('promptCancel').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.getElementById('promptOk').addEventListener('click', () => {
        const val = document.getElementById('promptInput').value.trim();
        if (!val) {
            document.getElementById('promptError').textContent = 'Ce champ est requis.';
            document.getElementById('promptError').style.display = 'block';
            return;
        }
        modal.remove();
        callback(val);
    });
    setTimeout(() => document.getElementById('promptInput').focus(), 200);
}

function showAlertModal(message, type) {
    const existing = document.getElementById('alertModal');
    if (existing) existing.remove();
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    const modal = document.createElement('div');
    modal.id = 'alertModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-body" style="text-align:center;padding:40px 24px;">
                <span style="font-size:50px;display:block;margin-bottom:16px;">${icon}</span>
                <p style="color:var(--text-color);font-size:15px;">${message}</p>
                <button class="btn btn-submit" style="margin-top:20px;" id="alertOk">OK</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    document.getElementById('alertOk').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}