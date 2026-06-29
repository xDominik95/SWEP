/*
  SWD - działający moduł radiowozów.
  Wymaga tabel: pojazdy oraz karty_pojazdow z kolumnami z SQL, który już uruchomiłeś.
*/

let pojazdyLista = [];
let aktywneKartyPojazdow = [];
let historiaKartPojazdow = [];

function swdMsg(id, text, ok = true) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? '#187a2f' : '#b00020';
}

function getVal(id) {
  return document.getElementById(id)?.value || null;
}

function getNum(id) {
  const v = document.getElementById(id)?.value;
  return v === '' || v == null ? null : Number(v);
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function currentTimeString() {
  return new Date().toTimeString().slice(0, 5);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[s]));
}

function isDowodcaOrAdminVehicles() {
  return ['admin', 'dowodca', 'zastepca', 'koordynator'].includes(currentProfile?.rola);
}

function vehicleStatusClass(status) {
  if (status === 'Dostępny') return 'sprawdzone';
  if (status === 'Uszkodzony' || status === 'Warsztat') return 'do_poprawy';
  return '';
}

async function logSWDActivityVehicles(akcja, opis) {
  try {
    if (!currentProfile) return;
    await supabaseClient.from('aktywnosc').insert({
      uzytkownik: currentProfile.imie_nazwisko || currentProfile.email,
      rola: currentProfile.rola,
      akcja,
      opis
    });
  } catch (e) {
    console.warn('Nie zapisano aktywności:', e);
  }
}

async function loadPojazdySystem() {
  await Promise.all([
    loadPojazdyLista(),
    loadAktywneKartyPojazdow(),
    loadHistoriaKartPojazdow()
  ]);

  if (!getVal('pobranieData')) setVal('pobranieData', todayString());
  if (!getVal('pobranieGodzina')) setVal('pobranieGodzina', currentTimeString());
}

async function loadPojazdyLista() {
  const { data, error } = await supabaseClient
    .from('pojazdy')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    const box = document.getElementById('pojazdyLista');
    if (box) box.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    return;
  }

  pojazdyLista = data || [];
  renderPojazdyLista();
  renderPojazdSelect();
}

function renderPojazdyLista() {
  const box = document.getElementById('pojazdyLista');
  if (!box) return;

  if (!pojazdyLista.length) {
    box.innerHTML = '<div class="empty">Brak dodanych radiowozów.</div>';
    return;
  }

  box.innerHTML = pojazdyLista.map(p => `
    <div class="vehicle-card">
      <div class="vehicle-top">
        <div>
          <h4>${escapeHtml(p.marka || '')} ${escapeHtml(p.model || '')}</h4>
          <p class="small">${escapeHtml(p.krypton || '')} | ${escapeHtml(p.numer_rejestracyjny || '')}</p>
        </div>
        <span class="status ${vehicleStatusClass(p.status)}">${escapeHtml(p.status || 'Dostępny')}</span>
      </div>

      
      <div class="vehicle-detail-box">
        <h5>Dane pojazdu</h5>
        <div class="vehicle-detail-grid">
          <div><b>Marka:</b> ${escapeHtml(p.marka || '-')}</div>
          <div><b>Model:</b> ${escapeHtml(p.model || '-')}</div>
          <div><b>Kryptonim:</b> ${escapeHtml(p.krypton || '-')}</div>
          <div><b>Rejestracja:</b> ${escapeHtml(p.numer_rejestracyjny || '-')}</div>
          <div><b>Przebieg:</b> ${p.aktualny_przebieg || 0} km</div>
          <div><b>Paliwo:</b> ${p.aktualne_paliwo ?? 0}%</div>
          <div><b>Silnik:</b> ${p.aktualny_silnik ?? 0}%</div>
          <div><b>Karoseria:</b> ${p.aktualna_karoseria ?? 0}%</div>
        </div>
      </div>


      <div class="vehicle-info">
        <p><b>Przebieg:</b> ${p.aktualny_przebieg || 0} km</p>
        <p><b>Paliwo:</b> ${p.aktualne_paliwo ?? 0}%</p>
        <div class="meter"><span style="width:${p.aktualne_paliwo ?? 0}%"></span></div>
        <p><b>Silnik:</b> ${p.aktualny_silnik ?? 0}%</p>
        <div class="meter"><span style="width:${p.aktualny_silnik ?? 0}%"></span></div>
        <p><b>Karoseria:</b> ${p.aktualna_karoseria ?? 0}%</p>
        <div class="meter"><span style="width:${p.aktualna_karoseria ?? 0}%"></span></div>
      </div>

      ${isDowodcaOrAdminVehicles() ? `
        <div class="action-row">
          <button class="btn-light" onclick="prefillEditPojazd(${p.id})">Edytuj</button>
          <button class="btn-light" onclick="setPojazdStatus(${p.id}, 'Dostępny')">Dostępny</button>
          <button class="btn-light" onclick="setPojazdStatus(${p.id}, 'Warsztat')">Warsztat</button>
          <button class="btn-danger" onclick="setPojazdStatus(${p.id}, 'Uszkodzony')">Uszkodzony</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function renderPojazdSelect() {
  const select = document.getElementById('pobraniePojazdSelect');
  if (!select) return;

  const available = pojazdyLista.filter(p => (p.status || 'Dostępny') === 'Dostępny');

  select.innerHTML = `
    <option value="">Wybierz radiowóz...</option>
    ${available.map(p => `
      <option value="${p.id}">
        ${escapeHtml(p.marka || '')} ${escapeHtml(p.model || '')} | ${escapeHtml(p.krypton || '')} | ${escapeHtml(p.numer_rejestracyjny || '')}
      </option>
    `).join('')}
  `;
}

async function addPojazd() {
  const row = {
    marka: getVal('pojazdMarka'),
    model: getVal('pojazdModel'),
    krypton: getVal('pojazdKrypton'),
    numer_rejestracyjny: getVal('pojazdRejestracja'),
    status: 'Dostępny',
    aktualny_przebieg: getNum('pojazdPrzebieg') || 0,
    aktualne_paliwo: getNum('pojazdPaliwo') ?? 100,
    aktualny_silnik: getNum('pojazdSilnik') ?? 100,
    aktualna_karoseria: getNum('pojazdKaroseria') ?? 100,
    uwagi: getVal('pojazdUwagi')
  };

  if (!row.marka || !row.model || !row.krypton || !row.numer_rejestracyjny) {
    swdMsg('pojazdMsg', 'Uzupełnij markę, model, krypton i numer rejestracyjny.', false);
    return;
  }

  const editingId = getVal('pojazdEditingId');

  if (editingId) {
    const { error } = await supabaseClient
      .from('pojazdy')
      .update(row)
      .eq('id', editingId);

    if (error) return swdMsg('pojazdMsg', error.message, false);
    await logSWDActivityVehicles('pojazd', `Edytowano radiowóz ${row.marka} ${row.model}`);
    swdMsg('pojazdMsg', 'Radiowóz został zaktualizowany.');
  } else {
    const { error } = await supabaseClient
      .from('pojazdy')
      .insert(row);

    if (error) return swdMsg('pojazdMsg', error.message, false);
    await logSWDActivityVehicles('pojazd', `Dodano radiowóz ${row.marka} ${row.model}`);
    swdMsg('pojazdMsg', 'Radiowóz został dodany.');
  }

  clearPojazdForm();
  await loadPojazdySystem();
}

function prefillEditPojazd(id) {
  const p = pojazdyLista.find(x => x.id === id);
  if (!p) return;

  setVal('pojazdEditingId', p.id);
  setVal('pojazdMarka', p.marka);
  setVal('pojazdModel', p.model);
  setVal('pojazdKrypton', p.krypton);
  setVal('pojazdRejestracja', p.numer_rejestracyjny);
  setVal('pojazdPrzebieg', p.aktualny_przebieg);
  setVal('pojazdPaliwo', p.aktualne_paliwo);
  setVal('pojazdSilnik', p.aktualny_silnik);
  setVal('pojazdKaroseria', p.aktualna_karoseria);
  setVal('pojazdUwagi', p.uwagi);

  const title = document.getElementById('pojazdFormTitle');
  if (title) title.innerText = 'Edycja radiowozu';
}

function clearPojazdForm() {
  [
    'pojazdEditingId',
    'pojazdMarka',
    'pojazdModel',
    'pojazdKrypton',
    'pojazdRejestracja',
    'pojazdPrzebieg',
    'pojazdPaliwo',
    'pojazdSilnik',
    'pojazdKaroseria',
    'pojazdUwagi'
  ].forEach(id => setVal(id, ''));

  const title = document.getElementById('pojazdFormTitle');
  if (title) title.innerText = 'Dodaj radiowóz';
}

async function setPojazdStatus(id, status) {
  const { error } = await supabaseClient
    .from('pojazdy')
    .update({ status })
    .eq('id', id);

  if (error) return alert(error.message);
  await logSWDActivityVehicles('pojazd', `Zmieniono status pojazdu na ${status}`);
  await loadPojazdySystem();
}

async function pobierzRadiowoz() {
  const pojazdId = getNum('pobraniePojazdSelect');
  if (!pojazdId) return swdMsg('pobranieMsg', 'Wybierz radiowóz z listy.', false);

  const pojazd = pojazdyLista.find(p => p.id === pojazdId);
  if (!pojazd) return swdMsg('pobranieMsg', 'Nie znaleziono pojazdu.', false);

  const row = {
    pojazd_id: pojazd.id,
    aktywna: true,
    status: 'W patrolu',

    created_by: currentProfile?.imie_nazwisko || currentUser?.email,

    pojazd: `${pojazd.marka || ''} ${pojazd.model || ''}`.trim(),
    krypton: pojazd.krypton,
    numer_rejestracyjny: pojazd.numer_rejestracyjny,

    rozpoczecie_przebieg: getNum('pobraniePrzebieg'),
    rozpoczecie_godzina: getVal('pobranieGodzina'),
    rozpoczecie_data: getVal('pobranieData'),
    rozpoczecie_pobierajacy: currentProfile?.imie_nazwisko || currentUser?.email,
    rozpoczecie_paliwo: getNum('pobraniePaliwo'),
    rozpoczecie_silnik: getNum('pobranieSilnik'),
    rozpoczecie_karoseria: getNum('pobranieKaroseria'),
    uwagi_pobrania: getVal('pobranieUwagi')
  };

  if (!row.rozpoczecie_przebieg || !row.rozpoczecie_godzina || !row.rozpoczecie_data) {
    swdMsg('pobranieMsg', 'Uzupełnij przebieg, godzinę i datę pobrania.', false);
    return;
  }

  const { error } = await supabaseClient
    .from('karty_pojazdow')
    .insert(row);

  if (error) return swdMsg('pobranieMsg', error.message, false);

  const { error: updateError } = await supabaseClient
    .from('pojazdy')
    .update({
      status: 'W patrolu',
      aktualny_przebieg: row.rozpoczecie_przebieg,
      aktualne_paliwo: row.rozpoczecie_paliwo,
      aktualny_silnik: row.rozpoczecie_silnik,
      aktualna_karoseria: row.rozpoczecie_karoseria
    })
    .eq('id', pojazd.id);

  if (updateError) return swdMsg('pobranieMsg', updateError.message, false);

  await logSWDActivityVehicles('pojazd', `Pobrano radiowóz ${row.pojazd} ${row.krypton}`);

  swdMsg('pobranieMsg', 'Radiowóz został pobrany.');
  clearPobranieForm();
  await loadPojazdySystem();
}

function clearPobranieForm() {
  [
    'pobraniePojazdSelect',
    'pobraniePrzebieg',
    'pobranieGodzina',
    'pobranieData',
    'pobraniePaliwo',
    'pobranieSilnik',
    'pobranieKaroseria',
    'pobranieUwagi'
  ].forEach(id => setVal(id, ''));

  setVal('pobranieData', todayString());
  setVal('pobranieGodzina', currentTimeString());
}

async function loadAktywneKartyPojazdow() {
  const { data, error } = await supabaseClient
    .from('karty_pojazdow')
    .select('*')
    .eq('aktywna', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  aktywneKartyPojazdow = data || [];
  renderAktywneKartyPojdow();
}

function renderAktywneKartyPojdow() {
  const box = document.getElementById('aktywneKartyPojazdow');
  if (!box) return;

  if (!aktywneKartyPojazdow.length) {
    box.innerHTML = '<div class="empty">Brak aktywnych patroli.</div>';
    return;
  }

  box.innerHTML = aktywneKartyPojazdow.map(k => `
    <div class="list-item">
      <span class="status">W patrolu</span>
      <h4>${escapeHtml(k.pojazd || '')} — ${escapeHtml(k.krypton || '')}</h4>
      <p><b>Rejestracja:</b> ${escapeHtml(k.numer_rejestracyjny || '')}</p>
      <p><b>Pobrał:</b> ${escapeHtml(k.rozpoczecie_pobierajacy || '')}</p>
      <p><b>Start:</b> ${escapeHtml(k.rozpoczecie_data || '')} ${escapeHtml(k.rozpoczecie_godzina || '')}</p>
      <p><b>Przebieg start:</b> ${k.rozpoczecie_przebieg || 0} km</p>
      <button class="btn-primary" onclick="openZakonczeniePatrolu(${k.id})">Zakończ patrol</button>
    </div>
  `).join('');
}

function openZakonczeniePatrolu(kartaId) {
  const k = aktywneKartyPojazdow.find(x => x.id === kartaId);
  if (!k) return;

  setVal('zakonczenieKartaId', k.id);
  setVal('zakonczeniePojazdInfo', `${k.pojazd || ''} | ${k.krypton || ''} | ${k.numer_rejestracyjny || ''}`);
  setVal('zakonczenieData', todayString());
  setVal('zakonczenieGodzina', currentTimeString());

  const panel = document.getElementById('zakonczeniePanel');
  if (panel) {
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth' });
  }
}

async function zakonczPatrol() {
  const kartaId = getNum('zakonczenieKartaId');
  if (!kartaId) return swdMsg('zakonczenieMsg', 'Nie wybrano aktywnej karty.', false);

  const karta = aktywneKartyPojazdow.find(x => x.id === kartaId);
  if (!karta) return swdMsg('zakonczenieMsg', 'Nie znaleziono aktywnej karty.', false);

  const uszkodzony = document.getElementById('zakonczenieUszkodzenia')?.checked || false;

  const patch = {
    aktywna: false,
    status: 'Zakończony',

    zakonczenie_przebieg: getNum('zakonczeniePrzebieg'),
    zakonczenie_godzina: getVal('zakonczenieGodzina'),
    zakonczenie_data: getVal('zakonczenieData'),
    zakonczenie_zdajacy: currentProfile?.imie_nazwisko || currentUser?.email,
    zakonczenie_paliwo: getNum('zakonczeniePaliwo'),
    zakonczenie_silnik: getNum('zakonczenieSilnik'),
    zakonczenie_karoseria: getNum('zakonczenieKaroseria'),
    uwagi_zwrotu: getVal('zakonczenieUwagi'),
    uszkodzenia: uszkodzony,
    uwagi_uszkodzenia: getVal('zakonczenieUwagiUszkodzenia')
  };

  if (!patch.zakonczenie_przebieg || !patch.zakonczenie_godzina || !patch.zakonczenie_data) {
    swdMsg('zakonczenieMsg', 'Uzupełnij przebieg, godzinę i datę zakończenia.', false);
    return;
  }

  const { error } = await supabaseClient
    .from('karty_pojazdow')
    .update(patch)
    .eq('id', kartaId);

  if (error) return swdMsg('zakonczenieMsg', error.message, false);

  const vehicleStatus = uszkodzony ? 'Uszkodzony' : 'Dostępny';

  const { error: vehicleError } = await supabaseClient
    .from('pojazdy')
    .update({
      status: vehicleStatus,
      aktualny_przebieg: patch.zakonczenie_przebieg,
      aktualne_paliwo: patch.zakonczenie_paliwo,
      aktualny_silnik: patch.zakonczenie_silnik,
      aktualna_karoseria: patch.zakonczenie_karoseria,
      uwagi: patch.uwagi_uszkodzenia || patch.uwagi_zwrotu
    })
    .eq('id', karta.pojazd_id);

  if (vehicleError) return swdMsg('zakonczenieMsg', vehicleError.message, false);

  await logSWDActivityVehicles('pojazd', `Zakończono patrol radiowozem ${karta.pojazd} ${karta.krypton}`);

  swdMsg('zakonczenieMsg', 'Patrol został zakończony.');
  clearZakonczenieForm();
  await loadPojazdySystem();
}

function clearZakonczenieForm() {
  [
    'zakonczenieKartaId',
    'zakonczeniePojazdInfo',
    'zakonczeniePrzebieg',
    'zakonczenieGodzina',
    'zakonczenieData',
    'zakonczeniePaliwo',
    'zakonczenieSilnik',
    'zakonczenieKaroseria',
    'zakonczenieUwagi',
    'zakonczenieUwagiUszkodzenia'
  ].forEach(id => setVal(id, ''));

  const cb = document.getElementById('zakonczenieUszkodzenia');
  if (cb) cb.checked = false;

  document.getElementById('zakonczeniePanel')?.classList.add('hidden');
}

async function loadHistoriaKartPojazdow() {
  const { data, error } = await supabaseClient
    .from('karty_pojazdow')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error(error);
    return;
  }

  historiaKartPojazdow = data || [];
  renderHistoriaKartPojazdow();
}

function renderHistoriaKartPojazdow() {
  const tbody = document.getElementById('historiaKartPojazdow');
  if (!tbody) return;

  if (!historiaKartPojazdow.length) {
    tbody.innerHTML = '<tr><td colspan="8">Brak historii kart pojazdów.</td></tr>';
    return;
  }

  tbody.innerHTML = historiaKartPojazdow.map(k => `
    <tr>
      <td>${escapeHtml((k.created_at || '').slice(0, 10))}</td>
      <td><span class="status ${k.aktywna ? '' : 'sprawdzone'}">${k.aktywna ? 'W patrolu' : 'Zakończony'}</span></td>
      <td>${escapeHtml(k.pojazd || '')}</td>
      <td>${escapeHtml(k.krypton || '')}</td>
      <td>${escapeHtml(k.numer_rejestracyjny || '')}</td>
      <td>${escapeHtml(k.rozpoczecie_pobierajacy || '')}</td>
      <td>${escapeHtml(k.zakonczenie_zdajacy || '-')}</td>
      <td>${k.rozpoczecie_przebieg || 0} → ${k.zakonczenie_przebieg || '-'} km</td>
    </tr>
  `).join('');
}

// Podpięcie do istniejącego showPage, żeby moduł ładował dane po wejściu w zakładkę Pojazdy.
if (typeof showPage === 'function') {
  const oldShowPageVehicles = showPage;
  showPage = function(id, btn) {
    oldShowPageVehicles(id, btn);
    if (id === 'vehicles') {
      setTimeout(loadPojazdySystem, 50);
    }
  };
}

// Start po załadowaniu, gdy użytkownik jest już zalogowany.
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (!document.getElementById('appView')?.classList.contains('hidden')) {
      loadPojazdySystem();
    }
  }, 800);
});
