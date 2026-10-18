'use strict';
let token = null, role = null, documents = [], cases = [], reports = [], revisions = [], decisions = [], tab = 'documents';
const $ = selector => document.querySelector(selector);
const esc = text => String(text ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const short = x => String(x ?? '').slice(0, 8);
const labels = { requested:'У черзі', processing:'Готується', ready:'Готово', cancelled:'Скасовано', rejected:'Відхилено', company_review:'Очікує компанію', plan_review:'Погодження плану', active:'Навчання триває', completed:'Навчання завершено', submitted:'У наставника', mentor_changes:'На доопрацюванні', university_review:'У куратора', curator_changes:'На доопрацюванні', accepted:'Результат підтверджено' };
const say = value => {const el = $('#alert');el.textContent = value;el.classList.add('visible');};
async function api(path, opts = {}) {
 const headers = {Authorization: `Bearer ${token}`, ...(opts.headers || {})};
 if (opts.body && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
 const res = await fetch('/api' + path, {...opts,headers});
 if (!res.ok) { const data = await res.json().catch(() => ({})); throw Error(data.detail || data.title || (typeof data === 'string' ? data : `HTTP ${res.status}`)); }
 return res.status === 204 ? null : res.json();
}
async function refresh() {
 const [d,c,r] = await Promise.all([api('/documents'),api('/cases'),api('/reports')]);
 documents = d;cases = c;reports = r.reports;revisions=r.revisions;decisions=r.decisions;
 render();
}
function actionButton(label,action) {return `<button data-action="${esc(action)}">${esc(label)}</button>`;}
function drawDocs() {
 $('#doc-form').hidden = role !== 'Student';
 $('#doc-list').innerHTML = documents.length ? documents.map(d => `<article class="item"><header><h3>${esc(d.kind === 'study' ? 'Довідка про навчання' : d.kind === 'transcript' ? 'Академічна виписка' : 'Підсумок дуальної освіти')} · ${short(d.id)}</h3><span class="tag">${esc(labels[d.status] || d.status)}</span></header><p>${esc(d.purpose)}${d.comment ? ' · '+esc(d.comment) : ''}</p><div class="actions">${role==='Student'&&d.status==='requested'?actionButton('Скасувати',`doc:cancel:${d.id}:${d.revision}`):''}${role==='Curator'&&d.status==='requested'?actionButton('Взяти в роботу',`doc:process:${d.id}:${d.revision}`):''}${role==='Curator'&&d.status==='processing'?actionButton('Видати',`doc:issue:${d.id}:${d.revision}`):''}${role==='Curator'&&['requested','processing'].includes(d.status)?actionButton('Відхилити',`doc:reject:${d.id}:${d.revision}`):''}${actionButton('Історія',`audit:document:${d.id}`)}</div></article>`).join('') : '<p>Заявок поки немає.</p>';
}
function drawCases() {
 const owned = cases.length > 0, eligible = documents.filter(d => d.kind==='study'&&d.status==='ready');
 $('#case-form').hidden = role!=='Student'||owned||!eligible.length;
 $('#eligible-doc').innerHTML = eligible.map(d=>`<option value="${d.id}">Довідка ${short(d.id)}</option>`).join('');
 $('#case-list').innerHTML = cases.length?cases.map(c=>`<article class="item"><header><h3>Дуальна справа ${short(c.id)}</h3><span class="tag">${esc(labels[c.status]||c.status)}</span></header><p>${esc(c.motivation)}</p><div class="actions">${role==='Mentor'&&c.status==='company_review'?actionButton('Підтвердити компанією',`case:accept:${c.id}:${c.revision}`):''}${role==='Curator'&&c.status==='plan_review'?actionButton('Погодити план',`case:approve-plan:${c.id}:${c.revision}`):''}${role==='Curator'&&c.status==='active'&&reports.filter(r=>r.caseId===c.id&&r.status==='accepted').length===3?actionButton('Завершити навчання',`case:complete:${c.id}:${c.revision}`):''}${actionButton('Історія',`audit:case:${c.id}`)}</div></article>`).join(''):'<p>Справи дуальної освіти поки немає.</p>';
}
function drawReports() {
 const active=cases.filter(c=>c.status==='active');
 $('#report-form').hidden = role!=='Student'||!active.length;
 $('#report-case').innerHTML = active.map(c=>`<option value="${c.id}">Справа ${short(c.id)}</option>`).join('');
 $('#report-list').innerHTML = reports.length?reports.map(r=>{
  const v = revisions.find(x=>x.reportId===r.id&&x.version===r.version);
  return `<article class="item"><header><h3>${esc({db:'База даних',import:'Функціональність',quality:'Якість і документація'}[r.outcomeId]||r.outcomeId)} · v${r.version}</h3><span class="tag">${esc(labels[r.status]||r.status)}</span></header><p>${esc(v?.summary||'')} · ${esc(v?.hours||'')} год.</p><p>Рішень (усі версії): ${decisions.filter(x=>x.reportId===r.id).length}</p><div class="actions">${role==='Student'&&['mentor_changes','curator_changes'].includes(r.status)?actionButton('Внести правки',`edit:${r.id}`):''}${role==='Mentor'&&r.status==='submitted'?actionButton('Погодити',`review:approve:${r.id}:${r.version}`)+actionButton('Повернути',`review:return:${r.id}:${r.version}`):''}${role==='Curator'&&r.status==='university_review'?actionButton('Погодити',`review:approve:${r.id}:${r.version}`)+actionButton('Повернути',`review:return:${r.id}:${r.version}`):''}${actionButton('Версії та вкладення',`versions:${r.id}`)}${actionButton('Історія',`audit:report:${r.id}`)}</div></article>`;
 }).join(''):'<p>Звітів ще немає.</p>';
}
function render(){drawDocs();drawCases();drawReports();}
$('#login-form').addEventListener('submit',async e=>{
 e.preventDefault();const f = new FormData(e.currentTarget);
 try {const res = await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(f))});
 if (!res.ok) throw Error('Невірний логін або пароль.');const obj=await res.json();token=obj.accessToken;role=obj.role;
 $('#role').textContent = role;$('#hello').textContent = `Вітаємо, ${obj.displayName}`;$('#login').hidden=true;$('#workspace').hidden=false;$('#logout').hidden=false;
 await refresh();say('Вхід виконано. Дані надходять із серверного API.');
 }catch(err){say(err.message);}
});
$('#logout').addEventListener('click',()=>{token=null;role=null;$('#workspace').hidden=true;$('#login').hidden=false;$('#logout').hidden=true;$('#login-form').reset();});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('current',x.dataset.tab===tab));document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!==tab);}));
$('#doc-form').addEventListener('submit',async e=>{e.preventDefault();try {await api('/documents',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});e.target.reset();await refresh();say('Заявку створено.');}catch(err){say(err.message);}});
$('#case-form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);try{await api('/cases',{method:'POST',body:JSON.stringify({documentId:f.get('documentId'),motivation:f.get('motivation'),consent:f.get('consent')==='on'})});await refresh();say('Заявку компанії створено.');}catch(err){say(err.message);}});
$('#report-form').addEventListener('submit',async e=>{e.preventDefault();try{const f=new FormData(e.target);if(!f.get('attachment')?.size)f.delete('attachment');if(!f.get('version'))f.delete('version');if(!f.get('reportId'))f.delete('reportId');await api('/reports',{method:'POST',body:f});e.target.reset();await refresh();say('Версію звіту надіслано.');}catch(err){say(err.message);}});
document.body.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b||!token)return;
 const [kind,act,id,val]=b.dataset.action.split(':');
 try{
  if(kind==='doc'){const comment=act==='reject'?prompt('Причина відхилення (5–800 символів)'):'';if(act==='reject'&&comment===null)return;await api(`/documents/${id}/${act}`,{method:'POST',body:JSON.stringify({comment,expectedRevision:Number(val)})});}
  if(kind==='case'){const comment=act==='complete'?prompt('Підсумкове рішення (15–1200 символів)'):'';if(act==='complete'&&comment===null)return;await api(`/cases/${id}/${act}`,{method:'POST',body:JSON.stringify({expectedRevision:Number(val),confirmed:act==='complete',comment})});}
  if(kind==='review'){const comment=prompt(act==='approve'?'Коментар до погодження (5–800 символів)':'Причина повернення (5–800 символів)');if(comment===null)return;await api(`/reports/${id}/review`,{method:'POST',body:JSON.stringify({version:Number(val),decision:act,confirmed:act==='approve',comment})});}
  if(kind==='edit'){
   const r=reports.find(x=>x.id===act), v=revisions.find(x=>x.reportId===r.id&&x.version===r.version),f=$('#report-form');
   f.elements.namedItem("reportId").value=r.id;f.elements.namedItem("version").value=String(r.version);f.elements.namedItem("caseId").value=r.caseId;f.elements.namedItem("outcomeId").value=r.outcomeId;
   f.elements.namedItem("hours").value=v.hours;f.elements.namedItem("from").value=v.fromDate;f.elements.namedItem("to").value=v.toDate;f.elements.namedItem("summary").value=v.summary;f.elements.namedItem("evidence").value=v.evidence;
   document.querySelector('[data-tab="reports"]').click();f.scrollIntoView({behavior:'smooth'});say('Змінюєте звіт v'+r.version+'. Надсилання створить нову версію.');return;
  }
  if(kind==='audit'){const records=await api(`/audit/${act}/${id}`);$('#audit-list').innerHTML=records.map(x=>`<article class="item"><strong>${esc(x.action)}</strong><p>${esc(x.note)} · ${esc(x.at)} · версія ${esc(x.version??'—')}</p></article>`).join('')||'<p>Записів немає.</p>';document.querySelector('[data-tab="history"]').click();return;}
  if(kind==='download'){
   const res=await fetch(`/api/reports/${act}/files/${id}`,{headers:{Authorization:`Bearer ${token}`}});
   if(!res.ok)throw Error(`Download failed: HTTP ${res.status}`);
   const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;
   const header=res.headers.get('content-disposition')||'';const matched=header.match(/filename\*=UTF-8''([^;]+)/i);
   a.download=matched?decodeURIComponent(matched[1]):'evidence-file';document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);return;
  }
  if(kind==='versions'){
   const v=await api(`/reports/${act}/versions`);
   $('#audit-list').innerHTML = v.versions.map(x=>`<article class="item"><header><h3>Версія ${x.version}</h3><span class="tag">${esc(x.submittedAt)}</span></header><p>${esc(x.summary)}</p><p>Докази: ${esc(x.evidence)}</p><div class="actions">${v.files.filter(f=>f.reportRevisionId===x.id).map(f=>actionButton('Завантажити: '+f.fileName,`download:${act}:${f.id}`)).join('')}</div><p>${v.decisions.filter(d=>d.version===x.version).map(d=>esc(d.role+': '+d.decision+' — '+d.comment)).join(' · ')}</p></article>`).join('');
   document.querySelector('[data-tab="history"]').click();return;
  }
  await refresh();say('Дію виконано.');
 }catch(err){say(err.message);}
});
