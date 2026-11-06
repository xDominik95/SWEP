/* SWD - moduł pojazdów v2 FIX
   Naprawia znikającą listę pojazdów.
   Działa z różnymi nazwami kolumn w tabeli pojazdy.
*/

window.pojazdyLista = [];
window.aktywneKartyPojazdowLista = [];

function vEsc(v){
  return String(v ?? '').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
}

function vCanManage(){
  return ['admin','dowodca','zastepca'].includes(window.currentProfile?.rola);
}

function vCanHistory(){
  return ['admin','dowodca','zastepca'].includes(window.currentProfile?.rola);
}

function vVal(obj, keys, def=''){
  for(const k of keys){
    if(obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return def;
}

function vId(v){ return vVal(v,['id','pojazd_id']); }
function vMarka(v){ return vVal(v,['marka','brand'],''); }
function vModel(v){ return vVal(v,['model'],''); }
function vKrypton(v){ return vVal(v,['krypton','kryptonim','numer_boczny'],''); }
function vRej(v){ return vVal(v,['numer_rejestracyjny','rejestracja','nr_rejestracyjny'],''); }
function vPrzebieg(v){ return Number(vVal(v,['aktualny_przebieg','przebieg'],0)); }
function vPaliwo(v){ return Number(vVal(v,['aktualne_paliwo','paliwo'],0)); }
function vSilnik(v){ return Number(vVal(v,['aktualny_silnik','stan_silnika','silnik'],100)); }
function vKaroseria(v){ return Number(vVal(v,['aktualna_karoseria','stan_karoserii','karoseria'],100)); }
function vStatus(v){ return String(vVal(v,['status'],'Dostępny')); }
function vUwagi(v){ return vVal(v,['uwagi','opis'],''); }

function vCleanKrypton(k){
  return String(k || '').replace(/^OPP[\s\-_/]*/i,'').trim();
}

function vStatusOrder(status){
  const s=String(status||'').toLowerCase();
  if(s.includes('dost'))return 1;
  if(s.includes('słu')||s.includes('sluz')||s.includes('patrol'))return 2;
  if(s.includes('uszk'))return 3;
  if(s.includes('warsztat'))return 4;
  return 9;
}

function vStatusBadge(status){
  const s=String(status||'Dostępny');
  const low=s.toLowerCase();
  let icon='⚪';
  if(low.includes('dost'))icon='🟢';
  else if(low.includes('słu')||low.includes('sluz')||low.includes('patrol'))icon='🔵';
  else if(low.includes('uszk'))icon='🔴';
  else if(low.includes('warsztat'))icon='🟡';
  return `<span class="vehicle-status-badge">${icon} ${vEsc(s)}</span>`;
}

function vToday(){ return new Date().toISOString().slice(0,10); }
function vNowTime(){ return new Date().toTimeString().slice(0,5); }

function vMsg(id,text,ok=true){
  const el=document.getElementById(id);
  if(!el)return;
  el.textContent=text||'';
  el.style.color=ok?'#187a2f':'#b00020';
}

async function loadPojazdySystem(){
  await loadPojazdy();
  await loadAktywneKartyPojazdow();
  await loadHistoriaKartPojazdow();
}

async function loadPojazdy(){
  const box=document.getElementById('pojazdyLista');
  const {data,error}=await supabaseClient.from('pojazdy').select('*');

  if(error){
    if(box)box.innerHTML=`<div class="empty">Błąd pobierania pojazdów: ${vEsc(error.message)}</div>`;
    return;
  }

  window.pojazdyLista=data || [];
  renderPojazdyLista();
  fillPobranieSelect();
}

function ensureVehicleSearchBox(){
  const box=document.getElementById('pojazdyLista');
  if(!box)return null;

  let toolbar=document.getElementById('vehicleSearchToolbar');
  if(!toolbar){
    toolbar=document.createElement('div');
    toolbar.id='vehicleSearchToolbar';
    toolbar.className='vehicle-toolbar vehicle-toolbar-centered';
    toolbar.innerHTML='<input id="vehicleSearch" placeholder="Szukaj po kryptonimie, rejestracji, marce..." oninput="renderPojazdyLista()">';
    box.parentNode.insertBefore(toolbar,box);
  }
  return document.getElementById('vehicleSearch');
}

function renderPojazdyLista(){
  const box=document.getElementById('pojazdyLista');
  if(!box)return;

  const search=ensureVehicleSearchBox();
  const q=(search?.value||'').toLowerCase();

  let list=[...(window.pojazdyLista||[])].sort((a,b)=>{
    const order=vStatusOrder(vStatus(a))-vStatusOrder(vStatus(b));
    if(order!==0)return order;
    return String(vCleanKrypton(vKrypton(a))).localeCompare(String(vCleanKrypton(vKrypton(b))),'pl',{numeric:true});
  });

  if(q){
    list=list.filter(v=>`${vMarka(v)} ${vModel(v)} ${vKrypton(v)} ${vRej(v)} ${vStatus(v)}`.toLowerCase().includes(q));
  }

  box.innerHTML=`<div class="vehicle-table-wrap vehicle-table-centered">
    <table class="vehicle-table">
      <thead>
        <tr>
          <th>Status</th>
          <th>Kryptonim</th>
          <th>Pojazd</th>
          <th>Nr rej.</th>
          <th>Przebieg</th>
          <th>Paliwo</th>
          <th>Akcja</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(v=>{
          const id=vId(v);
          return `<tr>
            <td>${vStatusBadge(vStatus(v))}</td>
            <td><b>${vEsc(vCleanKrypton(vKrypton(v)))}</b></td>
            <td>${vEsc((vMarka(v)+' '+vModel(v)).trim())}</td>
            <td>${vEsc(vRej(v))}</td>
            <td>${vPrzebieg(v).toLocaleString('pl-PL')} km</td>
            <td>${vPaliwo(v)}%</td>
            <td class="vehicle-actions">
              <button type="button" class="btn-light" data-v-details="${id}">Szczegóły</button>
              ${vCanHistory()?`<button type="button" class="btn-light" data-v-history="${id}">Historia</button>`:''}
              ${vCanManage()?`<button type="button" class="btn-light" data-v-edit="${id}">Edytuj</button><button type="button" class="btn-danger" data-v-delete="${id}">Usuń</button>`:''}
            </td>
          </tr>`;
        }).join('') || '<tr><td colspan="7">Brak pojazdów w bazie.</td></tr>'}
      </tbody>
    </table>
  </div>`;
}

function fillPobranieSelect(){
  const select=document.getElementById('pobraniePojazdSelect');
  if(!select)return;

  const list=window.pojazdyLista||[];
  select.innerHTML='<option value="">Wybierz radiowóz...</option>' + list.map(v=>`
    <option value="${vId(v)}">${vEsc(vCleanKrypton(vKrypton(v)))} | ${vEsc(vMarka(v))} ${vEsc(vModel(v))} | ${vEsc(vRej(v))}</option>
  `).join('');
}

function formRow(){
  return {
    marka:document.getElementById('pojazdMarka')?.value.trim() || '',
    model:document.getElementById('pojazdModel')?.value.trim() || '',
    krypton:document.getElementById('pojazdKrypton')?.value.trim() || '',
    numer_rejestracyjny:document.getElementById('pojazdRejestracja')?.value.trim() || '',
    aktualny_przebieg:Number(document.getElementById('pojazdPrzebieg')?.value||0),
    aktualne_paliwo:Number(document.getElementById('pojazdPaliwo')?.value||0),
    aktualny_silnik:Number(document.getElementById('pojazdSilnik')?.value||100),
    aktualna_karoseria:Number(document.getElementById('pojazdKaroseria')?.value||100),
    uwagi:document.getElementById('pojazdUwagi')?.value.trim() || ''
  };
}

async function addPojazd(){
  if(!vCanManage())return vMsg('pojazdMsg','Brak uprawnień.',false);

  const id=document.getElementById('pojazdEditingId')?.value || '';
  const row=formRow();

  if(!row.marka || !row.model || !row.krypton || !row.numer_rejestracyjny){
    return vMsg('pojazdMsg','Uzupełnij markę, model, kryptonim i numer rejestracyjny.',false);
  }

  let result;
  if(id){
    const existing=(window.pojazdyLista||[]).find(x=>String(vId(x))===String(id));
    row.status=vStatus(existing);
    result=await supabaseClient.from('pojazdy').update(row).eq('id',id);
  }else{
    row.status='Dostępny';
    result=await supabaseClient.from('pojazdy').insert(row);
  }

  if(result.error)return vMsg('pojazdMsg',result.error.message,false);

  vMsg('pojazdMsg',id?'Pojazd zapisany.':'Pojazd dodany.',true);
  clearPojazdForm();
  await loadPojazdySystem();
}

function clearPojazdForm(){
  ['pojazdEditingId','pojazdMarka','pojazdModel','pojazdKrypton','pojazdRejestracja','pojazdPrzebieg','pojazdPaliwo','pojazdSilnik','pojazdKaroseria','pojazdUwagi'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.value='';
  });
  const title=document.getElementById('pojazdFormTitle');
  if(title)title.textContent='Dodaj radiowóz';
}

function prefillEditPojazd(id){
  const v=(window.pojazdyLista||[]).find(x=>String(vId(x))===String(id));
  if(!v)return alert('Nie znaleziono pojazdu. Kliknij Odśwież i spróbuj ponownie.');

  document.getElementById('pojazdEditingId').value=vId(v);
  document.getElementById('pojazdMarka').value=vMarka(v);
  document.getElementById('pojazdModel').value=vModel(v);
  document.getElementById('pojazdKrypton').value=vCleanKrypton(vKrypton(v));
  document.getElementById('pojazdRejestracja').value=vRej(v);
  document.getElementById('pojazdPrzebieg').value=vPrzebieg(v);
  document.getElementById('pojazdPaliwo').value=vPaliwo(v);
  document.getElementById('pojazdSilnik').value=vSilnik(v);
  document.getElementById('pojazdKaroseria').value=vKaroseria(v);
  document.getElementById('pojazdUwagi').value=vUwagi(v);

  const title=document.getElementById('pojazdFormTitle');
  if(title)title.textContent='Edytuj radiowóz';

  document.getElementById('pojazdMarka')?.scrollIntoView({behavior:'smooth',block:'center'});
}

async function deleteVehicle(id){
  if(!vCanManage())return alert('Pojazdy może usuwać tylko dowódca, zastępca lub administrator.');

  const {data:active,error:activeErr}=await supabaseClient.from('karty_pojazdow').select('id').eq('pojazd_id',id).eq('aktywna',true).limit(1);
  if(activeErr)return alert(activeErr.message);
  if(active && active.length)return alert('Nie można usunąć pojazdu, który jest aktualnie w patrolu.');

  if(!confirm('Na pewno usunąć pojazd? Historia pobrań zostanie w bazie.'))return;

  const {error}=await supabaseClient.from('pojazdy').delete().eq('id',id);
  if(error)return alert(error.message);

  await loadPojazdySystem();
}

async function pobierzRadiowoz(){
  const pojazdId=document.getElementById('pobraniePojazdSelect')?.value;
  const pojazd=(window.pojazdyLista||[]).find(v=>String(vId(v))===String(pojazdId));
  if(!pojazd)return vMsg('pobranieMsg','Wybierz radiowóz.',false);

  const przebieg=Number(document.getElementById('pobraniePrzebieg').value||vPrzebieg(pojazd));
  const paliwo=Number(document.getElementById('pobraniePaliwo').value||vPaliwo(pojazd));
  const silnik=Number(document.getElementById('pobranieSilnik').value||vSilnik(pojazd));
  const karoseria=Number(document.getElementById('pobranieKaroseria').value||vKaroseria(pojazd));
  const data=document.getElementById('pobranieData').value||vToday();
  const godzina=document.getElementById('pobranieGodzina').value||vNowTime();

  const row={
    pojazd_id:vId(pojazd),
    pojazd:`${vMarka(pojazd)} ${vModel(pojazd)}`.trim(),
    krypton:vCleanKrypton(vKrypton(pojazd)),
    numer_rejestracyjny:vRej(pojazd),
    rozpoczecie_data:data,
    rozpoczecie_godzina:godzina,
    rozpoczecie_przebieg:przebieg,
    rozpoczecie_paliwo:paliwo,
    rozpoczecie_silnik:silnik,
    rozpoczecie_karoseria:karoseria,
    rozpoczecie_pobierajacy:currentProfile?.imie_nazwisko||currentProfile?.login_name||currentProfile?.email,
    created_by:currentProfile?.imie_nazwisko||currentProfile?.login_name||currentProfile?.email,
    funkcjonariusz_id:currentProfile?.id,
    uwagi_pobrania:document.getElementById('pobranieUwagi').value.trim(),
    status:'aktywny',
    aktywna:true
  };

  const {error}=await supabaseClient.from('karty_pojazdow').insert(row);
  if(error)return vMsg('pobranieMsg',error.message,false);

  const upd=await supabaseClient.from('pojazdy').update({
    status:'W służbie',
    aktualny_przebieg:przebieg,
    aktualne_paliwo:paliwo,
    aktualny_silnik:silnik,
    aktualna_karoseria:karoseria
  }).eq('id',vId(pojazd));

  if(upd.error)return vMsg('pobranieMsg',upd.error.message,false);

  vMsg('pobranieMsg','Radiowóz pobrany.',true);
  await loadPojazdySystem();
}

async function loadAktywneKartyPojazdow(){
  const box=document.getElementById('aktywneKartyPojazdow');
  if(!box)return;

  const {data,error}=await supabaseClient.from('karty_pojazdow').select('*').eq('aktywna',true).order('created_at',{ascending:false});
  if(error){box.innerHTML=`<div class="empty">${vEsc(error.message)}</div>`;return;}

  window.aktywneKartyPojazdowLista=data||[];

  box.innerHTML=(data||[]).map(k=>{
    const owner=String(k.funkcjonariusz_id||'')===String(currentProfile?.id);
    const canEnd=owner||vCanManage();
    return `<div class="list-item">
      <h4>${vEsc(k.pojazd||'-')} | ${vEsc(k.krypton||'-')} | ${vEsc(k.numer_rejestracyjny||'-')}</h4>
      <p><b>Pobrał:</b> ${vEsc(k.rozpoczecie_pobierajacy||k.created_by||'-')} | <b>Od:</b> ${vEsc(k.rozpoczecie_data||'-')} ${vEsc(k.rozpoczecie_godzina||'-')}</p>
      ${canEnd?`<button type="button" class="btn-primary" onclick="startZakonczeniePatrolu(${k.id})">Zakończ patrol</button>`:''}
    </div>`;
  }).join('')||'<div class="empty">Brak aktywnych patroli.</div>';
}

function startZakonczeniePatrolu(id){
  const k=(window.aktywneKartyPojazdowLista||[]).find(x=>String(x.id)===String(id));
  if(!k)return alert('Nie znaleziono aktywnej karty.');

  document.getElementById('zakonczeniePanel').classList.remove('hidden');
  document.getElementById('zakonczenieKartaId').value=k.id;
  document.getElementById('zakonczeniePojazdInfo').value=`${k.pojazd||''} | ${k.krypton||''} | ${k.numer_rejestracyjny||''}`;
  document.getElementById('zakonczeniePrzebieg').value=k.rozpoczecie_przebieg||0;
  document.getElementById('zakonczenieGodzina').value=vNowTime();
  document.getElementById('zakonczenieData').value=vToday();
  document.getElementById('zakonczeniePaliwo').value=k.rozpoczecie_paliwo||0;
  document.getElementById('zakonczenieSilnik').value=k.rozpoczecie_silnik||100;
  document.getElementById('zakonczenieKaroseria').value=k.rozpoczecie_karoseria||100;
  document.getElementById('zakonczeniePanel').scrollIntoView({behavior:'smooth',block:'center'});
}

async function zakonczPatrol(){
  const id=document.getElementById('zakonczenieKartaId').value;
  const k=(window.aktywneKartyPojazdowLista||[]).find(x=>String(x.id)===String(id));
  if(!k)return vMsg('zakonczenieMsg','Nie znaleziono karty patrolu.',false);

  const owner=String(k.funkcjonariusz_id||'')===String(currentProfile?.id);
  if(!owner && !vCanManage())return vMsg('zakonczenieMsg','Ten patrol może zakończyć tylko właściciel, dowódca lub zastępca.',false);

  const przebieg=Number(document.getElementById('zakonczeniePrzebieg').value||0);
  const paliwo=Number(document.getElementById('zakonczeniePaliwo').value||0);
  const silnik=Number(document.getElementById('zakonczenieSilnik').value||100);
  const karoseria=Number(document.getElementById('zakonczenieKaroseria').value||100);
  const uszkodzenia=document.getElementById('zakonczenieUszkodzenia').checked;

  const patch={
    zakonczenie_data:document.getElementById('zakonczenieData').value||vToday(),
    zakonczenie_godzina:document.getElementById('zakonczenieGodzina').value||vNowTime(),
    zakonczenie_przebieg:przebieg,
    zakonczenie_paliwo:paliwo,
    zakonczenie_silnik:silnik,
    zakonczenie_karoseria:karoseria,
    zakonczenie_zdajacy:currentProfile?.imie_nazwisko||currentProfile?.login_name||currentProfile?.email,
    uwagi_zwrotu:document.getElementById('zakonczenieUwagi').value.trim(),
    uszkodzenia,
    uwagi_uszkodzenia:document.getElementById('zakonczenieUwagiUszkodzenia').value.trim(),
    aktywna:false,
    status:uszkodzenia?'Uszkodzony':'zakończony'
  };

  const {error}=await supabaseClient.from('karty_pojazdow').update(patch).eq('id',id);
  if(error)return vMsg('zakonczenieMsg',error.message,false);

  const upd=await supabaseClient.from('pojazdy').update({
    status:uszkodzenia?'Uszkodzony':'Dostępny',
    aktualny_przebieg:przebieg,
    aktualne_paliwo:paliwo,
    aktualny_silnik:silnik,
    aktualna_karoseria:karoseria
  }).eq('id',k.pojazd_id);

  if(upd.error)return vMsg('zakonczenieMsg',upd.error.message,false);

  vMsg('zakonczenieMsg','Patrol zakończony.',true);
  clearZakonczenieForm();
  await loadPojazdySystem();
}

function clearZakonczenieForm(){
  const panel=document.getElementById('zakonczeniePanel');
  if(panel)panel.classList.add('hidden');
  ['zakonczenieKartaId','zakonczeniePojazdInfo','zakonczeniePrzebieg','zakonczenieGodzina','zakonczenieData','zakonczeniePaliwo','zakonczenieSilnik','zakonczenieKaroseria','zakonczenieUwagi','zakonczenieUwagiUszkodzenia'].forEach(id=>{const e=document.getElementById(id); if(e)e.value='';});
  const chk=document.getElementById('zakonczenieUszkodzenia');
  if(chk)chk.checked=false;
}

async function loadHistoriaKartPojazdow(){
  const body=document.getElementById('historiaKartPojazdow');
  if(!body)return;

  const {data,error}=await supabaseClient.from('karty_pojazdow').select('*').order('created_at',{ascending:false}).limit(200);
  if(error){body.innerHTML=`<tr><td colspan="8">${vEsc(error.message)}</td></tr>`;return;}

  body.innerHTML=(data||[]).map(k=>`
    <tr>
      <td>${vEsc(k.rozpoczecie_data||String(k.created_at||'').slice(0,10)||'-')}</td>
      <td>${vEsc(k.status||'-')}</td>
      <td>${vEsc(k.pojazd||'-')}</td>
      <td>${vEsc(k.krypton||'-')}</td>
      <td>${vEsc(k.numer_rejestracyjny||'-')}</td>
      <td>${vEsc(k.rozpoczecie_pobierajacy||k.created_by||'-')}</td>
      <td>${vEsc(k.zakonczenie_zdajacy||'-')}</td>
      <td>${Number(k.rozpoczecie_przebieg||0).toLocaleString('pl-PL')} → ${k.zakonczenie_przebieg?Number(k.zakonczenie_przebieg).toLocaleString('pl-PL'):'-'}</td>
    </tr>
  `).join('');
}

async function openVehicleDetails(id){
  const v=(window.pojazdyLista||[]).find(x=>String(vId(x))===String(id));
  if(!v)return alert('Nie znaleziono pojazdu.');

  document.getElementById('vehicleDetailsModal')?.remove();
  document.body.insertAdjacentHTML('beforeend',`
    <div class="vehicle-modal-backdrop" id="vehicleDetailsModal">
      <div class="vehicle-modal">
        <div class="vehicle-modal-head">
          <h3>Szczegóły pojazdu</h3>
          <button type="button" class="btn-light" data-v-close="vehicleDetailsModal">Zamknij</button>
        </div>
        <div class="vehicle-details-grid">
          <div><small>Marka</small><b>${vEsc(vMarka(v)||'-')}</b></div>
          <div><small>Model</small><b>${vEsc(vModel(v)||'-')}</b></div>
          <div><small>Kryptonim</small><b>${vEsc(vCleanKrypton(vKrypton(v)))}</b></div>
          <div><small>Numer rejestracyjny</small><b>${vEsc(vRej(v)||'-')}</b></div>
          <div><small>Aktualny przebieg</small><b>${vPrzebieg(v).toLocaleString('pl-PL')} km</b></div>
          <div><small>Poziom paliwa</small><b>${vPaliwo(v)}%</b></div>
        </div>
        <div class="action-row">
          ${vCanHistory()?`<button type="button" class="btn-primary" data-v-history="${vId(v)}">📋 Historia pobrań</button>`:''}
        </div>
      </div>
    </div>`);
}

async function openVehicleHistory(id){
  if(!vCanHistory())return alert('Historię może sprawdzić tylko dowódca, zastępca lub administrator.');

  const v=(window.pojazdyLista||[]).find(x=>String(vId(x))===String(id)) || {};
  const {data,error}=await supabaseClient.from('karty_pojazdow').select('*').eq('pojazd_id',id).order('created_at',{ascending:false}).limit(200);
  if(error)return alert(error.message);

  const rows=(data||[]).map(k=>`
    <tr class="vehicle-history-row" data-v-entry="${k.id}">
      <td>${vEsc(k.rozpoczecie_data||String(k.created_at||'').slice(0,10)||'-')}</td>
      <td>${vEsc(k.rozpoczecie_pobierajacy||k.created_by||'-')}</td>
      <td>${vEsc(k.rozpoczecie_godzina||'-')}</td>
      <td>${vEsc(k.zakonczenie_godzina||'-')}</td>
      <td>${Number(k.rozpoczecie_przebieg||0).toLocaleString('pl-PL')}</td>
      <td>${k.zakonczenie_przebieg?Number(k.zakonczenie_przebieg).toLocaleString('pl-PL'):'-'}</td>
      <td>${vEsc(k.status||'')}</td>
    </tr>`).join('');

  document.getElementById('vehicleHistoryModal')?.remove();
  document.body.insertAdjacentHTML('beforeend',`
    <div class="vehicle-modal-backdrop" id="vehicleHistoryModal">
      <div class="vehicle-modal vehicle-modal-wide">
        <div class="vehicle-modal-head">
          <h3>Historia pobrań — ${vEsc((vMarka(v)||'')+' '+(vModel(v)||''))} | ${vEsc(vCleanKrypton(vKrypton(v)))}</h3>
          <button type="button" class="btn-light" data-v-close="vehicleHistoryModal">Zamknij</button>
        </div>
        <div class="vehicle-table-wrap">
          <table class="vehicle-table">
            <thead><tr><th>Data</th><th>Funkcjonariusz</th><th>Pobranie</th><th>Zdanie</th><th>Przebieg start</th><th>Przebieg koniec</th><th>Status</th></tr></thead>
            <tbody>${rows||'<tr><td colspan="7">Brak historii pobrań.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>`);
}

async function openVehicleHistoryEntry(id){
  const {data:k,error}=await supabaseClient.from('karty_pojazdow').select('*').eq('id',id).single();
  if(error)return alert(error.message);

  document.getElementById('vehicleHistoryEntryModal')?.remove();
  document.body.insertAdjacentHTML('beforeend',`
    <div class="vehicle-modal-backdrop" id="vehicleHistoryEntryModal">
      <div class="vehicle-modal">
        <div class="vehicle-modal-head">
          <h3>Szczegóły pobrania</h3>
          <button type="button" class="btn-light" data-v-close="vehicleHistoryEntryModal">Zamknij</button>
        </div>
        <div class="vehicle-details-grid">
          <div><small>Pojazd</small><b>${vEsc(k.pojazd||'-')}</b></div>
          <div><small>Kryptonim</small><b>${vEsc(k.krypton||'-')}</b></div>
          <div><small>Pobrał</small><b>${vEsc(k.rozpoczecie_pobierajacy||k.created_by||'-')}</b></div>
          <div><small>Data</small><b>${vEsc(k.rozpoczecie_data||'-')}</b></div>
          <div><small>Godzina pobrania</small><b>${vEsc(k.rozpoczecie_godzina||'-')}</b></div>
          <div><small>Godzina zdania</small><b>${vEsc(k.zakonczenie_godzina||'-')}</b></div>
          <div><small>Przebieg start</small><b>${Number(k.rozpoczecie_przebieg||0).toLocaleString('pl-PL')} km</b></div>
          <div><small>Przebieg koniec</small><b>${k.zakonczenie_przebieg?Number(k.zakonczenie_przebieg).toLocaleString('pl-PL')+' km':'-'}</b></div>
        </div>
      </div>
    </div>`);
}

if(!window._vehiclesV2ClickListener){
  window._vehiclesV2ClickListener=true;
  document.addEventListener('click',function(e){
    const el=e.target.closest('[data-v-details],[data-v-history],[data-v-edit],[data-v-delete],[data-v-close],[data-v-entry]');
    if(!el)return;

    e.preventDefault();
    e.stopPropagation();

    if(el.dataset.vDetails)return openVehicleDetails(el.dataset.vDetails);
    if(el.dataset.vHistory)return openVehicleHistory(el.dataset.vHistory);
    if(el.dataset.vEdit)return prefillEditPojazd(el.dataset.vEdit);
    if(el.dataset.vDelete)return deleteVehicle(el.dataset.vDelete);
    if(el.dataset.vClose)return document.getElementById(el.dataset.vClose)?.remove();
    if(el.dataset.vEntry)return openVehicleHistoryEntry(el.dataset.vEntry);
  },true);
}
