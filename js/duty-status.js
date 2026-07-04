/* SWD - Stan służby */
let dutyStatusCache = { officers: [], patrols: [], vehicles: [], leaves: [] };

function dutyEscape(v){
  return String(v ?? '').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
}
function dutyToday(){ return new Date().toISOString().slice(0,10); }
function dutyTimeFromIso(v){
  if(!v)return '-';
  if(String(v).includes('T'))return String(v).slice(11,16);
  return String(v).slice(0,5) || '-';
}

async function loadDutyStatus(){
  if(!window.supabaseClient)return;
  const today = dutyToday();

  const [servicesRes, patrolsRes, leavesRes] = await Promise.all([
    supabaseClient.from('sluzby').select('*').eq('status','aktywna').order('created_at',{ascending:false}),
    supabaseClient.from('karty_pojazdow').select('*').eq('aktywna',true).order('created_at',{ascending:false}),
    supabaseClient.from('urlopy').select('*').eq('status','zaakceptowany').lte('data_od',today).gte('data_do',today).order('created_at',{ascending:false})
  ]);

  dutyStatusCache.officers = servicesRes.data || [];
  dutyStatusCache.patrols = patrolsRes.data || [];
  dutyStatusCache.vehicles = patrolsRes.data || [];
  dutyStatusCache.leaves = leavesRes.data || [];

  setDutyText('dutyOfficersCount', dutyStatusCache.officers.length);
  setDutyText('dutyPatrolsCount', dutyStatusCache.patrols.length);
  setDutyText('dutyVehiclesCount', dutyStatusCache.vehicles.length);
  setDutyText('dutyLeavesCount', dutyStatusCache.leaves.length);

  renderDutyMiniList();
}
function setDutyText(id,value){ const el=document.getElementById(id); if(el)el.textContent=value; }

function renderDutyMiniList(){
  const box=document.getElementById('dutyOfficersMiniList');
  if(!box)return;
  const list=dutyStatusCache.officers.slice(0,8);
  box.innerHTML=list.map(s=>`
    <div class="duty-mini-row">
      <span class="duty-dot"></span>
      <b>${dutyEscape(s.stopien||'')} ${dutyEscape(s.funkcjonariusz||'-')}</b>
      <small>od ${dutyEscape(s.rozpoczecie || dutyTimeFromIso(s.start_at || s.created_at))}</small>
    </div>
  `).join('') || '<div class="empty">Brak funkcjonariuszy na służbie.</div>';
}

function openDutyModal(type){
  const titleMap={officers:'Funkcjonariusze na służbie',patrols:'Patrole aktywne',vehicles:'Pobrane pojazdy',leaves:'Funkcjonariusze na urlopie'};
  document.getElementById('dutyStatusModal')?.remove();
  document.body.insertAdjacentHTML('beforeend',`
    <div class="duty-modal-backdrop" id="dutyStatusModal">
      <div class="duty-modal">
        <div class="duty-modal-head">
          <h3>${titleMap[type] || 'Stan służby'}</h3>
          <button class="btn-light" onclick="closeDutyModal()">Zamknij</button>
        </div>
        ${renderDutyModalContent(type)}
      </div>
    </div>
  `);
}

function renderDutyModalContent(type){
  if(type==='officers'){
    const rows=dutyStatusCache.officers.map(s=>`
      <tr><td>${dutyEscape(s.funkcjonariusz||'-')}</td><td>${dutyEscape(s.stopien||'-')}</td><td>${dutyEscape(s.numer_sluzbowy||'-')}</td><td>${dutyEscape(s.rozpoczecie || dutyTimeFromIso(s.start_at || s.created_at))}</td><td>${dutyEscape(s.data_sluzby||'')}</td></tr>
    `).join('');
    return dutyTable(['Funkcjonariusz','Stopień','Numer','Od godziny','Data'], rows, 'Brak funkcjonariuszy na służbie.');
  }
  if(type==='patrols' || type==='vehicles'){
    const rows=dutyStatusCache.patrols.map(p=>`
      <tr><td>${dutyEscape(p.rozpoczecie_pobierajacy||p.created_by||'-')}</td><td>${dutyEscape(p.pojazd||'-')}</td><td>${dutyEscape(p.krypton||'-')}</td><td>${dutyEscape(p.numer_rejestracyjny||'-')}</td><td>${dutyEscape(p.rozpoczecie_godzina||'-')}</td></tr>
    `).join('');
    return dutyTable(['Funkcjonariusz','Pojazd','Kryptonim','Nr rej.','Od godziny'], rows, 'Brak aktywnych patroli.');
  }
  if(type==='leaves'){
    const rows=dutyStatusCache.leaves.map(l=>`
      <tr><td>${dutyEscape(l.funkcjonariusz||'-')}</td><td>${dutyEscape(l.stopien||'-')}</td><td>${dutyEscape(l.typ||'-')}</td><td>${dutyEscape(l.data_od||'-')}</td><td>${dutyEscape(l.data_do||'-')}</td></tr>
    `).join('');
    return dutyTable(['Funkcjonariusz','Stopień','Typ','Od','Do'], rows, 'Brak urlopów na dziś.');
  }
  return '<div class="empty">Brak danych.</div>';
}

function dutyTable(headers, rows, emptyText){
  return `<div class="duty-table-wrap"><table class="duty-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}">${emptyText}</td></tr>`}</tbody></table></div>`;
}
function closeDutyModal(){ document.getElementById('dutyStatusModal')?.remove(); }

if(!window._dutyStatusInterval){
  window._dutyStatusInterval=setInterval(()=>{
    if(document.getElementById('appView') && !document.getElementById('appView').classList.contains('hidden')){
      loadDutyStatus();
    }
  },30000);
}
if(typeof showPage === 'function' && !window._dutyStatusShowPagePatched){
  window._dutyStatusShowPagePatched=true;
  const oldShowPage=showPage;
  showPage=function(id,btn){
    oldShowPage(id,btn);
    if(id==='dashboard')loadDutyStatus();
  }
}
setTimeout(()=>loadDutyStatus(),1000);
