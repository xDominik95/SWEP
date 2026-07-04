/* SWD - dodatkowe koszty funkcjonariuszy */

function costMsg(text,ok=true){
  const e=document.getElementById('costMsg');
  if(!e)return;
  e.textContent=text||'';
  e.style.color=ok?'#187a2f':'#b00020';
}

function costStatusName(s){
  return {
    oczekuje:'Oczekuje',
    zaakceptowany:'Zaakceptowany',
    odrzucony:'Odrzucony'
  }[s] || s || '-';
}

function costCanManage(){
  return ['admin','dowodca','zastepca'].includes(currentProfile?.rola);
}

function todayCostDate(){
  return new Date().toISOString().slice(0,10);
}

async function loadCostsModule(){
  const d=document.getElementById('costDate');
  if(d && !d.value)d.value=todayCostDate();
  await loadMyCosts();
  if(costCanManage()){
    await loadPendingCosts();
    await loadAllCosts();
  }
}

async function submitCostRequest(){
  if(!currentProfile)return;

  const data=document.getElementById('costDate').value;
  const pojazd=document.getElementById('costVehicle').value.trim();
  const rejestracja=document.getElementById('costPlate').value.trim();
  const kwota=Number(document.getElementById('costAmount').value || 0);
  const opis=document.getElementById('costDescription').value.trim();

  if(!data || !pojazd || !rejestracja || !kwota || !opis){
    return costMsg('Uzupełnij datę, pojazd, numer rejestracyjny, kwotę i opis.',false);
  }

  const row={
    funkcjonariusz_id:currentProfile.id,
    funkcjonariusz:currentProfile.imie_nazwisko || currentProfile.login_name,
    stopien:currentProfile.stopien || '',
    numer_sluzbowy:currentProfile.numer_sluzbowy || '',
    data_kosztu:data,
    pojazd,
    numer_rejestracyjny:rejestracja,
    kwota,
    opis,
    status:'oczekuje'
  };

  const {error}=await supabaseClient.from('koszty').insert(row);
  if(error)return costMsg(error.message,false);

  costMsg('Koszt wysłany do rozpatrzenia.',true);

  document.getElementById('costVehicle').value='';
  document.getElementById('costPlate').value='';
  document.getElementById('costAmount').value='';
  document.getElementById('costDescription').value='';

  await loadCostsModule();
}

async function loadMyCosts(){
  const box=document.getElementById('myCostsList');
  if(!box||!currentProfile)return;

  const {data,error}=await supabaseClient
    .from('koszty')
    .select('*')
    .eq('funkcjonariusz_id',currentProfile.id)
    .order('created_at',{ascending:false})
    .limit(200);

  if(error){box.innerHTML=`<div class="empty">${error.message}</div>`;return;}

  box.innerHTML=(data||[]).map(c=>`
    <div class="list-item">
      <span class="status ${c.status}">${costStatusName(c.status)}</span>
      <h4>${c.data_kosztu || ''} | ${c.pojazd || ''} | ${c.numer_rejestracyjny || ''}</h4>
      <p><b>Kwota:</b> ${Number(c.kwota||0)} zł</p>
      <p>${c.opis || ''}</p>
      ${c.decyzja_notatka?`<p><b>Decyzja:</b> ${c.decyzja_notatka}</p>`:''}
    </div>
  `).join('') || '<div class="empty">Brak kosztów.</div>';
}

async function loadPendingCosts(){
  const box=document.getElementById('pendingCostsList');
  if(!box)return;

  const {data,error}=await supabaseClient
    .from('koszty')
    .select('*')
    .eq('status','oczekuje')
    .order('created_at',{ascending:false})
    .limit(200);

  if(error){box.innerHTML=`<div class="empty">${error.message}</div>`;return;}

  box.innerHTML=(data||[]).map(c=>`
    <div class="list-item">
      <span class="status oczekuje">Oczekuje</span>
      <h4>${c.funkcjonariusz || ''} | ${c.data_kosztu || ''}</h4>
      <p><b>Pojazd:</b> ${c.pojazd || ''} | <b>Nr rej.:</b> ${c.numer_rejestracyjny || ''}</p>
      <p><b>Kwota:</b> ${Number(c.kwota||0)} zł</p>
      <p>${c.opis || ''}</p>
      <div class="action-row">
        <button class="btn-primary" onclick="decideCost(${c.id},'zaakceptowany')">Akceptuj i dolicz do wypłaty</button>
        <button class="btn-danger" onclick="decideCost(${c.id},'odrzucony')">Odrzuć</button>
      </div>
    </div>
  `).join('') || '<div class="empty">Brak kosztów do rozpatrzenia.</div>';
}

async function loadAllCosts(){
  const box=document.getElementById('allCostsList');
  if(!box)return;

  const {data,error}=await supabaseClient
    .from('koszty')
    .select('*')
    .order('created_at',{ascending:false})
    .limit(300);

  if(error){box.innerHTML=`<div class="empty">${error.message}</div>`;return;}

  box.innerHTML=(data||[]).map(c=>`
    <div class="list-item">
      <span class="status ${c.status}">${costStatusName(c.status)}</span>
      <h4>${c.funkcjonariusz || ''} | ${c.data_kosztu || ''}</h4>
      <p><b>Pojazd:</b> ${c.pojazd || ''} | <b>Nr rej.:</b> ${c.numer_rejestracyjny || ''}</p>
      <p><b>Kwota:</b> ${Number(c.kwota||0)} zł</p>
      <p>${c.opis || ''}</p>
      ${c.decyzja_przez?`<p><b>Decyzja:</b> ${c.decyzja_przez} | ${c.decyzja_notatka || ''}</p>`:''}
    </div>
  `).join('') || '<div class="empty">Brak kosztów.</div>';
}

async function decideCost(id,status){
  if(!costCanManage())return alert('Brak uprawnień.');

  const note=prompt('Notatka do decyzji:',status==='zaakceptowany'?'Koszt zaakceptowany i doliczony do wypłaty.':'Koszt odrzucony.') || '';

  const {data:cost,error:readError}=await supabaseClient.from('koszty').select('*').eq('id',id).single();
  if(readError)return alert(readError.message);

  const patch={
    status,
    decyzja_przez:currentProfile.imie_nazwisko || currentProfile.login_name,
    decyzja_at:new Date().toISOString(),
    decyzja_notatka:note
  };

  const {error}=await supabaseClient.from('koszty').update(patch).eq('id',id);
  if(error)return alert(error.message);

  if(status==='zaakceptowany'){
    const row={
      funkcjonariusz_id:cost.funkcjonariusz_id,
      funkcjonariusz:cost.funkcjonariusz,
      stopien:cost.stopien || '',
      numer_sluzbowy:cost.numer_sluzbowy || '',
      data_sluzby:cost.data_kosztu,
      rozpoczecie:'-',
      zakonczenie:'-',
      godziny:0,
      stawka:0,
      kwota:Number(cost.kwota||0),
      opis:`Dodatkowy koszt: ${cost.pojazd || ''} ${cost.numer_rejestracyjny || ''} - ${cost.opis || ''}`,
      status:'zaakceptowana',
      zatwierdzone_przez:currentProfile.imie_nazwisko || currentProfile.login_name,
      zatwierdzone_at:new Date().toISOString()
    };

    await supabaseClient.from('sluzby').insert(row);
  }

  await loadCostsModule();
  if(typeof loadHoursModule==='function')await loadHoursModule();
}

/* Podpięcie zakładki Koszty bez ruszania app.js */
if(typeof showPage === 'function' && !window._swdCostsShowPagePatched){
  window._swdCostsShowPagePatched=true;
  const oldShowPage=showPage;
  showPage=function(id,btn){
    oldShowPage(id,btn);
    if(id==='costs'){
      const title=document.getElementById('pageTitle');
      if(title)title.textContent='Koszty';
      loadCostsModule();
    }
  }
}
