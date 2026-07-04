let currentUser=null,currentProfile=null;
function msg(id,text,ok=true){const e=document.getElementById(id);if(!e)return;e.textContent=text||'';e.style.color=ok?'#187a2f':'#b00020'}


let rankRatesCache = [];

async function loadRankRates(){
  const { data, error } = await supabaseClient
    .from('stopnie_stawki')
    .select('*')
    .order('kolejnosc', { ascending:true });

  rankRatesCache = data || [];

  const newRank = document.getElementById('newOfficerRank');
  if(newRank){
    const selected = newRank.value;
    newRank.innerHTML = '<option value="">Wybierz stopień</option>' + rankRatesCache.map(r => 
      `<option value="${r.stopien}" data-rate="${r.stawka}">${r.stopien} — ${r.stawka} zł</option>`
    ).join('');
    newRank.value = selected;
  }

  document.querySelectorAll('.profile-rank-select').forEach(select => {
    const selected = select.value;
    select.innerHTML = '<option value="">Wybierz stopień</option>' + rankRatesCache.map(r =>
      `<option value="${r.stopien}" data-rate="${r.stawka}">${r.stopien} — ${r.stawka} zł</option>`
    ).join('');
    select.value = selected;
  });

  const box = document.getElementById('rankRatesList');
  if(box){
    if(error){
      box.innerHTML = `<div class="empty">${error.message}</div>`;
    }else{
      box.innerHTML = rankRatesCache.map(r => `
        <div class="list-item rank-rate-row">
          <h4>${r.stopien}</h4>
          <div class="grid-4">
            <input id="rank_rate_${r.id}" type="number" value="${r.stawka || 0}">
            <input id="rank_order_${r.id}" type="number" value="${r.kolejnosc || 0}">
            <button class="btn-primary" onclick="saveRankRate(${r.id})">Zapisz</button>
          </div>
        </div>
      `).join('');
    }
  }
}

function getRateForRank(rank){
  const found = rankRatesCache.find(r => r.stopien === rank);
  return Number(found?.stawka || 0);
}

function applyRankRateToNewOfficer(){
  const rank = document.getElementById('newOfficerRank')?.value || '';
  const rate = getRateForRank(rank);
  const msgBox = document.getElementById('newOfficerMsg');
  if(msgBox && rate) {
    msgBox.textContent = `Wybrany stopień: ${rank} | stawka: ${rate} zł`;
    msgBox.style.color = '#187a2f';
  }
}

function applyRankRateToProfile(id){
  // Stawka jest przypisana automatycznie do stopnia przy zapisie profilu.
}

async function saveRankRate(id){
  if(!isCommander()) return alert('Brak uprawnień.');
  const stawka = Number(document.getElementById(`rank_rate_${id}`).value || 0);
  const kolejnosc = Number(document.getElementById(`rank_order_${id}`).value || 0);
  const { error } = await supabaseClient
    .from('stopnie_stawki')
    .update({ stawka, kolejnosc })
    .eq('id', id);
  if(error) return alert(error.message);
  await loadRankRates();
  alert('Zapisano stawkę.');
}

function slugifyName(name){
  return String(name||'').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/ł/g,'l').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function generatePin(){ return String(Math.floor(1000 + Math.random() * 9000)); }
function officerDisplay(profile){
  const email = profile?.email || '';
  const name = (profile?.imie_nazwisko || '').trim();
  const rank = (profile?.stopien || '').trim();
  if(name && name !== email) return `${rank} ${name}`.trim();
  return 'Uzupełnij dane funkcjonariusza';
}
async function enterProfileApp(profile){
  currentProfile = profile;
  currentUser = { id: profile.id, email: profile.email || profile.login_name || profile.imie_nazwisko };
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('registerView')?.classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');
  document.querySelectorAll('.commander-only').forEach(e=>e.classList.add('hidden'));
  const display = officerDisplay(profile);
  document.getElementById('userInfo').textContent = `${display} | nr służbowy: ${profile.numer_sluzbowy || '-'} | login: ${profile.login_name || '-'}`;
  document.getElementById('rolePill').textContent = profile.rola || 'funkcjonariusz';
  document.getElementById('statRole').textContent = profile.rola || 'funkcjonariusz';
  if(isCommander()) document.querySelectorAll('.commander-only').forEach(e=>e.classList.remove('hidden'));
  await refreshAll();
  await logActivity('logowanie','Logowanie PIN do systemu');
}

async function init(){const {data}=await supabaseClient.auth.getSession();if(data.session)await enterApp(data.session.user);supabaseClient.auth.onAuthStateChange((_e,s)=>{if(s?.user)enterApp(s.user)})}
async function resolveLoginToEmail(login){if(login.includes('@'))return login;const n=login.trim().toLowerCase();const {data}=await supabaseClient.from('profile').select('email, imie_nazwisko').limit(500);const f=(data||[]).find(p=>String(p.imie_nazwisko||'').toLowerCase().replaceAll(' ','-')===n||String(p.imie_nazwisko||'').toLowerCase()===n);return f?.email||login}
function showRegisterView(){document.getElementById('loginView').classList.add('hidden');document.getElementById('registerView').classList.remove('hidden');msg('registerMsg','')}
function showLoginView(){document.getElementById('registerView').classList.add('hidden');document.getElementById('loginView').classList.remove('hidden');msg('loginMsg','')}
async function registerAccount(){const email=document.getElementById('registerEmail').value.trim(),pass=document.getElementById('registerPassword').value,pass2=document.getElementById('registerPassword2').value;if(!email)return msg('registerMsg','Wpisz e-mail.',false);if(pass.length<6)return msg('registerMsg','Hasło musi mieć minimum 6 znaków.',false);if(pass!==pass2)return msg('registerMsg','Hasła nie są takie same.',false);const {data,error}=await supabaseClient.auth.signUp({email,password:pass});if(error)return msg('registerMsg',error.message,false);if(data?.user){await supabaseClient.from('profile').upsert({id:data.user.id,email,stopien:'',imie_nazwisko:email,numer_sluzbowy:'',rola:'funkcjonariusz'},{onConflict:'id'})}msg('registerMsg','Konto utworzone. Możesz się zalogować.',true);setTimeout(()=>{showLoginView();document.getElementById('loginEmail').value=email},1200)}
async function login(){const raw=document.getElementById('loginEmail').value.trim(),email=await resolveLoginToEmail(raw),password=document.getElementById('loginPassword').value;const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)return msg('loginMsg',error.message,false);await enterApp(data.user);await logActivity('logowanie','Użytkownik zalogował się do systemu')}
async function logout(){await logActivity('wylogowanie','Użytkownik wylogował się z systemu');await supabaseClient.auth.signOut();location.reload()}
async function enterApp(user){currentUser=user;document.getElementById('loginView').classList.add('hidden');document.getElementById('registerView').classList.add('hidden');document.getElementById('appView').classList.remove('hidden');let {data:profile}=await supabaseClient.from('profile').select('*').eq('id',user.id).maybeSingle();if(!profile){const byEmail=await supabaseClient.from('profile').select('*').eq('email',user.email).maybeSingle();profile=byEmail.data;if(profile&&profile.id!==user.id){await supabaseClient.from('profile').update({id:user.id}).eq('email',user.email);profile.id=user.id}}if(!profile){const p={id:user.id,email:user.email,stopien:'',imie_nazwisko:user.email,numer_sluzbowy:'',rola:'funkcjonariusz'};const {data:c}=await supabaseClient.from('profile').insert(p).select().single();profile=c||p}currentProfile=profile;document.querySelectorAll('.commander-only').forEach(e=>e.classList.add('hidden'));const display=officerDisplay(profile);document.getElementById('userInfo').textContent=`${display} | nr służbowy: ${profile.numer_sluzbowy || '-'} | login: ${profile.login_name || '-'}`;document.getElementById('rolePill').textContent=profile.rola||'funkcjonariusz';document.getElementById('statRole').textContent=profile.rola||'funkcjonariusz';if(isCommander())document.querySelectorAll('.commander-only').forEach(e=>e.classList.remove('hidden'));await refreshAll()}
function isCommander(){return ['admin','dowodca','zastepca'].includes(currentProfile?.rola)}
async function logActivity(akcja,opis){try{if(!currentProfile)return;await supabaseClient.from('aktywnosc').insert({uzytkownik:currentProfile.imie_nazwisko||currentProfile.email,rola:currentProfile.rola,akcja,opis})}catch(e){}}
async function refreshAll(){await loadPojazdySystem();await policeDocLoadMine();await loadRankRates();if(isCommander()){await loadProfiles();await loadArchive();await loadActivity();await loadTrash();await loadSettings()}updateStats()}
function refreshCurrentPage(){const id=[...document.querySelectorAll('.page')].find(p=>!p.classList.contains('hidden'))?.id;if(id==='vehicles')loadPojazdySystem();else if(id==='documents')policeDocLoadMine();else if(id==='hours')loadHoursModule();else if(id==='users')loadProfiles();else if(id==='archive')loadArchive();else if(id==='activity')loadActivity();else if(id==='trash')loadTrash();else if(id==='settings'){loadSettings();loadRankRates();}else refreshAll()}
function showPage(id,btn){document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));document.getElementById(id).classList.remove('hidden');document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));if(btn)btn.classList.add('active');const t={dashboard:'Pulpit',vehicles:'Pojazdy',documents:'Dokumenty',hours:'Godziny służby',users:'Funkcjonariusze',archive:'Archiwum',activity:'Aktywność',trash:'Kosz',settings:'Ustawienia'};document.getElementById('pageTitle').textContent=t[id]||'SWD';refreshCurrentPage()}
function quickPage(id){const btn=[...document.querySelectorAll('.nav')].find(b=>b.getAttribute('onclick')?.includes(`'${id}'`));showPage(id,btn)}
async function loadProfiles(){const {data,error}=await supabaseClient.from('profile').select('*').order('created_at',{ascending:false});const box=document.getElementById('profilesList');if(!box)return;if(error){box.innerHTML=`<div class="empty">${error.message}</div>`;return}box.innerHTML=(data||[]).map(p=>`<div class="list-item"><h4>${p.stopien||''} ${p.imie_nazwisko||p.email}</h4><p>Email: ${p.email||''}</p><p>Nr służbowy: ${p.numer_sluzbowy||''}</p><p>Rola: <b>${p.rola||'funkcjonariusz'}</b></p></div>`).join('')||'<div class="empty">Brak funkcjonariuszy.</div>'}
async function loadArchive(){const {data,error}=await supabaseClient.from('dokumenty').select('*').is('deleted_at',null).order('created_at',{ascending:false}).limit(300);const box=document.getElementById('archiveList');if(!box)return;if(error){box.innerHTML=error.message;return}const q=(document.getElementById('archiveSearch')?.value||'').toLowerCase();box.innerHTML=(data||[]).filter(d=>`${d.numer_dokumentu||''} ${d.tytul||''} ${d.funkcjonariusz||''} ${d.status||''}`.toLowerCase().includes(q)).map(d=>`<div class="list-item"><span class="status ${d.status}">${d.status||''}</span><h4>${d.numer_dokumentu||''} ${d.tytul||''}</h4><p>${d.funkcjonariusz||''}</p></div>`).join('')||'<div class="empty">Brak wyników.</div>'}
async function loadActivity(){const {data,error}=await supabaseClient.from('aktywnosc').select('*').order('created_at',{ascending:false}).limit(100);const box=document.getElementById('activityList');if(!box)return;if(error){box.innerHTML=error.message;return}box.innerHTML=(data||[]).map(a=>`<div class="list-item"><h4>${a.akcja||''}</h4><p>${a.opis||''}</p><p class="small">${a.uzytkownik||''} | ${a.rola||''} | ${(a.created_at||'').slice(0,16).replace('T',' ')}</p></div>`).join('')||'<div class="empty">Brak aktywności.</div>'}
async function loadTrash(){const {data,error}=await supabaseClient.from('dokumenty').select('*').not('deleted_at','is',null).order('deleted_at',{ascending:false}).limit(100);const box=document.getElementById('trashList');if(!box)return;if(error){box.innerHTML=error.message;return}box.innerHTML=(data||[]).map(d=>`<div class="list-item"><span class="status usuniety">kosz</span><h4>${d.numer_dokumentu||''} ${d.tytul||''}</h4><p>Usunięto: ${(d.deleted_at||'').slice(0,16).replace('T',' ')} przez ${d.deleted_by||''}</p></div>`).join('')||'<div class="empty">Kosz pusty.</div>'}
async function loadSettings(){const {data}=await supabaseClient.from('numeracja_dokumentow').select('*').order('typ');const box=document.getElementById('numberingSettings');if(box)box.innerHTML=(data||[]).map(n=>`<div class="list-item"><h4>${n.typ}</h4><p>Prefix: <b>${n.prefix}</b> | Rok: ${n.rok} | Ostatni numer: ${n.ostatni_numer}</p></div>`).join('')}
function updateStats(){document.getElementById('statVehicles').textContent=(window.pojazdyLista||[]).length||0;document.getElementById('statPatrol').textContent=(window.aktywneKartyPojazdow||[]).length||0;document.getElementById('statDocs').textContent=document.querySelectorAll('#myDocsList .list-item').length||0}


/* =========================================================
   SWD 2.1 MASTER OVERRIDES
   Logowanie PIN, konta dowódcy, stopnie, godziny, sesja.
========================================================= */

function swdMsg(id,text,ok=true){
  const e=document.getElementById(id);
  if(!e)return;
  e.textContent=text||'';
  e.style.color=ok?'#187a2f':'#b00020';
}
function swdText(id){return document.getElementById(id)?.value?.trim()||''}
function slugifyName(name){
  return String(name||'').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/ł/g,'l')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}
function generatePin(){return String(Math.floor(1000+Math.random()*9000))}
function officerDisplay(profile){
  const email=profile?.email||'';
  const name=(profile?.imie_nazwisko||'').trim();
  const rank=(profile?.stopien||'').trim();
  if(name && name!==email) return `${rank} ${name}`.trim();
  return 'Uzupełnij dane funkcjonariusza';
}

let rankRatesCache = [];

async function loadRankRates(){
  const {data,error}=await supabaseClient.from('stopnie_stawki').select('*').order('kolejnosc',{ascending:true});
  if(error){console.error(error);return}
  rankRatesCache=data||[];

  const newRank=document.getElementById('newOfficerRank');
  if(newRank){
    const selected=newRank.value;
    newRank.innerHTML='<option value="">Wybierz stopień</option>'+rankRatesCache.map(r=>`<option value="${r.stopien}" data-rate="${r.stawka}">${r.stopien} — ${r.stawka} zł</option>`).join('');
    if(selected)newRank.value=selected;
  }

  document.querySelectorAll('.profile-rank-select').forEach(sel=>{
    const selected=sel.value;
    sel.innerHTML='<option value="">Wybierz stopień</option>'+rankRatesCache.map(r=>`<option value="${r.stopien}" data-rate="${r.stawka}">${r.stopien} — ${r.stawka} zł</option>`).join('');
    if(selected)sel.value=selected;
  });

  const box=document.getElementById('rankRatesList');
  if(box){
    box.innerHTML=rankRatesCache.map(r=>`
      <div class="list-item rank-rate-row">
        <h4>${r.stopien}</h4>
        <div class="grid-4">
          <input id="rank_rate_${r.id}" type="number" value="${r.stawka||0}">
          <input id="rank_order_${r.id}" type="number" value="${r.kolejnosc||0}">
          <button class="btn-primary" onclick="saveRankRate(${r.id})">Zapisz</button>
        </div>
      </div>
    `).join('');
  }
}
function getRateForRank(rank){
  const found=(rankRatesCache||[]).find(r=>r.stopien===rank);
  return Number(found?.stawka||0);
}
function applyRankRateToNewOfficer(){
  const rank=swdText('newOfficerRank');
  const rate=getRateForRank(rank);
  swdMsg('newOfficerMsg',rank?`Wybrany stopień: ${rank} | stawka: ${rate} zł`:'',true);
}
function applyRankRateToProfile(id){}
async function saveRankRate(id){
  if(!isCommander())return alert('Brak uprawnień.');
  const stawka=Number(document.getElementById(`rank_rate_${id}`).value||0);
  const kolejnosc=Number(document.getElementById(`rank_order_${id}`).value||0);
  const {error}=await supabaseClient.from('stopnie_stawki').update({stawka,kolejnosc}).eq('id',id);
  if(error)return alert(error.message);
  await loadRankRates();
  alert('Zapisano stawkę.');
}

async function enterProfileApp(profile){
  currentProfile=profile;
  currentUser={id:profile.id,email:profile.email||profile.login_name||profile.imie_nazwisko};
  localStorage.setItem('swd_pin_session',JSON.stringify({id:profile.id,pin:profile.pin_code}));

  document.getElementById('loginView')?.classList.add('hidden');
  document.getElementById('registerView')?.classList.add('hidden');
  document.getElementById('appView')?.classList.remove('hidden');
  document.querySelectorAll('.commander-only').forEach(e=>e.classList.add('hidden'));

  const display=officerDisplay(profile);
  const ui=document.getElementById('userInfo');
  if(ui)ui.textContent=`${display} | nr służbowy: ${profile.numer_sluzbowy||'-'} | login: ${profile.login_name||'-'}`;
  const rp=document.getElementById('rolePill'); if(rp)rp.textContent=profile.rola||'funkcjonariusz';
  const sr=document.getElementById('statRole'); if(sr)sr.textContent=profile.rola||'funkcjonariusz';

  if(isCommander())document.querySelectorAll('.commander-only').forEach(e=>e.classList.remove('hidden'));
  await refreshAll();
  await logActivity('logowanie','Logowanie PIN do systemu');
}
async function restorePinSession(){
  try{
    const saved=JSON.parse(localStorage.getItem('swd_pin_session')||'null');
    if(!saved?.id||!saved?.pin)return false;
    const {data,error}=await supabaseClient.from('profile').select('*').eq('id',saved.id).maybeSingle();
    if(error||!data){localStorage.removeItem('swd_pin_session');return false}
    if(String(data.pin_code||'')!==String(saved.pin)){localStorage.removeItem('swd_pin_session');return false}
    await enterProfileApp(data);
    return true;
  }catch(e){console.error(e);localStorage.removeItem('swd_pin_session');return false}
}
async function init(){
  const restored=await restorePinSession();
  if(restored)return;
  const {data}=await supabaseClient.auth.getSession();
  if(data.session)await enterApp(data.session.user);
  supabaseClient.auth.onAuthStateChange((_e,s)=>{if(s?.user)enterApp(s.user)});
}
async function login(){
  const raw=swdText('loginEmail');
  const password=swdText('loginPassword');
  if(!raw||!password)return msg('loginMsg','Wpisz login i PIN.',false);

  const loginKey=slugifyName(raw);
  const {data:profileByLogin,error:loginErr}=await supabaseClient.from('profile').select('*').eq('login_name',loginKey).maybeSingle();
  if(loginErr){console.error(loginErr);return msg('loginMsg',loginErr.message,false)}
  if(profileByLogin){
    if(String(profileByLogin.pin_code||'')===String(password))return await enterProfileApp(profileByLogin);
    return msg('loginMsg','Nieprawidłowy PIN.',false);
  }

  const nameSearch=raw.replaceAll('-',' ');
  const {data:profileByName}=await supabaseClient.from('profile').select('*').ilike('imie_nazwisko',nameSearch).maybeSingle();
  if(profileByName){
    if(String(profileByName.pin_code||'')===String(password))return await enterProfileApp(profileByName);
    return msg('loginMsg','Nieprawidłowy PIN.',false);
  }

  if(raw.includes('@')){
    const {data,error}=await supabaseClient.auth.signInWithPassword({email:raw,password});
    if(error)return msg('loginMsg','Nieprawidłowy email lub hasło.',false);
    await enterApp(data.user);
    await logActivity('logowanie','Użytkownik zalogował się do systemu');
    return;
  }
  return msg('loginMsg','Nie znaleziono konta o takim loginie.',false);
}
async function logout(){
  localStorage.removeItem('swd_pin_session');
  try{await logActivity('wylogowanie','Użytkownik wylogował się z systemu')}catch(e){}
  try{await supabaseClient.auth.signOut()}catch(e){}
  location.reload();
}

async function createOfficerAccount(){
  try{
    if(!isCommander())return alert('Brak uprawnień.');
    await loadRankRates();
    const name=swdText('newOfficerName');
    const rank=swdText('newOfficerRank');
    const badge=swdText('newOfficerBadge');
    const role=document.getElementById('newOfficerRole')?.value||'funkcjonariusz';
    if(!name)return swdMsg('newOfficerMsg','Wpisz imię i nazwisko.',false);
    if(!rank)return swdMsg('newOfficerMsg','Wybierz stopień.',false);

    const loginBase=slugifyName(name);
    let login=loginBase;
    let email=`${login}@swd.local`;
    const pin=generatePin();
    const rate=getRateForRank(rank);

    const {data:existing}=await supabaseClient.from('profile').select('login_name').eq('login_name',login).maybeSingle();
    if(existing){
      login=`${loginBase}-${Math.floor(100+Math.random()*900)}`;
      email=`${login}@swd.local`;
    }

    const row={
      id:crypto.randomUUID(),
      email,
      login_name:login,
      pin_code:pin,
      stopien:rank,
      imie_nazwisko:name,
      numer_sluzbowy:badge,
      rola:role,
      stawka_godzinowa:rate,
      godziny_reset_at:new Date(0).toISOString()
    };
    const {error}=await supabaseClient.from('profile').insert(row);
    if(error){console.error(error);return swdMsg('newOfficerMsg',error.message,false)}
    swdMsg('newOfficerMsg',`Konto utworzone. Login: ${login} | PIN: ${pin}`,true);
    ['newOfficerName','newOfficerBadge'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
    const r=document.getElementById('newOfficerRank'); if(r)r.value='';
    const roleEl=document.getElementById('newOfficerRole'); if(roleEl)roleEl.value='funkcjonariusz';
    await loadProfiles();
  }catch(err){console.error(err);swdMsg('newOfficerMsg',err.message||String(err),false)}
}
async function loadProfiles(){
  const {data,error}=await supabaseClient.from('profile').select('*').order('created_at',{ascending:false});
  const box=document.getElementById('profilesList');
  if(!box)return;
  if(error){box.innerHTML=`<div class="empty">${error.message}</div>`;return}
  await loadRankRates();
  box.innerHTML=(data||[]).map(p=>`
    <div class="list-item">
      <h4>${p.stopien||''} ${p.imie_nazwisko||p.login_name||p.email}</h4>
      <p><b>Login:</b> ${p.login_name||'-'} | <b>PIN:</b> ${p.pin_code||'-'}</p>
      <p><b>Stawka ze stopnia:</b> ${p.stawka_godzinowa||getRateForRank(p.stopien)||0} zł</p>
      <div class="grid-4">
        <input id="prof_name_${p.id}" value="${String(p.imie_nazwisko||'').replaceAll('"','&quot;')}" placeholder="Imię i nazwisko">
        <select class="profile-rank-select" id="prof_rank_${p.id}" onchange="applyRankRateToProfile('${p.id}')">
          <option value="${p.stopien||''}">${p.stopien||'Wybierz stopień'}</option>
        </select>
        <input id="prof_badge_${p.id}" value="${String(p.numer_sluzbowy||'').replaceAll('"','&quot;')}" placeholder="Numer służbowy">
        <select id="prof_role_${p.id}">
          <option value="funkcjonariusz" ${p.rola==='funkcjonariusz'?'selected':''}>funkcjonariusz</option>
          <option value="zastepca" ${p.rola==='zastepca'?'selected':''}>zastepca</option>
          <option value="dowodca" ${p.rola==='dowodca'?'selected':''}>dowodca</option>
          <option value="admin" ${p.rola==='admin'?'selected':''}>admin</option>
        </select>
      </div>
      <div class="action-row">
        <button class="btn-primary" onclick="saveOfficerProfile('${p.id}')">Zapisz zmiany</button>
        <button class="btn-light" onclick="regenerateOfficerPin('${p.id}')">Nowy PIN</button>
        <button class="btn-danger" onclick="deleteOfficerProfile('${p.id}')">Usuń konto</button>
      </div>
    </div>`).join('')||'<div class="empty">Brak funkcjonariuszy.</div>';
  await loadRankRates();
}
async function saveOfficerProfile(id){
  if(!isCommander())return alert('Brak uprawnień.');
  const name=swdText(`prof_name_${id}`);
  const rank=document.getElementById(`prof_rank_${id}`)?.value||'';
  const login=slugifyName(name);
  const patch={
    imie_nazwisko:name,
    login_name:login,
    email:`${login}@swd.local`,
    stopien:rank,
    numer_sluzbowy:swdText(`prof_badge_${id}`),
    stawka_godzinowa:Number(getRateForRank(rank)||0),
    rola:document.getElementById(`prof_role_${id}`)?.value||'funkcjonariusz'
  };
  const {error}=await supabaseClient.from('profile').update(patch).eq('id',id);
  if(error)return alert(error.message);
  await loadProfiles();
  alert('Zapisano zmiany.');
}
async function regenerateOfficerPin(id){
  if(!isCommander())return alert('Brak uprawnień.');
  const pin=generatePin();
  const {error}=await supabaseClient.from('profile').update({pin_code:pin}).eq('id',id);
  if(error)return alert(error.message);
  await loadProfiles();
  alert(`Nowy PIN: ${pin}`);
}
async function deleteOfficerProfile(id){
  if(!isCommander())return alert('Brak uprawnień.');
  if(!confirm('Na pewno usunąć konto funkcjonariusza?'))return;
  await supabaseClient.from('sluzby').delete().eq('funkcjonariusz_id',id);
  const {error}=await supabaseClient.from('profile').delete().eq('id',id);
  if(error)return alert(error.message);
  await loadProfiles();
}

async function refreshAll(){
  await loadRankRates();
  await loadPojazdySystem();
  await policeDocLoadMine();
  if(typeof loadHoursModule==='function')await loadHoursModule();
  if(isCommander()){
    await loadProfiles();
    await loadArchive();
    await loadActivity();
    await loadTrash();
    await loadSettings();
  }
  updateStats();
}
function refreshCurrentPage(){
  const id=[...document.querySelectorAll('.page')].find(p=>!p.classList.contains('hidden'))?.id;
  if(id==='vehicles')loadPojazdySystem();
  else if(id==='documents')policeDocLoadMine();
  else if(id==='hours')loadHoursModule();
  else if(id==='users')loadProfiles();
  else if(id==='archive')loadArchive();
  else if(id==='activity')loadActivity();
  else if(id==='trash')loadTrash();
  else if(id==='settings'){loadSettings();loadRankRates();}
  else refreshAll();
}
function showPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
  document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const t={dashboard:'Pulpit',vehicles:'Pojazdy',documents:'Dokumenty',hours:'Godziny służby',users:'Funkcjonariusze',archive:'Archiwum',activity:'Aktywność',trash:'Kosz',settings:'Ustawienia'};
  const pt=document.getElementById('pageTitle'); if(pt)pt.textContent=t[id]||'SWD';
  refreshCurrentPage();
}


/* SWD 2.2 - własny podpis funkcjonariusza */
async function createOfficerAccount(){
  try{
    if(!isCommander())return alert('Brak uprawnień.');
    await loadRankRates();
    const name=swdText('newOfficerName');
    const rank=swdText('newOfficerRank');
    const badge=swdText('newOfficerBadge');
    const signature=swdText('newOfficerSignature') || name;
    const role=document.getElementById('newOfficerRole')?.value||'funkcjonariusz';
    if(!name)return swdMsg('newOfficerMsg','Wpisz imię i nazwisko.',false);
    if(!rank)return swdMsg('newOfficerMsg','Wybierz stopień.',false);
    const loginBase=slugifyName(name);
    let login=loginBase, email=`${login}@swd.local`;
    const pin=generatePin();
    const rate=getRateForRank(rank);
    const {data:existing}=await supabaseClient.from('profile').select('login_name').eq('login_name',login).maybeSingle();
    if(existing){login=`${loginBase}-${Math.floor(100+Math.random()*900)}`;email=`${login}@swd.local`;}
    const row={id:crypto.randomUUID(),email,login_name:login,pin_code:pin,stopien:rank,imie_nazwisko:name,numer_sluzbowy:badge,podpis:signature,rola:role,stawka_godzinowa:rate,godziny_reset_at:new Date(0).toISOString()};
    const {error}=await supabaseClient.from('profile').insert(row);
    if(error){console.error(error);return swdMsg('newOfficerMsg',error.message,false)}
    swdMsg('newOfficerMsg',`Konto utworzone. Login: ${login} | PIN: ${pin}`,true);
    ['newOfficerName','newOfficerBadge','newOfficerSignature'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
    const r=document.getElementById('newOfficerRank'); if(r)r.value='';
    const roleEl=document.getElementById('newOfficerRole'); if(roleEl)roleEl.value='funkcjonariusz';
    await loadProfiles();
  }catch(err){console.error(err);swdMsg('newOfficerMsg',err.message||String(err),false)}
}
async function loadProfiles(){
  const {data,error}=await supabaseClient.from('profile').select('*').order('created_at',{ascending:false});
  const box=document.getElementById('profilesList');
  if(!box)return;
  if(error){box.innerHTML=`<div class="empty">${error.message}</div>`;return}
  await loadRankRates();
  box.innerHTML=(data||[]).map(p=>`
    <div class="list-item">
      <h4>${p.stopien||''} ${p.imie_nazwisko||p.login_name||p.email}</h4>
      <p><b>Login:</b> ${p.login_name||'-'} | <b>PIN:</b> ${p.pin_code||'-'}</p>
      <p><b>Stawka ze stopnia:</b> ${p.stawka_godzinowa||getRateForRank(p.stopien)||0} zł</p>
      <p><b>Podpis:</b> <span class="swd-profile-sign-preview">${p.podpis || p.imie_nazwisko || '-'}</span></p>
      <div class="grid-4">
        <input id="prof_name_${p.id}" value="${String(p.imie_nazwisko||'').replaceAll('"','&quot;')}" placeholder="Imię i nazwisko">
        <select class="profile-rank-select" id="prof_rank_${p.id}" onchange="applyRankRateToProfile('${p.id}')">
          <option value="${p.stopien||''}">${p.stopien||'Wybierz stopień'}</option>
        </select>
        <input id="prof_badge_${p.id}" value="${String(p.numer_sluzbowy||'').replaceAll('"','&quot;')}" placeholder="Numer służbowy">
        <input id="prof_signature_${p.id}" value="${String(p.podpis||p.imie_nazwisko||'').replaceAll('"','&quot;')}" placeholder="Podpis na dokumentach">
        <select id="prof_role_${p.id}">
          <option value="funkcjonariusz" ${p.rola==='funkcjonariusz'?'selected':''}>funkcjonariusz</option>
          <option value="zastepca" ${p.rola==='zastepca'?'selected':''}>zastepca</option>
          <option value="dowodca" ${p.rola==='dowodca'?'selected':''}>dowodca</option>
          <option value="admin" ${p.rola==='admin'?'selected':''}>admin</option>
        </select>
      </div>
      <div class="action-row">
        <button class="btn-primary" onclick="saveOfficerProfile('${p.id}')">Zapisz zmiany</button>
        <button class="btn-light" onclick="regenerateOfficerPin('${p.id}')">Nowy PIN</button>
        <button class="btn-danger" onclick="deleteOfficerProfile('${p.id}')">Usuń konto</button>
      </div>
    </div>`).join('')||'<div class="empty">Brak funkcjonariuszy.</div>';
  await loadRankRates();
}
async function saveOfficerProfile(id){
  if(!isCommander())return alert('Brak uprawnień.');
  const name=swdText(`prof_name_${id}`);
  const rank=document.getElementById(`prof_rank_${id}`)?.value||'';
  const login=slugifyName(name);
  const patch={imie_nazwisko:name,login_name:login,email:`${login}@swd.local`,stopien:rank,numer_sluzbowy:swdText(`prof_badge_${id}`),podpis:swdText(`prof_signature_${id}`)||name,stawka_godzinowa:Number(getRateForRank(rank)||0),rola:document.getElementById(`prof_role_${id}`)?.value||'funkcjonariusz'};
  const {error}=await supabaseClient.from('profile').update(patch).eq('id',id);
  if(error)return alert(error.message);
  await loadProfiles();
  alert('Zapisano zmiany.');
}
init();
