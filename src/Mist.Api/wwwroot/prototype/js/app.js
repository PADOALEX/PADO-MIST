(function(){
  'use strict';
  const C=window.MistCore,V=window.MistViews,D=window.MistDocuments;
  const KEY='mist.prototype.v1',PREF='mist.preferences.v1',DRAFT='mist.report-draft.v1';
  const app=document.getElementById('app'),modal=document.getElementById('modal');
  let state=C.initialState(),actorId='student',page='documents',memoryOnly=false,corrupt=false,toastTimer,openContext=null;
  let renderedContext='';
  function validState(s){return s&&s.schemaVersion===1&&s.student?.id&&s.company?.id&&Number.isInteger(s.revision)&&Number.isInteger(s.sequence)&&['documents','cases','reports','events'].every(k=>Array.isArray(s[k]));}
  try{
    const raw=localStorage.getItem(KEY);if(raw){const saved=JSON.parse(raw);if(!validState(saved))throw new Error('format');state=saved;}
    const pref=JSON.parse(localStorage.getItem(PREF)||'null');if(pref){if(C.ACTORS[pref.actorId])actorId=pref.actorId;if(['documents','dual','history'].includes(pref.page))page=pref.page;}
  }catch(error){if(error.name==='SecurityError')memoryOnly=true;else corrupt=true;}
  function fresh(){
    if(memoryOnly)return state;
    const raw=localStorage.getItem(KEY);if(!raw)return state;const saved=JSON.parse(raw);
    if(!validState(saved))throw new Error('Збережені дані пошкоджено. Скористайтеся кнопкою «Почати демо спочатку».');
    return saved;
  }
  function render(focus=false){
    // Keep expanded cards during an action in the same view, but start each page/role closed.
    const context=`${actorId}:${page}`;
    const expanded=renderedContext===context?Array.from(app.querySelectorAll('details[data-fold][open]'),el=>el.id):[];
    app.innerHTML=V.render(state,actorId,page);
    expanded.forEach(id=>{const card=document.getElementById(id);if(card?.matches('details[data-fold]'))card.open=true;});
    renderedContext=context;
    document.title=`${page==='dual'?'Дуальна освіта':page==='history'?'Історія дій':'Мої документи'} · Міст`;
    if(memoryOnly||corrupt){const note=document.createElement('div');note.className='notice warning';note.textContent=corrupt?'Попередні дані не вдалося прочитати. Щоб не перезаписати їх, зміни заблоковано до скидання демо.':'Сховище браузера недоступне: дані зберігатимуться лише до закриття цієї сторінки.';document.getElementById('main').prepend(note);}
    if(focus)document.getElementById('main').focus();
  }
  function toast(text){const box=document.getElementById('toast');box.textContent=text;box.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('visible'),5000);}
  function preferences(){try{localStorage.setItem(PREF,JSON.stringify({actorId,page}));}catch{}}
  function commit(type,payload){
    if(corrupt)throw new Error('Спочатку скиньте пошкоджене демо кнопкою в меню.');
    const base=fresh(),next=C.execute(base,actorId,{type,payload});
    if(!memoryOnly){try{localStorage.setItem(KEY,JSON.stringify(next));}catch{throw new Error('Не вдалося зберегти дані. Можливо, вкладення завелике або сховище браузера переповнене. Зміни не застосовано.');}}
    state=next;render();
  }
  function close(){modal.close();openContext=null;}
  function shell(title,subtitle,body,footer='',form=''){
    const contents=`<div class="modal-head"><div><h2 id="modal-title">${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div><button type="button" class="icon-btn" data-close aria-label="Закрити">${V.icon('close')}</button></div><div class="modal-body">${body}</div><p class="form-error" id="form-error" role="alert"></p>${footer?`<div class="modal-footer">${footer}</div>`:''}`;
    modal.innerHTML=form?`<form data-form="${form}">${contents}</form>`:contents;if(!modal.open)modal.showModal();
  }
  const footer=label=>`<button type="button" class="btn secondary" data-close>Скасувати</button><button type="submit" class="btn">${label}</button>`;
  const field=(name,label,value='',options={})=>`<div class="field"><label for="${name}">${label}</label>${options.textarea?`<textarea id="${name}" name="${name}" minlength="${options.min||1}" maxlength="${options.max||1500}" required>${V.esc(value)}</textarea>`:`<input id="${name}" name="${name}" type="${options.type||'text'}" value="${V.esc(value)}" ${options.attrs||''} required>`}${options.help?`<small>${options.help}</small>`:''}</div>`;
  function requestDocument(kind){
    openContext={kind};shell('Замовити документ','Дані студента підставляються з демонстраційного обліку.',`<div class="form-context"><strong>${V.esc(state.student.name)}</strong><br>${V.esc(state.student.program)} · ${state.student.year} курс · ${state.student.group}</div><div class="field"><label for="kind">Тип документа</label><select id="kind" name="kind"><option value="study" ${kind==='study'?'selected':''}>Довідка про навчання</option><option value="transcript" ${kind==='transcript'?'selected':''}>Академічна виписка</option></select></div>${field('purpose','Для чого потрібен документ?',kind==='study'?'Для участі в дуальному навчанні':'Для підтвердження результатів навчання',{attrs:'minlength="3" maxlength="200"'})}<div class="notice">Запит потрапить до електронної черги університету. Готовність можна відстежити в «Моїх документах».</div>`,footer('Надіслати запит'),'requestDocument');
  }
  function apply(documentId){
    const doc=D.get(state,actorId,documentId);openContext={documentId};
    shell('Заявка до Vector Lab','Розроблення вебзастосунку · Комп’ютерні науки',`<div class="form-context"><strong>${V.esc(state.student.name)}</strong><br>${state.student.group} · ${V.esc(state.student.program)}<br>Довідка: ${doc.id}, ${V.date(doc.issuedAt)}</div>${field('motivation','Чому хочете навчатися в компанії?','Хочу застосувати знання з баз даних і веброзроблення у практичному проєкті та отримати зворотний зв’язок від наставника.',{textarea:true,min:15,max:1200})}<label class="checkbox"><input type="checkbox" name="consent" required><span>Погоджуюся передати Vector Lab моє ім’я, програму, групу, довідку та заявку для організації дуального навчання.</span></label><p class="small muted">Наступні кроки: підтвердження компанії та погодження плану куратором.</p>`,footer('Подати заявку'),'apply');
  }
  function reportForm(caseId,reportId){
    const v=C.view(state,actorId),old=reportId?v.reports.find(r=>r.id===reportId):null;
    const options=C.OUTCOMES.filter(o=>old?.outcomeId===o.id||!v.reports.some(r=>r.caseId===caseId&&r.outcomeId===o.id));
    if(!options.length)throw new Error('Для всіх результатів уже створено звіти.');
    let draft=null;try{const saved=JSON.parse(localStorage.getItem(DRAFT)||'null');if(saved?.caseId===caseId&&saved.reportId===(reportId||null))draft=saved.fields;}catch{}
    const data=draft||old||{},today=new Date().toISOString().slice(0,10),from=new Date(Date.now()-5*86400000).toISOString().slice(0,10);
    openContext={caseId,reportId,version:old?.version,attachment:old?.attachment||null};
    shell(old?`Доопрацювання звіту · v${old.version+1}`:'Новий проміжний звіт','Описуйте результат так, щоб наставник і куратор могли його перевірити.',`${old?.comment?`<div class="notice warning"><strong>Що потрібно доопрацювати</strong>${V.esc(old.comment)}</div>`:''}${draft?'<div class="notice">Текстову чернетку відновлено. Новий файл, якщо він був, виберіть ще раз.</div>':''}<div class="field"><label for="outcomeId">Результат навчання</label><select id="outcomeId" name="outcomeId">${options.map(o=>`<option value="${o.id}" ${o.id===data.outcomeId?'selected':''}>${o.title}</option>`).join('')}</select></div><div class="actions" style="margin-bottom:18px"><button type="button" class="btn secondary small-btn" data-fill-sample>Заповнити навчальний приклад</button><span class="small muted">Можна відредагувати всі поля</span></div><div class="form-grid">${field('from','Початок періоду',data.from||from,{type:'date',attrs:`max="${today}"`})}${field('to','Кінець періоду',data.to||today,{type:'date',attrs:`max="${today}"`})}</div>${field('hours','Фактично витрачено годин',data.hours||'',{type:'number',attrs:'min="0.5" max="160" step="0.5"'})}${field('summary','Що саме виконано?',data.summary||'',{textarea:true,min:30,max:3000})}${field('evidence','Чим підтверджується результат?',data.evidence||'',{textarea:true,min:15,max:2000,help:'Опишіть демонстрацію, протокол перевірок або матеріали, які можна передати на оцінювання.'})}<div class="field file-box"><label for="attachment">Файл звіту або доказ роботи</label><input type="file" id="attachment" name="attachment" accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg"><small>PDF, TXT, MD, CSV, PNG, JPG · до 600 КБ. Файл зберігається локально разом зі звітом.</small>${old?.attachment?`<p class="small break" style="margin:10px 0 0">Поточний файл: ${V.esc(old.attachment.name)}</p><label class="checkbox"><input type="checkbox" name="removeAttachment"><span>Видалити поточний файл</span></label>`:''}</div><p class="small muted">Чернетка зберігає текстові поля. Після надсилання звіт переходить наставнику.</p>`,`<button type="button" class="btn secondary" data-save-draft>Зберегти чернетку</button><button type="submit" class="btn">Надіслати наставнику</button>`,'submitReport');
  }
  function reviewReport(reportId){
    const r=C.view(state,actorId).reports.find(x=>x.id===reportId);if(!r)throw new Error('Звіт недоступний.');
    const canReview=(actorId==='mentor'&&r.status==='submitted')||(actorId==='curator'&&r.status==='university_review');
    openContext={reportId,version:r.version};
    const approvals=[r.mentorApproval,r.curatorApproval].filter(Boolean).map(a=>`<div class="review-stamp"><strong>${V.esc(a.name)} · версія ${a.version} · ${V.date(a.at,true)}</strong>${V.esc(a.comment)}</div>`).join('');
    const body=`<div class="actions" style="margin-bottom:20px">${V.badge(r.status)}<span class="small muted">${r.id} · версія ${r.version} · ${r.hours} год</span></div><div class="report-section"><h3>Період</h3><p>${V.date(r.from)}–${V.date(r.to)}</p></div><div class="report-section"><h3>Вимога навчального плану</h3><p>${C.OUTCOMES.find(o=>o.id===r.outcomeId).requirement}</p></div><div class="report-section"><h3>Виконана робота</h3><p class="report-content">${V.esc(r.summary)}</p></div><div class="report-section"><h3>Підтвердження результату</h3><p class="report-content">${V.esc(r.evidence)}</p></div>${r.attachment?`<div class="report-section"><h3>Вкладення</h3>${V.button(V.esc(r.attachment.name),`type="button" data-attachment="${r.id}"`,'secondary','download')}</div>`:''}${approvals}${['mentor_changes','curator_changes'].includes(r.status)?`<div class="notice warning">${V.esc(r.comment)}</div>`:''}${canReview?`${field('comment','Коментар до рішення','',{textarea:true,min:5,max:800,help:'Для повернення опишіть, що виправити. Для підтвердження — який результат перевірено.'})}<label class="checkbox"><input type="checkbox" name="confirmed"><span>${actorId==='mentor'?'Я перевірила виконану роботу, зазначені години та докази.':'Я оцінила відповідність роботи результату навчального плану.'}</span></label>`:''}`;
    const foot=canReview?'<button type="submit" name="decision" value="return" class="btn secondary">Повернути з коментарем</button><button type="submit" name="decision" value="approve" class="btn">Підтвердити результат</button>':'<button class="btn secondary" type="button" data-close>Закрити</button>';
    shell(C.OUTCOMES.find(o=>o.id===r.outcomeId).title,'Погодження стосується лише поточної версії звіту.',body,foot,canReview?'reviewReport':'');
  }
  function showDocument(id){const d=D.get(state,actorId,id);shell('Перегляд документа',`${d.id} · ${V.date(d.issuedAt)}`,`<div class="document-preview">${D.content(d,state)}</div>`,`${V.button('Завантажити HTML',`type="button" data-download-doc="${id}"`,'secondary','download')}${V.button('Відкрити для друку / PDF',`type="button" data-print-doc="${id}"`,'','doc')}`);}
  function plan(id){openContext={id};shell('Погодження навчального плану','Компанія підтвердила участь. Перевірте результати та навчальний обсяг.',V.outcomes(state,state.cases.find(c=>c.id===id))+`<div class="notice">У демо погоджуємо версію 1 плану. Реальні договори та електронні підписи налаштовуються університетом окремо.</div><label class="checkbox"><input type="checkbox" name="confirmed" required><span>План узгоджений з освітньою програмою студента.</span></label>`,footer('Погодити план'),'approvePlan');}
  function complete(id){openContext={id};shell('Завершити оцінювання','Усі три результати вже підтверджені куратором.',`${field('comment','Підсумкове рішення','Студент виконав погоджений план дуального навчання; усі три результати перевірено та підтверджено.',{textarea:true,min:15,max:1200})}<label class="checkbox"><input type="checkbox" name="confirmed" required><span>Підтверджую завершення оцінювання за погодженим планом.</span></label><div class="notice">У «Моїх документах» студента з’явиться електронний підсумок. Внесення до справжньої відомості в цьому прототипі не виконується.</div>`,footer('Завершити та сформувати підсумок'),'completeCase');}
  function serviceRoute(kind){
    const svc=C.SERVICES[kind];
    if(!svc)throw new Error('Невідомий сервіс.');
    const steps=svc.route.map(s=>`<li><strong>${V.esc(s.title)}</strong><p>${V.esc(s.text)}</p></li>`).join('');
    shell(svc.title,svc.routeTitle,`<ol class="help-list">${steps}</ol><div class="notice warning"><strong>Межі цієї версії</strong>${V.esc(svc.routeNotice)}</div>`,`<button type="button" class="btn" data-close>Закрити</button>`);
  }
  function help(){shell('Про прототип «Міст»','PolyTECH Bootcamp Lviv · напрями 1 та 3',`<p>Робоча демонстрація розділу «Мої документи» та дуальної освіти для Moodle.</p><ol class="help-list"><li><strong>Студент:</strong> замовляє довідку.</li><li><strong>Куратор:</strong> бере запит у роботу та видає документ.</li><li><strong>Студент:</strong> подає заявку до компанії.</li><li><strong>Наставник і куратор:</strong> послідовно погоджують участь і план.</li><li><strong>Студент:</strong> подає три звіти. Наставник перевіряє кожен, куратор оцінює результат.</li><li><strong>Куратор:</strong> завершує оцінювання; студент отримує електронний підсумок.</li></ol><div class="notice warning"><strong>Межі цієї версії</strong>Ролі перемикаються для демонстрації, справжньої авторизації немає. Інтеграції Moodle, ЄДЕБО, електронний підпис і серверний захист — наступний етап. Використовуйте лише навчальні дані й файли.</div><p class="small muted">Запити, звіти та файли зберігаються в цьому браузері. Вкладки на одній адресі синхронізуються; інший браузер або комп’ютер має окремі дані. У деморолі куратора суміщено роботу куратора та працівника деканату.</p>`,`<button type="button" class="btn" data-close>Зрозуміло</button>`);}
  async function readFile(file){if(!file||!file.size)return null;if(file.size>600*1024)throw new Error('Виберіть файл до 600 КБ.');return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Не вдалося прочитати файл.'));reader.onload=()=>resolve({name:file.name,size:file.size,data:String(reader.result).split(',')[1]});reader.readAsDataURL(file);});}
  function formError(error){const box=document.getElementById('form-error');if(box){box.textContent=error.message;box.tabIndex=-1;box.focus();}else toast(error.message);}
  document.addEventListener('click',async event=>{
    const b=event.target.closest('button');if(!b||b.disabled)return;
    try{
      if(b.hasAttribute('data-close')){close();return;}
      if(b.hasAttribute('data-nav-toggle')){const expanded=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(expanded));document.getElementById('cabinet-navigation').classList.toggle('is-open',expanded);return;}
      if(b.hasAttribute('data-collapse-all')){app.querySelectorAll('details[data-fold]').forEach(card=>{card.open=false;});return;}
      if(b.dataset.role){actorId=b.dataset.role;preferences();render(true);return;}
      if(b.dataset.page){page=b.dataset.page;preferences();render(true);return;}
      if(b.dataset.request){requestDocument(b.dataset.request);return;}
      if(b.dataset.action){commit(b.dataset.action,{id:b.dataset.id});toast('Зміни збережено');return;}
      if(b.dataset.apply){apply(b.dataset.apply);return;}
      if(b.dataset.plan){plan(b.dataset.plan);return;}
      if(b.dataset.complete){complete(b.dataset.complete);return;}
      if(b.dataset.newReport){reportForm(b.dataset.newReport);return;}
      if(b.dataset.editReport){const r=C.view(state,actorId).reports.find(x=>x.id===b.dataset.editReport);reportForm(r.caseId,r.id);return;}
      if(b.dataset.report){reviewReport(b.dataset.report);return;}
      if(b.dataset.doc){showDocument(b.dataset.doc);return;}
      if(b.dataset.downloadDoc){D.downloadDocument(state,actorId,b.dataset.downloadDoc);return;}
      if(b.dataset.printDoc){D.printDocument(state,actorId,b.dataset.printDoc);return;}
      if(b.dataset.attachment){D.attachment(state,actorId,b.dataset.attachment);return;}
      if(b.dataset.reject){openContext={id:b.dataset.reject};shell('Відхилити запит','Студент побачить причину у своєму кабінеті.',field('comment','Причина відхилення','',{textarea:true,min:5,max:800}),footer('Відхилити запит'),'rejectDocument');return;}
      if(b.dataset.serviceRoute){serviceRoute(b.dataset.serviceRoute);return;}
      if(b.hasAttribute('data-help')){help();return;}
      if(b.hasAttribute('data-reset')){shell('Почати демо спочатку?','Це видалить запити, звіти, вкладення та історію цього прототипу.','<p>Повернетеся до порожнього кабінету студента. Цю дію неможливо скасувати.</p>',footer('Скинути демо'),'reset');return;}
      if(b.hasAttribute('data-fill-sample')){const f=b.closest('form'),o=C.OUTCOMES.find(x=>x.id===f.elements.outcomeId.value);f.elements.hours.value=o.hours;f.elements.summary.value=o.example;f.elements.evidence.value=o.evidence;toast('Приклад заповнено — його можна змінити');return;}
      if(b.hasAttribute('data-save-draft')){const f=b.closest('form');const fields=Object.fromEntries(new FormData(f));delete fields.attachment;localStorage.setItem(DRAFT,JSON.stringify({caseId:openContext.caseId,reportId:openContext.reportId||null,fields}));toast('Текстову чернетку збережено');close();return;}
    }catch(error){formError(error);}
  });
  modal.addEventListener('submit',async event=>{
    event.preventDefault();const form=event.target,kind=form.dataset.form,fd=new FormData(form),p=Object.fromEntries(fd),context={...openContext},submitter=event.submitter;
    const buttons=[...form.querySelectorAll('button[type=submit]')];buttons.forEach(b=>b.disabled=true);
    try{
      if(kind==='reset'){
        try{localStorage.removeItem(KEY);localStorage.removeItem(DRAFT);localStorage.removeItem(PREF);}catch{}
        state=C.initialState();corrupt=false;actorId='student';page='documents';renderedContext='';if(!memoryOnly){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{memoryOnly=true;}}close();render(true);toast('Демо скинуто');return;
      }
      if(kind==='requestDocument')commit(kind,{kind:p.kind,purpose:p.purpose});
      if(kind==='apply')commit(kind,{...p,documentId:context.documentId,consent:fd.has('consent')});
      if(kind==='approvePlan')commit(kind,{id:context.id});
      if(kind==='rejectDocument')commit(kind,{id:context.id,comment:p.comment});
      if(kind==='completeCase')commit(kind,{id:context.id,comment:p.comment,confirmed:fd.has('confirmed')});
      if(kind==='reviewReport')commit(kind,{id:context.reportId,version:context.version,decision:submitter.value,comment:p.comment,confirmed:fd.has('confirmed')});
      if(kind==='submitReport'){
        const file=fd.get('attachment');const attachment=file?.size?await readFile(file):fd.has('removeAttachment')?null:context.attachment;
        commit(kind,{...p,caseId:context.caseId,id:context.reportId,version:context.version,attachment});try{localStorage.removeItem(DRAFT);}catch{}
      }
      close();render(true);toast(kind==='requestDocument'?'Запит додано до електронної черги':kind==='submitReport'?'Звіт надіслано наставнику':kind==='completeCase'?'Електронний підсумок готовий':'Зміни збережено');
    }catch(error){formError(error);}finally{buttons.forEach(b=>b.disabled=false);}
  });
  window.addEventListener('storage',event=>{if(event.key!==KEY)return;try{state=event.newValue?JSON.parse(event.newValue):C.initialState();if(!validState(state))throw new Error();render();if(modal.open){close();toast('Дані оновлено в іншій вкладці. Відкрийте запис ще раз.');}}catch{toast('Не вдалося синхронізувати дані іншої вкладки.');}});
  function startApp(){render();}
  if(document.body.classList.contains('captcha-locked'))window.addEventListener('mist-captcha-passed',startApp,{once:true});
  else startApp();
})();
