let currentUser = null;
let currentProfile = null;

function msg(id, text, ok=true){
  const el=document.getElementById(id);
  el.textContent=text;
  el.style.color=ok?'#187a2f':'#b00020';
}

function today(){
  return new Date().toISOString().slice(0,10);
}

async function init(){
  document.getElementById('docDate').value=today();
  document.getElementById('r_data').value=today();
  document.getElementById('z_data').value=today();

  const { data } = await supabaseClient.auth.getSession();
  if(data.session) await enterApp(data.session.user);
}

async function login(){
  const email=document.getElementById('loginEmail').value.trim();
  const password=document.getElementById('loginPassword').value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({email,password});
  if(error) return msg('loginMsg', error.message, false);
  await enterApp(data.user);
}

function showRegister(){
  msg('loginMsg','Konto najlepiej tworzyć w Supabase → Authentication → Users → Add user. Potem wpisz dane użytkownika w tabeli profile.',false);
}

async function logout(){
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
  document.getElementById('userInfo').textContent = `${profile.stopien || ''} ${profile.imie_nazwisko || user.email} | ${profile.email || user.email}`;
  document.getElementById('rolePill').textContent = profile.rola || 'funkcjonariusz';

  document.getElementById('docOfficer').value = `${profile.stopien || ''} ${profile.imie_nazwisko || ''}`.trim();
  document.getElementById('docBadge').value = profile.numer_sluzbowy || '';
  document.getElementById('r_pobierajacy').value = profile.imie_nazwisko || '';
  document.getElementById('z_zdajacy').value = profile.imie_nazwisko || '';

  if(['admin','dowodca'].includes(profile.rola)){
    document.querySelectorAll('.commander-only').forEach(e=>e.classList.remove('hidden'));
  }

  loadVehicleCards();
  loadMyDocuments();
}

function showPage(id, btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const titles = {
    dashboard:'Pulpit',
    vehicles:'Karty pojazdów',
    documents:'Dokumenty',
    commanderDocs:'Dokumenty dowódcy',
    users:'Funkcjonariusze'
  };
  document.getElementById('pageTitle').textContent=titles[id]||'SWEP';
  if(id==='commanderDocs') loadCommanderDocuments();
  if(id==='users') loadProfiles();
}

async function saveVehicleCard(){
  const row = {
    created_by: currentProfile?.imie_nazwisko || currentUser.email,
    status: document.getElementById('z_przebieg').value ? 'Zakończony' : 'W patrolu',
    pojazd: document.getElementById('v_pojazd').value,
    krypton: document.getElementById('v_krypton').value,
    numer_rejestracyjny: document.getElementById('v_rej').value,

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
  loadVehicleCards();
}

function val(id){ return document.getElementById(id).value || null; }
function num(id){ const v=document.getElementById(id).value; return v===''?null:Number(v); }

async function loadVehicleCards(){
  const { data, error } = await supabaseClient.from('karty_pojazdow').select('*').order('created_at',{ascending:false}).limit(50);
  const tbody=document.getElementById('vehicleRows');
  if(error){ tbody.innerHTML=`<tr><td colspan="6">${error.message}</td></tr>`; return; }
  tbody.innerHTML=(data||[]).map(r=>`
    <tr>
      <td>${(r.created_at||'').slice(0,10)}</td>
      <td>${r.pojazd||''}</td>
      <td>${r.krypton||''}</td>
      <td>${r.numer_rejestracyjny||''}</td>
      <td>${r.rozpoczecie_pobierajacy||''}</td>
      <td>${r.zakonczenie_zdajacy||''}</td>
    </tr>`).join('');
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

async function submitDocument(){
  const row = {
    status:'oczekuje',
    typ_dokumentu: val('docType'),
    tytul: val('docTitle'),
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
  const { error } = await supabaseClient.from('dokumenty').insert(row);
  if(error) return msg('docMsg', error.message, false);
  msg('docMsg','Dokument został przesłany do dowódcy.');
  loadMyDocuments();
}

async function loadMyDocuments(){
  const { data, error } = await supabaseClient.from('dokumenty')
    .select('*')
    .eq('funkcjonariusz', currentProfile?.imie_nazwisko || currentUser?.email)
    .order('created_at',{ascending:false})
    .limit(30);

  const box=document.getElementById('myDocsList');
  if(error){ box.innerHTML=error.message; return; }
  box.innerHTML=(data||[]).map(docItem).join('') || '<p>Brak dokumentów.</p>';
}

async function loadCommanderDocuments(){
  const { data, error } = await supabaseClient.from('dokumenty').select('*').order('created_at',{ascending:false}).limit(100);
  const box=document.getElementById('commanderDocsList');
  if(error){ box.innerHTML=error.message; return; }
  box.innerHTML=(data||[]).map(d=>docItem(d,true)).join('') || '<p>Brak dokumentów.</p>';
}

function docItem(d, commander=false){
  const opis=d.tresc?.opis || '';
  return `<div class="list-item">
    <span class="status ${d.status}">${d.status}</span>
    <h4>${d.tytul || d.typ_dokumentu}</h4>
    <p><b>Funkcjonariusz:</b> ${d.stopien||''} ${d.funkcjonariusz||''} | <b>Data:</b> ${(d.created_at||'').slice(0,16).replace('T',' ')}</p>
    <p>${opis.slice(0,220)}${opis.length>220?'...':''}</p>
    ${commander ? `
      <button class="secondary" onclick="markDocument(${d.id}, 'sprawdzone')">Oznacz jako sprawdzone</button>
      <button class="secondary" onclick="markDocument(${d.id}, 'do_poprawy')">Do poprawy</button>
    ` : ''}
  </div>`;
}

async function markDocument(id, status){
  const { error } = await supabaseClient.from('dokumenty').update({
    status,
    sprawdzone_przez: currentProfile?.imie_nazwisko || currentUser.email,
    sprawdzone_at: new Date().toISOString()
  }).eq('id', id);
  if(error) alert(error.message);
  loadCommanderDocuments();
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
  if(error){ box.innerHTML=error.message; return; }
  box.innerHTML=(data||[]).map(p=>`<div class="list-item">
    <b>${p.stopien||''} ${p.imie_nazwisko||p.email}</b><br>
    Email: ${p.email||''}<br>
    Nr służbowy: ${p.numer_sluzbowy||''}<br>
    Rola: <b>${p.rola||'funkcjonariusz'}</b>
  </div>`).join('');
}

init();
