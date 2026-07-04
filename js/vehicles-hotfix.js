/* SWD - vehicles-hotfix.js
   Osobna poprawka przycisków Szczegóły / Historia.
   Działa niezależnie od tego, ile razy renderPojazdyLista jest nadpisane w vehicles.js.
*/

(function(){
  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  }

  function cleanKrypton(k){
    return String(k || '').replace(/^OPP[\s\-_/]*/i,'').trim();
  }

  function canViewHistory(){
    return ['admin','dowodca','zastepca'].includes(window.currentProfile?.rola);
  }

  function canManage(){
    return ['admin','dowodca','zastepca'].includes(window.currentProfile?.rola);
  }

  async function getVehicle(id){
    let v=(window.pojazdyLista||[]).find(x=>String(x.id)===String(id));
    if(v)return v;

    const {data,error}=await supabaseClient.from('pojazdy').select('*').eq('id',id).single();
    if(error){
      alert(error.message);
      return null;
    }
    return data;
  }

  async function details(id){
    const v=await getVehicle(id);
    if(!v)return;

    document.getElementById('vehicleDetailsModal')?.remove();

    document.body.insertAdjacentHTML('beforeend',`
      <div class="vehicle-modal-backdrop" id="vehicleDetailsModal">
        <div class="vehicle-modal">
          <div class="vehicle-modal-head">
            <h3>Szczegóły pojazdu</h3>
            <button type="button" class="btn-light" data-vh-close="vehicleDetailsModal">Zamknij</button>
          </div>

          <div class="vehicle-details-grid">
            <div><small>Marka</small><b>${esc(v.marka||'-')}</b></div>
            <div><small>Model</small><b>${esc(v.model||'-')}</b></div>
            <div><small>Kryptonim</small><b>${esc(cleanKrypton(v.krypton))}</b></div>
            <div><small>Numer rejestracyjny</small><b>${esc(v.numer_rejestracyjny||'-')}</b></div>
            <div><small>Aktualny przebieg</small><b>${Number(v.aktualny_przebieg||0).toLocaleString('pl-PL')} km</b></div>
            <div><small>Poziom paliwa</small><b>${Number(v.aktualne_paliwo||0)}%</b></div>
          </div>

          <div class="action-row">
            ${canViewHistory()?`<button type="button" class="btn-primary" data-vh-history="${v.id}">📋 Historia pobrań</button>`:''}
          </div>
        </div>
      </div>
    `);
  }

  async function history(id){
    if(!canViewHistory())return alert('Historię może sprawdzić tylko dowódca, zastępca lub administrator.');

    const v=await getVehicle(id);
    if(!v)return;

    const {data,error}=await supabaseClient
      .from('karty_pojazdow')
      .select('*')
      .eq('pojazd_id',id)
      .order('created_at',{ascending:false})
      .limit(200);

    if(error)return alert(error.message);

    document.getElementById('vehicleHistoryModal')?.remove();

    const rows=(data||[]).map(k=>`
      <tr class="vehicle-history-row" data-vh-entry="${k.id}">
        <td>${esc(k.rozpoczecie_data||String(k.created_at||'').slice(0,10)||'-')}</td>
        <td>${esc(k.rozpoczecie_pobierajacy||k.created_by||'-')}</td>
        <td>${esc(k.rozpoczecie_godzina||'-')}</td>
        <td>${esc(k.zakonczenie_godzina||'-')}</td>
        <td>${Number(k.rozpoczecie_przebieg||0).toLocaleString('pl-PL')}</td>
        <td>${k.zakonczenie_przebieg?Number(k.zakonczenie_przebieg).toLocaleString('pl-PL'):'-'}</td>
        <td>${esc(k.status||'')}</td>
      </tr>
    `).join('');

    document.body.insertAdjacentHTML('beforeend',`
      <div class="vehicle-modal-backdrop" id="vehicleHistoryModal">
        <div class="vehicle-modal vehicle-modal-wide">
          <div class="vehicle-modal-head">
            <h3>Historia pobrań — ${esc((v.marka||'')+' '+(v.model||''))} | ${esc(cleanKrypton(v.krypton))}</h3>
            <button type="button" class="btn-light" data-vh-close="vehicleHistoryModal">Zamknij</button>
          </div>

          <div class="vehicle-table-wrap">
            <table class="vehicle-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Funkcjonariusz</th>
                  <th>Pobranie</th>
                  <th>Zdanie</th>
                  <th>Przebieg start</th>
                  <th>Przebieg koniec</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="7">Brak historii pobrań.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  async function entry(id){
    const {data:k,error}=await supabaseClient.from('karty_pojazdow').select('*').eq('id',id).single();
    if(error)return alert(error.message);

    document.getElementById('vehicleHistoryEntryModal')?.remove();

    document.body.insertAdjacentHTML('beforeend',`
      <div class="vehicle-modal-backdrop" id="vehicleHistoryEntryModal">
        <div class="vehicle-modal">
          <div class="vehicle-modal-head">
            <h3>Szczegóły pobrania</h3>
            <button type="button" class="btn-light" data-vh-close="vehicleHistoryEntryModal">Zamknij</button>
          </div>

          <div class="vehicle-details-grid">
            <div><small>Pojazd</small><b>${esc(k.pojazd||'-')}</b></div>
            <div><small>Kryptonim</small><b>${esc(cleanKrypton(k.krypton))}</b></div>
            <div><small>Pobrał</small><b>${esc(k.rozpoczecie_pobierajacy||k.created_by||'-')}</b></div>
            <div><small>Data</small><b>${esc(k.rozpoczecie_data||'-')}</b></div>
            <div><small>Godzina pobrania</small><b>${esc(k.rozpoczecie_godzina||'-')}</b></div>
            <div><small>Godzina zdania</small><b>${esc(k.zakonczenie_godzina||'-')}</b></div>
            <div><small>Przebieg start</small><b>${Number(k.rozpoczecie_przebieg||0).toLocaleString('pl-PL')} km</b></div>
            <div><small>Przebieg koniec</small><b>${k.zakonczenie_przebieg?Number(k.zakonczenie_przebieg).toLocaleString('pl-PL')+' km':'-'}</b></div>
            <div><small>Paliwo przy pobraniu</small><b>${Number(k.rozpoczecie_paliwo||0)}%</b></div>
            <div><small>Paliwo przy zdaniu</small><b>${k.zakonczenie_paliwo!==null&&k.zakonczenie_paliwo!==undefined?Number(k.zakonczenie_paliwo)+'%':'-'}</b></div>
            <div><small>Uszkodzenia</small><b>${k.uszkodzenia?'Tak':'Nie'}</b></div>
            <div><small>Status</small><b>${esc(k.status||'-')}</b></div>
          </div>

          <div class="vehicle-history-note"><b>Uwagi przy pobraniu:</b><br>${esc(k.uwagi_pobrania||'-')}</div>
          <div class="vehicle-history-note"><b>Uwagi przy zwrocie:</b><br>${esc(k.uwagi_zwrotu||'-')}</div>
          <div class="vehicle-history-note"><b>Uwagi uszkodzeń:</b><br>${esc(k.uwagi_uszkodzenia||'-')}</div>
        </div>
      </div>
    `);
  }

  async function removeVehicle(id){
    if(!canManage())return alert('Pojazdy może usuwać tylko dowódca, zastępca lub administrator.');

    const {data:active}=await supabaseClient.from('karty_pojazdow').select('id').eq('pojazd_id',id).eq('aktywna',true).limit(1);
    if(active && active.length)return alert('Nie można usunąć pojazdu, który jest aktualnie w patrolu.');

    if(!confirm('Na pewno usunąć pojazd? Historia pobrań zostanie w bazie.'))return;

    const {error}=await supabaseClient.from('pojazdy').delete().eq('id',id);
    if(error)return alert(error.message);

    if(typeof loadPojazdySystem === 'function')await loadPojazdySystem();
  }

  function editVehicle(id){
    if(!canManage())return alert('Pojazdy może edytować tylko dowódca, zastępca lub administrator.');
    if(typeof prefillEditPojazd === 'function'){
      prefillEditPojazd(id);
      document.getElementById('pojazdMarka')?.scrollIntoView({behavior:'smooth',block:'center'});
    }
  }

  function patchVehicleButtons(){
    const area=document.getElementById('pojazdyLista');
    if(!area)return;

    const rows=area.querySelectorAll('tbody tr');
    rows.forEach(tr=>{
      const btns=tr.querySelectorAll('button');
      const text=[...tr.children].map(td=>td.textContent.trim()).join(' ');
      const vehicle=(window.pojazdyLista||[]).find(v=>{
        return text.includes(String(v.numer_rejestracyjny||'')) || text.includes(String(v.id||'__missing__'));
      });

      if(!vehicle)return;

      btns.forEach(btn=>{
        const t=btn.textContent.trim().toLowerCase();
        btn.type='button';
        btn.removeAttribute('onclick');

        if(t.includes('szczeg')){
          btn.dataset.vhDetails=vehicle.id;
        }else if(t.includes('historia')){
          btn.dataset.vhHistory=vehicle.id;
        }else if(t.includes('edytuj')){
          btn.dataset.vhEdit=vehicle.id;
        }else if(t.includes('usuń') || t.includes('usun')){
          btn.dataset.vhDelete=vehicle.id;
        }
      });
    });
  }

  // Nadpisuje renderowanie tylko delikatnie: po każdym renderze poprawia przyciski.
  const timer=setInterval(patchVehicleButtons,700);

  if(!window._swdVehiclesHotfixListener){
    window._swdVehiclesHotfixListener=true;

    document.addEventListener('click', function(e){
      const el=e.target.closest('[data-vh-details],[data-vh-history],[data-vh-entry],[data-vh-close],[data-vh-edit],[data-vh-delete]');
      if(!el)return;

      e.preventDefault();
      e.stopPropagation();

      if(el.dataset.vhDetails)return details(el.dataset.vhDetails);
      if(el.dataset.vhHistory)return history(el.dataset.vhHistory);
      if(el.dataset.vhEntry)return entry(el.dataset.vhEntry);
      if(el.dataset.vhClose)return document.getElementById(el.dataset.vhClose)?.remove();
      if(el.dataset.vhEdit)return editVehicle(el.dataset.vhEdit);
      if(el.dataset.vhDelete)return removeVehicle(el.dataset.vhDelete);
    }, true);
  }

  window.openVehicleDetails=details;
  window.openVehicleHistory=history;
  window.openVehicleHistoryEntry=entry;
  window.deleteVehicle=removeVehicle;
  window.editVehicleFromTable=editVehicle;
})();
