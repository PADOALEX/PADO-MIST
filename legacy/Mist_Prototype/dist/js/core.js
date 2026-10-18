/* Pure workflow model. Role checks simulate policy; this local demo has no authentication. */
(function (root) {
  'use strict';
  const ACTORS = {
    student: { id: 'student', role: 'student', name: 'Марко Коваль', initials: 'МК', label: 'Студент', studentId: 'ST-01', group: 'КН-31' },
    mentor: { id: 'mentor', role: 'mentor', name: 'Ірина Мельник', initials: 'ІМ', label: 'Наставник', companyId: 'CO-01' },
    curator: { id: 'curator', role: 'curator', name: 'Олена Бойко', initials: 'ОБ', label: 'Куратор', group: 'КН-31' }
  };
  const TYPES = {
    study: 'Довідка про навчання',
    transcript: 'Академічна виписка',
    dual: 'Підсумок дуального навчання',
    leokart: 'Довідка для ЛеоКарт',
    dormitory: 'Заява на поселення',
    erasmus: 'Пакет заявки Erasmus+'
  };
  const SERVICES = {
    leokart: {
      id: 'leokart',
      title: 'ЛеоКарт',
      catalogId: 'DOC-LEOKART',
      icon: 'card',
      description: 'Студентська транспортна картка для пільгового проїзду. У кабінеті — перелік матеріалів, готова довідка з обліку та сценарій подання в закладі.',
      packTitle: 'Перелік матеріалів',
      readyHeading: 'Готова довідка',
      readyAction: 'Переглянути довідку',
      routeTitle: 'Сценарій подання документів у навчальному закладі',
      routeAction: 'Переглянути сценарій подання',
      routeNotice: 'Міст не надсилає заявку до ЛеоКарт і не приймає оплату. Офіційні реквізити та пункти прийому уточнюйте в університеті.',
      documentPurpose: 'Оформлення студентської транспортної картки ЛеоКарт',
      materials: [
        { id: 'passport', title: 'Паспорт або ID-картка', note: 'Оригінал для звірки в пункті прийому.' },
        { id: 'tax', title: 'РНОКПП', note: 'Оригінал облікового номера платника податків.' },
        { id: 'photo', title: 'Кольорове фото 3×4', note: 'JPG, зроблене не пізніше ніж за 6 місяців.' },
        { id: 'study', title: 'Довідка з місця навчання', note: 'Готовий зразок уже сформовано з демонстраційного обліку.', source: 'catalog' },
        { id: 'form', title: 'Заява та згода', note: 'Заява на картку і згода на обробку персональних даних.' },
        { id: 'pay', title: 'Квитанція про оплату', note: 'Демонстраційна вартість виготовлення — 60 грн. Оплата в цьому прототипі не виконується.' }
      ],
      route: [
        { title: 'Зберіть матеріали', text: 'Паспорт або ID-картка, РНОКПП, фото 3×4, заява зі згодою та квитанція про оплату виготовлення картки.' },
        { title: 'Завантажте готову довідку', text: 'У картці сервісу відкрийте довідку з місця навчання, збережіть HTML або PDF. Дані студента вже підставлені з обліку.' },
        { title: 'Подайте пакет у закладі', text: 'У Львівській політехніці документи приймають централізовано через профком або вказану аудиторію головного корпусу. Можна також скористатися Порталом мешканця. Цей прототип лише показує сценарій.' },
        { title: 'Очікуйте виготовлення', text: 'Після перевірки статусу навчання картку видають за повідомленням закладу. Міст не бронює і не друкує пластик.' }
      ]
    },
    dormitory: {
      id: 'dormitory',
      title: 'Гуртожиток',
      catalogId: 'DOC-DORMITORY',
      icon: 'home',
      description: 'Поселення до студентського гуртожитку. У кабінеті — готова заява, перевірка комплектності документів і маршрут погодження.',
      packTitle: 'Комплектність документів',
      readyHeading: 'Заява на поселення',
      readyAction: 'Переглянути заяву',
      routeTitle: 'Маршрут погодження поселення',
      routeAction: 'Переглянути маршрут погодження',
      routeNotice: 'Міст не бронює ліжко-місце і не підписує договір. Розподіл місць і ордер на поселення оформлює студмістечко.',
      documentPurpose: 'Поселення до студентського гуртожитку на навчальний рік',
      materials: [
        { id: 'application', title: 'Заява на поселення', note: 'Готовий зразок уже сформовано з демонстраційного обліку.', source: 'catalog' },
        { id: 'passport', title: 'Паспорт або ID-картка', note: 'Оригінал для звірки під час поселення.' },
        { id: 'tax', title: 'РНОКПП', note: 'Оригінал облікового номера платника податків.' },
        { id: 'photo', title: 'Кольорове фото 3×4', note: 'Два примірники для особової справи гуртожитку.' },
        { id: 'medical', title: 'Медична довідка', note: 'Підтвердження відсутності протипоказань до проживання в гуртожитку.' },
        { id: 'status', title: 'Статус студента', note: 'Денна форма навчання перевіряється за університетським обліком.' },
        { id: 'pay', title: 'Квитанція за проживання', note: 'Оплата в цьому прототипі не виконується.' }
      ],
      route: [
        { title: 'Студент подає заяву', text: 'Заяву з кабінету додають до комплекту: паспорт, фото, медична довідка та квитанція.' },
        { title: 'Куратор і деканат', text: 'Перевіряють комплектність і чинний статус навчання групи. Неповний пакет повертають студенту.' },
        { title: 'Студмістечко', text: 'Відділ гуртожитків розподіляє вільне місце з урахуванням курсу, пільг і наявності кімнат.' },
        { title: 'Комендант гуртожитку', text: 'Підтверджує поселення, знайомить з правилами проживання та видає ключ після договору.' },
        { title: 'Договір і ордер', text: 'Студент підписує договір на проживання. Міст цей крок лише показує, ордер не формує.' }
      ]
    },
    erasmus: {
      id: 'erasmus',
      title: 'Erasmus+',
      catalogId: 'DOC-ERASMUS',
      icon: 'globe',
      description: 'Навчальна мобільність. У кабінеті — партнерська програма, пакет заявки та макет погодження навчального плану.',
      packTitle: 'Пакет заявки',
      readyHeading: 'Партнерська програма',
      readyAction: 'Переглянути пакет заявки',
      routeTitle: 'Макет погодження навчального плану',
      routeAction: 'Переглянути макет погодження навчального плану',
      routeNotice: 'Міст не надсилає заявку в Erasmus+ і не зараховує кредити з PDF. Це макет узгодження плану, не Learning Agreement приймаючого університету.',
      documentPurpose: 'Навчальна мобільність Erasmus+ SMS',
      partner: {
        name: 'TU Dresden',
        detail: 'Computer Science · весняний семестр 2026/2027 · макет 30 ECTS'
      },
      materials: [
        { id: 'application', title: 'Онлайн-заявка та номінація', note: 'Готовий пакет уже зібрано з демонстраційного обліку.', source: 'catalog' },
        { id: 'transcript', title: 'Академічна виписка', note: 'Демонстраційні оцінки для приймаючого університету.' },
        { id: 'plan', title: 'Проєкт Learning Agreement', note: 'Макет дисциплін і кредитів ECTS. Справжнього підпису немає.' },
        { id: 'language', title: 'Підтвердження мови навчання', note: 'Сертифікат або оцінка з іноземної мови за вимогами партнера.' },
        { id: 'motivation', title: 'Мотиваційний лист', note: 'Чому обрано цей університет і як мобільність вписується в освітню програму.' },
        { id: 'passport', title: 'Паспорт', note: 'Чинний на весь період мобільності.' }
      ],
      plan: [
        { home: 'Бази даних', host: 'Database Systems', ects: 6 },
        { home: 'Вебтехнології', host: 'Web Engineering', ects: 6 },
        { home: 'Вибіркова компонента', host: 'Software Quality Assurance', ects: 6 },
        { home: 'Курсова робота', host: 'Project Work', ects: 12 }
      ],
      route: [
        { title: 'Студент збирає пакет', text: 'Заявка, виписка, проєкт навчального плану, мовний сертифікат і мотиваційний лист.' },
        { title: 'Академічний координатор Erasmus+', text: 'Перевіряє відповідність дисциплін освітній програмі та обсяг 30 ECTS у макеті.' },
        { title: 'Гарант і деканат', text: 'Погоджують, які результати можна буде визнати після повернення. Кредити автоматично не нараховуються.' },
        { title: 'Приймаючий університет', text: 'Координатор партнера підтверджує набір компонент. У демо цей крок лише показано.' },
        { title: 'Після мобільності', text: 'Transcript of Records з PDF у цьому прототипі не імпортується. Зарахування — наступний етап.' }
      ]
    }
  };
  const OUTCOMES = [
    { id: 'db', title: 'Проєктування бази даних', hours: 16, requirement: 'Спроєктувати пов’язані таблиці та пояснити обмеження цілісності.', example: 'Спроєктував таблиці контактів і компаній, визначив первинні та зовнішні ключі, додав обмеження для обов’язкових полів.', evidence: 'Демонстраційна ER-схема, опис зв’язків і приклади перевірки обмежень.' },
    { id: 'import', title: 'Розроблення функціональності', hours: 24, requirement: 'Реалізувати імпорт CSV із перевіркою вхідних даних та обробкою помилок.', example: 'Реалізував імпорт контактів із CSV, перевірку обов’язкових полів і звіт із номерами помилкових рядків; коректні записи зберігаються в базі даних.', evidence: 'Демонстрація імпорту коректного та некоректного файлів і знеособлений опис реалізації.' },
    { id: 'quality', title: 'Перевірка та документація', hours: 20, requirement: 'Перевірити граничні випадки та підготувати інструкцію використання.', example: 'Перевірив порожній файл, дублікати й некоректні значення, описав результати перевірок та підготував коротку інструкцію для користувача.', evidence: 'Протокол перевірок із результатами та демонстраційна інструкція запуску.' }
  ];
  const STATUSES = {
    requested: ['У черзі', 'amber'], processing: ['Готується', 'blue'], ready: ['Готово', 'green'],
    cancelled: ['Скасовано', 'gray'], rejected: ['Відхилено', 'red'],
    company_review: ['Очікує компанію', 'amber'], plan_review: ['Погодження плану', 'blue'],
    active: ['Навчання триває', 'blue'], completed: ['Навчання завершено', 'green'],
    submitted: ['У наставника', 'amber'], mentor_changes: ['Доопрацювати', 'red'],
    university_review: ['У куратора', 'blue'], curator_changes: ['Доопрацювати', 'red'],
    accepted: ['Результат підтверджено', 'green']
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  function initialState() {
    return {
      schemaVersion: 1, revision: 0, sequence: 0,
      student: { id: 'ST-01', name: 'Марко Коваль', group: 'КН-31', program: 'Комп’ютерні науки', year: 3, status: 'active', verifiedAt: new Date().toISOString(), source: 'Синтетичний університетський облік' },
      company: { id: 'CO-01', name: 'Vector Lab', description: 'Навчальна компанія · розроблення програмного забезпечення', mentorId: 'mentor' },
      documents: [], cases: [], reports: [], events: []
    };
  }
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function clean(value, min = 1, max = 1500) {
    const text = String(value ?? '').trim();
    assert(text.length >= min && text.length <= max, `Введіть текст від ${min} до ${max} символів.`);
    return text;
  }
  function canSeeCase(state, actorId, record) {
    const actor = ACTORS[actorId];
    return !!actor && !!record && (actor.role === 'student' ? record.studentId === actor.studentId : actor.role === 'mentor' ? record.companyId === actor.companyId && record.mentorId === actor.id : record.group === actor.group);
  }
  function canSeeDocument(state, actorId, doc) {
    const actor = ACTORS[actorId];
    if (!actor || !doc) return false;
    if (actor.role === 'student') return doc.studentId === actor.studentId;
    if (actor.role === 'curator') return doc.group === actor.group;
    return state.cases.some(c => canSeeCase(state, actorId, c) && c.documentId === doc.id && c.consent === true);
  }
  function view(state, actorId) {
    assert(ACTORS[actorId], 'Невідома роль.');
    const cases = state.cases.filter(c => canSeeCase(state, actorId, c));
    const ids = cases.map(c => c.id);
    return {
      actor: ACTORS[actorId], student: state.student, company: state.company,
      documents: state.documents.filter(d => canSeeDocument(state, actorId, d)), cases,
      reports: state.reports.filter(r => ids.includes(r.caseId)),
      events: state.events.filter(e => e.audience.includes(actorId))
    };
  }
  function completedOutcomes(state, caseId) {
    return OUTCOMES.filter(o => state.reports.some(r => r.caseId === caseId && r.outcomeId === o.id && r.status === 'accepted')).length;
  }
  function catalogDocument(kind, state) {
    const service = SERVICES[kind];
    assert(service && service.catalogId, 'Невідомий сервісний документ.');
    const student = state.student;
    assert(student && student.id, 'Немає даних студента.');
    return {
      id: service.catalogId,
      studentId: student.id,
      group: student.group,
      kind,
      purpose: service.documentPurpose,
      status: 'ready',
      requestedAt: student.verifiedAt,
      issuedAt: student.verifiedAt,
      issuer: 'Демонстраційний університетський облік',
      snapshot: clone(student),
      catalog: true
    };
  }
  function catalogById(id, state) {
    const kind = Object.keys(SERVICES).find(key => SERVICES[key].catalogId === id);
    return kind ? catalogDocument(kind, state) : null;
  }
  function validateAttachment(file) {
    if (!file) return null;
    assert(typeof file.name === 'string' && /\.(pdf|txt|md|csv|png|jpe?g)$/i.test(file.name), 'Дозволені PDF, TXT, MD, CSV, PNG і JPG.');
    assert(Number.isInteger(file.size) && file.size > 0 && file.size <= 600 * 1024, 'Максимальний розмір одного файла — 600 КБ.');
    assert(typeof file.data === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(file.data) && file.data.length % 4 === 0, 'Не вдалося прочитати вміст файла.');
    const decodedLength = file.data.length / 4 * 3 - (file.data.endsWith('==') ? 2 : file.data.endsWith('=') ? 1 : 0);
    assert(decodedLength === file.size, 'Розмір файла не збігається з його вмістом.');
    return { name: clean(file.name, 1, 180), size: file.size, data: file.data };
  }
  function execute(current, actorId, action) {
    const actor = ACTORS[actorId];
    assert(actor, 'Невідома роль.');
    assert(action && typeof action.type === 'string', 'Невідома дія.');
    const s = clone(current), p = action.payload || {}, now = new Date().toISOString();
    const role = required => assert(actor.role === required, 'Ця дія недоступна для вибраної ролі.');
    const id = prefix => `${prefix}-${String(++s.sequence).padStart(4, '0')}`;
    const event = (message, recordId, audience) => s.events.unshift({ id: id('EV'), at: now, actorId, actorName: actor.name, message, recordId, audience });
    const getCase = caseId => { const c = s.cases.find(x => x.id === caseId); assert(canSeeCase(s, actorId, c), 'Справу не знайдено або доступ обмежено.'); return c; };
    const getReport = reportId => { const r = s.reports.find(x => x.id === reportId); assert(r, 'Звіт не знайдено.'); return [r, getCase(r.caseId)]; };
    const getDocument = docId => { const d = s.documents.find(x => x.id === docId); assert(canSeeDocument(s, actorId, d), 'Документ не знайдено або доступ обмежено.'); return d; };
    const snapshot = () => clone(s.student);
    switch (action.type) {
      case 'requestDocument': {
        role('student'); assert(['study', 'transcript'].includes(p.kind), 'Виберіть тип документа.');
        assert(!s.documents.some(d => d.studentId === actor.studentId && d.kind === p.kind && ['requested', 'processing'].includes(d.status)), 'Такий запит уже є в черзі.');
        const d = { id: id('DOC'), studentId: actor.studentId, group: actor.group, kind: p.kind, purpose: clean(p.purpose, 3, 200), status: 'requested', requestedAt: now, snapshot: snapshot() };
        s.documents.unshift(d); event(`Замовлено: ${TYPES[d.kind]}`, d.id, ['student', 'curator']); break;
      }
      case 'cancelDocument': {
        role('student'); const d = getDocument(p.id); assert(d.status === 'requested', 'Можна скасувати лише запит у черзі.');
        d.status = 'cancelled'; event('Запит скасовано студентом', d.id, ['student', 'curator']); break;
      }
      case 'processDocument': {
        role('curator'); const d = getDocument(p.id); assert(d.status === 'requested', 'Запит уже опрацьовано.');
        d.status = 'processing'; event('Документ взято в роботу', d.id, ['student', 'curator']); break;
      }
      case 'issueDocument': {
        role('curator'); const d = getDocument(p.id); assert(d.status === 'processing', 'Спочатку візьміть запит у роботу.');
        assert(s.student.status === 'active', 'Статус студента потребує перевірки.');
        d.status = 'ready'; d.issuedAt = now; d.issuer = actor.name; d.snapshot = snapshot();
        event('Демонстраційний документ готовий', d.id, ['student', 'curator']); break;
      }
      case 'rejectDocument': {
        role('curator'); const d = getDocument(p.id); assert(['requested', 'processing'].includes(d.status), 'Запит уже завершено.');
        d.comment = clean(p.comment, 5, 800); d.status = 'rejected'; event(`Запит відхилено: ${d.comment}`, d.id, ['student', 'curator']); break;
      }
      case 'apply': {
        role('student'); assert(s.student.status === 'active', 'Спочатку підтвердьте статус навчання.');
        assert(!s.cases.some(c => c.studentId === actor.studentId), 'Для цього студента вже створено справу.');
        const d = getDocument(p.documentId); assert(d.kind === 'study' && d.status === 'ready', 'Для заявки потрібна готова довідка про навчання.');
        assert(p.consent === true, 'Підтвердьте передавання даних обраній компанії.');
        const c = { id: id('CASE'), studentId: actor.studentId, group: actor.group, companyId: s.company.id, mentorId: s.company.mentorId, documentId: d.id, consent: true, status: 'company_review', createdAt: now, motivation: clean(p.motivation, 15, 1200), planVersion: 1 };
        s.cases.unshift(c); event('Заявку на дуальне навчання подано компанії', c.id, ['student', 'mentor', 'curator']); break;
      }
      case 'acceptApplication': {
        role('mentor'); const c = getCase(p.id); assert(c.status === 'company_review', 'Заявка вже опрацьована.');
        c.status = 'plan_review'; c.mentorApprovedAt = now; event('Компанія підтвердила участь і план', c.id, ['student', 'mentor', 'curator']); break;
      }
      case 'approvePlan': {
        role('curator'); const c = getCase(p.id); assert(c.status === 'plan_review', 'Спочатку компанія має підтвердити участь.');
        c.status = 'active'; c.planApprovedAt = now; event('Університет погодив план навчання, версія 1', c.id, ['student', 'mentor', 'curator']); break;
      }
      case 'submitReport': {
        role('student'); const c = getCase(p.caseId); assert(c.status === 'active', 'Звіти доступні після погодження плану.');
        assert(OUTCOMES.some(o => o.id === p.outcomeId), 'Виберіть результат навчання.');
        let r = p.id ? s.reports.find(x => x.id === p.id) : null;
        if (p.id) {
          assert(r && r.caseId === c.id && ['mentor_changes', 'curator_changes'].includes(r.status), 'Цю версію звіту вже передано на перевірку.');
          assert(p.version === r.version, 'Версія звіту змінилася. Відкрийте актуальний запис ще раз.');
        }
        assert(!s.reports.some(x => x.caseId === c.id && x.outcomeId === p.outcomeId && x.id !== p.id), 'Для цього результату вже існує звіт; доопрацюйте його.');
        const hours = Number(p.hours); assert(Number.isFinite(hours) && hours >= 0.5 && hours <= 160, 'Вкажіть кількість годин від 0,5 до 160.');
        const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d)) && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
        assert(validDate(p.from) && validDate(p.to) && p.from <= p.to, 'Перевірте початок і кінець звітного періоду.');
        assert(p.to <= now.slice(0, 10), 'Звітний період не може завершуватися в майбутньому.');
        const file = validateAttachment(p.attachment);
        const total = s.reports.filter(x => x.id !== p.id).reduce((sum, x) => sum + (x.attachment?.size || 0), 0) + (file?.size || 0);
        assert(total <= 2 * 1024 * 1024, 'Загальний розмір вкладень перевищує 2 МБ. Виберіть менший файл.');
        const fields = { outcomeId: p.outcomeId, hours, from: p.from, to: p.to, summary: clean(p.summary, 30, 3000), evidence: clean(p.evidence, 15, 2000), attachment: file, status: 'submitted', submittedAt: now, mentorApproval: null, curatorApproval: null, comment: '' };
        if (r) { Object.assign(r, fields); r.version++; } else { r = { id: id('REP'), caseId: c.id, version: 1, ...fields }; s.reports.unshift(r); }
        event(`Подано звіт, версія ${r.version}: ${OUTCOMES.find(o => o.id === r.outcomeId).title}`, r.id, ['student', 'mentor', 'curator']); break;
      }
      case 'reviewReport': {
        const [r, c] = getReport(p.id); assert(c.status === 'active', 'Справу вже завершено.');
        assert(p.version === r.version, 'Версія звіту змінилася. Оновіть сторінку й перегляньте актуальний звіт.');
        assert(['approve', 'return'].includes(p.decision), 'Виберіть рішення.');
        assert(actor.role === 'mentor' || actor.role === 'curator', 'Студент не може погоджувати свій звіт.');
        assert(r.status === (actor.role === 'mentor' ? 'submitted' : 'university_review'), 'Звіт не очікує вашого рішення.');
        if (actor.role === 'curator') assert(r.mentorApproval?.version === r.version, 'Наставник має підтвердити поточну версію.');
        const comment = clean(p.comment, 5, 800);
        if (p.decision === 'return') { r.status = actor.role === 'mentor' ? 'mentor_changes' : 'curator_changes'; r.comment = comment; r.mentorApproval = null; r.curatorApproval = null; }
        else {
          assert(p.confirmed === true, 'Підтвердьте перевірку результату навчання.');
          r.status = actor.role === 'mentor' ? 'university_review' : 'accepted';
          r[actor.role === 'mentor' ? 'mentorApproval' : 'curatorApproval'] = { actorId, name: actor.name, at: now, version: r.version, comment };
          r.comment = comment;
        }
        event(`${p.decision === 'return' ? 'Звіт повернуто на доопрацювання' : actor.role === 'mentor' ? 'Наставник підтвердив звіт' : 'Куратор підтвердив результат'}, версія ${r.version}: ${comment}`, r.id, ['student', 'mentor', 'curator']); break;
      }
      case 'completeCase': {
        role('curator'); const c = getCase(p.id); assert(c.status === 'active', 'Навчання вже завершено або план ще не погоджено.');
        assert(completedOutcomes(s, c.id) === OUTCOMES.length, 'Спочатку оцініть усі три результати навчання.');
        assert(p.confirmed === true, 'Підтвердьте підсумкове рішення.');
        c.decision = clean(p.comment, 15, 1200); c.status = 'completed'; c.completedAt = now; c.curatorName = actor.name;
        const d = { id: id('DOC'), kind: 'dual', studentId: c.studentId, group: c.group, caseId: c.id, purpose: 'Підсумок виконання погодженого плану', status: 'ready', requestedAt: now, issuedAt: now, issuer: actor.name, snapshot: snapshot(), decision: c.decision };
        s.documents.unshift(d); event('Оцінювання завершено; електронний підсумок доступний у документах', c.id, ['student', 'mentor', 'curator']); break;
      }
      default: throw new Error('Невідома дія.');
    }
    s.revision++; return s;
  }
  const api = { ACTORS, TYPES, OUTCOMES, STATUSES, SERVICES, initialState, execute, view, completedOutcomes, canSeeCase, canSeeDocument, catalogDocument, catalogById, validateAttachment };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MistCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
