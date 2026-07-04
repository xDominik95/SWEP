
function aE(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]))}
async function loadArchive(){
 const box=document.getElementById('archiveList');if(!box)return;
 const q=(document.getElementById('archiveSearch')?.value||'').toLowerCase(),type=document.getElementById('archiveType')?.value||'',from=document.getElementById('archiveFrom')?.value||'',to=document.getElementById('archiveTo')?.value||'';
 let query=supabaseClient.from('dokumenty').select('*').is('deleted_at',null).order('created_at',{ascending:false}).limit(500);
 if(type)query=query.eq('typ_dokumentu',type);if(from)query=query.gte('created_at',from+'T00:00:00');if(to)query=query.lte('created_at',to+'T23:59:59');
 const {data,error}=await query;if(error){box.innerHTML=`<div class="empty">${aE(error.message)}</div>`;return}
 const f=(data||[]).filter(d=>!q||`${d.numer_dokumentu||''} ${d.tytul||''} ${d.funkcjonariusz||''} ${d.stopien||''} ${d.tresc?.plainText||''}`.toLowerCase().includes(q));
 box.innerHTML=`<div class="archive-count">Znaleziono: <b>${f.length}</b></div>${f.map(d=>`<div class="list-item archive-item"><span class="status ${aE(d.status||'zapisany')}">${aE(d.status||'zapisany')}</span><h4>${aE(d.numer_dokumentu||'bez numeru')} — ${aE(d.tytul||'Dokument')}</h4><p><b>Autor:</b> ${aE(d.stopien||'')} ${aE(d.funkcjonariusz||'')}</p><p><b>Typ:</b> ${aE(d.typ_dokumentu||'-')} | <b>Data:</b> ${aE((d.created_at||'').slice(0,16).replace('T',' '))}</p><p>${aE(d.tresc?.plainText||'').slice(0,300)}</p><div class="action-row"><button class="btn-light" onclick="policeDocOpen(${d.id})">Otwórz</button>${['admin','dowodca','zastepca'].includes(currentProfile?.rola)?`<button class="btn-danger" onclick="policeDocDelete(${d.id})">Usuń dokument</button>`:''}</div></div>`).join('')||'<div class="empty">Brak dokumentów.</div>'}`;
}
