let currentUser = null;
let currentProfile = null;
let vehicleCache = [];
let documentCache = [];

function msg(id, text, ok=true){
  const el=document.getElementById(id);
  if(!el) return;
  el.textContent=text;
  el.style.color=ok?'#187a2f':'#b00020';
}

function today(){
  return new Date().toISOString().slice(0,10);
}

async function init(){
  setDefaultDates();

  const { data } = await supabaseClient.auth.getSession();
  if(data.session) await enterApp(data.session.user);

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if(session?.user) enterApp(session.user);
  });
}

function setDefaultDates(){
  const ids = ['docDate','r_data','z_data'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if(el && !el.value) el.value = today();
  });
}

async function resolveLoginToEmail(login){
  if(login.includes('@')) return login;
  const normalized = login.trim().toLowerCase();
  const { data } = await supabaseClient.from('profile').select('email, imie_nazwisko').limit(500);
  const found = (data || []).find(p =>
    String(p.imie_nazwisko || '').toLowerCase().replaceAll(' ', '-') === normalized ||
    String(p.imie_nazwisko || '').toLowerCase() === normalized
  );
  return found?.email || login;
}

async function logActivity(akcja, opis){
  if(!currentProfile) return;
  await supabaseClient.from('aktywnosc').insert({
    uzytkownik: currentProfile.imie_nazwisko || currentProfile.email,
    rola: currentProfile.rola,
    akcja,
    opis
  });
}

async function logHistory(tabela, rekord_id, akcja, opis, dane_przed=null, dane_po=null){
  if(!currentProfile) return;
  await supabaseClient.from('historia_zmian').insert({
    tabela,
    rekord_id,
    akcja,
    opis,
    uzytkownik: currentProfile.imie_nazwisko || currentProfile.email,
    rola: currentProfile.rola,
    dane_przed,
    dane_po
  });
}

async function generateDocumentNumber(type){
  const { data, error } = await supabaseClient.from('numeracja_dokumentow').select('*').eq('typ', type).single();
  if(error || !data) return `${type.toUpperCase()}/${new Date().getFullYear()}/${Date.now()}`;
  const year = new Date().getFullYear();
  const next = data.rok !== year ? 1 : (data.ostatni_numer || 0) + 1;
  await supabaseClient.from('numeracja_dokumentow').update({ ostatni_numer: next, rok: year }).eq('typ', type);
  return `${data.prefix}/${year}/${String(next).padStart(5,'0')}`;
}

async function login(){
  const rawLogin=document.getElementById('loginEmail').value.trim();
  const email=await resolveLoginToEmail(rawLogin);
  const password=document.getElementById('loginPassword').value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({email,password});
  if(error) return msg('loginMsg', error.message, false);
  await enterApp(data.user);
  await logActivity('logowanie','Użytkownik zalogował się do systemu');
}

async function logout(){
  await logActivity('wylogowanie','Użytkownik wylogował się z systemu');
  await supabaseClient.auth.signOut();
  location.reload();
}

async function enterApp(user){
  currentUser=user;
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');

  let { data: profile } = await supabaseClient.from('profile').select('*').eq('id', user.id).single();

  if(!profile){
    const insertProfile = {
      id:user.id,
      email:user.email,
      stopien:'',
      imie_nazwisko:user.email,
      numer_sluzbowy:'',
      rola:'funkcjonariusz'
    };
    await supabaseClient.from('profile').insert(insertProfile);
    profile=insertProfile;
  }

  currentProfile=profile;
  const displayName = `${profile.stopien || ''} ${profile.imie_nazwisko || user.email}`.trim();
  document.getElementById('userInfo').textContent = `${displayName} | ${profile.email || user.email}`;
  document.getElementById('rolePill').textContent = profile.rola || 'funkcjonariusz';
  document.getElementById('statRole').textContent = profile.rola || 'funkcjonariusz';
  document.getElementById('profileName').textContent = displayName;
  document.getElementById('profileDetails').textContent = `Nr służbowy: ${profile.numer_sluzbowy || '-'} | Wydział: ${profile.wydzial || '-'}`;

  document.getElementById('docOfficer').value = displayName;
  document.getElementById('docBadge').value = profile.numer_sluzbowy || '';
  document.getElementById('r_pobierajacy').value = profile.imie_nazwisko || '';
  document.getElementById('z_zdajacy').value = profile.imie_nazwisko || '';

  if(isCommander()){
    document.querySelectorAll('.commander-only').forEach(e=>e.classList.remove('hidden'));
  }

  await refreshAll();
}

function isCommander(){
  return ['admin','dowodca','zastepca','koordynator'].includes(currentProfile?.rola);
}

async function refreshAll(){
  await loadVehicleCards();
  await loadMyDocuments();
  if(isCommander()){
    await loadCommanderDocuments();
    await loadProfiles();
  }
  updateStats();
}

function refreshCurrentPage(){
  const activePage = [...document.querySelectorAll('.page')].find(p=>!p.classList.contains('hidden'))?.id;
  if(activePage === 'vehicles') loadVehicleCards();
  else if(activePage === 'documents') loadMyDocuments();
  else if(activePage === 'commanderDocs') loadCommanderDocuments();
  else if(activePage === 'users') loadProfiles();
  else if(activePage === 'activity') loadActivity();
  else if(activePage === 'trash') loadTrash();
  else if(activePage === 'archive') loadArchive();
  else if(activePage === 'settings') loadSettings();
  else refreshAll();
}

function showPage(id, btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const titles = {
    dashboard:'Pulpit',
    vehicles:'Pojazdy',
    documents:'Dokumenty',
    commanderDocs:'Panel dowódcy',
    users:'Funkcjonariusze', activity:'Aktywność', trash:'Kosz', archive:'Archiwum', settings:'Ustawienia'
  };
  document.getElementById('pageTitle').textContent=titles[id]||'SWD';
  if(id==='commanderDocs') loadCommanderDocuments();
  if(id==='users') loadProfiles();
  if(id==='activity') loadActivity();
  if(id==='trash') loadTrash();
  if(id==='archive') loadArchive();
  if(id==='settings') loadSettings();
}

function quickPage(id){
  const btn = [...document.querySelectorAll('.nav')].find(b => b.getAttribute('onclick')?.includes(`'${id}'`));
  showPage(id, btn);
}

async function saveVehicleCard(e){
  e.preventDefault();
  const row = {
    created_by: currentProfile?.imie_nazwisko || currentUser.email,
    status: document.getElementById('z_przebieg').value ? 'Zakończony' : 'W patrolu',
    pojazd: val('v_pojazd'),
    krypton: val('v_krypton'),
    numer_rejestracyjny: val('v_rej'),

    rozpoczecie_przebieg: num('r_przebieg'),
    rozpoczecie_godzina: val('r_godzina'),
    rozpoczecie_data: val('r_data'),
    rozpoczecie_pobierajacy: val('r_pobierajacy'),
    rozpoczecie_paliwo: num('r_paliwo'),
    rozpoczecie_silnik: num('r_silnik'),
    rozpoczecie_karoseria: num('r_karoseria'),

    zakonczenie_przebieg: num('z_przebieg'),
    zakonczenie_godzina: val('z_godzina'),
    zakonczenie_data: val('z_data'),
    zakonczenie_zdajacy: val('z_zdajacy'),
    zakonczenie_paliwo: num('z_paliwo'),
    zakonczenie_silnik: num('z_silnik'),
    zakonczenie_karoseria: num('z_karoseria')
  };

  const { error } = await supabaseClient.from('karty_pojazdow').insert(row);
  if(error) return msg('vehicleMsg', error.message, false);
  msg('vehicleMsg','Karta pojazdu została zapisana.');
  e.target.reset();
  setDefaultDates();
  document.getElementById('r_pobierajacy').value = currentProfile?.imie_nazwisko || '';
  document.getElementById('z_zdajacy').value = currentProfile?.imie_nazwisko || '';
  await loadVehicleCards();
}

function val(id){ return document.getElementById(id).value || null; }
function num(id){ const v=document.getElementById(id).value; return v===''?null:Number(v); }

async function loadVehicleCards(){
  const { data, error } = await supabaseClient.from('karty_pojazdow').select('*').order('created_at',{ascending:false}).limit(50);
  if(error){
    document.getElementById('vehicleRows').innerHTML=`<tr><td colspan="7">${error.message}</td></tr>`;
    return;
  }
  vehicleCache = data || [];
  renderVehicleCards();
  updateStats();
}

function renderVehicleCards(){
  const search = (document.getElementById('vehicleSearch')?.value || '').toLowerCase();
  const rows = vehicleCache.filter(r => {
    const hay = `${r.pojazd||''} ${r.krypton||''} ${r.numer_rejestracyjny||''} ${r.rozpoczecie_pobierajacy||''} ${r.zakonczenie_zdajacy||''}`.toLowerCase();
    return hay.includes(search);
  });

  const tbody=document.getElementById('vehicleRows');
  tbody.innerHTML=rows.map(r=>`
    <tr>
      <td>${(r.created_at||'').slice(0,10)}</td>
      <td><span class="status">${r.status||''}</span></td>
      <td>${r.pojazd||''}</td>
      <td>${r.krypton||''}</td>
      <td>${r.numer_rejestracyjny||''}</td>
      <td>${r.rozpoczecie_pobierajacy||''}</td>
      <td>${r.zakonczenie_zdajacy||''}</td>
    </tr>`).join('') || `<tr><td colspan="7">Brak kart pojazdów.</td></tr>`;
}

function updateDocTitle(){
  const map = {
    notatka_sluzbowa:'NOTATKA SŁUŻBOWA',
    notatka_urzedowa:'NOTATKA URZĘDOWA',
    bron_palna:'NOTATKA Z UŻYCIA / WYKORZYSTANIA BRONI PALNEJ',
    paralizator:'NOTATKA Z UŻYCIA / WYKORZYSTANIA PARALIZATORA',
    wniosek_o_ukaranie:'WNIOSEK O UKARANIE',
    zatrzymanie_dokumentu:'POKWITOWANIE ZATRZYMANIA DOKUMENTU'
  };
  const type=document.getElementById('docType').value;
  document.getElementById('docHeader').textContent=map[type];
  document.getElementById('docTitle').value=map[type];
}

async function submitDocument(e){
  e.preventDefault();
  const type = val('docType');
  const number = await generateDocumentNumber(type);
  const row = {
    status:'oczekuje',
    typ_dokumentu: type,
    tytul: val('docTitle'),
    numer_dokumentu: number,
    funkcjonariusz: currentProfile?.imie_nazwisko || currentUser.email,
    stopien: currentProfile?.stopien || '',
    numer_sluzbowy: currentProfile?.numer_sluzbowy || '',
    tresc: {
      data: val('docDate'),
      funkcjonariusz: val('docOfficer'),
      numer_sluzbowy: val('docBadge'),
      opis: val('docContent'),
      zalaczniki: val('docAttachments')
    }
  };
  const { data, error } = await supabaseClient.from('dokumenty').insert(row).select().single();
  if(error) return msg('docMsg', error.message, false);
  await logActivity('dokument','Przesłano dokument '+number);
  await logHistory('dokumenty', data?.id, 'dodano', 'Utworzono dokument '+number, null, row);
  msg('docMsg','Dokument został przesłany do dowódcy. Numer: '+number);
  document.getElementById('docContent').value = '';
  document.getElementById('docAttachments').value = '';
  await loadMyDocuments();
  if(isCommander()) await loadCommanderDocuments();
}

async function loadMyDocuments(){
  const { data, error } = await supabaseClient.from('dokumenty')
    .select('*')
    .is('deleted_at', null)
    .eq('funkcjonariusz', currentProfile?.imie_nazwisko || currentUser?.email)
    .order('created_at',{ascending:false})
    .limit(30);

  const box=document.getElementById('myDocsList');
  if(error){ box.innerHTML=`<div class="empty">${error.message}</div>`; return; }
  box.innerHTML=(data||[]).map(docItem).join('') || '<div class="empty">Brak dokumentów.</div>';
  updateStats();
}

async function loadCommanderDocuments(){
  const { data, error } = await supabaseClient.from('dokumenty').select('*').is('deleted_at', null).order('created_at',{ascending:false}).limit(100);
  const box=document.getElementById('commanderDocsList');
  if(error){ box.innerHTML=`<div class="empty">${error.message}</div>`; return; }
  documentCache = data || [];
  renderCommanderDocuments();
  updateStats();
}

function renderCommanderDocuments(){
  const filter = document.getElementById('docFilter')?.value || '';
  const docs = filter ? documentCache.filter(d => d.status === filter) : documentCache;
  const box=document.getElementById('commanderDocsList');
  box.innerHTML=docs.map(d=>docItem(d,true)).join('') || '<div class="empty">Brak dokumentów.</div>';
}

function docItem(d, commander=false){
  const opis=d.tresc?.opis || '';
  const zal=d.tresc?.zalaczniki || '';
  return `<div class="list-item">
    <span class="status ${d.status}">${d.status}</span>
    <h4>${d.numer_dokumentu ? d.numer_dokumentu + ' — ' : ''}${d.tytul || d.typ_dokumentu}</h4>
    <p><b>Funkcjonariusz:</b> ${d.stopien||''} ${d.funkcjonariusz||''}</p>
    <p class="small"><b>Data przesłania:</b> ${(d.created_at||'').slice(0,16).replace('T',' ')}</p>
    ${d.podpis_elektroniczny ? `<p><b>Podpis elektroniczny:</b> ${escapeHtml(d.podpis_elektroniczny)}</p>` : ''}
    <p>${escapeHtml(opis).slice(0,600)}${opis.length>600?'...':''}</p>
    ${zal ? `<p class="small"><b>Załączniki / uwagi:</b> ${escapeHtml(zal)}</p>` : ''}
    ${commander ? `
      <div class="action-row">
        <button class="btn-light" onclick="markDocument(${d.id}, 'sprawdzone')">Zatwierdź / podpisz</button>
        <button class="btn-light" onclick="markDocument(${d.id}, 'do_poprawy')">Do poprawy</button>
        <button class="btn-light" onclick="softDeleteDocument(${d.id})">Do kosza</button>
      </div>
    ` : ''}
  </div>`;
}

async function markDocument(id, status){
  const podpis = status === 'sprawdzone'
    ? `Zatwierdzono elektronicznie przez ${currentProfile?.stopien || ''} ${currentProfile?.imie_nazwisko || currentUser.email} dnia ${new Date().toLocaleString('pl-PL')}`
    : null;
  const patch = {
    status,
    sprawdzone_przez: currentProfile?.imie_nazwisko || currentUser.email,
    sprawdzone_at: new Date().toISOString()
  };
  if(podpis){
    patch.zatwierdzone_przez = patch.sprawdzone_przez;
    patch.zatwierdzone_at = patch.sprawdzone_at;
    patch.podpis_elektroniczny = podpis;
  }
  const { error } = await supabaseClient.from('dokumenty').update(patch).eq('id', id);
  if(error) alert(error.message);
  await logActivity('dokument','Zmieniono status dokumentu na '+status);
  await logHistory('dokumenty', id, 'status', 'Zmieniono status dokumentu na '+status, null, patch);
  await loadCommanderDocuments();
}

async function softDeleteDocument(id){
  if(!confirm('Przenieść dokument do kosza?')) return;
  const patch = { deleted_at: new Date().toISOString(), deleted_by: currentProfile?.imie_nazwisko || currentUser.email, status:'usuniety' };
  const { error } = await supabaseClient.from('dokumenty').update(patch).eq('id', id);
  if(error) return alert(error.message);
  await logActivity('dokument','Przeniesiono dokument do kosza');
  await loadCommanderDocuments();
}

async function restoreDocument(id){
  const { error } = await supabaseClient.from('dokumenty').update({deleted_at:null, deleted_by:null, status:'oczekuje'}).eq('id', id);
  if(error) return alert(error.message);
  await logActivity('dokument','Przywrócono dokument z kosza');
  await loadTrash();
}

function downloadCurrentDocumentPDF(){
  const element=document.getElementById('docPreview');
  html2pdf().set({
    margin:[10,10,10,10],
    filename:(document.getElementById('docTitle').value||'dokument')+'.pdf',
    image:{type:'jpeg',quality:0.98},
    html2canvas:{scale:2},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}
  }).from(element).save();
}

async function loadProfiles(){
  const { data, error } = await supabaseClient.from('profile').select('*').order('created_at',{ascending:false});
  const box=document.getElementById('profilesList');
  if(error){ box.innerHTML=`<div class="empty">${error.message}</div>`; return; }
  box.innerHTML=(data||[]).map(p=>`<div class="list-item">
    <h4>${p.stopien||''} ${p.imie_nazwisko||p.email}</h4>
    <p>Email: ${p.email||''}</p>
    <p>Nr służbowy: ${p.numer_sluzbowy||''}</p>
    <p>Rola: <b>${p.rola||'funkcjonariusz'}</b></p>
  </div>`).join('') || '<div class="empty">Brak funkcjonariuszy.</div>';
}

function updateStats(){
  document.getElementById('statVehicles').textContent = vehicleCache.length || 0;
  const myDocs = document.querySelectorAll('#myDocsList .list-item').length;
  document.getElementById('statDocs').textContent = isCommander() ? documentCache.length : myDocs;
  const pending = documentCache.filter(d => d.status === 'oczekuje').length;
  const pendingEl = document.getElementById('statPending');
  if(pendingEl) pendingEl.textContent = pending;
}

function escapeHtml(str){
  return String(str || '').replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[s]));
}

async function loadActivity(){
  const { data, error } = await supabaseClient.from('aktywnosc').select('*').order('created_at',{ascending:false}).limit(100);
  const box=document.getElementById('activityList');
  if(!box) return;
  if(error){ box.innerHTML=error.message; return; }
  box.innerHTML=(data||[]).map(a=>`<div class="list-item"><h4>${a.akcja||''}</h4><p>${a.opis||''}</p><p class="small">${a.uzytkownik||''} | ${a.rola||''} | ${(a.created_at||'').slice(0,16).replace('T',' ')}</p></div>`).join('') || '<div class="empty">Brak aktywności.</div>';
}

async function loadTrash(){
  const { data, error } = await supabaseClient.from('dokumenty').select('*').not('deleted_at','is',null).order('deleted_at',{ascending:false}).limit(100);
  const box=document.getElementById('trashList');
  if(!box) return;
  if(error){ box.innerHTML=error.message; return; }
  box.innerHTML=(data||[]).map(d=>`<div class="list-item"><span class="status usuniety">kosz</span><h4>${d.numer_dokumentu||''} ${d.tytul||''}</h4><p>Usunięto: ${(d.deleted_at||'').slice(0,16).replace('T',' ')} przez ${d.deleted_by||''}</p><button class="btn-light" onclick="restoreDocument(${d.id})">Przywróć</button></div>`).join('') || '<div class="empty">Kosz pusty.</div>';
}

async function loadArchive(){
  const { data, error } = await supabaseClient.from('dokumenty').select('*').is('deleted_at', null).order('created_at',{ascending:false}).limit(300);
  const box=document.getElementById('archiveList');
  if(!box) return;
  if(error){ box.innerHTML=error.message; return; }
  const q=(document.getElementById('archiveSearch')?.value||'').toLowerCase();
  box.innerHTML=(data||[]).filter(d=>`${d.numer_dokumentu||''} ${d.tytul||''} ${d.funkcjonariusz||''} ${d.status||''}`.toLowerCase().includes(q)).map(d=>docItem(d,false)).join('') || '<div class="empty">Brak wyników.</div>';
}

async function loadSettings(){
  const { data } = await supabaseClient.from('numeracja_dokumentow').select('*').order('typ');
  const box=document.getElementById('numberingSettings');
  if(box) box.innerHTML=(data||[]).map(n=>`<div class="list-item"><h4>${n.typ}</h4><p>Prefix: <b>${n.prefix}</b> | Rok: ${n.rok} | Ostatni numer: ${n.ostatni_numer}</p></div>`).join('');
}

init();