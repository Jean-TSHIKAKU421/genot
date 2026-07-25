// ==========================================
// admin.js
// ==========================================
const API='/api/admin';let monthlyChartInstance=null,logsPage=0,logsTotalPages=0,totpVerified=false;

function apiFetch(url, options = {}) {
    const token = sessionStorage.getItem('token');
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (totpVerified) { const code = document.getElementById('totpInput')?.value; if (code) headers['x-totp'] = code; }
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    return fetch(url, { ...options, headers }).then(r => {
        if (r.status === 403) return r.json().then(d => { if (d.requireTOTP) { showTOTPModal(); throw new Error('TOTP required'); } return r; });
        return r;
    });
}

function showTOTPModal() { document.getElementById('totpModal').style.display = 'flex'; document.getElementById('totpInput').value = ''; document.getElementById('totpError').style.display = 'none'; setTimeout(() => document.getElementById('totpInput').focus(), 300); }
async function verifyTOTP() {
    const code = document.getElementById('totpInput').value.trim(); const err = document.getElementById('totpError');
    if (!code || code.length !== 6) { err.textContent = 'Code à 6 chiffres requis.'; err.style.display = 'block'; return; }
    try {
        const r = await fetch(`${API}/totp/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }, body: JSON.stringify({ matricule: JSON.parse(sessionStorage.getItem('currentUser')).matricule, token: code }) });
        const d = await r.json();
        if (d.success) { totpVerified = true; document.getElementById('totpModal').style.display = 'none'; loadAll(); }
        else { err.textContent = 'Code invalide.'; err.style.display = 'block'; }
    } catch (e) { err.textContent = 'Erreur de vérification.'; err.style.display = 'block'; }
}

async function loadAll(){loadStats();loadVisits()}
async function loadStats(){try{const r=await apiFetch(`${API}/stats`);const d=await r.json();if(d.success){document.getElementById('statsGrid').innerHTML=`<div class="stat-card"><span class="stat-num">${d.stats.users}</span><span>Utilisateurs</span></div><div class="stat-card"><span class="stat-num">${d.stats.courses}</span><span>Cours</span></div><div class="stat-card"><span class="stat-num">${d.stats.notes}</span><span>Notes</span></div><div class="stat-card"><span class="stat-num">${d.stats.pdfs}</span><span>PDFs</span></div><div class="stat-card"><span class="stat-num">${d.stats.links}</span><span>Liens</span></div>`}}catch(e){}}
async function loadVisits(){try{const r=await apiFetch(`${API}/visits`);const d=await r.json();if(d.success){document.getElementById('visitsStats').innerHTML=`<div class="stat-card"><span class="stat-num">${d.total}</span><span>Total</span></div><div class="stat-card"><span class="stat-num">${d.today}</span><span>Aujourd'hui</span></div><div class="stat-card"><span class="stat-num">${d.week}</span><span>7 jours</span></div>`;const wc=d.platforms?.find(p=>p.platform==='web')?.count||0;const mc=d.platforms?.find(p=>p.platform==='mobile')?.count||0;const total=d.total||1;document.getElementById('platformsRow').innerHTML=`<div class="platform-col web"><i class="fas fa-globe"></i><h3>Web</h3><span class="big-num">${wc}</span><div class="progress-bar"><div class="fill" style="width:${Math.round((wc/total)*100)}%"></div></div><span>${Math.round((wc/total)*100)}%</span></div><div class="platform-col mobile"><i class="fas fa-mobile-alt"></i><h3>Mobile</h3><span class="big-num">${mc}</span><div class="progress-bar"><div class="fill" style="width:${Math.round((mc/total)*100)}%"></div></div><span>${Math.round((mc/total)*100)}%</span></div>`}}catch(e){}}
async function loadMonthlyVisits(){const month=document.getElementById('chartMonth').value;const year=document.getElementById('chartYear').value;try{const r=await apiFetch(`${API}/visits-monthly?month=${month}&year=${year}`);const d=await r.json();if(d.success&&d.data){if(d.data.every(x=>x.count===0)){document.getElementById('noDataMessage').style.display='block';document.getElementById('monthlyChart').style.display='none'}else{document.getElementById('noDataMessage').style.display='none';document.getElementById('monthlyChart').style.display='block';const ctx=document.getElementById('monthlyChart');if(!ctx)return;if(monthlyChartInstance)monthlyChartInstance.destroy();const labels=d.data.map(x=>x.day);const values=d.data.map(x=>x.count);const isDark=document.documentElement.getAttribute('data-theme')==='dark';monthlyChartInstance=new Chart(ctx,{type:'bar',data:{labels,datasets:[{type:'bar',label:'Visites',data:values,backgroundColor:'rgba(99,102,241,0.6)',borderRadius:6,barThickness:Math.max(10,600/d.daysInMonth),order:2},{type:'line',label:'Tendance',data:values,borderColor:'#10b981',backgroundColor:'transparent',borderWidth:2,pointRadius:3,pointBackgroundColor:'#10b981',tension:0.3,order:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:isDark?'#94a3b8':'#64748b',font:{size:11}}}},scales:{x:{ticks:{color:isDark?'#94a3b8':'#64748b',font:{size:10},maxTicksLimit:31},grid:{display:false}},y:{beginAtZero:true,ticks:{color:isDark?'#94a3b8':'#64748b',font:{size:10},stepSize:1},grid:{color:isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)'}}}}})}}}catch(e){}}
async function executeSQL(){const query=document.getElementById('sqlQuery').value.trim();if(!query)return;const btn=document.getElementById('sqlBtn');btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Exécution...';document.getElementById('sqlError').style.display='none';document.getElementById('sqlResult').innerHTML='';try{const r=await apiFetch(`${API}/sql`,{method:'POST',body:JSON.stringify({query})});const d=await r.json();if(d.success){document.getElementById('sqlResult').innerHTML=`<p style="color:#10b981;margin-bottom:12px;">${d.data.length} résultat(s)</p><div class="sql-table"><table>${d.data.slice(0,50).map(row=>'<tr>'+Object.values(row).map(v=>'<td>'+(v!==null?v:'<i>NULL</i>')+'</td>').join('')+'</tr>').join('')}</table></div>`}else{document.getElementById('sqlError').style.display='block';document.getElementById('sqlError').textContent=d.message}}catch(e){document.getElementById('sqlError').style.display='block';document.getElementById('sqlError').textContent='Erreur de connexion.'}btn.disabled=false;btn.innerHTML='<i class="fas fa-play"></i> Exécuter'}
function clearSQL(){document.getElementById('sqlQuery').value='';document.getElementById('sqlResult').innerHTML='';document.getElementById('sqlError').style.display='none'}

async function loadLogs(page=0){logsPage=page;const type=document.getElementById('logType').value;const startDate=document.getElementById('logStartDate').value;const endDate=document.getElementById('logEndDate').value;const limit=20,offset=page*limit;const params=new URLSearchParams({limit,offset});if(type)params.append('type',type);if(startDate)params.append('startDate',startDate);if(endDate)params.append('endDate',endDate);try{const r=await apiFetch(`${API}/logs?${params}`);const d=await r.json();if(d.success){logsTotalPages=Math.ceil(d.total/limit)||1;document.getElementById('logsInfo').innerHTML=`<span><i class="fas fa-list"></i> <strong>${d.total}</strong> log(s)</span>`;const tbody=document.getElementById('logsBody');if(d.logs.length===0){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-secondary);"><i class="fas fa-inbox" style="font-size:30px;display:block;margin-bottom:8px;"></i>Aucun log</td></tr>'}else{tbody.innerHTML=d.logs.map(log=>{const date=new Date(log.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});return`<tr><td>${date}</td><td><span class="log-badge ${getLogClass(log.type)}">${getLogLabel(log.type)}</span></td><td>${log.user_name||'<i style="color:var(--text-muted)">-</i>'}</td><td><code>${log.ip_address||'-'}</code></td><td>${log.details||'-'}</td></tr>`}).join('')}renderLogsPagination()}}catch(e){}}
function getLogLabel(t){const l={login:'Connexion',login_failed:'Échec connexion',logout:'Déconnexion',course_create:'Cours créé',course_update:'Cours modifié',course_delete:'Cours supprimé',note_create:'Note créée',note_update:'Note modifiée',note_delete:'Note supprimée',file_upload:'Upload',admin_access:'Admin',totp_failed:'TOTP échoué',search:'Recherche',view_pdf:'PDF vu',play_audio:'Audio joué',download:'Téléchargement',error:'Erreur',auth_failed:'Auth échouée'};return l[t]||t}
function getLogClass(t){if(t.includes('login')||t.includes('auth'))return'log-auth';if(t.includes('course'))return'log-course';if(t.includes('note'))return'log-note';if(t.includes('upload')||t.includes('download')||t.includes('file'))return'log-file';if(t.includes('admin')||t.includes('totp'))return'log-admin';if(t.includes('error'))return'log-error';if(t.includes('view')||t.includes('play')||t.includes('search'))return'log-view';return'log-default'}
function renderLogsPagination(){const c=document.getElementById('logsPagination');if(logsTotalPages<=1){c.innerHTML='';return}let h='';for(let i=0;i<logsTotalPages;i++)h+=`<button class="page-btn${i===logsPage?' active':''}" onclick="loadLogs(${i})">${i+1}</button>`;c.innerHTML=h}
function clearLogFilters(){document.getElementById('logType').value='';document.getElementById('logStartDate').value='';document.getElementById('logEndDate').value='';loadLogs(0)}

function switchTab(tab){
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
    const btn=document.querySelector(`[onclick="switchTab('${tab}')"]`);if(btn)btn.classList.add('active');
    const el=document.getElementById(tab);if(el){el.classList.add('active');anime({targets:el,opacity:[0,1],translateY:[20,0],duration:400,easing:'easeOutCubic'})}
    if(tab==='visits'){loadVisits();const now=new Date();document.getElementById('chartMonth').value=now.getMonth()+1;document.getElementById('chartYear').value=now.getFullYear();loadMonthlyVisits()}
    if(tab==='logs')loadLogs(0);
}
document.addEventListener('DOMContentLoaded',()=>{
    const sqlInput=document.getElementById('sqlQuery');if(sqlInput)sqlInput.addEventListener('input',()=>{if(sqlInput.value.trim()===''){document.getElementById('sqlResult').innerHTML='';document.getElementById('sqlError').style.display='none'}});
    anime({targets:'.tab-content.active',opacity:[0,1],translateY:[20,0],duration:500,easing:'easeOutCubic'})
});
loadAll();