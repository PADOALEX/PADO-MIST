const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../dist/js/core.js');

function flow() {
  let state = C.initialState();
  return { get state() { return state; }, do(actor,type,payload) { state=C.execute(state,actor,{type,payload}); return state; } };
}
function readyDocument(f) {
  f.do('student','requestDocument',{kind:'study',purpose:'Для дуального навчання'});
  const id=f.state.documents[0].id;
  f.do('curator','processDocument',{id});f.do('curator','issueDocument',{id});return id;
}
function activeCase(f) {
  const documentId=readyDocument(f);
  f.do('student','apply',{documentId,consent:true,motivation:'Хочу застосувати знання у навчальному проєкті.'});
  const id=f.state.cases[0].id;
  f.do('mentor','acceptApplication',{id});f.do('curator','approvePlan',{id});return id;
}
function report(caseId,outcomeId='db',extra={}) {
  const o=C.OUTCOMES.find(x=>x.id===outcomeId);
  return {caseId,outcomeId,hours:o.hours,from:'2026-01-01',to:'2026-01-05',summary:o.example,evidence:o.evidence,attachment:null,...extra};
}
function approve(f,actor,id,version=1) {
  f.do(actor,'reviewReport',{id,version,decision:'approve',confirmed:true,comment:'Перевірено виконання та відповідність очікуваному результату.'});
}

test('document queue, issue, immutable state and least visibility in the role simulation',()=>{
  const f=flow(),initial=f.state;
  f.do('student','requestDocument',{kind:'study',purpose:'Для дуального навчання'});
  const id=f.state.documents[0].id;
  assert.equal(initial.documents.length,0);
  assert.throws(()=>f.do('student','issueDocument',{id}),/недоступна/);
  assert.throws(()=>f.do('curator','issueDocument',{id}),/Спочатку/);
  assert.throws(()=>f.do('student','requestDocument',{kind:'study',purpose:'Дублікат запиту'}),/уже є/);
  assert.equal(C.view(f.state,'mentor').documents.length,0);
  f.do('curator','processDocument',{id});f.do('curator','issueDocument',{id});
  assert.equal(f.state.documents[0].status,'ready');
  assert.equal(C.view(f.state,'student').documents[0].issuer,'Олена Бойко');
  assert.equal(C.view(f.state,'mentor').events.length,0);
});

test('cancellation and rejection allow a new request; rejection needs a reason',()=>{
  const f=flow();f.do('student','requestDocument',{kind:'transcript',purpose:'Академічна мобільність'});
  f.do('student','cancelDocument',{id:f.state.documents[0].id});
  f.do('student','requestDocument',{kind:'transcript',purpose:'Академічна мобільність'});
  const id=f.state.documents[0].id;
  assert.throws(()=>f.do('curator','rejectDocument',{id,comment:''}));
  f.do('curator','rejectDocument',{id,comment:'Потрібно уточнити звітний період.'});
  f.do('student','requestDocument',{kind:'transcript',purpose:'Виписка за другий курс'});
  assert.equal(f.state.documents[0].status,'requested');
});

test('application requires ready evidence, consent, then company and university approval',()=>{
  const f=flow();f.do('student','requestDocument',{kind:'study',purpose:'Для дуального навчання'});
  const documentId=f.state.documents[0].id,p={documentId,consent:true,motivation:'Хочу працювати над навчальним проєктом.'};
  assert.throws(()=>f.do('student','apply',p),/готова довідка/);
  f.do('curator','processDocument',{id:documentId});f.do('curator','issueDocument',{id:documentId});
  assert.throws(()=>f.do('student','apply',{...p,consent:false}),/Підтвердьте/);
  f.do('student','apply',p);const id=f.state.cases[0].id;
  assert.equal(C.view(f.state,'mentor').documents[0].id,documentId);
  assert.throws(()=>f.do('curator','approvePlan',{id}),/Спочатку компанія/);
  assert.throws(()=>f.do('student','submitReport',report(id)),/погодження плану/);
  f.do('mentor','acceptApplication',{id});f.do('curator','approvePlan',{id});
  assert.equal(f.state.cases[0].status,'active');
});

test('curator cannot bypass mentor; returned reports invalidate approval and use new versions',()=>{
  const f=flow(),caseId=activeCase(f);f.do('student','submitReport',report(caseId));
  const id=f.state.reports[0].id;
  assert.throws(()=>approve(f,'curator',id),/не очікує/);
  approve(f,'mentor',id);
  f.do('curator','reviewReport',{id,version:1,decision:'return',comment:'Додайте пояснення обмежень цілісності.'});
  assert.equal(f.state.reports[0].status,'curator_changes');
  assert.equal(f.state.reports[0].mentorApproval,null);
  f.do('student','submitReport',report(caseId,'db',{id,version:1}));
  assert.equal(f.state.reports[0].version,2);
  assert.throws(()=>approve(f,'mentor',id,1),/Версія/);
  assert.throws(()=>approve(f,'curator',id,2),/не очікує/);
  approve(f,'mentor',id,2);approve(f,'curator',id,2);
  assert.equal(f.state.reports[0].status,'accepted');
  assert.equal(f.state.reports[0].curatorApproval.version,2);
  assert.ok(f.state.events.some(e=>e.message.includes('версія 2')));
});

test('mentor return requires correction and stale resubmission is rejected',()=>{
  const f=flow(),caseId=activeCase(f);f.do('student','submitReport',report(caseId));const id=f.state.reports[0].id;
  f.do('mentor','reviewReport',{id,version:1,decision:'return',comment:'Додайте протокол перевірок.'});
  assert.throws(()=>f.do('student','submitReport',report(caseId,'db',{id,version:0})),/Версія/);
  f.do('student','submitReport',report(caseId,'db',{id,version:1}));
  assert.equal(f.state.reports[0].status,'submitted');
  assert.throws(()=>f.do('mentor','reviewReport',{id,version:2,decision:'approve',confirmed:false,comment:'Все перевірено.'}),/Підтвердьте/);
});

test('three evaluated outcomes and explicit curator decision generate a final document',()=>{
  const f=flow(),caseId=activeCase(f);
  const final={id:caseId,confirmed:true,comment:'План виконано, усі результати оцінені за погодженими критеріями.'};
  assert.throws(()=>f.do('curator','completeCase',final),/усі три/);
  for(const o of C.OUTCOMES){
    f.do('student','submitReport',report(caseId,o.id));const id=f.state.reports[0].id;
    approve(f,'mentor',id);approve(f,'curator',id);
  }
  assert.equal(C.completedOutcomes(f.state,caseId),3);
  assert.throws(()=>f.do('mentor','completeCase',final),/недоступна/);
  assert.throws(()=>f.do('curator','completeCase',{...final,confirmed:false}),/Підтвердьте/);
  f.do('curator','completeCase',final);
  assert.equal(f.state.cases[0].status,'completed');
  const d=f.state.documents.find(d=>d.kind==='dual');assert.equal(d.status,'ready');assert.equal(d.caseId,caseId);
  assert.throws(()=>f.do('curator','completeCase',final),/вже завершено/);
  assert.throws(()=>f.do('student','submitReport',report(caseId)),/після погодження/);
});

test('attachments keep exact bytes and invalid files do not mutate a report',()=>{
  const f=flow(),caseId=activeCase(f),bytes=Buffer.from('Навчальний звіт. Синтетичні дані.','utf8');
  const attachment={name:'report.txt',size:bytes.length,data:bytes.toString('base64')};
  f.do('student','submitReport',report(caseId,'db',{attachment}));
  assert.deepEqual(Buffer.from(f.state.reports[0].attachment.data,'base64'),bytes);
  assert.equal(JSON.parse(JSON.stringify(f.state)).reports[0].attachment.data,attachment.data);
  assert.throws(()=>C.validateAttachment({...attachment,name:'danger.html'}),/Дозволені/);
  assert.throws(()=>C.validateAttachment({...attachment,size:700*1024}),/Максимальний/);
  assert.throws(()=>C.validateAttachment({...attachment,size:1}),/не збігається/);
  const revision=f.state.revision;
  assert.throws(()=>f.do('student','submitReport',report(caseId,'import',{hours:-1})),/годин/);
  assert.equal(f.state.revision,revision);
  assert.throws(()=>f.do('student','submitReport',report(caseId,'import',{from:'2026-02-30'})),/періоду/);
});

test('scope checks hide unrelated group or company records',()=>{
  const f=flow(),caseId=activeCase(f),s=structuredClone(f.state);
  s.cases.push({...s.cases[0],id:'OTHER',studentId:'ST-OTHER',group:'OTHER',companyId:'OTHER',mentorId:'OTHER'});
  s.documents.push({...s.documents[0],id:'PRIVATE',studentId:'ST-OTHER',group:'OTHER'});
  s.reports.push({id:'SECRET',caseId:'OTHER'});
  for(const role of Object.keys(C.ACTORS)){
    const view=C.view(s,role);assert.equal(view.cases.length,1);assert.equal(view.reports.length,0);
    assert.ok(!view.documents.some(d=>d.id==='PRIVATE'));
    assert.throws(()=>C.execute(s,role,{type:'reviewReport',payload:{id:'SECRET'}}),/доступ/);
  }
  assert.ok(caseId);
});

test('catalog services expose ready documents and routes without using the queue',()=>{
  const f=flow();
  const context={MistCore:C,Date};vm.createContext(context);
  for(const name of ['views.js','documents.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/js',name),'utf8'),context);
  const html=context.MistViews.render(f.state,'student','documents');
  const curator=context.MistViews.render(f.state,'curator','documents');
  for(const kind of Object.keys(C.SERVICES)){
    const svc=C.SERVICES[kind],d=C.catalogDocument(kind,f.state);
    assert.equal(d.id,svc.catalogId);
    assert.equal(d.status,'ready');
    assert.equal(d.kind,kind);
    assert.equal(C.canSeeDocument(f.state,'student',d),true);
    assert.equal(C.canSeeDocument(f.state,'curator',d),true);
    assert.equal(C.canSeeDocument(f.state,'mentor',d),false);
    assert.throws(()=>f.do('student','requestDocument',{kind,purpose:'Сервісний документ'}),/тип документа/);
    assert.ok(html.includes(svc.title));
    assert.ok(html.includes(svc.packTitle));
    assert.ok(html.includes(svc.readyHeading));
    assert.ok(html.includes(`data-service-route="${kind}"`));
    assert.ok(html.includes(svc.catalogId));
    assert.ok(!curator.includes(`data-service-route="${kind}"`));
    const content=context.MistDocuments.content(d,f.state);
    assert.ok(content.includes('НЕ ОФІЦІЙНИЙ ДОКУМЕНТ'));
    assert.ok(content.includes(C.TYPES[kind]));
    d.purpose='<img src=x onerror=alert(1)>';
    const escaped=context.MistDocuments.content(d,f.state);
    assert.ok(escaped.includes('&lt;img'));
    assert.ok(!escaped.includes('<img src'));
  }
  assert.ok(html.includes('Комплектність документів'));
  assert.ok(html.includes(C.SERVICES.dormitory.routeAction));
  assert.ok(html.includes('TU Dresden'));
  assert.ok(html.includes('Пакет заявки'));
  assert.ok(html.includes('макет погодження навчального плану'));
  assert.equal(f.state.documents.length,0);
});

test('all static view templates render across the full workflow and escape user text',()=>{
  const context={MistCore:C,Date};vm.createContext(context);
  for(const name of ['views.js','documents.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/js',name),'utf8'),context);
  const f=flow();
  function renderAll(){for(const role of Object.keys(C.ACTORS))for(const page of ['documents','dual','history']){const html=context.MistViews.render(f.state,role,page);assert.ok(html.includes('<main'));assert.ok(!html.includes('undefined'));}}
  renderAll();const documentId=readyDocument(f);renderAll();
  f.do('student','apply',{documentId,consent:true,motivation:'Хочу реалізувати навчальний проєкт.'});renderAll();
  const id=f.state.cases[0].id;f.do('mentor','acceptApplication',{id});renderAll();f.do('curator','approvePlan',{id});renderAll();
  for(const o of C.OUTCOMES){f.do('student','submitReport',report(id,o.id));const r=f.state.reports[0].id;renderAll();approve(f,'mentor',r);renderAll();approve(f,'curator',r);renderAll();}
  f.do('curator','completeCase',{id,confirmed:true,comment:'Усі результати перевірені та відповідають погодженому плану.'});renderAll();
  const doc=context.MistDocuments.get(f.state,'student',documentId);doc.purpose='<img src=x onerror=alert(1)>';
  const content=context.MistDocuments.content(doc,f.state);assert.ok(content.includes('&lt;img'));assert.ok(!content.includes('<img'));
  assert.ok(content.includes('НЕ ОФІЦІЙНИЙ ДОКУМЕНТ'));
});
