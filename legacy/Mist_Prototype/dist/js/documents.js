(function(root){
  'use strict';
  const C=root.MistCore,V=root.MistViews;
  function get(state,actor,id){
    const d=C.catalogById(id,state)||state.documents.find(x=>x.id===id);
    if(!d||!C.canSeeDocument(state,actor,d)||d.status!=='ready')throw new Error('Готовий документ недоступний для цієї ролі.');
    return d;
  }
  function content(d,state){
    const s=d.snapshot,e=V.esc;
    let body=`<dl><dt>Студент</dt><dd>${e(s.name)}</dd><dt>Освітня програма</dt><dd>${e(s.program)}</dd><dt>Курс і група</dt><dd>${s.year} курс · ${e(s.group)}</dd><dt>Призначення</dt><dd>${e(d.purpose)}</dd></dl>`;
    if(d.kind==='study')body+=`<p>У демонстраційному університетському обліку студент має активний статус навчання. Дані перевірено ${V.date(s.verifiedAt)}.</p>`;
    if(d.kind==='leokart')body+=`<p>Довідка підтверджує денну форму навчання для оформлення студентської транспортної картки ЛеоКарт. Дані перевірено ${V.date(s.verifiedAt)}.</p><p>Картка призначена для пільгового проїзду в громадському транспорті. Цей зразок не є заявою до перевізника і не замінює пластикову картку.</p>`;
    if(d.kind==='dormitory')body+=`<p>Заява на поселення до студентського гуртожитку на навчальний рік. Статус денної форми перевірено ${V.date(s.verifiedAt)}.</p><p>Маршрут погодження в демо: куратор і деканат → студмістечко → комендант. Цей зразок не є ордером на поселення і не бронює ліжко-місце.</p>`;
    if(d.kind==='erasmus'){
      const svc=C.SERVICES.erasmus,p=svc.partner;
      body+=`<p><strong>Партнерська програма:</strong> ${e(p.name)} · ${e(p.detail)}</p><p>Пакет заявки на навчальну мобільність Erasmus+ SMS. Статус навчання перевірено ${V.date(s.verifiedAt)}.</p><table><thead><tr><th>Компонента вдома</th><th>Компонента партнера</th><th>ECTS</th></tr></thead><tbody>${svc.plan.map(row=>`<tr><td>${e(row.home)}</td><td>${e(row.host)}</td><td>${row.ects}</td></tr>`).join('')}</tbody></table><p>Макет погодження: координатор Erasmus+ → гарант і деканат → приймаючий університет. Цей зразок не є підписаним Learning Agreement і не зараховує кредити.</p>`;
    }
    if(d.kind==='transcript')body+=`<table><thead><tr><th>Освітній компонент</th><th>Демонстраційна оцінка</th></tr></thead><tbody><tr><td>Основи програмування</td><td>84 / 100</td></tr><tr><td>Бази даних</td><td>90 / 100</td></tr><tr><td>Вебтехнології</td><td>88 / 100</td></tr></tbody></table>`;
    if(d.kind==='dual'){
      const reports=state.reports.filter(r=>r.caseId===d.caseId&&r.status==='accepted');
      body+=`<p><strong>Компанія:</strong> Vector Lab, демонстраційний партнер.</p><table><thead><tr><th>Результат</th><th>Години</th><th>Версія</th></tr></thead><tbody>${C.OUTCOMES.map(o=>{const r=reports.find(x=>x.outcomeId===o.id);return `<tr><td>${e(o.title)}</td><td>${r?.hours??'—'}</td><td>${r?.version??'—'}</td></tr>`;}).join('')}</tbody></table><p><strong>Рішення куратора:</strong> ${e(d.decision)}</p><p>Облік годин не є автоматичним нарахуванням кредитів ECTS.</p>`;
    }
    return `<div class="demo-watermark">ДЕМОНСТРАЦІЙНИЙ ЗРАЗОК · НЕ ОФІЦІЙНИЙ ДОКУМЕНТ</div><h3>${C.TYPES[d.kind]}</h3><p class="note">${d.id} · ${V.date(d.issuedAt,true)}</p>${body}<p><strong>Умовне погодження:</strong> ${e(d.issuer)}</p><p class="note">Синтетичні дані прототипу «Міст». Справжнього електронного підпису та підключення до реєстрів немає.</p>`;
  }
  function markup(d,state){
    return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${C.TYPES[d.kind]} · ${d.id} · ДЕМО</title><style>body{font-family:Arial,sans-serif;color:#1d2a3d;line-height:1.6;max-width:760px;margin:40px auto;padding:0 25px}h1{font-size:22px;color:#132c57}h3{font-size:23px}dt{color:#56647a;font-size:14px}dd{margin:0 0 12px;font-weight:600}.demo-watermark{border:2px dashed #947148;padding:13px;background:#fff8ed;color:#704b23;font-weight:700;text-align:center;font-size:14px}.note{font-size:13px;color:#526175}table{border-collapse:collapse;width:100%;margin:20px 0}th,td{border:1px solid #d8e1ed;padding:10px;text-align:left;font-size:14px}button{font:inherit;padding:10px 18px;background:#245cd7;color:white;border:0;border-radius:6px;cursor:pointer}.toolbar{margin-bottom:25px}@media print{body{margin:0;max-width:none}.toolbar{display:none}tr{break-inside:avoid}}@page{size:A4;margin:20mm}</style></head><body><div class="toolbar"><button onclick="window.print()">Друк / зберегти як PDF</button></div><h1>Міст · Університетський кабінет</h1>${content(d,state)}</body></html>`;
  }
  function download(blob,name){
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function downloadDocument(state,actor,id){const d=get(state,actor,id);download(new Blob([markup(d,state)],{type:'text/html;charset=utf-8'}),`${d.id}_DEMO.html`);}
  function printDocument(state,actor,id){
    const d=get(state,actor,id),tab=window.open('','_blank');
    if(!tab)throw new Error('Браузер заблокував вікно. Дозвольте відкриття вікон або завантажте HTML документа.');
    tab.document.open();tab.document.write(markup(d,state));tab.document.close();tab.focus();
  }
  function attachment(state,actor,id){
    const r=C.view(state,actor).reports.find(x=>x.id===id);if(!r?.attachment)throw new Error('Вкладення недоступне.');
    const raw=atob(r.attachment.data),bytes=Uint8Array.from(raw,ch=>ch.charCodeAt(0));
    download(new Blob([bytes],{type:'application/octet-stream'}),r.attachment.name);
  }
  root.MistDocuments={get,content,downloadDocument,printDocument,attachment};
})(globalThis);
