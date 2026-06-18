const API = '/api/admin';

async function loadAll() {
    loadStats();
    loadVisits();
}

async function loadStats() {
    try {
        const r = await fetch(`${API}/stats`);
        const d = await r.json();
        if (d.success) {
            document.getElementById('statsGrid').innerHTML = `
                <div class="stat-card"><span class="stat-num">${d.stats.users}</span><span>Utilisateurs</span></div>
                <div class="stat-card"><span class="stat-num">${d.stats.courses}</span><span>Cours</span></div>
                <div class="stat-card"><span class="stat-num">${d.stats.notes}</span><span>Notes</span></div>
                <div class="stat-card"><span class="stat-num">${d.stats.pdfs}</span><span>PDFs</span></div>
                <div class="stat-card"><span class="stat-num">${d.stats.links}</span><span>Liens</span></div>
            `;
        }
    } catch (e) {}
}

async function loadVisits() {
    try {
        const r = await fetch(`${API}/visits`);
        const d = await r.json();
        if (d.success) {
            document.getElementById('visitsStats').innerHTML = `
                <div class="stat-card"><span class="stat-num">${d.total}</span><span>Total</span></div>
                <div class="stat-card"><span class="stat-num">${d.today}</span><span>Aujourd'hui</span></div>
                <div class="stat-card"><span class="stat-num">${d.week}</span><span>7 jours</span></div>
            `;
            
            const webCount = d.platforms?.find(p => p.platform === 'web')?.count || 0;
            const mobileCount = d.platforms?.find(p => p.platform === 'mobile')?.count || 0;
            const total = d.total || 1;
            
            document.getElementById('platformsRow').innerHTML = `
                <div class="platform-col web">
                    <i class="fas fa-globe"></i>
                    <h3>Web</h3>
                    <span class="big-num">${webCount}</span>
                    <div class="progress-bar"><div class="fill" style="width:${Math.round((webCount/total)*100)}%"></div></div>
                    <span>${Math.round((webCount/total)*100)}%</span>
                </div>
                <div class="platform-col mobile">
                    <i class="fas fa-mobile-alt"></i>
                    <h3>Mobile</h3>
                    <span class="big-num">${mobileCount}</span>
                    <div class="progress-bar"><div class="fill" style="width:${Math.round((mobileCount/total)*100)}%"></div></div>
                    <span>${Math.round((mobileCount/total)*100)}%</span>
                </div>
            `;
            
            if (d.daily) {
                const max = Math.max(...d.daily.map(x => x.count), 1);
                document.getElementById('dailyChart').innerHTML = d.daily.map(day => `
                    <div class="chart-col">
                        <span>${day.count}</span>
                        <div class="chart-bar-inner" style="height:${Math.round((day.count/max)*100)}px"></div>
                        <span>${day.date.substring(5)}</span>
                    </div>
                `).join('');
            }
        }
    } catch (e) {}
}

async function executeSQL() {
    const query = document.getElementById('sqlQuery').value.trim();
    if (!query) return;
    try {
        const r = await fetch(`${API}/sql`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ query }) });
        const d = await r.json();
        document.getElementById('sqlResult').textContent = d.success ? JSON.stringify(d.data, null, 2) : d.message;
    } catch (e) {}
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    document.getElementById(tab).classList.add('active');
    if (tab === 'visits') loadVisits();
}

loadAll();