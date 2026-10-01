/* Arabic engineering portal. All authorization is also enforced in src/api.js. */
const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const e = escapeHTML;
const paths = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  projects: '<path d="M3 21h18M5 21V6l7-3 7 3v15M9 21v-5h6v5M9 8h1m4 0h1M9 12h1m4 0h1"/>',
  inspections: '<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m8 13 3 3 5-6"/>',
  reports: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 13h6m-6 4h6"/>',
  contracts: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 13h6m-6 4h3"/><path d="m14 18 2 2 4-4"/>',
  users: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-2-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', arrow: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  location: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  alert: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
  logout: '<path d="M9 4H4v16h5m5-13 5 5-5 5m-7-5h12"/>',
  photo: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m21 16-6-6L3 21"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  edit: '<path d="m14 5 5 5M4 20l5-1L21 7l-5-5L4 14v6Z"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.inspections}</svg>`;
const labels = { active: 'قيد التنفيذ', on_hold: 'متوقف مؤقتًا', completed: 'مكتمل', pending: 'بانتظار الكشف', in_progress: 'قيد المراجعة', approved: 'مطابق', needs_action: 'يحتاج إجراء' };
const inspectionCategories = ['أساسات', 'أعمدة', 'كمرات وبلاطات', 'تسليح', 'صب خرسانة', 'عزل', 'تشطيبات', 'سلامة', 'أخرى'];
const inspectionChecklistTemplates = {
  'أساسات': [['excavation', 'الحفر والمناسيب'], ['reinforcement', 'تسليح الأساسات'], ['formwork', 'القوالب والتثبيت'], ['concrete', 'جاهزية الصب'], ['protection', 'العزل والحماية']],
  'أعمدة': [['layout', 'المحاور والمناسيب'], ['reinforcement', 'تسليح الأعمدة والغطاء الخرساني'], ['formwork', 'استقامة القوالب وتثبيتها'], ['openings', 'الفتحات والتفاصيل'], ['cleanliness', 'النظافة قبل الصب']],
  'كمرات وبلاطات': [['levels', 'المناسيب والسماكات'], ['reinforcement', 'تسليح الكمرات والبلاطات'], ['supports', 'الدعامات والقوالب'], ['openings', 'الفتحات والتمديدات'], ['cleanliness', 'النظافة قبل الصب']],
  'تسليح': [['drawings', 'مطابقة المخططات'], ['spacing', 'المسافات والأقطار'], ['cover', 'الغطاء الخرساني'], ['laps', 'الوصلات والتراكبات'], ['cleanliness', 'النظافة وعدم وجود صدأ مؤثر']],
  'صب خرسانة': [['approval', 'اعتماد التسليح والقوالب'], ['mix', 'خلطة الخرسانة وبيانات التوريد'], ['placement', 'طريقة الصب والدمك'], ['samples', 'أخذ العينات والفحوصات'], ['curing', 'المعالجة بعد الصب']],
  'عزل': [['surface', 'تجهيز السطح'], ['material', 'نوع المادة واعتمادها'], ['application', 'طريقة التطبيق والتغطية'], ['joints', 'المفاصل والاختراقات'], ['test', 'اختبار العزل قبل الإغلاق']],
  'تشطيبات': [['material', 'مطابقة المواد والعينات'], ['levels', 'الاستقامة والمناسيب'], ['finish', 'جودة التنفيذ والإنهاء'], ['joints', 'الفواصل والزوايا'], ['cleanliness', 'النظافة وحماية الأعمال']],
  'سلامة': [['ppe', 'معدات الحماية الشخصية'], ['access', 'الممرات ومخارج الطوارئ'], ['barriers', 'الحواجز والتنبيه حول المخاطر'], ['scaffold', 'السقالات ووسائل الوصول'], ['housekeeping', 'ترتيب ونظافة الموقع']],
  'أخرى': [['drawings', 'مطابقة المخططات والتعليمات'], ['materials', 'المواد المستخدمة'], ['workmanship', 'جودة التنفيذ'], ['safety', 'متطلبات السلامة'], ['notes', 'ملاحظات إضافية']]
};
const checklistStatusLabels = { pending: 'لم يُراجع', pass: 'مطابق', fail: 'غير مطابق', na: 'غير منطبق' };
function checklistItems(category, existing = []) {
  const defaults = (inspectionChecklistTemplates[category] || inspectionChecklistTemplates['أخرى']).map(([key, label]) => ({ key, label, status: 'pending', note: '' }));
  const saved = new Map((Array.isArray(existing) ? existing : []).filter(item => item?.key).map(item => [item.key, item]));
  const merged = defaults.map(item => ({ ...item, ...(saved.get(item.key) || {}) }));
  const extra = (Array.isArray(existing) ? existing : []).filter(item => item?.key && !defaults.some(base => base.key === item.key)).slice(0, 30 - merged.length);
  return [...merged, ...extra];
}
function checklistEditor(category, existing = []) {
  const items = checklistItems(category, existing);
  return `<div class="checklist-box"><div class="checklist-head"><div><h3>قائمة الفحص الجاهزة</h3><small class="muted">اختر نتيجة كل بند، وأضف ملاحظة عند الحاجة.</small></div><span class="badge">${items.length} بنود</span></div><input type="hidden" name="checklistKeys" value="${e(JSON.stringify(items.map(item => item.key)))}"><div class="checklist-editor">${items.map(item => `<div class="checklist-row"><div class="checklist-label"><strong>${e(item.label)}</strong>${item.note ? `<small>${e(item.note)}</small>` : ''}</div><label class="checklist-status"><span>النتيجة</span><select name="check_${e(item.key)}">${Object.entries(checklistStatusLabels).map(([key, value]) => `<option value="${key}" ${item.status === key ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label class="checklist-note"><span>ملاحظة</span><input name="check_note_${e(item.key)}" value="${e(item.note || '')}" maxlength="600" placeholder="اختياري"></label></div>`).join('')}</div></div>`;
}
function checklistFromForm(form, category) {
  let keys = [];
  try { keys = JSON.parse(form.elements.checklistKeys?.value || '[]'); } catch { keys = []; }
  const templates = new Map(checklistItems(category).map(item => [item.key, item.label]));
  return keys.map(key => ({ key, label: templates.get(key) || key, status: form.elements[`check_${key}`]?.value || 'pending', note: form.elements[`check_note_${key}`]?.value || '' }));
}
function wireInspectionChecklist(form, existing = []) {
  const container = form.querySelector('[data-checklist-container]');
  const category = form.elements.category;
  if (!container || !category) return;
  let activeCategory = category.value;
  category.addEventListener('change', () => { const current = category.value === activeCategory ? checklistFromForm(form, activeCategory) : []; activeCategory = category.value; container.innerHTML = checklistEditor(category.value, current); });
}
function checklistView(items = []) {
  if (!items.length) return `<p class="muted">لم تُعبّأ قائمة فحص لهذا السجل بعد. افتح التعديل لتعبئتها.</p>`;
  const passed = items.filter(item => item.status === 'pass').length;
  return `<div class="checklist-summary"><strong>${passed} من ${items.length} مطابق</strong><span>${items.filter(item => item.status === 'fail').length ? 'يوجد بند يحتاج إجراء' : 'يمكن اعتماد النتيجة بعد المراجعة'}</span></div><div class="checklist-view">${items.map(item => `<div class="checklist-view-row"><div><strong>${e(item.label)}</strong>${item.note ? `<small>${e(item.note)}</small>` : ''}</div><span class="checklist-result ${e(item.status)}">${e(checklistStatusLabels[item.status] || item.status)}</span></div>`).join('')}</div>`;
}
const badge = status => `<span class="badge ${e(status)}">${e(labels[status] || status)}</span>`;
const preview = !!window.PORTAL_PREVIEW;
let boot, page = 1, currentRoute = 'dashboard', query = '', statusFilter = '', renderId = 0, initialized = true;
let toastTimer;
const isAdmin = () => boot?.user.role === 'admin';
const canWrite = () => isAdmin() && (!preview || window.PORTAL_PREVIEW.editable);
const date = value => value ? new Date(value).toLocaleDateString(window.portalLang || 'ar', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const projectName = id => boot.projects.find(p => p._id === id)?.name || 'مشروع غير متاح';
const userName = (id, fallback = '') => boot.employees.find(u => u._id === id)?.name || fallback || 'حساب غير متاح';
const asset = name => (preview ? 'public/assets/' : '/assets/') + name;
const userPhotoUrl = user => user?.profilePhotoPreviewUrl || (user?.profilePhotoId ? `/api/photos/${encodeURIComponent(user.profilePhotoId)}` : '');
const photoUrl = photo => preview ? (photo?.previewUrl || '') : `/api/photos/${encodeURIComponent(photo?._id || '')}`;
function avatarMarkup(user) {
  const photo = userPhotoUrl(user);
  return photo ? `<span class="avatar avatar-photo"><img src="${e(photo)}" alt=""></span>` : `<span class="avatar">${e((user?.name || '?').slice(0, 1))}</span>`;
}
const brand = () => `<div class="brand"><img src="${asset('logo.png')}" alt="Almasri Engineering"><div><strong>Almasri</strong><small>Engineering</small></div></div>`;
const disabled = () => preview && !window.PORTAL_PREVIEW.editable ? 'disabled title="غير متاح في المعاينة"' : '';

async function api(path, options = {}) {
  if (preview) return window.PORTAL_PREVIEW.request(path, options);
  let response;
  try { response = await fetch(path, { credentials: 'same-origin', ...options, headers: { 'X-Requested-With': 'EngineeringPortal', ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers } }); }
  catch { throw new Error('تعذر الاتصال. تحقق من الإنترنت ثم حاول مجددًا.'); }
  const data = await response.json().catch(() => ({ error: 'تعذر قراءة الرد. تأكد من تشغيل المشروع حسب الدليل.' }));
  if (!response.ok) {
    if (response.status === 401 && boot) { boot = null; $('#modal').close(); showAuth(); }
    throw new Error(data.error || 'تعذرت العملية');
  }
  return data;
}
const send = (path, method, data) => api(path, { method, ...(data ? { body: JSON.stringify(data) } : {}) });
function toast(message) { $('#toast').textContent = message; $('#toast').className = 'visible'; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').className = '', 5000); }
function formError(form, error) { const node = form.querySelector('.form-error'); if (node) { node.textContent = error.message || error; node.className = 'form-error error-box'; } else toast(error.message || error); }
function modal(title, content) {
  const node = $('#modal'); node.innerHTML = `<div class="modal-head"><h2 id="modal-title">${e(title)}</h2><button class="close-btn" data-close aria-label="إغلاق">${icon('close')}</button></div><div class="modal-body">${content}</div>`;
  if (!node.open) node.showModal();
  node.querySelector('[data-close]').onclick = () => node.close();
  node.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => node.close());
}
function field(name, label, value = '', type = 'text', required = true, extra = '') {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${e(value)}" ${required ? 'required' : ''} ${extra}></label>`;
}
function select(name, label, options, value = '', required = true) {
  return `<label class="field"><span>${label}</span><select name="${name}" ${required ? 'required' : ''}>${options.map(([id, title]) => `<option value="${e(id)}" ${id === value ? 'selected' : ''}>${e(title)}</option>`).join('')}</select></label>`;
}
function projectPicker(value = '', manualValue = '', required = true) {
  const exists = boot.projects.some(project => project._id === value);
  const selected = exists ? value : value ? '__manual__' : '';
  const options = [['', required ? 'اختر المشروع' : 'دون مشروع'], ...boot.projects.map(project => [project._id, project.name]), ['__manual__', '＋ إضافة مشروع جديد يدويًا']];
  return `<div class="project-picker full"><div class="project-picker-select">${select('projectId', 'المشروع', options, selected, required)}</div><label class="field manual-project-field ${selected === '__manual__' ? 'is-visible' : ''}" data-manual-project><span>اسم المشروع الجديد</span><input name="manualProjectName" value="${e(manualValue)}" maxlength="160" placeholder="اكتب اسم المشروع يدويًا" ${selected === '__manual__' ? 'required' : ''}></label><small class="help">يمكنك اختيار مشروع محفوظ أو إضافة مشروع جديد من هذه الخانة.</small></div>`;
}
function wireProjectPicker(form) {
  const picker = form.querySelector('.project-picker'); const selectNode = form.elements.projectId; const manual = form.querySelector('[data-manual-project]');
  if (!picker || !selectNode || !manual) return;
  const input = manual.querySelector('input');
  const sync = () => { const visible = selectNode.value === '__manual__'; manual.classList.toggle('is-visible', visible); input.required = visible; if (!visible) input.value = ''; };
  selectNode.addEventListener('change', sync); sync();
}
async function resolveProject(data) {
  if (data.projectId !== '__manual__') { delete data.manualProjectName; return data; }
  const name = String(data.manualProjectName || '').trim();
  if (!name) throw new Error('اكتب اسم المشروع الجديد');
  const created = await send('/api/projects', 'POST', { name, code: `PRJ-${Date.now().toString().slice(-6)}`, description: '', status: 'active', location: { address: '', lat: null, lng: null } });
  delete data.manualProjectName; data.projectId = created._id; boot.projects.push(created); return data;
}
const formFooter = () => '<div class="modal-foot"><button type="button" class="btn secondary" data-cancel>إلغاء</button><button class="btn" type="submit">حفظ البيانات</button></div>';
const errorSlot = '<div class="form-error" role="alert"></div>';
function locationFields(item = {}) {
  return `<div class="full"><div class="section-label">${icon('location')} موقع المشروع / الكشف</div>${field('address', 'العنوان', item.address, 'text', false, 'maxlength="300"')}
  <div class="location-grid">${field('lat', 'خط العرض', item.lat ?? '', 'number', false, 'min="-90" max="90" step="any" dir="ltr"')}${field('lng', 'خط الطول', item.lng ?? '', 'number', false, 'min="-180" max="180" step="any" dir="ltr"')}</div>
  <button type="button" class="text-link" data-gps>${icon('location')} استخدام موقعي الحالي</button><small class="help" data-gps-status>يمكن كتابة العنوان فقط أو إضافة الإحداثيات لفتح الخريطة.</small></div>`;
}
function wireGPS(form) {
  const button = form.querySelector('[data-gps]'); if (!button) return;
  button.onclick = () => {
    const hint = form.querySelector('[data-gps-status]');
    if (!navigator.geolocation) { hint.textContent = 'تحديد الموقع غير مدعوم. أدخل الإحداثيات يدويًا.'; return; }
    button.disabled = true; hint.textContent = 'جارٍ تحديد الموقع…';
    navigator.geolocation.getCurrentPosition(pos => {
      form.elements.lat.value = pos.coords.latitude.toFixed(6); form.elements.lng.value = pos.coords.longitude.toFixed(6);
      hint.textContent = `تم تحديد الموقع؛ دقة تقريبية ${Math.round(pos.coords.accuracy)} متر.`; button.disabled = false;
    }, () => { hint.textContent = 'تعذر تحديد الموقع. اسمح بالوصول أو اكتب الإحداثيات يدويًا.'; button.disabled = false; }, { enableHighAccuracy: true, timeout: 15000 });
  };
}
function withLocation(data) { const { lat, lng, address, ...rest } = data; return { ...rest, location: { lat, lng, address } }; }
function showAuth(setup = false, message = '') {
  document.body.classList.add('login-screen');
  $('#app').innerHTML = `<main class="auth-page"><section class="auth-intro">${brand()}<div><div class="eyebrow">ENGINEERING WORKSPACE</div><h1>كل تفاصيل الموقع.<br><span>في مكان واحد.</span></h1><p>تابع المشاريع، وثّق الكشوفات، وابقَ على اتصال بفريقك في الميدان.</p></div><div class="auth-foot">من المخطط إلى التنفيذ — ركن معك.</div></section>
  <section class="auth-form-wrap"><form class="auth-form" id="auth"><img class="login-logo" src="${asset('logo.png')}" alt="Almasri Engineering"><div class="eyebrow">${setup ? 'FIRST TIME SETUP' : 'WELCOME BACK'}</div><h2>${setup ? 'إنشاء المدير الرئيسي' : 'أهلًا بعودتك'}</h2><p>${setup ? 'تُستخدم هذه الخطوة مرة واحدة لتهيئة نظامك.' : 'سجّل الدخول إلى مساحة عملك الهندسية.'}</p>${errorSlot}
  ${setup ? field('setupToken', 'رمز التهيئة', '', 'password', true, 'autocomplete="off" minlength="32"') + field('name', 'اسم المدير', '', 'text', true, 'maxlength="160"') : ''}
  ${field('employeeNo', setup ? 'رقم المدير / اسم الدخول' : 'رقم الموظف', setup ? '05340173180' : '', 'text', true, 'autocomplete="username" maxlength="40"')}
  ${field('password', 'كلمة المرور', '', 'password', true, `autocomplete="${setup ? 'new-password' : 'current-password'}" minlength="6" maxlength="128"`)}
  <button class="btn" type="submit">${setup ? 'إنشاء الحساب' : 'تسجيل الدخول'} ${icon('arrow')}</button>
  <p class="auth-meta">${setup ? 'اختر كلمة مرور من 6 أحرف على الأقل.' : 'بيانات الدخول يزوّدك بها مدير النظام.'}</p>
  ${!initialized ? `<button type="button" class="text-link" id="toggle-setup">${setup ? 'العودة إلى تسجيل الدخول' : 'تهيئة النظام لأول مرة'}</button>` : ''}</form></section></main>`;
  const form = $('#auth'); if (message) formError(form, message);
  $('#toggle-setup')?.addEventListener('click', () => showAuth(!setup));
  form.onsubmit = async ev => {
    ev.preventDefault(); const button = form.querySelector('[type=submit]'); button.disabled = true;
    try { const data = Object.fromEntries(new FormData(form)); await send(setup ? '/api/setup' : '/api/login', 'POST', data);
      if (setup) { initialized = true; showAuth(); toast('تم إنشاء المدير. سجّل الدخول الآن.'); } else await enter();
    } catch (error) { formError(form, error); } finally { button.disabled = false; }
  };
}
async function enter() {
  boot = await api('/api/bootstrap'); shell(); await route();
}
function shell() {
  document.body.classList.remove('login-screen');
  const u = boot.user;
  const links = [['dashboard', 'لوحة التحكم'], ['projects', isAdmin() ? 'المشاريع' : 'مشروعي'], ['inspections', isAdmin() ? 'جميع الكشوفات' : 'الكشوفات الخاصة بي'], ...(isAdmin() ? [['mine', 'الكشوفات الخاصة بي'], ['users', 'فريق العمل'], ['reports', 'التقارير'], ['contracts', 'العقود'], ['activity', 'سجل النشاط']] : []), ['account', 'حسابي']];
  $('#app').innerHTML = `<div class="mobile-backdrop" id="nav-backdrop"></div><aside class="sidebar">${brand()}<div class="nav-label">مساحة العمل</div><nav class="nav" aria-label="القائمة الرئيسية">${links.map(([key, label]) => `<button data-nav="${key}">${icon(key === 'mine' ? 'inspections' : key === 'account' ? 'lock' : key)}${label}</button>`).join('')}</nav>
  <div class="side-bottom"><div class="account">${avatarMarkup(u)}<div><strong class="small">${e(u.name)}</strong><div class="muted small">${isAdmin() ? 'مدير النظام' : e(u.profession)}</div></div></div><button id="logout" ${disabled()}>${icon('logout')} تسجيل الخروج</button></div></aside>
  <div class="workspace">${preview ? '<div class="preview-banner">تجربة المعاينة — البيانات محفوظة في هذا المتصفح فقط ولا تتزامن بين الأجهزة.</div>' : ''}<header class="topbar"><div class="crumb"><button class="mobile-menu" id="mobile-menu" aria-label="فتح القائمة" aria-expanded="false">${icon('menu')}</button><span class="muted">مساحة العمل</span><span class="muted">/</span><span id="breadcrumb">لوحة التحكم</span></div><div class="topbar-end"><span class="date muted">${date(new Date())}</span>${avatarMarkup(u)}</div></header><main class="content" id="content" tabindex="-1"></main></div>`;
  document.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => navigate(b.dataset.nav));
  $('#mobile-menu').onclick = () => menu(true); $('#nav-backdrop').onclick = () => menu(false);
  $('#logout').onclick = async () => { try { await send('/api/logout', 'POST'); boot = null; location.hash = ''; showAuth(); } catch (err) { toast(err.message); } };
}
function menu(open) { $('.sidebar')?.classList.toggle('open', open); $('#nav-backdrop')?.classList.toggle('open', open); $('#mobile-menu')?.setAttribute('aria-expanded', String(open)); }
function navigate(destination) { page = 1; query = ''; statusFilter = ''; menu(false); if (location.hash.slice(1) === destination) route(); else location.hash = destination; }
function heading(title, subtitle, action = '') { return `<div class="page-heading"><div><div class="eyebrow">ALMASRI / ENGINEERING</div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`; }
function addButton(kind, textValue) { const allowed = isAdmin() || (kind === 'inspections' && boot?.user?.role === 'employee'); return allowed ? `<button class="btn" data-add="${kind}" ${disabled()}>${icon('plus')}${textValue}</button>` : ''; }
function empty(title, subtitle = '') { return `<div class="empty">${icon('inspections')}<h3>${title}</h3><p>${subtitle}</p></div>`; }
function stats() {
  const s = boot.stats;
  return `<div class="stats">${[['projects', 'المشاريع', s.projects, 'المشاريع المتاحة لك'], ['inspections', 'الكشوفات', s.inspections, isAdmin() ? 'جميع الكشوفات المسجلة' : 'الكشوفات المخصصة لك'], ['check', 'كشوفات مطابقة', s.approved, 'نتائج الكشف المعتمدة'], ['alert', 'تحتاج إجراء', s.needsAction, 'تتطلب متابعة ميدانية']].map(([ic, title, num, hint]) => `<article class="stat ${ic === 'alert' ? 'attention' : ''}"><div class="stat-top"><span>${title}</span><span class="stat-icon">${icon(ic)}</span></div><strong>${num}</strong><small>${hint}</small></article>`).join('')}</div>`;
}
function inspectionTable(items) {
  if (!items.length) return empty('لا توجد كشوفات بعد', isAdmin() ? 'أضف مشروعًا وموظفًا، ثم أنشئ أول كشف.' : 'ستظهر هنا الكشوفات التي يخصصها لك المدير.');
  return `<div class="table-wrap"><table><thead><tr><th>الكشف / المشروع</th><th>المهندس المسؤول</th><th>التاريخ</th><th>الحالة</th><th>التفاصيل</th></tr></thead><tbody>${items.map(item => { const assigned = boot.employees.find(u => u._id === item.assignedTo); const name = assigned?.name || item.assignedName || 'الموظف غير متاح'; const no = assigned?.employeeNo || item.assignedEmployeeNo || 'رقم الموظف غير متاح'; const profession = assigned?.profession || ''; return `<tr><td><span class="cell-title" data-user-content>${e(item.title)}</span><span class="cell-sub">${e(projectName(item.projectId))}</span></td><td><strong>${e(name)}</strong><span class="cell-sub">${e(no)}${profession ? ` · ${e(profession)}` : ''}</span></td><td>${date(item.date)}</td><td>${badge(item.status)}</td><td><button class="text-link" data-view="inspections/${e(item._id)}">عرض ${icon('arrow')}</button></td></tr>`; }).join('')}</tbody></table></div>`;
}
async function route() {
  if (!boot) return; const ticket = ++renderId; currentRoute = location.hash.slice(1) || 'dashboard';
  const section = currentRoute.split('/')[0];
  if (!isAdmin() && ['users', 'reports', 'contracts', 'activity'].includes(section)) { navigate('dashboard'); return; }
  document.querySelectorAll('[data-nav]').forEach(b => { b.classList.toggle('active', b.dataset.nav === section); b.setAttribute('aria-current', b.dataset.nav === section ? 'page' : 'false'); });
  const titles = { dashboard: 'لوحة التحكم', projects: 'المشاريع', inspections: 'الكشوفات', mine: 'الكشوفات الخاصة بي', users: 'فريق العمل', reports: 'التقارير', contracts: 'العقود', activity: 'سجل النشاط', account: 'حسابي' };
  $('#breadcrumb').textContent = titles[section] || 'التفاصيل';
  $('#content').innerHTML = '<div class="loading">جارٍ تحميل البيانات…</div>';
  try {
    let html;
    if (currentRoute.includes('/')) html = await detail(section, currentRoute.split('/')[1]);
    else if (section === 'dashboard') {
      const [result, attentionResult] = await Promise.all([api('/api/inspections?page=1'), api('/api/inspections?status=needs_action&page=1')]); const s = boot.stats;
      const attentionItems = (attentionResult.items || []).slice(0, 5);
      const attentionPanel = `<section class="panel notification-panel"><div class="panel-head"><div><h2>تنبيهات المتابعة</h2><small class="muted">الكشوفات التي تحتاج إجراء</small></div><span class="notification-count">${attentionResult.total || 0}</span></div>${attentionItems.length ? `<div class="notification-list">${attentionItems.map(item => `<button class="notification-item" data-view="inspections/${e(item._id)}"><span class="notification-icon">${icon('alert')}</span><span><strong>${e(item.title)}</strong><small>${e(projectName(item.projectId))} · ${date(item.date)}</small></span>${icon('arrow')}</button>`).join('')}</div>${(attentionResult.total || 0) > attentionItems.length ? `<button class="text-link notification-more" data-view="inspections">عرض كل التنبيهات ${icon('arrow')}</button>` : ''}` : `<div class="notification-empty">لا توجد كشوفات تحتاج إجراء حاليًا.</div>`}</section>`;
      html = heading(`أهلًا، ${e(boot.user.name.split(' ')[0])}`, 'نظرة على مشاريعك ومتابعاتك الميدانية اليوم.', addButton('inspections', 'كشف جديد')) + stats() + `<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>أحدث الكشوفات</h2><small class="muted">متابعة العمل، كشفًا بعد كشف</small></div><button class="text-link" data-view="inspections">عرض الكل ${icon('arrow')}</button></div>${inspectionTable(result.items.slice(0, 6))}</section><aside class="dashboard-aside">${attentionPanel}<section class="panel block"><div class="panel-head"><h2>حالة الكشوفات</h2>${icon('check')}</div><div class="panel-body"><div class="progress-label"><span>مطابقة</span><strong>${s.approved} من ${s.inspections}</strong></div><progress value="${s.approved}" max="${Math.max(s.inspections, 1)}" aria-label="الكشوفات المطابقة"></progress><div class="progress-label"><span>تحتاج إجراء</span><strong>${s.needsAction}</strong></div><progress value="${s.needsAction}" max="${Math.max(s.inspections, 1)}" aria-label="كشوفات تحتاج إجراء"></progress><p class="side-note">${isAdmin() ? 'راجع الملاحظات والصور وقائمة الفحص قبل تحديث نتيجة الكشف.' : 'أضف ملاحظاتك وصور الموقع إلى الكشف المخصص لك.'}</p></div></section><section class="panel"><div class="panel-head"><h2>وصول سريع</h2></div><div class="panel-body"><button class="quick-link" data-view="projects"><span>${icon('projects')} المشاريع</span>${icon('arrow')}</button><button class="quick-link" data-view="${isAdmin() ? 'users' : 'inspections'}"><span>${icon(isAdmin() ? 'users' : 'inspections')} ${isAdmin() ? 'فريق العمل' : 'كشوفاتي'}</span>${icon('arrow')}</button></div></section></aside></div>`;
    } else if (section === 'reports') html = await reportsPage();
    else if (section === 'contracts') html = await contractsPage();
    else if (section === 'activity') html = await activityPage();
    else if (section === 'account') html = await accountPage();
    else if (['users', 'projects', 'inspections', 'mine'].includes(section)) html = await listPage(section);
    else { navigate('dashboard'); return; }
    if (ticket !== renderId || !boot) return;
    $('#content').innerHTML = html; wireContent();
  } catch (err) { if (ticket !== renderId || !boot) return; $('#content').innerHTML = `<div class="error-box">${e(err.message)}</div><button class="btn secondary" id="retry">إعادة المحاولة</button>`; $('#retry').onclick = route; }
}
function pager(result) { return `<div class="pagination"><span>${result.total} سجل · الصفحة ${result.page} من ${Math.max(result.pages, 1)}</span><div class="actions"><button class="btn secondary small" data-page="${result.page - 1}" ${result.page <= 1 ? 'disabled' : ''}>السابق</button><button class="btn secondary small" data-page="${result.page + 1}" ${result.page >= result.pages ? 'disabled' : ''}>التالي</button></div></div>`; }
async function listPage(section) {
  const kind = section === 'mine' ? 'inspections' : section;
  const result = await api(`/api/${kind}?page=${page}&q=${encodeURIComponent(query)}&status=${encodeURIComponent(statusFilter)}${section === 'mine' ? '&mine=1' : ''}`);
  const title = { projects: 'المشاريع', users: 'فريق العمل', inspections: isAdmin() ? 'جميع الكشوفات' : 'الكشوفات الخاصة بي', mine: 'الكشوفات الخاصة بي' }[section];
  const subtitle = { projects: 'معلومات المشاريع، مواقعها، ومرفقاتها.', users: 'إدارة الموظفين وتوزيع المشاريع والصلاحيات.', inspections: 'وثّق الملاحظات وتابع نتائج التفتيش الميداني.', mine: 'الكشوفات المخصصة لحسابك — My Inspections' }[section];
  const statusOptions = kind === 'projects' ? ['active', 'on_hold', 'completed'] : ['pending', 'in_progress', 'approved', 'needs_action'];
  let html = heading(title, subtitle, addButton(kind, { users: 'إضافة موظف', projects: 'مشروع جديد', inspections: 'كشف جديد' }[kind]));
  html += `<form class="filters" id="filters"><label class="search">${icon('search')}<input name="q" value="${e(query)}" aria-label="بحث" placeholder="ابحث بالاسم أو الوصف…" maxlength="100"></label>${kind !== 'users' ? `<select name="status" aria-label="تصفية حسب الحالة"><option value="">جميع الحالات</option>${statusOptions.map(s => `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${labels[s]}</option>`).join('')}</select>` : ''}<button class="btn secondary" type="submit">بحث</button></form>`;
  if (kind === 'projects') {
    html += result.items.length ? `<div class="cards">${result.items.map(item => `<article class="project-card"><div class="card-top"><div class="project-symbol">${icon('projects')}<span class="code">${e(item.code)}</span></div>${badge(item.status)}</div><div class="card-body"><h2>${e(item.name)}</h2><p>${e(item.description?.slice(0, 130) || 'لم يُضف وصف للمشروع بعد.')}</p><div class="small muted">${icon('location')} ${e(item.location?.address || 'الموقع غير محدد')}</div><div class="card-foot"><small class="muted">${date(item.createdAt)}</small><button class="text-link" data-view="projects/${e(item._id)}">فتح المشروع ${icon('arrow')}</button></div></div></article>`).join('')}</div>` : `<div class="panel">${empty('لا توجد مشاريع مطابقة', query ? 'جرّب تغيير البحث.' : isAdmin() ? 'ابدأ بإضافة أول مشروع.' : 'لم يتم تخصيص مشروع لحسابك بعد.')}</div>`;
    html += pager(result);
  } else if (kind === 'inspections') html += `<section class="panel">${inspectionTable(result.items)}${pager(result)}</section>`;
  else html += `<section class="panel">${result.items.length ? `<div class="table-wrap"><table><thead><tr><th>الموظف</th><th>المهنة</th><th>الهاتف</th><th>المشروع</th><th>الصلاحية</th><th>الحالة</th><th>إدارة</th></tr></thead><tbody>${result.items.map(u => `<tr><td><div class="employee-cell">${avatarMarkup(u)}<span><strong>${e(u.name)}</strong><span class="cell-sub">${e(u.employeeNo)}</span></span></div></td><td>${e(u.profession)}</td><td><bdi>${e(u.phone || '—')}</bdi></td><td>${u.projectId ? e(projectName(u.projectId)) : '—'}</td><td>${u.role === 'admin' ? 'مدير' : 'موظف'}</td><td><span class="badge ${u.active ? 'active' : ''}">${u.active ? 'فعال' : 'معطّل'}</span></td><td><button class="text-link" data-view="users/${e(u._id)}">الملف</button> <button class="text-link" data-edit="users/${e(u._id)}" ${disabled()}>تعديل</button> <button class="text-link" data-delete="users/${e(u._id)}" ${u._id === 'owner' || u._id === boot.user._id || (preview && !window.PORTAL_PREVIEW.editable) ? 'disabled' : ''}>حذف</button></td></tr>`).join('')}</tbody></table></div>` : empty('لا توجد نتائج', 'جرّب تغيير البحث.')}${pager(result)}</section>`;
  return html;
}
let detailItem;
function locationDisplay(loc = {}) {
  const hasCoords = loc.lat != null && loc.lng != null;
  return `<p>${e(loc.address || 'لم يُضف عنوان بعد')}</p>${hasCoords ? `<p class="muted ltr small">${e(loc.lat)}, ${e(loc.lng)}</p><a class="btn secondary small map-link" href="https://www.google.com/maps?q=${encodeURIComponent(`${loc.lat},${loc.lng}`)}" target="_blank" rel="noopener noreferrer">${icon('location')} فتح الخريطة</a>` : '<p class="small muted">الإحداثيات غير محددة</p>'}`;
}
async function detail(kind, id) {
  if (kind === 'reports') return reportDetail(id);
  if (kind === 'contracts') return contractDetail(id);
  if (kind === 'users') return userDetail(id);
  if (!['projects', 'inspections'].includes(kind)) throw new Error('صفحة غير موجودة');
  const item = await api(`/api/${kind}/${id}`); detailItem = item;
  const inspection = kind === 'inspections', title = inspection ? item.title : item.name;
  const actions = `<div class="actions"><button class="btn secondary" data-view="${kind}">رجوع</button>${isAdmin() ? `<button class="btn" data-edit="${kind}/${e(id)}" ${disabled()}>${icon('edit')} تعديل</button><button class="btn danger" data-delete="${kind}/${e(id)}" ${disabled()}>حذف</button>` : ''}</div>`;
  let html = heading(e(title), inspection ? e(projectName(item.projectId)) : e(item.code), actions);
  const assigned = inspection ? boot.employees.find(u => u._id === item.assignedTo) : null;
  const assignedName = assigned?.name || item.assignedName || 'الموظف غير متاح';
  const assignedNo = assigned?.employeeNo || item.assignedEmployeeNo || 'رقم الموظف غير متاح';
  html += `<div class="detail-grid"><div><section class="panel block"><div class="panel-head"><h2>${inspection ? 'بيانات الكشف' : 'بيانات المشروع'}</h2>${badge(item.status)}</div><div class="panel-body"><dl class="detail-meta">${inspection ? `<div><dt>المهندس المسؤول</dt><dd><strong>${e(assignedName)}</strong><span class="cell-sub">${e(assignedNo)}${assigned?.profession ? ` · ${e(assigned.profession)}` : ''}</span></dd></div><div><dt>تاريخ الكشف</dt><dd>${date(item.date)}</dd></div><div><dt>نوع الكشف</dt><dd>${e(item.category)}</dd></div>` : `<div><dt>رمز المشروع</dt><dd>${e(item.code)}</dd></div><div><dt>تاريخ الإضافة</dt><dd>${date(item.createdAt)}</dd></div>`}<div><dt>أضيف بواسطة</dt><dd>${e(item.createdBy?.name || '—')}</dd></div>${item.updatedBy ? `<div><dt>آخر تعديل</dt><dd>${e(item.updatedBy.name)} · ${date(item.updatedAt)}</dd></div>` : ''}</dl>${!inspection ? `<p>${e(item.description)}</p>` : ''}</div></section>`;
  if (inspection) html += `<section class="panel block checklist-panel"><div class="panel-head"><div><h2>قائمة فحص الكشف</h2><small class="muted">نتائج البنود التي تم توثيقها ميدانيًا</small></div>${icon('check')}</div><div class="panel-body">${checklistView(item.checklist)}</div></section>`;
  if (inspection) html += `<section class="panel block"><div class="panel-head"><h2>الملاحظات الميدانية</h2><span class="badge">${item.notes?.length || 0} ملاحظة</span></div>${item.notes?.length ? item.notes.map(n => `<article class="note"><div class="note-top"><strong>${e(n.by.name)}</strong><time>${date(n.at)}</time></div><p data-user-content>${e(n.text)}</p><div class="note-followup"><span class="badge">${t(n.status === 'closed' ? 'مغلقة' : n.status === 'in_progress' ? 'قيد المعالجة' : 'مفتوحة')}</span><small>${t('موعد المعالجة')}: ${n.dueDate ? date(n.dueDate) : '—'}</small></div>${n.editedBy ? `<small class="muted">عُدلت بواسطة ${e(n.editedBy.name)}</small>` : ''}${isAdmin() ? `<div class="actions"><button class="text-link" data-note-edit="${e(n._id)}" ${disabled()}>تعديل</button><button class="text-link" data-note-delete="${e(n._id)}" ${disabled()}>حذف</button></div>` : ''}</article>`).join('') : empty('لا توجد ملاحظات', 'أضف تفاصيل الفحص أو الأعمال المطلوبة.')}<form class="note-form" id="note-form">${errorSlot}<label class="field"><span>إضافة ملاحظة</span><textarea name="text" placeholder="اكتب ما لاحظته في الموقع…" maxlength="4000" required ${disabled()}></textarea></label><button class="btn" ${disabled()}>${icon('plus')} حفظ الملاحظة</button></form></section>`;
  html += `<section class="panel"><div class="panel-head"><h2>صور ${inspection ? 'الكشف' : 'المشروع'}</h2><span class="badge">${item.photos.length} صورة</span></div>${item.photos.length ? `<div class="photos">${item.photos.map(p => `<figure class="photo"><a href="${preview ? e(p.previewUrl) : '/api/photos/' + e(p._id)}" target="_blank" rel="noopener"><img src="${preview ? e(p.previewUrl) : '/api/photos/' + e(p._id)}" alt="${e(p.name)}" loading="lazy"></a><figcaption>${e(p.createdBy.name)} · ${date(p.createdAt)} · ${t(p.stage === 'before' ? 'قبل المعالجة' : p.stage === 'after' ? 'بعد المعالجة' : 'صورة عامة')}${p.noteId ? '<br>' + e(item.notes?.find(n => n._id === p.noteId)?.text || '') : ''}</figcaption>${isAdmin() ? `<button class="text-link" data-photo-delete="${e(p._id)}" ${disabled()}>حذف الصورة</button>` : ''}</figure>`).join('')}</div>` : empty('لا توجد صور مرفقة', 'صور الموقع تساعد على توثيق حالة الأعمال.')}${isAdmin() || inspection ? `<form class="upload" id="upload-form">${errorSlot}${inspection ? select('noteId', 'ربط بملاحظة', [['', 'دون ملاحظة'], ...(item.notes || []).map(n => [n._id, n.text.slice(0, 80)])], '', false) + select('stage', 'مرحلة الصورة', [['general', 'صورة عامة'], ['before', 'قبل المعالجة'], ['after', 'بعد المعالجة']]) : ''}<label class="field"><span>إرفاق صور</span><input type="file" name="files" accept="image/jpeg,image/png,image/webp" multiple required ${disabled()}></label><small class="help">JPG، PNG، WebP · حتى 3 ميغابايت للصورة. تُحفظ كل صورة على حدة.</small><button class="btn secondary" ${disabled()}>${icon('photo')} رفع الصور</button><p class="small muted" id="upload-status" role="status"></p></form>` : ''}</section></div><aside><section class="panel block"><div class="panel-head"><h2>الموقع الجغرافي</h2>${icon('location')}</div><div class="panel-body">${locationDisplay(item.location)}</div></section><section class="panel"><div class="panel-head"><h2>${inspection ? 'متابعة الكشف' : 'فريق المشروع'}</h2></div><div class="panel-body">${inspection ? `<p class="small muted">${isAdmin() ? 'بعد مراجعة الملاحظات والصور، يمكنك تعديل حالة الكشف ونتيجته.' : 'يمكنك إضافة الملاحظات والصور. اعتماد النتيجة وتعديل بيانات الكشف من صلاحيات المدير.'}</p>` : `<p>${boot.employees.filter(u => u.projectId === id).map(u => e(u.name)).join('، ') || 'لم يتم تخصيص موظفين بعد.'}</p>`}</div></section></aside></div>`;
  return html;
}
async function accountPage() {
  const u = boot.user;
  const profile = await api('/api/profile').catch(() => ({ photos: [] }));
  const photos = profile.photos || [], profilePhoto = photos.find(photo => photo.stage === 'profile'), documents = photos.filter(photo => photo.stage === 'document'), signaturePhoto = photos.find(photo => photo.stage === 'signature'), stampPhoto = photos.find(photo => photo.stage === 'stamp');
  const currentPhoto = profilePhoto ? photoUrl(profilePhoto) : userPhotoUrl(u);
  const documentRows = documents.length ? documents.map(photo => `<div class="document-row"><div class="document-icon">${photo.mime === 'application/pdf' ? 'PDF' : icon('photo')}</div><div><strong>${e(photo.name)}</strong><small class="muted">${e(photo.createdBy?.name || u.name)} · ${date(photo.createdAt)}</small></div><div class="document-actions"><a class="text-link" href="${e(photoUrl(photo))}" target="_blank" rel="noopener">عرض</a><button class="text-link" type="button" data-user-file-delete="${e(photo._id)}">حذف</button></div></div>`).join('') : '<p class="muted">لم تُرفع شهادات أو أوراق بعد.</p>';
  const officePanel = isAdmin() ? `<section class="panel office-assets"><div class="panel-head"><div><h2>توقيع وختم الشركة</h2><small class="muted">ارفعهما مرة واحدة ليظهرا تلقائيًا في أسفل العقود والتقارير المطبوعة.</small></div>${icon('edit')}</div><div class="office-assets-body"><div class="office-asset-card">${signaturePhoto ? `<img class="office-asset-preview signature-preview" src="${e(photoUrl(signaturePhoto))}" alt="توقيع الشركة">` : `<div class="office-asset-placeholder">التوقيع غير مضاف</div>`}<strong>توقيع الشركة</strong><form id="office-signature-form" class="file-action-form">${errorSlot}<input type="file" name="files" accept="image/jpeg,image/png,image/webp" required ${disabled()}><small class="help">صورة بخلفية شفافة أفضل للطباعة.</small><button class="btn secondary" ${disabled()}>${signaturePhoto ? 'استبدال التوقيع' : 'رفع التوقيع'}</button></form></div><div class="office-asset-card">${stampPhoto ? `<img class="office-asset-preview stamp-preview" src="${e(photoUrl(stampPhoto))}" alt="ختم الشركة">` : `<div class="office-asset-placeholder">الختم غير مضاف</div>`}<strong>ختم الشركة</strong><form id="office-stamp-form" class="file-action-form">${errorSlot}<input type="file" name="files" accept="image/jpeg,image/png,image/webp" required ${disabled()}><small class="help">PNG أو WebP بخلفية شفافة يعطي نتيجة أنظف.</small><button class="btn secondary" ${disabled()}>${stampPhoto ? 'استبدال الختم' : 'رفع الختم'}</button></form></div></div></section>` : '';
  return heading('حسابي', 'عدّل معلوماتك الشخصية وأضف صورتك وشهاداتك من نفس الصفحة.') + `<section class="panel block profile-editor"><div class="panel-head"><div><h2>البيانات الشخصية</h2><small class="muted">يمكنك تعديل الاسم والمهنة والهاتف فقط.</small></div>${icon('edit')}</div><form class="panel-body" id="profile-form">${errorSlot}<div class="form-grid">${field('name', 'الاسم الكامل', u.name, 'text', true, 'maxlength="160"')}${field('profession', 'المهنة', u.profession, 'text', true, 'maxlength="100"')}${field('phone', 'الهاتف', u.phone, 'tel', false, 'maxlength="40"')}</div><div class="profile-readonly"><div><span>رقم الموظف</span><strong dir="ltr">${e(u.employeeNo)}</strong></div><div><span>المشروع</span><strong>${e(u.projectId ? projectName(u.projectId) : '—')}</strong></div><div><span>الصلاحية</span><strong>${isAdmin() ? 'مدير' : 'موظف'}</strong></div></div><button class="btn" ${disabled()}>حفظ المعلومات</button></form></section><section class="panel profile-files"><div class="panel-head"><div><h2>الصورة والشهادات والأوراق</h2><small class="muted">ما ترفعه هنا يبقى مرتبطًا بملفك ويظهر للمدير.</small></div>${icon('photo')}</div><div class="profile-files-body"><div class="profile-photo-area">${currentPhoto ? `<img class="profile-cover-image" src="${e(currentPhoto)}" alt="صورة ملف ${e(u.name)}">` : `<div class="profile-cover-placeholder">${e((u.name || '?').slice(0, 1))}</div>`}<form id="profile-background-form" class="file-action-form">${errorSlot}<label class="field"><span>صورة الملف / الخلفية</span><input type="file" name="files" accept="image/jpeg,image/png,image/webp" required ${disabled()}></label><small class="help">JPG، PNG أو WebP · حتى 8 ميغابايت. رفع صورة جديدة يستبدل السابقة.</small><button class="btn secondary" ${disabled()}>رفع الصورة</button></form></div><div class="documents-area"><form id="profile-documents-form" class="file-action-form">${errorSlot}<label class="field"><span>إضافة شهادة أو ورقة</span><input type="file" name="files" accept="application/pdf,image/jpeg,image/png,image/webp" multiple required ${disabled()}></label><small class="help">يمكن اختيار أكثر من ملف · PDF، JPG، PNG أو WebP · حتى 8 ميغابايت لكل ملف.</small><button class="btn secondary" ${disabled()}>رفع الشهادات والأوراق</button></form><div class="document-list">${documentRows}</div></div></div></section>${officePanel}<section class="panel account-password"><div class="panel-head"><div><h2>تغيير كلمة المرور</h2><small class="muted">غيّر كلمة مرورك عند الحاجة.</small></div>${icon('lock')}</div><form class="panel-body" id="password-form">${errorSlot}<div class="form-grid">${field('currentPassword', 'كلمة المرور الحالية', '', 'password', true, 'autocomplete="current-password"')}${field('password', 'كلمة المرور الجديدة', '', 'password', true, 'minlength="6" maxlength="128" autocomplete="new-password"')}</div><small class="help">6 أحرف على الأقل. بعد التغيير ستسجل الدخول بكلمة المرور الجديدة.</small><button class="btn" ${disabled()}>تحديث كلمة المرور</button></form></section>`;
}
function wireContent() {
  wireExtras();
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => navigate(b.dataset.view));
  document.querySelectorAll('[data-add]').forEach(b => b.onclick = () => editRecord(b.dataset.add));
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editRecord(...b.dataset.edit.split('/')));
  document.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => deleteRecord(...b.dataset.delete.split('/')));
  document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { page = Number(b.dataset.page); route(); });
  $('#filters')?.addEventListener('submit', ev => { ev.preventDefault(); const data = new FormData(ev.target); query = data.get('q'); statusFilter = data.get('status') || ''; page = 1; route(); });
  $('#note-form')?.addEventListener('submit', async ev => {
    ev.preventDefault(); const form = ev.target, button = form.querySelector('button'); button.disabled = true;
    try { await send(`/api/inspections/${detailItem._id}/notes`, 'POST', Object.fromEntries(new FormData(form))); toast('تم حفظ الملاحظة'); await refresh(); } catch (error) { formError(form, error); } finally { button.disabled = false; }
  });
  $('#upload-form')?.addEventListener('submit', upload);
  document.querySelectorAll('[data-note-edit]').forEach(b => b.onclick = () => editNote(b.dataset.noteEdit));
  document.querySelectorAll('[data-note-delete]').forEach(b => b.onclick = () => confirmDelete('حذف الملاحظة؟', 'ستُحذف هذه الملاحظة من الكشف.', async () => { await send(`/api/inspections/${detailItem._id}/notes/${b.dataset.noteDelete}`, 'DELETE'); await refresh(); }));
  document.querySelectorAll('[data-photo-delete]').forEach(b => b.onclick = () => confirmDelete('حذف الصورة؟', 'سيتم حذف الصورة نهائيًا.', async () => { await send(`/api/photos/${b.dataset.photoDelete}`, 'DELETE'); await refresh(); }));
  $('#password-form')?.addEventListener('submit', async ev => {
    ev.preventDefault(); const form = ev.target, button = form.querySelector('button'); button.disabled = true;
    try { await send('/api/password', 'POST', Object.fromEntries(new FormData(form))); boot = null; showAuth(); toast('تم تغيير كلمة المرور. سجّل الدخول من جديد.'); } catch (error) { formError(form, error); } finally { button.disabled = false; }
  });
}
async function refresh() { boot = await api('/api/bootstrap'); await route(); }
async function editRecord(kind, id) {
  if (kind === 'reports') return editReport(id);
  if (kind === 'contracts') return editContract(id);
  const employeeInspectionCreate = kind === 'inspections' && !id && !isAdmin();
  if (!canWrite() && !employeeInspectionCreate) return;
  try {
    const item = id ? await api(`/api/${kind}/${id}`) : {};
    let fields;
    if (kind === 'users') fields = field('employeeNo', 'رقم الموظف / اسم الدخول', item.employeeNo, 'text', true, 'maxlength="40"') + field('name', 'الاسم الكامل', item.name, 'text', true, 'maxlength="160"') + field('profession', 'المهنة', item.profession, 'text', true, 'maxlength="100"') + field('phone', 'الهاتف', item.phone, 'tel', false, 'maxlength="40"') + projectPicker(item.projectId, '', false) + select('role', 'الصلاحية', [['employee', 'موظف'], ['admin', 'مدير — صلاحية كاملة']], item.role || 'employee') + select('active', 'حالة الحساب', [['true', 'فعال'], ['false', 'معطّل']], String(item.active ?? true)) + field('password', id ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور', '', 'password', !id, 'minlength="6" maxlength="128" autocomplete="new-password"') + (id ? '<p class="help full">تعديل الحساب ينهي جلسات دخوله الحالية. تغيير المشروع يخفي كشوفات المشروع السابق عن الموظف؛ تبقى متاحة للمدير لإعادة تخصيصها.</p>' : '');
    if (kind === 'projects') fields = field('name', 'اسم المشروع', item.name, 'text', true, 'maxlength="160"') + field('code', 'رمز المشروع', item.code, 'text', true, 'maxlength="40"') + select('status', 'حالة المشروع', ['active', 'on_hold', 'completed'].map(s => [s, labels[s]]), item.status || 'active') + `<label class="field full"><span>وصف المشروع</span><textarea name="description" maxlength="2000">${e(item.description)}</textarea></label>` + locationFields(item.location);
    if (kind === 'inspections') {
      if (employeeInspectionCreate) {
        const assignedProject = boot.projects.find(project => project._id === boot.user.projectId);
        fields = field('title', 'عنوان الكشف', '', 'text', true, 'maxlength="160"') + `<div class="field full readonly-choice"><span>المشروع المخصص</span><strong>${e(assignedProject?.name || 'مشروعك المخصص')}</strong><small class="muted">سيصل الكشف إلى لوحة المدير للمراجعة.</small></div><input type="hidden" name="projectId" value="${e(boot.user.projectId || '')}"><input type="hidden" name="assignedTo" value="${e(boot.user._id)}">` + field('date', 'تاريخ الكشف', new Date().toLocaleDateString('en-CA'), 'date') + select('category', 'نوع الكشف', inspectionCategories.map(s => [s, s]), 'أساسات') + `<div class="full" data-checklist-container>${checklistEditor('أساسات')}</div><input type="hidden" name="status" value="pending"><div class="field full readonly-choice"><span>حالة الكشف عند الإرسال</span><strong>${labels.pending}</strong><small class="muted">يُرسل أولًا إلى المدير للمراجعة والاعتماد.</small></div><label class="field full"><span>ملاحظة أولية (اختياري)</span><textarea name="note" maxlength="4000" placeholder="اكتب ما لاحظته في الموقع…"></textarea></label>` + locationFields({});
      } else {
        fields = field('title', 'عنوان الكشف', item.title, 'text', true, 'maxlength="160"') + projectPicker(item.projectId) + select('assignedTo', 'المهندس المسؤول', [['', 'اختر الموظف']], item.assignedTo) + field('date', 'تاريخ الكشف', item.date || new Date().toLocaleDateString('en-CA'), 'date') + select('category', 'نوع الكشف', inspectionCategories.map(s => [s, s]), item.category || 'أساسات') + `<div class="full" data-checklist-container>${checklistEditor(item.category || 'أساسات', item.checklist)}</div>` + select('status', 'النتيجة / الحالة', ['pending', 'in_progress', 'approved', 'needs_action'].map(s => [s, labels[s]]), item.status || 'pending') + (!id ? '<label class="field full"><span>ملاحظة أولية (اختياري)</span><textarea name="note" maxlength="4000"></textarea></label>' : '') + locationFields(item.location);
      }
    }
    modal(`${id ? 'تعديل' : 'إضافة'} ${kind === 'users' ? 'موظف' : kind === 'projects' ? 'مشروع' : employeeInspectionCreate ? 'كشف ميداني' : 'كشف'}`, `<form id="edit-form">${errorSlot}<div class="form-grid">${fields}</div>${formFooter()}</form>`);
    const form = $('#edit-form'); wireGPS(form); wireProjectPicker(form); if (kind === 'inspections') wireInspectionChecklist(form, item.checklist || []);
    if (kind === 'inspections' && isAdmin()) {
      const updateAssignees = () => { const previous = form.elements.assignedTo.value || item.assignedTo;
        const options = boot.employees.filter(u => u.active && (u.role === 'admin' || u.projectId === form.elements.projectId.value));
        form.elements.assignedTo.innerHTML = '<option value="">اختر الموظف</option>' + options.map(u => `<option value="${e(u._id)}" ${u._id === previous ? 'selected' : ''}>${e(u.name)}</option>`).join(''); };
      updateAssignees(); form.elements.projectId.onchange = updateAssignees;
    }
    form.onsubmit = async ev => {
      ev.preventDefault(); const button = form.querySelector('[type=submit]'); button.disabled = true;
      try { let data = Object.fromEntries(new FormData(form));
        if (kind === 'inspections') { data.checklist = checklistFromForm(form, data.category); delete data.checklistKeys; }
        if (['users', 'inspections'].includes(kind)) data = await resolveProject(data);
        if (kind === 'users') data.active = data.active === 'true'; else data = withLocation(data);
        await send(`/api/${kind}${id ? '/' + id : ''}`, id ? 'PATCH' : 'POST', data); $('#modal').close(); toast('تم حفظ البيانات');
        if (kind === 'users' && id === boot.user._id) { boot = null; showAuth(); toast('تم تعديل حسابك. سجّل الدخول مجددًا.'); } else await refresh();
      } catch (error) { formError(form, error); } finally { button.disabled = false; }
    };
  } catch (error) { toast(error.message); }
}
function confirmDelete(title, description, callback) {
  modal(title, `<form id="delete-form">${errorSlot}<p>${description}</p><div class="modal-foot"><button type="button" class="btn secondary" data-cancel>إلغاء</button><button type="submit" class="btn danger">تأكيد الحذف</button></div></form>`);
  const form = $('#delete-form'); form.onsubmit = async ev => { ev.preventDefault(); const button = form.querySelector('[type=submit]'); button.disabled = true;
    try { await callback(); $('#modal').close(); toast('تم الحذف'); } catch (error) { formError(form, error); } finally { button.disabled = false; } };
}
function deleteRecord(kind, id) {
  const description = kind === 'projects' ? 'سيُحذف المشروع من القوائم وستُخفى كشوفاته وصوره. تبقى السجلات مؤرشفة في قاعدة البيانات.' : kind === 'users' ? 'سيُوقف الحساب ويُحذف من قائمة الموظفين، مع الاحتفاظ باسمه في الكشوفات السابقة.' : kind === 'contracts' ? 'سيُخفى العقد من القائمة مع الاحتفاظ بسجله في قاعدة البيانات.' : 'سيُحذف الكشف من القوائم، مع الاحتفاظ بسجله المؤرشف في قاعدة البيانات.';
  confirmDelete('تأكيد حذف السجل', description, async () => { await send(`/api/${kind}/${id}`, 'DELETE'); boot = await api('/api/bootstrap'); if (currentRoute.includes('/')) navigate(kind); else await route(); });
}
function editNote(id) {
  const note = detailItem.notes.find(n => n._id === id);
  modal('تعديل الملاحظة', `<form id="edit-note">${errorSlot}<label class="field"><span>نص الملاحظة</span><textarea name="text" required maxlength="4000">${e(note.text)}</textarea></label>${select('status', 'حالة الملاحظة', [['open', 'مفتوحة'], ['in_progress', 'قيد المعالجة'], ['closed', 'مغلقة']], note.status || 'open')}${field('dueDate', 'موعد المعالجة', note.dueDate || '', 'date', false)}${formFooter()}</form>`);
  const form = $('#edit-note'); form.onsubmit = async ev => { ev.preventDefault(); const button = form.querySelector('[type=submit]'); button.disabled = true;
    try { await send(`/api/inspections/${detailItem._id}/notes/${id}`, 'PATCH', Object.fromEntries(new FormData(form))); $('#modal').close(); toast('تم تعديل الملاحظة'); await refresh(); } catch (error) { formError(form, error); } finally { button.disabled = false; } };
}
async function upload(ev) {
  ev.preventDefault(); const form = ev.target; const files = [...form.elements.files.files]; const button = form.querySelector('button');
  const parentType = currentRoute.startsWith('projects') ? 'project' : 'inspection', parentId = detailItem._id;
  const statusNode = form.querySelector('#upload-status');
  if (files.some(f => f.size > 3 * 1024 * 1024)) { formError(form, 'يوجد ملف أكبر من 3 ميغابايت. صغّر حجمه أولًا.'); return; }
  button.disabled = true; let saved = 0;
  try {
    for (const file of files) { statusNode.textContent = `جارٍ رفع الصورة ${saved + 1} من ${files.length}…`; const data = new FormData(); data.set('file', file); data.set('parentType', parentType); data.set('parentId', parentId); data.set('noteId', form.elements.noteId?.value || ''); data.set('stage', form.elements.stage?.value || 'general'); await api('/api/photos', { method: 'POST', body: data }); saved++; }
    toast(`تم حفظ ${saved} صورة`); await refresh();
  } catch (error) { formError(form, `${error.message} تم حفظ ${saved} من ${files.length}. أعد فتح الكشف لمشاهدة الصور المحفوظة قبل إعادة المحاولة.`); }
  finally { button.disabled = false; }
}
window.addEventListener('hashchange', () => { if (boot) route(); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') menu(false); });
async function start() {
  if (preview) { showAuth(); return; }
  if (location.protocol === 'file:') { showAuth(false, 'هذا الملف يحتاج خادم المشروع. افتح preview.html للمعاينة، أو اتبع START-HERE.html للتشغيل.'); return; }
  try { const state = await api('/api/status'); initialized = state.initialized;
    if (!initialized) { showAuth(true); return; }
    try { await enter(); } catch { showAuth(); }
  } catch (error) { showAuth(false, error.message); }
}
start();
