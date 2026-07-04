/* SWD v4.1 - Karty funkcjonariuszy */

function ocEsc(v){
  return String(v ?? '').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
}
function ocToday(){ return new Date().toISOString().slice(0,10); }
function ocCanManage(){ return ['admin','dowodca','zastepca'].includes(currentProfile?.rola); }

async function loadOfficerCards(){
  const box=document.getElementById('officerCardsList');
  if(!box || !currentProfile)return;

  const today=ocToday();

  let profilesQuery=supabaseClient.from('profile').select('*').order('imie_nazwisko',{ascending:true});
  if(!ocCanManage()){
    profilesQuery=profilesQuery.eq('id',currentProfile.id);
  }

  const [profilesRes, activeRes, leavesRes] = await Promise.all([
    profilesQuery,
    supabaseClient.from('sluzby').select('*').is('zakonczenie',null),
    supabaseClient.from('urlopy').select('*').eq('status','zaakceptowany').lte('data_od',today).gte('data_do',today)
  ]);

  if(profilesRes.error){
    box.innerHTML=`<div class="empty">${ocEsc(profilesRes.error.message)}</div>`;
    return;
  }

  const active=activeRes.data || [];
  const leaves=leavesRes.data || [];
  const profiles=profilesRes.data || [];

  box.innerHTML=profiles.map(p=>{
    const service=active.find(s=>String(s.funkcjonariusz_id)===String(p.id));
    const leave=leaves.find(l=>String(l.funkcjonariusz_id)===String(p.id));
    const status=leave?'Urlop':(service?'W służbie':'Poza służbą');
    const statusClass=leave?'leave':(service?'active':'off');

    return `<div class="officer-card">
      <div class="officer-card-head">
        <div>
          <h4>${ocEsc(p.stopien||'')} ${ocEsc(p.imie_nazwisko||p.login_name||p.email||'-')}</h4>
          <p>Nr służbowy: <b>${ocEsc(p.numer_sluzbowy||'-')}</b></p>
        </div>
        <span class="officer-status ${statusClass}">${status}</span>
      </div>

      <div class="officer-data-grid">
        <div><small>Data przyjęcia</small><b>${ocEsc(p.data_przyjecia||'-')}</b></div>
        <div><small>Numer konta</small><b>${ocEsc(p.numer_konta||'-')}</b></div>
        <div><small>Login</small><b>${ocEsc(p.login_name||'-')}</b></div>
        <div><small>Rola</small><b>${ocEsc(p.rola||'funkcjonariusz')}</b></div>
      </div>

      ${service?`<div class="officer-note">🟢 Służba rozpoczęta o <b>${ocEsc(service.rozpoczecie||'-')}</b></div>`:''}
      ${leave?`<div class="officer-note">🏖️ Urlop: <b>${ocEsc(leave.data_od)} - ${ocEsc(leave.data_do)}</b> (${ocEsc(leave.typ||'')})</div>`:''}

      ${ocCanManage()?`
        <div class="officer-edit-box">
          <div class="grid-4">
            <input id="oc_date_${p.id}" type="date" value="${ocEsc(p.data_przyjecia||'')}">
            <input id="oc_bank_${p.id}" value="${ocEsc(p.numer_konta||'')}" placeholder="Numer konta bankowego">
            <button class="btn-primary" onclick="saveOfficerCardData('${p.id}')">Zapisz kartę</button>
          </div>
        </div>
      `:''}
    </div>`;
  }).join('') || '<div class="empty">Brak funkcjonariuszy.</div>';
}

async function saveOfficerCardData(id){
  if(!ocCanManage())return alert('Brak uprawnień.');
  const data_przyjecia=document.getElementById(`oc_date_${id}`)?.value || null;
  const numer_konta=document.getElementById(`oc_bank_${id}`)?.value || null;
  const {error}=await supabaseClient.from('profile').update({data_przyjecia,numer_konta}).eq('id',id);
  if(error)return alert(error.message);
  await loadOfficerCards();
  alert('Karta funkcjonariusza zapisana.');
}

if(typeof showPage === 'function' && !window._officerCardsShowPagePatched){
  window._officerCardsShowPagePatched=true;
  const oldShowPageCards=showPage;
  showPage=function(id,btn){
    oldShowPageCards(id,btn);
    if(id==='officerCards'){
      const title=document.getElementById('pageTitle');
      if(title)title.textContent='Karty funkcjonariuszy';
      loadOfficerCards();
    }
  }
}
