let reportFilters = { q: '', projectId: '', date: '' };
let contractFilters = { q: '', date: '' };
async function reportsPage() {
  const result = await api('/api/reports?' + new URLSearchParams({ ...reportFilters, page }));
  return heading(t('التقارير'), t('تقارير المكتب اليومية'), addButton('reports', t('تقرير جديد'))) + `<form class="filters" id="report-filters">${field('q', t('رقم التقرير'), reportFilters.q, 'text', false)}${select('projectId', t('المشروع'), [['', t('جميع المشاريع')], ...boot.projects.map(p => [p._id, p.name])], reportFilters.projectId, false)}${field('date', t('التاريخ'), reportFilters.date, 'date', false)}<button class="btn">${t('بحث')}</button></form><section class="panel">${result.items.length ? `<div class="table-wrap"><table><thead><tr>${['رقم التقرير', 'عنوان التقرير', 'المشروع', 'التاريخ', 'الحالة', 'التفاصيل'].map(v => `<th>${t(v)}</th>`).join('')}</tr></thead><tbody>${result.items.map(r => `<tr><td>${e(r.number)}</td><td>${e(r.title)}</td><td>${e(r.projectName)}</td><td>${date(r.date)}</td><td>${t(r.status === 'approved' ? 'معتمد' : 'مسودة')}</td><td><button class="text-link" data-view="reports/${e(r._id)}">${t('عرض')}</button></td></tr>`).join('')}</tbody></table></div>` : empty(t('لا توجد تقارير'))}${pager(result)}</section>`;
}
async function editReport(id) {
  if (!canWrite()) return;
  try {
    const r = id ? await api('/api/reports/' + id) : {};
    modal(t(id ? 'تعديل التقرير' : 'تقرير جديد'), `<form id="report-form">${errorSlot}<div class="form-grid">${field('title', t('عنوان التقرير'), r.title, 'text', true, 'maxlength="160"')}${projectPicker(r.projectId)}${field('date', t('التاريخ'), r.date || new Date().toISOString().slice(0, 10), 'date')}<label class="field full"><span>${t('الأعمال المنفذة')}</span><textarea name="works" maxlength="8000" required>${e(r.works)}</textarea></label><label class="field full"><span>${t('الملاحظات')}</span><textarea name="notes" maxlength="8000" placeholder="اكتب ملاحظات التقرير هنا…">${e(r.notes)}</textarea></label>${field('preparedByName', t('اسم مُعد التقرير للطباعة (اختياري)'), r.preparedByName || r.author?.name, 'text', false, 'maxlength="200"')}${field('approvedByName', t('اسم المعتمد للطباعة (اختياري)'), r.approvedByName || r.approvedBy?.name, 'text', false, 'maxlength="200"')}<p class="help full">${t('أسماء التوقيع للطباعة فقط؛ لا تغيّر سجل الإضافة أو سجل الاعتماد.')}</p></div>${formFooter()}</form>`);
    const form = $('#report-form'); wireProjectPicker(form);
    form.onsubmit = async ev => {
      ev.preventDefault(); const form = ev.target, button = form.querySelector('[type=submit]'); button.disabled = true;
      try { const data = await resolveProject({ ...Object.fromEntries(new FormData(form)), revision: r.revision }); const result = await send('/api/reports' + (id ? '/' + id : ''), id ? 'PATCH' : 'POST', data); $('#modal').close(); if (id) await route(); else navigate('reports/' + result._id); }
      catch (err) { formError(form, err); } finally { button.disabled = false; }
    };
  } catch (err) { toast(err.message); }
}
async function reportDetail(id) {
  const r = await api('/api/reports/' + id); detailItem = r;
  return heading(e(r.number), e(r.title), `<div class="actions"><button class="btn secondary" data-view="reports">${t('رجوع')}</button><button class="btn secondary" id="print-report">${t('طباعة / PDF')}</button>${r.status === 'draft' ? `<button class="btn" data-edit="reports/${e(id)}" ${disabled()}>${t('تعديل')}</button>` : ''}<button class="btn" id="report-status" ${disabled()}>${t(r.status === 'draft' ? 'اعتماد التقرير' : 'إعادة إلى مسودة')}</button></div>`) + `<section class="panel report-paper" id="report-paper">${reportPaper(r)}</section>${r.status === 'draft' ? `<form class="panel panel-body" id="report-photo">${errorSlot}<label class="field"><span>${t('إرفاق صور')}</span><input name="files" type="file" accept="image/png,image/jpeg,image/webp" multiple required ${disabled()}></label><button class="btn" ${disabled()}>${t('رفع الصور')}</button></form>` : ''}<section class="panel panel-body"><h2>${t('سجل المراجعات')}</h2>${r.history.length ? r.history.map(h => `<details><summary>${e(h.by.name)} · ${e(new Date(h.at).toLocaleString(window.portalLang))} · ${t(h.action === 'photo' ? 'رفع الصور' : h.action === 'approve' ? 'اعتماد التقرير' : h.action === 'reopen' ? 'إعادة إلى مسودة' : 'تعديل')} · ${t('الإصدار')} ${h.revision}</summary><p>${e(h.snapshot?.title)}</p><p class="preline" data-user-content>${e(h.snapshot?.works)}</p><p class="preline" data-user-content>${e(h.snapshot?.notes)}</p></details>`).join('') : `<p>${t('لا توجد مراجعات سابقة')}</p>`}</section>`;
}
function reportPaper(r) {
  const preparedName = r.preparedByName || r.author?.name || '—';
  const approvedName = r.approvedByName || r.approvedBy?.name || '—';
  const officeSignature = (r.officeAssets || []).find(photo => photo.stage === 'signature');
  const officeStamp = (r.officeAssets || []).find(photo => photo.stage === 'stamp');
  const signatureImage = officeSignature ? `<img class="printed-signature" src="${e(photoUrl(officeSignature))}" alt="توقيع الشركة">` : '';
  const stampImage = officeStamp ? `<img class="printed-stamp" src="${e(photoUrl(officeStamp))}" alt="ختم الشركة">` : '<span>مكان الختم</span>';
  const approvalMeta = r.approvedBy ? `<small>${t('اعتمد بواسطة')}: ${e(r.approvedBy.name)} · ${e(new Date(r.approvedAt).toLocaleString(window.portalLang))}</small>` : '';
  return `<div class="report-header"><img src="${asset('report-logo.png')}" alt="Almasri Engineering"><div><h2>Almasri Engineering</h2><p>${t('تقرير يومي')} · ${e(r.number)}</p></div></div><h1>${e(r.title)}</h1><dl class="detail-meta">${[[t('المشروع'), r.projectName], [t('التاريخ'), date(r.date)], [t('إعداد المهندس'), r.author?.name || '—'], [t('الحالة'), t(r.status === 'approved' ? 'معتمد' : 'مسودة')], [t('الإصدار'), r.revision], [t('آخر تعديل'), new Date(r.updatedAt).toLocaleString(window.portalLang)]].map(([k, v]) => `<div><dt>${k}</dt><dd>${e(v)}</dd></div>`).join('')}</dl><h2>${t('الأعمال المنفذة')}</h2><p class="preline" data-user-content>${e(r.works)}</p><h2>${t('الملاحظات')}</h2><p class="preline" data-user-content>${e(r.notes || '—')}</p><div class="report-photos">${(r.photos || []).map(p => `<figure><img src="${preview ? p.previewUrl || asset('dashboard.png') : '/api/photos/' + e(p._id)}" alt="${e(p.name)}"><figcaption>${e(p.name)}</figcaption></figure>`).join('')}</div><div class="report-signatures"><div class="report-signature"><h3>${t('إعداد التقرير')}</h3><p>${e(preparedName)}</p><div class="signature-space">${signatureImage}</div></div><div class="report-signature"><h3>${t('اعتماد التقرير')}</h3><p>${e(approvedName)}</p><div class="signature-space">${signatureImage}</div><div class="stamp-space">${stampImage}</div>${approvalMeta}</div></div><p class="report-footer">${t('الاسم والتوقيع')} · Almasri Engineering</p>`;
}

async function contractsPage() {
  const result = await api('/api/contracts?' + new URLSearchParams({ ...contractFilters, page }));
  return heading('العقود', 'إنشاء عقود المكتب وحفظها وطباعتها مع الشعار والتوقيع والختم.', addButton('contracts', 'عقد جديد')) + `<form class="filters" id="contract-filters">${field('q', 'ابحث برقم العقد أو العنوان أو الطرف', contractFilters.q, 'text', false)}${field('date', 'تاريخ العقد', contractFilters.date, 'date', false)}<button class="btn">بحث</button></form><section class="panel">${result.items.length ? `<div class="table-wrap"><table><thead><tr><th>رقم العقد</th><th>العنوان</th><th>المشروع</th><th>الطرفان</th><th>تاريخ العقد</th><th>التفاصيل</th></tr></thead><tbody>${result.items.map(c => `<tr><td><strong>${e(c.number)}</strong></td><td>${e(c.title)}</td><td>${e(c.projectName)}</td><td><span>${e(c.partyA)}</span><span class="cell-sub">${e(c.partyB)}</span></td><td>${date(c.contractDate)}</td><td><button class="text-link" data-view="contracts/${e(c._id)}">عرض ${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></div>` : empty('لا توجد عقود بعد', 'أنشئ أول عقد واحفظه بصيغة جاهزة للطباعة.')}${pager(result)}</section>`;
}

async function editContract(id) {
  if (!canWrite()) return;
  try {
    const c = id ? await api('/api/contracts/' + id) : {};
    modal(id ? 'تعديل العقد' : 'عقد جديد', `<form id="contract-form">${errorSlot}<div class="form-grid">${field('number', 'رقم العقد (اختياري)', c.number, 'text', false, 'maxlength="80"')}${field('title', 'عنوان العقد', c.title, 'text', true, 'maxlength="200"')}${projectPicker(c.projectId)}${field('partyA', 'اسم الطرف الأول', c.partyA, 'text', true, 'maxlength="200"')}${field('partyB', 'اسم الطرف الثاني', c.partyB, 'text', true, 'maxlength="200"')}${field('subject', 'موضوع العقد', c.subject, 'text', true, 'maxlength="1000"')}${field('value', 'قيمة العقد (اختياري)', c.value, 'text', false, 'maxlength="120"')}${field('contractDate', 'تاريخ العقد', c.contractDate, 'date', true)}${field('startDate', 'تاريخ بدء التنفيذ', c.startDate, 'date', false)}${field('endDate', 'تاريخ انتهاء التنفيذ', c.endDate, 'date', false)}<label class="field full"><span>بنود العقد</span><textarea name="terms" maxlength="16000" required placeholder="اكتب بنود العقد بالتفصيل…">${e(c.terms)}</textarea></label>${field('signatureA', 'اسم الموقّع عن الطرف الأول (اختياري)', c.signatureA || c.partyA, 'text', false, 'maxlength="200"')}${field('signatureB', 'اسم الموقّع عن الطرف الثاني (اختياري)', c.signatureB || c.partyB, 'text', false, 'maxlength="200"')}${field('stampLabel', 'بيان الختم (اختياري)', c.stampLabel || 'مكان الختم الرسمي', 'text', false, 'maxlength="200"')}<p class="help full">يمكنك تغيير اسمَي الطرفين واسمَي الموقّعين قبل الحفظ؛ ستظهر الأسماء الجديدة في أسفل الورقة عند الطباعة.</p></div>${formFooter()}</form>`);
    const form = $('#contract-form'); wireProjectPicker(form);
    form.onsubmit = async ev => {
      ev.preventDefault(); const button = form.querySelector('[type=submit]'); button.disabled = true;
      try { const data = await resolveProject(Object.fromEntries(new FormData(form))); const result = await send('/api/contracts' + (id ? '/' + id : ''), id ? 'PATCH' : 'POST', data); $('#modal').close(); navigate('contracts/' + (id || result._id)); }
      catch (err) { formError(form, err); } finally { button.disabled = false; }
    };
  } catch (err) { toast(err.message); }
}

async function contractDetail(id) {
  const c = await api('/api/contracts/' + id); detailItem = c;
  return heading(e(c.number), e(c.title), `<div class="actions"><button class="btn secondary" data-view="contracts">رجوع</button><button class="btn secondary" id="print-contract">طباعة / PDF</button><button class="btn" data-edit="contracts/${e(id)}" ${disabled()}>${icon('edit')} تعديل</button><button class="btn danger" data-delete="contracts/${e(id)}" ${disabled()}>حذف</button></div>`) + `<section class="panel contract-paper" id="contract-paper">${contractPaper(c)}</section>`;
}

function contractPaper(c) {
  const officeSignature = (c.officeAssets || []).find(photo => photo.stage === 'signature');
  const officeStamp = (c.officeAssets || []).find(photo => photo.stage === 'stamp');
  const signatureImage = officeSignature ? `<img class="printed-signature" src="${e(photoUrl(officeSignature))}" alt="توقيع الشركة">` : '';
  const stampImage = officeStamp ? `<img class="printed-stamp" src="${e(photoUrl(officeStamp))}" alt="ختم الشركة">` : `<span>${e(c.stampLabel || 'مكان الختم')}</span>`;
  return `<div class="contract-header"><img src="${asset('report-logo.png')}" alt="Almasri Engineering"><div class="contract-brand"><strong>Almasri Engineering</strong><span>هندسة وإشراف وإدارة مشاريع</span></div><div class="contract-number"><span>رقم العقد</span><strong>${e(c.number)}</strong></div></div><div class="contract-title"><span>عقد</span><h1>${e(c.title)}</h1></div><dl class="detail-meta contract-meta">${[['المشروع', c.projectName], ['الطرف الأول', c.partyA], ['الطرف الثاني', c.partyB], ['موضوع العقد', c.subject], ['قيمة العقد', c.value || '—'], ['تاريخ العقد', date(c.contractDate)], ['بدء التنفيذ', c.startDate ? date(c.startDate) : '—'], ['انتهاء التنفيذ', c.endDate ? date(c.endDate) : '—']].map(([key, value]) => `<div><dt>${e(key)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl><section class="contract-terms"><h2>بنود العقد</h2><p class="preline" data-user-content>${e(c.terms)}</p></section><div class="contract-signatures"><div class="contract-signature"><h3>توقيع الطرف الأول</h3><p>${e(c.signatureA || c.partyA)}</p><div class="signature-space">${signatureImage}</div><div class="stamp-space">${stampImage}</div></div><div class="contract-signature"><h3>توقيع الطرف الثاني</h3><p>${e(c.signatureB || c.partyB)}</p><div class="signature-space"></div><div class="stamp-space"><span>مكان الختم</span></div></div></div><p class="contract-footer">تم إعداد هذا العقد بواسطة Almasri Engineering · ${c.createdAt ? e(new Date(c.createdAt).toLocaleDateString(window.portalLang)) : ''}</p>`;
}

async function activityPage() {
  const r = await api('/api/activity?page=' + page);
  return heading(t('سجل النشاط'), t('متابعة عمليات فريق العمل')) + `<section class="panel"><div class="table-wrap"><table><thead><tr><th>${t('الاسم')}</th><th>${t('العملية')}</th><th>${t('السجل')}</th><th>${t('التاريخ')}</th></tr></thead><tbody>${r.items.map(a => `<tr><td>${e(a.by.name)}</td><td>${t(a.path.endsWith('/approve') ? 'اعتماد التقرير' : a.path.endsWith('/reopen') ? 'إعادة إلى مسودة' : a.method === 'DELETE' ? 'حذف' : a.method === 'PATCH' ? 'تعديل' : 'إضافة')}</td><td>${t(({ users: 'فريق العمل', projects: 'المشاريع', inspections: 'الكشوفات', reports: 'التقارير', contracts: 'العقود', photos: 'إرفاق صور', notes: 'الملاحظات', profile: 'البيانات الشخصية', password: 'تغيير كلمة المرور', logout: 'تسجيل الخروج' })[a.kind || a.path.split('/')[2]] || 'السجل')}<span class="cell-sub" data-user-content>${e(a.targetName || a.targetId || '')}</span></td><td>${e(new Date(a.at).toLocaleString(window.portalLang))}</td></tr>`).join('')}</tbody></table></div>${pager(r)}</section>`;
}
async function userDetail(id) {
  const u = await api('/api/users/' + id); const files = u.photos || [], profilePhoto = files.find(photo => photo.stage === 'profile'), documents = files.filter(photo => photo.stage === 'document');
  const profileSrc = profilePhoto ? photoUrl(profilePhoto) : userPhotoUrl(u);
  const docs = documents.length ? documents.map(photo => `<div class="document-row"><div class="document-icon">${photo.mime === 'application/pdf' ? 'PDF' : icon('photo')}</div><div><strong>${e(photo.name)}</strong><small class="muted">${e(photo.createdBy?.name || u.name)} · ${date(photo.createdAt)}</small></div><a class="text-link" href="${e(photoUrl(photo))}" target="_blank" rel="noopener">عرض / تنزيل</a></div>`).join('') : '<p class="muted">لا توجد شهادات أو أوراق مرفوعة لهذا الموظف.</p>';
  return heading(e(u.name), e(u.profession || 'ملف الموظف'), `<div class="actions"><button class="btn secondary" data-view="users">رجوع</button><button class="btn" data-edit="users/${e(id)}" ${disabled()}>${icon('edit')} تعديل</button></div>`) + `<div class="user-profile-grid"><section class="panel user-profile-card"><div class="user-profile-cover">${profileSrc ? `<img src="${e(profileSrc)}" alt="صورة ملف ${e(u.name)}">` : `<span>${e((u.name || '?').slice(0, 1))}</span>`}</div><div class="user-profile-summary"><div>${avatarMarkup(u)}<div><h2>${e(u.name)}</h2><p class="muted">${e(u.profession || '—')}</p></div></div><dl class="detail-meta"><div><dt>رقم الموظف</dt><dd dir="ltr">${e(u.employeeNo)}</dd></div><div><dt>الهاتف</dt><dd dir="ltr">${e(u.phone || '—')}</dd></div><div><dt>المشروع</dt><dd>${e(u.projectId ? projectName(u.projectId) : '—')}</dd></div><div><dt>الحالة</dt><dd>${u.active ? 'فعال' : 'معطّل'}</dd></div></dl></div></section><section class="panel block"><div class="panel-head"><div><h2>الشهادات والأوراق</h2><small class="muted">المرفقات التي أضافها الموظف من حسابه.</small></div><span class="badge">${documents.length} ملف</span></div><div class="document-list user-documents">${docs}</div></section></div>`;
}
async function uploadUserFiles(ev, stage) {
  ev.preventDefault(); const form = ev.target, files = [...form.elements.files.files], button = form.querySelector('button');
  if (!files.length) return;
  if (files.some(file => file.size > 8 * 1024 * 1024)) { formError(form, 'يوجد ملف أكبر من 8 ميغابايت. صغّر حجمه أولًا.'); return; }
  button.disabled = true; let saved = 0;
  try {
    for (const file of files) { const data = new FormData(); data.set('file', file); data.set('parentType', 'user'); data.set('parentId', boot.user._id); data.set('stage', stage); await api('/api/photos', { method: 'POST', body: data }); saved++; }
    toast(stage === 'profile' ? 'تم تحديث صورة الملف' : `تم حفظ ${saved} ملف`); await refresh();
  } catch (error) { formError(form, `${error.message} تم حفظ ${saved} من ${files.length}.`); }
  finally { button.disabled = false; }
}
function wireExtras() {
  $('#profile-form')?.addEventListener('submit', async ev => { ev.preventDefault(); const form = ev.target, b = form.querySelector('button'); b.disabled = true; try { await send('/api/profile', 'PATCH', Object.fromEntries(new FormData(form))); await refresh(); toast(t('تم حفظ البيانات')); } catch (err) { formError(form, err); } finally { b.disabled = false; } });
  $('#profile-background-form')?.addEventListener('submit', ev => uploadUserFiles(ev, 'profile'));
  $('#profile-documents-form')?.addEventListener('submit', ev => uploadUserFiles(ev, 'document'));
  $('#office-signature-form')?.addEventListener('submit', ev => uploadUserFiles(ev, 'signature'));
  $('#office-stamp-form')?.addEventListener('submit', ev => uploadUserFiles(ev, 'stamp'));
  document.querySelectorAll('[data-user-file-delete]').forEach(button => button.onclick = () => confirmDelete('حذف الملف؟', 'سيتم حذف هذا الملف من ملفك الشخصي.', async () => { await send(`/api/photos/${button.dataset.userFileDelete}`, 'DELETE'); await refresh(); }));
  $('#report-filters')?.addEventListener('submit', ev => { ev.preventDefault(); reportFilters = Object.fromEntries(new FormData(ev.target)); page = 1; route(); });
  $('#contract-filters')?.addEventListener('submit', ev => { ev.preventDefault(); contractFilters = Object.fromEntries(new FormData(ev.target)); page = 1; route(); });
  $('#report-status')?.addEventListener('click', async () => {
    const b = $('#report-status'); b.disabled = true;
    try { await send(`/api/reports/${detailItem._id}/${detailItem.status === 'draft' ? 'approve' : 'reopen'}`, 'POST', { revision: detailItem.revision }); await route(); } catch (err) { toast(err.message); b.disabled = false; }
  });
  $('#print-report')?.addEventListener('click', async () => {
    const b = $('#print-report'); b.disabled = true;
    try {
      await Promise.all([...$('#report-paper').querySelectorAll('img')].map(img => img.decode()));
      window.print();
    } catch { toast(t('تعذر تحميل الصور للطباعة')); } finally { b.disabled = false; }
  });
  $('#print-contract')?.addEventListener('click', async () => {
    const b = $('#print-contract'); b.disabled = true;
    try { await Promise.all([...$('#contract-paper').querySelectorAll('img')].map(img => img.decode())); window.print(); }
    catch { toast('تعذر تحميل شعار العقد للطباعة'); } finally { b.disabled = false; }
  });
  $('#report-photo')?.addEventListener('submit', async ev => {
    ev.preventDefault(); const form = ev.target, b = form.querySelector('button'); b.disabled = true;
    try { for (const file of form.elements.files.files) { const data = new FormData(); data.set('file', file); data.set('parentType', 'report'); data.set('parentId', detailItem._id); await api('/api/photos', { method: 'POST', body: data }); } await route(); } catch (err) { formError(form, err); } finally { b.disabled = false; }
  });
}
