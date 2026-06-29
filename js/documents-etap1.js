/*
  SWD - Dokumenty 2.0 bez zatwierdzania dowódcy.
  Dokument zapisuje się od razu jako status "zapisany".
*/

let doc2CurrentType = 'notatka_sluzbowa';

const DOC2_TYPES = {
  notatka_sluzbowa: { prefix:'NS', title:'NOTATKA SŁUŻBOWA' },
  notatka_urzedowa: { prefix:'NU', title:'NOTATKA URZĘDOWA' },
  wniosek_o_ukaranie: { prefix:'WU', title:'WNIOSEK O UKARANIE' },
  zatrzymanie_dokumentu: { prefix:'PZD', title:'POKWITOWANIE ZATRZYMANIA DOKUMENTU' },
  bron_palna: { prefix:'UBP', title:'NOTATKA Z UŻYCIA / WYKORZYSTANIA BRONI PALNEJ' },
  paralizator: { prefix:'UP', title:'NOTATKA Z UŻYCIA / WYKORZYSTANIA PARALIZATORA' }
};

function doc2Escape(v){
  return String(v || '').replace(/[&<>"']/g, s => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[s]));
}

function doc2Today(){ return new Date().toISOString().slice(0,10); }
function doc2Time(){ return new Date().toTimeString().slice(0,5); }
function doc2Val(id){ return document.getElementById(id)?.value || ''; }
function doc2Set(id, value){ const el=document.getElementById(id); if(el) el.value=value ?? ''; }

function doc2Officer(){
  return `${currentProfile?.stopien || ''} ${currentProfile?.imie_nazwisko || currentUser?.email || ''}`.trim();
}

function doc2SelectType(type){
  doc2CurrentType = type;
  doc2Set('doc2Type', type);
  document.querySelectorAll('.doc2-type').forEach(e => e.classList.remove('active'));
  const keys = Object.keys(DOC2_TYPES);
  const idx = keys.indexOf(type);
  const btn = document.querySelectorAll('.doc2-type')[idx];
  if(btn) btn.classList.add('active');
  doc2RenderForm();
}

function doc2Field(label, id, type='text', value=''){
  return `<div class="doc2-field">
    <label>${label}</label>
    <input data-doc2="${id}" id="doc2_${id}" type="${type}" value="${doc2Escape(value)}">
  </div>`;
}

function doc2Area(label, id, rows=5){
  return `<div class="doc2-field">
    <label>${label}</label>
    <textarea data-doc2="${id}" id="doc2_${id}" rows="${rows}"></textarea>
  </div>`;
}

function doc2Grid(items, cols=3){
  return `<div class="${cols === 2 ? 'doc2-grid' : 'doc2-grid-3'}">${items.join('')}</div>`;
}

function doc2RenderForm(){
  const type = doc2Val('doc2Type') || doc2CurrentType;
  const meta = DOC2_TYPES[type] || DOC2_TYPES.notatka_sluzbowa;

  let fields = '';

  if(type === 'notatka_sluzbowa'){
    fields = `
      ${doc2Grid([
        doc2Field('Data zdarzenia','data_zdarzenia','date',doc2Today()),
        doc2Field('Godzina','godzina','time',doc2Time()),
        doc2Field('Miejsce','miejsce'),
        doc2Field('Patrol','patrol'),
        doc2Field('Uczestnicy','uczestnicy'),
        doc2Field('Kwalifikacja / temat','kwalifikacja')
      ])}
      ${doc2Area('Przebieg zdarzenia','przebieg_zdarzenia',7)}
      ${doc2Area('Wykonane czynności','czynnosci',5)}
      ${doc2Area('Uwagi','uwagi',4)}
    `;
  }

  if(type === 'notatka_urzedowa'){
    fields = `
      ${doc2Grid([
        doc2Field('Data','data','date',doc2Today()),
        doc2Field('Godzina','godzina','time',doc2Time()),
        doc2Field('Miejsce sporządzenia','miejsce'),
        doc2Field('Dotyczy','dotyczy')
      ], 2)}
      ${doc2Area('Treść notatki urzędowej','tresc',8)}
      ${doc2Area('Wnioski / ustalenia','wnioski',5)}
    `;
  }

  if(type === 'wniosek_o_ukaranie'){
    fields = `
      ${doc2Grid([
        doc2Field('Data czynu','data_czynu','date',doc2Today()),
        doc2Field('Godzina','godzina','time',doc2Time()),
        doc2Field('Miejsce','miejsce'),
        doc2Field('Dane sprawcy','sprawca'),
        doc2Field('Pojazd / rejestracja','pojazd'),
        doc2Field('Artykuł / podstawa','artykul')
      ])}
      ${doc2Area('Opis czynu','opis_czynu',7)}
      ${doc2Area('Świadkowie / dowody','dowody',4)}
      ${doc2Area('Wnoszę o','wniosek',4)}
    `;
  }

  if(type === 'zatrzymanie_dokumentu'){
    fields = `
      ${doc2Grid([
        doc2Field('Data','data','date',doc2Today()),
        doc2Field('Godzina','godzina','time',doc2Time()),
        doc2Field('Miejsce','miejsce'),
        doc2Field('Dane kierującego','kierujacy'),
        doc2Field('Pojazd / rejestracja','pojazd'),
        doc2Field('Zatrzymany dokument','dokument')
      ])}
      ${doc2Area('Powód zatrzymania dokumentu','powod',6)}
      ${doc2Area('Pouczono / uwagi','uwagi',4)}
    `;
  }

  if(type === 'bron_palna'){
    fields = `
      ${doc2Grid([
        doc2Field('Data użycia','data','date',doc2Today()),
        doc2Field('Godzina','godzina','time',doc2Time()),
        doc2Field('Miejsce','miejsce'),
        doc2Field('Numer seryjny broni','numer_seryjny_broni'),
        doc2Field('Liczba oddanych strzałów','liczba_strzalow','number'),
        doc2Field('Wobec kogo / czego','wobec_kogo')
      ])}
      ${doc2Area('Powód użycia / wykorzystania','powod',5)}
      ${doc2Area('Przebieg użycia / wykorzystania','przebieg',6)}
      ${doc2Area('Skutki / uwagi','skutki',4)}
    `;
  }

  if(type === 'paralizator'){
    fields = `
      ${doc2Grid([
        doc2Field('Data użycia','data','date',doc2Today()),
        doc2Field('Godzina','godzina','time',doc2Time()),
        doc2Field('Miejsce','miejsce'),
        doc2Field('Osoba, wobec której użyto','wobec_kogo')
      ], 2)}
      ${doc2Area('Powód użycia / wykorzystania','powod',5)}
      ${doc2Area('Przebieg użycia / wykorzystania','przebieg',6)}
      ${doc2Area('Skutki / uwagi','skutki',4)}
    `;
  }

  document.getElementById('doc2FormHost').innerHTML = `
    <div class="doc2-paper" id="doc2Preview">
      <div class="doc2-paper-head">
        <div><strong>KOMENDA MIEJSKA POLICJI W KRAKOWIE</strong><br>System SWD</div>
        <div>Kraków, dn. <input id="doc2_data_sporzadzenia" type="date" value="${doc2Today()}"></div>
      </div>

      <h2>${meta.title}</h2>

      ${doc2Grid([
        doc2Field('Funkcjonariusz','funkcjonariusz','text',doc2Officer()),
        doc2Field('Numer służbowy','numer_sluzbowy','text',currentProfile?.numer_sluzbowy || '')
      ], 2)}

      ${fields}

      ${doc2Area('Załączniki / dodatkowe uwagi','zalaczniki',3)}

      <div class="doc2-sign">podpis funkcjonariusza</div>
    </div>
  `;
}

function doc2Collect(){
  const data = {
    data_sporzadzenia: doc2Val('doc2_data_sporzadzenia')
  };
  document.querySelectorAll('[data-doc2]').forEach(el => {
    data[el.dataset.doc2] = el.value;
  });
  return data;
}

async function doc2GenerateNumber(type){
  const { data, error } = await supabaseClient
    .from('numeracja_dokumentow')
    .select('*')
    .eq('typ', type)
    .single();

  if(error || !data){
    return `${DOC2_TYPES[type]?.prefix || 'DOC'}/${new Date().getFullYear()}/${Date.now()}`;
  }

  const year = new Date().getFullYear();
  const next = data.rok !== year ? 1 : (data.ostatni_numer || 0) + 1;

  await supabaseClient
    .from('numeracja_dokumentow')
    .update({ rok: year, ostatni_numer: next })
    .eq('typ', type);

  return `${data.prefix}/${year}/${String(next).padStart(6,'0')}`;
}

async function doc2Save(){
  const type = doc2Val('doc2Type') || doc2CurrentType;
  const meta = DOC2_TYPES[type];
  const number = await doc2GenerateNumber(type);

  const row = {
    status: 'zapisany',
    typ_dokumentu: type,
    tytul: meta.title,
    numer_dokumentu: number,
    funkcjonariusz: currentProfile?.imie_nazwisko || currentUser?.email,
    stopien: currentProfile?.stopien || '',
    numer_sluzbowy: currentProfile?.numer_sluzbowy || '',
    tresc: doc2Collect()
  };

  const { data, error } = await supabaseClient
    .from('dokumenty')
    .insert(row)
    .select()
    .single();

  if(error){
    const msg = document.getElementById('doc2Msg');
    if(msg){ msg.textContent = error.message; msg.style.color = '#b00020'; }
    return;
  }

  try{
    await supabaseClient.from('aktywnosc').insert({
      uzytkownik: currentProfile?.imie_nazwisko || currentUser?.email,
      rola: currentProfile?.rola || 'funkcjonariusz',
      akcja: 'dokument',
      opis: `Utworzono dokument ${number}`
    });
  }catch(e){}

  const msg = document.getElementById('doc2Msg');
  if(msg){ msg.textContent = `Dokument zapisany. Numer: ${number}`; msg.style.color = '#187a2f'; }

  doc2Reset();
  await doc2LoadMine();
}

async function doc2LoadMine(){
  if(!currentProfile) return;

  const { data, error } = await supabaseClient
    .from('dokumenty')
    .select('*')
    .is('deleted_at', null)
    .eq('funkcjonariusz', currentProfile?.imie_nazwisko || currentUser?.email)
    .order('created_at', { ascending:false })
    .limit(100);

  const box = document.getElementById('myDocsList');
  if(!box) return;

  if(error){
    box.innerHTML = `<div class="empty">${doc2Escape(error.message)}</div>`;
    return;
  }

  box.innerHTML = (data || []).map(doc2Item).join('') || '<div class="empty">Brak dokumentów.</div>';
}

function doc2MainText(doc){
  const t = doc.tresc || {};
  return t.przebieg_zdarzenia || t.tresc || t.opis_czynu || t.powod || t.wnioski || t.uwagi || '';
}

function doc2Item(doc){
  const main = doc2MainText(doc);
  return `
    <div class="list-item">
      <span class="status zapisany">${doc2Escape(doc.status || 'zapisany')}</span>
      <h4>${doc2Escape(doc.numer_dokumentu || '')} — ${doc2Escape(doc.tytul || '')}</h4>
      <p><b>Autor:</b> ${doc2Escape(doc.stopien || '')} ${doc2Escape(doc.funkcjonariusz || '')}</p>
      <p class="small"><b>Data:</b> ${doc2Escape((doc.created_at || '').slice(0,16).replace('T',' '))}</p>
      <p>${doc2Escape(main).slice(0,500)}${main.length > 500 ? '...' : ''}</p>
      <div class="action-row">
        <button class="btn-light" onclick="doc2Open(${doc.id})">Otwórz</button>
      </div>
    </div>
  `;
}

async function doc2Open(id){
  const { data, error } = await supabaseClient
    .from('dokumenty')
    .select('*')
    .eq('id', id)
    .single();

  if(error) return alert(error.message);

  const rows = Object.entries(data.tresc || {}).map(([k,v]) => `
    <div class="doc2-view-row"><b>${doc2Escape(k.replaceAll('_',' '))}</b><span>${doc2Escape(v)}</span></div>
  `).join('');

  const w = window.open('', '_blank', 'width=900,height=900');
  w.document.write(`
    <html>
      <head>
        <title>${doc2Escape(data.numer_dokumentu || 'Dokument')}</title>
        <style>
          body{font-family:Arial,sans-serif;background:#f1f5f9;padding:25px}
          .paper{background:white;border:1px solid #ddd;border-radius:12px;padding:24px}
          h2{text-align:center}
          .row{display:grid;grid-template-columns:230px 1fr;gap:10px;border-bottom:1px solid #eee;padding:8px 0}
          button{padding:10px 14px;margin-bottom:12px}
        </style>
      </head>
      <body>
        <button onclick="window.print()">Drukuj / PDF</button>
        <div class="paper">
          <h2>${doc2Escape(data.tytul || '')}</h2>
          <p><b>Numer:</b> ${doc2Escape(data.numer_dokumentu || '')}</p>
          <p><b>Autor:</b> ${doc2Escape(data.stopien || '')} ${doc2Escape(data.funkcjonariusz || '')}</p>
          ${rows.replaceAll('doc2-view-row','row')}
        </div>
      </body>
    </html>
  `);
  w.document.close();
}

function doc2DownloadPDF(){
  const el = document.getElementById('doc2Preview');
  if(!el) return alert('Brak dokumentu do pobrania.');
  html2pdf().set({
    margin:[10,10,10,10],
    filename:(DOC2_TYPES[doc2CurrentType]?.prefix || 'DOC') + '.pdf',
    image:{type:'jpeg',quality:0.98},
    html2canvas:{scale:2},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}
  }).from(el).save();
}

function doc2Reset(){
  doc2RenderForm();
}

// Podpięcie pod istniejące przełączanie stron.
if(typeof showPage === 'function'){
  const oldShowPageDoc2 = showPage;
  showPage = function(id, btn){
    oldShowPageDoc2(id, btn);
    if(id === 'documents'){
      setTimeout(() => {
        if(!document.getElementById('doc2FormHost')?.innerHTML.trim()){
          doc2RenderForm();
        }
        doc2LoadMine();
      }, 50);
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if(document.getElementById('doc2FormHost')){
      doc2RenderForm();
    }
  }, 800);
});
