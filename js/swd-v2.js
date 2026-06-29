/*
  SWD v2.0 - Dokumenty, panel dowódcy, archiwum, podpis, historia.
  Ten plik nadpisuje stare funkcje dokumentów bez ruszania modułu pojazdów.
*/

let swdDocumentsCache = [];
let swdArchiveCache = [];
let swdSelectedDocumentType = 'notatka_sluzbowa';

const SWD_DOC_TYPES = {
  notatka_sluzbowa: { prefix: 'NS', title: 'NOTATKA SŁUŻBOWA' },
  notatka_urzedowa: { prefix: 'NU', title: 'NOTATKA URZĘDOWA' },
  bron_palna: { prefix: 'UBP', title: 'NOTATKA Z UŻYCIA / WYKORZYSTANIA BRONI PALNEJ' },
  paralizator: { prefix: 'UP', title: 'NOTATKA Z UŻYCIA / WYKORZYSTANIA PARALIZATORA' },
  wniosek_o_ukaranie: { prefix: 'WU', title: 'WNIOSEK O UKARANIE' },
  zatrzymanie_dokumentu: { prefix: 'PZD', title: 'POKWITOWANIE ZATRZYMANIA DOKUMENTU' }
};

function safeText(value) {
  return String(value || '').replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[s]));
}

function docVal(id) {
  return document.getElementById(id)?.value || '';
}

function docSet(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function docToday() {
  return new Date().toISOString().slice(0, 10);
}

function docNowTime() {
  return new Date().toTimeString().slice(0, 5);
}

function currentOfficerName() {
  return `${currentProfile?.stopien || ''} ${currentProfile?.imie_nazwisko || currentUser?.email || ''}`.trim();
}

function isCommanderV2() {
  return ['admin', 'dowodca', 'zastepca', 'koordynator'].includes(currentProfile?.rola);
}

async function logActivityV2(akcja, opis) {
  try {
    await supabaseClient.from('aktywnosc').insert({
      uzytkownik: currentProfile?.imie_nazwisko || currentProfile?.email || currentUser?.email,
      rola: currentProfile?.rola || 'brak',
      akcja,
      opis
    });
  } catch (e) {
    console.warn('Aktywność nie została zapisana:', e);
  }
}

async function logHistoryV2(tabela, rekord_id, akcja, opis, dane_przed = null, dane_po = null) {
  try {
    await supabaseClient.from('historia_zmian').insert({
      tabela,
      rekord_id,
      akcja,
      opis,
      uzytkownik: currentProfile?.imie_nazwisko || currentProfile?.email || currentUser?.email,
      rola: currentProfile?.rola || 'brak',
      dane_przed,
      dane_po
    });
  } catch (e) {
    console.warn('Historia nie została zapisana:', e);
  }
}

function selectDocumentType(type) {
  swdSelectedDocumentType = type;
  docSet('docType', type);

  document.querySelectorAll('.doc-type-card').forEach(card => card.classList.remove('active'));
  const cards = [...document.querySelectorAll('.doc-type-card')];
  const index = Object.keys(SWD_DOC_TYPES).indexOf(type);
  if (cards[index]) cards[index].classList.add('active');

  renderDocumentFormV2();
}

function renderDocumentFormV2() {
  const type = docVal('docType') || swdSelectedDocumentType;
  const meta = SWD_DOC_TYPES[type] || SWD_DOC_TYPES.notatka_sluzbowa;
  const officer = currentOfficerName();
  const badge = currentProfile?.numer_sluzbowy || '';

  let fields = '';

  if (type === 'notatka_sluzbowa') {
    fields = `
      ${fieldGrid([
        ['Data zdarzenia', 'data_zdarzenia', 'date', docToday()],
        ['Godzina', 'godzina_zdarzenia', 'time', docNowTime()],
        ['Miejsce', 'miejsce', 'text', ''],
        ['Patrol', 'patrol', 'text', ''],
        ['Uczestnicy', 'uczestnicy', 'text', ''],
        ['Kwalifikacja / temat', 'kwalifikacja', 'text', '']
      ])}
      ${textareaField('Przebieg zdarzenia', 'przebieg_zdarzenia')}
      ${textareaField('Wykonane czynności', 'czynnosci')}
      ${textareaField('Uwagi', 'uwagi')}
    `;
  }

  if (type === 'notatka_urzedowa') {
    fields = `
      ${fieldGrid([
        ['Data', 'data_zdarzenia', 'date', docToday()],
        ['Godzina', 'godzina_zdarzenia', 'time', docNowTime()],
        ['Miejsce sporządzenia', 'miejsce', 'text', ''],
        ['Dotyczy', 'dotyczy', 'text', '']
      ])}
      ${textareaField('Treść notatki urzędowej', 'tresc')}
      ${textareaField('Wnioski / ustalenia', 'wnioski')}
    `;
  }

  if (type === 'bron_palna') {
    fields = `
      ${fieldGrid([
        ['Data użycia', 'data_zdarzenia', 'date', docToday()],
        ['Godzina', 'godzina_zdarzenia', 'time', docNowTime()],
        ['Miejsce', 'miejsce', 'text', ''],
        ['Numer seryjny broni', 'numer_seryjny_broni', 'text', ''],
        ['Liczba oddanych strzałów', 'liczba_strzalow', 'number', ''],
        ['Osoba / pojazd / obiekt', 'wobec_kogo', 'text', '']
      ])}
      ${textareaField('Powód użycia / wykorzystania', 'powod')}
      ${textareaField('Przebieg użycia / wykorzystania', 'przebieg')}
      ${textareaField('Skutki użycia / uwagi', 'skutki')}
    `;
  }

  if (type === 'paralizator') {
    fields = `
      ${fieldGrid([
        ['Data użycia', 'data_zdarzenia', 'date', docToday()],
        ['Godzina', 'godzina_zdarzenia', 'time', docNowTime()],
        ['Miejsce', 'miejsce', 'text', ''],
        ['Osoba, wobec której użyto', 'wobec_kogo', 'text', '']
      ])}
      ${textareaField('Powód użycia / wykorzystania', 'powod')}
      ${textareaField('Przebieg użycia / wykorzystania', 'przebieg')}
      ${textareaField('Skutki użycia / uwagi', 'skutki')}
    `;
  }

  if (type === 'wniosek_o_ukaranie') {
    fields = `
      ${fieldGrid([
        ['Data czynu', 'data_zdarzenia', 'date', docToday()],
        ['Godzina', 'godzina_zdarzenia', 'time', docNowTime()],
        ['Miejsce', 'miejsce', 'text', ''],
        ['Dane sprawcy', 'sprawca', 'text', ''],
        ['Pojazd / rejestracja', 'pojazd', 'text', ''],
        ['Podstawa / artykuł', 'artykul', 'text', '']
      ])}
      ${textareaField('Opis czynu', 'opis_czynu')}
      ${textareaField('Świadkowie / dowody', 'dowody')}
      ${textareaField('Wnoszę o', 'wniosek')}
    `;
  }

  if (type === 'zatrzymanie_dokumentu') {
    fields = `
      ${fieldGrid([
        ['Data', 'data_zdarzenia', 'date', docToday()],
        ['Godzina', 'godzina_zdarzenia', 'time', docNowTime()],
        ['Miejsce', 'miejsce', 'text', ''],
        ['Dane kierującego', 'kierujacy', 'text', ''],
        ['Pojazd / rejestracja', 'pojazd', 'text', ''],
        ['Zatrzymany dokument', 'dokument', 'text', '']
      ])}
      ${textareaField('Powód zatrzymania dokumentu', 'powod')}
      ${textareaField('Pouczono / uwagi', 'uwagi')}
    `;
  }

  const html = `
    <div class="doc-paper" id="docPreview">
      <div class="doc-paper-header">
        <div>
          <strong>KOMENDA MIEJSKA POLICJI W KRAKOWIE</strong><br>
          System SWD
        </div>
        <div>
          Kraków, dn. <input class="doc-input" id="data_sporzadzenia" type="date" value="${docToday()}">
        </div>
      </div>

      <h2>${meta.title}</h2>

      <div class="doc-grid">
        <div class="doc-field">
          <label class="doc-label">Funkcjonariusz</label>
          <input class="doc-input" id="funkcjonariusz" value="${safeText(officer)}">
        </div>
        <div class="doc-field">
          <label class="doc-label">Numer służbowy</label>
          <input class="doc-input" id="numer_sluzbowy" value="${safeText(badge)}">
        </div>
      </div>

      ${fields}

      <div class="doc-field">
        <label class="doc-label">Załączniki / dodatkowe uwagi</label>
        <textarea class="doc-input" id="zalaczniki" rows="3"></textarea>
      </div>

      <div class="doc-signature">podpis funkcjonariusza</div>
    </div>
  `;

  document.getElementById('documentFormHost').innerHTML = html;
  docSet('editingDocumentId', '');
}

function fieldGrid(items) {
  return `
    <div class="doc-grid-3">
      ${items.map(([label, id, type, value]) => `
        <div class="doc-field">
          <label class="doc-label">${label}</label>
          <input class="doc-input" data-doc="${id}" type="${type}" value="${safeText(value)}">
        </div>
      `).join('')}
    </div>
  `;
}

function textareaField(label, id) {
  return `
    <div class="doc-field">
      <label class="doc-label">${label}</label>
      <textarea class="doc-input" data-doc="${id}" rows="5"></textarea>
    </div>
  `;
}

function collectDocumentDataV2() {
  const data = {
    data_sporzadzenia: docVal('data_sporzadzenia'),
    funkcjonariusz: docVal('funkcjonariusz'),
    numer_sluzbowy: docVal('numer_sluzbowy'),
    zalaczniki: docVal('zalaczniki')
  };

  document.querySelectorAll('[data-doc]').forEach(el => {
    data[el.dataset.doc] = el.value;
  });

  return data;
}

async function generateDocumentNumberV2(type) {
  const { data, error } = await supabaseClient
    .from('numeracja_dokumentow')
    .select('*')
    .eq('typ', type)
    .single();

  if (error || !data) {
    const fallback = SWD_DOC_TYPES[type]?.prefix || 'DOC';
    return `${fallback}/${new Date().getFullYear()}/${Date.now()}`;
  }

  const year = new Date().getFullYear();
  const next = data.rok !== year ? 1 : (data.ostatni_numer || 0) + 1;

  await supabaseClient
    .from('numeracja_dokumentow')
    .update({ rok: year, ostatni_numer: next })
    .eq('typ', type);

  return `${data.prefix}/${year}/${String(next).padStart(6, '0')}`;
}

async function submitDocumentV2(status = 'oczekuje') {
  const type = docVal('docType') || swdSelectedDocumentType;
  const meta = SWD_DOC_TYPES[type] || SWD_DOC_TYPES.notatka_sluzbowa;
  const tresc = collectDocumentDataV2();
  const editingId = docVal('editingDocumentId');

  let number = null;
  if (status !== 'szkic' || !editingId) {
    number = await generateDocumentNumberV2(type);
  }

  const row = {
    status,
    typ_dokumentu: type,
    tytul: meta.title,
    funkcjonariusz: currentProfile?.imie_nazwisko || currentUser?.email,
    stopien: currentProfile?.stopien || '',
    numer_sluzbowy: currentProfile?.numer_sluzbowy || '',
    tresc
  };

  if (number) row.numer_dokumentu = number;

  if (editingId) {
    const { error } = await supabaseClient
      .from('dokumenty')
      .update(row)
      .eq('id', editingId);

    if (error) return showDocMessage(error.message, false);

    await logActivityV2('dokument', `Zaktualizowano dokument ${number || editingId}`);
    await logHistoryV2('dokumenty', Number(editingId), 'edycja', 'Zaktualizowano dokument', null, row);
    showDocMessage('Dokument został zaktualizowany.');
  } else {
    const { data, error } = await supabaseClient
      .from('dokumenty')
      .insert(row)
      .select()
      .single();

    if (error) return showDocMessage(error.message, false);

    await logActivityV2('dokument', `Utworzono dokument ${row.numer_dokumentu || ''}`);
    await logHistoryV2('dokumenty', data?.id, 'utworzono', `Utworzono dokument ${row.numer_dokumentu || ''}`, null, row);
    showDocMessage(status === 'szkic' ? 'Szkic został zapisany.' : `Dokument przesłany. Numer: ${row.numer_dokumentu}`);
  }

  resetDocumentForm();
  await loadMyDocumentsV2();
  if (isCommanderV2()) await loadCommanderDocuments();
}

async function saveDocumentDraft() {
  await submitDocumentV2('szkic');
}

function showDocMessage(text, ok = true) {
  const el = document.getElementById('docMsg');
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? '#187a2f' : '#b00020';
}

function resetDocumentForm() {
  renderDocumentFormV2();
}

function getDocumentPreviewText(doc) {
  const t = doc.tresc || {};
  return t.przebieg_zdarzenia || t.tresc || t.powod || t.opis_czynu || t.powod || t.uwagi || '';
}

function documentItemHTML(doc, commander = false) {
  const preview = getDocumentPreviewText(doc);
  const comment = doc.uwagi_dowodcy ? `<div class="comment-box"><b>Komentarz dowódcy:</b><br>${safeText(doc.uwagi_dowodcy)}</div>` : '';
  const signature = doc.podpis_elektroniczny ? `<div class="comment-box"><b>Podpis elektroniczny:</b><br>${safeText(doc.podpis_elektroniczny)}</div>` : '';

  return `
    <div class="list-item">
      <span class="status ${safeText(doc.status)}">${safeText(doc.status || '')}</span>
      <h4>${safeText(doc.numer_dokumentu || 'BEZ NUMERU')} — ${safeText(doc.tytul || doc.typ_dokumentu || '')}</h4>
      <p><b>Autor:</b> ${safeText(doc.stopien || '')} ${safeText(doc.funkcjonariusz || '')}</p>
      <p class="small"><b>Data:</b> ${safeText((doc.created_at || '').slice(0,16).replace('T',' '))}</p>
      <p>${safeText(preview).slice(0, 500)}${preview.length > 500 ? '...' : ''}</p>
      ${comment}
      ${signature}

      <div class="doc-toolbar">
        <button class="btn-light" onclick="openDocumentView(${doc.id})">Otwórz</button>
        ${doc.status === 'do_poprawy' && !commander ? `<button class="btn-light" onclick="editDocumentV2(${doc.id})">Popraw</button>` : ''}
        ${commander ? `
          <button class="btn-primary" onclick="approveDocument(${doc.id})">Zatwierdź</button>
          <button class="btn-light" onclick="returnDocumentForCorrection(${doc.id})">Do poprawy</button>
          <button class="btn-light" onclick="rejectDocument(${doc.id})">Odrzuć</button>
          <button class="btn-danger" onclick="moveDocumentToTrash(${doc.id})">Do kosza</button>
        ` : ''}
      </div>
    </div>
  `;
}

async function loadMyDocumentsV2() {
  if (!currentProfile) return;

  const { data, error } = await supabaseClient
    .from('dokumenty')
    .select('*')
    .is('deleted_at', null)
    .eq('funkcjonariusz', currentProfile.imie_nazwisko || currentUser?.email)
    .order('created_at', { ascending: false })
    .limit(100);

  const box = document.getElementById('myDocsList');
  if (!box) return;

  if (error) {
    box.innerHTML = `<div class="empty">${safeText(error.message)}</div>`;
    return;
  }

  box.innerHTML = (data || []).map(d => documentItemHTML(d, false)).join('') || '<div class="empty">Brak dokumentów.</div>';
}

async function loadCommanderDocuments() {
  if (!isCommanderV2()) return;

  const { data, error } = await supabaseClient
    .from('dokumenty')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(300);

  const box = document.getElementById('commanderDocsList');
  if (error && box) {
    box.innerHTML = `<div class="empty">${safeText(error.message)}</div>`;
    return;
  }

  swdDocumentsCache = data || [];
  renderCommanderDocuments();
}

function renderCommanderDocuments() {
  const box = document.getElementById('commanderDocsList');
  if (!box) return;

  const filter = docVal('docFilter');
  const search = docVal('commanderSearch').toLowerCase();

  const docs = swdDocumentsCache.filter(doc => {
    const hay = `${doc.numer_dokumentu || ''} ${doc.tytul || ''} ${doc.funkcjonariusz || ''} ${doc.status || ''} ${JSON.stringify(doc.tresc || {})}`.toLowerCase();
    return (!filter || doc.status === filter) && hay.includes(search);
  });

  box.innerHTML = docs.map(d => documentItemHTML(d, true)).join('') || '<div class="empty">Brak dokumentów.</div>';
}

async function approveDocument(id) {
  const podpis = `Zatwierdzono elektronicznie przez ${currentOfficerName()} dnia ${new Date().toLocaleString('pl-PL')}`;
  const patch = {
    status: 'sprawdzone',
    sprawdzone_przez: currentProfile?.imie_nazwisko || currentUser?.email,
    sprawdzone_at: new Date().toISOString(),
    zatwierdzone_przez: currentProfile?.imie_nazwisko || currentUser?.email,
    zatwierdzone_at: new Date().toISOString(),
    podpis_elektroniczny: podpis,
    uwagi_dowodcy: docPrompt('Komentarz dowódcy przy zatwierdzeniu (opcjonalnie):')
  };

  await updateDocumentStatus(id, patch, 'zatwierdzono');
}

async function returnDocumentForCorrection(id) {
  const comment = docPrompt('Podaj powód odesłania do poprawy:');
  if (comment === null) return;

  const patch = {
    status: 'do_poprawy',
    uwagi_dowodcy: comment,
    sprawdzone_przez: currentProfile?.imie_nazwisko || currentUser?.email,
    sprawdzone_at: new Date().toISOString()
  };

  await updateDocumentStatus(id, patch, 'do_poprawy');
}

async function rejectDocument(id) {
  const comment = docPrompt('Podaj powód odrzucenia:');
  if (comment === null) return;

  const patch = {
    status: 'odrzucone',
    uwagi_dowodcy: comment,
    sprawdzone_przez: currentProfile?.imie_nazwisko || currentUser?.email,
    sprawdzone_at: new Date().toISOString()
  };

  await updateDocumentStatus(id, patch, 'odrzucono');
}

function docPrompt(text) {
  return prompt(text);
}

async function updateDocumentStatus(id, patch, action) {
  const { error } = await supabaseClient
    .from('dokumenty')
    .update(patch)
    .eq('id', id);

  if (error) return alert(error.message);

  await logActivityV2('dokument', `${action} dokument ID ${id}`);
  await logHistoryV2('dokumenty', id, action, `Zmieniono status dokumentu: ${action}`, null, patch);
  await loadCommanderDocuments();
  await loadArchive();
}

async function moveDocumentToTrash(id) {
  if (!confirm('Przenieść dokument do kosza?')) return;

  const patch = {
    deleted_at: new Date().toISOString(),
    deleted_by: currentProfile?.imie_nazwisko || currentUser?.email,
    status: 'usuniety'
  };

  const { error } = await supabaseClient
    .from('dokumenty')
    .update(patch)
    .eq('id', id);

  if (error) return alert(error.message);

  await logActivityV2('dokument', `Przeniesiono dokument ID ${id} do kosza`);
  await logHistoryV2('dokumenty', id, 'kosz', 'Przeniesiono dokument do kosza', null, patch);
  await loadCommanderDocuments();
  await loadTrash();
}

async function openDocumentView(id) {
  const doc = [...swdDocumentsCache, ...swdArchiveCache].find(d => d.id === id);
  if (!doc) {
    const { data } = await supabaseClient.from('dokumenty').select('*').eq('id', id).single();
    if (!data) return alert('Nie znaleziono dokumentu.');
    return showDocumentModal(data);
  }
  showDocumentModal(doc);
}

function showDocumentModal(doc) {
  const rows = Object.entries(doc.tresc || {}).map(([k,v]) => `
    <div class="doc-view-row"><b>${safeText(labelize(k))}</b><span>${safeText(v)}</span></div>
  `).join('');

  const html = `
    <div class="doc-view" id="singleDocView">
      <h3>${safeText(doc.numer_dokumentu || '')} — ${safeText(doc.tytul || '')}</h3>
      <p><b>Status:</b> ${safeText(doc.status || '')}</p>
      <p><b>Autor:</b> ${safeText(doc.stopien || '')} ${safeText(doc.funkcjonariusz || '')}</p>
      ${rows}
      ${doc.uwagi_dowodcy ? `<div class="comment-box"><b>Komentarz dowódcy:</b><br>${safeText(doc.uwagi_dowodcy)}</div>` : ''}
      ${doc.podpis_elektroniczny ? `<div class="comment-box"><b>Podpis elektroniczny:</b><br>${safeText(doc.podpis_elektroniczny)}</div>` : ''}
    </div>
  `;

  const w = window.open('', '_blank', 'width=900,height=900');
  w.document.write(`
    <html>
      <head>
        <title>${safeText(doc.numer_dokumentu || 'Dokument')}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:25px;background:#f1f5f9}
          .doc-view{background:#fff;border:1px solid #ddd;padding:24px;border-radius:12px}
          .doc-view-row{display:grid;grid-template-columns:230px 1fr;gap:10px;border-bottom:1px solid #eee;padding:8px 0}
          .comment-box{background:#f8fafc;border-left:4px solid #0b2b4d;padding:10px;border-radius:8px;margin-top:10px}
          button{padding:10px 14px;margin-bottom:12px}
        </style>
      </head>
      <body>
        <button onclick="window.print()">Drukuj / PDF</button>
        ${html}
      </body>
    </html>
  `);
  w.document.close();
}

function labelize(key) {
  return key.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function editDocumentV2(id) {
  const { data, error } = await supabaseClient
    .from('dokumenty')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return alert(error.message);

  selectDocumentType(data.typ_dokumentu);
  docSet('editingDocumentId', data.id);

  const t = data.tresc || {};
  Object.entries(t).forEach(([key, value]) => {
    const el = document.querySelector(`[data-doc="${key}"]`) || document.getElementById(key);
    if (el) el.value = value || '';
  });

  showPage('documents');
}

async function loadArchive() {
  if (!isCommanderV2()) return;

  const { data, error } = await supabaseClient
    .from('dokumenty')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(500);

  const box = document.getElementById('archiveList');
  if (error && box) {
    box.innerHTML = `<div class="empty">${safeText(error.message)}</div>`;
    return;
  }

  swdArchiveCache = data || [];
  renderArchive();
}

function renderArchive() {
  const box = document.getElementById('archiveList');
  if (!box) return;

  const search = docVal('archiveSearch').toLowerCase();
  const status = docVal('archiveStatus');
  const from = docVal('archiveFrom');
  const to = docVal('archiveTo');

  const docs = swdArchiveCache.filter(doc => {
    const day = (doc.created_at || '').slice(0,10);
    const hay = `${doc.numer_dokumentu || ''} ${doc.tytul || ''} ${doc.funkcjonariusz || ''} ${doc.status || ''} ${JSON.stringify(doc.tresc || {})}`.toLowerCase();
    return hay.includes(search)
      && (!status || doc.status === status)
      && (!from || day >= from)
      && (!to || day <= to);
  });

  box.innerHTML = docs.map(d => documentItemHTML(d, false)).join('') || '<div class="empty">Brak wyników.</div>';
}

function exportDocumentsCSV() {
  const rows = swdArchiveCache.map(d => [
    d.numer_dokumentu,
    d.tytul,
    d.typ_dokumentu,
    d.status,
    d.funkcjonariusz,
    (d.created_at || '').slice(0,10)
  ]);

  const csv = 'numer;tytul;typ;status;funkcjonariusz;data\n'
    + rows.map(r => r.map(x => `"${String(x || '').replaceAll('"','""')}"`).join(';')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'archiwum_dokumentow.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function loadTrash() {
  if (!isCommanderV2()) return;

  const { data, error } = await supabaseClient
    .from('dokumenty')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(300);

  const box = document.getElementById('trashList');
  if (!box) return;

  if (error) {
    box.innerHTML = `<div class="empty">${safeText(error.message)}</div>`;
    return;
  }

  box.innerHTML = (data || []).map(d => `
    <div class="list-item">
      <span class="status usuniety">kosz</span>
      <h4>${safeText(d.numer_dokumentu || '')} — ${safeText(d.tytul || '')}</h4>
      <p>Usunięto: ${safeText((d.deleted_at || '').slice(0,16).replace('T',' '))} przez ${safeText(d.deleted_by || '')}</p>
      <button class="btn-light" onclick="restoreDocument(${d.id})">Przywróć</button>
    </div>
  `).join('') || '<div class="empty">Kosz pusty.</div>';
}

async function restoreDocument(id) {
  const { error } = await supabaseClient
    .from('dokumenty')
    .update({
      deleted_at: null,
      deleted_by: null,
      status: 'oczekuje'
    })
    .eq('id', id);

  if (error) return alert(error.message);

  await logActivityV2('dokument', `Przywrócono dokument ID ${id}`);
  await logHistoryV2('dokumenty', id, 'przywrócono', 'Przywrócono dokument z kosza');
  await loadTrash();
  await loadCommanderDocuments();
}

async function loadSettingsV2() {
  const { data, error } = await supabaseClient
    .from('numeracja_dokumentow')
    .select('*')
    .order('typ');

  const box = document.getElementById('numberingSettings');
  if (!box) return;

  if (error) {
    box.innerHTML = `<div class="empty">${safeText(error.message)}</div>`;
    return;
  }

  box.innerHTML = (data || []).map(n => `
    <div class="list-item">
      <h4>${safeText(n.typ)}</h4>
      <p>Prefix: <b>${safeText(n.prefix)}</b> | Rok: ${safeText(n.rok)} | Ostatni numer: ${safeText(n.ostatni_numer)}</p>
    </div>
  `).join('') || '<div class="empty">Brak numeracji.</div>';
}

async function loadActivity() {
  const { data, error } = await supabaseClient
    .from('aktywnosc')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(150);

  const box = document.getElementById('activityList');
  if (!box) return;

  if (error) {
    box.innerHTML = `<div class="empty">${safeText(error.message)}</div>`;
    return;
  }

  box.innerHTML = (data || []).map(a => `
    <div class="list-item">
      <h4>${safeText(a.akcja || '')}</h4>
      <p>${safeText(a.opis || '')}</p>
      <p class="small">${safeText(a.uzytkownik || '')} | ${safeText(a.rola || '')} | ${safeText((a.created_at || '').slice(0,16).replace('T',' '))}</p>
    </div>
  `).join('') || '<div class="empty">Brak aktywności.</div>';
}

// Podpięcie do starego showPage.
if (typeof showPage === 'function') {
  const oldShowPageV2 = showPage;
  showPage = function(id, btn) {
    oldShowPageV2(id, btn);

    if (id === 'documents') {
      setTimeout(() => {
        if (!document.getElementById('documentFormHost')?.innerHTML.trim()) renderDocumentFormV2();
        loadMyDocumentsV2();
      }, 50);
    }

    if (id === 'commanderDocs') setTimeout(loadCommanderDocuments, 50);
    if (id === 'archive') setTimeout(loadArchive, 50);
    if (id === 'trash') setTimeout(loadTrash, 50);
    if (id === 'activity') setTimeout(loadActivity, 50);
    if (id === 'settings') setTimeout(loadSettingsV2, 50);
  };
}

// Stare nazwy funkcji zostają jako aliasy.
function updateDocTitle() { renderDocumentFormV2(); }
function submitDocument(event) {
  if (event) event.preventDefault();
  return submitDocumentV2('oczekuje');
}
function loadMyDocuments() { return loadMyDocumentsV2(); }
function downloadCurrentDocumentPDF() {
  const element = document.getElementById('docPreview');
  if (!element) return alert('Brak dokumentu do pobrania.');
  html2pdf().set({
    margin: [10,10,10,10],
    filename: (docVal('docType') || 'dokument') + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(element).save();
}

// Start.
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (document.getElementById('documentFormHost')) renderDocumentFormV2();
  }, 600);
});
